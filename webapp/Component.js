sap.ui.define([
    "sap/ui/core/UIComponent",
    "fw/flexwarehouse/model/models"
], (UIComponent, models) => {
    "use strict";

    return UIComponent.extend("fw.flexwarehouse.Component", {
        metadata: {
            manifest: "json",
            interfaces: [
                "sap.ui.core.IAsyncContentCreation"
            ]
        },

        init: function () {
            // call the base component's init function
            UIComponent.prototype.init.apply(this, arguments);

            this._sNamespace = this.getManifestEntry("sap.app").id;

            // set the device model
            this.setModel(models.createDeviceModel(), "device");

            // enable routing
            this.getRouter().initialize();
        },

        getNamespace: function () {
            return this._sNamespace;
        }

    });
});