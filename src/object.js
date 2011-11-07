/**
 * @namespace
 * @name object
 */
var object = new (/**@lends object*/ function(globalHost) {

var object = this;

/**
 * 遍历一个对象，返回所有的key的数组
 */
Object.keys = function(o) {
	var result = [];

	// 在Safari 5.0.2(7533.18.5)中，在这里用for in遍历parent会将prototype属性遍历出来，导致原型被指向一个错误的对象
	// 经过试验，在Safari下，仅仅通过 obj.prototype.xxx = xxx 这样的方式就会导致 prototype 变成自定义属性，会被 for in 出来
	// 而其他浏览器仅仅是在重新指向prototype时，类似 obj.prototype = {} 这样的写法才会出现这个情况
	// 因此，在使用时一定要注意
	for (var name in o) {
		if (o.hasOwnProperty(name)) {
			result.push(name);
		}
	}

	// for IE
	// 在IE下for in无法遍历出来修改过的call方法
	// 为什么允许修改call方法？对于一个class来说，没有直接Class.call的应用场景，任何Class都应该是new出来的，因此可以修改这个方法
	if (o.call !== undefined && o.call !== Function.prototype.call && result.indexOf('call') === -1) {
		result.push('call');
	}

	return result; 
};

Array.isArray = Array.isArray || function(o) {
	return Object.prototype.toString.call(o) === '[object Array]';
};

Array.prototype.forEach = Array.prototype.forEach || function(fn, bind) {
	for (var i = 0; i < this.length; i++) {
		fn.call(bind, this[i], i, this);
	}
};

Array.prototype.indexOf = Array.prototype.indexOf || function(str){
	for (var i = 0; i < this.length; i++) {
		if (str == this[i]) {
			return i;
		}
	}
	return -1;
};

Array.prototype.some = Array.prototype.some || function(fn, bind) {
	for (var i = 0, l = this.length; i < l; i++){
		if ((i in this) && fn.call(bind, this[i], i, this)) return true;
	}
	return false;
};

Array.prototype.every = Array.prototype.every || function(fn, bind){
	for (var i = 0, l = this.length; i < l; i++){
		if ((i in this) && !fn.call(bind, this[i], i, this)) return false;
	}
	return true;
};

Array.prototype.map = Array.prototype.map || function (fn, bind) {
	var results = [];
	for (var i = 0, l = this.length; i < l; i++){
		if (i in this) results[i] = fn.call(bind, this[i], i, this);
	}
	return results;
};

Array.prototype.filter = Array.prototype.filter || function(fn, bind){
	var results = [];
	for (var i = 0, l = this.length; i < l; i++){
		if ((i in this) && fn.call(bind, this[i], i, this)) results.push(this[i]);
	}
	return results;
};

Array.prototype.reduce = Array.prototype.reduce || function(fun /*, initialValue */) {
	"use strict";

	if (this === undefined || this === null)
		throw new TypeError();

	var t = Object(this);
	var len = t.length >>> 0;
	if (typeof fun !== "function")
		throw new TypeError();

	// no value to return if no initial value and an empty array
	if (len === 0 && arguments.length == 1)
		throw new TypeError();

	var k = 0;
	var accumulator;
	if (arguments.length >= 2) {
		accumulator = arguments[1];
	} else {
		do {
			if (k in t) {
				accumulator = t[k++];
				break;
			}

			// if array contains no values, no initial value to return
			if (++k >= len) {
				throw new TypeError();
			}

		} while (true);
	}

	while (k < len) {
		if (k in t)
			accumulator = fun.call(undefined, accumulator, t[k], k, t);
		k++;
	}

	return accumulator;
};

Array.prototype.reduceRight = Array.prototype.reduceRight || function(callbackfn /*, initialValue */) {
	"use strict";

	if (this === undefined || this === null)
		throw new TypeError();

	var t = Object(this);
	var len = t.length >>> 0;
	if (typeof callbackfn !== "function")
		throw new TypeError();

	// no value to return if no initial value, empty array
	if (len === 0 && arguments.length === 1)
		throw new TypeError();

	var k = len - 1;
	var accumulator;
	if (arguments.length >= 2) {
		accumulator = arguments[1];
	} else {
		do {
			if (k in this) {
				accumulator = this[k--];
				break;
			}

			// if array contains no values, no initial value to return
			if (--k < 0) {
				throw new TypeError();
			}
		}
		while (true);
	}

	while (k >= 0) {
		if (k in t)
			accumulator = callbackfn.call(undefined, accumulator, t[k], k, t);
		k--;
	}

	return accumulator;
};

String.prototype.trim = String.prototype.trim || function() {
	// High Performance JavaScript 中描述此方法较快
	return this.replace(/^\s\s*/, "").replace(/\s\s*$/, "");
};

/**
* 有些老页面引用了js/compact.js，其中有一个错误的Function.prototype.bind
*/
if (!Function.prototype.bind || Function.prototype.bind === window.__hualuOldBind) {
	Function.prototype.bind = function(object) {
		var method = this;
		return function() {
			method.apply(object, arguments); 
		};
	};
}

// 获取function的name
// 判断function TEST() 是否能取到name属性来选择不同的算法函数
if ((function TEST(){}).name) {
	Function.__get_name__ = function(func) {
		return func.name;
	};
// IE
} else {
	var funcNameRegExp = /^function ([\w$]+)/;
	Function.__get_name__ = function(func) {
		// IE 下没有 Function.prototype.name，通过代码获得
		var result = funcNameRegExp.exec(func.toString());
		if (result) return result[1];
		return '';
	};
}

/**
 * 为obj增加properties中的成员
 * @param obj 源
 * @param properties 目标
 * @param ov 是否覆盖，默认true
 */
this.extend = function(obj, properties, ov) {
	if (ov !== false) ov = true;

	for (var property in properties) {
		if (ov || obj[property] === undefined) {
			obj[property] = properties[property];
		}
	}
	if (properties && properties.hasOwnProperty('call')) {
		obj.call = properties.call;
	}

	return obj;
};

/**
 * 浅拷贝
 */
this.clone = function(obj) {
	var clone = {};
	for (var key in obj) clone[key] = obj[key];
	return clone;
};

/**
 * 将成员引用放到window上
 */
this.bind = function(host) {
	object.extend(host, object);
};


this._loader = null;

/**
 * use一个module
 * @borrows object.Loader.use
 */
this.use = function() {
	if (!object._loader) object._loader = new Loader();
	object._loader.use.apply(object._loader, arguments);
};

/**
 * 直接执行一个module，其 __name__ 为 __main__
 * @borrows object.Loader.execute
 */
this.execute = function() {
	if (!object._loader) object._loader = new Loader();
	object._loader.execute.apply(object._loader, arguments);
};

/**
 * 添加一个module
 * @borrows object.Loader.add
 */
this.add = function() {
	if (!object._loader) object._loader = new Loader();
	object._loader.add.apply(object._loader, arguments);
};

})(window);

(/**@lends _global_*/ function() {

// 仿照 mootools 的overloadSetter
// 返回一个 key/value 这种形式的function参数的包装，使其支持{key1: value1, key2: value2} 这种传参形式
var enumerables = true;
for (var i in {toString: 1}) enumerables = null;
if (enumerables) enumerables = ['hasOwnProperty', 'valueOf', 'isPrototypeOf', 'propertyIsEnumerable', 'toLocaleString', 'toString', 'constructor'];
var overloadSetter = function(func, usePlural) {
	return function(a, b) {
		if (a === null) return this;
		if (usePlural || typeof a != 'string') {
			for (var k in a) func.call(this, k, a[k]);
			if (enumerables) {
				for (var i = enumerables.length; i > 0; i--) {
					k = enumerables[i];
					if (a.hasOwnProperty(k)) func.call(this, k, a[k]);
				}
			}
		} else {
			func.call(this, a, b);
		}
		return this;
	};
};

/**
 * propery 特性支持getter函数，用法：
 * obj.get(prop_name)
 * 会被放到 cls.prototype.get
 */
var getter = function(prop) {
	var property = this.__properties__[prop];
	if (property && property.fget) {
		return property.fget.call(this.__this__, this);
	} else {
		throw 'get not defined property ' + prop;
	}
};

/**
 * propery 特性支持getter函数，用法：
 * obj.set(prop_name, value)
 * 会被放到 cls.prototype.set
 */
var setter = function(prop, value) {
	var property = this.__properties__[prop];
	if (property && property.fset) {
		property.fset.call(this.__this__, this, value);
	} else {
		throw 'set not defined property ' + prop;
	}
};

/**
 * 从类上获取成员
 * 会被放到cls.get
 */
var membergetter = function(name) {
	var cls = this;
	var proto = this.prototype;
	var properties = proto.__properties__;
	if (name in cls) return cls[name];
	if (name in properties) return properties[name];
	if (!name in proto) throw new Error('no member named ' + name + '.');
	var member = proto[name];
	if (!member) return member;
	if (member.__class__ == instancemethod) return instancemethod(member.im_func, this);
	return member;
};

/**
 * MyClass.set(name, value);
 * MyClass.set({name1: value1, name2: value2})
 * 会被放到 cls.set
 * 子类不会被覆盖
 */
var membersetter = overloadSetter(function(name, member) {
	var cls = this;
	var proto = cls.prototype;
	var properties = proto.__properties__;
	var subs = cls.__subclassesarray__;
	var constructing = cls.__constructing__;

	// 类构建完毕后才进行set，需要先删除之前的成员
	if (!constructing) {
		delete cls[name];
		delete proto[name];
		delete properties[name];
	}

	// 这里的member指向new Class参数的书写的对象/函数
	if (name == '@mixins') name = '__mixins__';

	if (['__new__', '__metaclass__', '__mixins__'].indexOf(name) != -1) {
		cls[name] = member;

	} else if (['__this__', '__base__'].indexOf(name) != -1) {
		cls[name] = proto[name] = member;

	// 有可能为空，比如 this.test = null 或 this.test = undefined 这种写法;
	} else if (member == null) {
		proto[name] = member;

	// 先判断最常出现的instancemethod
	// this.a = function() {}
	} else if (member.__class__ === undefined && typeof member == 'function') {
		// 这样赋值__name__，确保__name__都是被赋值在开发者所书写的那个function上，能够通过arguments.callee.__name__获取到。
		member.__name__ = name;
		proto[name] = instancemethod(member);
		proto[name].__name__ = name;
		// 初始化方法放在cls上，metaclass会从cls上进行调用
		if (name == 'initialize') {
			cls[name] = instancemethod(member, cls);
		}

	// this.a = property(function fget() {}, function fset() {})
	} else if (member.__class__ === property) {
		member.__name__ = name;
		properties[name] = member;

	// this.a = classmethod(function() {})
	} else if (member.__class__ === classmethod) {
		member.im_func.__name__ = name;
		member.__name__ = name;
		cls[name] = proto[name] = member;

	// this.a = staticmethod(function() {})
	} else if (member.__class__ === staticmethod) {
		member.im_func.__name__ = name;
		member.__name__ = name;
		cls[name] = proto[name] = member.im_func;

	// this.a = someObject
	} else {
		proto[name] = member;
	}

	// 所有子类cls上加入
	if (!constructing && name in cls && subs) {
		subs.forEach(function(sub) {
			if (!name in sub) sub.set(name, member);
		});
	}
});

/**
 * 对于支持defineProperty的浏览器，可考虑将此setter不设置任何动作
 */
var nativesetter = function(prop, value) {
	this[prop] = value;
};

/**
 * 获取一个类的子类
 * 会被放到 cls.__subclasses__
 */
var subclassesgetter = function() {
	return this.__subclassesarray__;
};

// IE不可以通过prototype = new Array的方式使function获得数组功能。
var _nativeExtendable = (function() {
	// IE和webkit没有统一访问方法（Array.forEach)，避免使用native extend
	if (!Array.push) return false;

	// 理论上走不到
	var a = function() {};
	a.prototype = new Array;
	var b = new a;
	b.push(null);
	return !!b.length;
})();

var ArrayClass, StringClass;

var type = this.type = function() {
};

/**
* 创建一个类的核心过程
*/
type.__new__ = function(metaclass, name, base, dict) {
	var cls = Class.create();

	cls.__constructing__ = true;

	// 继承的核心
	cls.prototype = Class.getInstance(base);
	cls.prototype.constructor = cls;
	// Array / String 没有 subclass，需要先判断一下是否存在 subclassesarray
	if (base.__subclassesarray__) base.__subclassesarray__.push(cls);

	// Propeties
	var proto = cls.prototype;
	// 有可能已经继承了base的__properties__了
	var baseProperties = proto.__properties__ || {};
	proto.__properties__ = object.extend({}, baseProperties);

	if (base !== type) {
		for (var property in base) {
			// 过滤双下划线开头的系统成员和私有成员
			if (property.indexOf('__') != 0 && cls[property] === undefined) {
				cls[property] = base[property];
			}
		}
	}
	cls.set('__base__', base);
	// 支持 this.parent 调用父级同名方法
	cls.set('__this__', {
		base: base,
		parent: function() {
			// 一定是在继承者函数中调用，因此调用时一定有 __name__ 属性
			var name = arguments.callee.caller.__name__;
			return cls.__base__.get(name).apply(cls.__base__, arguments);
		}
	});
	cls.__new__ = base.__new__;
	cls.__metaclass__ = base.__metaclass__;

	// Dict
	cls.set(dict);

	// Mixin
	var mixins = cls.__mixins__;
	if (mixins) {
		mixins.forEach(function(mixin) {
			Class.keys(mixin).forEach(function(name) {
				if (cls.get(name)) return; // 不要覆盖自定义的

				var member = mixin.get(name);

				if (typeof member == 'function' && member.__class__ === instancemethod) {
					cls.set(name, member.im_func);
				} else {
					cls.set(name, member);
				}
			});
		});
	}
	delete cls.__constructing__;

	cls.__dict__ = dict;
	cls.prototype.get = getter;
	cls.prototype.set = setter;
	cls.prototype._set = nativesetter;

	return cls;
};

type.initialize = function() {
};

// 类
var Class = this.Class = function() {
	var length = arguments.length;
	if (length < 1) throw new Error('bad arguments');
	// 父类
	var base = length > 1? arguments[0] : type;
	if (base) {
		// IE不能extend native function，用相应的class包装一下
		if (!_nativeExtendable) {
			if (base === Array) {
				base = ArrayClass;
			} else if (base === String) {
				base = StringClass;
			}
		}
	}

	// 构造器
	var dict = arguments[length - 1];
	if (dict instanceof Function) {
		var f = dict;
		dict = {};
		f.call(dict);
	}

	// metaclass
	var metaclass = dict.__metaclass__ || base.__metaclass__ || type;

	var cls = metaclass.__new__(metaclass, null, base, dict);
	metaclass.initialize(cls, null, base, dict);

	return cls;
};

Class.create = function() {
	var cls = function() {
		if (cls.__prototyping__) return this;
		this.__class__ = cls;
		Class.initMixins(cls, this);
		var value = this.initialize? this.initialize.apply(this, arguments) : null;
		return value;
	};
	cls.__subclassesarray__ = [];
	cls.__subclasses__ = subclassesgetter;
	cls.__mixin__ = cls.set = membersetter;
	cls.get = membergetter;
	return cls;
};

/**
* mixin时调用mixin的initialize方法，保证其中的初始化成员能够被执行
*/
Class.initMixins = function(cls, instance) {
	if (!cls.__mixins__) {
    	return;
    }
    for (var i = 0, l = cls.__mixins__.length, mixin; i < l; i++) {
    	mixin = cls.__mixins__[i];
    	if (mixin.prototype.initialize) mixin.prototype.initialize.call(instance);
    }
	
};

/**
 * 在new Class的callback中mixin
 * var MyClass = new Class(function() {
 *	Class.mixin(this, AnotherClass);
 * })
 */
Class.mixin = function(dict, cls) {
	dict.__mixins__ = dict.__mixins__ || [];
	dict.__mixins__.push(cls);
};

Class.hasProperty = function(obj, name) {
	return (name in obj.__properties__);
};

/**
 * 所有properties
 */
Class.getPropertyNames = function(obj) {
	return Object.keys(obj.__properties__);
};

/**
 * 将host注射进class，使其self指向host
 * @param cls 被注射的class
 * @param host 注射进去的对象
 * @param args 构造的参数
 */
Class.inject = function(cls, host, args) {
	args = args || [];
	host.__class__ = cls;
	host.__properties__ = cls.prototype.__properties__;
	var p = Class.getInstance(cls);
	object.extend(host, p);
	Class.initMixins(cls, host);
	if (cls.prototype.initialize) cls.prototype.initialize.apply(host, args);
};

/**
 * 获取一个class的继承链
 */
Class.getChain = function(cls) {
	var result = [cls];
	while (cls.__base__) {
		result.push(cls.__base__);
		cls = cls.__base__;
	}
	return result;
};

// 获取父类的实例，用于 cls.prototype = new parent
Class.getInstance = function(cls) {
	if (cls === Array || cls === String) return new cls;
	cls.__prototyping__ = true;
	var instance = new cls();
	delete cls.__prototyping__;
	return instance;
};

/**
 * 将一个类的所有子类形成平面数组返回
 * 会在Class.mixin中用到
 */
Class.getAllSubClasses = function(cls) {
    var array = cls.__subclassesarray__;
    if(!array) {
        return [];
    }
    var queue = [].concat(array), ele=queue.shift(), subs;
    while(ele != null) {
    	subs = ele.__subclassesarray__;
    	if(subs != null) {
    		queue = queue.concat(subs);
    		array = array.concat(subs);
    	}
    	ele = queue.shift();
    }
	return array;
};

/**
* 遍历一个类成员
* 获取类成员通过cls.get(name)
*/
Class.keys = function(cls) {
	keys = Object.keys(cls.prototype.__properties__);
	keys = keys.concat(Object.keys(cls.prototype).filter(function(name) {
		// 这3个需要过滤掉，是为了支持property加入的内置成员
		// initialize也需要过滤，当mixin多个class的时候，initialize默认为最后一个，这种行为没意义
		// 过滤掉双下划线命名的系统成员和私有成员
		return !(['get', 'set', '_set', 'initialize', 'constructor'].indexOf(name) !== -1 || name.indexOf('__') == 0);
	}));
	return keys;
};

var instancemethod = function(func, cls) {
	var wrapper = cls? function() {
		return cls.prototype[func.__name__].im_func.apply(cls.__this__, arguments);
	} : function() {
		var args = [].slice.call(arguments, 0);
		args.unshift(this);
		return func.apply(this.__this__, args);
	};
	wrapper.__class__ = arguments.callee;
	wrapper.im_func = func;
	return wrapper;
};

var staticmethod = this.staticmethod = function(func) {
	var wrapper = function() {};
	wrapper.__class__ = arguments.callee;
	wrapper.im_func = func;
	return wrapper;
};

var classmethod = this.classmethod = function(func) {
	var wrapper = function() {
		var args = [].slice.call(arguments, 0);
		var cls;
		if (typeof this == 'function') {
			args.unshift(this);
			return this.prototype[func.__name__].im_func.apply(this.__this__, args);
		} else {
			cls = this.__class__;
			args.unshift(cls);
			return func.apply(cls.__this__, args);
		}
	};
	wrapper.__class__ = arguments.callee;
	wrapper.im_func = func;
	return wrapper;
};

var property = this.property = function(fget, fset) {
	var p = {};
	p.__class__ = arguments.callee;
	p.fget = fget;
	p.fset = fset;
	return p;
};

// 获取一个native function的class形式用于继承
var createNativeClass = function(source, methodNames) {
	var cls = new Class(function() {
		for (var i = 0, l = methodNames.length; i < l; i++) {
			this[methodNames[i]] = (function(name) {
				return function() {
					return source.prototype[name].apply(arguments[0], [].slice.call(arguments, 1));
				};
			})(methodNames[i]);
		}
	});
	return cls;
};

ArrayClass = createNativeClass(Array, ["concat", "indexOf", "join", "lastIndexOf", "pop", "push", "reverse", "shift", "slice", "sort", "splice", "toString", "unshift", "valueOf", "forEach", "some", "every", "map", "filter", "reduce", "reduceRight"]);
ArrayClass.prototype.length = 0;
StringClass = createNativeClass(String, ["charAt", "charCodeAt", "concat", "indexOf", "lastIndexOf", "match", "replace", "search", "slice", "split", "substr", "substring", "toLowerCase", "toUpperCase", "valueOf"]);

})();

(/**@lends object*/ function() {

/**
 * object的包管理器
 * 这个class依赖于object._lib ，且会修改它
 * @class
 */
this.Loader = new Class(/**@lends object.Loader*/ function() {

	// 模块
	function Module(name) {
		this.__name__ = name;
	}
	Module.prototype.toString = function() {
		return '<module \'' + this.__name__ + '\'>';
	};

	// 找不到模块Error
	function NoModuleError(name) {
		this.message = 'no module named ' + name;
	};
	NoModuleError.prototype = new Error();

	this.scripts = document.getElementsByTagName('script');

	this.initialize = function(self) {
		self.useCache = true;
		// 所有use都会默认use的模块，需要注意循环引用问题
		self.lib = {};
		self.anonymousModuleCount = 0;

		self.add('sys', function(exports) {
		});
	};

	/**
	 * 查找页面中的标记script标签，更新 self.lib
	 */
	this.loadLib = function(self) {
		var scripts = self.scripts;
		for (var i = 0, script, module, l = scripts.length; i < l; i++) {
			script = scripts[i];
			module = script.getAttribute('data-module');
			if (!module) continue;
			//self.lib中的内容可能是makePrefixPackage构造的，只有name
			//在模块a.b先声明，模块a后声明的情况下，无法获取模块a的内容
			if (self.lib[module] && (self.lib[module].fn || self.lib[module].file)) {
				continue;
			}

			// 建立前缀package
			self.makePrefixPackage(module);

			self.lib[module] = {file: script.getAttribute('data-src'), name: module};
		}
	};

	/**
	 * 建立前缀模块
	 * 比如 a.b.c.d ，会建立 a/a.b/a.b.c 三个空模块，最后一个模块为目标模块，不为空，内容为context
	 */
	this.makePrefixPackage = function(self, name) {
		var names = name.split('.');
		for (var i = 0, prefix, l = names.length - 1; i < l; i++) {
			prefix = names.slice(0, i + 1).join('.');
			// 说明这个module是空的
			if (self.lib[prefix] == undefined) self.lib[prefix] = {
				name: prefix
			};
		}
	};

	/**
	 * 加载一个script, 执行callback
	 * 有冲突检测，如果连续调用两次loadScript同一src的话，则第二个调用会等第一个完毕后直接执行callback，不会加载两次。
	 *
	 * @param src 地址
	 * @param callback callback函数
	 */
	this.loadScript = classmethod(function(cls, src, callback, useCache) {
		useCache = !!useCache;
		var ele;

		if (useCache) {
			var scripts = cls.get('scripts');
			for (var i = 0, script, l = scripts.length; i < l; i++) {
				script = scripts[i];
				//src有可能是相对路径，而script.src是绝对路径，导致不一致
				if (script.src && 
						(script.src.indexOf(src) == script.src.length - src.length)) {
					ele = script;
					// 连续调用，此脚本正在加载呢
					if (scripts[i].loading) {
						// 增加一个回调即可
						ele.callbacks.push(callback);
					} else {
						callback(ele);
					}
					return;
				}
			}
		}

		ele = document.createElement('script');
		ele.type = "text/javascript";
		ele.src = src;
		ele.async = true;
		ele.loading = true;
		ele.callbacks = [];

		var doCallback = function() {
			ele.loading = null;
			ele.callbacks.forEach(function(callback) {
				callback(ele);
			});
			for(var i=0,l=ele.callbacks.length; i<l; i++) {
				ele.callbacks[i] = null;
			}
			ele.callbacks = null;
		};

		ele.callbacks.push(callback);

		if (window.ActiveXObject) { // IE
			ele.onreadystatechange = function() {
				var rs = this.readyState;
				if ('loaded' === rs || 'complete' === rs) {
					ele.onreadystatechange = null;
					doCallback();
				}
			};

		} else if (ele.addEventListener) { // Standard
			ele.addEventListener('load', doCallback, false);
			ele.addEventListener('error', doCallback, false);

		} else { // Old browser
			ele.onload = ele.onerror = doCallback;
		}

		document.getElementsByTagName('head')[0].insertBefore(ele, null);

	});

	/**
	 * context 执行方法
	 * @param pkg 被执行的pkg
	 * @param modules 保存了此次use运行过程中用到的所有module
	 * @param stack 保存了模块的依赖路径的栈，检测循环依赖
	 * @param callback 异步方法，执行完毕后调用
	 * @param options 可选，可用来定制name
	 */
	this.executeModule = function(self, pkg, modules, stack, callback, options) {
		if (!options) options = {};

		var exports = new Module(options.name || pkg.name);
		// sys.modules
		if (exports.__name__ === 'sys') exports.modules = modules;

		// 最后传进context的参数
		var args = [exports];

		var done = function() {
			// 空package不需要
			if (pkg.fn) {
				var returnValue = pkg.fn.apply(exports, args);
				if (returnValue) {
					if (typeof returnValue === 'object' || typeof returnValue === 'function') {
						returnValue.toString = Module.prototype.toString;
						returnValue.__name__ = exports.__name__;
					}
					exports = returnValue;
				}
			}

			// 不输出 __name__ 了，没有大用且影响性能，应该在创建时就指定name
			//Object.keys(exports).forEach(function(key) {
				//if (typeof exports[key] == 'function') {
					//exports[key].__name__ = key;
				//}
			//});

			if (callback) callback(exports);
		};

		// file
		if (!pkg.fn && pkg.file) {
			self.loadScript(pkg.file, function() {
				loadNext(0);
			}, true);
			return;

		// 在空package或没有uses的情况下直接返回即可。
		} else if (!pkg.fn || pkg.uses.length === 0) {
			done();
			return;
		}

		// 主递归函数
		function loadNext(i) {

			var use = pkg.uses[i];

			// 循环依赖判断
			stack.push(use); // 开始获取use这个module
			if (stack.indexOf(use) != stack.length - 1) { // 正在获取的这个module在stack中之前已经获取过了
				var error = new Error('circular dependencies. [' + stack.join(',') + ']');
				error.stack = stack;
				throw error;
			}
			self.getModule(use, modules, stack, function() {
				stack.pop(); // 此module获取完毕
				var names, root, member;

				names = use.split('.');
				root = modules[names[0]];

				if (args.indexOf(root) == -1) args.push(root);

				if (i < pkg.uses.length - 1) {
					loadNext(i + 1);
				} else if (i == pkg.uses.length - 1) {
					done();
				}

			});

		};

		loadNext(0);

	};

	/**
	 * 通过一个模块名，获得到相对应的模块对象并通过callback返回
	 *
	 * @param name pkg name
	 * @param modules 已引入的module对象列表，会传递给 execute 方法，可以通过sys.modules获取
	 * @param callback 模块获取到以后，通过callback的第一个参数传递回去
	 * @returns 最终引入的模块
	 */
	this.getModule = function(self, name, modules, stack, callback) {
		var names = name.split('.');

		/**
		 * @param i
		 * @param pname 上一个module的name
		 */
		function loadNext(i, pname) {
			var prefix = names.slice(0, i + 1).join('.');
			console.log(prefix);
			name = names[i];

			var next = function(exports) {
				modules[prefix] = exports;

				if (pname) modules[pname][name] = modules[prefix];

				if (i < names.length - 1) {
					loadNext(i + 1, prefix);
				} else if (i == names.length - 1) {
					callback(modules[prefix]);
				}
			};

			// 使用缓存中的
			if (modules[prefix]) {
				next(modules[prefix]);

			// lib 中有
			} else if (self.lib[prefix]) {
				var pkg = self.lib[prefix];

				// lib中有，但是是file，需要动态加载
				if (pkg.file) {
					// 文件加载完毕后，其中执行的 add 会自动把 self.lib 中的对象替换掉，file 属性丢失，加入了 execute/name/uses 等属性
					// 使用缓存
					self.loadScript(pkg.file, function() {
						self.executeModule(pkg, modules, stack, next);
					}, true);

				// 也有可能是空的模块，是没有 fn 的，executeModule会处理
				} else {
					self.executeModule(pkg, modules, stack, next);
				}

			// lib中没有
			} else {
				throw new NoModuleError(prefix);
			}

		};

		loadNext(0);
	};

	/**
	 * 处理传入的uses参数
	 * 在getUses阶段不需要根据名称判断去重（比如自己use自己），因为并不能避免所有冲突，还有循环引用的问题（比如 core use dom, dom use core）
	 *
	 * @param uses 输入
	 * @param ignore 跳过ignore模块，用来避免自己调用自己
	 */
	this.getUses = function(self, uses, ignore) {
		if (typeof uses == 'string') {
			uses = uses.split(/\s*,\s*/ig);
		}

		// 过滤自己调用自己
		uses = uses.filter(function(use) {
			return use != ignore;
		});

		return uses;
	};

	/**
	 * 传入context，context的参数会包含use进来的module
	 * 创造一个context，内部通过 this.xxx 设置的成员都会在这个 context 下。
	 * @param name 名称
	 * @param uses 用逗号分隔开的模块名称列表
	 * @param context 这个function会在调用module时调用，并将module通过参数传入context，第一个参数为exports，后面的参数为每个module的不重复引用，顺序排列
	 */
	this.add = function(self, name, uses, context) {
		// 不允许重复添加。
		if (self.lib[name] && self.lib[name].fn) return null;

		// uses 参数是可选的
		if (typeof uses == 'function') {
			context = uses;
			uses = [];
		} else {
			uses = self.getUses(uses, name);
		}

		if (context && self.lib[name] && self.lib[name].file) {
			delete self.lib[name].file;
			self.lib[name].fn = context;
			self.lib[name].uses = uses;
			return;
		}
		// 建立前缀占位模块
		self.makePrefixPackage(name);

		// lib中存储的是function
		// 注意别给覆盖了，有可能是有 file 成员的
		var pkg = self.lib[name];
		if (!pkg) pkg = self.lib[name] = {};
		pkg.name = name;
		pkg.uses = uses;
		pkg.fn = context;

		return pkg;
	};

	/**
	 * use
	 * @param uses 用逗号分隔开的模块名称列表
	 * @param context uses加载后调用，将module通过参数传入context，第一个参数为exports，后面的参数为每个module的不重复引用，顺序排列
	 */
	this.use = function(self, uses, context) {
		self.loadLib();

		var name = '__anonymous_' + self.anonymousModuleCount + '__';
		self.anonymousModuleCount++;
		var module = self.add(name, uses, context);

		// 第二个{}参数会被所有相关module通过第一个 exports 参数获取到，实现module获取调用者的信息
		// 之前是直接将window代替exports传递进去，但是在module初始化完毕后会有一个遍历赋值__name__的过程，会导致IE6下出错，且遍历window也会有性能问题
		// 因此改为传入exports，然后在extend到window上。
		// 经验是，不要用一个已经有内容、不可控的对象作为executeModule的exports。
		self.executeModule(module, {}, [], function(exports) {
			for (var property in exports) {
				if (property != '__name__' && window[property] === undefined) window[property] = exports[property];
			}
		}, {name: '__main__'});
	};

	/**
	 * execute
	 * @param name 执行的入口模块名称
	 * @param options 传入参数
	 */ 
	this.execute = function(self, name) {
		self.loadLib();

		var module = self.lib[name];
		if (!module) throw new NoModuleError(name);

		self.executeModule(module, {}, [], null, {name: '__main__'});
	};

});

})();

