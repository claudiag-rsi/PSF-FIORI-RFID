sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "fw/flexwarehouse/util/ToastHelper",
    "fw/flexwarehouse/util/Constants",
    "fw/flexwarehouse/util/Utils",
    "fw/flexwarehouse/util/DialogManager"
], (Controller, ToastHelper, Constants, Utils, DialogManager) => {
    "use strict";

    return Controller.extend("fw.flexwarehouse.controller.Readers", {
        onInit() { },

        onOpenDialog: function (oEvent) {
            const oContext = oEvent?.getSource()?.getBindingContext(Constants.READER_MODEL_NAME) || null;
            this._oEditContext = oContext;

            Utils.getFragment(this, Constants.FRAGMENTS.READER).then(oDialog => {

                this._loadToFragment(oContext?.getObject() || {});

                oDialog.open();
            });
        },

        //Guardar
        onSave: function () {
            const oReader = this._getFromFragmento();

            if (!this._isValid(oReader)) {
                ToastHelper.warning(this.getView(), Constants.REQUIRED_FIELDS_MESSAGE);
                return;
            }

            this._oEditContext
                ? this._edit(oReader)
                : this._create(oReader);
        },

        //Abrir fragmento para confirmar eliminación
        onConfirmDelete: function (oEvent) {
            const oContext = oEvent.getSource().getBindingContext(Constants.READER_MODEL_NAME);
            if (!oContext) return;

            this._oDeleteContext = oContext;

            const oMsgModel = new sap.ui.model.json.JSONModel({ message: oContext.getProperty("Reader") });

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

        _edit: function (oReader) {
            const sPath = this._oEditContext.getPath();
            const oView = this.getView();
            const oModel = oView.getModel(Constants.READER_MODEL_NAME);

            oModel.update(sPath, oReader, {
                success: () => {
                    ToastHelper.success(oView, "Reader actualizado correctamente.");
                    Utils.closeDialog(this, Constants.FRAGMENTS.READER);

                    oModel.refresh(true);
                },
                error: function (oError) {
                    const sMessage = Utils.getErrorMessage(oError, "Error al actualizar reader.");
                    ToastHelper.error(oView, sMessage);
                }
            });
        },

        _create: function (oReader) {
            const oView = this.getView();
            const oModel = oView.getModel(Constants.READER_MODEL_NAME);

            oModel.create("/ReadersSet", oReader, {
                success: () => {
                    ToastHelper.success(oView, "Reader agregado correctamente.");
                    Utils.closeDialog(this, Constants.FRAGMENTS.READER);

                    oModel.refresh(true);
                },
                error: function (oError) {
                    const sMessage = Utils.getErrorMessage(oError, "Error al agregar reader.");
                    ToastHelper.error(oView, sMessage);
                }
            });
        },

        _getFromFragmento: function () {
            return {
                Reader: this.byId(Constants.READER_COMPONENTS.READER).getValue(),
                Antenna: this.byId(Constants.READER_COMPONENTS.ANTENNA).getValue(),
                Ip: this.byId(Constants.READER_COMPONENTS.IP_ADDRESS).getValue()
            };
        },

        _isValid: function (oReader) { return !!(oReader.Reader && oReader.Antenna && oReader.Ip); },

        _loadToFragment: function (oData) {
            this.byId(Constants.READER_COMPONENTS.READER).setValue(oData.Reader || Constants.STRING_EMPTY);
            this.byId(Constants.READER_COMPONENTS.ANTENNA).setValue(oData.Antenna || Constants.STRING_EMPTY);
            this.byId(Constants.READER_COMPONENTS.IP_ADDRESS).setValue(oData.Ip || Constants.STRING_EMPTY);
        },

        onExit: function () { DialogManager.destroyDialogs(this, "_mDialogs"); }
    });
});