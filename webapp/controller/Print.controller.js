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
            this._maxPrintQuantity = null;
            this._canProduce = false;
            this._productionValidationMessage = Constants.STRING_EMPTY;
        },

        onOpenDialog: async function (oEvent) {
            const oEditContext = oEvent
                ?.getSource()
                ?.getBindingContext(Constants.PRINT_MODEL_NAME) || null;

            await this._loadCatalogs();

            const oDialog = await Utils.getFragment(
                this,
                Constants.FRAGMENTS.LABEL_PRINT
            );

            const oPrintRequest = oEditContext?.getObject() || {};

            this._loadToFragment(oPrintRequest);
            this._setModeUI(!oEditContext);

            oDialog.open();

            PrintUtils._initSelects(this.getView());
        },

        onCancel: function () {
            this._maxPrintQuantity = null;

            Utils.closeDialog(this, Constants.FRAGMENTS.LABEL_PRINT);
        },

        onSave: function () {
            const oPrintRequest = this._getFormData();


            this.byId(
                Constants.PRINTING_COMPONENTS.PRINT_DATE)
                .setValue(Constants.STRING_EMPTY);

            Utils.setPlaceholder(this.getView(), "PrintDateColumn", Constants.PRINTING_COMPONENTS.PRINT_DATE);

            if (!this._canProduce && oPrintRequest.Productcode && oPrintRequest.Productionline && oPrintRequest.Location) {
                ToastHelper.warning(this.getView(), this._productionValidationMessage, 3000);
                return;
            }

            if (!PrintUtils._isValid(oPrintRequest)) {
                ToastHelper.warning(this.getView(), Constants.REQUIRED_FIELDS_MESSAGE, 1000);
                return;
            }

            if (!Utils.isNumber(oPrintRequest.Quantitypallets) || !Utils.isNumber(oPrintRequest.Boxesnumber)) {
                ToastHelper.warning(this.getView(), Constants.INVALID_FIELD_TYPES_MESSAGE);
                return;
            }

            this._create(oPrintRequest);
        },

        onApplyFilters: function () {
            const oView = this.getView();
            const oComponents = Constants.PRINTING_COMPONENTS;

            const sProduct = oView
                .byId(oComponents.PRODUCT_FILTER)
                .getValue()
                .trim();

            const dStartDate = oView
                .byId(oComponents.START_DATE_FILTER)
                .getDateValue();

            const dEndDate = oView
                .byId(oComponents.FINAL_DATE_FILTER)
                .getDateValue();

            if (!sProduct && !dStartDate && !dEndDate) {
                ToastHelper.warning(
                    oView,
                    "Favor de agregar producto o rango de fechas a consultar."
                );

                return;
            }

            if (!Utils.validateDate(oView, dStartDate, dEndDate)) return;

            const oTable = oView.byId(oComponents.TABLE);
            const oBinding = oTable.getBinding(oComponents.TABLE_ITEMS);

            oBinding.filter(this._loadToFilter(sProduct, dStartDate, dEndDate));
        },

        onClearFilters: function () {
            const oComponents = Constants.PRINTING_COMPONENTS;

            const aFilterControls = [
                { id: oComponents.PRODUCT_FILTER, value: Constants.STRING_EMPTY },
                { id: oComponents.START_DATE_FILTER, value: null },
                { id: oComponents.FINAL_DATE_FILTER, value: null }
            ];

            Utils.mapObjectToControls(this, aFilterControls);

            const oTable = this.byId(oComponents.TABLE);
            const oBinding = oTable.getBinding(oComponents.TABLE_ITEMS);

            oBinding.filter([]);
            oBinding.refresh();
        },

        onProductChange: async function () {
            const {
                Productcode: sProductCode,
                Productionline: sProductionLine,
                Location: sCenter
            } = this._getFormData();

            if (!sProductCode) {
                Utils.setProductPlaceholder(this.getView());
                return;
            }

            await this._loadProduct(sProductCode);

            if (!sProductionLine || !sCenter)
                return;

            const oValidationResult = await PrintService.validateProductForProductionLine(
                this._getModel(Constants.PRINT_MODEL_NAME),
                sProductCode,
                sProductionLine,
                sCenter
            );

            this._canProduce = oValidationResult?.Exists === true;
            this._productionValidationMessage = oValidationResult?.Message || Constants.STRING_EMPTY;

            if (!this._canProduce) {
                const oComponents = Constants.PRINTING_COMPONENTS;

                this._maxPrintQuantity = null;

                Utils.mapObjectToControls(this, [
                    { id: oComponents.BOXES_NUMBER, value: Constants.STRING_EMPTY },
                    { id: oComponents.QUANTITY_PALLETS, value: Constants.STRING_EMPTY }
                ]);

                Utils.setPlaceholder(
                    this.getView(),
                    "quantityPalletsColumn",
                    oComponents.QUANTITY_PALLETS
                );

                Utils.setPlaceholder(
                    this.getView(),
                    "PrintDateColumn",
                    oComponents.PRINT_DATE
                );

                ToastHelper.warning(
                    this.getView(),
                    this._productionValidationMessage,
                    3000
                );

                return;
            }

            await this._loadProductDetails(sProductCode, sCenter);
        },

        onValueChange: async function (oEvent) {
            const oBoxesInput = this.byId(
                Constants.PRINTING_COMPONENTS.BOXES_NUMBER
            );

            const iBoxesQuantity = Number(oBoxesInput.getValue());
            const iMaxBoxes = this._maxPrintQuantity;

            if (iBoxesQuantity < 1) {
                oBoxesInput.setValue("1");

                ToastHelper.warning(
                    this.getView(),
                    "La cantidad mínima es 1.", 3000
                );

                return;
            }

            if (iMaxBoxes != null && iBoxesQuantity > iMaxBoxes) {
                oBoxesInput.setValue(iMaxBoxes.toString());

                ToastHelper.warning(
                    this.getView(),
                    `La cantidad de cajas ingresada [${iBoxesQuantity}] no puede superar el valor de ${iMaxBoxes}.`,
                    3000
                );

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

        _create: function (oPrintRequest) {
            try {
                const oPrintModel = this._getModel(Constants.PRINT_MODEL_NAME);
                const oComponents = Constants.PRINTING_COMPONENTS;

                PrintService.create(oPrintModel, oPrintRequest);

                const oPrintDateContainer = this.byId(oComponents.PRINT_DATE_CONTAINER);
                const oPrintDateInput = this.byId(oComponents.PRINT_DATE);

                oPrintDateContainer.setVisible(true);
                oPrintDateInput.setEnabled(false);
                oPrintDateInput.setValue(Utils.formatDate());

                ToastHelper.success(
                    this.getView(),
                    "La impresión se ha generado correctamente."
                );

                oPrintModel.refresh(true);
            } catch (oError) { ToastHelper.error(this.getView(), Utils.getErrorMessage(oError, "Error al imprimir la etiqueta.")); }
        },

        _getFormData: function () {
            const oComponents = Constants.PRINTING_COMPONENTS;

            return {
                Quantitypallets: String(this.byId(oComponents.QUANTITY_PALLETS).getValue() || 0),
                Product: String(this.byId(oComponents.PRODUCT).getText() || 0),
                Productcode: this.byId(oComponents.PRODUCT_CODE).getSelectedKey(),
                Boxesnumber: String(this.byId(oComponents.BOXES_NUMBER).getValue() || 0),
                Location: this.byId(oComponents.CENTER).getSelectedKey(),
                Productionline: this.byId(oComponents.PRODUCTION_LINE).getSelectedKey(),
                Document: "0",
                Partnumber: "0",
            };
        },

        _loadToFragment: function (oPrintRequest) {
            const oComponents = Constants.PRINTING_COMPONENTS;

            this.byId(oComponents.PRODUCT_CODE).setSelectedKey(oPrintRequest?.Productcode);
            this.byId(oComponents.PRODUCT).setText(oPrintRequest?.Product || Constants.STRING_EMPTY);
            this.byId(oComponents.QUANTITY_PALLETS).setValue(oPrintRequest?.Quantitypallets || Constants.STRING_EMPTY);
            this.byId(oComponents.BOXES_NUMBER).setValue(oPrintRequest?.Boxesnumber || Constants.STRING_EMPTY);
            this.byId(oComponents.PRODUCTION_LINE).setSelectedKey(oPrintRequest?.Productionline);
            this.byId(oComponents.CENTER).setSelectedKey(oPrintRequest?.Location);
            this.byId(oComponents.EMBILSTADO).setValue(oPrintRequest?.Embilstado);
        },

        _loadToFilter: function (sProductCode, dStartDate, dEndDate) {
            const aFilters = [];
            const oModel = sap.ui.model;
            const Filter = oModel.Filter;
            const FilterOperator = oModel.FilterOperator;

            if (sProductCode)
                aFilters.push(
                    new Filter("Productcode", FilterOperator.EQ, sProductCode)
                );

            if (dStartDate && dEndDate)
                aFilters.push(
                    new Filter("Docdate", FilterOperator.BT, dStartDate, dEndDate)
                );

            return aFilters;
        },

        _setModeUI: function (bIsAdd) {
            const oComponents = Constants.PRINTING_COMPONENTS;

            const oProductionLineSelect = this.byId(oComponents.PRODUCTION_LINE);
            const oProductCodeSelect = this.byId(oComponents.PRODUCT_CODE);
            const oCenterSelect = this.byId(oComponents.CENTER);

            this.byId(oComponents.CREATE).setVisible(bIsAdd);
            this.byId(oComponents.QUANTITY_PALLETS).setEnabled(false);
            this.byId(oComponents.EMBILSTADO).setEnabled(false);
            this.byId(oComponents.BOXES_NUMBER).setEnabled(bIsAdd);
            this.byId(oComponents.EMBILSTADO_CONTAINER).setVisible(!bIsAdd);
            this.byId(oComponents.PRINT_DATE_CONTAINER).setVisible(false);

            oProductCodeSelect.setEnabled(bIsAdd);
            oProductionLineSelect.setEnabled(bIsAdd);
            oCenterSelect.setEnabled(bIsAdd);

            if (bIsAdd) {
                Utils.setProductPlaceholder(this.getView());

                Utils.setPlaceholder(
                    this.getView(),
                    "quantityPalletsColumn",
                    oComponents.QUANTITY_PALLETS
                );

                Utils.setDefaultValues(oProductionLineSelect);
                Utils.setDefaultValues(oProductCodeSelect);
                Utils.setDefaultValues(oCenterSelect);
            }
        },

        _loadProduct: function (sProductCode) {
            const oProductModel = this._getModel(Constants.PRODUCT_MODEL_NAME);

            if (!oProductModel)
                return;

            const oProductData = oProductModel.getData();
            const aProducts = oProductData.results || oProductData;

            const oProduct = aProducts.find(
                oItem => oItem.Matnr === sProductCode
            );

            this.byId(Constants.PRINTING_COMPONENTS.PRODUCT)
                .setText(oProduct?.Maktx || Constants.STRING_EMPTY);
        },

        _loadProductDetails: async function (sProductCode, sCenter) {

            const oComponents = Constants.PRINTING_COMPONENTS;

            try {
                const oProductDetails = await PrintService.getProductDetails(
                    this._getModel(Constants.PRINT_MODEL_NAME),
                    sProductCode,
                    sCenter
                );

                Utils.setJsonModel(
                    this.getView(),
                    Constants.PRODUCT_DETAILS_MODEL_NAME,
                    oProductDetails
                );

                const oProductDetailsModel = this._getModel(
                    Constants.PRODUCT_DETAILS_MODEL_NAME
                );

                if (!oProductDetailsModel)
                    return;

                const oProductData = oProductDetailsModel.getData();

                this._maxPrintQuantity = Number(oProductData?.Umrez);

                Utils.mapObjectToControls(this, [
                    { id: oComponents.BOXES_NUMBER, value: oProductData?.Umrez },
                    { id: oComponents.QUANTITY_PALLETS, value: oProductData?.Ean11 }
                ]);
            }
            catch (sErrorMessage) {
                ToastHelper.error(
                    this.getView(),
                    sErrorMessage
                );

                Utils.mapObjectToControls(this, [
                    { id: oComponents.BOXES_NUMBER, value: Constants.STRING_EMPTY },
                    { id: oComponents.QUANTITY_PALLETS, value: Constants.STRING_EMPTY }
                ]);
            }
        },

        _getProducts: async function () {
            const aProducts = await PrintService.getProducts(
                this._getModel(Constants.PRINT_MODEL_NAME)
            );

            const aFormattedProducts = Utils.formatProduct(aProducts);

            Utils.setJsonModel(
                this.getView(),
                Constants.PRODUCT_MODEL_NAME,
                aFormattedProducts
            );
        },

        _getProductionLines: async function (sSelectedWerks) {
            // 1. Obtener y transformar datos
            const aProductionLines = await PrintService.getProductionLines(
                this._getModel(Constants.PRINT_MODEL_NAME)
            );

            const aFormattedProductionLines = Utils.formatTableProductionLine(
                aProductionLines,
                "Arbpl"
            );

            // 2. Filtrar (sin mutar)
            const aFilteredProductionLines = sSelectedWerks
                ? aFormattedProductionLines.filter(item => item.Werks === sSelectedWerks)
                : aFormattedProductionLines;

            // 3. Setear modelo
            Utils.setJsonModel(
                this.getView(),
                Constants.PRODUCTION_LINE_MODEL_NAME,
                aFilteredProductionLines
            );

            // 4. Manejo de UI separado
            PrintUtils._updateProductionLineSelection(
                aFilteredProductionLines,
                sSelectedWerks,
                this.getView());
        },

        _getCenter: async function () {
            const aProductionLines = await PrintService.getProductionLines(
                this._getModel(Constants.PRINT_MODEL_NAME)
            );

            const aFormattedProductionLines = Utils.formatTableProductionLine(
                aProductionLines,
                "Werks"
            );

            const aUniqueCenters = PrintUtils._filterUniqueValues(
                aFormattedProductionLines
            );

            Utils.setJsonModel(
                this.getView(),
                Constants.CENTER_MODEL_NAME,
                aUniqueCenters
            );
        },

        _getModel: function (sModelName) {
            return this.getView().getModel(sModelName);
        },

        onExit: function () {
            DialogManager.destroyDialogs(this, "_mDialogs");
        },
    });
});