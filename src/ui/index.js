/**
 * @namespace
 * @name ui
 */
object.add('ui', 'string, options, dom, ui.decorators', /**@lends ui*/ function(exports, string, options, dom, ui) {

var fireevent = ui.decorators.fireevent;

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
	this.initialize = function(self, elements, type, options) {
		if (!type) type = exports.Component;

		for (var i = 0; i < elements.length; i++) {
			self.push(new type(elements[i], options));
		}

		Object.keys(type).forEach(function(name) {
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

this.ComponentClass = function(cls, name, base, members) {

	// 此时cls中这5个成员有可能有东西，是从base继承过来的
	// 不过没有意义，因为是保存在class上，而不是instance上
	// 在继承时必须保证每个类都有自己独立的对象保存这几种信息
	cls.__mixin__({
		_defaultOptions : {},
		_subs : {},
		_subEvents: {},
		_events : [],
		_addonEvents : {}
	});

	cls.mixinComponent(base);

	if (base && base._addonEvents) {
		Object.keys(base._addonEvents).forEach(function(eventType) {
			cls.regAddonEvent(eventType, base._addonEvents[eventType]);
		});
	}

	Object.keys(members).forEach(function(name) {
		var member = members[name];
		// member有可能是null
		if (member != null && member.__class__ === property) {
			if (member.isComponent) {
				cls.regSub(name, {
					selector: member.selector,
					type: member.type || exports.Component,
					single: member.single,
					nodeMap: {}, // 相应node的uid对应component，用于在需要通过node找到component时使用
					rendered: [] // 后来被加入的，而不是首次通过selector选择的node的引用
				});
			} else {
				cls.regOption(name, member.defaultValue);
			}
		} else if (typeof member == 'function') {
			if (name.match(/^(_?[a-zA-Z]+)_([a-zA-Z]+)$/)) {
				cls.regSubEvent(RegExp.$1, RegExp.$2, member);
				// addon也可以通过这种命名格式为宿主增加事件
				// 为避免addon的同名方法在mixin时覆盖宿主同名方法，直接在宿主类的原型中删除此类方法
				delete cls[name];
				delete cls.prototype[name];

			} else if (name.match(/^on([a-zA-A]+)$/)) {
				cls.regAddonEvent(RegExp.$1, member);
				delete cls[name];
				delete cls.prototype[name];

			} else if (name.slice(0, 1) == '_' && name.slice(0, 2) != '__' && name != '_set') { // _xxx but not __xxx
				cls.__mixin__(name.slice(1), fireevent(member));
			}
		}
	});

	if (members.addons) {
		cls.addons.forEach(function(addon) {
			cls.setAddon(addon);
		});
	}

};

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
	prop.type = type;
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

/**
 * UI模块基类，所有UI组件的基本类
 * @class
 * @name ui.Component
 */
this.Component = new Class(/**@lends ui.Component*/ function() {

	this.__metaclass__ = exports.ComponentClass;

	var getConstructor = function(type) {
		if (type === 'number') return Number;
		else if (type === 'string') return String;
		else if (type === 'boolean') return Boolean;
	};

	Class.mixin(this, Element);

	this.initialize = function(self, node, options) {
		// 如果是在mixin中，代表自己正在被当作一个addon
		if (this.mixining) return;

		if (!options) options = {};
		self.__initSubOptions(options);
		self._extendedSubs = {};

		if (!node.nodeType) {
			if (typeof node == 'string') {
				node = {
					template: node
				};
			}
			var data = {};
			Object.keys(self._defaultOptions).forEach(function(key) {
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

		self._node = dom.wrap(node);

		self.__initEvents();
		self.__initOptions(options);
		self.__initSubs();
	};

	/**
	 * 加入 _eventType 方法定义的事件
	 */
	this.__initEvents = function(self) {
		self._events.forEach(function(desc) {
			self.addEvent(desc.type, function(event) {
				desc.func(self, event)
			});
		});
	};

	this.__initOptions = function(self, options) {
		Object.keys(self._defaultOptions).forEach(function(name) {
			// 从dom获取配置
			var data = self._node.getData(name.toLowerCase()),
			defaultValue = self._defaultOptions[name],
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
		});
	};

	this.__initSubs = function(self) {
		Object.keys(self._subs).forEach(function(name) {
			var sub = self._subs[name];
			var node;

			if (sub.single) {
				node = self._node.getElement(sub.selector);
			} else {
				node = self._node.getElements(sub.selector);
			}

			self.__initSub(name, node);
		});
	};

	this.__getSubType = function(self, name, options) {
		var type = self._extendedSubs[name];
		if (!type) {
			type = self._subs[name].type;
			if (options && options.addons) {
				type = new Class(type, function() {
					options.addons.forEach(function(addon) {
						exports.addon(this, addon);
					}, this);
				});
				self._extendedSubs[name] = type;
			}
		}
		return type;
	};

	/**
	 * 根据sub的定义获取component的引用
	 */
	this.__initSub = function(self, name, nodes) {
		if (!self._node) return null;

		var sub = self._subs[name];
		var comps;
		var options = self._subOptions[name];
		var type = self.__getSubType(name, options);

		if (sub.single) {
			if (nodes) {
				comps = new type(nodes, options);
				self.__fillSub(name, comps);
			}
		} else {
			if (nodes) {
				comps = new exports.Components(nodes, type, options);
				comps.forEach(function(comp) {
					self.__fillSub(name, comp);
				});
			} else {
				// 没有的也留下一个空的Components
				comps = new exports.Components([], type);
			}
		}

		self['_' + name] = nodes;
		self._set(name, comps);

		return comps;
	};

	/**
	 * 将一个comp的信息注册到_subs上
	 */
	this.__fillSub = function(self, name, comp) {
		var sub = self._subs[name];
		var node = comp._node;
		sub.nodeMap[String(node.uid)] = comp;
		self.__addEventTo(name, node);
	};

	this.getOption = function(self, name) {
		var pname = '_' + name;
		if (self[pname] === undefined) {
			self[pname] = self._defaultOptions[name];
		}
		return self[pname];
	};

	/**
	 */
	this.setOption = options.overloadsetter(function(self, name, value) {
		var parts = Array.isArray(name)? name : name.split('.');
		if (parts.length > 1) {
			self.__setSubOption(parts, value);
			if (self[parts[0]]) {
				self[parts[0]].setOption(parts.slice(1), value);
			}
		} else {
			var pname = '_' + name;
			var methodName = name + 'Change';
			self.__setOption(name, value);
			if (self[methodName]) self[methodName](value);
		}
	});

	this.__setOption = function(self, name, value) {
		var pname = '_' + name;
		self[pname] = value;
		self._set(name, value);
	};

	this.__addEventTo = function(self, name, node) {
		var events = self._subEvents[name];
		if (!events) return;

		Object.keys(events).forEach(function(eventType) {
			events[eventType].forEach(function(eventFunc) {
				node.addEvent(eventType, function(event) {
					var comp = self._subs[name].nodeMap[String(node.uid)];
					eventFunc(self, event, comp);
				});
			});
		});
	};

	/**
	 * 向_subOptions生成一个option
	 * {'a.b.c': 1, b: 2} ==> {a: {b: {c:1}}, b: 2}
	 */
	this.__setSubOption = function(self, name, value) {
		var current = self._subOptions;
		var parts = Array.isArray(name)? name : name.split('.');
		// 生成前缀对象
		for (var i = 0, part; i < parts.length - 1; i++) {
			part = parts[i];
			if (current[part] === undefined) {
				current[part] = {PARSED: true};
			}
			current = current[part];
		}
		current[parts[parts.length - 1]] = value;
	};

	/**
	 * 初始化 subOptions
	 */
	this.__initSubOptions = function(self, options) {
		if (!options.PARSED) {
			self._subOptions = {PARSED: true};
			Object.keys(options).forEach(function(name) {
				self.__setSubOption(name, options[name]);
			});
		} else {
			self._subOptions = options;
		}
	};

	/**
	 * 渲染一组subcomponent
	 * @param name subcomponent名字
	 * @param data 模板数据/初始化参数
	 */
	this.render = function(self, name, data) {

		var sub = self._subs[name];
		var methodName = 'render' + string.capitalize(name);
		var method2Name = name + 'Render';
		var nodes;

		// 如果已经存在结构了，则不用再render了
		// 没有render方法，则返回
		if (!!(sub.single? self[name] : self[name].length) || (!self[methodName] && !self[method2Name])) {
			return;
		}

		if (self[method2Name]) {
			nodes = self[method2Name](function() {
				return self.make(name, data);
			});
		} else {
			nodes = self[methodName](data);
		}

		// 如果有返回结果，说明没有使用self.make，而是自己生成了需要的普通node元素，则对返回结果进行一次包装
		if (nodes) {
			if (sub.single) {
				if (Array.isArray(nodes)) throw '这是一个唯一引用元素，请不要返回一个数组';
				sub.rendered.push(nodes);
			} else {
				if (!Array.isArray(nodes)) throw '这是一个多引用元素，请返回一个数组';
				nodes = new dom.Elements(nodes);
				sub.rendered = sub.rendered.concat(nodes);
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
		var sub = self._subs[name];
		var pname = '_' + name;
		var options = {};
		var extendOptions = self._subOptions[name];
		extend(options, extendOptions);

		if (data) {
			Object.keys(data).forEach(function(key) {
				options[key] = data[key];
			});
		}
		var type = self.__getSubType(name, options);

		var comp = new type({
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
		sub.rendered.push(node);

		return comp;
	};

	/**
	 * 设置subcomponent的template
	 */
	this.setTemplate = function(self, name, template, section) {
		self._subs[name].template = template;
		self._subs[name].section = section;
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
		Object.keys(self._subs).forEach(function(name) {
			var sub = self._subs[name];
			var pname = '_' + name;
			sub.rendered.forEach(function(node) {
				var comp = sub.nodeMap[node.uid];
				delete sub.nodeMap[node.uid];
				node.dispose();
				if (sub.single) {
					self[name] = self[pname] = null;
				} else {
					self[name].splice(self[name].indexOf(comp), 1); // 去掉
					self[pname].splice(self[pname].indexOf(node), 1); // 去掉
				}
			});
			if (!sub.single) {
				self[name].forEach(function(comp) {
					comp.reset();
				});
			} else if (self[name]) {
				self[name].reset();
			}
		});
	});

	/**
	 * 获取包装的节点
	 */
	this.getNode = function(self) {
		return self._node;
	};

	this.regSub = classmethod(function(cls, name, descriptor) {
		cls._subs[name] = descriptor;
	});

	this.regOption = classmethod(function(cls, name, value) {
		cls._defaultOptions[name] = value;
	});

	this.regEvent = classmethod(function(cls, eventType, eventFunc) {
		cls._events.push({type: eventType, func: eventFunc});
	});

	this.regSubEvent = classmethod(function(cls, subName, eventType, eventFunc) {
		if (!cls._subEvents[subName]) cls._subEvents[subName] = {};
		if (!cls._subEvents[subName][eventType]) cls._subEvents[subName][eventType] = [];
		cls._subEvents[subName][eventType].push(eventFunc);
	});

	this.regAddonEvent = classmethod(function(cls, eventType, eventFunc) {
		cls._addonEvents[eventType] = eventFunc;
	});

	this.mixinComponent = classmethod(function(cls, comp) {
		if (comp && comp._defaultOptions) {
			Object.keys(comp._defaultOptions).forEach(function(name) {
				cls.regOption(name, comp._defaultOptions[name]);
			});
		}

		if (comp && comp._subs) {
			Object.keys(comp._subs).forEach(function(name) {
				cls.regSub(name, comp._subs[name]);
			});
		}

		if (comp && comp._events) {
			comp._events.forEach(function(desc) {
				cls.regEvent(desc.type, desc.func)
			});
		}

		if (comp && comp._subEvents) {
			Object.keys(comp._subEvents).forEach(function(subName) {
				Object.keys(comp._subEvents[subName]).forEach(function(eventType) {
					comp._subEvents[subName][eventType].forEach(function(eventFunc) {
						cls.regSubEvent(subName, eventType, eventFunc);
					});
				})
			});
		}
	});

	this.setAddon = classmethod(function(cls, addon) {
		cls.mixinComponent(addon);

		Object.keys(addon._addonEvents).forEach(function(eventType) {
			cls.regEvent(eventType, addon._addonEvents[eventType]);
		});

	});

	this.define = staticmethod(exports.define);
	this.define1 = staticmethod(exports.define1);

});

this.addon = function(members, Addon) {
	if (!members.addons) {
		members.addons = [];
		// 将用于保存component信息的几个变量置null，避免mixin时被赋予了没有意义的值
		// 因为在ComponentClass中会重新为cls初始化这几个成员，因此没有意义
		members._events = null;
		members._subEvents = null;
		members._subs = null;
		members._defaultOptions = null;
		members._addonEvents = null;
	}
	members.addons.push(Addon);
	Class.mixin(members, Addon);
};

});
