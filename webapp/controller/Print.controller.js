sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "fw/flexwarehouse/util/ToastHelper",
    "fw/flexwarehouse/util/Constants",
    "fw/flexwarehouse/util/Utils",
    "fw/flexwarehouse/util/PrintUtils",
    "fw/flexwarehouse/services/PrintService",
    "fw/flexwarehouse/util/DialogManager"
], (BaseController, ToastHelper, Constants, Utils, PrintUtils, PrintService, DialogManager) => {
    "use strict";

    return BaseController.extend("fw.flexwarehouse.controller.Print", {
        formatDate: Utils,
        onInit() { this._catalogsLoaded = false; },

        onOpenDialog: async function (oEvent) {
            const oEditContext = oEvent?.getSource()?.getBindingContext(Constants.PRINT_MODEL_NAME) || null;

            await this._loadCatalogs();

            const oDialog = await Utils.getFragment(this, Constants.FRAGMENTS.LABEL_PRINT);

            const oLabelPrint = oEditContext?.getObject() || {};

            this._loadToFragment(oLabelPrint);
            this._setModeUI(!oEditContext);

            oDialog.open();

            PrintUtils._initSelects(this.getView());
        },

        onCancel: function () { Utils.closeDialog(this, Constants.FRAGMENTS.LABEL_PRINT); },

        onSave: function () {
            const oLabelPrint = this._getFormData();

            if (!PrintUtils._isValid(oLabelPrint)) {
                ToastHelper.warning(this.getView(), Constants.REQUIRED_FIELDS_MESSAGE, 1000);
                return;
            }

            if (!Utils.isNumber(oLabelPrint.Quantitypallets) || !Utils.isNumber(oLabelPrint.Boxesnumber)) {
                ToastHelper.warning(this.getView(), Constants.INVALID_FIELD_TYPES_MESSAGE);
                return;
            }

            this._create(oLabelPrint);
        },

        onFilters: function () {
            const oView = this.getView();

            const sProduct = oView.byId(Constants.PRINTING_COMPONENTS.PRODUCT_FILTER).getValue();
            const dStart = oView.byId(Constants.PRINTING_COMPONENTS.START_DATE_FILTER).getDateValue();
            const dEnd = oView.byId(Constants.PRINTING_COMPONENTS.FINAL_DATE_FILTER).getDateValue();

            if (!sProduct && !dStart && !dEnd) {
                ToastHelper.warning(oView, "Favor de agregar producto o rango de fechas a consultar.");
                return;
            }

            if (!Utils.validateDate(oView, dStart, dEnd)) return;

            const oTable = oView.byId(Constants.PRINTING_COMPONENTS.TABLE);
            const oBinding = oTable.getBinding(Constants.PRINTING_COMPONENTS.TABLE_ITEMS);

            oBinding.filter(this._loadToFilter(sProduct, dStart, dEnd));
        },

        onCleanFilters: function () {
            this.byId(Constants.PRINTING_COMPONENTS.PRODUCT_FILTER).setValue(Constants.STRING_EMPTY);
            this.byId(Constants.PRINTING_COMPONENTS.START_DATE_FILTER).setValue(null);
            this.byId(Constants.PRINTING_COMPONENTS.FINAL_DATE_FILTER).setValue(null);

            const oView = this.getView();
            const oTable = oView.byId(Constants.PRINTING_COMPONENTS.TABLE);
            oTable.getBinding(Constants.PRINTING_COMPONENTS.TABLE_ITEMS).filter([]);

            const oBinding = oTable.getBinding(Constants.PRINTING_COMPONENTS.TABLE_ITEMS);
            oBinding.refresh();
        },

        onProductChange: function (oEvent) {
            const sKey = oEvent.getSource().getSelectedKey();

            if (!sKey) {
                Utils.setProductPlaceholder(this.getView());
                return;
            }

            const oProductModel = this._getProductModel();
            if (!oProductModel) return;

            const oData = oProductModel.getData();
            const aProducts = oData.results || oData;

            const oProduct = aProducts.find(p => p.Matnr === sKey);

            this.byId(Constants.PRINTING_COMPONENTS.PRODUCT).setText(oProduct?.Maktx || Constants.STRING_EMPTY);
        },

        onLocationChange: function (oEvent) {
            const sWerks = oEvent.getSource().getSelectedKey();

            this._loadProductionLines(sWerks);
        },

        _loadCatalogs: async function () {
            if (this._catalogsLoaded) return;

            await this._loadLocation();
            await this._loadProducts();

            // carga inicial sin filtro o con default
            await this._loadProductionLines();

            this._catalogsLoaded = true;
        },

        _create: function (oLabelPrint) {
            const oView = this.getView();
            const oODataModel = this._getPrintModel();

            oODataModel.create("/LabelPrintSet", oLabelPrint, {
                success: () => {
                    ToastHelper.success(oView, "La impresión se ha generado correctamente.");
                    Utils.closeDialog(this, Constants.FRAGMENTS.LABEL_PRINT);

                    oODataModel.refresh(true);
                },
                error: function (oError) {
                    const sMessage = Utils.getErrorMessage(oError, "Error al imprimir la etiqueta.");
                    ToastHelper.error(oView, sMessage);
                }
            });
        },

        _getFormData: function () {
            return {
                Quantitypallets: String(this.byId(Constants.PRINTING_COMPONENTS.QUANTITY_PALLETS).getValue(), 10) || 0,
                Product: String(this.byId(Constants.PRINTING_COMPONENTS.PRODUCT).getText(), 10) || 0,
                Productcode: this.byId(Constants.PRINTING_COMPONENTS.PRODUCT_CODE).getSelectedKey(),
                Boxesnumber: String(this.byId(Constants.PRINTING_COMPONENTS.BOXES_NUMBER).getValue(), 10) || 0,
                Location: this.byId(Constants.PRINTING_COMPONENTS.LOCATION).getSelectedKey(),
                Productionline: this.byId(Constants.PRINTING_COMPONENTS.PRODUCTION_LINE).getSelectedKey(),
                Document: "0",
                Embilstado: "0",
                Partnumber: "0",
            };
        },

        _loadToFragment: function (oLabelPrint) {
            this.byId(Constants.PRINTING_COMPONENTS.PRODUCT_CODE).setSelectedKey(oLabelPrint?.Productcode);
            this.byId(Constants.PRINTING_COMPONENTS.PRODUCT).setText(oLabelPrint?.Product || Constants.STRING_EMPTY);
            this.byId(Constants.PRINTING_COMPONENTS.QUANTITY_PALLETS).setValue(oLabelPrint.Quantitypallets || Constants.STRING_EMPTY);
            this.byId(Constants.PRINTING_COMPONENTS.BOXES_NUMBER).setValue(oLabelPrint.Boxesnumber || Constants.STRING_EMPTY);
            this.byId(Constants.PRINTING_COMPONENTS.PRODUCTION_LINE).setSelectedKey(oLabelPrint?.Productionline);
            this.byId(Constants.PRINTING_COMPONENTS.LOCATION).setSelectedKey(oLabelPrint?.Location);
        },

        _loadToFilter: function (sProduct, dStart, dEnd) {
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
            const comboProductionLines = this.byId(Constants.PRINTING_COMPONENTS.PRODUCTION_LINE);
            const comboProductCode = this.byId(Constants.PRINTING_COMPONENTS.PRODUCT_CODE);
            const comboLocation = this.byId(Constants.PRINTING_COMPONENTS.LOCATION);

            this.byId(Constants.PRINTING_COMPONENTS.CREATE).setVisible(bIsAdd);
            this.byId(Constants.PRINTING_COMPONENTS.QUANTITY_PALLETS).setEnabled(bIsAdd);
            this.byId(Constants.PRINTING_COMPONENTS.BOXES_NUMBER).setEnabled(bIsAdd);

            comboProductCode.setEnabled(bIsAdd);
            comboProductionLines.setEnabled(bIsAdd);
            comboLocation.setEnabled(bIsAdd);

            if (bIsAdd) {
                Utils.setProductPlaceholder(this.getView());
                Utils.setDefaultValues(comboProductionLines);
                Utils.setDefaultValues(comboProductCode);
                Utils.setDefaultValues(comboLocation);
            }
        },

        _loadProducts: async function () {
            const oData = await PrintService.getProducts(this._getPrintModel());
            const aData = Utils.formatProduct(oData);

            Utils.setJsonModel(this.getView(), Constants.PRODUCT_MODEL_NAME, aData);
        },

        _loadProductionLines: async function (selectedWerks) {
            const oView = this.getView();

            // 1. Obtener y transformar datos
            const oData = await PrintService.getProductionLines(this._getPrintModel());
            const aFormatted = Utils.formatTableProductionLine(oData, "Arbpl");

            // 2. Filtrar (sin mutar)
            const aFiltered = selectedWerks
                ? aFormatted.filter(item => item.Werks === selectedWerks)
                : aFormatted;

            // 3. Setear modelo
            Utils.setJsonModel(oView, Constants.PRODUCTION_LINE_MODEL_NAME, aFiltered);


            // 4. Manejo de UI separado
            PrintUtils._updateProductionLineSelection(aFiltered, selectedWerks, oView);
        },

        _loadLocation: async function () {
            const oData = await PrintService.getProductionLines(this._getPrintModel());
            const aData = Utils.formatTableProductionLine(oData, "Werks");
            const aUnique = PrintUtils._filterUniqueValues(aData);

            Utils.setJsonModel(this.getView(), Constants.LOCATION_MODEL_NAME, aUnique);
        },

        _getPrintModel: function () { return this.getView().getModel(Constants.PRINT_MODEL_NAME); },

        _getProductModel: function () { return this.getView().getModel(Constants.PRODUCT_MODEL_NAME); },

        onExit: function () { DialogManager.destroyDialogs(this, "_mDialogs"); },
    });
});