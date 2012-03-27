object.use('dom, ui/ui2', function(exports, dom, ui) {

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

var AddonFactory = new Class(type, function() {
	this.__new__ = function(cls, name, base, dict) {
		Class.keys(cls).forEach(function() {
		});
		base = ui.Component;
		return type.__new__(cls, name, base, dict);
	};
});

var PublisherAddonFactory = new Class(AddonFactory, function() {

	//this['{{name}}'] = ui.copy('ref');

	//this['{{name}}Trigger'] = ui.copy('trigger');

	this.onopen = function(self, comp, event, addon) {
		if (addon != comp[self.name]) {
			comp[self.name].hide();
		}
	};

	this['{{name}}Trigger_click'] = function(self, comp, event) {
		comp.open(comp[self.name]);
	};

});

var PublisherPhotoAddonFactory = new Class(PublisherAddonFactory, function() {
	this.name = 'photo';
});

var PublisherPhotoAddon = new Class(function() {
	this.__metaclass__ = PublisherPhotoAddonFactory;
});

console.log(Class.keys(PublisherPhotoAddonFactory))
console.log(Class.keys(PublisherPhotoAddon))

var PublisherVideoAddon = new Class(ui.Component, function() {
	this.video = ui.define1('#publisher-video-box');
	this.videoTrigger = ui.define1('#publisher-video-trigger');

	this.videoTrigger_click = function(self, event) {
		self.open(self.video);
	};

	this.onopen = function(self, event, addon) {
		if (addon != self.video) {
			self.video.hide();
		}
	};
});

var PublisherShareAddon = new Class(ui.Component, function() {
	this.share = ui.define1('#publisher-share-box');
	this.shareTrigger = ui.define1('#publisher-share-trigger');

	this.shareTrigger_click = function(self, event) {
		self.open(self.share);
	};

	this.onopen = function(self, event, addon) {
		if (addon != self.share) {
			self.share.hide();
		}
	};
});

var DefaultPublisher = new Class(Publisher, function() {
	this.__mixins__ = [PublisherShareAddon, PublisherVideoAddon, PublisherPhotoAddon];
});

dom.ready(function() {
	var publisher = new DefaultPublisher(document.getElementById('publisher'));
});

});

