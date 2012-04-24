object.define('ui/nav.js', 'ui, events', function(require, exports) {

var ui = require('ui');
var events = require('events');

this.ForeNextControl = new Class(ui.Component, function() {

	this.nextButton = ui.define('.nextbutton');
	this.foreButton = ui.define('.forebutton');

	this.initialize = function(self, node) {
		ui.Component.initialize(self, node);

		self.loop = false; // 是否循环
		self.total = parseInt(self._node.getData('total'));
		self.start = parseInt(self._node.getData('start')) || 0;
		self.position = self.start;
	};

	this.nextButton_click = function(self, event) {
		if (self.position >= self.total - 1) {
			if (self.loop) self.position = -1;
			else return;
		}
		self.next();
	};

	this.foreButton_click = function(self, event) {
		if (self.position <= 0) {
			if (self.loop) self.position = self.total;
			else return;
		}
		self.fore();
	};

	this.next = events.fireevent(function(self) {
		self.position++;
		self.change();
	});

	this.fore = events.fireevent(function(self) {
		self.position--;
		self.change();
	});

	this.change = function(self) {
		// TODO
		self.fireEvent('change', {forenext: self});
		self.updateTotal();
		self.updatePosition();
	};

	this.updatePosition = events.fireevent(function(self) {
		self._node.getElements('.current').set('innerHTML', self.position + 1); // position是从0开始滴～展示的时候+1
	});

	this.updateTotal = events.fireevent(function(self) {
		self._node.getElements('.total').set('innerHTML', self.total);
	});

});

});

