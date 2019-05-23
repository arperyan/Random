fetch("./node_modules/enigma.js/schemas/12.67.2.json").then(response => {
  return response.json()
}).then(data => {

  let qlik
  let currSession
  let currApp


  const urlName = `wss://cp-dev-sense.systems.uk.hsbc/app/`
  const host = `https://cp-dev-sense.systems.uk.hsbc`

  var config = {
    schema: data,
    host: host,
    prefix: "/",
    port: "443",
    url: urlName,
    rejectUnauthorized: false,
    createSocket: url => new WebSocket(url)
  };

  var session = enigma.create(config)
  session.open().then(global => {
    qlik = global
    loadDocList()
    loadStreamList()

  })


  ///// ---------------------------- Load the list of Apps
  async function loadDocList() {
    let docs = await qlik.getDocList()
    let html = '<h1>App List</h1> '
    docs.forEach(d => {
      if (d.qTitle.indexOf('Monitor') >= 0) {
        html += `
              <li>
                <h3 class="scriptSelect appList" data-value="${d.qDocId}" data-name="${d.qDocName}">${d.qTitle}</h3>
                <p>Last reload: ${d.qLastReloadTime}</p>
              </li>`
      }
    })
    document.getElementById('appList').innerHTML = html

  }


  ///----------------------------- Relaod the App
  let appReload = document.getElementById('reload')
  if (appReload) {
    appReload.addEventListener('click', () => {
      if (currApp) {
        const script = document.getElementById('script').value;
        (async function () {
          await currApp.setScript(script)
          let result = await currApp.doReload()
          await currApp.doSave()
          if (result === true) {
            document.getElementById('progress').innerText = 'COMPLETE'
          }
        })()

      }
    })
  }

  ///---------------Global Variables need to be used in other selections - it was casuing a issue
  let appName, appId

  //// ------------------------- Get the values from the selected App
  let appSelect = document.getElementById('appList')
  if (appSelect) {
    appSelect.addEventListener('click', (e) => {
      appId = e.target.attributes["data-value"].value
      appName = e.target.attributes["data-name"].value
      ///--------------Connect to the app selected
      connect(appId)

      ////---------------- Message sent to the publish box
      document.getElementById('streamName').innerHTML = `<span>Publish App <strong> ${appName} </strong></span>`
      test = false
    })

  }

  ////-------------------- This is to create a New App
  let appCopy = document.getElementById('copy')
  if (appCopy) {
    appCopy.addEventListener('click', () => {
      if (currApp) {
        (async function () {
          let result = await qlik.createApp(`${appName}(New)`)
          copyApp(result.qAppId, appId)
        })()
      }
    })

  }

  
  ////------------------ Copy the app after an app has been created
  async function copyApp(newAppId, appId) {
    let result = await qlik.copyApp(newAppId, appId, [])
    if (result === true) {
      document.getElementById('progress').innerText = 'COPIED'

    }
    loadDocList()
  }


  ////------ Connect to the app and create a session
  async function connect(appId) {
    if (currApp && currApp.close) {
      currApp.close()
      currApp = null
    }
    if (currSession && currSession.close) {
      currSession.close()
      currSession = null
    }
    const config = {
      url: urlName + '/' + appId,
      schema: data,
      createSocket: url => new WebSocket(url)
    }

    currSession = enigma.create(config)
    let global = await currSession.open()

    let app = await global.openDoc(appId)
    currApp = app
    getScript()

  }

  ///---- Get the script
  async function getScript() {
    let script = await currApp.getScript()
    document.getElementById("script").value = script
    console.log(currApp)

  }

  ///------------------------Load the list of Streams
  async function loadStreamList() {
    /////--------------------- Request a GET to the qrs
    fetch(`${host}/qrs/stream/full?Xrfkey=abcdefghijklmnop`, {
        method: 'GET',
        headers: {
          'X-Qlik-User': 'UserDirectory=INTERNAL; UserId=sa_repository',
          'X-Qlik-Xrfkey': 'abcdefghijklmnop'
        }
      })
      .then(response => response.json())
      .then((data) => {
        //console.log(data);

        ///----------------- Create the list of Streams
        let html = '<option>-- Select --</option>'
        data.forEach((d, i) => {
          if (d.name.indexOf('Monitoring') >= 0) {
          html +=
            `<option value="${d.id}">${d.name}</option>`
          }
        })
        var e = document.querySelector(".streamList");
        e.innerHTML = html

      });

    /////----------------Creating the dialog box
    var dialogTriggers = document.querySelectorAll(".dialog-trigger");
    dialogTriggers = [].slice.apply(dialogTriggers); // convert to array
    dialogTriggers.forEach(function (element) {
      element.addEventListener("click", function () {
        var dialog = leonardoui.dialog({
          content: element.nextElementSibling.innerHTML,
          closeOnEscape: true
        });
        //console.log(dialog.element)

        ///----Action to close
        let cancelButton = dialog.element.querySelectorAll(".close-button")[0];
        if (cancelButton) {
          cancelButton.addEventListener("click", function () {
            dialog.close();
          });
        }

        //////------------Get the value of the stream selected
        var streamValue = dialog.element.querySelectorAll(".streamList")[0];
        if (streamValue) {
          streamValue.addEventListener('change', (e) => {

            ///----Action to close and Publish
            let publishButton = dialog.element.querySelectorAll(".close-button")[1];
            if (publishButton) {
              publishButton.addEventListener("click", function () {
                (async function () {
                  var message = dialog.element.querySelectorAll("#streamName")[0];
                  try {
                    var result = await currApp.publish(e.target.value)
                    // use the result here
                  } catch (err) {
                    /////-------------- Catch the errors so the user cant rePublish are if no app has been selected
                    if (err.constructor.name !== 'TypeError') {
                      message.innerHTML = 'App already Published';
                    }
                    this.err = err
                  } finally {
                    if (!this.err) {
                      dialog.close();
                    }
                  }
                })();
              });
            }
          })
        }
      });
    });
  }

})
