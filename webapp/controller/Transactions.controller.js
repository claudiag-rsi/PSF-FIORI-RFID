sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "fw/flexwarehouse/util/ToastHelper",
    "fw/flexwarehouse/util/Constants",
    "fw/flexwarehouse/util/Utils",
    "fw/flexwarehouse/util/DialogManager"
], (Controller, ToastHelper, Constants, Utils, DialogManager) => {
    "use strict";

    return Controller.extend("fw.flexwarehouse.controller.Transactions", {
        formatDate: Utils,
        onInit() { },

        onFilters: function () {
            const oView = this.getView();
            const oTable = oView.byId("tblTransactions");
            const oBinding = oTable.getBinding("items");

            const sProduct = oView.byId("inpProductFilterTransactions").getValue();
            const sReader = oView.byId("inpReaderFilterTransactions").getValue();
            const dStart = oView.byId("dapStartdateFilterTransactions").getDateValue();
            const dEnd = oView.byId("dapfinalDateilterTransactions").getDateValue();

            if (!sProduct && !sReader && !dStart && !dEnd) {
                ToastHelper.warning(oView, "Favor de agregar producto, reader o rango de fechas a consultar.");
                return;
            }

            if (!Utils.validateDate(oView, dStart, dEnd)) return;

            oBinding.filter(this.loadToFilter(sProduct, sReader, dStart, dEnd));
        },

        onCleanFilters: function () {
            const oView = this.getView();
            const oTable = oView.byId("tblTransactions");
            const oBinding = oTable.getBinding("items");

            this.byId("inpProductFilterTransactions").setValue(Constants.STRING_EMPTY);
            this.byId("inpReaderFilterTransactions").setValue(Constants.STRING_EMPTY);
            this.byId("dapStartdateFilterTransactions").setValue(null);
            this.byId("dapfinalDateilterTransactions").setValue(null);

            oTable.getBinding("items").filter([]);
            oBinding.refresh();
        },

        loadToFilter: function (sProduct, sReader, dStart, dEnd) {
            const aFilters = [];
            const oModel = sap.ui.model;
            const oFilter = oModel.Filter;
            const oOperator = oModel.FilterOperator;

            if (sProduct)
                aFilters.push(new oFilter("Productcode", oOperator.EQ, sProduct));

            if (sReader)
                aFilters.push(new oFilter("Reader", oOperator.EQ, sReader));

            if (dStart && dEnd)
                aFilters.push(new oFilter("Erdat", oOperator.BT, dStart, dEnd));

            return aFilters;
        },

        onExit: function () { DialogManager.destroyDialogs(this, "_mDialogs"); }
    });
});