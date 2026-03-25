sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "fw/flexwarehouse/util/ToastHelper",
    "fw/flexwarehouse/util/Constants",
    "fw/flexwarehouse/util/Utils",
    "fw/flexwarehouse/util/PrintUtils",
    "fw/flexwarehouse/services/PrintService"
], (BaseController, ToastHelper, Constants, Utils, PrintUtils, PrintService) => {
    "use strict";

    return BaseController.extend("fw.flexwarehouse.controller.Print", {
        formatDate: Utils,
        onInit() { this._catalogsLoaded = false; },       
      
        onOpenDialog: function (oEvent) {
            const oEditContext = oEvent?.getSource()?.getBindingContext(Constants.LABEL_PRINT_MODEL_NAME) || null;
            this._oDetailContext = oEditContext;

            this._loadCatalogs();

            // Crear fragmento si no existe
            Utils.getFragment(this, Constants.FRAGMENTS.LABEL_PRINT).then(oDialog => {

                const oLabelPrint = oEditContext?.getObject() || {};

                this._loadToFragment(oLabelPrint);
                this._setModeUI(!oEditContext);

                oDialog.open();
            });
        },

        onCancel: function () { Utils.closeDialog(this, Constants.FRAGMENTS.LABEL_PRINT); },

        onSave: function () {
            const oLabelPrint = this._getFormData();

            if (!PrintUtils._isValid(oLabelPrint)) {
                ToastHelper.warning(this.getView(), Constants.REQUIRED_FIELDS_MESSAGE, 1000);
                return;
            }

            this._create(oLabelPrint);
        },

        onFilters: function () {
            const oView = this.getView();

            const sProduct = oView.byId("inpProductFilterPrint").getValue();
            const dStart = oView.byId("inpStartDateFilterPrint").getDateValue();
            const dEnd = oView.byId("inpfinalDateFilterPrint").getDateValue();

            if (!sProduct && !dStart && !dEnd) {
                ToastHelper.warning(oView, "Favor de agregar producto o rango de fechas a consultar.");
                return;
            }

            if (!Utils.validateDate(oView, dStart, dEnd)) return;

            const oTable = oView.byId("tblPrint");
            const oBinding = oTable.getBinding("items");

            oBinding.filter(this.loadToFilter(sProduct, dStart, dEnd));
        },

        onCleanFilters: function () {
            this.byId("inpProductFilterPrint").setValue(Constants.STRING_EMPTY);
            this.byId("inpStartDateFilterPrint").setValue(null);
            this.byId("inpfinalDateFilterPrint").setValue(null);

            const oView = this.getView();
            const oTable = oView.byId("tblPrint");
            oTable.getBinding("items").filter([]);

            const oBinding = oTable.getBinding("items");
            oBinding.refresh();
        },

        onProductChange: function (oEvent) {
            const sKey = oEvent.getSource().getSelectedKey();

            if (!sKey) {
                Utils.setProductPlaceholder(this.getView());
                return;
            }

            const oProductModel = this.getView().getModel(Constants.PRODUCT_MODEL_NAME);
            if (!oProductModel) return;

            const oData = oProductModel.getData();
            const aProducts = oData.results || oData;

            const oProduct = aProducts.find(p => p.Matnr === sKey);

            this.byId("txtProduct").setText(oProduct?.Maktx || Constants.STRING_EMPTY);
        },

        _loadCatalogs: function () {
            if (this._catalogsLoaded) return;

            this._loadProductionLines();
            this._loadProducts();

            this._catalogsLoaded = true;
        },

        _create: function (oLabelPrint) {
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

        _getFormData: function () {
            return {
                Quantitypallets: String(this.byId("inpQuantityPallets").getValue(), 10) || 0,
                Partnumber: "0",
                Product: String(this.byId("txtProduct").getText(), 10) || 0,
                Productcode: this.byId("selProductCode").getSelectedKey(),
                Boxesnumber: String(this.byId("inpBoxesNumber").getValue(), 10) || 0,
                Location: this.byId("inpLocation").getValue(),
                Productionline: this.byId("selProductionLines").getSelectedKey(),
                Document: "0",
                Embilstado: "0",
            };
        },

        _loadToFragment: function (oLabelPrint) {
            this.byId("selProductCode").setSelectedKey(oLabelPrint?.Productcode);
            this.byId("txtProduct").setText(oLabelPrint?.Product || Constants.STRING_EMPTY);
            this.byId("inpQuantityPallets").setValue(oLabelPrint.Quantitypallets || Constants.STRING_EMPTY);
            this.byId("inpBoxesNumber").setValue(oLabelPrint.Boxesnumber || Constants.STRING_EMPTY);
            this.byId("selProductionLines").setSelectedKey(oLabelPrint?.Productionline);
            this.byId("inpLocation").setValue(oLabelPrint.Location || Constants.STRING_EMPTY);
            // this.byId("inpDocument").setValue(oLabelPrint.Document || Constants.STRING_EMPTY);
            // this.byId("inpEmbilstado").setValue(oLabelPrint.Embilstado || Constants.STRING_EMPTY);
        },

        loadToFilter: function (sProduct, dStart, dEnd) {
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

        _setModeUI: function (bIsAdd) {
            this.byId("btnAcceptPrint").setVisible(bIsAdd);

            if (bIsAdd) {
                Utils.setProductPlaceholder(this.getView());
            }
        },

        _loadProducts: async function () {
            const oModel = this._getModelPrint();
            const oData = await PrintService.getProducts(oModel);
            const aData = Utils.formatProduct(oData);

            Utils.setJsonModel(this.getView(), Constants.PRODUCT_MODEL_NAME, aData);
            Utils.initSelect(this.byId("selProductCode"));
        },

        _loadProductionLines: async function () {
            const oModelPrint = this._getModelPrint();
            const oData = await PrintService.getProductionLines(oModelPrint);
            const aData = Utils.formatProductionLines(oData);

            Utils.setJsonModel(this.getView(), Constants.PRODUCTION_LINE_MODEL_NAME, aData);
            Utils.initSelect(this.byId("selProductionLines"));
        },

        _getModelPrint: function () {
            return this.getView().getModel(Constants.LABEL_PRINT_MODEL_NAME);
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
        },
    });
});