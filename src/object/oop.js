/**
 * OOP
 */
;(function(object) {

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
	// property
	if (property) {
		if (property.fget) {
			return property.fget.call(this.__this__, this);
		}
		else {
			throw new Error('get not allowed property ' + prop);
		}
	}
	// 已存在此成员
	else if (this[prop]) {
		return this[prop];
	}
	// 调用getattr
	else if (this.__getattr__) {
		this.__getattr__.call(this, prop);
	}
	// 无此成员，报错
	else {
		throw new Error('member not found ' + prop);
	}
};

/**
 * propery 特性支持getter函数，用法：
 * obj.set(prop_name, value)
 * 会被放到 cls.prototype.set
 */
var setter = overloadSetter(function(prop, value) {
	if (Class.hasMember(this.__class__, '__setattr__')) {
		this.__class__.get('__setattr__')(this, prop, value);
	} else {
		object.__setattr__(this, prop, value);
	}
});

object.__setattr__ = function(obj, prop, value) {
	var property = obj.__properties__[prop];
	// 此prop不是property，直接赋值即可。
	if (!property) {
		obj[prop] = value;
	}
	// 有fset
	else if (property.fset) {
		property.fset.call(obj.__this__, obj, value);
	}
	// 未设置fset，不允许set
	else {
		throw 'set not allowed property ' + prop;
	}
}

/**
 * 从类上获取成员
 * 会被放到cls.get
 */
var membergetter = function(name) {
	if (name == '@mixins') name = '__mixins__';
	var cls = this;
	var proto = this.prototype;
	var properties = proto.__properties__;
	if (name in cls) return cls[name];
	if (properties && name in properties) return properties[name];
	if (!name in proto) throw new Error('no member named ' + name + '.');
	var member = proto[name];
	if (!member) return member;
	if (member.__class__ == instancemethod) return instancemethod(member.im_func, this);
	return member;
};

/**
 * 判断是否存在成员
 * 会被放到cls.has
 */
var memberchecker = function(name) {
	if (name == '@mixins') name = '__mixins__';
	var proto = this.prototype;
	var properties = proto.__properties__;
	return (name in this || name in proto || (properties && name in properties));
};

/**
 * MyClass.set(name, value);
 * MyClass.set({name1: value1, name2: value2})
 * 会被放到 cls.set
 * 子类不会被覆盖
 */
var membersetter = overloadSetter(function(name, member) {
	if (Class.hasMember(this.__class__, '__setattr__')) {
		this.__class__.get('__setattr__')(this, name, member);
	} else {
		type.__setattr__(this, name, member);
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

type.get = membergetter;
type.has = memberchecker;
type.set = membersetter;

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
			// 这里必须取一个cls的别名，否则在while循环中赋值的cls会影响所有的parent方法调用
			var clsAlias = cls;
			// 一定是在继承者函数中调用，因此调用时一定有 __name__ 属性
			var name = arguments.callee.caller.__name__;
			if (!name) {
				throw new Error('can not get function name when this.parent called');
			}

			// parent应该调用“代码书写的方法所在的类的父同名方法”
			// 而不是方法调用者实例的类的父同名方法
			// 比如C继承于B继承于A，当C的实例调用从B继承来的某方法时，其中调用了this.parent，应该直接调用到A上的同名方法，而不是B的。
			// 因此，这里通过hasOwnProperty，从当前类开始，向上找到同名方法的原始定义类
			while (clsAlias && !clsAlias.prototype.hasOwnProperty(name)) {
				clsAlias = clsAlias.__base__;
			}

			var base = clsAlias.__base__;
			var mixins = clsAlias.__mixins__;
			var member, owner;

			// 先从base中找同名func
			if (base && base.get && base.has(name)) {
				owner = base;
				member = base.get(name);
			}
			// 再从mixins中找同名func
			else if (mixins && mixins.length && mixins.some(function(mixin) {
				owner = mixin;
				return mixin.has(name);
			})) {
				member = owner.get(name);
			}

			if (!member || typeof member != 'function') {
				throw new Error('no such method in parent : \'' + name + '\'');
			} else {
				return member.apply(base, arguments);
			}
		}
	});
	cls.__new__ = base.__new__;
	cls.__metaclass__ = metaclass;

	// Dict
	cls.set(dict);

	// Mixin
	var mixins = cls.__mixins__;
	if (mixins) {
		mixins.forEach(function(mixin) {
			Class.keys(mixin).forEach(function(name) {
				if (cls.has(name)) return; // 不要覆盖自定义的

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

type.__setattr__ = function(cls, name, member) {
	var proto = cls.prototype;
	var properties = proto.__properties__;
	var subs = cls.__subclassesarray__;
	var constructing = cls.__constructing__;

	if (['__new__', '__this__', '__base__', '@mixins', '__mixins__'].indexOf(name) != -1) {
		if (!member || (typeof member != 'object' && typeof member != 'function')) {
			return;
		}
	}
	
	// 类构建完毕后才进行set，需要先删除之前的成员
	delete cls[name];
	delete proto[name];
	delete properties[name];

	// 这里的member指向new Class参数的书写的对象/函数
	if (name == '@mixins') {
		// 避免@mixins与Class.mixin设置的值相互覆盖
		name = '__mixins__';
		if (cls[name]) {
			cls[name] = cls[name].concat(member);
		} else {
			cls[name] = member;
		}
	} else if (['__new__', '__metaclass__', '__mixins__'].indexOf(name) != -1) {
		if (member && (typeof member == 'object' || typeof member == 'function')) {
			cls[name] = member;
		}

	} else if (['__this__', '__base__'].indexOf(name) != -1) {
		cls[name] = proto[name] = member;
	}
	// 有可能为空，比如 this.test = null 或 this.test = undefined 这种写法;
	else if (member == null) {
		proto[name] = member;
	}
	// 先判断最常出现的instancemethod
	// this.a = function() {}
	else if (member.__class__ === undefined && typeof member == 'function') {
		// 这样赋值__name__，确保__name__都是被赋值在开发者所书写的那个function上，能够通过arguments.callee.__name__获取到。
		member.__name__ = name;
		proto[name] = instancemethod(member);
		proto[name].__name__ = name;
		// 初始化方法放在cls上，metaclass会从cls上进行调用
		if (name == 'initialize') {
			cls[name] = instancemethod(member, cls);
		}
	}
	// this.a = property(function fget() {}, function fset() {})
	else if (member.__class__ === property) {
		member.__name__ = name;
		properties[name] = member;
		// 当prototype覆盖instancemethod/classmethod/staticmethod时，需要去除prototype上的属性
		proto[name] = undefined;
	}
	// this.a = classmethod(function() {})
	else if (member.__class__ === classmethod) {
		member.im_func.__name__ = name;
		member.__name__ = name;
		cls[name] = proto[name] = member;
	}
	// this.a = staticmethod(function() {})
	else if (member.__class__ === staticmethod) {
		member.im_func.__name__ = name;
		member.__name__ = name;
		cls[name] = proto[name] = member.im_func;
	}
	// this.a = someObject
	else {
		proto[name] = member;
	}

	// 所有子类cls上加入
	if (!constructing && name in cls && subs) {
		subs.forEach(function(sub) {
			// !(name in sub) 与 !name in sub 得到的结果不一样
			if (!(name in sub)) sub.set(name, member);
		});
	}
};

type.initialize = function() {
};

/**
 * 类的定义
 * @namespace Class
 */
var Class = this.Class = function() {
	var length = arguments.length;
	if (length < 1) throw new Error('bad arguments');
	// 父类
	var base = length > 1? arguments[0] : type;
	if (typeof base != 'function' && typeof base != 'object') {
		throw new Error('base is not function or object');
	}
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
	if (typeof dict != 'function' && typeof dict != 'object') {
		throw new Error('constructor is not function or object');
	}
	if (dict instanceof Function) {
		var f = dict;
		dict = {};
		f.call(dict);
	}

	// metaclass
	var metaclass = dict.__metaclass__ || base.__metaclass__ || type;

	var cls = metaclass.__new__(metaclass, null, base, dict);
	if (!cls || typeof cls != 'function') {
		throw new Error('__new__ method should return cls');
	}
	if (metaclass.initialize) {
		metaclass.initialize(cls, null, base, dict);
	}

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
	cls.has = memberchecker;
	return cls;
};

/**
 * mixin时调用mixin的initialize方法，保证其中的初始化成员能够被执行
 */
Class.initMixins = function(cls, instance) {
	if (!cls) {
		return;
	}
	// 初始化父类的mixin
	if (cls.__base__) {
		Class.initMixins(cls.__base__, instance);
	}
	if (cls.__mixins__) {
		for (var i = 0, l = cls.__mixins__.length, mixin; i < l; i++) {
			mixin = cls.__mixins__[i];
			if (mixin.prototype && typeof mixin.prototype.initialize == 'function') {
				mixin.prototype.initialize.call(instance);
			}
		}
	}
};

/**
 * 在new Class的callback中mixin
 * var MyClass = new Class(function() {
 *	Class.mixin(this, AnotherClass);
 * })
 */
Class.mixin = function(dict, cls) {
	if (!dict || typeof dict != 'object') {
		return;
	}
	if (cls === Array) {
		cls = ArrayClass;
	} else if (cls === String) {
		cls = StringClass;
	}
	dict.__mixins__ = dict.__mixins__ || [];
	dict.__mixins__.push(cls);
};

/**
 * 是否存在property
 */
Class.hasProperty = function(obj, name) {
	return (obj && obj.__properties__) ? (name in obj.__properties__) : false;
};

/**
 * 是否存在类成员
 */
Class.hasMember = function(cls, name) {
	if (!cls) return false;
	if (name in cls.prototype) return true;
	if (name in cls.prototype.__properties__) return true;
	return false;
};

/**
 * 所有properties
 */
Class.getPropertyNames = function(obj) {
	return (obj && obj.__properties__) ? Object.keys(obj.__properties__) : [];
};

/**
 * 将host注射进class，使其self指向host
 * @param cls 被注射的class
 * @param host 注射进去的对象
 * @param args 构造的参数
 */
Class.inject = function(cls, host, args, filter) {
	if (typeof cls != 'function') {
		throw new Error('cls should be function');
	};
	var argsLen = arguments.length;
	if (argsLen === 2) {
		args = [];
		filter = true;
	} else if (argsLen === 3) {
		if (Array.isArray(args)) {
			args = args || [];
			filter = true;
		} else {
			filter = args;
			args = [];
		}
	}

	host.__class__ = cls;
	host.__properties__ = cls.prototype.__properties__;
	var p = Class.getInstance(cls);
	object.extend(host, p, filter);
	Class.initMixins(cls, host);
	if (typeof cls.prototype.initialize == 'function') cls.prototype.initialize.apply(host, args);
};

/**
 * 获取一个class的继承链
 */
Class.getChain = function(cls) {
	if (!cls) {
		return [];
	}
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
	if (!cls || !cls.__subclassesarray__) {
		return [];
	}
	var array = cls.__subclassesarray__;
	var queue = [].concat(array), ele = queue.shift(), subs;
	while (ele != null) {
		subs = ele.__subclassesarray__;
		if (subs != null) {
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
	if (!cls || !cls.prototype) {
		return [];
	}
	keys = Object.keys(cls.prototype.__properties__);
	for (var prop in cls.prototype) {
    	keys.push(prop);
    }
	
	keys = keys.filter(function(name) {
		// 这3个需要过滤掉，是为了支持property加入的内置成员
		// initialize也需要过滤，当mixin多个class的时候，initialize默认为最后一个，这种行为没意义
		// 过滤掉双下划线命名的系统成员和私有成员
		return !(['get', 'set', '_set', 'initialize', 'constructor'].indexOf(name) !== -1 || name.indexOf('__') == 0);
	});
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
StringClass = createNativeClass(String, ["charAt", "charCodeAt", "concat", "indexOf", "lastIndexOf", "match", "replace", "search", "slice", "split", "substr", "substring", "toLowerCase", "toUpperCase", "valueOf", "trim"]);
StringClass.prototype.length = 0;
})(object);
