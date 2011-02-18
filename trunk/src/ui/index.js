/**
 * @namespace
 * @name ui
 */
object.add('ui', 'string, dom', /**@lends ui*/ function(exports, string, dom) {

/**
 * 定义sub components
 */
this.define = function(cls, name, selector, type, single) {

	var getter = function(self) {
		if (!type) type = exports.Component;

		if (!self._descriptors[name]) {
			self._descriptors[name] = {
				selector: selector,
				type: type,
				single: single
			};
		}

		var pname = '_' + name;
		if (single) {
			var node = self._node.getElement(selector);
			if (!node) return null;
			else if (self[pname] === node) return self[name]; // 不是第一次get，且结果和上次相同，避免再次添加事件

			self._addEventTo(name, node);
			self[pname] = node;

			return new type(node, self._subOptions[name]);
		} else {
			var nodes = self._node.getElements(selector);
			if (!nodes) {
				self[pname] = new dom.Elements([]);
				return new exports.Components([], type);
			}

			// 如果已经初始化过，则要确保不会对之前取到过得元素重新执行添加事件
			nodes.forEach(function(node) {
				if (!self[pname] || self[pname].indexOf(node) === -1) {
					self._addEventTo(name, node);
				}
			});
			self[pname] = nodes;

			return new exports.Components(nodes, type, self._subOptions[name], self);
		}
	};

	cls[name] = property(getter);
};

/**
 * 定义一个sub component
 */
this.define1 = function(cls, name, selector, type) {
	exports.define(cls, name, selector, type, true);
};

/**
 * 定义 options
 */
this.defineOptions = function(cls, options) {
	Object.keys(options).forEach(function(name) {
		var pname = '_' + name;
		var methodName = name + '_change';
		cls[name] = property(function(self) {
			if (self[pname] === undefined) {
				self[pname] = options[name];
			}
			return self[pname];
		}, function(self, value) {
			if (self[methodName]) {
				self[methodName](value);
			}
			self[pname] = value;
			self._set(name, value);
			return self[pname];
		});
	});
};

/**
 * @class
 */
var Element = new Class(function() {

	Object.keys(dom.Element).forEach(function(name) {
		if (typeof dom.Element[name] === 'function') {
			if (['initialize'].indexOf(name) != -1) return;

			this[name] = function(self) {
				var args = [self._node];
				var arg;
				// 代理方法支持Component参数
				for (var i = 1; i < arguments.length; i++) {
					arg = arguments[i];
					args.push((arg && arg._node)? arg._node : arg);
				}
				return dom.Element[name].apply(dom.Element, args);
			};
		}
	}, this);

});


/**
 * @class
 * @name ui.Components
 */
this.Components = new Class(Array, /**@lends ui.Components*/ function() {

	/**
	 * @param elements wrapped dom elements
	 * @param type 这批节点的共有Component类型，默认为Component
	 */
	this.initialize  = function(self, elements, type, options) {
		if (!type) type = exports.Component;

		for (var i = 0; i < elements.length; i++) {
			self.push(new type(elements[i], options));
		}

		Object.keys(type).forEach(function(name) {
			self[name] = function() {
				var element;
				var i, arg, args = [];
				// 代理方法支持Component参数
				for (i = 0; i < arguments.length; i++) {
					arg = arguments[i];
					args.push((arg && arg._node)? arg._node : arg);
				}
				for (i = 0; i < self.length; i++) {
					element = self[i];
					if (typeof element[name] == 'function') {
						element[name].apply(self[i], args);
					}
				}
			};
		});

		self.set = function(key, value) {
			for (var i = 0; i < self.length; i++) {
				self[i].set(key, value);
			}
		};

		self.get = function(key) {
			var result = [];
			for (var i = 0; i < self.length; i++) {
				result.push(self[i].get(key));
			}
			return result;
		};
	};

});


/**
 * UI模块基类
 * @class
 * @name ui.Component
 */
this.Component = new Class(/**@lends ui.Component*/ function() {

	var getConstructor = function(type) {
		if (type === 'number') return Number;
		else if (type === 'string') return String;
		else if (type === 'boolean') return Boolean;
	}

	Class.mixin(this, Element);

	this.initialize = function(self, node, options) {
		if (!options) options = {};
		self._descriptors = {};
		self._components = []; // 建立出来的所有子component的引用
		self._rendered = []; // render出来的新元素，会在reset时清空
		self._events = self._getEvents(self); // 本class的所有event方法
		self._subOptions = self.parseOptions(options);
		if (typeof node === 'string') {
			var template = node;
			var data = {};
			var str = string.substitute(template, data);
			node = dom.Element.fromString(str).firstChild;
		}
		self._node = node;

		Class.getPropertyNames(self).forEach(function(name) {
			// 从dom获取配置
			var data = self._node.getData(name.toLowerCase());
			if (data) {
				var defaultValue = self.get(name);
				var value = getConstructor(typeof defaultValue)(data);
				self._set(name, value);
			// 从options参数获取配置
			} else if (options[name]) {
				self._set(name, options[name]);
			// 默认配置
			} else {
				self[name] = self.get(name);
			}
		});
	};

	this._addEventTo = function(self, name, node) {
		var events = self._events[name];
		if (!events) return;

		if (events) events.forEach(function(event) {
			node.addEvent(event.name, event.func);
		});
	};

	/**
	 * 解析options为对象
	 * {'a.b.c': 1, b: 2} ==> {a: {b: {c:1}}, b: 2}
	 */
	this.parseOptions = staticmethod(function(options) {
		if (options.PARSED) {
			return options;
		}

		var parsed = {PARSED: true};
		Object.keys(options).forEach(function(name) {
			var parts = name.split('.');
			var current = parsed;
			for (var i = 0, part; i < parts.length - 1; i++) {
				part = parts[i];
				if (current[part] === undefined) {
					current[part] = {PARSED: true};
				}
				current = current[part];
			}
			current[parts[parts.length - 1]] = options[name];
		});
		return parsed;
	});

	this.render = function(self, name, data) {
		var methodName = 'render' + string.capitalize(name);
		var descriptor = self._descriptors[name];
		var type = descriptor.type;
		if (!self[methodName]) return;
		var result = self[methodName](data);

		// 如果有返回结果，说明没有使用self.make，而是自己生成了需要的普通node元素，则对返回结果进行一次包装
		if (result) {
			if (Array.isArray(result)) {
				result.forEach(function(node) {
					self.registerComponent(name, node);
				});
			} else {
				self.registerComponent(name, result);
			}
		}
	};

	/**
	* 根据descriptors的type创建一个component，这一般是在renderXXX方法中进行调用
	* @param name
	* @param data 模板数据
	*/
	this.make = function(self, name, data) {
		var descriptor = self._descriptors[name];
		var template = descriptor.template;
		var secName = descriptor.secName;

		if (!data) data = {};
		var options = {};
		var extendOptions = self._subOptions[name];
		if (extendOptions) {
			Object.keys(extendOptions).forEach(function(key) {
				options[key] = extendOptions[key];
				if (data[key] === undefined) data[key] = extendOptions[key];
			});
		}

		var tdata = {};
		if (secName) {
			tdata[secName] = data;
		} else {
			tdata = data;
		}

		var str = string.substitute(template, tdata);
		var node = dom.Element.fromString(str).firstChild;
		var comp = self.registerComponent(name, node, options);

		return comp;
	};

	/**
	 * 根据节点初始化一个component，并放到相应的引用上去。
	 */
	this.registerComponent = function(self, name, node, options) {
		var descriptor = self._descriptors[name];
		var type = descriptor.type;
		var single = descriptor.single;
		var pname = '_' + name;

		var comp = new type(node, options);

		if (single) {
			self[name] = comp;
			self[pname] = node;
			self._addEventTo(name, node);
			self._rendered.push(node);
		} else {
			self[name].push(comp);
			self[pname].push(node);
			self._addEventTo(name, node);
			self._rendered.push(node);
		}

		return comp;
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
		self._descriptors[name].template = template;
		self._descriptors[name].secName = secName;
	};

	/**
	 * 渲染一个新的控件
	 * @param template 模板字符串
	 * @param data 模板数据
	 * @param secName 模板片段名称
	 * @deprecated
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
		var node = dom.Element.fromString(str).firstChild;
		return new cls(node);
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

	this.invalid = function(self, msg) {
		if (!msg) msg = '输入错误';
		alert(msg);
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
			var single = self._descriptors[name].single;
			if (single) {
				if (self[name] && self[name].reset) self[name].reset();
			} else {
				if (self[name]) {
					self[name].forEach(function(comp) {
						comp.reset();
					});
				}
			}
		});
	};

	this.getNode = function(self) {
		return self._node;
	};

	this.define = staticmethod(exports.define);
	this.define1 = staticmethod(exports.define1);
	this.defineOptions = staticmethod(exports.defineOptions);

});

/**
 * @class
 * @name ui.ForeNextControl
 */
this.ForeNextControl = new Class(exports.Component, /**@lends ui.ForeNextControl*/ function() {

	exports.define(this, 'nextButton', '.nextbutton');
	exports.define(this, 'foreButton', '.forebutton');

	this.initialize = function(self, node) {
		exports.Component.initialize(self, node);

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
		self._node.getElements('.current').set('innerHTML', self.position + 1); // position是从0开始滴～展示的时候+1
	};

	this.updateTotal = function(self) {
		self._node.getElements('.total').set('innerHTML', self.total);
	};

});

});
