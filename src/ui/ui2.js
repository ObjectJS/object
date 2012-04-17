object.define('ui/ui2.js', 'sys, string, options, dom, events, urlparse, ./net, ./options, ./memberloader', function(require, exports) {

var string = require('string');
var dom = require('dom');
var events = require('events');
var net = require('./net');
var optionsmod = require('./options');

var globalid = 0;

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
}

ComponentMeta.prototype.getType = function(callback) {

	var meta = this;
	var type = this.type;
	var cls;

	var memberloader = require('./memberloader');

	function getAddonedType(cls, callback) {
		var addons = meta.addons;

		// 已经是一个处理过的type
		if (cls.get('__addoned')) {
			callback(cls);

		}
		// 未处理过
		else {
			memberloader.load(addons, function() {
				if (addons) {
					addons = Array.prototype.slice.call(arguments, 0);
					cls = new Class(cls, {__mixins__: addons, __addoned: true});
				}
				// 将处理结果放到type上
				meta.type = cls;
				callback(cls);
			});
		}
	}

	// async
	if (typeof type == 'string') {
		memberloader.load(type, function(cls) {
			if (!cls) {
				console.error('can\'t get type ' + type);
				return;
			}
			getAddonedType(cls, callback);
		});
	}
	// class
	else if (Class.instanceOf(type, Type)) {
		cls = type;
		getAddonedType(cls, callback);
	}
	// sync
	else if (typeof type == 'function') {
		cls = type();
		getAddonedType(cls, callback);
	}
};

ComponentMeta.prototype.wrap = function(comp, name, node, callback) {
	var meta = this;
	var result;

	if (node) {
		result = node.component;
		if (result) {
			callback(result);

		} else {
			this.getType(function(type) {
				result = new type(node, comp._options[name]);

				if (name in comp.__subEventsMap) {
					comp.__subEventsMap[name].forEach(function(meta) {
						meta.addEventTo(result);
					});
				}

				callback(result);
			});
		}

	} else {
		callback(null);
	}
};

ComponentMeta.prototype.select = function(comp, name, callback) {
	var node = null;

	var selector = this.selector;

	if (typeof selector == 'function') {
		node = dom.wrap(selector(comp));
	} else {
		node = comp._node.getElement(selector);
	}

	this.wrap(comp, name, node, callback);
};

ComponentMeta.prototype.fillOptions = function(comp, name) {
	// 每次获取meta都要重新部署options
	var optionsMeta = comp._options[name];
	optionsMeta = optionsMeta? optionsMeta.meta : null;

	// 将metaOptions上的成员复制到meta上
	if (optionsMeta) {
		object.extend(this, optionsMeta);
	}
};

/**
 * @param relativeModule 类所在的模块名，用来生成相对路径
 */
ComponentMeta.prototype.getTemplate = function(relativeModule, callback) {
	var sys = require('sys');
	var urlparse = require('urlparse');
	var templatemodule = this.templatemodule;
	var template = this.template;

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

ComponentMeta.prototype.bindOptions = function(comp, name) {
	// fill meta.options to comp._options
	if (this.defaultOptions) {
		Object.keys(this.defaultOptions).forEach(function(key) {
			optionsmod.setOptionTo(comp._options, name + '.' + key, this.defaultOptions[key]);
		}, this);
	}
};

function ComponentsMeta(selector, type, options, renderer) {
	ComponentMeta.apply(this, arguments);
}

ComponentsMeta.prototype = new ComponentMeta();

ComponentsMeta.prototype.wrap = function(comp, name, nodes, callback) {
	var meta = this;

	if (nodes) {
		// 返回的是数组，变成Elements
		// 避免重复包装
		// TODO 用addEvent避免重复包装的方法不优雅
		if (!nodes.addEvent) {
			nodes = new dom.Elements(nodes);
		}

		this.getType(function(type) {

			nodes.forEach(function(node) {
				if (!node.component) {
					var c = new type(node, comp._options[name]);
					if (name in comp.__subEventsMap) {
						comp.__subEventsMap[name].forEach(function(meta) {
							meta.addEventTo(c);
						});
					}
				}
			});

			var result = new type.Components(nodes);
			callback(result);
		});
	} else {
		callback(null);
	}
};

ComponentsMeta.prototype.select = function(comp, name, callback) {
	var nodes = null, comps = null;

	var selector = this.selector;

	if (typeof selector == 'function') {
		nodes = selector(comp);
		// 确保返回的是个dom.Elements
		if (nodes.constructor != dom.Elements) {
			if (!nodes.length) {
				nodes = [nodes];
			}
			nodes = new dom.Elements(nodes);
		}
	} else {
		nodes = comp._node.getElements(selector);
	}

	this.wrap(comp, name, nodes, callback);
};

function OptionMeta(defaultValue, getter) {
	this.defaultValue = defaultValue;
	this.getter = getter;
}

OptionMeta.prototype.bindEvents = function(comp, name) {
	// 注册 option_change 等事件
	if (name in comp.__subEventsMap) {
		comp.__subEventsMap[name].forEach(function(meta) {
			meta.addOptionEventTo(comp);
		});
	}
};

function ParentComponentMeta(type) {
	this.type = type;
}

ParentComponentMeta.prototype = new ComponentMeta();

ParentComponentMeta.prototype.select = function(comp, name, callback) {
	var node = comp._node;
	var type;

	if (Class.instanceOf(this.type, Type)) {
		type = this.type;
	}
	else if (typeof this.type == 'function') {
		type = this.type();
	}

	var result = null;
	while (node = node.parentNode) {
		if (node.component && Class.instanceOf(node.component, type)) {
			result = node.component;
			break;
		}
	}
	callback(result);
};

function SubEventMeta(sub, eventType, gid) {
	this.sub = sub;
	this.eventType = eventType;
	this.gid = gid;
}

SubEventMeta.prototype.addOptionEventTo = function(comp) {
	var name = this.name;
	var fakeEventType = '__option_' + this.eventType + '_' + this.sub;
	comp.addEvent(fakeEventType, function(event) {
		comp[name](event);
	});
};

SubEventMeta.prototype.addEventTo = function(comp) {
	var sub = this.sub;
	var eventType = this.eventType;
	var name = this.name;
	var self = this.binded;

	comp._node.addEvent(eventType, function(event) {
		var args;
		// 将event._args pass 到函数后面
		if (event._args) {
			args = [event].concat(event._args);
			self[name].apply(self, args);
		} else {
			self[name](event);
		}
	})
};

SubEventMeta.prototype.bindUnknownEvent = function() {
	var sub = this.sub;
	var eventType = this.eventType;
	var name = this.name;
	var comp = this.binded;

	if (comp[sub]) {
		comp[sub].addEvent(eventType, function(event) {
			var args;
			// 将event._args pass 到函数后面
			if (event._args) {
				args = [event].concat(event._args);
				comp[name].apply(comp, args);
			} else {
				comp[name](event);
			}
		});
	}
};

SubEventMeta.prototype.bind = function(comp, name) {
	var sub = this.sub;
	this.binded = comp;
	this.name = name;

	// 记录下来，render时从__subEventsMap获取信息
	if (!(sub in comp.__subEventsMap)) {
		comp.__subEventsMap[sub] = [];
	}
	comp.__subEventsMap[sub].push(this);

	// options
	if (comp.meta.options.indexOf(sub) != -1) {
	}
	// component
	else if (comp.meta.components.indexOf(sub) != -1) {
	}
	// request ...
	else {
		this.bindUnknownEvent();
	}
};

function OnEventMeta(eventType, gid) {
	this.eventType = eventType;
	this.gid = gid;
}

OnEventMeta.prototype.bindEvents = function(comp, name) {
	var eventType = this.eventType;

	comp.addEvent(eventType, function(event) {
		var args = [event];
		//将event._args pass 到函数后面
		if (event._args) {
			args = args.concat(event._args);
		}
		comp[name].apply(comp, args);
	});
};

/**
 * 帮助定义一个生成组件间联系的方法
 */
function define(meta) {
	function fget(self) {
		var name = prop.__name__;
		// select只处理查询，不处理放置到self。
		// 这里不能直接meta.select，而是确保options中的meta信息存在，需要用getMeta
		var meta = self.getMeta(name);
		meta.fillOptions(self, name);
		meta.select(self, name, function(comp) {
			self.setComponent(name, comp);
		});
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
 *	refname: ui.define('css selector', ui.menu.Menu)
 * });
 * 这样MyComponent实例的refname属性即为相对应selector获取到的节点引用
 * @param selector 选择器
 * @param type 构造类
 * @param options 可选
 * @param renderer 可选
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
 * 定义唯一引用的component
 * @param selector 必选
 * @param type 可选
 * @param options 可选
 * @param renderer 可选
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
 * 定义父元素的引用
 */
this.parent = function(type) {
	if (!type) {
		throw new Error('arguments error.');
	}

	return define(new ParentComponentMeta(type));
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

this.request = function(url, method) {
	var request = new net.Request({
		url: url,
		method: method
	});
	return request;
};

/**
 * 定义一个向子元素注册事件的方法
 * @decorator
 * @param sub 子成员名称
 * @param eventType
 * @param gid
 */
this.subevent = function(sub, eventType, gid) {
	return function(func) {
		func.meta = new SubEventMeta(sub, eventType, gid);
		return func;
	}
};

/**
 * 定义一个扩展向宿主元素定义事件的方法
 * @decorator
 * @param eventType
 * @param gid
 */
this.onevent = function(eventType, gid) {
	return function(func) {
		func.meta = new OnEventMeta(eventType, gid);
		return func;
	};
};

// metaclass
this.ComponentFactory = new Class(Type, function() {

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

		cls.set('gid', gid);
		cls.set('meta', meta);

		var members = cls.get('__members');

		members.forEach(function(item) {
			cls.set(item.name, item.member);
		});

		Type.__delattr__(cls, '__members');

		// 合并meta
		cls.get('mixMeta')(name, base, dict);

		// 生成Components
		cls.get('makeComponents')(name, base, dict);
	};

	this.__setattr__ = function(cls, name, member) {
		var gid = cls.get('gid');
		var meta = cls.get('meta');
		var match;

		if (member == null) {
			Type.__setattr__(cls, name, member);

		}
		else if (member.__class__ == property && member.meta instanceof OptionMeta) {
			if (meta.options.indexOf(name) == -1) {
				meta.options.push(name);
			}
			Type.__setattr__(cls, name, member);

		}
		else if (member.__class__ == property && member.meta instanceof ComponentMeta) {
			if (meta.components.indexOf(name) == -1) {
				meta.components.push(name);
			}
			Type.__setattr__(cls, 'render_' + name, member.meta.renderer);
			Type.__setattr__(cls, name, member);

		}
		else if (name.slice(0, 1) == '_' && name.slice(0, 2) != '__' && name != '_set') {
			var newName = name.slice(1);
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
		else if (match = name.match(/^(_?\w+)_(\w+)$/)) {
			var newName = name + '$' + gid;
			var sub = match[1];
			var eventType = match[2];
			var newMember = exports.subevent(sub, eventType, gid)(member);
			if (meta.subEvents.indexOf(newName) == -1) {
				meta.subEvents.push(newName);
			}
			Type.__setattr__(cls, newName, newMember);

		}
		else if (match = name.match(/^on(\w+)$/)) {
			var newName = name + '$' + gid;
			if (meta.onEvents.indexOf(newName) == -1) {
				meta.onEvents.push(newName);
			}
			var eventType = match[1];
			var eventType = eventType.slice(0, 1).toLowerCase() + eventType.slice(1);
			var newMember = exports.onevent(eventType, gid)(member);
			Type.__setattr__(cls, newName, newMember);

		}
		else {
			Type.__setattr__(cls, name, member);

		}
	};

	/**
	 * 将base和mixins中的meta信息合并之cls.meta
	 */
	this.mixMeta = function(cls, name, base, dict) {
		var meta = cls.get('meta');
		// 合并base的meta
		if (base != Object) {
			var bgid = base.get('gid');
			var baseMeta = base.get('meta');
			baseMeta.components.forEach(function(name) {
				if (meta.components.indexOf(name) == -1) meta.components.push(name);
			});
			baseMeta.options.forEach(function(name) {
				if (meta.options.indexOf(name) == -1) meta.options.push(name);
			});
			baseMeta.onEvents.forEach(function(name) {
				if (meta.onEvents.indexOf(name) == -1) meta.onEvents.push(name);
			});
			baseMeta.subEvents.forEach(function(name) {
				if (meta.subEvents.indexOf(name) == -1) meta.subEvents.push(name);
			});
		}

		// 合并mixin的meta
		var mixes = (cls.__mixins__ || []);
		mixes.forEach(function(mix) {
			var gid = mix.get('gid');
			if (!gid) {
				// mixin的有可能不是addon
				return;
			}
			var mixMeta = mix.get('meta');
			mixMeta.components.forEach(function(name) {
				if (meta.components.indexOf(name) == -1) meta.components.push(name);
			});
			mixMeta.options.forEach(function(name) {
				if (meta.options.indexOf(name) == -1) meta.options.push(name);
			});
			mixMeta.onEvents.forEach(function(name) {
				if (meta.onEvents.indexOf(name) == -1) meta.onEvents.push(name);
			});
			mixMeta.subEvents.forEach(function(name) {
				if (meta.subEvents.indexOf(name) == -1) meta.subEvents.push(name);
			});
		});
	};

	/**
	 * 生成Components
	 */
	this.makeComponents = function(cls, name, base, dict) {
		// Component则是Array，其他则是父类上的Components
		var compsBase = base.Components || Array;

		cls.set('Components', new exports.ComponentsFactory(compsBase, function() {

			this.initialize = function(self, nodes, options) {
				self._node = nodes;
				self._node.component = self;
				self._node.forEach(function(node) {
					var comp = node.component || new cls(node, options);
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

this.ComponentsFactory = new Class(Type, function() {

	this.initialize = function(cls, name, base, dict) {

		var members = cls.get('__members');

		members.forEach(function(item) {
			if (item.name === 'initialize') return;
			cls.set(item.name, item.member);
		});

		Type.__delattr__(cls, '__members');
	};

});

/**
 * UI模块基类，所有UI组件的基本类
 */
this.Component = new Class(function() {

	this.__metaclass__ = exports.ComponentFactory;

	/**
	 * @param node 包装的节点
	 * @param options 配置
	 */
	this.initialize = function(self, node, options) {
		// 可能是mixin addon
		if (!node) {
			return;
		}

		// 存储dispose事件的注册情况
		self.__disposes = [];
		// 存储make的新元素
		self.__rendered = []; // 后来被加入的，而不是首次通过selector选择的node的引用
		// 存储subEvents，用于render时获取信息
		self.__subEventsMap = {};

		self._node = dom.wrap(node);
		if (node.component) {
			console.error('一个元素只可以作为一个组件', node);
			return;
		}
		self._node.component = self;

		if (!options) options = {};
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

		// 初始化subEventsMap
		self.meta.subEvents.forEach(function(name) {
			var meta = self.getMeta(name);
			meta.bind(self, name);
		});

		// 初始化components
		self.meta.components.forEach(function(name) {
			var meta = self.getMeta(name);
			// 将meta.options合并到self._options上，其优先级低，并非动态的，合并一次即可，后续可以被覆盖
			meta.bindOptions(self, name);
			meta.fillOptions(self, name);
			meta.select(self, name, function(comp) {
				self.setComponent(name, comp);
				inited++;
				checkInit();
			});
		});
		// 初始化options
		self.meta.options.forEach(function(name) {
			var meta = self.getMeta(name);
			meta.bindEvents(self, name);
			self.get(name);
		});
		// 初始化onEvents
		self.meta.onEvents.forEach(function(name) {
			var meta = self.getMeta(name);
			meta.bindEvents(self, name);
		});

		self.initAddons(self);

		checkInit();
	};

	this.fireEvent = function(self) {
		return self._node.fireEvent.apply(self._node, Array.prototype.slice.call(arguments, 1));
	};

	this.addEvent = function(self) {
		return self._node.addEvent.apply(self._node, Array.prototype.slice.call(arguments, 1));
	};

	this.removeEvent = function(self) {
		return self._node.removeEvent.apply(self._node, Array.prototype.slice.call(arguments, 1));
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
			console.error('模板不存在');
			return null;
		}
		var extendData = {};
		self.meta.options.forEach(function(name) {
			extendData[name] = self.get(name);
		});
		object.extend(data, extendData);
		var result = string.substitute(template, data);
		var node = dom.Element.fromString(result);

		return node;
	};

	this.initAddons = classmethod(function(cls, self) {
		var mixins = cls.get('__mixins__');
		if (mixins) {
			mixins.forEach(function(mixin) {
				if (!mixin.get('gid')) {
					// 不是addon
					return;
				}
				mixin.get('init')(self);
			}); 
		}
	});

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
	this._destory = function(self) {
		self.__rendered.forEach(function(node) {
			node.component.dispose();
		});
		self.__rendered = [];
	};

	/**
	 * 清空自身节点
	 */
	this._dispose = function(self) {
		self._node.dispose();
		self.fireEvent('aftercomponentdispose');
	};

	/**
	 * 设置获取到的component
	 */
	this.setComponent = function(self, name, comp) {
		var node = null;
		if (comp) {
			node = comp._node;
			if (self.__disposes.indexOf(name) == -1) {
				comp.addEvent('aftercomponentdispose', function(event) {
					self.get(name);
				});
				self.__disposes.push(name);
			}
		}
		self._set(name, comp);
		self._set('_' + name, node);
	};

	/**
	 * 获取option的值
	 * 支持复杂name的查询
	 * comp.getOption('xxx') 获取comp的xxx
	 * comp.getOption('sub.xxx') 获取当前comp为sub准备的xxx。若要获取运行时的option，需要用com.sub.getOption('xxx');
	 * @param name name
	 */
	this.getOption = function(self, name) {
		var parts = name.split('.');
		var value, current;

		// 获取自己身上的option
		// 三个获取级别，优先级：结构>用户设置>默认
		if (parts.length == 1) {

			var meta = self.getMeta(name);

			// meta不存在表示在获取一个没有注册的option
			if (!meta) {
				return self._options[name];
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
		}
		// 获取为子引用准备的option
		else {
			current = self._options;
			for (var i = 0, part; i < parts.length; i++) {
				part = parts[i];
				if (current) {
					current = current[part];
				}
			}
			value = current;
		}
		return value;
	};

	/**
	 * 设置option的值
	 * @param name name
	 * @param value value
	 */
	this.setOption = optionsmod.overloadsetter(function(self, name, value) {
		// 由于overloadsetter是通过name是否为string来判断传递形式是name-value还是{name:value}的
		// 在回调中为了性能需要直接传的parts，类型为数组，而不是字符串，因此无法通过回调用overloadsetter包装后的方法进行回调
		(function(self, name, value) {
			var parts = Array.isArray(name)? name : name.split('.');

			// 为自己设置option
			if (parts.length == 1) {
				var oldValue = self.getOption(name);
				self._options[parts[0]] = value;
				(events.fireevent('__option_change_' + name, ['oldValue', 'value'])(function(self) {
					// 重新更新对象上的直接引用值
					self.get(name);
				}))(self, oldValue, value);
			}
			// 为子引用设置option
			else {
				// 保存在_options中
				optionsmod.setOptionTo(self._options, parts, value);

				var sub = self[parts[0]];
				// 子引用已经存在
				if (sub && sub.setOption) {
					sub.setOption(parts.slice(1).join('.'), value);
				}
			}

		})(self, name, value);
	});

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
	 * 渲染一组component
	 * 异步方法
	 * @param name component名字
	 * @param data 模板数据/初始化参数
	 * @param callback render结束后的回调
	 */
	this.render = function(self, name, data, callback) {
		// data可选
		if (!callback && typeof data == 'function') {
			callback = data;
			data = null;
		}

		var methodName = 'render_' + name;

		// 如果已经存在结构了，则不用再render了
		var comp = self.get(name);
		if (comp && (!('length' in comp) || comp.length != 0)) {
			if (callback) {
				callback();
			}
			return;
		}

		var meta = self.getMeta(name);
		meta.fillOptions(self, name);

		var renderer = self[methodName];
		// selector为false的free组件拥有默认renderer，创建即返回
		if (!renderer && meta.selector === false) {
			renderer = function(make) {
				return make();
			};
		}

		if (!renderer) {
			console.error('no renderer specified for ' + name + '.');
			return;
		}

		// data
		data = data || {};
		var options = self._options[name];
		object.extend(data, options, false);

		// TODO 用async维护两个异步
		meta.getType(function(type) {
			meta.getTemplate(self.__class__.__module__, function(template) {
				var nodes = [];
				// make方法仅仅返回node，这样在new comp时node已经在正确的位置，parent可以被正确的查找到
				function make(newData) {
					var node;
					if (template) {
						node = self.createNode(template, newData || data);
					} else {
						console.error('no template specified for ' + name + '.');
						return;
					}
					nodes.push(node);
					self.__rendered.push(node);
					return node;
				};

				// for debug
				make.template = template;
				make.data = data;

				// nodes用在free component的定义
				var returnNodes = renderer.call(self, make, data);
				if (returnNodes) {
					nodes = returnNodes;
				}

				// 说明无所谓selector，生成什么就放什么就行
				if (meta.selector === false) {
					meta.wrap(self, name, nodes, function(comp) {
						self.setComponent(name, comp);
					});
				}
				// 重建引用，若render正常，刚刚创建的节点会被找到并包装
				else {
					meta.select(self, name, function(comp) {
						self.setComponent(name, comp);
					});
				}

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

// metaclass 的 metaclass
this.AddonFactoryFactory = new Class(Type, function() {

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

// 继承于 ComponentFactory
this.AddonFactory = new Class(exports.ComponentFactory, function() {

	this.__metaclass__ = exports.AddonFactoryFactory;

	this.__new__ = function(cls, name, base, dict) {
		// base是Component
		if (base !== exports.Component) {
			base = exports.Component;
		}
		return exports.ComponentFactory.get('__new__')(cls, name, base, dict);
	};

	this.initialize = function(cls, name, base, dict) {
		exports.ComponentFactory.get('initialize')(cls, name, base, dict);

		var members = cls.get('__members');
		var variables = cls.get('__variables');

		var vars = {};
		variables.forEach(function(name) {
			vars[name.slice(1)] = cls.get(name);
		});
		// 变量递归，支持变量中引用变量
		variables.forEach(function(name) {
			vars[name.slice(1)] = string.substitute(cls.get(name), vars);
		});

		members.forEach(function(nameTpl) {
			var name = string.substitute(nameTpl, vars);
			var member = cls.get(nameTpl);
			cls.set(name, member);
		});
		cls.set('__vars', vars);
	};
});

});
