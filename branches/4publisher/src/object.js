var object = new (function(globalHost) {

var object = this;

// 扩充原型
expand();

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
		if (ov || obj[property] === undefined) obj[property] = properties[property];
	}

};

// 获得一个cls的所有成员，cls有可能是native function比如Array, String
function getMembers(source) {
	if (source === Array || source === String) {
		var methodNames = [];
		if (source === Array) methodNames = ["concat", "indexOf", "join", "lastIndexOf", "pop", "push", "reverse", "shift", "slice", "sort", "splice", "toString", "unshift", "valueOf", "forEach"];
		if (source === String) methodNames = ["charAt", "charCodeAt", "concat", "indexOf", "lastIndexOf", "match", "replace", "search", "slice", "split", "substr", "substring", "toLowerCase", "toUpperCase", "valueOf"];
		var members = {};
		for (var i = 0; i < methodNames.length; i++) {
			members[methodNames[i]] = (function(name) {
				return function() {
					return source.prototype[name].apply(arguments[0], [].slice.call(arguments, 1));
				};
			})(methodNames[i]);
		}
		return members;

	} else {
		return source;
	}
}

// 类
var Class = this.$class = this.Class = function() {
	if (arguments.length < 1) throw new Error('bad arguments');

	var properties = arguments[arguments.length - 1];
	// 从参数获取父类列表
	var parents = ([].slice.call(arguments, 0, -1)).reverse();

	// cls
	var cls = function() {
		Class.inject(cls, this, arguments);
	};
	cls.__bases__  = parents;

	// 继承，将parent的所有成员都放到cls上
	// 先做继承，后声明的成员覆盖先声明的
	for (var i = 0; i < parents.length; i++) {
		var parent = parents[i];
		var members = getMembers(parent);

		Object.keys(members).forEach(function(name) {
			// 在Safari 5.0.2(7533.18.5)中，在这里用for in遍历members会将prototype属性遍历出来，导致原型被指向一个错误的对象，后面就错的一塌糊涂了
			// 经过试验，在Safari下，仅仅通过 obj.prototype.xxx = xxx 这样的方式就会导致 prototype 变成自定义属性，会被 for in 出来
			// 而其他浏览器仅仅是在重新指向prototype时，类似 obj.prototype = {} 这样的写法才会出现这个情况
			if (name === 'prototype') return;

			if (members[name].classmethod) {
				cls[name] = members[name].im_func;
			} else {
				cls[name] = members[name];
			}
		});
	}

	// 支持两种写法，传入一个Hash或者function
	// 将所有成员复制到cls上
	if (properties instanceof Function) {
		properties.call(cls);
	} else {
		object.extend(cls, properties);
	}

	// 处理 classmethod
	Object.keys(cls).forEach(function(name) {
		if (cls[name] && cls[name].classmethod) {
			cls[name] = bindFunc(cls[name], cls);
			cls[name].classmethod = true;
		}
	});

	cls.constructor = object.Class;
	cls.prototype.constructor = cls;

	return cls;
};

// 将binder绑定至func的第一个参数
function bindFunc(func, binder) {
	var wrapper = function() {
		var args = [].slice.call(arguments, 0);
		args.unshift(arguments.callee.__self__);
		return func.apply(globalHost, args);
	};
	wrapper.apply = funcApply;
	wrapper.call = funcCall;
	wrapper.__self__ = binder;
	wrapper.im_func = func;

	return wrapper;
}

// bindFunc的apply方法
function funcApply(host, args) {
	if (!args) args = [];
	args = [].slice.call(args, 0);
	args.unshift(this.__self__);
	return this.im_func.apply(host, args);
}

// bindFunc的call方法
function funcCall(host) {
	var args = [].slice.call(arguments, 1);
	args.unshift(this.__self__);
	return this.im_func.apply(host, args);
}

/**
 * 将source注射进class，使其self指向source
 * @param cls 被注射的class
 * @param source 注射进去的对象
 */
Class.inject = function(cls, source, arguments) {

	// 将properties中的function进行一层wrapper，传入第一个 self 参数
	Object.keys(cls).forEach(function(name) {
		// 如果是属性/staticmethod/classmethod，则不进行wrapper
		if (typeof cls[name] != 'function' || cls[name].__self__ === null || cls[name].im_func) {
			source[name] = cls[name];
		} else {
			source[name] = bindFunc(cls[name], source);
		}

	});

	var value = (cls.__init__) ? source.__init__.apply(source, arguments) : source;
	delete source.caller;
	return value;

}

// 声明类静态方法，在new Class(callback) 的callback中调用
var staticmethod = this.staticmethod = function(func) {
	func.__self__ = null;
	return func;
};

// 声明类方法，在new Class(callback) 的callback中调用
var classmethod = this.classmethod = function(func) {
	func.classmethod = true;
	return func;
};

// 将成员放到window上
this.bind = function(host) {
	object.extend(host, object);
};

// 事件
this.Events = new Class({

	__init__ : function(self) {
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
		var args = Array.prototype.slice.call(arguments, 0);
		args.shift();
		args.shift();
		for (var i = 0, j = funcs.length; i < j; i++) {
			if (funcs[i]) {
				funcs[i].apply(self, args);
			}
		}
	}
});

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
	this.__init__ = function(self) {
		// 系统内置模块
		self._runtimeModules = [];

		self.useCache = true;
		// 所有use都会默认use的模块，需要注意循环引用问题
		self.globalUses = [];
		self.queue = [];
		self.lib = {};
		self.anonymousModuleCount = 0;

		_lib = self.lib;
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
	}

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
			delete ele.loading;
			ele.callbacks.forEach(function(callback) {
				callback();
			});
			delete ele.callbacks;
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
	 * 通过一个模块名，获得到相对应的模块对象并返回
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
					delete use.as;
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
		if (_lib[name] && _lib[name].fn) return;

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


this._loader = null;

this.setGlobalUses = function(arr) {
	if (!object._loader) object._loader = new object.Loader();
	object._loader.globalUses = arr;
};

this.use = function() {
	if (!object._loader) object._loader = new object.Loader();
	object._loader.use.apply(object._loader, arguments);
};

this.execute = function() {
	if (!object._loader) object._loader = new object.Loader();
	object._loader.execute.apply(object._loader, arguments);
};

this.add = function() {
	if (!object._loader) object._loader = new object.Loader();
	object._loader.add.apply(object._loader, arguments);
};

// Expand
function expand() {

	Object.keys = function(o) {
		var result = [];

		// 在IE下for in无法遍历出来修改过的call方法
		// 为什么允许修改call方法？对于一个class来说，没有直接Class.call的应用场景，任何Class都应该是new出来的，因此可以修改这个方法
		if (o.call !== undefined && o.call !== Function.prototype.call) {
			result.push('call');
		}
		for (var name in o) {
			if (name === 'call') continue;
			if (o.hasOwnProperty(name)) {
				result.push(name);
			}
		}

		return result; 
	}

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
			method.apply(object , arguments); 
		};
	};

}



})(window);

object.bind(window);

object.add('sys', function($) {
});

