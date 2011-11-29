/**
 * @namespace
 * @name uiold
 */
object.add('uiold', 'dom', /**@lends uiold*/ function(exports, dom) {

/**
 * UI模块基类
 * @class
 */
this.Component = new Class(dom.Element, function() {

	this.initialize = function(self) {
		dom.Element.initialize(self);
	};

	this._render1 = function(self, control, triggers) {
		for (var i in triggers) {
			control.addEvent(i, triggers[i]);
		}
	};

	// 将options参数转换成trigger
	this._getTriggers = function(self, options) {
		var triggers = {};
		for (var i in options) {
			var eventName = i.match(/^on(.+)/i);
			if (eventName) triggers[eventName[1]] = options[i];
		}

		return triggers;
	};

	/**
	 * @param selector css选择符
	 * @param options options
	 */
	this.render = function(self, selector, options) {
		if (!options) options = {};

		// selector 有可能只是一个name，通过self.selectors获取真正的selector
		if (self.selectors && selector in self.selectors) {
			name = selector;
			selector = self.selectors[selector];
		}

		var eles = self.getElements(selector);
		eles.forEach(function(ele) {
			if (options.type) options.type.wrap(ele);
		});
		var triggers = self._getTriggers(options);

		for (i = 0; i < eles.length; i++) {
			self._render1(eles[i], triggers);
		}

		if (name) {
			self[name] = eles;
		}

		return eles;
	};

	this.render1 = function(self, selector, options) {
		if (!options) options = {};

		// selector 有可能只是一个name，通过self.selectors获取真正的selector
		if (self.selectors && selector in self.selectors) {
			name = selector;
			selector = self.selectors[selector];
		}

		var ele = self.getElement(selector);
		if (options.type) options.type.wrap(ele);
		var triggers = self._getTriggers(options);

		self._render1(ele, triggers);

		if (name) {
			self[name] = ele;
		}

		return ele;
		
	};

	this.bind = function(self, name) {
		return function() {
			self[name].apply(self, [].slice.call(arguments, 0));
			self.fireEvent(name, arguments[0], self);
		}
	};

	this.call = function(self, name) {
		self[name].apply(self, [].slice.call(arguments, 0));
		self.fireEvent(name, arguments[0], self);
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

	this.wrap = classmethod(function(cls, ele) {
		if (!ele) return null;

		if (ele._wrapper) {
			if (ele._wrapper === cls) return ele; // 重复包装相同类

			var wrapperBases = Class.getChain(ele._wrapper);

			// 已经包装过子类了(包了TabControl再包装Component)，无需包装
			if (wrapperBases.indexOf(cls) !== -1) {
				return ele;
			}

			var classBases = Class.getChain(cls);

			// 现有包装不在同一继承树上，报错
			if (classBases.indexOf(ele._wrapper) === -1) {
				throw '包装出错，一个元素只能有一个包装类';
			}
		}

		// 将ele注射进cls，不能使用Class.inject，需要判断：
		// 1、待注入的属性值是否是undefined
		// 2、属性是否已经在对象中存在（避免对innerHTML之类DOM节点属性进行设置）
		ele.__class__ = cls;
		ele.__properties__ = cls.prototype.__properties__;
		var clsInstance = Class.getInstance(cls);
		for (var prop in clsInstance) {
			if (prop in ele || clsInstance[prop] === undefined) {
				continue;
			}
			ele[prop] = clsInstance[prop];
		}
		Class.initMixins(cls, ele);
		if (typeof cls.prototype.initialize == 'function') {
			cls.prototype.initialize.apply(ele, []);
		}

		ele._wrapper = cls;
		return ele;
	});

});

/**
 * Tab UI
 * @class
 */
this.TabControl = new Class(exports.Component, function() {

	this.initialize = function(self) {
		exports.Component.initialize(self);

		self.tabs = dom.getElements('li', self);
		self.selectedEle = null;

		for (var i = 0; i < self.tabs.length; i++) {
			if (dom.wrap(self.tabs[i]).classList.contains('selected')) {
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
				self.fireEvent('change', {tab: self});
			});
		});
	};

});

this.ForeNextControl = new Class(exports.Component, function() {

	this.initialize = function(self) {
		exports.Component.initialize(self);

		self.total = parseInt(self.getData('total'));
		self.start = parseInt(self.getData('start')) || 0;
		self.position = self.start;

		self.render('.nextbutton', {
			onclick: self.bind('next')
		});

		self.render('.forebutton', {
			onclick: self.bind('fore')
		});

	};

	this.next = function(self) {
		self.position++;
		self.call('change');
	};

	this.fore = function(self) {
		self.position--;
		self.call('change');
	};

	this.change = function(self) {
		self.call('updateTotal');
		self.call('updatePosition');
	};

	this.updatePosition = function(self) {
		self.getElements('.current').set('html', self.position);
	};

	this.updateTotal = function(self) {
		self.getElements('.total').set('html', self.total);
	};

});

});


