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
            const oLabelPrint = this.getFromFragmento();

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

            if (!this.validateDate(oView, dStart, dEnd)) return;

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
                    let sMessage = "Error al imprimir la etiqueta.";

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
                oLabelPrint.Quantitypallets &&
                oLabelPrint.Partnumber &&
                oLabelPrint.Productcode &&
                oLabelPrint.Boxesnumber &&
                oLabelPrint.Location &&
                oLabelPrint.Productionline &&
                oLabelPrint.Document &&
                oLabelPrint.Embilstado
            );
        },

        getFromFragmento: function () {
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

        loadToFragment: function (oData) {
            this.byId("inpProductCode").setValue(oData.Productcode || Constants.STRING_EMPTY);
            this.byId("inpPartNumber").setValue(oData.Partnumber || Constants.STRING_EMPTY);
            this.byId("inpQuantityPallets").setValue(oData.Quantitypallets || Constants.STRING_EMPTY);
            this.byId("inpBoxesNumber").setValue(oData.Boxesnumber || Constants.STRING_EMPTY);
            this.byId("inpProductionLine").setValue(oData.Productionline || Constants.STRING_EMPTY);
            this.byId("inpLocation").setValue(oData.Location || Constants.STRING_EMPTY);
            this.byId("inpDocument").setValue(oData.Document || Constants.STRING_EMPTY);
            this.byId("inpEmbilstado").setValue(oData.Embilstado || Constants.STRING_EMPTY);
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

        loadToFilter: function (sProduct, dStart, dEnd) {
            // ?$filter=Productcode eq '1'
            const aFilters = [];
            if (sProduct)
                aFilters.push(new sap.ui.model.Filter("Productcode", sap.ui.model.FilterOperator.EQ, sProduct));

            if (dStart && dEnd)
                aFilters.push(new sap.ui.model.Filter("Docdate", sap.ui.model.FilterOperator.BT, Utils.toABAPDate(dStart), Utils.toABAPDate(dEnd)));

            console.log(aFilters);
            return aFilters;
        },

        onExit: function () {
            if (!this._mDialogs) return;

            Object.values(this._mDialogs).forEach(pDialog => {
                pDialog.then(oDialog => {
                    if (oDialog && !oDialog.bIsDestroyed) {
                        oDialog.destroy();
                    }
                });
            });

            this._mDialogs = null;
        }
    });
});