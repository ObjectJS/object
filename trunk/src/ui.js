object.add('ui', 'string, dom, attribute', function($, string, dom, attribute) {

/**
 * 将dom下的Element类mixin到Component上
 * @param host Component
 * @param cls Element
 */
var mixin = this.mixin = function(host, cls) {
	Object.keys(cls).forEach(function(name) {
		if (typeof cls[name] === 'function') {
			if (['initialize', 'get', 'set'].indexOf(name) != -1) return;

			this[name] = function(self) {
				var args = [].slice.call(arguments, 0);
				args[0] = self._node;
				return cls[name].apply(null, args);
			};
		}
	}, host);
};

/**
 * UI模块基类
 * @class
 */
var Component = this.Component = new Class(function() {

	this.initialize = function(self, node) {
		self._components = []; // 建立出来的所有子component的引用
		self._rendered = []; // render出来的新元素，会在reset时清空
		self._events = self._getEvents(self); // 本class的所有event方法

		self.node = node;
		self._node = node;

		// 有可能有没有sub component的compoennt
		if (self._componentDescriptors) {
			Object.keys(self._componentDescriptors).forEach(function(name) {
				self.get(name);
			});
		}
	};

	this.set = function(self, prop, value) {
		if (self._properties && self._properties[prop] && self._properties[prop].set) {
			self._properties[prop].set.call(self, value);
		} else {
			self._node.set(prop, value);
		}
	};

	this.get = function(self, prop) {
		if (self._properties && self._properties[prop] && self._properties[prop].get) {
			return self._properties[prop].get.apply(self);
		} else {
			return self._node.get(prop);
		}
	};

	this._addEvents = function(self, name) {
		var single = self._componentDescriptors[name].single;

		self._addEventTo(name, self[name]);
	};

	this._addEventTo = function(self, name, com) {
		var events = self._events[name];
		if (!events) return;
		var ele = com.node;

		if (com._eventAdded) return;

		if (events) events.forEach(function(event) {
			ele.addEvent(event.name, event.func);
		});

		com._eventAdded = true;

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
		self._node.fireEvent(name, null, self);
		if (!self[name]) throw 'no method named ' + name;
		self[name].apply(self, [].slice.call(arguments, 2));
	};

	this.apply = function(self, name, args) {
		self._node.fireEvent(name, null, self);
		if (!self[name]) throw 'no method named ' + name;
		self[name].apply(self, args);
	};

	this.setTemplate = function(self, name, template, secName) {
		self._componentDescriptors[name].template = template;
		self._componentDescriptors[name].secName = secName;
	};

	/**
	 * makeOption
	 */
	this.makeOption = function(self, name, type) {
		name = name.toLowerCase();
		var value = self._node.getData(name);
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
			var match = key.match(/^(_?[a-zA-Z]+)_([a-zA-Z]+)$/);
			if (!match) return;
			var name = match[1];
			var eventName = match[2];

			if (!events[name]) events[name] = [];
			events[name].push({
				name: eventName,
				func: self[key].bind(self)
			});
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

	var define = this.define = staticmethod(function(cls, name, selector, type, single) {
		if (!cls._componentDescriptors) cls._componentDescriptors = {}; // component描述
		if (!type) type = ElementComponent;

		cls._componentDescriptors[name] = {
			selector: selector,
			type: type,
			single: single
		};

		attribute.defineProperty(cls, name, {
			get: function() {
				if (single) {
					var ele = this._node.getElement(selector);
					if (!ele) return null;
					this['_' + name] = ele;
					var component = new type(ele);
					this[name] = component;

					this._addEvents(name);
					return component;
				} else {
					var eles = this._node.getElements(selector);
					if (!eles) return null;
					this['_' + name] = eles;
					eles.forEach(function(ele, i) {
						eles[i] = new type(ele);
					});
					eles.node = eles;
					this[name] = eles;

					this._addEvents(name);
					return eles;
				}
			}
		});
	});

	this.define1 = staticmethod(function(cls, name, selector, type) {
		define(cls, name, selector, type, true);
	});

});

var ElementComponent = this.ElementComponent = new Class(Component, function() {

	this.initialize = function(self, node) {
		Component.initialize(self, node);
	};

	mixin(this, dom.Element);

});

var FormElementComponent = this.FormElementComponent = new Class(Component, function() {
	
	this.initialize = function(self, node) {
		Component.initialize(self, node);
	};

	this.invalid = function(self, msg) {
		if (!msg) msg = '出错啦！';
		alert(msg);
	};

	mixin(this, dom.FormElement);

});

/**
 * Tab UI
 * @class
 * @event change
 */
this.TabControl = new Class(ElementComponent, function() {

	Component.define(this, 'tabs', 'li');

	/**
	 * @constructor
	 */
	this.initialize = function(self) {
		Component.initialize(self);

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
var ForeNextControl = this.ForeNextControl = new Class(ElementComponent, function() {

	Component.define(this, 'nextButton', '.nextbutton');
	Component.define(this, 'foreButton', '.forebutton');

	/**
	 * @constructor
	 */
	this.initialize = function(self, node) {
		Component.initialize(self, node);

		self.loop = false; // 是否循环
		self.total = parseInt(self._node.getData('total'));
		self.start = parseInt(self._node.getData('start')) || 0;
		self.position = self.start;
	};

	this.nextButton_click = function(self, event) {
		if (self.position >= self.total - 1) {
			if (self.loop) self.position = -1;
			else return;
		}
		self.call('next');
	};

	this.foreButton_click = function(self, event) {
		if (self.position <= 0) {
			if (self.loop) self.position = self.total;
			else return;
		}
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
		self._node.getElements('.current').set('html', self.position + 1); // position是从0开始滴～展示的时候+1
	};

	this.updateTotal = function(self) {
		self._node.getElements('.total').set('html', self.total);
	};

});

});

