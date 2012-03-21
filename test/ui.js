object.use('dom, ui/ui2', function(exports, dom, ui) {

var TestComponent = new Class(ui.Component, function() {
	this._init = function(self) {
		console.log('init called.');
	}

	this._test = function(self) {
	};
});

dom.ready(function() {
	var test = new TestComponent(document.createElement('div'));
	test.addEvent('test', function() {
		console.log('handle fired event');
	})
	test.test();
});

});

