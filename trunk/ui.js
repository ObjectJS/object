object.add('ui', 'dom', function($, dom) {

/**
 * UI模块基类
 * @class
 */
var Component = this.Component = new Class(dom.Element, function() {

	this.__init__ = function(self) {
		dom.Element.__init__(self);
	};

	this._render1 = function(self, control, triggers) {
		for (var i in triggers) {
			control.addEvent(i, triggers[i]);
		}
	};

	/**
	 * @param selector css选择符
	 * @param options options
	 */
	this.render = function(self, selector, options) {
		if (!options) options = {};
		if (!options.type) options.type = dom.Element;

		var triggers = {};
		for (var i in options) {
			var eventName = i.match(/^on(.+)/i);
			if (eventName) triggers[eventName[1]] = options[i];
		}

		var eles = self.getElements(selector, options.type);

		for (i = 0; i < eles.length; i++) {
			self._render1(eles[i], triggers);
		}

		return eles;

	};

	/**
	 * makeOption
	 */
	this.makeOption = function(self, name, type) {
		name = name.toLowerCase();
		var value = self.getData(name);
		if (type === Boolean) {
			value = (value === 'true');
		} else if (type === Number) {
			value = Number(value);
		}

		if (value === null || value === undefined || value === NaN) return null;

		return value;
	};

});

/**
 * Tab UI
 * @class
 * @event change
 */
this.TabControl = new Class(Component, function() {

	/**
	 * @constructor
	 */
	this.__init__ = function(self) {
		Component.__init__(self);

		self.tabs = dom.getElements('li', self);
		self.selectedEle = null;

		for (var i = 0; i < self.tabs.length; i++) {
			if (dom.Element.wrap(self.tabs[i]).classList.contains('selected')) {
				self.selectedEle = self.tabs[i];
				break;
			}
		}

		self.tabs.forEach(function(ele, i) {
			ele = dom.wrap(ele);

			ele.addEvent('click', function() {
				self.tabs.forEach(function(tab, i) {
					dom.wrap(tab).classList.remove('selected');
				});
				self.selectedEle = ele;
				ele.classList.add('selected');
				self.fireEvent('change', null, self);
			});
		});
	};

});

this.Slider = new Class(Component, function() {

	/**
	 * @constructor
	 */
	this.__init__ = function(self) {
		Component.__init__(self);

		self.tabs = dom.getElements('li', self);
		self.selectedEle = null;

		for (var i = 0; i < self.tabs.length; i++) {
			if (dom.Element.wrap(self.tabs[i]).classList.contains('selected')) {
				self.selectedEle = self.tabs[i];
				break;
			}
		}

		self.tabs.forEach(function(ele, i) {
			ele = dom.wrap(ele);

			ele.addEvent('click', function() {
				self.tabs.forEach(function(tab, i) {
					dom.wrap(tab).classList.remove('selected');
				});
				self.selectedEle = ele;
				ele.classList.add('selected');
				self.fireEvent('change', null, self);
			});
		});
	};

});

});

