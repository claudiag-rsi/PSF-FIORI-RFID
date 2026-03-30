sap.ui.define([
    "fw/flexwarehouse/util/Constants",
    "fw/flexwarehouse/util/Utils",
], function (Constants, Utils) {
    "use strict";

    return {
        _isValid: function (oLabelPrint) {

            return !!(
                oLabelPrint.Quantitypallets &&
                oLabelPrint.Boxesnumber &&
                oLabelPrint.Location &&
                oLabelPrint.Document &&
                oLabelPrint.Embilstado &&
                oLabelPrint.Productcode &&
                oLabelPrint.Productionline
            );
        },

        _initSelects: function (oView) {
            Utils.initSelect(oView.byId(Constants.PRINTING_COMPONENTS.PRODUCT_CODE));
            Utils.initSelect(oView.byId(Constants.PRINTING_COMPONENTS.PRODUCTION_LINE));
        },

        _updateProductionLineSelection: function (aData, selectedWerks, oView) {
            const combo = oView.byId(Constants.PRINTING_COMPONENTS.PRODUCTION_LINE);

            if (!combo) return;

            Utils.setDefaultValues(combo);
        },

        _filterUniqueValues: function (aData) { return Array.from(new Map(aData.map(item => [item.Werks, item])).values()); },
    };
});