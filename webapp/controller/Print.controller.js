sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "fw/flexwarehouse/util/ToastHelper",
    "fw/flexwarehouse/util/Constants",
    "fw/flexwarehouse/util/Utils"
], (BaseController, ToastHelper, Constants, Utils) => {
    "use strict";

    return BaseController.extend("fw.flexwarehouse.controller.Print", {
        formatDate: Utils,
        onInit() { this._catalogsLoaded = false; },

        loadCatalogs: function () {
            if (this._catalogsLoaded) return;

            this.getProductionLines();
            this.getProduct();

            this._catalogsLoaded = true;
        },

        // Abrir Modal para agregar o editar
        onOpenDialog: function (oEvent) {
            const oEditContext = oEvent?.getSource()?.getBindingContext(Constants.LABEL_PRINT_MODEL_NAME) || null;

            this.loadCatalogs();

            // Crear fragmento si no existe
            Utils.getFragment(this, Constants.FRAGMENTS.LABEL_PRINT).then(oDialog => {

                const oLabelPrint = oEditContext?.getObject() || {};
                this.loadToFragment(oLabelPrint);

                this.byId("btnAcceptPrint").setVisible(!oEditContext);

                oDialog.open();
            });
        },

        getProduct: function () {
            const oModel = this.getModelPrint();

            oModel.read("/ProductSet", {
                success: (oData) => {

                    const aData = this.formatProduct(oData);

                    const oJsonModel = new sap.ui.model.json.JSONModel(aData);
                    this.getView().setModel(oJsonModel, Constants.PRODUCT_MODEL_NAME);

                    this.initSelectPlaceholderBehavior("selProductCode");
                },
                error: (oError) => { console.error("Error al cargar líneas:", oError); }
            });
        },

        getProductionLines: function () {
            const oModel = this.getModelPrint();

            oModel.read("/ProductionLinesSet", {
                success: (oData) => {

                    const aData = this.formatProductionLines(oData);

                    const oJsonModel = new sap.ui.model.json.JSONModel(aData);
                    this.getView().setModel(oJsonModel, Constants.PRODUCTION_LINE_MODEL_NAME);

                    this.initSelectPlaceholderBehavior("selProductionLines");
                },
                error: (oError) => { console.error("Error al cargar líneas:", oError); }
            });
        },

        getModelPrint: function () {
            const oView = this.getView();
            return oView.getModel(Constants.LABEL_PRINT_MODEL_NAME);
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

        initSelectPlaceholderBehavior: function (id) {
            const oSelect = this.byId(id);

            const fnUpdateStyle = () => {
                const bEmpty = !oSelect.getSelectedKey();
                oSelect.toggleStyleClass("placeholder", bEmpty);
            };

            // evitar múltiples attach
            oSelect.detachChange(fnUpdateStyle);
            oSelect.attachChange(fnUpdateStyle);

            fnUpdateStyle();
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
                oLabelPrint.Quantitypallets &&
                oLabelPrint.Boxesnumber && oLabelPrint.Location &&
                oLabelPrint.Document && oLabelPrint.Embilstado &&
                oLabelPrint.Productcode && oLabelPrint.Productionline
            );
        },

        getFromFragment: function () {
            return {
                Quantitypallets: String(this.byId("inpQuantityPallets").getValue(), 10) || 0,
                Partnumber: "0",
                Productcode: this.byId("selProductCode").getSelectedKey(),
                Boxesnumber: String(this.byId("inpBoxesNumber").getValue(), 10) || 0,
                Location: this.byId("inpLocation").getValue(),
                Productionline: this.byId("selProductionLines").getSelectedKey(),
                Document: String(this.byId("inpDocument").getValue(), 10) || 0,
                Embilstado: String(this.byId("inpEmbilstado").getValue(), 10) || 0
            };
        },

        loadToFragment: function (oLabelPrint) {
            this.byId("selProductCode").setSelectedKey(oLabelPrint?.Productcode || Constants.STRING_EMPTY);
            this.byId("inpQuantityPallets").setValue(oLabelPrint.Quantitypallets || Constants.STRING_EMPTY);
            this.byId("inpBoxesNumber").setValue(oLabelPrint.Boxesnumber || Constants.STRING_EMPTY);
            this.byId("selProductionLines").setSelectedKey(oLabelPrint?.Productionline);
            this.byId("inpLocation").setValue(oLabelPrint.Location || Constants.STRING_EMPTY);
            this.byId("inpDocument").setValue(oLabelPrint.Document || Constants.STRING_EMPTY);
            this.byId("inpEmbilstado").setValue(oLabelPrint.Embilstado || Constants.STRING_EMPTY);
        },

        getProductByCode: function (sCode) {
            if (!sCode) return Constants.STRING_EMPTY;

            const oModel = this.getView().getModel(Constants.PRODUCT_MODEL_NAME);

            if (!oModel) return Constants.STRING_EMPTY;

            const oData = oModel.getData();
            const aProducts = oData.results || oData;

            const oProduct = aProducts.find(p => p.Matnr === sCode);

            return oProduct?.Maktx || Constants.STRING_EMPTY;
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