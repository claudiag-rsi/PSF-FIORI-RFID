sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "fw/flexwarehouse/util/ToastHelper",
    "fw/flexwarehouse/util/Constants",
    "fw/flexwarehouse/util/Utils"
], (BaseController, ToastHelper, Constants, Utils) => {
    "use strict";

    return BaseController.extend("fw.flexwarehouse.controller.Print", {
        formatDate: Utils,
        onInit() { },

        // Abrir Modal para agregar o editar
        onOpenDialog: function (oEvent) {
            const oEditContext = oEvent?.getSource()?.getBindingContext(Constants.LABEL_PRINT_MODEL_NAME) || null;

            // Crear fragmento si no existe
            Utils.getFragment(this, Constants.FRAGMENTS.LABEL_PRINT).then(oDialog => {

                const oLabelPrint = oEditContext?.getObject() || {};
                this.loadToFragment(oLabelPrint);

                this.byId("btnAcceptPrint").setVisible(!oEditContext);

                oDialog.open();
            });
        },

        onCancel: function () { Utils.closeDialog(this, Constants.FRAGMENTS.LABEL_PRINT); },

        onSave: function () {
            const oLabelPrint = this.getFromFragment();

            if (!this.isValid(oLabelPrint)) {
                ToastHelper.warning(this.getView(), "Campos obligatorios.");
                return;
            }

            this.add(oLabelPrint);
        },

        onFilters: function () {
            const oView = this.getView();
            const oTable = oView.byId("tblPrint");
            const oBinding = oTable.getBinding("items");

            const sProduct = oView.byId("inpProductFilterPrint").getValue();
            const dStart = oView.byId("inpStartDateFilterPrint").getDateValue();
            const dEnd = oView.byId("inpfinalDateFilterPrint").getDateValue();

            if (!sProduct && !dStart && !dEnd) {
                ToastHelper.warning(oView, "Favor de agregar producto o rango de fechas a consultar.");
                return;
            }

            if (!Utils.validateDate(oView, dStart, dEnd)) return;

            oBinding.filter(this.loadToFilter(sProduct, dStart, dEnd));
        },

        onCleanFilters: function () {
            const oView = this.getView();
            const oTable = oView.byId("tblPrint");
            const oBinding = oTable.getBinding("items");

            this.byId("inpProductFilterPrint").setValue(Constants.STRING_EMPTY);
            this.byId("inpStartDateFilterPrint").setValue(null);
            this.byId("inpfinalDateFilterPrint").setValue(null);

            oTable.getBinding("items").filter([]);
            oBinding.refresh();
        },

        add: function (oLabelPrint) {
            const oView = this.getView();
            const oModel = oView.getModel(Constants.LABEL_PRINT_MODEL_NAME);

            oModel.create("/LabelPrintSet", oLabelPrint, {
                success: () => {

                    ToastHelper.success(oView, "La impresión se ha generado correctamente.");

                    oModel.refresh(true);

                    Utils.closeDialog(this, Constants.FRAGMENTS.LABEL_PRINT);
                },
                error: function (oError) {
                    let sMessage = oError ? oError.message : "Error al imprimir la etiqueta.";

                    try {
                        // Parsear mensaje del error
                        const responseText = JSON.parse(oError.responseText);

                        if (responseText.error && responseText.error.message && responseText.error.message.value)
                            sMessage = responseText.error.message.value;

                    } catch (e) {
                        console.error("Error parseando mensaje del backend.", e);
                    }

                    ToastHelper.error(oView, sMessage);
                }
            });
        },

        isValid: function (oLabelPrint) {
            return !!(
                oLabelPrint.Quantitypallets && oLabelPrint.Partnumber &&
                oLabelPrint.Productcode && oLabelPrint.Boxesnumber &&
                oLabelPrint.Location && oLabelPrint.Productionline &&
                oLabelPrint.Document && oLabelPrint.Embilstado
            );
        },

        getFromFragment: function () {
            return {
                Quantitypallets: String(this.byId("inpQuantityPallets").getValue(), 10) || 0,
                Partnumber: this.byId("inpPartNumber").getValue(),
                Productcode: this.byId("inpProductCode").getValue(),
                Boxesnumber: String(this.byId("inpBoxesNumber").getValue(), 10) || 0,
                Location: this.byId("inpLocation").getValue(),
                Productionline: this.byId("inpProductionLine").getValue(),
                Document: String(this.byId("inpDocument").getValue(), 10) || 0,
                Embilstado: String(this.byId("inpEmbilstado").getValue(), 10) || 0
            };
        },

        loadToFragment: function (oLabelPrint) {
            this.byId("inpProductCode").setValue(oLabelPrint.Productcode || Constants.STRING_EMPTY);
            this.byId("inpPartNumber").setValue(oLabelPrint.Partnumber || Constants.STRING_EMPTY);
            this.byId("inpQuantityPallets").setValue(oLabelPrint.Quantitypallets || Constants.STRING_EMPTY);
            this.byId("inpBoxesNumber").setValue(oLabelPrint.Boxesnumber || Constants.STRING_EMPTY);
            this.byId("inpProductionLine").setValue(oLabelPrint.Productionline || Constants.STRING_EMPTY);
            this.byId("inpLocation").setValue(oLabelPrint.Location || Constants.STRING_EMPTY);
            this.byId("inpDocument").setValue(oLabelPrint.Document || Constants.STRING_EMPTY);
            this.byId("inpEmbilstado").setValue(oLabelPrint.Embilstado || Constants.STRING_EMPTY);
        },

        loadToFilter: function (sProduct, dStart, dEnd) {
            // ?$filter=Productcode eq '1'
            const aFilters = [];
            const oModel = sap.ui.model;
            const oFilter = oModel.Filter;
            const oOperator = oModel.FilterOperator;

            if (sProduct)
                aFilters.push(new oFilter("Productcode", oOperator.EQ, sProduct));

            if (dStart && dEnd)
                aFilters.push(new oFilter("Docdate", oOperator.BT, Utils.toABAPDate(dStart), Utils.toABAPDate(dEnd)));

            return aFilters;
        },

        onExit: function () {
            if (!this._mDialogs) return;

            Object.values(this._mDialogs).forEach(pDialog => {
                pDialog.then(oDialog => {
                    if (oDialog && !oDialog.bIsDestroyed)
                        oDialog.destroy();

                });
            });

            this._mDialogs = null;
        }
    });
});