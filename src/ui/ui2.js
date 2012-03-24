object.add('ui/ui2.js', 'string, options, dom, events', function(exports, string, options, dom, events) {

// defaultOptions需要记录，用于渲染模板时能够将所有option传递到模板中

var globalid = 0;

/**
 * 用于承载options的空对象
 */
function Options() {
}

/**
 * 将value转换成需要的type
 */
function ensureTypedValue(value, type) {
	if (type === 'number') return Number(value);
	else if (type === 'string') return String(value);
	else if (type === 'boolean') return Boolean(value);
};

/**
 * 为一个Component定义一个sub components引用
 * 用法：
 * MyComponent = new Class(ui.Component, {
 *	refname: ui.define('css selector', ui.menu.Menu)
 * });
 * 这样MyComponent实例的refname属性即为相对应selector获取到的节点引用
 * @param selector 选择器
 * @param type 构造类
 */
this.define = function(selector, type) {
	if (!type) type = exports.Component;
	function fget(self) {
		var name = prop.__name__;
		var nodes;
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
		self._set(name, nodes);
	}
	var prop = property(fget);
	return prop;
};

/**
 * 定义唯一引用的sub component
 */
this.define1 = function(selector, type) {

	if (!type) type = exports.Component;
	function fget(self) {
		var name = prop.__name__;
		var node, comp;
		if (typeof selector == 'function') {
			node = dom.wrap(selector(self));
		} else {
			node = self._node.getElement(selector);
		}
		if (!node) return null;
		comp = node.component || new type(node);
		self._set(name, comp);
		self._set('_' + name, node);
		return comp;
	}
	var prop = property(fget);
	prop.isComponent = true;
	return prop;
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
	var name;
	// 默认getter是从结构中通过data-前缀获取
	getter = getter || function(self) {
		var value = self._node.getData(name.toLowerCase());
		if (value != undefined) {
			return ensureTypedValue(value, typeof defaultValue);
		}
	};
	function fget(self) {
		// 三个获取级别，优先级：结构>用户设置>默认
		name = prop.__name__;
		var value;
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
			value = defaultValue;
		}
		// 确保获取到的value得到更新
		self._set(name, value);
		return value;
	}
	function fset(self, value) {
		name = prop.__name__;
		var oldValue = self.getOption(name);
		(events.fireevent('__option_change_' + name, ['oldValue', 'value'])(function(self) {
			self._options[name] = value;
			// 重新更新对象上的直接引用值
			self.get(name);
		}))(self, oldValue, value);
	}
	var prop = property(fget, fset);
	prop.isOption = true;
	return prop;
};

/**
 * {'a.b.c': 1, b: 2} ==> {a: {b: {c:1}}, b: 2}
 */
this.parseOptions = function(options) {
	if (options.constructor == Options) return options;

	var parsed = new Options();
	Object.keys(options).forEach(function(name) {
		exports.setOptionTo(parsed, name, options[name]);
	});
	return parsed;
};

/**
 * 向current这个对象的name成员设置value值
 * @param current 需要被设置的对象
 * @param name 一个通过.分开各个部分的名称
 * @param value 需要设置的值
 */
this.setOptionTo = function(current, name, value) {
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

function SubEventMeta(sub, eventType, gid) {
	this.sub = sub;
	this.eventType = eventType;
	this.gid = gid;
}

SubEventMeta.parse = function(name, gid, member, after) {
	var newName = name + '$' + gid;
	if (name.match(/^(_?\w+)_(\w+)$/)) {
		after(newName, subevent(RegExp.$1, RegExp.$2, gid)(member));
		return true;
	}
};

SubEventMeta.prototype.bind = function(self, methodName) {
	var sub = this.sub;
	var eventType = this.eventType;
	var gid = this.gid;
	var fakeEventType;

	// options
	if (self.__options.indexOf(sub) != -1) {
		// 注册 option_change 等事件
		fakeEventType = '__option_' + eventType + '_' + sub;

		self.addEvent(fakeEventType, function(event) {
			self[methodName](event);
		});
	}
	// sub component
	else {
		self[sub]._node.addEvent(eventType, function(event) {
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

function OnEventMeta(eventType, gid) {
	this.eventType = eventType;
	this.gid = gid;
}

OnEventMeta.parse = function(name, gid, member, after) {
	var newName = name + '$' + gid;
	if (name.match(/^on(\w+)$/)) {
		after(newName, onevent(RegExp.$1, gid)(member));
		return true;
	}
};

OnEventMeta.prototype.bind = function(self, methodName) {
	var eventType = this.eventType;
	var realEventType; // 正常大小写的名称
	// 自己身上的on事件不触发，只触发addon上的。
	if (this.gid != self.gid && self.__handles.some(function(handle) {
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

function handleparse(name, after) {
	var newName = name.slice(1);
	if (name.slice(0, 1) == '_' && name.slice(0, 2) != '__' && name != '_set') {
		member = events.fireevent(function(self) {
			if (self[name]) {
				return self[name].apply(self, Array.prototype.slice.call(arguments, 1));
			}
		});
		after(newName, member);
		return true;
	}
}

function subevent(sub, eventType, gid) {
	return function(func) {
		func.meta = new SubEventMeta(sub, eventType, gid);
		return func;
	}
}

function onevent(eventType, gid) {
	return function(func) {
		func.meta = new OnEventMeta(eventType, gid);
		return func;
	}
}

// metaclass
this.component = new Class(type, function() {

	this.__new__ = function(cls, name, base, dict) {
		var gid = dict.gid = globalid++;
		var subs = dict['__subs$' + gid] = [];
		var options = dict['__options$' + gid] = [];
		var handles = dict['__handles$' + gid] = [];
		var metas = dict['__metas$' + gid] = [];

		Object.keys(dict).forEach(function(name) {
			var member = dict[name];
			if (name == 'initialize' || name.indexOf('__') == 0 || member == null) {
				return;
			}

			if (member.__class__ == property) {
				if (member.isOption) {
					options.push(name);
				} else if (member.isComponent) {
					subs.push(name);
				}
			}
			else if (!handleparse(name, function(newName, newMember) {
				dict[newName] = newMember;
				handles.push(newName);
			})) {
				SubEventMeta.parse(name, gid, member, function(newName, newMember) {
					dict[newName] = newMember;
					delete dict[name];
					metas.push(newName);
				}) || OnEventMeta.parse(name, gid, member, function(newName, newMember) {
					dict[newName] = newMember;
					delete dict[name];
					metas.push(newName);
				});
			}
		});

		return type.__new__(cls, name, base, dict);
	};

	this.initialize = function(cls, name, base, dict) {
	};

	this.__setattr__ = function(cls, name, member) {
		var gid = cls.get('gid');

		if (member.__class__ == property) {
			if (member.isOption) {
				cls.get('__options$' + gid).push(name);
			} else if (member.isComponent) {
				cls.get('__subs$' + gid).push(name);
			}
			type.__setattr__(cls, name, member);
		}
		else if (handleparse(name, function(newName, newMember) {
			cls.get('__handles$' + gid).push(newName);
			type.__setattr__(cls, newName, newMember);
			type.__setattr__(cls, name, member);
		})) {
			return;
		}
		else if (SubEventMeta.parse(name, gid, member, function(newName, newMember) {
			type.__setattr__(cls, newName, newMember);
			cls.get('__metas$' + gid).push(newName);
		}) || OnEventMeta.parse(name, gid, member, function(newName, newMember) {
			type.__setattr__(cls, newName, newMember);
			cls.get('__metas$' + gid).push(newName);
		})) {
			return;
		}
		else {
			type.__setattr__(cls, name, member);
		}
	};

});

/**
 * UI模块基类，所有UI组件的基本类
 */
this.Component = new Class(function() {

	this.__metaclass__ = exports.component;

	/**
	 * @param node 包装的节点
	 * @param options 配置
	 */
	this.initialize = function(self, node, options) {
		if (!node) {
			return;
		}

		self._node = dom.wrap(node);
		if (node.compoment) {
			console.error('一个元素只可以作为一个组件');
			return;
		}
		self._node.component = self;

		self.__nodeMap = {}; // 相应node的uid对应component，用于在需要通过node找到component时使用
		self.__rendered = {}; // 后来被加入的，而不是首次通过selector选择的node的引用

		if (!options) options = {};
		// 保存options，生成sub时用于传递
		self._options = exports.parseOptions(options);

		self.initMembers(self);

		self.init();
	};

	this.initMembers = classmethod(function(cls, self) {

		var gid = cls.get('gid');

		var subs = cls.get('__subs$' + gid).slice();
		var options = cls.get('__options$' + gid).slice();
		var handles = cls.get('__handles$' + gid).slice();
		var metas = cls.get('__metas$' + gid).slice();

		;(cls.__mixins__ || []).forEach(function(mixin) {
			var gid = mixin.get('gid');
			mixin.get('__subs$' + gid).forEach(function(item) {
				if (subs.indexOf(item) == -1) subs.push(item);
			});
			mixin.get('__options$' + gid).forEach(function(item) {
				if (options.indexOf(item) == -1) options.push(item);
			});
			mixin.get('__handles$' + gid).forEach(function(item) {
				if (handles.indexOf(item) == -1) handles.push(item);
			});
			mixin.get('__metas$' + gid).forEach(function(item) {
				if (metas.indexOf(item) == -1) metas.push(item);
			});
		});

		self.__subs = subs;
		self.__options = options;
		self.__handles = handles;
		self.__metas = metas;

		self.__subs.forEach(function(name) {
			self.get(name);
		});
		self.__options.forEach(function(name) {
			self.get(name);
		});
		self.__metas.forEach(function(name) {
			var member = cls.get(name);
			member.im_func.meta.bind(self, name);
		});
	});

	this.fireEvent = function(self) {
		return self._node.fireEvent.apply(self._node, Array.prototype.slice.call(arguments, 1));
	};

	this.addEvent = function(self) {
		return self._node.addEvent.apply(self._node, Array.prototype.slice.call(arguments, 1));
	};

	this.removeEvent = function(self) {
		return self._node.removeEvent.apply(self._node, Array.prototype.slice.call(arguments, 1));
	};

	/**
	 * 根据模板和选项生成一个节点
	 */
	this.createNode = function(self, template, options) {
		var node, result, data = {};
		// 组合options和defaultOption，生成node
		// 传进来的优先于defaultOption
		self.__defaultOptions.forEach(function(key) {
			if (!(key in options)) data[key] = self.get(key);
		});
		object.extend(data, options);
		result = string.substitute(template, data);
		node = dom.Element.fromString(result);
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
	 * 重置一个component，回到初始状态，删除所有render的元素。
	 */
	this._destory = function(self, methodName) {
		if (!methodName) methodName = 'destory'; // 兼容revert, reset方法名

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
					comp[methodName]();
				});
			} else if (self[name]) {
				self[name][methodName]();
			}
		});
	};

	/**
	 * 获取option的值
	 * 支持复杂name的查询
	 * @param name name
	 */
	this.getOption = function(self, name) {
		var parts = name.split('.');
		var value, current;
		if (parts.length == 1) {
			value = self.get(name);
		} else {
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

			exports.setOptionTo(self._options, parts, value);

			// 子引用已经建立，为子引用设置option
			if (self[parts[0]]) {
				arguments.callee(self[parts[0]], parts.slice(1), value);
			}

			// 为自己设置option
			if (parts.length == 1) {
				self.set(name, value);
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
		if (!!(sub.single? self[name] && self[name]._node.parentNode : self[name] && self[name][0] && self[name][0]._node.parentNode && self[name][0]._node.parentNode.nodeType != 11)) {
			return;
		}

		if (self[method2Name]) {
			nodes = self[method2Name](function() {
				return self.make(name, data);
			});
		} else if (self[methodName]) {
			nodes = self[methodName](data);
		} else {
			nodes = self.get(name);
		}

		// 如果有返回结果，说明没有使用self.make，而是自己生成了需要的普通node元素，则对返回结果进行一次包装
		if (nodes) {
			if (sub.single) {
				if (Array.isArray(nodes) || nodes.constructor === dom.Elements) throw '这是一个唯一引用元素，请不要返回一个数组';
				addRendered(self, name, nodes);
			} else {
				if (!Array.isArray(nodes) && nodes.constructor !== dom.Elements) throw '这是一个多引用元素，请返回一个数组';
				nodes = new dom.Elements(nodes);
				nodes.forEach(function(node) {
					addRendered(self, name, node);
				});
			}

			initSub(self, name, nodes);
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
		object.extend(options, extendOptions);

		if (data) {
			Object.keys(data).forEach(function(key) {
				options[key] = data[key];
			});
		}

		var node = self.createNode(options.template || sub.template, options);
		var comp = new sub.type(node, options);

		if (sub.single) {
			self[name] = comp;
			self[pname] = node;
		} else {
			self[name].push(comp);
			self[pname].push(node);
		}
		fillSub(self, name, comp);
		addRendered(self, name, node);

		return comp;
	};

	/**
	 * 设置subcomponent的template
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

	function addRendered(self, name, node) {
		var rendered = self.__rendered;
		if (!rendered[name]) rendered[name] = [];
		rendered[name].push(node);
	};

	function addNodeMap(self, name, id, comp) {
		var nodeMap = self.__nodeMap;
		if (!nodeMap[name]) nodeMap[name] = {};
		nodeMap[name][id] = comp;
	};

});

});
