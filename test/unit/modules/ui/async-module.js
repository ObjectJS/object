object.define('test.test', 'ui/ui2.js', function(require, exports, module) {

	var ui = require('ui/ui2.js');

	this.TestComponent = new Class(ui.Component, function() {
		this.a = 1;
	});

	this.TestComponent2 = new Class(ui.Component, function() {
		this.b = 1;
	});

});
