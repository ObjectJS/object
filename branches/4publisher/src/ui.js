object.add('ui', 'string, dom, attribute', function($, string, dom, attribute) {

/**
 * UI模块基类
 * @class
 */
var Component = this.Component = new Class(function() {

	this._templates = {};

	this.__init__ = function(self) {
		self = $.wrap(self);
		self._components = {};

		// 本class的所有event方法
		self._events = self._getEvents(self);
		self.call('load');
	};

	this.load = function(self) {
	};

	this._addEventTo = function(self, name, ele) {
		if (!self._events[name] || ele._eventAdded) return;

		Object.keys(self._events[name]).forEach(function(eventName) {
			ele.addEvent(eventName, self._events[name][eventName]);
		});
		ele._eventAdded = true;
	};

	this.render = function(self, name, data) {
		var methodName = 'render' + string.capitalize(name);
		var result;
		if (self[methodName]) {
			result = self[methodName](data);
			if (result) {
				self.set(name, result);
			}
		}
		self.get(name);
	};

	/**
	* 根据components的type创建一个component，这一般是在renderXXX方法中进行调用
	* @param name
	* @param data 模板数据
	*/
	this.make = function(self, name, data) {
		var template = self._templates[name].template;
		var secName = self._templates[name].secName;
		return self._components[name].type.create(template, data, secName);
	};

	this.bind = function(self, name) {
		return function() {
			self.apply(name, [].slice.call(arguments, 0));
		};
	};

	this.call = function(self, name) {
		self.fireEvent(name, null, self);
		self[name].apply(self, [].slice.call(arguments, 2));
	};

	this.apply = function(self, name, args) {
		self.fireEvent(name, null, self);
		self[name].apply(self, args);
	};

	this.setTemplate = classmethod(function(cls, name, template, secName) {
		cls._templates[name] = {
			template: template,
			secName: secName
		}
	});

	this.addComponent = function(self, name, selector, type) {
		self.addComponents(name, selector, type, true);
	};

	this.addComponents = function(self, name, selector, type, single) {
		if (!type) type = Component;

		self._components[name] = {
			selector: selector,
			type: type,
			single: single
		};

		attribute.defineProperty(self, name, {
			get: function() {
				if (single) {
					var ele = self.getElement(selector);
					if (!ele) return;
					if (type) type.wrap(eles);
					if (eles) self._addEventTo(name, eles);
					self[name] = ele;
					return ele;
				} else {
					var eles = self.getElements(selector);
					if (!eles) return;
					eles.forEach(function(ele) {
						if (type) type.wrap(ele);
						self._addEventTo(name, ele);
					});
					self[name] = eles;
					return eles;
				}
			},
			set: function(eles) {
				if (single) {
					self._addEventTo(name, eles);
				} else {
					eles.forEach(function(ele) {
						self._addEventTo(name, ele);
					});
				}
			}
		});

		self.get(name);
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

	/**
	 * 渲染一个新的控件
	 * @param template 模板字符串
	 * @param data 模板数据
	 * @param secName 模板片段名称
	 */
	this.create = classmethod(function(cls, template, data, secName) {
		if (!data) data = {};
		var tdata = {};
		if (secName) {
			tdata[secName] = data;
		} else {
			tdata = data;
		}

		var str = string.substitute(template, tdata)
		var ele = dom.Element.fromString(str).firstChild;
		return cls.wrap(ele);
	});

	this._getEvents = classmethod(function(cls, self) {
		var events = {};

		Object.keys(cls).forEach(function(key) {
			var match = key.match(/([a-zA-Z]+)_([a-zA-Z]+)/);
			if (!match) return;
			var name = match[1];
			var eventName = match[2];

			if (!events[name]) events[name] = {};
			events[name][eventName] = self[key];
		});

		return events;
	});

	/**
	 * ele有可能已经wrap过，要注意不要重新覆盖老的成员
	 * 提供了包装机制不代表同一个元素可以进行多重包装，在相同的继承树上多次包装没有问题，如果将两个无关的类型包装至同一元素，则第二次包装报错
	 * 如果 TabControl.wrap(ele) 后进行 List.wrap(ele) ，则List包装失效并且报错
	 * 如果 TabControl.wrap(ele) 后进行 Component.wrap(ele) 由于TabControl继承于Component，则无需包装
	 * 如果 Component.wrap(ele) 后进行 TabControl.wrap(ele) 由于TabControl继承于Component，则包装成功
	 * @classmethod
	 */
	this.wrap = classmethod(function(cls, ele) {
		if (!ele) return null;

		// 获取class的所有继承关系，存成平面数组
		// TODO: class 的 chain 机制
		function getBases(m) {
			var array = [];
			for (var i = 0, l = m.length; i < l; i++){
				array = array.concat((m[i].__bases__ && m[i].__bases__.length) ? arguments.callee(m[i].__bases__) : m);
			}
			return array;
		}

		if (ele._wrapper) {
			if (ele._wrapper === cls) return ele; // 重复包装相同类

			var wrapperBases = getBases([ele._wrapper]);

			// 已经包装过子类了(包了TabControl再包装Component)，无需包装
			if (wrapperBases.indexOf(cls) !== -1) {
				return ele;
			}

			var classBases = getBases([cls]);

			// 现有包装不在同一继承树上，报错
			if (classBases.indexOf(ele._wrapper) === -1) {
				throw '包装出错，一个元素只能有一个包装类';
			}
		}

		// 将ele注射进cls
		Class.inject(cls, ele, []);

		ele._wrapper = cls;
		return ele;
	});

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
		this.__init__(self);

		self.selectedEle = null;

		for (var i = 0; i < self.get('tabs').length; i++) {
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
				self.fireEvent('change', null, self);
			});
		});
	};

	this.load = function(self) {
		self.addComponents('tabs', 'li');
	};

});

/**
 * @class
 */
var ForeNextControl = this.ForeNextControl = new Class(Component, function() {

	/**
	 * @constructor
	 */
	this.__init__ = function(self) {
		this.__init__(self);

		self.total = parseInt(self.getData('total'));
		self.start = parseInt(self.getData('start')) || 0;
		self.position = self.start;
	};

	this.load = function(self) {
		self.addComponents('nextButton', '.nextbutton');
		self.addComponents('foreButton', '.forebutton');
	};

	this.nextButton_click = function(self, event) {
		self.call('next');
	};

	this.foreButton_click = function(self, event) {
		self.call('fore');
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
		self.getElements('.current').set('html', self.position + 1); // position是从0开始滴～展示的时候+1
	};

	this.updateTotal = function(self) {
		self.getElements('.total').set('html', self.total);
	};

});

});

