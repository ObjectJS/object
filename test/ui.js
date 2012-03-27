object.use('dom, ui/ui2, string', function(exports, dom, ui, string) {

var Publisher = new Class(ui.Component, function() {

	this.closeButton = ui.define('.close-button');

	this.closeButton_click = function(self) {
	}

	this._init = function(self) {
		self.opendAddon = null;
	};

	this._open = function(self, addon) {
		addon.show();
	}

});

var PublisherAddonFactory = new Class(ui.AddonFactory, function() {

	this.onopen = function(cls, self, event, addon) {
		var vars = cls.get('variables');
		if (addon != self[vars.name]) {
			self[vars.name].hide();
		}
	};

	this['{{name}}Trigger_click'] = function(cls, self, event) {
		var vars = cls.get('variables');
		self.open(self[vars.name]);
	};

});

var PublisherPhotoAddonFactory = new Class(PublisherAddonFactory, function() {
	this.$name = 'photo';
	this['{{name}}'] = ui.define1('#publisher-photo-box');
	this['{{name}}Trigger'] = ui.define1('#publisher-photo-trigger');
});

var PublisherShareAddonFactory = new Class(PublisherAddonFactory, function() {
	this.$name = 'share';
	this['{{name}}'] = ui.define1('#publisher-share-box');
	this['{{name}}Trigger'] = ui.define1('#publisher-share-trigger');
});

var PublisherVideoAddonFactory = new Class(PublisherAddonFactory, function() {
	this.$name = 'video';
	this['{{name}}'] = ui.define1('#publisher-video-box');
	this['{{name}}Trigger'] = ui.define1('#publisher-video-trigger');
});

var PublisherPhotoAddon = new Class(function() {
	this.__metaclass__ = PublisherPhotoAddonFactory;
});
var PublisherVideoAddon = new Class(function() {
	this.__metaclass__ = PublisherVideoAddonFactory;
});
var PublisherShareAddon = new Class(function() {
	this.__metaclass__ = PublisherShareAddonFactory;
});

var DefaultPublisher = new Class(Publisher, function() {
	this.__mixins__ = [PublisherShareAddon, PublisherVideoAddon, PublisherPhotoAddon];
});

dom.ready(function() {
	var publisher = new DefaultPublisher(document.getElementById('publisher'));
});

});

