sap.ui.define([
    "fw/flexwarehouse/util/Constants",
    "fw/flexwarehouse/util/ToastHelper"
], function (Constants, ToastHelper) {
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
                    pattern: Constants.FORMAT_ABAP_DATE
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

        formatDateToString: function (date) {

            if (!date) return Constants.STRING_EMPTY;

            var oDateFormat = sap.ui.core.format.DateFormat.getDateInstance({
                pattern: Constants.FORMAT_DATE,
                UTC: true
            });

            return oDateFormat.format(new Date(date));

        },
        
        validateDate: function (oView, dStart, dEnd) {
            if (!dStart && !dEnd) { return true; }

            // Si falta una de las dos
            if (!dStart) {
                ToastHelper.warning(oView, "Favor de ingresar fecha inicial a consultar.");
                return false;
            }

            if (!dEnd) {
                ToastHelper.warning(oView, "Favor de ingresar fecha final a consultar.");
                return false;
            }

            // Validar rango
            if (dEnd < dStart) {
                ToastHelper.warning(oView, "La fecha final no puede ser menor a la fecha inicial.");
                return false;
            }

            return true;
        },

        setJsonModel: function (oView, sName, aData, iSize = 1000) {
            const oModel = new sap.ui.model.json.JSONModel(aData);
            oModel.setSizeLimit(iSize);
           oView.setModel(oModel, sName);
        },

        initSelect: function (oSelect) {

            const fnUpdateStyle = () => {
                const bEmpty = !oSelect.getSelectedKey();
                oSelect.toggleStyleClass("placeholder", bEmpty);
            };

            // evitar múltiples attach
            oSelect.detachChange(fnUpdateStyle);
            oSelect.attachChange(fnUpdateStyle);

            fnUpdateStyle();
        },

        setProductPlaceholder: function (oView) {
            const sText = oView
                .getModel("i18n")
                .getResourceBundle()
                .getText("columnProduct");

            oView.byId("txtProduct").setText(sText);
        },

        formatProduct: function (oData) {
            const aData = oData.results.map(item => ({
                ...item,
                Description: item.Matnr
            }));

            // 👉 placeholder real
            aData.unshift({
                Mandt: Constants.STRING_EMPTY,
                Matnr: Constants.STRING_EMPTY,
                Spras: Constants.STRING_EMPTY,
                Maktx: Constants.STRING_EMPTY,
                Maktg: Constants.STRING_EMPTY,
                Description: Constants.EMPTY_ELEMENT,
            });

            return aData;
        },

        formatProductionLines: function (oData) {
            const aData = oData.results.map(item => ({
                ...item,
                Description: item.Arbpl
            }));

            // 👉 placeholder real
            aData.unshift({
                Mandt: Constants.STRING_EMPTY,
                Werks: Constants.STRING_EMPTY,
                Arbpl: Constants.STRING_EMPTY,
                Description: Constants.EMPTY_ELEMENT,
            });

            return aData;
        },
    }
});