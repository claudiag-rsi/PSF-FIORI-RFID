sap.ui.define([
  "sap/ui/core/mvc/Controller"
], (BaseController) => {
  "use strict";

  return BaseController.extend("fw.flexwarehouse.controller.App", {
    onInit: function () {
      var oRouter = this.getOwnerComponent().getRouter();
      oRouter.attachRouteMatched(this.onRouteMatched, this);
    },

    // Función para abrir/cerrar el menú (colapsar)
    onSideNavButtonPress: function () {
      var oToolPage = this.byId("toolPage");
      var bSideExpanded = oToolPage.getSideExpanded();
      oToolPage.setSideExpanded(!bSideExpanded);
    },

    // Función que detecta qué ítem del menú se seleccionó
    onItemSelect: function (oEvent) {
      var sKey = oEvent.getParameter("item").getKey(); // Esto obtendrá "Readers", "Print" o "Transactions"
      var oRouter = this.getOwnerComponent().getRouter();

      oRouter.navTo(sKey); // Ejecuta la navegación
    }
  });
});