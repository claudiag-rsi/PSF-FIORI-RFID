sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "fw/flexwarehouse/util/ToastHelper",
    "fw/flexwarehouse/util/Constants",
    "fw/flexwarehouse/util/Utils"
], (Controller, ToastHelper, Constants, Utils) => {
    "use strict";

    return Controller.extend("fw.flexwarehouse.controller.Readers", {
        onInit() { },

        // Abrir Modal para agregar o editar
        onOpenDialog: function (oEvent) {
            const oContext = oEvent?.getSource()?.getBindingContext(Constants.READER_MODEL_NAME) || null;
            this._oEditContext = oContext;

            // Crear fragmento si no existe
            Utils.getFragment(this, Constants.FRAGMENTS.READER).then(oDialog => {

                this.loadToFragment(oContext?.getObject() || {});

                oDialog.open();
            });
        },

        //Guardar
        onSave: function () {
            const oReader = this.getFromFragmento();

            if (!this.isValid(oReader)) {
                ToastHelper.warning(this.getView(), "Campos obligatorios.");
                return;
            }

            this._oEditContext
                ? this.edit(oReader)
                : this.add(oReader);
        },


        //Abrir fragmento para confirmar eliminación
        onConfirmDelete: function (oEvent) {
            const oContext = oEvent.getSource().getBindingContext(Constants.READER_MODEL_NAME);
            if (!oContext) return;

            this._oDeleteContext = oContext;

            const oMsgModel = new sap.ui.model.json.JSONModel({ message: oContext.getProperty("Reader") });

            // Crear fragmento si no existe           
            Utils.getFragment(this, Constants.FRAGMENTS.CONFIRM_DELETE).then(oDialog => {

                oDialog.setModel(oMsgModel, "deleteMsg");
                oDialog.setBindingContext(oContext);

                oDialog.open();
            });
        },

        //Eliminar
        onDelete: function () {
            const oView = this.getView();
            const oModel = oView.getModel(Constants.READER_MODEL_NAME);
            const sPath = this._oDeleteContext.getPath();

            oModel.remove(sPath, {
                success: () => ToastHelper.success(oView, "Reader eliminado correctamente."),
                error: () => ToastHelper.error(oView, "Error al eliminar reader.")
            });

            Utils.closeDialog(this, Constants.FRAGMENTS.CONFIRM_DELETE);
        },

        //Cerrar fragmento Reader
        onCancel: function () { Utils.closeDialog(this, Constants.FRAGMENTS.READER); },

        //Cerrar fragmento Confirmación de eliminar
        onCancelDelete: function () { Utils.closeDialog(this, Constants.FRAGMENTS.CONFIRM_DELETE); },

        edit: function (oReader) {
            const sPath = this._oEditContext.getPath();
            const oView = this.getView();
            const oModel = oView.getModel(Constants.READER_MODEL_NAME);

            oModel.update(sPath, oReader, {
                success: () => {

                    ToastHelper.success(oView, "Reader actualizado correctamente.");

                    oModel.refresh(true);

                    Utils.closeDialog(this, Constants.FRAGMENTS.READER);
                },
                error: function (oError) {
                    let sMessage = "Error al actualizar reader.";

                    try {
                        const responseText = JSON.parse(oError.responseText);

                        if (responseText.error && responseText.error.message && responseText.error.message.value)
                            sMessage = responseText.error.message.value;

                    } catch (e) { console.error("Error parseando mensaje del backend.", e); }

                    ToastHelper.error(oView, sMessage);
                }
            });
        },

        add: function (oReader) {
            const oView = this.getView();
            const oModel = oView.getModel(Constants.READER_MODEL_NAME);

            oModel.create("/ReadersSet", oReader, {
                success: () => {

                    ToastHelper.success(oView, "Reader agregado correctamente.");

                    oModel.refresh(true);

                    Utils.closeDialog(this, Constants.FRAGMENTS.READER);
                },
                error: function (oError) {
                    let sMessage = "Error al agregar reader.";

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

        getFromFragmento: function () {
            return {
                Reader: this.byId("inpReader").getValue(),
                Antenna: this.byId("inpAntenna").getValue(),
                Ip: this.byId("inpIp").getValue()
            };
        },

        isValid: function (oReader) { return !!(oReader.Reader && oReader.Antenna && oReader.Ip); },

        loadToFragment: function (oData) {
            this.byId("inpReader").setValue(oData.Reader || Constants.STRING_EMPTY);
            this.byId("inpAntenna").setValue(oData.Antenna || Constants.STRING_EMPTY);
            this.byId("inpIp").setValue(oData.Ip || Constants.STRING_EMPTY);
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