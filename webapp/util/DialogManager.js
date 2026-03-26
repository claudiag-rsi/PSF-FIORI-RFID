sap.ui.define([], function () {
    "use strict";

    return {
        destroyDialogs: function (context, propertyName) {
            if (!context[propertyName]) return;

            Object.values(context[propertyName]).forEach(pDialog => {
                pDialog.then(oDialog => {
                    if (oDialog && !oDialog.bIsDestroyed) {
                        oDialog.destroy();
                    }
                });
            });

            context[propertyName] = null;
        }
    };
});