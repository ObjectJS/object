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

// metaclass 的 metaclass
var addonfactory = new Class(type, function() {
	this.__new__ = function(cls, name, base, dict) {

		var members = (base.get('__members') || []).slice();
		var variables = {};
		// 将base的值复制过来
		object.extend(variables, base.get('__variables'));

		Object.keys(dict).forEach(function(name) {
			if (name.indexOf('__') == 0) {
				return;
			}
			else if (name.indexOf('$') == 0) {
				variables[name.slice(1)] = dict[name];
				delete dict[name];
			}
			else {
				members.push({
					name: name,
					member: dict[name]
				});
				delete dict[name];
			}
		});
		dict.__variables = variables;
		dict.__members = members;
		return type.__new__(cls, name, base, dict);
	};
});

var B = new Class(type, function() {
	this.__new__ = function(cls, name, base, dict) {
		var members = (base.get('__members') || []).slice();
		var variables = {};
		// 将base的值复制过来
		object.extend(variables, base.get('__variables'));

		Object.keys(dict).forEach(function(name) {
			if (name.indexOf('__') == 0) {
				return;
			}
			else if (name.indexOf('$') == 0) {
				variables[name.slice(1)] = dict[name];
				delete dict[name];
			}
			else {
				members.push({
					name: name,
					member: dict[name]
				});
				delete dict[name];
			}
		});
		dict.__variables = variables;
		dict.__members = members;
		return type.__new__(cls, name, base, dict);
	};
});

var AddonFactory = new Class(ui.component, function() {

	this.__metaclass__ = addonfactory;

	// 这里的cls获取的是最后被当作metaclass的那个继承后的类——PublisherPhotoAddonFactory
	this.__new__ = function(cls, name, base, dict) {
		var members = cls.get('__members');
		var variables = cls.get('__variables');
		members.forEach(function(item) {
			var name = string.substitute(item.name, variables);
			dict[name] = item.member;
		});

		// base是Component
		if (base !== ui.Component) {
			base = ui.Component;
		}
		return ui.component.__new__(cls, name, base, dict);
		//return type.__new__(cls, name, base, dict);
	};
});

var PublisherAddonFactory = new Class(AddonFactory, function() {

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

