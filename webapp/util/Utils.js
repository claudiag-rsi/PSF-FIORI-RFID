sap.ui.define([
    "fw/flexwarehouse/util/Constants",
], function (Constants) {
    "use strict";

    return {
        buildFragmentName: function (sNamespace, sFragment) {
            return `${sNamespace}${Constants.FRAGMENT_PATH}${sFragment}`;
        },

        getFragment: function (oController, sFragment) {
            oController._mDialogs = oController._mDialogs || {};

            const sFullName = this.buildFragmentName(oController.getOwnerComponent().getNamespace(), sFragment);

            if (!oController._mDialogs[sFragment]) {
                oController._mDialogs[sFragment] = sap.ui.core.Fragment
                    .load({
                        id: oController.getView().getId(),
                        name: sFullName,
                        controller: oController
                    })
                    .then(oDialog => {
                        oController.getView().addDependent(oDialog);
                        return oDialog;
                    });
            }

            return oController._mDialogs[sFragment];
        },

        closeDialog: function (oController, sFragmentName) {
            this.getFragment(oController, sFragmentName).then(oDialog => {
                oDialog.close();
            });
        },
        toABAPDate(date) {
            if (date instanceof Date) {
                var oDateFormat = sap.ui.core.format.DateFormat.getDateInstance({
                    pattern: Constants.FORMAT_DATE
                });

                return oDateFormat.format(date);
            }
        },
        formatDate: function (date) {

            if (!date) return Constants.STRING_EMPTY;

            var parts = date.split(Constants.DATE_SEPARATOR);

            // Format dd-MM-yyyy
            return [parts[2], parts[1], parts[0]].join(Constants.DATE_SEPARATOR);
        },
    }
});