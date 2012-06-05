object.define('ui/index.js', 'sys, window, string, dom, events, urlparse, ./aop, ./net, ./options, ./memberloader', function(require, exports) {

var string = require('string');
var dom = require('dom');
var events = require('events');
var aop = require('./aop');
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
	// Addons
	this.addons = [];
	// 所有元素引用
	this.components = [];
	// 所有选项
	this.options = [];
	// 所有onXxx形式注册事件方法
	this.onEvents = [];
	// 所有xxx_xxx形式注册事件方法
	this.subEvents = [];
	// 所有xxx_xxx_before形式注册的aop方法
	this.aopMethods = [];
	// 默认option
	this.defaultOptions = {};
}

RuntimeMeta.prototype.addAddon = function(addon) {
	if (this.addons.indexOf(addon) == -1) {
		this.addons.push(addon);
		return true;
	}
	return false;
};

RuntimeMeta.prototype.addComponent = function(component) {
	if (this.components.indexOf(component) == -1) {
		this.components.push(component);
		return true;
	}
	return false;
};

RuntimeMeta.prototype.addOption = function(option) {
	if (this.options.indexOf(option) == -1) {
		this.options.push(option);
		return true;
	}
	return false;
};

RuntimeMeta.prototype.addOnEvent = function(onEvent) {
	if (this.onEvents.indexOf(onEvent) == -1) {
		this.onEvents.push(onEvent);
		return true;
	}
	return false;
};

RuntimeMeta.prototype.addSubEvent = function(subEvent) {
	if (this.subEvents.indexOf(subEvent) == -1) {
		this.subEvents.push(subEvent);
		return true;
	}
	return false;
};

RuntimeMeta.prototype.addAOPMethod = function(aopMethod) {
	if (this.aopMethods.indexOf(aopMethod) == -1) {
		this.aopMethods.push(aopMethod);
		return true;
	}
	return false;
};

function extend(src, target, ov) {
	for (var name in target) {
		if (src[name] === undefined || ov !== false) {
			src[name] = target[name];
		}
	}
	return src;
}

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
	var addons = metaOptions.addons;
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
		this.bindEvents(self, name, comp);
		self.addEventTo(comp, 'destroy', function(event) {
			var rebuild = event._args[0];
			self.destroyComponent(comp);
			if (rebuild) {
				// 重新获取其引用
				self.getMeta(name).select(self, name);
			}
		});
	}

	return comp;
};

/**
 * 将查询到的comp用type进行包装
 */
ComponentMeta.prototype.register = function(self, name, comp) {
	this.bindEvents(self, name, comp);
	// 重新搜索，更新其options
	comp.setOption(self._options[name]);
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
			var node = self._node;
			var comp = null;
			while ((node = node.parentNode)) {
				if ((comp = getComponent(node, type))) {
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

ComponentMeta.prototype.bindEvents = function(self, name, comp) {

	if (!comp) {
		return;
	}

	// comp可能会注册来自多个引用了它的其他的comp的事件注册
	// 通过在__bounds中保存已经注册过的其他组件，避免重复注册
	if (self.__bounds.indexOf(comp) != -1) {
		return;
	} else {
		self.__bounds.push(comp);
	}

	;(self.__aopMethodsMap[name] || []).forEach(function(aopMeta) {
		var methodName = aopMeta.methodName;
		var originName = aopMeta.originName;
		var aopType = aopMeta.aopType;
		if (comp[originName]) {
			self.addAspectTo(comp, originName, aopType, methodName);
		}
	});

	;(self.__subEventsMap[name] || []).forEach(function(eventMeta) {
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

/**
 * 将value转换成需要的type
 */
OptionMeta.prototype.ensureTypedValue = function(value) {
	var type = typeof this.defaultValue;

	if (type === 'number') return Number(value);
	else if (type === 'string') return String(value);
	else if (type === 'boolean') return Boolean(value);
};

OptionMeta.prototype.bindEvents = function(self, name) {
	if (!self.__subEventsMap[name]) {
		return;
	}
	self.__subEventsMap[name].forEach(function(eventMeta) {
		var methodName = eventMeta.methodName;
		var fakeEventType = '__option_' + eventMeta.eventType + '_' + eventMeta.sub;
		self.addEventTo(self, fakeEventType, self.get(methodName));
	});
};

function OnEventMeta(eventType) {
	this.eventType = eventType;
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

function SubEventMeta(sub, eventType, methodName) {
	this.sub = sub;
	this.eventType = eventType;
	this.methodName = methodName;
}

SubEventMeta.prototype.init = function(self, name) {
	var sub = this.sub;
	// 记录下来，render时从__subEventsMap获取信息
	if (!(sub in self.__subEventsMap)) {
		self.__subEventsMap[sub] = [];
	}
	self.__subEventsMap[sub].push(this);
};

function AOPMethodMeta(sub, originName, aopType, methodName) {
	this.sub = sub;
	this.originName = originName;
	this.aopType = aopType;
	this.methodName = methodName;
}

AOPMethodMeta.prototype.init = function(self, name) {
	var sub = this.sub;
	// 记录下来，render时从__aopMethodsMap获取信息
	if (!(sub in self.__aopMethodsMap)) {
		self.__aopMethodsMap[sub] = [];
	}
	self.__aopMethodsMap[sub].push(this);
};

function RequestMeta(url, method) {
	this.defaultOptions = {
		url: url,
		method: method
	};
}

RequestMeta.prototype.bindEvents = ComponentMeta.prototype.bindEvents;

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
	var meta = new RequestMeta(url, method || 'get');
	var prop = property(function(self) {
		var name = prop.__name__;
		return self.getRequest(name);
	});
	prop.meta = meta;
	return prop;
};

var emptyDecorator = function(func) {
	return null;
};

/**
 * 定义一个向子元素注册事件的方法
 * @decorator
 * @param name 一个函数名字
 */
this.subevent = function(name) {
	// 名子要匹配带有$后缀
	var match = name.match(/^([a-zA-Z1-9]+)_([a-zA-Z1-9]+)([\$0-9]*)$/);
	if (!match) {
		// 名字不匹配，返回的decorator返回空
		return emptyDecorator;
	}
	var sub = match[1];
	var eventType = match[2];
	// 后面带的无用的东西，只是用来区分addon的
	var surfix = match[3];
	return function(func) {
		func.meta = new SubEventMeta(sub, eventType, name);
		return func;
	};
};

this.aopmethod = function(name) {
	// 名子要匹配带有$后缀
	var match = name.match(/^([a-zA-Z1-9]+)_([a-zA-Z1-9]+)_([a-zA-Z1-9]+)([\$0-9]*)$/);
	if (!match) {
		// 名字不匹配，返回的decorator返回空
		return emptyDecorator;
	}
	var sub = match[1];
	var methodName = match[2];
	var aopType = match[3];
	// 后面带的无用的东西，只是用来区分addon的
	var surfix = match[4];
	return function(func) {
		func.meta = new AOPMethodMeta(sub, methodName, aopType, name);
		return func;
	};
};

/**
 * 定义一个扩展向宿主元素定义事件的方法
 * @decorator
 */
this.onevent = function(name) {
	// 名子要匹配带有$后缀
	var match = name.match(/^on([a-zA-Z1-9]+)([\$0-9]*)$/);
	if (!match) {
		// 名字不匹配，返回的decorator返回空
		return emptyDecorator;
	}
	var eventType = match[1];
	// 后面带的无用的东西，只是用来区分addon的
	var surfix = match[2];
	eventType = eventType.slice(0, 1).toLowerCase() + eventType.slice(1);
	return function(func) {
		func.meta = new OnEventMeta(eventType);
		return func;
	};
};

this.OptionsClass = new Class(optionsmod.OptionsClass, function() {

	this.customGetter = function(cls, self, name) {
		var meta = self.getMeta(name);
		if (!meta) {
			return undefined;
		}

		// 默认getter是从结构中通过data-前缀获取
		var getter = meta.getter || function(self) {
			if (!self._node) {
				return undefined;
			}
			var value = self._node.getData(name.toLowerCase());
			if (value != undefined) {
				return meta.ensureTypedValue(value);
			}
		};

		var getterValue = getter(self, name);
		return getterValue;
	};

	/**
	 * @param name 要获取的option的name
	 * @param seted 保存在_options上的value
	 */
	this.getter1 = function(cls, self, name, seted) {
		// 获取自己身上的option
		// 三个获取级别，优先级：结构(getter)>用户设置(setter)>默认(default)
		var meta = self.getMeta(name);
		var from, value;

		// meta不存在表示在获取一个没有注册的option
		if (!meta) {
			from = null;
			value = seted;
		}
		// 优先从结构中获取
		else if ((getterValue = cls.get('customGetter')(self, name)) !== undefined) {
			from = 'getter';
			value = getterValue;
		}
		// 其次是用户设置值
		else if (seted !== undefined) {
			from = 'setter';
			value = seted;
		}
		// 最后是defaultValue
		else {
			from = 'default';
			value = meta.defaultValue;
		}

		// 确保获取到的value得到更新
		self._set(name, value);

		return [from, value];
	};

	this.setter1 = function(cls, self, name, value, seted) {
		var valueInfo = cls.get('getter1')(self, name, seted);
		var from = valueInfo[0];
		var oldValue = valueInfo[1];

		// 未定义的option
		if (from == null) {
			return false;
		}
		// 从node获取，阻止普通option的修改
		else if (from == 'getter') {
			return true;
		}

		// 重复设置相同的value，阻止fireEvent，同时阻止设置到_options
		if (oldValue === value) {
			return true;
		}

		// 假设会prevent，阻止更新
		// 若没有prevent，fireevent的default会置prevented为false
		var prevented = true;
		(events.fireevent('__option_change_' + name, ['oldValue', 'value'])(function(self) {
			prevented = false;
			// 重新更新对象上的直接引用值
			self._set(name, value);
		}))(self, oldValue, value);
		return prevented;
	};

	this.setter = function(cls, self, prefix, surfix, value) {
		var sub = self[prefix];
		// 子引用已经存在
		if (sub && sub.setOption) {
			sub.setOption(surfix, value);
		}
		else if (prefix == '_node' || prefix == 'node') {
			self._node.set(surfix, value);
		}
	};

});

/**
 * Component的metaclass
 */
this.ComponentClass = new Class(Type, function() {

	this.initialize = function(cls, name, base, dict) {
		var gid = globalid++;
		var meta = new RuntimeMeta();
		var memberSetter = cls.get('setMember');

		cls.set('gid', gid);
		cls.set('meta', meta);

		// 处理定义的成员
		Object.keys(dict).forEach(function(name) {
			var member = dict[name];
			var memberMeta = member? member.meta : null;
			if (name.slice(0, 2) == '__') {
				return;
			}

			// 生成meta.defaultOptions
			// 从meta中获取defaultOptions属性并合并到此组件的meta.defaultOptions中
			// 组件并不支持实例产生后同步其类的修改，因此meta.defualtOptions只在类的初始化函数中合并一次即可
			// 不需要在__setattr__中调用
			if (memberMeta && memberMeta.defaultOptions) {
				Object.keys(memberMeta.defaultOptions).forEach(function(key) {
					meta.defaultOptions[name + '.' + key] = memberMeta.defaultOptions[key];
				});
			}

			memberSetter(name, member);
		});

		// 合并base的meta
		if (base != Object) {
			cls.get('mixBase')(base);
		}

		// 合并mixin的meta
		var mixer = cls.get('mixAddon');
		;(cls.__mixins__ || []).forEach(function(mixin) {
			// mixin的有可能不是addon
			if (!mixin.get('gid')) {
				return;
			}
			// 自己的addon
			if (meta.addAddon(mixin)) {
				// mixer 中 mix addon 的 addon
				mixer(mixin);
			}
		});

		// 生成Components
		cls.get('makeComponents')(name, base, dict);
	};

	this.__setattr__ = function(cls, name, member) {
		Type.__setattr__(cls, name, member);
		cls.get('setMember')(name, member);
	};

	/**
	 * 处理每一个component的成员
	 */
	this.setMember = function(cls, name, member) {
		var meta = cls.get('meta');

		if (!member) {
			return;

		}
		else if (member.__class__ == property && member.meta instanceof OptionMeta) {
			meta.addOption(name);

		}
		else if (member.__class__ == property && member.meta instanceof ComponentMeta) {
			meta.addComponent(name);
			Type.__setattr__(cls, '__render_' + name, member.meta.renderer);

		}
		else if (name.slice(0, 1) == '_' && name.slice(0, 2) != '__' && name != '_set') {
			Type.__setattr__(cls, name.slice(1), events.fireevent(member));

		}
		else if (exports.aopmethod(name)(member)) {
			meta.addAOPMethod(name);

		}
		else if (exports.subevent(name)(member)) {
			meta.addSubEvent(name);

		}
		else if (exports.onevent(name)(member)) {
			meta.addOnEvent(name);

		}
	};

	/**
	 * 将base中的meta信息合并到cls
	 */
	this.mixBase = function(cls, base) {
		var meta = cls.get('meta');
		var oMeta = base.get('meta');

		// 合并defaultOptions
		extend(meta.defaultOptions, oMeta.defaultOptions, false);

		// 合并addon
		oMeta.addons.forEach(meta.addAddon, meta);

		// 合并components
		oMeta.components.forEach(meta.addComponent, meta);

		// 合并options
		oMeta.options.forEach(meta.addOption, meta);

		// 合并onevent
		oMeta.onEvents.forEach(meta.addOnEvent, meta);

		// 合并subevent
		oMeta.subEvents.forEach(meta.addSubEvent, meta);

		// 合并aopmethod
		oMeta.aopMethods.forEach(meta.addAOPMethod, meta);
	};

	this.mixAddon = function(cls, addon) {
		var meta = cls.get('meta');
		var oMeta = addon.get('meta');
		var surfix = '$' + addon.get('gid');

		// 合并addon的defaultOptions
		extend(meta.defaultOptions, oMeta.defaultOptions, false);

		// 合并addon的addon
		oMeta.addons.forEach(meta.addAddon, meta);

		// 合并addon的components
		oMeta.components.forEach(meta.addComponent, meta);

		// 合并addon的options
		oMeta.options.forEach(meta.addOption, meta);

		// 合并addon的onevent
		oMeta.onEvents.forEach(function(name) {
			var newName = name + surfix;
			var func;
			if (meta.addOnEvent(newName)) {
				func = addon.get(name, false).im_func;
				// 重新包装，避免名字不同导致warning
				Type.__setattr__(cls, newName, exports.onevent(newName)(function() {
					return func.apply(this, arguments);
				}));
			}
		});

		// 合并addon的subevent
		oMeta.subEvents.forEach(function(name) {
			var newName = name + surfix;
			var func;
			if (meta.addSubEvent(newName)) {
				func = addon.get(name, false).im_func;
				// 重新包装，避免名字不同导致warning
				Type.__setattr__(cls, newName, exports.subevent(newName)(function() {
					return func.apply(this, arguments);
				}));
			}
		});

		// 合并addon的aopmethod
		oMeta.aopMethods.forEach(function(name) {
			var newName = name + surfix;
			var func;
			if (meta.addAOPMethod(newName)) {
				func = addon.get(name, false).im_func;
				// 重新包装，避免名字不同导致warning
				Type.__setattr__(cls, newName, exports.aopmethod(newName)(function() {
					return func.apply(this, arguments);
				}));
			}
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
				if (name == '__metaclass__' || name == 'initialize') {
					return;
				}
				// only method, filter field and class
				if (typeof member != 'function' || Class.instanceOf(member, Type)) {
					return;
				}

				this[name] = member;
			}, this);
		}));

	};

});

this.ComponentsClass = new Class(Type, function() {

	this.initialize = function(cls, name, base, dict) {

		Object.keys(dict).forEach(function(name) {
			var member = dict[name];
			// 暂时忽略setOption
			if (name == 'initialize' || name == 'setOption') return;
			cls.set(name, member);
		});
	};

	this.__setattr__ = function(cls, name, member) {
		cls.get('setMember')(name, member);
	};

	/*
	 * 制造包装后的方法，遍历调用所有子节点的同名方法
	 */
	this.makeMethod = function(cls, name) {
		// 重新包装，避免名字不同导致warning
		Type.__setattr__(cls, name, function(self) {
			var results = [];
			var args = Array.prototype.slice.call(arguments, 1);
			// 有可能是个空的Components
			if (self._node) {
				self._node.forEach(function(node, i) {
					// 将每个的执行结果返回组成数组
					var result = self[i][name].apply(self[i], args);
					results.push(result);
				});
			}
			return results;
		});
	};

	this.setMember = function(cls, name, member) {
		var newName;
		var makeMethod = cls.get('makeMethod');

		if (name == 'getNode') {
			Type.__setattr__(cls, name, member);
		}
		else if (name.slice(0, 1) == '_' && name.slice(0, 2) != '__' && name != '_set') {
			// xxx
			makeMethod(name.slice(1));
			// _xxx
			makeMethod(name);
		}
		else {
			makeMethod(name);
		}
	};

});

this.Options = new exports.OptionsClass(function() {
});

/**
 * UI模块基类，所有UI组件的基本类
 */
this.Component = new exports.ComponentClass(function() {

	this.__mixins__ = [exports.Options];

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
		// 记录所有aop
		self.__signals = [];

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
			if (typeof console != 'undefined') {
				console.warn('node has already wrapped, auto changed to virtual mode.');
			}
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
			if (typeof console != 'undefined') {
				console.error('just allow ' + self.allowTags + ' tags.');
			}
			return;
		}

		// 记录已经获取完毕的components
		var inited = 0;
		function checkInit() {
			if (inited == self.meta.components.length) {
				inited = -1; // reset
				// 初始化addons
				self.meta.addons.forEach(function(addon) {
					addon.get('_init')(self);
				}); 
				self.init();
			}
		}

		// 存储subEvents，用于render时获取信息
		self.__subEventsMap = {};
		// 初始化subEventsMap
		self.meta.subEvents.forEach(function(name) {
			self.getMeta(name).init(self, name);
		});

		// 存储aopMethods，用于render时获取信息
		self.__aopMethodsMap = {};
		// 初始化aopMethodsMap
		self.meta.aopMethods.forEach(function(name) {
			self.getMeta(name).init(self, name);
		});

		if (!self.__virtual) {
			// 初始化options事件
			self.meta.options.forEach(function(name) {
				self.getMeta(name).bindEvents(self, name);
			});

			// 初始化onEvents
			self.meta.onEvents.forEach(function(name) {
				self.getMeta(name).bindEvents(self, name);
			});
		}

		// 初始化options
		self._options = {};
		options = options || {};
		extend(options, self.meta.defaultOptions, false);
		// 生成option在组件上的初始引用
		self.meta.options.forEach(function(name) {
			self.getOption(name);
		});
		// 设置所有传进来的option
		self.setOption(options);

		// 初始化自己身上的aop方法
		self.meta.subEvents.forEach(function(name) {
			var meta = self.getMeta(name);
			var member = self[meta.sub];
			if (typeof member == 'function') {
				self.addAspectTo(self, meta.sub, meta.eventType, meta.methodName);
			}
		});

		// 初始化components
		self.meta.components.forEach(function(name) {
			self.getMeta(name).select(self, name, null, function(comp) {
				inited++;
				checkInit();
			});
		});

		checkInit();
	};

	/**
	 * 统一的aop注册入口
	 */
	this.addAspectTo = function(self, comp, originName, aopType, methodName) {
		var advice = (aopType == 'around') ? function(origin) {
			// 返回一个绑定后的origin
			return self[methodName](function() {
				return origin.apply(comp, arguments);
			});
		} : self[methodName];
		var signal = aop[aopType](comp, originName, advice, true);
		signal.comp = comp;
		// 记录自己给别人添加的aop方法
		self.__signals.push(signal);
	};

	/**
	 * 统一的注册事件入口，当一个组件需要给自己或其子成员注册事件时使用
	 * 统一入口可统一记录所有事件注册，在destroy时统一清除
	 */
	this.addEventTo = function(self, comp, type, func, cap) {
		comp.addEvent(type, func, cap);
		var item = {
			comp: comp,
			type: type,
			func: func,
			cap: cap
		};
		// 记录自己给别人添加的事件
		self.__events.push(item);
	};

	this.fireEvent = function(self) {
		return (self.__virtual || self._node).fireEvent.apply(self._node, Array.prototype.slice.call(arguments, 1));
	};

	this.addEvent = function(self) {
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
		self.__rendered.splice(self.__rendered.length);

		// 清除所有注册的事件
		self.__events.forEach(function(item) {
			item.comp.removeEvent(item.type, item.func, item.cap);
		});
		self.__events.splice(self.__events.length);

		// 清除所有aop包装
		self.__signals.forEach(function(signal) {
			signal.remove();
		});
		self.__signals.splice(self.__signals.length);

		// 将node上保存的自己的引用删掉
		// 恢复self包装过node的所有痕迹
		self._node.components.splice(self._node.components.indexOf(self), 1);
	};

	this.destroyComponent = function(self, comp) {
		// 清除self注册给comp的事件
		self.__events.forEach(function(item) {
			if (item.comp === comp) {
				item.comp.removeEvent(item.type, item.func, item.cap);
			}
		});

		// 清除self注册给comp的aop方法
		self.__signals.forEach(function(signal) {
			if (signal.comp === comp) {
				signal.remove();
			}
		});

		// destroy后，所有的self注册给其的事件已经清除，将其从__bounds中删除
		self.__bounds.splice(self.__bounds.indexOf(comp), 1);
	};

	/**
	 * 清空自身节点
	 */
	this._dispose = function(self) {
		// virtual mode 无法触发事件，因此不执行dispose操作
		if (!self.__virtual) {
			self._node.dispose();
			self.destroy(true);
		}
	};

	/**
	 * 获取一个通过ui.request定义的net.Request的实例
	 */
	this.getRequest = function(self, name, data) {
		var pname = '_' + name;
		var options = self.getOption(name) || {};
		if (data) {
			options = object.clone(options);
			options.url = string.substitute(options.url, data);
		}
		var request;
		if (!self[pname]) {
			request = new net.Request();
			self.getMeta(name).bindEvents(self, name, request);
			self[pname] = request;
		} else {
			request = self[pname];
		}
		request.setOption(options);
		self._set(name, request);
		return request;
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

			var methodName = '__render_' + name;
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

		var members = cls.get('__members');
		var variables = cls.get('__variables');

		// 生成vars
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

		// 生成member
		members.forEach(function(nameTpl) {
			var name = string.substitute(nameTpl, vars);
			var member = cls.get(nameTpl);
			if (typeof member == 'function') {
				member = member(cls, vars);
			}
			dict[name] = member;
		});

		return Type.__new__(cls, name, base, dict);
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

