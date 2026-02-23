sap.ui.define([
    "sap/m/Dialog",
    "sap/m/HBox",
    "sap/ui/core/Icon",
    "sap/m/Text",
    "sap/ui/core/library"
], function (Dialog, HBox, Icon, Text, coreLibrary) {
    "use strict";

    const MessageType = coreLibrary.MessageType;

    function getIcon(type) {
        switch (type) {
            case MessageType.Success: return "sap-icon://message-success";
            case MessageType.Error: return "sap-icon://message-error";
            case MessageType.Warning: return "sap-icon://message-warning";
            default: return "sap-icon://message-information";
        }
    }

    function getColor(type) {
        switch (type) {
            case MessageType.Success: return "Positive";
            case MessageType.Error: return "Negative";
            case MessageType.Warning: return "Critical";
            default: return "Neutral";
        }
    }

    function show(oView, message, type, duration = 2500) {

        const oContent = new HBox({
            alignItems: "Center",
            items: [
                new Icon({
                    src: getIcon(type),
                    size: "1.2rem",
                    color: getColor(type)
                }).addStyleClass("customToastDialog"),

                new Text({ text: message })
            ]
        });

        const oDialog = new Dialog({
            content: oContent,
            showHeader: false,
            draggable: false,
            resizable: false,
            contentWidth: "auto",
            initialFocus: null
        });

        oDialog.addStyleClass("customToastDialog");

        oView.addDependent(oDialog);
        oDialog.open();

        setTimeout(() => {
            oDialog.close();
            oDialog.destroy();
        }, duration);
    }

    return {

        success: (oView, msg, d) =>
            show(oView, msg, MessageType.Success, d),

        error: (oView, msg, d) =>
            show(oView, msg, MessageType.Error, d),

        warning: (oView, msg, d) =>
            show(oView, msg, MessageType.Warning, d),

        info: (oView, msg, d) =>
            show(oView, msg, MessageType.Information, d)

    };
});
