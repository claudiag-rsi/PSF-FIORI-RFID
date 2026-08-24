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

        onInit() {
            this._catalogsLoaded = false;
            this._maxValue = null;
            this._canProduce = false;
            this._canProduceMessage = Constants.STRING_EMPTY;
        },

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

        onCancel: function () {
            this._maxValue = null;
            Utils.closeDialog(this, Constants.FRAGMENTS.LABEL_PRINT);
        },

        onSave: function () {
            const oLabelPrint = this._getFormData();

            if (!this._canProduce && oLabelPrint.Productcode && oLabelPrint.Productionline && oLabelPrint.Location) {
                ToastHelper.warning(this.getView(), this._canProduceMessage, 3000);
                return;
            }

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
            const aControls = [
                { id: Constants.PRINTING_COMPONENTS.PRODUCT_FILTER, value: Constants.STRING_EMPTY },
                { id: Constants.PRINTING_COMPONENTS.START_DATE_FILTER, value: null },
                { id: Constants.PRINTING_COMPONENTS.FINAL_DATE_FILTER, value: null }
            ];

            Utils.mapObjectToControls(this, aControls);

            const oTable = this.byId(Constants.PRINTING_COMPONENTS.TABLE);
            const oBinding = oTable.getBinding(Constants.PRINTING_COMPONENTS.TABLE_ITEMS);

            oTable.getBinding(Constants.PRINTING_COMPONENTS.TABLE_ITEMS).filter([]);
            oBinding.refresh();
        },

        onProductChange: async function () {
            const {
                Productcode: sProductCode,
                Productionline: sProductionline,
                Location: sCenter
            } = this._getFormData();

            if (!sProductCode) {
                Utils.setProductPlaceholder(this.getView());
                return;
            }

            await this._loadProduct(sProductCode);

            if (!sProductCode || !sProductionline || !sCenter)
                return;

            const oData = await PrintService.validateProductForProductionLine(
                this._getModel(Constants.PRINT_MODEL_NAME),
                sProductCode,
                sProductionline,
                sCenter
            );

            this._canProduce = oData?.Exists === true;
            this._canProduceMessage = oData?.Message || Constants.STRING_EMPTY;

            if (!this._canProduce) {
                this._maxValue = null;

                Utils.mapObjectToControls(this, [
                    { id: Constants.PRINTING_COMPONENTS.BOXES_NUMBER, value: Constants.STRING_EMPTY },
                    { id: Constants.PRINTING_COMPONENTS.QUANTITY_PALLETS, value: Constants.STRING_EMPTY }
                ]);

                ToastHelper.warning(this.getView(), this._canProduceMessage, 3000);

                return;
            }

            await this._loadProductDetails(sProductCode, sCenter);
        },

        onValueChange: async function (oEvent) {
            const oBoxesNumber = this.byId(Constants.PRINTING_COMPONENTS.BOXES_NUMBER);
            const iValue = Number(oBoxesNumber.getValue());
            const iMaxValue = this._maxValue;

            if (iValue < 1) {
                oBoxesNumber.setValue("1");

                ToastHelper.warning(this.getView(), "La cantidad mínima es 1.", 3000);
                return;
            }

            if (iMaxValue != null && iValue > iMaxValue) {
                oBoxesNumber.setValue(iMaxValue.toString());

                ToastHelper.warning(this.getView(), `La cantidad de cajas ingresada [${iValue}] no puede superar el valor de ${iMaxValue}.`, 3000);
                return;
            }
        },

        _loadCatalogs: async function () {
            if (this._catalogsLoaded) return;

            await this._getCenter();
            await this._getProducts();
            await this._getProductionLines();

            this._catalogsLoaded = true;
        },

        _create: function (oLabelPrint) {
            try {
                const oODataModel = this._getModel(Constants.PRINT_MODEL_NAME);

                PrintService.create(oODataModel, oLabelPrint);
                ToastHelper.success(this.getView(), "La impresión se ha generado correctamente.");

                oODataModel.refresh(true);
            } catch (oError) {
                const sMessage = Utils.getErrorMessage(oError, "Error al imprimir la etiqueta.");

                ToastHelper.error(this.getView(), sMessage);
            }
        },

        _getFormData: function () {
            return {
                Quantitypallets: String(this.byId(Constants.PRINTING_COMPONENTS.QUANTITY_PALLETS).getValue(), 10) || 0,
                Product: String(this.byId(Constants.PRINTING_COMPONENTS.PRODUCT).getText(), 10) || 0,
                Productcode: this.byId(Constants.PRINTING_COMPONENTS.PRODUCT_CODE).getSelectedKey(),
                Boxesnumber: String(this.byId(Constants.PRINTING_COMPONENTS.BOXES_NUMBER).getValue(), 10) || 0,
                Location: this.byId(Constants.PRINTING_COMPONENTS.CENTER).getSelectedKey(),
                Productionline: this.byId(Constants.PRINTING_COMPONENTS.PRODUCTION_LINE).getSelectedKey(),
                Document: "0",
                Partnumber: "0",
            };
        },

        _loadToFragment: function (oLabelPrint) {
            this.byId(Constants.PRINTING_COMPONENTS.PRODUCT_CODE).setSelectedKey(oLabelPrint?.Productcode);
            this.byId(Constants.PRINTING_COMPONENTS.PRODUCT).setText(oLabelPrint?.Product || Constants.STRING_EMPTY);
            this.byId(Constants.PRINTING_COMPONENTS.QUANTITY_PALLETS).setValue(oLabelPrint.Quantitypallets || Constants.STRING_EMPTY);
            this.byId(Constants.PRINTING_COMPONENTS.BOXES_NUMBER).setValue(oLabelPrint.Boxesnumber || Constants.STRING_EMPTY);
            this.byId(Constants.PRINTING_COMPONENTS.PRODUCTION_LINE).setSelectedKey(oLabelPrint?.Productionline);
            this.byId(Constants.PRINTING_COMPONENTS.CENTER).setSelectedKey(oLabelPrint?.Location);
            this.byId(Constants.PRINTING_COMPONENTS.EMBILSTADO).setValue(oLabelPrint?.Embilstado);

        },

        _loadToFilter: function (sProduct, dStart, dEnd) {
            const aFilters = [];
            const oModel = sap.ui.model;
            const oFilter = oModel.Filter;
            const oOperator = oModel.FilterOperator;

            if (sProduct)
                aFilters.push(new oFilter("Productcode", oOperator.EQ, sProduct));

            if (dStart && dEnd)
                aFilters.push(new oFilter("Docdate", oOperator.BT, dStart, dEnd));

            return aFilters;
        },

        _setModeUI: function (bIsAdd) {
            const comboProductionLines = this.byId(Constants.PRINTING_COMPONENTS.PRODUCTION_LINE);
            const comboProductCode = this.byId(Constants.PRINTING_COMPONENTS.PRODUCT_CODE);
            const comboCenter = this.byId(Constants.PRINTING_COMPONENTS.CENTER);

            this.byId(Constants.PRINTING_COMPONENTS.CREATE).setVisible(bIsAdd);
            this.byId(Constants.PRINTING_COMPONENTS.QUANTITY_PALLETS).setEnabled(false);
            this.byId(Constants.PRINTING_COMPONENTS.EMBILSTADO).setEnabled(false);
            this.byId(Constants.PRINTING_COMPONENTS.BOXES_NUMBER).setEnabled(bIsAdd);


            this.byId(Constants.PRINTING_COMPONENTS.EMBILSTADO_DIV).setVisible(!bIsAdd);

            comboProductCode.setEnabled(bIsAdd);
            comboProductionLines.setEnabled(bIsAdd);
            comboCenter.setEnabled(bIsAdd);

            if (bIsAdd) {
                Utils.setProductPlaceholder(this.getView());
                Utils.setDefaultValues(comboProductionLines);
                Utils.setDefaultValues(comboProductCode);
                Utils.setDefaultValues(comboCenter);
            }
        },

        _loadProduct: async function (sKey) {
            const oProductModel = this._getModel(Constants.PRODUCT_MODEL_NAME);
            if (!oProductModel) return;

            const oProduct = oProductModel.getData();

            const aProducts = oProduct.results || oProduct;
            const oItemProduct = aProducts.find(p => p.Matnr === sKey);

            this.byId(Constants.PRINTING_COMPONENTS.PRODUCT).setText(oItemProduct?.Maktx || Constants.STRING_EMPTY);
        },

        _loadProductDetails: async function (sMatnr, sWerks) {
            const oView = this.getView();

            try {
                const oData = await PrintService.getProductDetails(this._getModel(Constants.PRINT_MODEL_NAME), sMatnr, sWerks);

                Utils.setJsonModel(oView, Constants.PRODUCT_DETAILS_MODEL_NAME, oData);

                const oProductDetailsModel = this._getModel(Constants.PRODUCT_DETAILS_MODEL_NAME);

                if (!oProductDetailsModel) return;

                const oProductDetails = oProductDetailsModel.getData();

                this._maxValue = Number(oProductDetails?.Umrez);

                Utils.mapObjectToControls(this, [
                    { id: Constants.PRINTING_COMPONENTS.BOXES_NUMBER, value: oProductDetails?.Umrez },
                    { id: Constants.PRINTING_COMPONENTS.QUANTITY_PALLETS, value: oProductDetails?.Ean11 }
                ]);
            }
            catch (sErrorMessage) {
                ToastHelper.error(oView, sErrorMessage);

                Utils.mapObjectToControls(this, [
                    { id: Constants.PRINTING_COMPONENTS.BOXES_NUMBER, value: Constants.STRING_EMPTY },
                    { id: Constants.PRINTING_COMPONENTS.QUANTITY_PALLETS, value: Constants.STRING_EMPTY }
                ]);
            }
        },

        _getProducts: async function () {
            const oData = await PrintService.getProducts(this._getModel(Constants.PRINT_MODEL_NAME));
            const aData = Utils.formatProduct(oData);

            Utils.setJsonModel(this.getView(), Constants.PRODUCT_MODEL_NAME, aData);
        },

        _getProductionLines: async function (selectedWerks) {
            const oView = this.getView();

            // 1. Obtener y transformar datos
            const oData = await PrintService.getProductionLines(this._getModel(Constants.PRINT_MODEL_NAME));
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

        _getCenter: async function () {
            const oData = await PrintService.getProductionLines(this._getModel(Constants.PRINT_MODEL_NAME));
            const aData = Utils.formatTableProductionLine(oData, "Werks");
            const aUnique = PrintUtils._filterUniqueValues(aData);

            Utils.setJsonModel(this.getView(), Constants.CENTER_MODEL_NAME, aUnique);
        },

        _getModel: function (modelName) { return this.getView().getModel(modelName); },

        onExit: function () { DialogManager.destroyDialogs(this, "_mDialogs"); },
    });
});