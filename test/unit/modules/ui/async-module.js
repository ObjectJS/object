object.define('test.test', 'ui2', function(require, exports, module) {

	var ui = require('ui2');

	this.TestComponent = new Class(ui.Component, function() {
		this.a = 1;
	});

	this.TestComponent2 = new Class(ui.Component, function() {
		this.b = 1;
	});

});
