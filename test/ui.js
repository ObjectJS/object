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
		var vars = cls.get('__variables');
		if (addon != self[vars.name]) {
			self[vars.name].hide();
		}
	};

	this['{{name}}Trigger_click'] = function(cls, self, event) {
		var vars = cls.get('__variables');
		self.open(self[vars.name]);
	};

});

var PublisherPhotoAddonFactory = new Class(PublisherAddonFactory, function() {
	this.$name = 'photo';
	this['{{name}}'] = ui.define1('#publisher-photo-box');
	this['{{name}}Trigger'] = ui.define1('#publisher-photo-trigger');
});

var PublisherPhotoAddon = new Class(function() {
	this.__metaclass__ = PublisherPhotoAddonFactory;
});

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

