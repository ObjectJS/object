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

	this.$trigger = '{{name}}Trigger';

	this.onopen = function(cls, self, event, addon) {
		var vars = cls.get('__vars');
		if (addon != self[vars.name]) {
			self[vars.name].hide();
		}
	};

	this['{{trigger}}_click'] = function(cls, self, event) {
		self.open(self[cls.get('$name')]);
	};

});

var PublisherPhotoAddonFactory = new Class(PublisherAddonFactory, function() {
	this.$name = 'photo';
	this['{{name}}'] = ui.define1('#publisher-photo-box');
	this['{{trigger}}'] = ui.define1('#publisher-photo-trigger');
});
console.log(Class.keys(PublisherPhotoAddonFactory))

var PublisherShareAddonFactory = new Class(PublisherAddonFactory, function() {
	this.$name = 'share';
	this['{{name}}'] = ui.define1('#publisher-share-box');
	this['{{trigger}}'] = ui.define1('#publisher-share-trigger');
});

var PublisherVideoAddonFactory = new Class(PublisherAddonFactory, function() {
	this.$name = 'video';
	this['{{name}}'] = ui.define1('#publisher-video-box');
	this['{{trigger}}'] = ui.define1('#publisher-video-trigger');
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

