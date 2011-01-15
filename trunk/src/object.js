var object = new (function(globalHost) {

var object = this;

// 扩充原型
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
	if (o.call !== undefined && o.call !== Function.prototype.call && result.indexOf('call') === -1) result.push('call');

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

Function.prototype.bind = Function.prototype.bind || function(object) {
	var method = this;
	return function() {
		method.apply(object, arguments); 
	};
};

/**
 * 为obj增加properties中的成员
 * @param obj 源
 * @param properties 目标
 * @param ov 是否覆盖，默认true
 * @returns 对象
 */
this.extend = function(obj, properties, ov) {
	if (ov !== false) ov = true;

	for (var property in properties) {
		if (ov || obj[property] === undefined) {
			obj[property] = properties[property];
		}
	}
	if (properties && (obj.call === Function.prototype.call && properties.call !== Function.prototype.call)) {
		obj.call = properties.call;
	}

	return obj;
};

this.clone = function(obj) {
	var clone = {};
	for (var key in obj) clone[key] = obj[key];
	return clone;
};

// 将成员放到window上
this.bind = function(host) {
	object.extend(host, object);
};


this._loader = null;

this.setGlobalUses = function(arr) {
	if (!object._loader) object._loader = new Loader();
	object._loader.globalUses = arr;
};

this.use = function() {
	if (!object._loader) object._loader = new Loader();
	object._loader.use.apply(object._loader, arguments);
};

this.execute = function() {
	if (!object._loader) object._loader = new Loader();
	object._loader.execute.apply(object._loader, arguments);
};

this.add = function() {
	if (!object._loader) object._loader = new Loader();
	object._loader.add.apply(object._loader, arguments);
};

})(window);

(function() {

// prototyping标识符，有此标识符标识则代表new一个类时是为了继承而new的
var PROTOTYPING = {anything: true};

// 仿照 mootools 的overloadSetter，返回一个 key/value 这种形式的function参数的包装，使其支持{key1: value1, key2: value2} 这种形式
var enumerables = true;
for (var i in {toString: 1}) enumerables = null;
if (enumerables) enumerables = ['hasOwnProperty', 'valueOf', 'isPrototypeOf', 'propertyIsEnumerable', 'toLocaleString', 'toString', 'constructor'];
var overloadSetter = function(func, usePlural) {
	return function(a, b) {
		if (a === null) return this;
		if (usePlural || typeof a != 'string'){
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

// 获取父类的实例，用于 cls.prototype = new parent
var getInstance = function(cls) {
	if (cls === Array || cls === String) return new cls;
	return new cls(PROTOTYPING);
}

// property getter
var getter = function(prop) {
	var property = this.__properties__[prop];
	if (property && property.fget) {
		return property.fget.call(null, this);
	} else {
		throw 'get not definedProperty ' + prop;
	}
};

// property setter
var setter = function(prop, value) {
	var property = this.__properties__[prop];
	if (property && property.fset) {
		property.fset.call(null, this, value);
	} else {
		throw 'set not definedProperty ' + prop;
	}
};

/**
 * 动态mixin的方法。可以通过任意class的mixin调用
 * MyClass.mixin(name, value);
 * MyClass.mixin({name1: value1, name2: value2})
 */
var mixiner = overloadSetter(function(name, member) {
	// 通过mixin创建新的成员，需要在继承链上所有的class实现
	if (!(name in this.prototype)) {
		var classes = getAllSubClasses(this); 
		classes.unshift(this) // 包括自己也需要加上
		classes.forEach(function(one) {
			if (typeof member === 'function') {
				one[name] = getMethodCaller(name);
			} else {
				one[name] = member;
			}
		});
	}
	buildPrototype(this.prototype, name, member);
});

var getSubClasses = function() {
	return this.__subclassesarray__;
};

var getAllSubClasses = function(cls, array) {
	if (!array) array = [];
	else array.push(cls);
	var subs = cls.__subclassesarray__;
	for (var i = 0, l = subs.length; i < l; i++) arguments.callee(subs[i], array);
	return array;
};

var getMethodCaller = function(name) {

	return function(self) {
		var member = this.prototype[name];
		var func = member.im_func;
		var args;

		if (member.__class__ === instancemethod) {
			return func.apply(null, arguments);

		} else if (member.__class__ === classmethod) {
			args = [].slice.call(arguments, 0);
			args.unshift(this);
			return func.apply(null, args);

		} else {
			return member.apply(null, arguments);
		}
	};
};

var buildPrototype = function(prototype, name, member) {

	if (member.__class__ === staticmethod) {
		prototype[name] = member.im_func;

	} else if (member.__class__ === classmethod) {
		prototype[name] = member;

	} else if (member.__class__ === property) {
		prototype.__properties__[name] = member;
		
	} else if (typeof member === 'function') {
		prototype[name] = instancemethod(member);

	} else {
		prototype[name] = member;
	}

};

// IE不可以通过prototype = new Array的方式使function获得数组功能。
var _nativeExtendable = (function() {
	var a = function() {};
	a.prototype = new Array;
	var b = new a;
	b.push(null);
	return !!b.length;
})();

// 类
var Class = this.Class = function() {
	if (arguments.length < 1) throw new Error('bad arguments');

	// 构造器
	var members = arguments[arguments.length - 1];
	if (members instanceof Function) {
		var f = members;
		members = {};
		f.call(members);
	}

	// 父类
	var parent = arguments.length > 1? arguments[0] : null;

	// cls
	var cls = function(prototyping) {
		if (prototyping === PROTOTYPING) return this;
		this.__class__ = arguments.callee;
		var value = this.initialize? this.initialize.apply(this, arguments) : null;
		return value;
	};

	// 继承
	if (parent) {
		if (!_nativeExtendable) {
			if (parent === Array) {
				parent = ArrayClass;
			} else if (parent === String) {
				parent = StringClass;
			}
		}

		cls.prototype = getInstance(parent);
		cls.__base__ = parent;
		// Array / String 没有 subclass
		if (parent.__subclassesarray__) parent.__subclassesarray__.push(cls);
	}

	var prototype = cls.prototype;
	// 有可能已经继承了parent的__properties__了
	var parentProperties = prototype.__properties__ || {};
	prototype.__properties__ = object.extend({}, parentProperties);

	Object.keys(members).forEach(function(name) {

		var member = members[name];
		buildPrototype(cls.prototype, name, member);

		if (typeof member === 'function') {
			cls[name] = getMethodCaller(name);

		} else {
			cls[name] = member;
		}

	});

	object.extend(cls, parent, false);

	cls.__subclassesarray__ = [];
	cls.__subclasses__ = getSubClasses;
	cls.mixin = mixiner;
	cls.prototype.get = getter;
	cls.prototype.set = setter;
	return cls;
};

// 在new Class的callback中mixin
Class.mixin = function(members, cls) {
	var instance = new cls();
	var member, func;

	Object.keys(cls.prototype).forEach(function(name) {

		if (['get', 'set', '__properties__'].indexOf(name) !== -1) return;

		var member = instance[name];
		var func = member.im_func;

		if (typeof member === 'function') {
			if (member.__class__ === instancemethod) {
				members[name] = func;
			} else if (member.__class__ === classmethod) {
				members[name] = member;
			} else {
				members[name] = staticmethod(member);
			}
		} else {
			members[name] = member;
		}
	})

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
	var p = getInstance(cls);
	object.extend(host, p);
	args.unshift(host);
	cls.initialize.apply(cls, args);
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

var instancemethod = function(func) {
	var wrapper = function() {
		var args = [].slice.call(arguments, 0);
		args.unshift(this);
		return func.apply(null, args);
	};
	wrapper.__class__ = arguments.callee;
	wrapper.im_func = func;
	return wrapper;
};

var staticmethod = this.staticmethod = function(func) {
	var wrapper = function() {
		return func.apply(null, arguments);
	};
	wrapper.__class__ = arguments.callee;
	wrapper.im_func = func;
	return wrapper;
};

var classmethod = this.classmethod = function(func) {
	var wrapper = function() {
		var args = [].slice.call(arguments, 0);
		args.unshift(this.__class__);
		return func.apply(null, args);
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
		for (var i = 0; i < methodNames.length; i++) {
			this[methodNames[i]] = (function(name) {
				return function() {
					return source.prototype[name].apply(arguments[0], [].slice.call(arguments, 1));
				};
			})(methodNames[i]);
		}
	});
	return cls;
};

var ArrayClass = createNativeClass(Array, ["concat", "indexOf", "join", "lastIndexOf", "pop", "push", "reverse", "shift", "slice", "sort", "splice", "toString", "unshift", "valueOf", "forEach"]);
ArrayClass.prototype.length = 0;
var StringClass = createNativeClass(String, ["charAt", "charCodeAt", "concat", "indexOf", "lastIndexOf", "match", "replace", "search", "slice", "split", "substr", "substring", "toLowerCase", "toUpperCase", "valueOf"]);

})();

(function() {

/**
 * object的包管理器
 * 这个class依赖于object._lib ，且会修改它
 * @class Loader
 */
this.Loader = new Class(function() {

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

	/**
	 * @constructor
	 */
	this.initialize = function(self) {
		self.useCache = true;
		// 所有use都会默认use的模块，需要注意循环引用问题
		self.globalUses = [];
		self.lib = {};
		self.anonymousModuleCount = 0;

		_lib = self.lib;

		self.add('sys', function($) {
		});
	};

	/**
	 * 查找页面中的标记script标签，更新 _lib
	 */
	this.loadLib = function(self) {
		var scripts = document.getElementsByTagName('script');
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
	this.loadScript = function(self, src, callback) {

		var ele, doCallback;

		if (self.useCache) {
			var scripts = document.getElementsByTagName('script');
			for (var i = 0, l = scripts.length; i < l; i++) {
				if (scripts[i].src == src) {
					ele = scripts[i];
					// 连续调用，此脚本正在加载呢
					if (scripts[i].loading) {
						// 增加一个回调即可
						ele.callbacks.push(callback);
					} else {
						callback();
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

		doCallback = function() {
			if (window.console) console.log('load ' + src);
			ele.loading = null;
			ele.callbacks.forEach(function(callback) {
				callback();
			});
			ele.callbacks = null;
		};

		ele.callbacks.push(callback);

		if (window.ActiveXObject) { // IE
			ele.onreadystatechange = function() {
				var rs = this.readyState;
				if ("loaded" === rs || "complete" === rs) {
					ele.onreadystatechange = null;
					doCallback();
				}
			};

		} else if (ele.addEventListener) { // Standard
			ele.addEventListener("load", function() {
				doCallback();
			}, false);

		} else { // Old browser
			ele.onload = ele.onerror = doCallback;
		}

		document.getElementsByTagName('head')[0].insertBefore(ele, null);

	};

	/**
	 * context 执行方法
	 * @param pkg 被执行的pkg
	 * @param host context回调的this指针会指向它
	 * @param modules 保存了此次use运行过程中用到的所有module
	 * @param callback 异步方法，执行完毕后调用
	 * @param options 可选，可用来定制name
	 */
	this.executeModule = function(self, pkg, host, modules, callback, options) {
		if (!options) options = {};

		// 最后传进context的参数
		var args = [];
		// 存储所有uses，最后通过第一个参数传给context
		var runtime = host;

		// host.__name__ 为自己的名称
		host.__name__ = options.name || pkg.name;
		// sys.modules
		if (host.__name__ === 'sys') host.modules = modules;

		var done = function() {
			args.unshift(runtime);
			pkg.fn.apply(host, args);
			// 输出 __name__
			Object.keys(host).forEach(function(key) {
				if (typeof host[key] == 'function') {
					host[key].__name__ = key;
				}
			});

			if (callback) callback();
		};

		// 在没有uses的情况下直接返回即可。
		if (pkg.fn && pkg.uses.length === 0) {
			done();
			return;
		} else if (!pkg.fn && pkg.file) {
			self.loadScript(pkg.file, function() {
				loadNext(0);
			}, true);
			return;
		}

		// 主递归函数
		function loadNext(i) {

			var use = pkg.uses[i];

			self.getModule(use.name, modules, function(useModule) {
				var names, root, member;

				// 有别名
				if (use.as) {
					runtime[use.as] = useModule;
					if (args.indexOf(useModule) == -1) args.push(useModule);

				// 是一个from import
				} else if (use.uses) {
					if (use.uses == '*') {
						for (member in useModule) {
							if (useModule.hasOwnProperty(member) && !member.match(/__.*__/g)) runtime[member] = useModule[member];
						}
					} else {
						use.uses.forEach(function(member) {
							if (member.as) runtime[member.as] = useModule[member.name];
							else runtime[member.name] = useModule[member.name];
						});
					}

				// 正常的引入
				} else {
					names = use.name.split('.');
					root = runtime[names[0]] = modules[names[0]];

					if (args.indexOf(root) == -1) args.push(root);
				}

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
	this.getModule = function(self, name, modules, callback) {
		var names = name.split('.');

		/**
		 * @param i
		 * @param pname 上一个module的name
		 */
		function loadNext(i, pname) {
			var prefix = names.slice(0, i + 1).join('.');
			name = names[i];

			var next = function() {
				if (pname) modules[pname][name] = modules[prefix];

				if (i < names.length - 1) {
					loadNext(i + 1, prefix);
				} else if (i == names.length - 1) {
					callback(modules[prefix]);
				}
			};

			// 使用缓存中的
			if (modules[prefix]) {
				next();

			// lib 中有
			} else if (_lib[prefix]) {
				var pkg = _lib[prefix];

				if (!modules[prefix]) {
					modules[prefix] = new Module(prefix);
				}

				// 有可能是空的模块，是没有 fn 的
				if (pkg.fn) {
					self.executeModule(pkg, modules[prefix], modules, next);

				// lib中有，但是是file，需要动态加载
				} else if (pkg.file) {
					// 文件加载完毕后，其中执行的 add 会自动把 _lib 中的对象替换掉，file 属性丢失，加入了 execute/name/uses 等属性
					// 使用缓存
					self.loadScript(pkg.file, function() {
						self.executeModule(pkg, modules[prefix], modules, next);
					}, true);
				} else {
					next();
				}

			// lib中没有
			} else {
				throw new NoModuleError(prefix);
			}

		};

		loadNext(0);
	};

	/**
	 * 处理传入的uses参数，输入格式：
	 * ['module1', {
	 * 	name: 'module2',
	 * 	uses: [
	 * 		{
	 * 			name: 'Member1',
	 * 			as: 'M'
	 * 		},
	 * 		'Member2'
	 * 	]
	 * }, {
	 * 	name: 'full.module.name',
	 * 	as: 'shortname'
	 * }, {
	 *	name: 'somemodule',
	 *	uses: '*'
	 * }];
	 *
	 * 输出格式：
	 * [{
	 * 	name: 'module1'
	 * }, {
	 *	name: 'module2',
	 *	uses: [
	 *		{
	 *			name: 'Member1',
	 *			as: 'M'
	 *		}, {
	 *			name: 'Member2'
	 *		}
	 *	]
	 * }, {
	 *	name: 'full.module.name',
	 *	as: 'shortname'
	 * }, {
	 *	name: 'somemodule',
	 *	uses: '*'
	 * }];
	 *
	 * 在getUses阶段不需要根据名称判断去重（比如自己use自己），因为并不能避免所有冲突，还有循环引用的问题（比如 core use dom, dom use core）
	 * 因此限定：globalUses 中声明的模块不允许有use
	 *
	 * @param uses 输入
	 * @param ignore 跳过ignore模块，用来避免自己调用自己
	 */
	this.getUses = function(self, uses, ignore) {
		if (typeof uses == 'string') {

			uses = uses.split(/\s*,\s*/ig);
			for (var i = 0; i < uses.length; i++) {
				uses[i] = {name: uses[i]};
			}

		} else {

			for (i = 0, use; i < uses.length; i++) { // typeof uses == object
				use = uses[i];
				if (typeof use == 'string') {
					uses[i] = {name : use};
					continue;
				}
				if (use.uses) {
					// uses/as 互斥
					use.as = null;
					if (use.uses == '*') continue; // 如果是 * 则保持字符串，不做处理
					if (typeof use.uses == 'string') {
						use.uses = use.uses.split(/\s*,\s*/ig);
					}
					for (var j = 0, subuse; j < use.uses.length; j++) {
						subuse = use.uses[j];
						if (typeof subuse == 'string') {
							use.uses[j] = {
								name: subuse
							};
						}
					}
					continue;
				}
			}

		}

		// 过滤自己调用自己
		uses = uses.filter(function(use) {
			return use.name != ignore;
		});

		return uses;
	};

	/**
	 * 传入context，context的参数会包含use进来的module
	 * 创造一个context，内部通过 this.xxx 设置的成员都会在这个 context 下。
	 * @param name 名称
	 * @param uses 用逗号分隔开的模块名称列表
	 * @param context 这个function会在调用module时调用，并将module通过参数传入context，第一个参数为runtime，后面的参数为每个module的不重复引用，顺序排列
	 */
	this.add = function(self, name, uses, context) {

		// 不允许重复添加。
		if (_lib[name] && _lib[name].fn) return null;

		// uses 参数是可选的
		if (typeof uses == 'function') {
			context = uses;
			uses = [];
		}

		var globalUses = self.globalUses? self.getUses(self.globalUses, name) : [];
		// globalUses放在数组前面还是后面还有大讲究：
		// 放在前面，首先引入的core模块无法通过sys.modules找到其他后加载的模块；
		// 放在后面，则可以找到。
		uses = self.getUses(uses, name).concat(globalUses);
		//uses = globalUses.concat(self.getUses(uses));

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
	 * uses参数书写有一个技巧，写在后面的module在运行时可以通过runtime参数得到之前已经引入module的引用
	 * 这对于利用引入对象做处理的模块来说是一个很重要的特性
	 * @param uses 用逗号分隔开的模块名称列表
	 * @param context uses加载后调用，将module通过参数传入context，第一个参数为runtime，后面的参数为每个module的不重复引用，顺序排列
	 */
	this.use = function(self, uses, context) {
		self.loadLib();

		var name = '__anonymous_' + self.anonymousModuleCount + '__';
		self.anonymousModuleCount++;
		var module = self.add(name, uses, context);

		// 第二个{}参数会被所有相关module通过第一个 runtime 参数获取到，实现module获取调用者的信息
		self.executeModule(module, {}, {}, null, {name: '__main__'});
	};

	/**
	 * execute
	 * @param name 执行的入口模块名称
	 * @param options 传入参数
	 */ 
	this.execute = function(self, name, options) {
		self.loadLib();

		var module = _lib[name];
		if (!module) throw new NoModuleError(name);

		self.executeModule(module, {}, {}, null, {name: '__main__'});
	};

});

})();

(function() {

// 事件
this.Events = new Class({

	initialize : function(self) {
		self._eventListeners = {};
	},

	addEvent : function(self, type, func) {
		var funcs = self._eventListeners;
		if (!funcs[type]) funcs[type] = [];
		// 不允许重复添加同一个事件
		else if (funcs[type].indexOf(func) != -1) return self;
		funcs[type].push(func);
		return null;
	},

	removeEvent : function(self, type, func) {
		var funcs = self._eventListeners[type];
		if (funcs) {
			for (var i = funcs.length - 1; i >= 0; i--) {
				if (funcs[i] === func) {
					funcs.splice(i, 1);
					break;
				}
			}
		}
		return self;
	},

	fireEvent : function(self, type) {
		if (!self._eventListeners[type]) return;

		var funcs = self._eventListeners[type];
		for (var i = 0, j = funcs.length; i < j; i++) {
			if (funcs[i]) {
				funcs[i].apply(self, Array.prototype.slice.call(arguments, 2));
			}
		}
	}
});


})();

object.bind(window);

