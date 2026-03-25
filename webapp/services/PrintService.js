sap.ui.define([], () => {
    "use strict";

    return {
        getProducts: function (oModel) {
            return new Promise((resolve, reject) => {
                oModel.read("/ProductSet", {
                    success: resolve,
                    error: reject
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
        }

    };
});