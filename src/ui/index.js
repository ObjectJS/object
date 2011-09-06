/**
 * @namespace
 * @name ui
 */
object.add('ui', 'string, options, dom, events', /**@lends ui*/ function(exports, string, options, dom, events) {

/**
 * @class
 */
var Element = new Class(function() {

	Class.keys(dom.Element).forEach(function(name) {
		var member = dom.Element.get(name);
		if (['initialize'].indexOf(name) != -1) return;
		if (typeof member != 'function') return;

		this[name] = function(self) {
			var args = [];
			var arg;
			// 代理方法支持Component参数
			for (var i = 1; i < arguments.length; i++) {
				arg = arguments[i];
				args.push((arg && arg._node)? arg._node : arg);
			}
			return dom.Element.prototype[name].apply(self._node, args);
		};
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
	this.initialize = function(self, elements, type, options) {
		if (!type) type = exports.Component;

		for (var i = 0; i < elements.length; i++) {
			self.push(new type(elements[i], options));
		}

		Object.keys(type.prototype).forEach(function(name) {
			if (typeof type.prototype[name] != 'function') return;

			self[name] = function() {
				var element;
				//var i, arg, args = [];
				// 代理方法支持Component参数
				//for (i = 0; i < arguments.length; i++) {
					//arg = arguments[i];
					//args.push((arg && arg._node)? arg._node : arg);
				//}
				for (i = 0; i < self.length; i++) {
					element = self[i];
					if (typeof element[name] == 'function') {
						element[name].apply(self[i], arguments);
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
 * 为一个Component定义一个sub components引用
 * 用法：
 * MyComponent = new Class(ui.Component, {
 *	refname: ui.define('css selector', ui.menu.Menu)
 * });
 * 这样MyComponent实例的refname属性极为相对应selector获取到的节点引用
 * @param selector 选择器
 * @param type 构造类
 * @param single 是否是单独的引用
 */
this.define = function(selector, type, single) {
	var prop = property(function(self) {
		return self[prop.__name__];
	});
	prop.isComponent = true;
	prop.selector = selector;
	prop.type = type || exports.Component;
	prop.single = single;
	return prop;
};

/**
 * 定义唯一引用的sub component
 */
this.define1 = function(selector, type) {
	return exports.define(selector, type, 1);
};

/**
 * 声明一个option
 * 用法：
 * MyComponent = new Class(ui.Component, {
 *	myConfig: ui.option(1)
 * });
 * 这样MyComponent实例的myConfig属性值即为默认值1，可通过 set 方法修改
 */
this.option = function(defaultValue) {
	var prop;
	function fget(self) {
		return self.getOption(prop.__name__);
	}
	function fset(self, value) {
		return self.setOption(prop.__name__, value);
	}
	prop = property(fget, fset);
	prop.defaultValue = defaultValue;
	return prop;
};

// metaclass
this.__component = new Class(function() {

	this.__new__ = function(cls, name, base, dict) {

		if (dict.__metaclass__) {
			dict.__defaultOptions = []; // 默认options
			dict.__subs = [];
			dict.__subEvents = {}; // 通过subName_eventType进行注册的事件
			dict.__onEvents = []; // 通过oneventtype对宿主component注册的事件 // 通过oneventtype对宿主component注册的事件 // 通过oneventtype对宿主component注册的事件 // 通过oneventtype对宿主component注册的事件
			dict.__handles = ['init', 'reset', 'invalid', 'error']; // 定义的会触发事件的方法集合
			dict.__methods = [];
		} else {
			dict.__defaultOptions = [];
			dict.__subs = [];
			dict.__subEvents = {};
			dict.__onEvents = [];
			dict.__handles = [];
			dict.__methods = [];

			Object.keys(dict).forEach(function(name) {
				if (name == 'initialize' || name.indexOf('__') == 0) return;
				var member = dict[name];

				// member有可能是null
				if (member != null && member.__class__ === property) {
					if (member.isComponent) {
						dict.__subs.push(name);

					} else {
						dict.__defaultOptions.push(name);
					}
				} else if (typeof member == 'function') {
					if (name.match(/^(_?[a-zA-Z]+)_([a-zA-Z]+)$/)) {
						(dict.__subEvents[RegExp.$1] = dict.__subEvents[RegExp.$1] || []).push(RegExp.$2);

					} else if (name.match(/^on([a-zA-Z]+)$/)) {
						dict.__onEvents.push(RegExp.$1);

					} else if (name.slice(0, 1) == '_' && name.slice(0, 2) != '__' && name != '_set') { // _xxx but not __xxx
						dict.__handles.push(name.slice(1));

					} else {
						dict.__methods.push(name);
					}
				}
			});
		}

		return type.__new__(cls, name, base, dict);
	};

	this.initialize = function(cls, name, base, dict) {

		var proto = cls.prototype;
		var baseProto = base.prototype;

		proto.__handles.forEach(function(eventType) {
			cls.set(eventType, events.fireevent(function(self) {
				proto['_' + eventType].apply(self, [].slice.call(arguments, 1));
			}));
		});

		if (base && baseProto.addons) {
			proto.addons.push.apply(proto.addons, baseProto.addons);
		}

		if (proto.addons) {
			proto.addons.forEach(function(comp) {
				var compProto = comp.prototype;
				compProto.__defaultOptions.forEach(function(name) {
					var defaultOptions = proto.__defaultOptions;
					if (defaultOptions.indexOf(name) != -1) return;
					defaultOptions.push(name);
					cls.set(name, comp.prototype.__properties__[name]);
				});

				compProto.__subs.forEach(function(name) {
					var subs = proto.__subs;
					if (subs.indexOf(name) != -1) return;
					subs.push(name);
					cls.set(name, comp.prototype.__properties__[name]);
				});

				compProto.__handles.forEach(function(eventType) {
					var handles = proto.__handles;
					var methodName = '_' + eventType;
					if (handles.indexOf(eventType) != -1) return;
					handles.push(eventType);
					cls.set(eventType, compProto[eventType].im_func);
					cls.set(methodName, compProto[methodName].im_func);
				});

				compProto.__methods.forEach(function(name) {
					var methods = proto.__methods;
					if (methods.indexOf(name) != -1) return;
					methods.push(name);
					cls.set(name, compProto[name].im_func);
				});
				// onEvents和subEvents在宿主中处理，方法不添加到宿主类上
			});
		}

		if (base && base !== type) {
			baseProto.__defaultOptions.forEach(function(name) {
				var defaultOptions = proto.__defaultOptions;
				if (defaultOptions.indexOf(name) == -1) defaultOptions.push(name);
			});

			baseProto.__subs.forEach(function(name) {
				var subs = proto.__subs;
				if (subs.indexOf(name) == -1) subs.push(name);
			});

			baseProto.__handles.forEach(function(eventType) {
				var handles = proto.__handles;
				if (handles.indexOf(eventType) == -1) proto.__handles.push(eventType);
			});

			baseProto.__methods.forEach(function(name) {
				var methods = proto.__methods;
				if (methods.indexOf(name) == -1) methods.push(name);
			});

			Object.keys(baseProto.__subEvents).forEach(function(subName) {
				var subEvents = proto.__subEvents;
				baseProto.__subEvents[subName].forEach(function(eventType) {
					var subEvent = subEvents[subName];
					if (subEvent && subEvent.indexOf(eventType) != -1) return;
					(subEvents[subName] = subEvents[subName] || []).push(eventType);
				});
			});

			baseProto.__onEvents.forEach(function(eventType) {
				var onEvents = proto.__onEvents;
				if (onEvents.indexOf(eventType) == -1) onEvents.push(eventType);
			});
		}
	};
});

/**
 * UI模块基类，所有UI组件的基本类
 * @class
 * @name ui.Component
 */
this.Component = new Class(/**@lends ui.Component*/ function() {

	this.__metaclass__ = exports.__component;

	var getConstructor = function(type) {
		if (type === 'number') return Number;
		else if (type === 'string') return String;
		else if (type === 'boolean') return Boolean;
	};

	this.__mixins__ = [Element];

	this.initialize = function(self, node, options) {
		// 如果是在mixin中，代表自己正在被当作一个addon
		if (this.mixining) return;

		if (!node.nodeType) {
			if (typeof node == 'string') {
				node = {
					template: node
				};
			}
			var data = {};
			self.__defaultOptions.forEach(function(key) {
				if (options[key] === undefined) data[key] = self.get(key);
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
			node = dom.Element.fromString(str);
		}

		self.__nodeMap = {}; // 相应node的uid对应component，用于在需要通过node找到component时使用
		self.__rendered = {}; // 后来被加入的，而不是首次通过selector选择的node的引用

		self._node = dom.wrap(node);

		self.__initOptions(options);
		self.__initEvents();
		self.__initSubs();
		self.init();
	};

	/**
	 * 加入addon中用onxxx方法定义的事件
	 */
	this.__initEvents = function(self) {
		if (!self.addons) return;
		self.addons.forEach(function(addon) {
			addon.prototype.__onEvents.forEach(function(eventType) {
				var trueEventType; // 正常大小写的名称
				if (self.__handles.some(function(handle) {
					if (handle.toLowerCase() == eventType) {
						trueEventType = handle;
						return true;
					}
					return false;
				})) {
					self.addEvent(trueEventType, function(event) {
						// 将event._args pass 到函数后面
						var args = [event].concat(event._args);
						addon.prototype['on' + eventType].apply(self, args);
					});
				}
			});
		});
	};

	this.__initOptions = function(self, options) {
		if (!options) options = {};
		self._options = {};
		Object.keys(options).forEach(function(name) {
			// 浅拷贝
			// object在subcomponent初始化时同样进行浅拷贝
			self._options[name] = options[name];
		});

		self.__defaultOptions.forEach(function(name) {
			// 从dom获取配置
			var data = self._node.getData(name.toLowerCase()),
			defaultValue = self.__properties__[name].defaultValue,
			value;

			if (data) {
				value = getConstructor(typeof defaultValue)(data);
				self.__setOption(name, value);
			// 从options参数获取配置
			} else if (options[name]) {
				self.__setOption(name, options[name]);
			// 默认配置
			} else {
				self.__setOption(name, defaultValue);
			}

			// 注册 option_change 等事件
			var bindEvents = function(events, cls) {
				if (events) {
					events.forEach(function(eventType) {
						var fakeEventType = '__option_' + eventType + '_' + name;
						var methodName = name + '_' + eventType;
						self.addEvent(fakeEventType, function(event) {
							if (cls) cls.prototype[methodName].call(self, event.value);
							else self[methodName](event.value);
						});
					});
				}
			};

			bindEvents(self.__subEvents[name]);
			if (self.addons) {
				self.addons.forEach(function(addon) {
					bindEvents(addon.prototype.__subEvents[name], addon);
				});
			}

		});
	};

	this.__initSubs = function(self) {
		self.__subs.forEach(function(name) {
			var sub = self.__properties__[name];

			// 此时的option还是prototype上的，在sub初始化时会被浅拷贝
			// 从options获取子元素的模板信息
			var options = self._options[name];
			if (options && !sub.template) {
				sub.template = options.template;
				sub.section = options.templateSection;
			}
			// 从options获取子元素的扩展信息
			if (options && options.addons) {
				sub.type = new Class(sub.type, function() {
					options.addons.forEach(function(addon) {
						exports.addon(this, addon);
					}, this);
				});
			}
			var node;

			self.__initSub(name, self.__querySub(name));
		});
	};

	/**
	 * 根据sub的定义获取component的引用
	 */
	this.__initSub = function(self, name, nodes) {
		if (!self._node) return null;

		var sub = self.__properties__[name];
		var comps;
		var options = self._options[name];

		if (sub.single) {
			if (nodes) {
				comps = new sub.type(nodes, options);
				self.__fillSub(name, comps);
			}
		} else {
			if (nodes) {
				comps = new exports.Components(nodes, sub.type, options);
				comps.forEach(function(comp) {
					self.__fillSub(name, comp);
				});
			} else {
				// 没有的也留下一个空的Components
				comps = new exports.Components([], sub.type);
			}
		}

		self['_' + name] = nodes;
		self._set(name, comps);

		return comps;
	};

	/**
	 * 将一个comp的信息注册到__subs上
	 */
	this.__fillSub = function(self, name, comp) {
		var sub = self.__properties__[name];
		var node = comp._node;
		self.__addNodeMap(name, String(node.uid), comp);
		var comp = self.__nodeMap[name][String(node.uid)];

		// 注册 option_change 等事件
		var bindEvents = function(events, cls) {
			if (events) {
				events.forEach(function(eventType) {
					var methodName = name + '_' + eventType;
					node.addEvent(eventType, function(event) {
						if (cls) cls.prototype[methodName].apply(self, [event, comp].concat(event._args));
						else self[methodName].apply(self, [event, comp].concat(event._args));
					});
				});
			}
		};

		bindEvents(self.__subEvents[name]);
		if (self.addons) {
			self.addons.forEach(function(addon) {
				bindEvents(addon.prototype.__subEvents[name], addon);
			});
		}
	};

	/**
	* 获取sub的节点
	*/
	this.__querySub = function(self, name) {
		var sub = self.__properties__[name];
		return sub.single? self._node.getElement(sub.selector) : self._node.getElements(sub.selector);
	};

	this.__setOption = function(self, name, value) {
		var pname = '_' + name;
		self[pname] = value;
		self._set(name, value);
	};

	this.__addRendered = function(self, name, node) {
		var rendered = self.__rendered;
		if (!rendered[name]) rendered[name] = [];
		rendered[name].push(node);
	};

	this.__addNodeMap = function(self, name, id, comp) {
		var nodeMap = self.__nodeMap;
		if (!nodeMap[name]) nodeMap[name] = {};
		nodeMap[name][id] = comp;
	};

	this._init = function(self) {
	};

	/**
	 * 弹出验证错误信息
	 */
	this._invalid = function(self, msg) {
		if (!msg) msg = '输入错误';
		alert(msg);
	};

	/**
	 * 弹出出错信息
	 */
	this._error = function(self, msg) {
		if (!msg) msg = '出错啦！';
		alert(msg);
	};

	/**
	 * 重置一个component，回到初始状态，删除所有render的元素。
	 */
	this._reset = function(self) {
		// 清空所有render进来的新元素
		self.__subs.forEach(function(name) {
			var sub = self.__properties__[name];
			var pname = '_' + name;
			if (self.__rendered[name]) {
				self.__rendered[name].forEach(function(node) {
					var comp = self.__nodeMap[name][node.uid];
					delete self.__nodeMap[name][node.uid];
					node.dispose();
					if (sub.single) {
						self[name] = self[pname] = null;
					} else {
						self[name].splice(self[name].indexOf(comp), 1); // 去掉
						self[pname].splice(self[pname].indexOf(node), 1); // 去掉
					}
				});
			}
			if (!sub.single) {
				self[name].forEach(function(comp) {
					comp.reset();
				});
			} else if (self[name]) {
				self[name].reset();
			}
		});
	};

	this.getOption = function(self, name) {
		var pname = '_' + name;
		if (self[pname] === undefined) {
			self[pname] = self.__properties__[name].defaultValue;
		}
		return self[pname];
	};

	/**
	 */
	this.setOption = options.overloadsetter(function(self, name, value) {
		// 由于overloadsetter是通过name是否为string来判断传递形式是name-value还是{name:value}的
		// 在回调中为了性能需要直接传的parts，类型为数组，而不是字符串，因此无法通过回调用overloadsetter包装后的方法进行回调
		(function(self, name, value) {
			var parts = Array.isArray(name)? name : name.split('.');
			if (parts.length > 1) {
				exports.setOptionTo(self._options, parts, value);
				if (self[parts[0]]) {
					arguments.callee(self[parts[0]], parts.slice(1), value);
				}
			} else {
				self.__setOption(name, value);
				self.fireEvent('__option_change_' + name, {value: value});
			}
		})(self, name, value);
	});

	/**
	 * 渲染一组subcomponent
	 * @param name subcomponent名字
	 * @param data 模板数据/初始化参数
	 */
	this.render = function(self, name, data) {

		var sub = self.__properties__[name];
		var methodName = 'render' + string.capitalize(name);
		var method2Name = name + 'Render';
		var nodes;

		// 如果已经存在结构了，则不用再render了
		if (!!(sub.single? self[name] : self[name].length)) {
			return;
		}

		if (self[method2Name]) {
			nodes = self[method2Name](function() {
				return self.make(name, data);
			});
		} else if (self[methodName]) {
			nodes = self[methodName](data);
		} else {
			nodes = self.__querySub(name);
		}

		// 如果有返回结果，说明没有使用self.make，而是自己生成了需要的普通node元素，则对返回结果进行一次包装
		if (nodes) {
			if (sub.single) {
				if (Array.isArray(nodes) || nodes.constructor === dom.Elements) throw '这是一个唯一引用元素，请不要返回一个数组';
				self.__addRendered(name, nodes);
			} else {
				if (!Array.isArray(nodes) && nodes.constructor !== dom.Elements) throw '这是一个多引用元素，请返回一个数组';
				nodes = new dom.Elements(nodes);
				nodes.forEach(function(node) {
					self.__addRendered(name, node);
				});
			}

			self.__initSub(name, nodes);
		}
	};

	/**
	* 根据subs的type创建一个component，并加入到引用中，这一般是在renderXXX方法中进行调用
	* @param name
	* @param data 模板数据
	*/
	this.make = function(self, name, data) {
		var sub = self.__properties__[name];
		var pname = '_' + name;
		var options = {};
		var extendOptions = self._options[name];
		extend(options, extendOptions);

		if (data) {
			Object.keys(data).forEach(function(key) {
				options[key] = data[key];
			});
		}

		var comp = new sub.type({
			template: sub.template,
			section: sub.section
		}, options);
		var node = comp._node;

		if (sub.single) {
			self[name] = comp;
			self[pname] = node;
		} else {
			self[name].push(comp);
			self[pname].push(node);
		}
		self.__fillSub(name, comp);
		self.__addRendered(name, node);

		return comp;
	};

	/**
	 * 设置subcomponent的template
	 */
	this.setTemplate = function(self, name, template, section) {
		self.__properties__[name].template = template;
		self.__properties__[name].section = section;
	};

	/**
	 * 获取包装的节点
	 */
	this.getNode = function(self) {
		return self._node;
	};

	this.define = staticmethod(exports.define);
	this.define1 = staticmethod(exports.define1);

});

this.addon = function(dict, Addon) {
	if (!dict.addons) {
		dict.addons = [];
	}
	dict.addons.push(Addon);
};

/**
 * {'a.b.c': 1, b: 2} ==> {a: {b: {c:1}}, b: 2}
 */
this.parseOptions = function(options) {
	var parsed = {};
	Object.keys(options).forEach(function(name) {
		exports.setOptionTo(parsed, name, options[name]);
	});
	return parsed;
};

this.setOptionTo = function(current, name, value) {
	var parts = Array.isArray(name)? name : name.split('.');
	// 生成前缀对象
	for (var i = 0, part; i < parts.length - 1; i++) {
		part = parts[i];
		if (current[part] === undefined) {
			current[part] = {};
		}
		current = current[part];
	}
	current[parts[parts.length - 1]] = value;
};

});
