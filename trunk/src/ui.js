object.add('ui', 'string, dom, attribute', function($, string, dom, attribute) {

/**
 * UI模块基类
 * @class
 */
var Component = this.Component = new Class(Events, function() {

	this.__init__ = function(self, node) {
		Events.__init__(self);

		self._properties = {};
		self._componentDescriptors = {};
		self._components = [];
		self._rendered = [];
		// 本class的所有event方法
		self._events = self._getEvents(self);

		self.node = node;
	};

	this.set = function(self, prop, value) {
		var property = self._properties[prop];
		if (property && property.set) {
			property.set.call(self, value);
		} else {
			self.node.set(prop, value);
		}
	};

	this.get = function(self, prop) {
		var property = self._properties[prop];
		if (property && property.get) {
			return property.get.apply(self);
		} else {
			return self.node.get(prop);
		}
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
		var single = self._componentDescriptors[name].single;
		var type = self._componentDescriptors[name].type;
		var result;
		if (self[methodName]) {
			result = self[methodName](data);
			if (result) {
				if (single || !Array.isArray(result)) {
					self._rendered.push(result);
				} else {
					result.forEach(function(ele) {
						self._rendered.push(ele);
					});
				}
			}
		}
		self.get(name);
	};

	/**
	* 根据componentDescriptors的type创建一个component，这一般是在renderXXX方法中进行调用
	* @param name
	* @param data 模板数据
	*/
	this.make = function(self, name, data) {
		var template = self._componentDescriptors[name].template;
		var secName = self._componentDescriptors[name].secName;

		if (!data) data = {};
		var tdata = {};
		if (secName) {
			tdata[secName] = data;
		} else {
			tdata = data;
		}

		var str = string.substitute(template, tdata);
		var ele = dom.Element.fromString(str).firstChild;

		return ele;
		//return self._componentDescriptors[name].type.create(template, data, secName);
	};

	this.bind = function(self, name) {
		return function() {
			self.apply(name, [].slice.call(arguments, 0));
		};
	};

	this.call = function(self, name) {
		self.fireEvent(name, null, self);
		if (!self[name]) throw 'no method named ' + name;
		self[name].apply(self, [].slice.call(arguments, 2));
	};

	this.apply = function(self, name, args) {
		self.fireEvent(name, null, self);
		if (!self[name]) throw 'no method named ' + name;
		self[name].apply(self, args);
	};

	this.setTemplate = function(self, name, template, secName) {
		self._componentDescriptors[name].template = template;
		self._componentDescriptors[name].secName = secName;
	};

	this.addComponent = function(self, name, selector, type) {
		self.addComponents(name, selector, type, true);
	};

	this.addComponents = function(self, name, selector, type, single) {
		if (!type) type = Component;

		self._componentDescriptors[name] = {
			selector: selector,
			type: type,
			single: single
		};

		attribute.defineProperty(self, name, {
			get: function() {
				if (single) {
					var ele = self.node.getElement(selector);
					if (!ele) return null;
					var component = new type(ele);
					if (ele) self._addEventTo(name, ele);
					self['_' + name] = ele;
					self[name] = component;
					return component;
				} else {
					var eles = self.node.getElements(selector);
					if (!eles) return null;
					eles.forEach(function(ele, i) {
						eles[i] = new type(ele);
						self._addEventTo(name, ele);
					});
					self['_' + name] = eles;
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
		var value = self.node.getData(name);
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

		var str = string.substitute(template, tdata);
		var ele = dom.Element.fromString(str).firstChild;
		return new cls(ele);
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
		Class.inject(cls, ele);

		ele._wrapper = cls;
		return ele;
	});

	this.load = function(self) {
	};

	this.reload = function(self) {
		self.call('reset');
		self.call('load');
	};

	this.error = function(self, msg) {
		if (!msg) msg = '出错啦！';
		alert(msg);
	};

	this.reset = function(self) {
		// 清空所有render进来的新元素
		self._rendered.forEach(function(node) {
			node.dispose();
		});
		// 所有子component reset
		self._components.forEach(function(name) {
			var single = self._componentDescriptors[name].single;
			if (single) {
				if (self[name] && self[name].reset) self[name].reset();
			} else {
				if (self[name]) {
					self[name].forEach(function(component) {
						component.reset();
					});
				}
			}
		});
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
		this.__init__(self);

		self.addComponents('tabs', 'li');

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
					tab.classList.remove('selected');
				});
				self.selectedEle = ele;
				ele.classList.add('selected');
				self.fireEvent('change', null, self);
			});
		});
	};

});

/**
 * @class
 */
var ForeNextControl = this.ForeNextControl = new Class(Component, function() {

	/**
	 * @constructor
	 */
	this.__init__ = function(self, node) {
		this.__init__(self, node);

		self.addComponents('nextButton', '.nextbutton');
		self.addComponents('foreButton', '.forebutton');

		self.total = parseInt(self.node.getData('total'), 10);
		self.start = parseInt(self.node.getData('start'), 10) || 0;
		self.position = self.start;
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
		self.node.getElements('.current').set('html', self.position + 1); // position是从0开始滴～展示的时候+1
	};

	this.updateTotal = function(self) {
		self.node.getElements('.total').set('html', self.total);
	};

});

});

