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

var PublisherPlugin = new Class(function() {

	this.toAddon = function(plugin) {
		var Addon = new Class(ui.Component, function() {
			this[plugin.name] = plugin.__class__.get('ref');
			this[plugin.name + 'Trigger'] = plugin.__class__.get('trigger');

			this[plugin.name + 'Trigger_click'] = function(self, event) {
				self.open(self[plugin.name]);
			}

			this.onopen = function(self, event, addon) {
				if (addon != self[plugin.name]) {
					self[plugin.name].hide();
				}
			};
		});
		return Addon;
	};

});

var PublisherPhotoAddon2 = new Class(PublisherPlugin, function() {
	this.name = 'photo';
	this.ref = ui.define1('#publisher-photo-box');
	this.trigger = ui.define1('#publisher-photo-trigger');
});

var PublisherPhotoAddon = new PublisherPhotoAddon2().toAddon();

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

