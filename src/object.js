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
	// 在Safari 5.0.2(7533.18.5)中，在这里用for in遍历parent会将prototype属性遍历出来，导致原型被指向一个错误的对象
	// 经过试验，在Safari下，仅仅通过 obj.prototype.xxx = xxx 这样的方式就会导致 prototype 变成自定义属性，会被 for in 出来
	// 而其他浏览器仅仅是在重新指向prototype时，类似 obj.prototype = {} 这样的写法才会出现这个情况
	// 因此，在使用时一定要注意

	var result = [];

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

// prototyping标识符，有此标识符标识则代表new一个类时是为了继承而new的
// 这个变量需要放到window上，避免重复加载object.js时重复声明的问题
if (!window.PROTOTYPING) window.PROTOTYPING = {foo: true};

(/**@lends _global_*/ function() {

// 仿照 mootools 的overloadSetter，返回一个 key/value 这种形式的function参数的包装，使其支持{key1: value1, key2: value2} 这种形式
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
		return property.fget.call(this.__class__.__this__, this);
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
		property.fset.call(this.__class__.__this__, this, value);
	} else {
		throw 'set not defined property ' + prop;
	}
};

/**
 * 对于支持defineProperty的浏览器，可考虑将此setter不设置任何动作
 */
var nativesetter = function(prop, value) {
	this[prop] = value;
};

/**
 * 动态mixin的方法。可以通过任意class的mixin调用
 * MyClass.__mixin__(name, value);
 * MyClass.__mixin__({name1: value1, name2: value2})
 * 会被放到 cls.__mixin__
 */
var mixiner = overloadSetter(function(name, member) {
	// 通过mixin创建新的成员，而不是修改已存在的成员，需要在继承链上所有的class实现
	// 由于ie没有 __proto__ 属性，因此需要遍历，否则可以通过
	// SubClass.__proto__ = Parent
	// 实现自动的继承机制
	if (!(name in this.prototype)) {
		var classes = Class.getAllSubClasses(this); 
		classes.forEach(function(one) {
			Class.buildMember(one, name, member);
		});
	}
	// member有可能是方法，也有可能是属性，需要每次都进行mixin的，而不是仅仅在没有此成员时进行mixin，否则将无法修改属性
	Class.buildMember(this, name, member);
	Class.buildPrototype(this, name, member);
});

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
type.__new__ = function(cls, name, base, members) {

	var mixins = members['@mixins'];
	if (mixins) {
		mixins.forEach(function(mixin) {
			Class.mixin(members, mixin);
		});
	}

	// 继承的核心
	cls.prototype = Class.getInstance(base);
	cls.prototype.constructor = cls;
	// Array / String 没有 subclass，需要先判断一下是否存在 subclassesarray
	if (base.__subclassesarray__) base.__subclassesarray__.push(cls);

	// Propeties
	var prototype = cls.prototype;
	// 有可能已经继承了base的__properties__了
	var baseProperties = prototype.__properties__ || {};
	prototype.__properties__ = object.extend({}, baseProperties);

	// base就两个成员，initialize和__new__，就不for in影响性能了
	if (base !== type) {
		for (var property in base) {
			// 过滤双下划线开头的系统成员和私有成员
			if (property.indexOf('__') != 0 && cls[property] === undefined) {
				cls[property] = base[property];
			}
		}
	}
	cls.__new__ = base.__new__;
	cls.__metaclass__ = base.__metaclass__;

	// Members
	Object.keys(members).forEach(function(name) {
		var member = members[name];
		Class.buildPrototype(cls, name, member);
		Class.buildMember(cls, name, member);
	});

	cls.__base__ = base;
	cls.__members__ = members;
	cls.__subclassesarray__ = [];
	cls.__subclasses__ = subclassesgetter;
	cls.__mixin__ = mixiner;
	// 支持 this.parent 调用父级同名方法
	cls.__this__ = {
		mixining: null,
		base: cls.__base__,
		parent: function() {
			// 一定是在继承者函数中调用，因此调用时一定有 __name__ 属性
			var name = arguments.callee.caller.__name__;
			return cls.__base__[name].apply(cls.__base__, arguments);
		}
	};
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
	// cls
	var cls = Class.create();
	// 父类
	var base = Class.initBase(length > 1? arguments[0] : type);
	// 构造器
	var members = Class.initMembers(arguments[length - 1]);
	// metaclass
	var metaclass;
	if (members.__metaclass__) metaclass = members.__metaclass__;
	else if (base.__metaclass__) metaclass = base.__metaclass__;
	else metaclass = type;

	cls = metaclass.__new__(cls, null, base, members);
	metaclass.initialize(cls, null, base, members);

	return cls;
};

Class.create = function() {
	var cls = function(prototyping) {
		if (prototyping === PROTOTYPING) return this;
		this.__class__ = cls;
		Class.initMixins(cls, this);
		var value = this.initialize? this.initialize.apply(this, arguments) : null;
		return value;
	};
	return cls;
};

/**
* 针对不能extend native function的浏览器，转换相应native function为Class
*/
Class.initBase = function(base) {
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
	return base;
};

/**
* 将用户书写的function类members变成object
*/
Class.initMembers = function(members) {
	if (members instanceof Function) {
		var f = members;
		members = {};
		f.call(members);
	}
	return members;
};

/**
* mixin时调用mixin的initialize方法，保证其中的初始化成员能够被执行
*/
Class.initMixins = function(cls, instance) {
	var mixin;
	if (cls.__mixins__) {
		for (var i = 0, l = cls.__mixins__.length; i < l; i++) {
			mixin = cls.__mixins__[i];
			mixin.__this__.mixining = cls;
			if (mixin.initialize) mixin.initialize(instance);
			mixin.__this__.mixining = null;
		}
	}
};


/**
 * 生成类的所有class成员
 * 所有的class对应到prototype上的method都是通过这个方法获得的
 * 可以动态根据prototype中方法的类型传递不同参数
 * 用一个统一的方法虽然会在调用的时候影响效率，但是提高了mixin时的效率，使得通过AClass.__mixin__覆盖某已存在方法时不需要修改所有subclasses的对应方法了
 */
Class.buildMember = function(cls, name, member) {
	if (name == '__metaclass__' || typeof member != 'function') {
		cls[name] = member;
	} else {
		cls[name] = function(self) {
			var prototype = this.prototype[name];
			var func = prototype.im_func;
			var args;

			if (prototype.__class__ === instancemethod) {
				return func.apply(this.__this__, arguments);

			} else if (prototype.__class__ === classmethod) {
				args = [].slice.call(arguments, 0);
				args.unshift(this); // 第一个参数是cls
				return func.apply(this.__this__, args);

			} else { // staticmethod
				return func.apply(this.__this__, arguments);
			}
		};
	}
};

/**
 * 在创建类的过程中生成类的所有prototype
 */
Class.buildPrototype = function(cls, name, member) {
	var prototype = cls.prototype;

	// 这里的member指向new Class参数的书写的对象/函数

	// 有可能为空，比如 this.test = null 或 this.test = undefined 这种写法;
	if (member == null) {
		prototype[name] = member;

	// 先判断最常出现的instancemethod
	} else if (member.__class__ === undefined && typeof member == 'function') { // this.a = function() {}
		// 这样赋值__name__，确保__name__都是被赋值在开发者所书写的那个function上，能够通过arguments.callee.__name__获取到。
		member.__name__ = name;
		prototype[name] = instancemethod(member);

	} else if (member.__class__ === classmethod) { // this.a = classmethod(function() {})
		member.im_func.__name__ = name;
		prototype[name] = member;

	} else if (member.__class__ === staticmethod) { // this.a = staticmethod(function() {})
		member.im_func.__name__ = name;
		prototype[name] = member;

	} else if (member.__class__ === property) { // this.a = property(function fget() {}, function fset() {})
		member.__name__ = name;
		prototype.__properties__[name] = member;

	} else { // this.a = someObject
		prototype[name] = member;
	}

};

/**
 * 在new Class的callback中mixin
 * var MyClass = new Class(function() {
 *	Class.mixin(AnotherClass);
 * })
 */
Class.mixin = function(members, cls) {

	if (!members.__mixins__) members.__mixins__ = [];
	members.__mixins__.push(cls);

	Object.keys(cls.prototype).forEach(function(name) {

		// 这3个需要过滤掉，是为了支持property加入的内置成员
		// initialize也需要过滤，当mixin多个class的时候，initialize默认为最后一个，这种行为没意义
		// 过滤掉双下划线命名的系统成员和私有成员
		if (['get', 'set', 'initialize'].indexOf(name) !== -1 || name.indexOf('__') == 0) return;
		if (members[name] !== undefined) return; // 不要覆盖自定义的

		var member = cls.prototype[name];

		if (typeof member == 'function') {
			if (member.__class__ === instancemethod) {
				members[name] = member.im_func;
			} else {
				members[name] = member;
			}
		} else {
			members[name] = member;
		}
	});

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
	if (!args) args = [];
	host.__class__ = cls;
	host.__properties__ = cls.prototype.__properties__;
	var p = Class.getInstance(cls);
	object.extend(host, p);
	args.unshift(host);
	Class.initMixins(cls, host);
	if (cls.initialize) cls.initialize.apply(cls, args);
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
	return new cls(window.PROTOTYPING);
};

/**
 * 将一个类的所有子类形成平面数组返回
 * 会在Class.mixin中用到
 */
Class.getAllSubClasses = function(cls, array) {
	if (!array) array = [];
	else array.push(cls);
	var subs = cls.__subclassesarray__;
	for (var i = 0, l = subs.length; i < l; i++) arguments.callee(subs[i], array);
	return array;
};


var instancemethod = function(func) {
	var wrapper = function() {
		var args = [].slice.call(arguments, 0);
		args.unshift(this);
		return func.apply(this.__class__.__this__, args);
	};
	wrapper.__class__ = arguments.callee;
	wrapper.im_func = func;
	return wrapper;
};

var staticmethod = this.staticmethod = function(func) {
	var wrapper = function() {
		return func.apply(this.__class__.__this__, arguments);
	};
	wrapper.__class__ = arguments.callee;
	wrapper.im_func = func;
	return wrapper;
};

var classmethod = this.classmethod = function(func) {
	var wrapper = function() {
		var args = [].slice.call(arguments, 0);
		var cls = this.__class__;
		args.unshift(cls);
		return func.apply(cls.__this__, args);
	};
	wrapper.__class__ = arguments.callee;
	wrapper.im_func = func;
	return wrapper;
};

var property = this.property = function(fget, fset) {
	var p = function () {};
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

	var _lib;

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

		_lib = self.lib;

		self.add('sys', function(exports) {
		});
	};

	/**
	 * 查找页面中的标记script标签，更新 _lib
	 */
	this.loadLib = function(self) {
		var scripts = self.scripts;
		for (var i = 0, script, module, l = scripts.length; i < l; i++) {
			script = scripts[i];
			module = script.getAttribute('data-module');
			if (!module) continue;
			if (_lib[module]) continue;

			// 建立前缀package
			self.makePrefixPackage(module);

			_lib[module] = {file: script.getAttribute('data-src'), name: module};
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
			if (_lib[prefix] == undefined) _lib[prefix] = {
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
			var scripts = cls.scripts;
			for (var i = 0, script, l = scripts.length; i < l; i++) {
				script = scripts[i];
				if (script.src == src) {
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
					returnValue.prototype.toString = Module.prototype.toString;
					returnValue.prototype.constructor = Module;
					returnValue.__name__ = exports.__name__;
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
			} else if (_lib[prefix]) {
				var pkg = _lib[prefix];

				// lib中有，但是是file，需要动态加载
				if (pkg.file) {
					// 文件加载完毕后，其中执行的 add 会自动把 _lib 中的对象替换掉，file 属性丢失，加入了 execute/name/uses 等属性
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
		if (_lib[name] && _lib[name].fn) return null;

		// uses 参数是可选的
		if (typeof uses == 'function') {
			context = uses;
			uses = [];
		} else {
			uses = self.getUses(uses, name);
		}

		// 建立前缀占位模块
		self.makePrefixPackage(name);

		// lib中存储的是function
		// 注意别给覆盖了，有可能是有 file 成员的
		var pkg = _lib[name];
		if (!pkg) pkg = _lib[name] = {};
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

		var module = _lib[name];
		if (!module) throw new NoModuleError(name);

		self.executeModule(module, {}, [], null, {name: '__main__'});
	};

});

})();

object.bind(window);
