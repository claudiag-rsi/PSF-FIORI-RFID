sap.ui.define([], function () {
    "use strict";

    return {
        FRAGMENTS: {
            CONFIRM_DELETE: "ConfirmDeleteDialog",
            READER: "ReaderDialog",
            LABEL_PRINT: "PrintDialog"
        },
        PRINTING_COMPONENTS: {
            PRODUCT_FILTER  : "inpProductFilterPrint",
            START_DATE_FILTER: "inpStartDateFilterPrint",
            FINAL_DATE_FILTER: "inpfinalDateFilterPrint",
            PRODUCT_CODE: "cbxProductCode",
            PRODUCTION_LINE: "cbxProductionLines",
            QUANTITY_PALLETS: "inpQuantityPallets",
            BOXES_NUMBER:"inpBoxesNumber",
            LOCATION: "inpLocation",
            PRODUCT: "txtProduct",
            CREATE: "btnAcceptPrint",
            TABLE: "tblPrint",
            TABLE_ITEMS: "items"
        },
        READER_COMPONENTS: {
            READER:"inpReader",
            ANTENNA: "inpAntenna",
            IP_ADDRESS:"inpIp"
        },
        STRING_EMPTY: "",
        DATE_SEPARATOR: "-",
        FRAGMENT_PATH: ".view.fragment.",
        READER_MODEL_NAME: "ReaderModel",
        PRINT_MODEL_NAME: "LabelPrintModel",
        PRODUCTION_LINE_MODEL_NAME: "ProductionLineModel",
        PRODUCT_MODEL_NAME: "ProductModel",
        FORMAT_ABAP_DATE: "yyyyMMdd",
        FORMAT_DATE: "dd-MM-yyyy",
        EMPTY_ELEMENT: "Seleccione un elemento",
        REQUIRED_FIELDS_MESSAGE: "Los campos marcados con (*) son obligatorios.",
        INVALID_FIELD_TYPES_MESSAGE: "Hay campos inválidos. Verifica que los valores numéricos sean correctos.",
    };
});