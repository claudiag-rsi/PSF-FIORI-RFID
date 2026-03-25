sap.ui.define([
    "fw/flexwarehouse/util/Constants",
], function (Constants) {
    "use strict";

    return {       
         _isValid: function (oLabelPrint) {
            return !!(
                oLabelPrint.Quantitypallets &&
                oLabelPrint.Boxesnumber && oLabelPrint.Location &&
                oLabelPrint.Document && oLabelPrint.Embilstado &&
                oLabelPrint.Productcode && oLabelPrint.Productionline
            );
        },
    };
});