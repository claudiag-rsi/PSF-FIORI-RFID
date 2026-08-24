sap.ui.define([
    "fw/flexwarehouse/util/Constants",
], (Constants) => {
    "use strict";

    return {
        create: function (oModel, oLabelPrint) {
            return new Promise((resolve, reject) => {
                oModel.create("/LabelPrintSet", oLabelPrint, {
                    success: resolve,
                    error: reject
                });
            });
        },

        getProducts: function (oModel) {
            return new Promise((resolve, reject) => {
                oModel.read("/ProductSet", {
                    success: resolve,
                    error: reject
                });
            });
        },

        getProductDetails: function (oModel, sMatnr, sWerks) {
            return new Promise((resolve, reject) => {
                var sPath = `/ProductDetailsSet(Matnr='${sMatnr}',Werks='${sWerks}')`;

                oModel.read(sPath, {
                    success: resolve,
                    error: function (oError) {

                        let sMessage = "Error desconocido";

                        try {
                            const oResponse = JSON.parse(oError.responseText);
                            sMessage = oResponse?.error?.message?.value || sMessage;
                        } catch (e) {
                            // fallback XML SAP OData
                            const parser = new DOMParser();
                            const xml = parser.parseFromString(oError.responseText, "text/xml");

                            const msg = xml.getElementsByTagName("message")[0];
                            if (msg) {
                                sMessage = msg.textContent;
                            }
                        }

                        reject(sMessage);
                    }
                });
            });
        },

        getProductionLines: function (oModel) {
            return new Promise((resolve, reject) => {
                oModel.read("/ProductionLinesSet", {
                    success: resolve,
                    error: reject
                });
            });
        },

        validateProductForProductionLine: function (oModel, sProduct, sProductionLine, sCenter) {
            return new Promise(function (resolve, reject) {
                oModel.callFunction("/ValidateProductLine", {
                    method: "GET",
                    urlParameters: {
                        Product: sProduct,
                        ProductionLine: sProductionLine,
                        Center: sCenter
                    },
                    success: function (oData) { resolve(oData); },
                    error: function (oError) { reject(oError); }
                });
            });
        },
    };
});