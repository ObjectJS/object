object.define('ui/index.js', 'sys, window, string, options, dom, events, urlparse, ./net, ./options, ./memberloader', function(require, exports) {

var string = require('string');
var dom = require('dom');
var events = require('events');
var net = require('./net');
var optionsmod = require('./options');

var globalid = 0;

/**
 * 获取node节点已经被type包装过的实例
 */
function getComponent(node, type) {
	var comp ;
	(node.components || []).some(function(component) {
		// 用instanceOf判断，而不要通过gid
		// 在多个use下gid有可能重复，可能会找到错误的对象
		if (Class.instanceOf(component, type)) {
			comp = component;
			return true;
		}
	});
	return comp;
}

/**
 * 用于存放每个Component的信息
 */
function RuntimeMeta() {
	// 所有元素引用
	this.components = [];
	// 所有选项
	this.options = [];
	// 所有onXxx形式注册事件方法
	this.onEvents = [];
	// 所有xxx_xxx形式注册事件方法
	this.subEvents = [];
	// 默认option
	this.defaultOptions = {};
}

function extend(src, target, ov) {
	for (var name in target) {
		if (src[name] === undefined || ov !== false) {
			src[name] = target[name];
		}
	}
	return src;
}

/**
 * 将value转换成需要的type
 */
function ensureTypedValue(value, type) {
	if (type === 'number') return Number(value);
	else if (type === 'string') return String(value);
	else if (type === 'boolean') return Boolean(value);
};

function ComponentMeta(selector, type, options, renderer) {
	this.selector = selector;
	this.type = type;
	this.renderer = renderer;
	this.defaultOptions = options;

	// selector为false的free组件拥有默认renderer，创建即返回
	if (!renderer && this.selector === false) {
		this.renderer = function(self, make) {
			return make();
		};
	}
}

/**
 * 获取组件类
 */
ComponentMeta.prototype.getType = function(metaOptions, callback) {

	if (!metaOptions) metaOptions = {};

	var meta = this;
	var type = metaOptions.type || this.type;
	var addons = metaOptions.addons || this.addons;
	var cls;

	var memberloader = require('./memberloader');

	// async
	if (typeof type == 'string') {
		memberloader.load(type, function(cls) {
			meta.getAddonedType(cls, addons, callback);
		});
	}
	// class
	else if (Class.instanceOf(type, Type)) {
		cls = type;
		this.getAddonedType(cls, addons, callback);
	}
	// sync
	else if (typeof type == 'function') {
		cls = type();
		this.getAddonedType(cls, addons, callback);
	}
};

/**
 * 获取被addon过的组件类
 * @param cls 基类
 * @param addons addons字符串
 * @param calblack
 */
ComponentMeta.prototype.getAddonedType = function(cls, addons, callback) {
	if (!addons) {
		callback(cls);
		return;
	}

	var memberloader = require('./memberloader');

	memberloader.load(addons, function() {
		// 存储最终的被扩展过的组件
		var addoned;

		// 获取到的组件类
		addons = Array.prototype.slice.call(arguments, 0);

		// 根据addons的gid顺序拼成一个字符串，作为保存生成的组件的key
		var key = [];
		addons.forEach(function(addon) {
			key.push(addon.get('gid'));
		});
		key.sort();
		key = key.join();

		// 之前已经生成过
		addoned = cls.get('addoned$' + key);

		// 没有生成过
		if (!addoned) {
			// 把生成的类保存在原始类上，用addons的gid的集合作为key
			addoned = new Class(cls, {__mixins__: addons});
			cls.set('addoned$' + key, addoned);
		}
		callback(addoned);
	});
};

/**
 * 将生成或查询到的node用type进行包装
 */
ComponentMeta.prototype.wrap = function(self, name, node, type) {
	var comp = getComponent(node, type);

	// 此node已经被type类型包装过
	if (comp) {
		this.register(self, name, comp);
	}
	// 一个未被type包装过的node
	else {
		comp = new type(node, self._options[name]);
		this.addEvent(self, name, comp);
		self.addEventTo(comp, 'aftercomponentdispose', function(event) {
			self.getMeta(name).select(self, name);
		})
	}

	return comp;
};

/**
 * 将查询到的comp用type进行包装
 */
ComponentMeta.prototype.register = function(self, name, comp) {
	this.addEvent(self, name, comp);
	// 重新搜索，更新其options
	Object.keys(self._options[name]).forEach(function(key) {
		comp.setOption(key, self._options[name][key]);
	});
};

/**
 * 将生成的comp设置到self上，并执行callback
 */
ComponentMeta.prototype.setComponent = function(self, name, comp, callback) {
	self.setComponent(name, comp);
	if (callback) {
		callback(comp);
	}
};

/**
 * 根据selector查询节点并进行包装，通过callback返回
 * @param self
 * @param name
 * @param made 如果selector为false，则需要指定节点是什么
 * @param callback
 */
ComponentMeta.prototype.select = function(self, name, made, callback) {

	var metaOptions = self.getOption(name + '.meta') || {};
	var selector = this.selector;
	var meta = this;
	var node;
	var isParent = this.parent;
	if (metaOptions.parent !== undefined) {
		isParent = metaOptions.parent;
	}

	// async
	if (self[name] === undefined && metaOptions.async) {
		meta.setComponent(self, name, null, callback);
		return;
	}

	if (isParent) {
		this.getType(metaOptions, function(type) {
			console.log(type.get('gid'));
			var node = self._node;
			var comp = null;
			while ((node = node.parentNode)) {
				if (comp = getComponent(node, type)) {
					break;
				}
			}

			if (comp) {
				meta.register(self, name, comp);
			}
			meta.setComponent(self, name, comp, callback);
		});

	} else {
		// 说明无所谓selector，生成什么就放什么就行
		// 在强指定selector为false时，忽略meta中配置的selector
		if (selector === false) {
			// 不应该是一组成员，却是数组
			if (Array.isArray(made)) {
				node = made[0];
			} else {
				node = made;
			}
		}
		// 重建引用，若render正常，刚刚创建的节点会被找到并包装
		else {
			selector = metaOptions.selector || selector;

			if (typeof selector == 'function') {
				node = dom.wrap(selector(self));
			} else {
				node = self._node.getElement(selector);
			}

		}

		if (node) {
			this.getType(metaOptions, function(type) {
				var comp = meta.wrap(self, name, node, type);
				meta.setComponent(self, name, comp, callback);
			});

		} else {
			meta.setComponent(self, name, null, callback);
		}
	}

};

/**
 * @param relativeModule 类所在的模块名，用来生成相对路径
 */
ComponentMeta.prototype.getTemplate = function(metaOptions, relativeModule, callback) {
	if (!metaOptions) {
		metaOptions = {};
	}

	var sys = require('sys');
	var urlparse = require('urlparse');
	var templatemodule = metaOptions.templatemodule;
	var template = metaOptions.template;

	var base;
	// 是相对路径 && 能找到此类的所在模块信息 && 在sys.modules中有这个模块
	if (templatemodule && (templatemodule.indexOf('./') === 0 || templatemodule.indexOf('../') === 0) && relativeModule && sys.modules[relativeModule]) {
		base = sys.getModule(relativeModule).id;
		templatemodule = urlparse.urljoin(base, templatemodule);
	}
	if (templatemodule) {
		require.async(templatemodule, function(module) {
			callback(module);
		});
	} else {
		callback(template);
	}

};

ComponentMeta.prototype.addEvent = function(self, name, comp) {

	// comp可能会注册来自多个引用了它的其他的comp的事件注册
	// 通过在__bounds中保存已经注册过的其他组件，避免重复注册
	if (self.__bounds.indexOf(comp) != -1) {
		return;
	} else {
		self.__bounds.push(comp);
	}

	// 此组件没有给这个sub定义事件
	if (!(comp && comp.addEvent && self.__subEventsMap[name])) {
		return;
	}

	self.__subEventsMap[name].forEach(function(eventMeta) {
		var methodName = eventMeta.methodName;
		self.addEventTo(comp, eventMeta.eventType, function(event) {
			event.targetComponent = comp;
			var args;
			// 将event._args pass 到函数后面
			if (event._args) {
				args = [event].concat(event._args);
				self[methodName].apply(self, args);
			} else {
				self[methodName](event);
			}
		});
	});

};

function ComponentsMeta(selector, type, options, renderer) {
	ComponentMeta.apply(this, arguments);
}

ComponentsMeta.prototype = new ComponentMeta();

ComponentsMeta.prototype.select = function(self, name, made, callback) {

	var selector = this.selector;
	var nodes = null, comps = null;
	var meta = this;
	var metaOptions = self.getOption(name + '.meta');

	// 说明无所谓selector，生成什么就放什么就行
	// 在强指定selector为false时，忽略options中配置的selector
	if (selector === false) {
		// 应该是一组成员，确是不是数组
		if (made && !Array.isArray(made)) {
			nodes = [made];
		} else {
			nodes = made;
		}
	}
	// 重建引用，若render正常，刚刚创建的节点会被找到并包装
	else {
		if (typeof selector == 'function') {
			nodes = selector(self);
			// 确保返回的是个dom.Elements
			if (nodes.constructor != dom.Elements) {
				if (!nodes.length) {
					nodes = [nodes];
				}
				nodes = new dom.Elements(nodes);
			}
		} else {
			nodes = self._node.getElements(selector);
		}
	}

	if (nodes) {
		// 返回的是数组，变成Elements
		// 避免重复包装
		// TODO 用addEvent避免重复包装的方法不优雅
		if (!nodes.addEvent) {
			nodes = new dom.Elements(nodes);
		}

		this.getType(metaOptions, function(type) {
			nodes.forEach(function(node) {
				meta.wrap(self, name, node, type);
			});
			comps = new type.Components(nodes);
			meta.setComponent(self, name, comps, callback);
		});

	} else {
		// 返回空Components而不是null
		comps = new exports.Component.Components();
		meta.setComponent(self, name, comps, callback);
	}

};

function OptionMeta(defaultValue, getter) {
	this.defaultValue = defaultValue;
	this.getter = getter;
}

OptionMeta.prototype.addEvent = function(self, name) {
	if (!self.__subEventsMap[name]) {
		return;
	}
	self.__subEventsMap[name].forEach(function(eventMeta) {
		var methodName = eventMeta.methodName;
		var fakeEventType = '__option_' + eventMeta.eventType + '_' + eventMeta.sub;
		self.addEventTo(self, fakeEventType, function(event) {
			self[methodName](event);
		});
	});
};

function SubEventMeta(sub, eventType, gid) {
	this.sub = sub;
	this.eventType = eventType;
	this.gid = gid;
	this.methodName = sub + '_' + eventType + '$' + gid;
}

SubEventMeta.prototype.init = function(self, name) {
	var sub = this.sub;
	// 记录下来，render时从__subEventsMap获取信息
	if (!(sub in self.__subEventsMap)) {
		self.__subEventsMap[sub] = [];
	}
	self.__subEventsMap[sub].push(this);
};

function OnEventMeta(eventType, gid) {
	this.eventType = eventType;
	this.gid = gid;
}

OnEventMeta.prototype.bindEvents = function(self, name) {
	var eventType = this.eventType;

	self.addEventTo(self, eventType, function(event) {
		var args = [event];
		//将event._args pass 到函数后面
		if (event._args) {
			args = args.concat(event._args);
		}
		self[name].apply(self, args);
	});
};

function RequestMeta(url, method) {
	this.defaultOptions = {
		url: url,
		method: method
	};
}

RequestMeta.prototype.addEvent = ComponentMeta.prototype.addEvent;

/**
 * 帮助定义一个生成组件间联系的方法
 */
function define(meta) {
	function fget(self) {
		var name = prop.__name__;
		// select只处理查询，不处理放置到self。
		// 这里不能直接meta.select，而是确保options中的meta信息存在，需要用getMeta
		var meta = self.getMeta(name);
		meta.select(self, name);
		return self[name];
	}
	var prop = property(fget);
	prop.meta = meta;
	return prop;
}

/**
 * 为一个Component定义一个components引用
 * 用法：
 * MyComponent = new Class(ui.Component, {
 *	refname: ui.define('.css-selector', ui.menu.Menu, {
 *		clickable: true
 *	}, renderer)
 * });
 * 这样MyComponent实例的refname属性即为相对应selector获取到的节点引用
 * @param {String|false} selector css选择器
 * @param {Component|String} [type=Component] 构造类的引用或模块成员字符串
 * @param {Object} [options] 默认配置
 * @param {Function} [renderer] 渲染器
 */
this.define = function(selector, type, options, renderer) {
	if (type && typeof type !== 'string' && !Class.instanceOf(type, Type)) {
		renderer = options;
		options = type;
		type = null;
	}
	if (options && typeof options != 'object') {
		renderer = options;
		options = null;
	}

	if (!type) type = exports.Component;
	return define(new ComponentsMeta(selector, type, options, renderer));
};

/**
 * 同define，不过是定义唯一引用的component
 * @param {String|false} selector css选择器
 * @param {Component|String} [type=Component] 构造类的引用或模块成员字符串
 * @param {Object} [options] 默认配置
 * @param {Function} [renderer] 渲染器
 */
this.define1 = function(selector, type, options, renderer) {
	if (type && typeof type !== 'string' && !Class.instanceOf(type, Type)) {
		renderer = options;
		options = type;
		type = null;
	}
	if (options && typeof options != 'object') {
		renderer = options;
		options = null;
	}

	if (!type) type = exports.Component;
	return define(new ComponentMeta(selector, type, options, renderer));
};

/**
 * 定义父元素的引用，将在Component构造时遍历父节点直到找到相同类型的Component
 * @param {Component} type
 */
this.parent = function(type, options) {
	if (!type) {
		throw new Error('arguments error.');
	}

	var meta = new ComponentMeta(null, type, options, null);
	meta.parent = true;

	return define(meta);
};

/**
 * 声明一个option
 * 用法：
 * MyComponent = new Class(ui.Component, {
 *	myConfig: ui.option(1)
 * });
 * 这样MyComponent实例的myConfig属性值即为默认值1，可通过 set 方法修改
 */
this.option = function(defaultValue, getter) {
	var meta = new OptionMeta(defaultValue, getter);
	function fget(self) {
		var name = prop.__name__;
		return self.getOption(name);
	}
	function fset(self, value) {
		var name = prop.__name__;
		return self.setOption(name, value);
	}
	var prop = property(fget, fset);
	prop.meta = meta;
	return prop;
};

/**
 * 声明一个request，可为其注册事件
 * @param url
 * @param [method='get']
 */
this.request = function(url, method) {
	var meta = new RequestMeta(url, method);
	var prop = property(function(self) {
		var name = prop.__name__;
		return self.getRequest(name);
	});
	prop.meta = meta;
	return prop;
};

/**
 * 定义一个向子元素注册事件的方法
 * @decorator
 * @param name 一个函数名字
 */
this.subevent = function(name, gid) {
	var match = name.match(/^(_?\w+)_(\w+)$/);
	if (!match) {
		// 名字不匹配，返回的decorator返回空
		return function(func) {
			return null;
		};
	}
	var sub = match[1];
	var eventType = match[2];
	return function(func) {
		func.meta = new SubEventMeta(sub, eventType, gid);
		return func;
	};
};

/**
 * 定义一个扩展向宿主元素定义事件的方法
 * @decorator
 */
this.onevent = function(name, gid) {
	var match = name.match(/^on(\w+)$/);
	if (!match) {
		// 名字不匹配，返回的decorator返回空
		return function(func) {
			return null;
		};
	}
	var eventType = match[1];
	eventType = eventType.slice(0, 1).toLowerCase() + eventType.slice(1);
	return function(func) {
		func.meta = new OnEventMeta(eventType, gid);
		return func;
	};
};

this.ComponentClass = new Class(Type, function() {

	this.__new__ = function(cls, name, base, dict) {

		var members = [];

		Object.keys(dict).forEach(function(name) {
			var member = dict[name];
			if (name.slice(0, 2) == '__') {
				return;
			}
			members.push({
				name: name,
				member: member
			});
			delete dict[name];
		});

		dict.__members = members;

		return Type.__new__(cls, name, base, dict);
	};

	this.initialize = function(cls, name, base, dict) {
		var gid = globalid++;
		var meta = new RuntimeMeta();
		var options = {};

		cls.set('gid', gid);
		cls.set('meta', meta);

		var members = cls.get('__members');

		members.forEach(function(item) {
			cls.set(item.name, item.member);
		});

		Type.__delattr__(cls, '__members');

		var mix = cls.get('mixMeta');
		// 合并base的meta
		if (base != Object) {
			mix(base);
		}
		// 合并mixin的meta
		;(cls.__mixins__ || []).forEach(function(mixin) {
			// mixin的有可能不是addon
			if (!mixin.get('gid')) {
				return;
			}
			mix(mixin);
		});

		// 生成Components
		cls.get('makeComponents')(name, base, dict);
	};

	this.__setattr__ = function(cls, name, member) {
		var gid = cls.get('gid');
		var meta = cls.get('meta');
		var newName, newMember;
		var memberMeta = member? member.meta : null;

		// 生成meta.defaultOptions
		// 从meta中获取defaultOptions属性并合并到此组件的meta.defaultOptions中
		// 组件并不支持实例产生后同步其类的修改，因此meta.defualtOptions只在类的初始化函数中合并一次即可。
		if (member && memberMeta && memberMeta.defaultOptions) {
			Object.keys(memberMeta.defaultOptions).forEach(function(key) {
				meta.defaultOptions[name + '.' + key] = memberMeta.defaultOptions[key];
			});
		}

		if (member == null) {
			Type.__setattr__(cls, name, member);

		}
		else if (member.__class__ == property && memberMeta instanceof OptionMeta) {
			if (meta.options.indexOf(name) == -1) {
				meta.options.push(name);
			}
			Type.__setattr__(cls, name, member);

		}
		else if (member.__class__ == property && memberMeta instanceof ComponentMeta) {
			if (meta.components.indexOf(name) == -1) {
				meta.components.push(name);
			}
			Type.__setattr__(cls, 'render_' + name, memberMeta.renderer);
			Type.__setattr__(cls, name, member);

		}
		else if (name.slice(0, 1) == '_' && name.slice(0, 2) != '__' && name != '_set') {
			newName = name.slice(1);
			Type.__setattr__(cls, newName, events.fireevent(function(self) {
				var method = cls.get(name);
				var args;
				if (method) {
					args = Array.prototype.slice.call(arguments, 1);
					args.unshift(self);
					return method.apply(self, args);
				}
			}));
			Type.__setattr__(cls, name, member);

		}
		else if ((newMember = (exports.subevent(name, gid)(member)))) {
			newName = name + '$' + gid;
			if (meta.subEvents.indexOf(newName) == -1) {
				meta.subEvents.push(newName);
			}
			Type.__setattr__(cls, newName, newMember);

		}
		else if ((newMember = (exports.onevent(name, gid)(member)))) {
			newName = name + '$' + gid;
			if (meta.onEvents.indexOf(newName) == -1) {
				meta.onEvents.push(newName);
			}
			Type.__setattr__(cls, newName, newMember);

		}
		else {
			Type.__setattr__(cls, name, member);

		}
	};

	/**
	 * 将other中的meta信息合并到cls
	 */
	this.mixMeta = function(cls, other) {
		var meta = cls.get('meta');
		var oMeta = other.get('meta');
		// 合并defaultOptions
		extend(meta.defaultOptions, oMeta.defaultOptions, false);
		// 合并components
		oMeta.components.forEach(function(name) {
			if (meta.components.indexOf(name) == -1) meta.components.push(name);
		});
		// 合并options
		oMeta.options.forEach(function(name) {
			if (meta.options.indexOf(name) == -1) meta.options.push(name);
		});
		// 合并onevent
		oMeta.onEvents.forEach(function(name) {
			if (meta.onEvents.indexOf(name) == -1) meta.onEvents.push(name);
		});
		// 合并subevent
		oMeta.subEvents.forEach(function(name) {
			if (meta.subEvents.indexOf(name) == -1) meta.subEvents.push(name);
		});
	};

	/**
	 * 生成Components
	 */
	this.makeComponents = function(cls, name, base, dict) {
		// Component则是Array，其他则是父类上的Components
		var compsBase = base.Components || Array;

		cls.set('Components', new exports.ComponentsClass(compsBase, function() {

			this.initialize = function(self, nodes, options) {
				// an empty Components
				if (!nodes) {
					return;
				}
				self._node = nodes;
				self._node.forEach(function(node) {
					var comp = getComponent(node, cls) || new cls(node, options);
					self.push(comp);
				});
			};

			Object.keys(dict).forEach(function(name) {
				var member = dict[name];
				if (name == '__metaclass__') {
					return;
				}
				this[name] = member;
			}, this);
		}));

	};

});

this.ComponentsClass = new Class(Type, function() {

	this.initialize = function(cls, name, base, dict) {

		var members = cls.get('__members');

		members.forEach(function(item) {
			// 暂时忽略setOption
			if (item.name == 'initialize' || item.name == 'setOption') return;
			cls.set(item.name, item.member);
		});

		Type.__delattr__(cls, '__members');
	};

	this.__setattr__ = function(cls, name, member) {
		var newName = name.slice(1);
		// only method
		if (typeof member != 'function' || Class.instanceOf(member, Type)) {
			return;
		}
		else if (name.slice(0, 1) == '_' && name.slice(0, 2) != '__' && name != '_set') {
			// 重新包装，避免名字不同导致warning
			Type.__setattr__(cls, newName, function(self) {
				var results = [];
				var args = Array.prototype.slice.call(arguments, 1);
				// 有可能是个空的Components
				if (self._node) {
					self._node.forEach(function(node, i) {
						// 将每个的执行结果返回组成数组
						var result = self[i][newName].apply(self[i], args);
						results.push(result);
					});
				}
				return results;
			});
			// _xxx
			Type.__setattr__(cls, name, member);
		}
		else {
			// 重新包装，避免名字不同导致warning
			Type.__setattr__(cls, name, function(self) {
				return member.apply(self, arguments);
			});
		}
	};

});

/**
 * UI模块基类，所有UI组件的基本类
 */
this.Component = new exports.ComponentClass(function() {

	this.debugMode = exports.option(false);

	this.__setattr__ = function(self, name, value) {
		// 并非定义的property，直接同步到node上
		if (!Class.hasProperty(self, name)) {
			self._node.set(name, value);
		}
		Object.__setattr__(self, name, value);
	};

	/**
	 * @param {HTMLElement} node 包装的节点
	 * @param {Object} options 配置
	 */
	this.initialize = function(self, node, options) {
		// 可能是mixin addon
		if (!node) {
			return;
		}

		// 存储make的新元素
		self.__rendered = []; // 后来被加入的，而不是首次通过selector选择的node的引用
		// 存储所有注册的事件
		self.__events = [];
		// 记录本comp上的subevents已经被注册到了哪些sub comp上
		self.__bounds = [];

		self._node = dom.wrap(node);

		if (!self._node.components) {
			self._node.components = [];
		}
		self._node.components.push(self);

		// 做同继承链的检测
		var lastType = self._node.componentType;
		if (!lastType) {
			self._node.componentType = self.__class__;
		} else if (Class.getChain(lastType).indexOf(self.__class__) != -1) {
		} else if (Class.getChain(self.__class__).indexOf(lastType) != -1) {
			self._node.componentType = self.__class__;
		} else {
			console.warn('node has already wrapped, auto changed to virtual mode.');
			// 在virtual模式下，所有涉及到self._node触发事件的特性都不会有
			// 包括：
			// option（会触发change事件）
			// handle（会触发同名事件），但handle在此阶段已经无法控制了，只能要求开发者限制其使用
			// onEvent（会为自己绑定事件）
			self.__virtual = dom.wrap(document.createElement('div'));
		}

		// 限定wrapper
		if (self.allowTags && !self.allowTags.some(function(tag) {
			// get('tagName') 返回的永远大写
			return tag.toUpperCase() == self._node.get('tagName');
		})) {
			console.error('just allow ' + self.allowTags + ' tags.');
			return;
		}

		options = options || {};
		extend(options, self.meta.defaultOptions, false);
		// 保存options，生成component时用于传递
		self._options = optionsmod.parse(options);

		// 记录已经获取完毕的components
		var inited = 0;
		function checkInit() {
			if (inited == self.meta.components.length) {
				inited = -1; // reset
				self.init();
			}
		}

		// 存储subEvents，用于render时获取信息
		self.__subEventsMap = {};
		// 初始化subEventsMap
		self.meta.subEvents.forEach(function(name) {
			self.getMeta(name).init(self, name);
		});

		// 初始化components
		self.meta.components.forEach(function(name) {
			self.getMeta(name).select(self, name, null, function(comp) {
				inited++;
				checkInit();
			});
		});

		if (!self.__virtual) {
			// 初始化options
			self.meta.options.forEach(function(name) {
				self.getMeta(name).addEvent(self, name);
				self.getOption(name);
			});

			// 初始化onEvents
			self.meta.onEvents.forEach(function(name) {
				self.getMeta(name).bindEvents(self, name);
			});
		}

		// 初始化addons
		var mixins = self.__class__.get('__mixins__');
		if (mixins) {
			mixins.forEach(function(mixin) {
				if (!mixin.get('gid')) {
					// 不是addon
					return;
				}
				mixin.get('init')(self);
			}); 
		}

		checkInit();
	};

	/**
	 * 统一的注册事件入口，当一个组件需要给自己或其子成员注册事件时使用
	 * 统一入口可统一记录所有事件注册，在destroy时统一清除
	 */
	this.addEventTo = function(self, comp, type, func, cap) {
		comp.addEvent(type, func, cap);
		self.__events.push([comp, type, func, cap]);
	};

	this.fireEvent = function(self) {
		return (self.__virtual || self._node).fireEvent.apply(self._node, Array.prototype.slice.call(arguments, 1));
	};

	this.addEvent = function(self, eventType, func) {
		return (self.__virtual || self._node).addEvent.apply(self._node, Array.prototype.slice.call(arguments, 1));
	};

	this.removeEvent = function(self) {
		return (self.__virtual || self._node).removeEvent.apply(self._node, Array.prototype.slice.call(arguments, 1));
	};

	this.show = function(self) {
		return self._node.show();
	};

	this.hide = function(self) {
		return self._node.hide();
	};

	/**
	 * 根据模板和选项生成一个节点
	 */
	this.createNode = function(self, template, data) {
		if (!template) {
			console.error('no template specified for ' + name + '.');
			return null;
		}
		var extendData = {};
		self.meta.options.forEach(function(name) {
			extendData[name] = self.get(name);
		});
		extend(data, extendData);
		var result = string.substitute(template, data);
		var node = dom.Element.fromString(result);

		return node;
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
	 * 重置组件
	 * 所有渲染出来的节点会被删除
	 * 所有注册的事件会被移除
	 */
	this._destroy = function(self) {
		// 删除所有render的元素
		self.__rendered.forEach(function(node) {
			node.dispose();
		});
		self.__rendered = [];

		// 清除所有注册的事件
		self.__events.forEach(function(item) {
			item[0].removeEvent(item[1], item[2], item[3]);
		});

		// 将node上保存的自己的引用删掉
		// 恢复self包装过node的所有痕迹
		for (var i = 0; i < self._node.components.length; i++) {
			if (self._node.components[i] === self) {
				self._node.components.splice(i, 1);
			}
		}
	};

	/**
	 * 清空自身节点
	 */
	this._dispose = function(self) {
		// virtual mode 无法触发事件，因此不执行dispose操作
		if (!self.__virtual) {
			self._node.dispose();
			self.fireEvent('aftercomponentdispose');
		}
	};

	/**
	 * 获取一个通过ui.request定义的net.Request的实例
	 */
	this.getRequest = function(self, name) {
		var pname = '_' + name;
		var options, request;
		if (!self[pname]) {
			options = self.getOption(name) || {};
			request = new net.Request(options);
			self.getMeta(name).addEvent(self, name, request);
			self[pname] = request;
		}
		self._set(name, self[pname]);
		return self[pname];
	};

	/**
	 * 设置获取到的component
	 */
	this.setComponent = function(self, name, comp) {
		var node = comp? comp._node : null;
		self._set(name, comp);
		self._set('_' + name, node);
	};

	/**
	 * 获取option的值
	 * 支持复杂name的查询
	 * comp.getOption('xxx') 获取comp的xxx
	 * comp.getOption('sub.xxx') 获取当前comp为sub准备的xxx。若要获取运行时的option，请使用comp.sub.getOption('xxx');
	 * @param {string} name name
	 */
	this.getOption = function(self, name) {
		var value = optionsmod.getOptionFrom(self._options, name, function(value) {
			// 获取自己身上的option
			// 三个获取级别，优先级：结构>用户设置>默认
			var meta = self.getMeta(name);

			// meta不存在表示在获取一个没有注册的option
			if (!meta) {
				return value;
			}

			// 默认getter是从结构中通过data-前缀获取
			var getter = meta.getter || function(self) {
				if (!self._node) return undefined;
				var value = self._node.getData(name.toLowerCase());
				if (value != undefined) {
					return ensureTypedValue(value, typeof meta.defaultValue);
				}
			};

			var getterValue = getter(self, name);
			// 优先从结构中获取
			if (getterValue != undefined) {
				value = getterValue;
			}
			// 其次用户设置中获取
			else if (self._options[name]) {
				value = self._options[name];
			}
			// 最后是defaultValue
			else {
				value = meta.defaultValue;
			}
			// 确保获取到的value得到更新
			self._set(name, value);

			return value;
		});

		return value;
	};

	/**
	 * 设置option的值
	 * 支持复杂name的设置
	 * comp.setOption('xxx', value) 设置comp的xxx
	 * comp.setOption('sub.xxx', value) 若comp.sub已存在，则赋值到comp.sub，若未存在，则comp.sub在建立时会被赋值
	 * @param name name
	 * @param value value
	 */
	this.setOption = optionsmod.overloadsetter(function(self, name, value) {

		var oldValue = self.getOption(name);

		optionsmod.setOptionTo(self._options, name, value, function() {
			// 若不是在设置定义的option，则调用self.set
			if (self.meta.options.indexOf(name) == -1) {
				self.set(name, value);
			}
			// 否则触发change
			else {
				(events.fireevent('__option_change_' + name, ['oldValue', 'value'])(function(self) {
					// 重新更新对象上的直接引用值
					self.getOption(name);
				}))(self, oldValue, value);
			}
		}, function(prefix, surfix) {
			var sub = self[prefix];
			// 子引用已经存在
			if (sub && sub.setOption) {
				sub.setOption(surfix, value);
			}
		});

	});

	/**
	 * 获取成员的meta信息
	 */
	this.getMeta = function(self, name) {
		var meta;

		if (self.__properties__[name]) {
			meta = self.__properties__[name].meta;
		}
		else if (typeof self[name] == 'function') {
			meta = self[name].im_func.meta;
		}
		else if (self[name]) {
			meta = self[name].meta;
		}
		else {
			meta = null;
		}

		return meta;
	};

	/**
	 * 渲染一组component，渲染后执行callback
	 * @param {String} name 子component名字
	 * @param {Object} data 模板数据/初始化参数
	 * @param {Function} callback render结束后的回调
	 */
	this.render = function(self, name, data, callback) {
		// data可选
		if (!callback && typeof data == 'function') {
			callback = data;
			data = null;
		}

		var metaOptions = self.getOption(name + '.meta');
		var meta = self.getMeta(name);

		meta.getType(metaOptions, function(type) {

			// 如果已经存在结构了，则不用再render了
			// 需要确保这个get是同步的，因此在getType后执行
			var comp = self.get(name);
			if (comp && (!('length' in comp) || comp.length != 0)) {
				if (callback) {
					callback();
				}
				return;
			}

			var methodName = 'render_' + name;
			var renderer = self[methodName];
			if (!renderer) {
				console.error('no renderer specified for ' + name + '.');
				return;
			}

			// data
			data = data || {};
			var options = self._options[name];
			extend(data, options, false);

			meta.getTemplate(metaOptions, self.__class__.__module__, function(template) {
				var made = [];
				// make方法仅仅返回node，这样在new comp时node已经在正确的位置，parent可以被正确的查找到
				function make(newData) {
					var node = self.createNode(template, newData || data);
					made.push(node);
					self.__rendered.push(node);
					return node;
				};

				// for debug
				make.template = template;
				make.data = data;

				// made用在free component的定义
				var returnMade = renderer.call(self, make, data);
				if (returnMade) {
					made = returnMade;
				}

				meta.select(self, name, made);

				if (callback) {
					callback();
				}

			});
		});
	};

	/**
	 * 获取包装的节点
	 */
	this.getNode = function(self) {
		return self._node;
	};

});

this.AddonClassClass = new Class(Type, function() {

	this.__new__ = function(cls, name, base, dict) {

		var members = (base.get('__members') || []).slice();
		var variables = (base.get('__variables') || []).slice();

		Object.keys(dict).forEach(function(name) {
			if (name.indexOf('__') == 0 || name == 'initialize') {
				return;
			}
			else if (name.indexOf('$') == 0) {
				variables.push(name);
			}
			else {
				members.push(name);
			}
		});
		// 如果不带下划线，就有可能覆盖掉自定义的方法，也就意味着开发者不能定义这些名字的成员
		dict.__variables = variables;
		dict.__members = members;

		return Type.__new__(cls, name, base, dict);
	};
});

// 继承于 ComponentClass
this.AddonClass = new exports.AddonClassClass(exports.ComponentClass, function() {

	this.__new__ = function(cls, name, base, dict) {
		// base是Component
		if (base !== exports.Component) {
			base = exports.Component;
		}
		return exports.ComponentClass.get('__new__')(cls, name, base, dict);
	};

	this.initialize = function(cls, name, base, dict) {
		exports.ComponentClass.get('initialize')(cls, name, base, dict);

		var members = cls.get('__members');
		var variables = cls.get('__variables');

		var vars = {};
		variables.forEach(function(name) {
			vars[name.slice(1)] = cls.get(name);
		});
		// 变量递归，支持变量中引用变量
		variables.forEach(function(name) {
			var member = cls.get(name);
			if (typeof member == 'string') {
				vars[name.slice(1)] = string.substitute(member, vars);
			}
		});

		members.forEach(function(nameTpl) {
			var name = string.substitute(nameTpl, vars);
			var member = cls.get(nameTpl, false);
			if (typeof member == 'function') {
				member = member.bind(cls)();
			}
			cls.set(name, member);
		});
		cls.set('__vars', vars);
	};
});

/**
 * 一组Component的在页面上的集合，用于初始化页面
 */
this.Page = new Class(exports.Component, function() {

	/**
	 * @param {HTMLElement} [node=document.body] 页面的起始查询节点
	 * @param {Object} options 配置页面组件的选项
	 */
	this.initialize = function(self, node, options) {

		var window = require('window');

		// node 参数可选
		if (node.ownerDocument !== window.document) {
			options = node;
			node = window.document.body;
		}

		if (!options) {
			options = {};
		}

		// 会自动进入virtual mode
		this.parent(self, node, options);
	};

});

});
