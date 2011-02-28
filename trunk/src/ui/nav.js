/**
 * @namespace
 * @name ui.nav
 */
object.add('ui.nav', 'ui, ui.decorators', /**@lends ui.nav*/ function(exports, ui) {

var fireevent = ui.decorators.fireevent;

/**
 * @class
 * @name ui.nav.ForeNextControl
 */
this.ForeNextControl = new Class(ui.Component, /**@lends ui.nav.ForeNextControl*/ function() {

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

	this.next = fireevent(function(self) {
		self.position++;
		self.change();
	});

	this.fore = fireevent(function(self) {
		self.position--;
		self.change();
	});

	this.change = fireevent(function(self) {
		self.updateTotal();
		self.updatePosition();
	});

	this.updatePosition = fireevent(function(self) {
		self._node.getElements('.current').set('innerHTML', self.position + 1); // position是从0开始滴～展示的时候+1
	});

	this.updateTotal = fireevent(function(self) {
		self._node.getElements('.total').set('innerHTML', self.total);
	});

});

});

