object.use('dom, ui/ui2, events', function(exports, dom, ui, events) {

var StatusPublisherAddon = new Class(ui.Component, function() {

	this.status = ui.define1('#publisher-status-box');
	this.statusTrigger = ui.define1('#publisher-status-trigger');

	this.statusTrigger_click = function(self) {
		self.open(self.status);
	};

});


var SharePublisherAddon = new Class(ui.Component, function() {

	this.share = ui.define1('#publisher-share-box');
	this.shareTrigger = ui.define1('#publisher-share-trigger');

	this.shareTrigger_click = function(self) {
		self.open(self.share);
	};

});

var PhotoPublisherAddon = new Class(ui.Component, function() {

	this.photo = ui.define1('#publisher-photo-box');
	this.photoTrigger = ui.define1('#publisher-photo-trigger');

	this.photoTrigger_click = function(self) {
		self.open(self.photo);
	};

	this.onopen = function(self, event) {
		console.log(self.openedAddon._node.id);
	};

	this._test = function(self) {
		console.log('test');
	};

});

var Publisher = new Class(ui.Component, function() {

	this.funcSelector = ui.define1('#publisher-func-selector');

	this.closeButton = ui.define('.close-button');

	this._open = function(self, addon) {
		if (self.openedAddon) self.openedAddon.hide();
		self.openedAddon = addon;
		addon.show();
	};

	this._close = function(self) {
		self.openedAddon.hide();
	};

	this.closeButton_click = function(self, event) {
		event.preventDefault();
		self.close();
	};

});

var StatusDefaultPublisher = new Class(Publisher, function() {

	//this.__mixins__ = [PhotoPublisherAddon, StatusPublisherAddon, SharePublisherAddon];
	this.a = ui.option(0);

	this._close = function(self) {
		this.parent(self);
		self.open(self.status);
	};
});

dom.ready(function() {
	var c = new StatusDefaultPublisher(dom.getElement('#publisher'), {
		a: 1
	});
	c.setOption('b.c.d.e.f', 2);
	console.log(c.a, c.b);
	console.log(c.getOption('b.c.d.e.f'))
	//c.open(c.status);
	//c.test()
});

});

