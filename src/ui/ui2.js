object.define('ui/ui2.js', 'string, options, dom, events', function(require, exports) {

var string = require('string');
var options = require('options');
var dom = require('dom');
var events = require('events');

var globalid = 0;

/**
 * 用于承载options的空对象
 */
function Options() {
}

/**
 * 向current这个对象的name成员设置value值
 * @param current 需要被设置的对象
 * @param name 一个通过.分开各个部分的名称
 * @param value 需要设置的值
 */
function setOptionTo(current, name, value) {
	var parts = Array.isArray(name)? name : name.split('.');
	// 生成前缀对象
	for (var i = 0, part; i < parts.length - 1; i++) {
		part = parts[i];
		if (current[part] === undefined) {
			current[part] = new Options();
		}
		current = current[part];
	}
	current[parts[parts.length - 1]] = value;
};

function getType(type, callback) {
	// async
	if (typeof type == 'string') {
		var moduleStr = type.slice(0, type.lastIndexOf('.')).replace(/\./, '/');
		var typeStr = type.slice(type.lastIndexOf('.') + 1);
		require.async(moduleStr, function(module) {
			type = module[typeStr];
			callback(type);
		});
	}
	// class
	else if (Class.instanceOf(type, Type)) {
		callback(type);
	}
	// sync
	else if (typeof type == 'function') {
		callback(type());
	}
}

/**
 * 将value转换成需要的type
 */
function ensureTypedValue(value, type) {
	if (type === 'number') return Number(value);
	else if (type === 'string') return String(value);
	else if (type === 'boolean') return Boolean(value);
};

function ComponentMeta(selector, type, renderer) {
	this.selector = selector;
	this.type = type;
	this.renderer = renderer;
}
ComponentMeta.prototype.select = function(self, name, callback) {
	var nodes = null, comps = null;
	if (typeof this.selector == 'function') {
		nodes = this.selector(self);
		// 确保返回的是个dom.Elements
		if (nodes.constructor != dom.Elements) {
			if (!nodes.length) {
				nodes = [nodes];
			}
			nodes = new dom.Elements(nodes);
		}
	} else {
		nodes = self._node.getElements(this.selector);
	}

	if (nodes) {
		getType(this.type, function(type) {
			comps = new type.Components(nodes);
			callback(comps);
		});
	} else {
		callback(null);
	}
}

function SingleComponentMeta(selector, type, renderer) {
	this.selector = selector;
	this.type = type;
	this.renderer = renderer;
}
SingleComponentMeta.prototype = new ComponentMeta();
SingleComponentMeta.prototype.select = function(self, name, callback) {
	var node = null, comp = null;
	if (typeof this.selector == 'function') {
		node = dom.wrap(this.selector(self));
	} else {
		node = self._node.getElement(this.selector);
	}

	if (node) {
		comp = node.component;
		if (comp) {
			self.setComponent(name, comp);
		} else {
			getType(this.type, function(type) {
				if (!Class.instanceOf(type, Type)) {
					throw new Error('type is not a class.');
				}
				comp = new type(node, self._options[name]);
				callback(comp);
			});
		}

	} else {
		callback(null);
	}
};

function OptionMeta(defaultValue, getter) {
	this.defaultValue = defaultValue;
	this.getter = getter;
}

function ParentComponentMeta(type) {
	this.type = type;
}
ParentComponentMeta.prototype = new ComponentMeta();
ParentComponentMeta.prototype.select = function(self, name, callback) {
	var node = self._node;
	var comp = null;

	while (node = node.parentNode) {
		if (node.component.__class__ === this.type()) {
			comp = node.component;
			break;
		}
	}
	callback(comp);
};

function SubEventMeta(sub, eventType, gid) {
	this.sub = sub;
	this.eventType = eventType;
	this.gid = gid;
}

SubEventMeta.prototype.bindComponentEvent = function() {
	var sub = this.sub;
	var eventType = this.eventType;
	var methodName = this.methodName;
	var comp = this.comp;

	if (comp[sub]) {
		comp[sub]._node.addEvent(eventType, function(event) {
			var args;
			// 将event._args pass 到函数后面
			if (event._args) {
				args = [event].concat(event._args);
				comp[methodName].apply(comp, args);
			} else {
				comp[methodName](event);
			}
		});
	}
};

SubEventMeta.prototype.bindOptionEvent = function() {
	var methodName = this.methodName;
	var comp = this.comp;
	// 注册 option_change 等事件
	var fakeEventType = '__option_' + this.eventType + '_' + this.sub;

	comp.addEvent(fakeEventType, function(event) {
		comp[methodName](event);
	});
};

SubEventMeta.prototype.bind = function(comp, methodName) {
	var sub = this.sub;
	this.comp = comp;
	this.methodName = methodName;

	// options
	if (comp.meta.options.indexOf(sub) != -1) {
		this.bindOptionEvent();
	}
	// component
	else if (comp.meta.components.indexOf(sub) != -1) {
		this.bindComponentEvent();
		if (!(sub in comp.__subEventsMap)) {
			comp.__subEventsMap[sub] = [];
		}
		comp.__subEventsMap[sub].push(this);
	}
};

function OnEventMeta(eventType, gid) {
	this.eventType = eventType;
	this.gid = gid;
}

OnEventMeta.prototype.bind = function(self, methodName) {
	var eventType = this.eventType;
	var realEventType; // 正常大小写的名称
	// 自己身上的on事件不触发，只触发addon上的。
	if (this.gid != self.gid && self.meta.handles.some(function(handle) {
		if (handle.toLowerCase() == eventType) {
			realEventType = handle;
			return true;
		}
		return false;
	})) {
		self.addEvent(realEventType, function(event) {
			var args;
			// 将event._args pass 到函数后面
			if (event._args) {
				args = [event].concat(event._args);
				self[methodName].apply(self, args);
			} else {
				self[methodName](event);
			}
		});
	}
};

/**
 * 帮助定义一个生成组件间联系的方法
 */
function define(meta) {
	function fget(self) {
		var name = prop.__name__;
		// select只处理查询，不处理放置到self。
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
 */
this.define = function(selector, type, renderer) {
	if (!type) type = exports.Component;
	return define(new ComponentMeta(selector, type, renderer));
};

/**
 * 定义唯一引用的component
 */
this.define1 = function(selector, type, renderer) {
	if (!type) type = exports.Component;
	return define(new SingleComponentMeta(selector, type, renderer));
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
	}
};

/**
 * {'a.b.c': 1, b: 2} ==> {a: {b: {c:1}}, b: 2}
 */
this.parseOptions = function(options) {
	if (options.constructor == Options) return options;

	var parsed = new Options();
	Object.keys(options).forEach(function(name) {
		setOptionTo(parsed, name, options[name]);
	});
	return parsed;
};

// metaclass
this.ComponentFactory = new Class(type, function() {

	this.__new__ = function(cls, name, base, dict) {

		var gid = dict.gid = globalid++;
		var meta = dict.meta = {
			components: [],
			options: [],
			handles: [],
			onEvents: [],
			mixinOnEvents: [],
			subEvents: []
		};

		dict.__onEvents = [];
		dict.__subEvents = [];
		dict.__handles = [];

		// 这里选择在dict阶段就放置到类成员的，一个原因是Components是通过遍历dict生成的
		Object.keys(dict).forEach(function(name) {
			var member = dict[name];
			var newName;

			if (name == 'initialize' || name.indexOf('__') == 0 || member == null) {
				return;
			}

			if (member.__class__ == property && member.meta instanceof OptionMeta) {
				meta.options.push(name);
			}
			else if (member.__class__ == property && member.meta instanceof ComponentMeta) {
				meta.components.push(name);
				dict['render_' + name] = member.meta.renderer;
			}
			else if (name.slice(0, 1) == '_' && name.slice(0, 2) != '__' && name != '_set') {
				dict.__handles.push({
					name: name,
					member: member
				});
			}
			else if (name.match(/^(_?\w+)_(\w+)$/)) {
				delete dict[name];
				dict.__subEvents.push({
					name: name,
					sub: RegExp.$1,
					eventType: RegExp.$2,
					member: member
				});
			}
			else if (name.match(/^on(\w+)$/)) {
				delete dict[name];
				dict.__onEvents.push({
					name: name,
					eventType: RegExp.$1,
					member: member
				});
			}
		});

		return type.__new__(cls, name, base, dict);
	};

	this.initialize = function(cls, name, base, dict) {
		var gid = dict.gid;

		var meta = cls.get('meta');

		// 生成meta方法
		// 在initialize中创建而不是__new__中目的是避免Components中出现无用的方法
		cls.get('__onEvents').forEach(function(item) {
			var newName = item.name + '$' + gid;
			meta.onEvents.push(newName);
			type.__setattr__(cls, newName, exports.onevent(item.eventType, gid)(item.member));
		});
		cls.get('__subEvents').forEach(function(item) {
			var newName = item.name + '$' + gid;
			meta.subEvents.push(newName);
			type.__setattr__(cls, newName, exports.subevent(item.sub, item.eventType, gid)(item.member));
		});
		// 只有在initialize阶段生成handle方法才能确保mixin时能够获取到正确的cls
		cls.get('__handles').forEach(function(item) {
			var newName = item.name.slice(1);
			meta.handles.push(newName);
			type.__setattr__(cls, newName, events.fireevent(function(self) {
				if (cls.get(item.name)) {
					return cls.get(item.name)(self, Array.prototype.slice.call(arguments, 1));
				}
			}));
		});
		// 清除这两个变量
		type.__delattr__(cls, '__onEvents');
		type.__delattr__(cls, '__subEvents');
		type.__delattr__(cls, '__handles');

		// 合并meta
		cls.get('mixMeta')(name, base, dict);

		// 生成Component
		cls.get('makeComponents')(name, base, dict);
	};

	this.__setattr__ = function(cls, name, member) {
		var gid = cls.get('gid');
		var meta = cls.get('meta');

		if (member.__class__ == property && member.meta instanceof OptionMeta) {
			if (meta.options.indexOf(name) == -1) {
				meta.options.push(name);
			}
			type.__setattr__(cls, name, member);
		}
		else if (member.__class__ == property && member.meta instanceof ComponentMeta) {
			if (meta.components.indexOf(name) == -1) {
				meta.components.push(name);
			}
			type.__setattr__(cls, 'render_' + name, member.meta.renderer);
			type.__setattr__(cls, name, member);
		}
		else if (name.slice(0, 1) == '_' && name.slice(0, 2) != '__' && name != '_set') {
			var newName = name.slice(1);
			if (meta.handles.indexOf(name) == -1) {
				meta.handles.push(newName);
			}
			type.__setattr__(cls, newName, events.fireevent(function(self) {
				if (self[name]) {
					return self[name].apply(self, Array.prototype.slice.call(arguments, 1));
				}
			}));
			type.__setattr__(cls, name, member);
		}
		else if (name.match(/^(_?\w+)_(\w+)$/)) {
			var newName = name + '$' + gid;
			var newMember = exports.subevent(RegExp.$1, RegExp.$2, gid)(member);
			if (meta.subEvents.indexOf(newName) == -1) {
				meta.subEvents.push(newName);
			}
			type.__setattr__(cls, newName, newMember);
		}
		else if (name.match(/^on(\w+)$/)) {
			var newName = name + '$' + gid;
			var newMember = exports.onevent(RegExp.$1, gid)(member);
			if (meta.onEvents.indexOf(newName) == -1) {
				meta.onEvents.push(newName);
			}
			type.__setattr__(cls, newName, newMember);
		}
		else {
			type.__setattr__(cls, name, member);
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
			baseMeta.handles.forEach(function(name) {
				if (meta.handles.indexOf(name) == -1) meta.handles.push(name);
			});
			// 对于继承来说，父类的onEvents和mixinOnEvents被放到对应的位置
			baseMeta.onEvents.forEach(function(name) {
				if (meta.onEvents.indexOf(name) == -1) meta.onEvents.push(name);
			});
			baseMeta.mixinOnEvents.forEach(function(name) {
				if (meta.mixinOnEvents.indexOf(name) == -1) meta.mixinOnEvents.push(name);
			});
			baseMeta.subEvents.forEach(function(name) {
				if (meta.subEvents.indexOf(name) == -1) meta.subEvents.push(name);
			});
		}

		// 合并mixin的meta
		var mixes = (cls.__mixins__ || []);
		mixes.forEach(function(mix) {
			var gid = mix.get('gid');
			var mixMeta = mix.get('meta');
			mixMeta.components.forEach(function(name) {
				if (meta.components.indexOf(name) == -1) meta.components.push(name);
			});
			mixMeta.options.forEach(function(name) {
				if (meta.options.indexOf(name) == -1) meta.options.push(name);
			});
			mixMeta.handles.forEach(function(name) {
				if (meta.handles.indexOf(name) == -1) meta.handles.push(name);
			});
			// 对于mixin来说，mixin的onEvents和mixinOnEvents都意味着需要被执行，都放到mixinOnEvents中
			mixMeta.mixinOnEvents.forEach(function(name) {
				if (meta.mixinOnEvents.indexOf(name) == -1) meta.mixinOnEvents.push(name);
			});
			mixMeta.onEvents.forEach(function(name) {
				if (meta.mixinOnEvents.indexOf(name) == -1) meta.mixinOnEvents.push(name);
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

		cls.set('Components', new Class(compsBase, function() {

			this.initialize = function(self, node) {
				self._node = node;
				self._node.component = self;
			};

			Object.keys(dict).forEach(function(name) {
				var member = dict[name];
				if (name == '__metaclass__' || name == 'initialize') {
					return;
				}
				// 只放方法
				if (typeof member == 'function') {
					this[name] = member;
				}
			}, this);
		}));

	};

});

/**
 * UI模块基类，所有UI组件的基本类
 */
this.Component = new Class(function() {

	this.__metaclass__ = exports.ComponentFactory;

	this.template = exports.option('');

	/**
	 * @param node 包装的节点 / 模板数据（搭配options.template）
	 * @param options 配置
	 */
	this.initialize = function(self, node, options) {
		// 可能是mixin addon
		if (!node) {
			return;
		}

		if (!options) options = {};
		// 保存options，生成component时用于传递
		self._options = exports.parseOptions(options);

		// 存储dispose事件的注册情况
		self.__disposes = [];
		// 存储make的新元素
		self.__rendered = []; // 后来被加入的，而不是首次通过selector选择的node的引用
		// 存储subEvents，用于render时获取信息
		self.__subEventsMap = {};

		var template;

		if (!node.nodeType) {
			template = self.getOption('template')
			if (template) {
				node = self.createNode(template, node);
			} else {
				return;
			}
		}

		self._node = dom.wrap(node);
		if (node.component) {
			console.error('一个元素只可以作为一个组件', node);
			return;
		}
		self._node.component = self;

		// 记录已经获取完毕的components
		var inited = [];

		function checkInit() {
			if (inited.length == self.meta.components.length) {
				self.init();
			}
		}

		// 初始化components
		self.meta.components.forEach(function(name) {
			self.getMeta(name).select(self, name, function(comp) {
				self.setComponent(name, comp);
				inited.push(name);
				checkInit();
			});
		});
		// 初始化options
		self.meta.options.forEach(function(name) {
			self.get(name);
		});
		// 初始化onEvents
		self.meta.mixinOnEvents.forEach(function(name) {
			self[name].im_func.meta.bind(self, name);
		});
		// 初始化subEvents
		self.meta.subEvents.forEach(function(name) {
			self[name].im_func.meta.bind(self, name);
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
		self.__rendered.forEach(function(comp) {
			comp.dispose();
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
				current = current[part];
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
	this.setOption = options.overloadsetter(function(self, name, value) {
		// 由于overloadsetter是通过name是否为string来判断传递形式是name-value还是{name:value}的
		// 在回调中为了性能需要直接传的parts，类型为数组，而不是字符串，因此无法通过回调用overloadsetter包装后的方法进行回调
		(function(self, name, value) {
			var parts = Array.isArray(name)? name : name.split('.');

			// 为自己设置option
			if (parts.length == 1) {
				var oldValue = self.getOption(name);
				setOptionTo(self._options, parts, value);
				(events.fireevent('__option_change_' + name, ['oldValue', 'value'])(function(self) {
					// 重新更新对象上的直接引用值
					self.get(name);
				}))(self, oldValue, value);
			}
			// 为子引用设置option
			else {
				// 保存在_options中
				setOptionTo(self._options, parts, value);

				var sub = self[parts[0]];
				// 子引用已经存在
				if (sub) {
					sub.setOption(parts.slice(1).join('.'), value);
				}
			}

		})(self, name, value);
	});

	this.getMeta = function(self, name) {
		if (self.__properties__[name]) {
			return self.__properties__[name].meta;
		}
		else if (self[name]) {
			return self[name].meta;
		}
		else {
			return null;
		}
	};

	/**
	 * 渲染一组component
	 * 异步方法
	 * @param name component名字
	 * @param data 模板数据/初始化参数
	 */
	this.render = function(self, name, data, callback) {
		var methodName = 'render_' + name;

		// 如果已经存在结构了，则不用再render了
		if (self.get(name)) {
			return;
		}

		var meta = self.getMeta(name);
		// make前先把type准备好，这样renderer中就无需考虑异步的问题
		getType(meta.type, function(type) {

			self[methodName](function() {
				var comp;
				self.make(name, data, function(maked) {
					comp = maked;
				});
				return comp;
			});

			// 重建引用
			self.get(name);

			if (callback) {
				callback();
			}

			if (name in self.__subEventsMap) {
				self.__subEventsMap[name].forEach(function(meta) {
					meta.bindComponentEvent();
				});
			}
		});
	};

	/**
	 * 根据components的type创建一个component，并加入到引用中，这一般是在renderXXX方法中进行调用
	 * 异步方法
	 * @param name
	 * @param data 模板数据
	 */
	this.make = function(self, name, data, callback) {
		var meta = self.getMeta(name);
		var pname = '_' + name;

		data = data || {};
		var options = self._options[name];
		object.extend(data, options, false);

		var comp = null;

		getType(meta.type, function(type) {
			comp = new type(data, options);
			self.__rendered.push(comp);
			if (callback) callback(comp);
		});
	};

	/**
	 * 设置component的template
	 */
	this.setTemplate = function(self, name, template) {
		self.setOption(name + '.template', template);
	};

	/**
	 * 获取包装的节点
	 */
	this.getNode = function(self) {
		return self._node;
	};

});

// metaclass 的 metaclass
this.AddonFactoryFactory = new Class(type, function() {

	this.__new__ = function(cls, name, base, dict) {

		var members = (base.get('__members') || []).slice();
		var variables = (base.get('__variables') || []).slice();

		Object.keys(dict).forEach(function(name) {
			if (name.indexOf('__') == 0) {
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
		return type.__new__(cls, name, base, dict);
	};
});

// 继承于 component
this.AddonFactory = new Class(exports.ComponentFactory, function() {

	this.__metaclass__ = exports.AddonFactoryFactory;

	this.__new__ = function(cls, name, base, dict) {
		// 这里的cls获取的是最后被当作metaclass的那个继承后的类
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
			if (member.__class__ == property) {
				dict[name] = member;
			}
			else if (typeof member == 'function') {
				dict[name] = function() {
					var args = Array.prototype.slice.call(arguments, 0);
					args.unshift(cls);
					member.apply(cls.__this__, args);
				};
			}
		});
		cls.set('__vars', vars);

		// base是Component
		if (base !== exports.Component) {
			base = exports.Component;
		}
		return exports.ComponentFactory.__new__(cls, name, base, dict);
	};
});

});
