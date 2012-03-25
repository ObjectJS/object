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

var PublisherPhotoAddon = new Class(ui.Component, function() {
	this.photo = ui.define1('#publisher-photo-box');
	this.photoTrigger = ui.define1('#publisher-photo-trigger');

	this.photoTrigger_click = function(self, event) {
		self.open(self.photo);
	};

	this.onopen = function(self, event, addon) {
		if (addon != self.photo) {
			self.photo.hide();
		}
	};
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

