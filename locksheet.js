define([
        'qlik',
        'jquery'
    ],
    function (qlik, $) {
        'use strict';
        var fieldList, variableListPromise;

        function getField() {
            if (!variableListPromise) {
                variableListPromise  = qlik.currApp().createGenericObject({
                    qFieldListDef: {
                        qShowSystem: true,
                        qShowHidden: true,
                        qShowSemantic: true,
                        qShowSrcTables: true
                    }
                    
                }).then(function (reply) {
                    let fieldList = reply.layout.qFieldList.qItems.map(function (item) {
                        return {
                            value: item.qName,
                            label: item.qName
                        };
                    });
                    return fieldList;
                })
            }
            return variableListPromise;
        }

        return {
            definition: {
                type: "items",
                component: "accordion",
                items: {
                    appearancePanel: {
                        uses: "settings",
                        items: {
                            Settings: {
                                label: "Settings",
                                type: "items",
                                items: {
                                    SwitchLock: {
                                        ref: "switchLock",
                                        type: "boolean",
                                        component: "switch",
                                        label: "Lock/Unlock",
                                        options: [{
                                            value: true,
                                            label: "Lock"
                                        }, {
                                            value: false,
                                            label: "Unlock"
                                        }],
                                        defaultValue: false
                                    },
                                    LockField: {
                                        ref: "fieldName",
                                        type: "string",
                                        component: "dropdown",
                                        label: "Field Name",
                                        options: function () {
                                            if (fieldList) {
                                                return fieldList;
                                            } else {
                                                return getField();
                                                
                                            }

                                        },
                                        show: function (layout) {
                                            return layout.switchLock === true;
                                        }
                                    },
                                    // LockValue: {
                                    //     ref: "fieldName",
                                    //     type: "string",
                                    //     expression: "optional",
                                    //     label: "Field Value",
                                    //     show: function (layout) {
                                    //         return layout.switchLock === true;
                                    //     }
                                    // }
                                }
                            }
                        }
                    }
                }
            },
            paint: function ($element, layout) {
                var app = qlik.currApp()
                if (layout.switchLock === true) {
                    console.log('Lock')
                    //var result = app.model.engineApp.lockAll()
                    var result = app.field(layout.fieldName).lock()
                } else {
                    var result = app.model.engineApp.unlockAll()
                    console.log('Unlock')
                }

                return qlik.Promise.resolve();
            }

        }
    }
)
