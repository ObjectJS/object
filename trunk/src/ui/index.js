/**
 * @namespace
 * @name ui
 */
object.add('ui', 'string, dom, ui.decorators', /**@lends ui*/ function(exports, string, dom, ui) {

var fireevent = ui.decorators.fireevent;

/**
 * 定义sub components
 * @param selector 选择器
 * @param type 构造类
 * @param single 是否是单独的引用
 */
this.define = function(selector, type, single) {
	function getter(self) {
		var name = prop.__name__;

		// 默认为 Component
		if (!type) type = exports.Component;
		if (!self._descriptors[name]) {
			self._descriptors[name] = {
				selector: selector,
				type: type,
				single: single
			};
		}

		if (!self._node) return null;
		var comVar = '__' + name;
		if (self[comVar]) return self[comVar];
		var pname = '_' + name;
		if (single) {
			var node = self._node.getElement(selector);
			if (!node) return null;
			else if (self[pname] === node) return self[name]; // 不是第一次get，且结果和上次相同，避免再次添加事件

			self._addEventTo(name, node);
			self[pname] = node;

			self[comVar] = new type(node, self._subOptions[name]);
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

			self[comVar] = new exports.Components(nodes, type, self._subOptions[name], self);
		}
		return self[comVar];
	};
	var prop = property(getter);
	return prop;
};

/**
 * 定义一个sub component
 */
this.define1 = function(selector, type) {
	return exports.define(selector, type, 1);
};

this.option = function(value, onchange) {
	function fget(self) {
		var pname = '_' + prop.__name__;
		if (self[pname] === undefined) {
			self[pname] = value;
		}
		return self[pname];
	}
	function fset(self, value) {
		var name = prop.__name__;
		var pname = '_' + name;
		self._setOption(name, value);
		if (onchange) onchange(self, value);
		return self[pname];
	}
	var prop = property(fget, fset);
	return prop;
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
		self._subOptions = self._parseOptions(options);
		var propertyNames = Class.getPropertyNames(self);

		if (!node.nodeType) {
			if (typeof node == 'string') {
				node = {
					template: node
				};
			}
			var data = {};
			propertyNames.forEach(function(key) {
				var value = self.get(key);
				if (!self._descriptors[key] && options[key] === undefined) data[key] = self.get(key);
			});
			extend(data, options);

			var tdata;
			if (node.section) {
				tdata = {};
				tdata[node.section] = data;
			} else {
				tdata = data;
			}
			var str = string.substitute(node.template, tdata);
			node = dom.Element.fromString(str).firstChild;
		}

		self._node = node;
		propertyNames.forEach(function(name) {
			var value = self.get(name);
			if (self._descriptors[name]) {
				self._set(name, value);
			} else {
				// 从dom获取配置
				var data = node.getData(name.toLowerCase());
				if (data) {
					var defaultValue = self.get(name);
					var value = getConstructor(typeof defaultValue)(data);
					self._setOption(name, value);
				// 从options参数获取配置
				} else if (options[name]) {
					self._setOption(name, options[name]);
				// 默认配置
				} else {
					self._setOption(name, value);
				}
			}
		});
	};

	this._setOption = function(self, name, value) {
		var pname = '_' + name;
		self[pname] = value;
		self._set(name, value);
	};

	/**
	 * 根据key的pattern获取所有sub component的event定义
	 */
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

	this._addEventTo = function(self, name, node) {
		var events = self._events[name];
		if (!events) return;

		if (events) events.forEach(function(event) {
			node.addEvent(event.name, event.func);
		});
	};

	/**
	 * 根据节点初始化一个component，并放到相应的引用上去。
	 */
	this._registerComponent = function(self, name, node, options) {
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

	/**
	 * 解析options为对象
	 * {'a.b.c': 1, b: 2} ==> {a: {b: {c:1}}, b: 2}
	 */
	this._parseOptions = staticmethod(function(options) {
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

	/**
	 * 渲染一组subcomponent
	 * @param name subcomponent名字
	 * @param data 模板数据/初始化参数
	 */
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
					self._registerComponent(name, node);
				});
			} else {
				self._registerComponent(name, result);
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
		var type = descriptor.type;
		var single = descriptor.single;
		var pname = '_' + name;
		var options = {};
		var extendOptions = self._subOptions[name];
		extend(options, extendOptions);

		if (data) {
			Object.keys(data).forEach(function(key) {
				options[key] = data[key];
			});
		}

		var comp = new type({
			template: descriptor.template,
			section: descriptor.section
		}, options);
		var node = comp._node;

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

	this.call = classmethod(function(cls, name, self) {
		if (!cls[name]) throw 'no method named ' + name;
		self.nofireevent = true;
		cls[name].apply(cls, [].slice.call(arguments, 2));
		self.nofireevent = false;
	});

	/**
	 * 设置subcomponent的template
	 */
	this.setTemplate = function(self, name, template, section) {
		self._descriptors[name].template = template;
		self._descriptors[name].section = section;
	};

	/**
	 * 弹出验证错误信息
	 */
	this.invalid = fireevent(function(self, msg) {
		if (!msg) msg = '输入错误';
		alert(msg);
	});

	/**
	 * 弹出出错信息
	 */
	this.error = fireevent(function(self, msg) {
		if (!msg) msg = '出错啦！';
		alert(msg);
	});

	/**
	 * 重置一个component，回到初始状态，删除所有render的元素。
	 */
	this.reset = fireevent(function(self) {
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
	});

	/**
	 * 获取包装的节点
	 */
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

	this.nextButton = exports.define('.nextbutton');
	this.foreButton = exports.define('.forebutton');

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
		self.next();
	};

	this.foreButton_click = function(self, event) {
		if (self.position <= 0) {
			if (self.loop) self.position = self.total;
			else return;
		}
		self.fore();
	};

	this.next = fireevent(function(self) {
		self.position++;
		self.change();
	});

	this.fore = fireevent(function(self) {
		self.position--;
		self.change();
	});

	this.change = fireevent(function(self) {
		self.updateTotal();
		self.updatePosition();
	});

	this.updatePosition = fireevent(function(self) {
		self._node.getElements('.current').set('innerHTML', self.position + 1); // position是从0开始滴～展示的时候+1
	});

	this.updateTotal = fireevent(function(self) {
		self._node.getElements('.total').set('innerHTML', self.total);
	});

});

});
