/*global QUnit*/

sap.ui.define([
	"fw/flexwarehouse/controller/Readers.controller"
], function (Controller) {
	"use strict";

	QUnit.module("Readers Controller");

	QUnit.test("I should test the Readers controller", function (assert) {
		var oAppController = new Controller();
		oAppController.onInit();
		assert.ok(oAppController);
	});

});
