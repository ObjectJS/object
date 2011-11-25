/**
 * Loader
 */
;(function(object) {

// 找不到模块Error
function NoModuleError(name) {
	this.message = 'no module named ' + name;
};
NoModuleError.prototype = new Error();

function ModuleRequiredError(name) {
	this.message = 'module ' + name + ' required';
};
ModuleRequiredError.prototype = new Error();

// 模块
function Module(name) {
	this.__name__ = name;
}
Module.prototype.toString = function() {
	return '<module \'' + this.__name__ + '\'>';
};

function Package(id, deps, factory) {
	this.id = id;
	this.dependencies = deps;
	this.factory = factory;
}
Package.factoryRunner = {
	nextDep: function(loader, module, name, runtime, args, exports) {
		if (exports) {
			// 非重复引用
			if (args.indexOf(exports) == -1) args.push(exports);
		}
	},
	doneDep: function(loader, module, name, runtime, args, exports) {
		// 最后传进context的参数
		args.unshift(exports);
	}
};

function LoaderRuntime(root) {

	/**
	 * 此次use运行过程中用到的所有module
	 */
	this.modules = {};

	/**
	 * 当子模块依赖父模块时，并无法立刻获取到父模块的引用，而是一个空的模块
	 * 此变量用于存储这种情况时的空模块
	 */
	this.emptyModules = {};

	/**
	 * 模块的依赖路径的栈，检测循环依赖
	 */
	this.stack = [];

	/**
	 * 当使用相对依赖时，子模块被处理完毕时，其父模块可能还未处理完毕
	 * 导致无法立刻将此子模块的引用赋予其父模块
	 * 此变量用于存储父模块与其子模块的映射关系，在父模块初始化完毕后再将自模块赋予自己。
	 */
	this.members = {};
	
	/**
	 * 运行入口模块的名字
	 */
	this.root = root;
}

/**
 * 加入一个module
 */
LoaderRuntime.prototype.addModule = function(name) {
	var emptyModule = this.emptyModules[name];
	var exports = emptyModule? emptyModule.exports : new Module(name);
	this.modules[name] = exports;
	return exports;
};

/**
 * 加入一个占位的空module，保证子模块可获取到父模块的引用
 */
LoaderRuntime.prototype.addEmptyModule = function(name, ref) {
	var emptyModule = this.emptyModules[name];
	var exports;
	// refs保存所有依赖了此父模块的子模块的信息。
	if (emptyModule) {
		exports = emptyModule.exports;
	} else {
		exports = new Module(name);
		this.emptyModules[name] = emptyModule = {
			exports: exports,
			refs : []
		};
	}
	emptyModule.refs.push(ref);
	return exports;
};

/**
 * 当子模块调用父模块时，检测是否可以正确的获取到其引用。
 */
LoaderRuntime.prototype.checkRef = function(name) {
	var emptyModule = this.emptyModules[name];
	if (emptyModule) {
		emptyModule.refs.forEach(function(ref) {
			if (console) console.warn(ref + '无法正确获得' + name + '模块的引用。因为该模块是通过return返回模块实例的。');
		});
	}
};

/**
 * 去掉root前缀的模块名
 */
LoaderRuntime.prototype.getId = function(id) {
	var root = this.root;
	if (id == root || id.indexOf(root + '.') == 0) {
		id = id.slice(root.length + 1);
	}
	return id;
};

/**
 * 为名为host的module设置member成员为value
 */
LoaderRuntime.prototype.setMemberTo = function(host, member, value) {

	// 向host添加member成员
	if (host) {
		// 已存在host
		if (this.modules[host]) {
			this.modules[host][member] = value;
		}
		// host不存在，记录在members对象中
		else {
			if (!this.members[host]) this.members[host] = [];
			this.members[host].push({
				id: member,
				value: value
			});
		}
	}

	/*
	 * 将记录的成员添加到自己
	 */
	// 全名
	var id = (host? host + '.' : '') + member;

	// 已获取到了此host的引用，将其子模块都注册上去。
	var members = this.members[id];
	if (members) {
		members.forEach(function(member) {
			this.modules[id][member.id] = member.value;
		}, this);
	}
};

/**
 * object的包管理器
 * 这个class依赖于object._lib ，且会修改它
 */
var Loader = new Class(function() {

	this.scripts = document.getElementsByTagName('script');

	this.initialize = function(self) {
		self.useCache = true;
		self.lib = {
			'sys': {
				id: 'sys',
				dependencies: [],
				factory: function(exports) {}
			}
		};
		self.anonymousModuleCount = 0;
	};

	/**
	 * 建立前缀模块
	 * 比如 a.b.c.d ，会建立 a/a.b/a.b.c 三个空模块，最后一个模块为目标模块，不为空，内容为context
	 */
	this.__makePrefixModule = function(self, id) {
		if (!id || typeof id != 'string') {
			return;
		}
		id = id.replace(/^\.*|\.*$/g, '');
		if (id.indexOf('sys.') == 0) {
			throw new Error('should not add sub module for sys');
		}
		var parts = id.split('.');
		for (var i = 0, prefix, l = parts.length - 1; i < l; i++) {
			prefix = parts.slice(0, i + 1).join('.');
			// 说明这个module是空的
			if (self.lib[prefix] == undefined) self.lib[prefix] = {
				id: prefix
			};
		}
	};

	/**
	 * 处理当前模块的每个部分
	 * @param deptId 当前部分的名字
	 * @param ownerId 依赖此dept的module的名字，用于生成作用域信息
	 * @param {LoaderRuntime} runtime
	 * @param callback 异步方法，模块获取完毕后通过callback的唯一参数传回
	 */
	this.__executeParts = function(self, deptId, ownerId, runtime, callback) {

		var modules = runtime.modules;
		var parts; // deptId所有部分的数组
		var context = null; // 当前dept是被某个模块通过相对路径调用的
		var moduleId = ''; // 当前模块在运行时保存在modules中的名字，为context+parts的第一部分
		var isRelative = false; // 当前dept是否属于execute的模块的子模块，如果是，生成的名称应不包含其前缀
		var pId, part, partId, currentPart = -1;

		/**
		 * 依次获取当前模块的每个部分
		 * 如a.b.c，依次获取a、a.b、a.b.c
		 * @param pExprorts 上一部分的模块实例，如果是初次调用，为空
		 * @param id 截止到当前部分的包含context前缀的名字
		 */
		function nextPart(pExports, id) {

			var fullId, deptModule;

			if (pExports) {
				modules[id] = pExports;
				// 生成对象链
				runtime.setMemberTo(pId, part, pExports);
			}

			pId = id;

			currentPart++;

			if (currentPart == parts.length) {
				callback(modules[moduleId]);

			} else {
				part = parts[currentPart];
				partId = (pId? pId + '.' : '') + part;
				fullId = isRelative? runtime.root + '.' + partId : partId;

				// 使用缓存中的
				if (modules[partId]) {
					nextPart(modules[partId], partId);
				}
				// lib 中有
				else if (self.lib[fullId]) {
					self.load(self.lib[fullId], partId, runtime, nextPart);
				}
				// lib中没有
				else {
					throw new NoModuleError(fullId);
				}
			};
		}

		if (deptId.indexOf('./') == 0) {
			parts = deptId.slice(2).split('.');
			// 去除root
			context = runtime.getId(ownerId);
			// 说明确实去除了root，是一个相对引用，在获取fullId时需要加上root
			isRelative = (context != ownerId);
			moduleId = context + '.' + parts[0];
		} else {
			parts = deptId.split('.');
			moduleId = parts[0];
		}

		nextPart(null, context);
	};

	/**
	 * 加载一个module
	 *
	 * @param module 被执行的module
	 * @param name 执行时的name
	 * @param {LoaderRuntime} runtime
	 * @param callback 异步方法，执行完毕后调用，传入模块实例及名字
	 */
	this.load = function(self, module, name, runtime, callback) {

		var args = [];
		var currentUse = -1; 

		/**
		 * 顺序执行module中的dependencies
		 * @param pExports 上一个nextDep返回的模块实例
		 */
		function nextDep(pExports) {
			var deptId;
			var deps = module.dependencies;
			var factory = module.factory;
			var factoryRunner = module.constructor.factoryRunner;
			if (factoryRunner && factoryRunner.nextDep) {
				factoryRunner.nextDep(self, module, name, runtime, args, pExports);
			}

			if (pExports) {
				// 模块获取完毕，去除循环依赖检测
				runtime.stack.pop();
			}

			currentUse++;

			// 模块获取完毕，执行factory，将exports通过callback传回去。
			// 在空module或没有dependencies或已经use到最后一个
			if (!factory || deps.length == 0 || currentUse == deps.length) {
				doneDep();

			} else {
				deptId = deps[currentUse];

				// 记录开始获取当前模块
				runtime.stack.push(deptId);

				// 刚刚push过，应该在最后一个，如果不在，说明循环依赖了
				if (runtime.stack.indexOf(deptId) != runtime.stack.length - 1) {
					nextDep(runtime.addEmptyModule(deptId, name));

				} else {
					self.__executeParts(deptId, module.id, runtime, nextDep);
				}
			}

		}

		/**
		 * 已执行完毕最后一个dependency
		 */
		function doneDep() {

			var exports = runtime.addModule(name);
			var returnExports;
			var factory = module.factory;
			module.exports = exports;
			var factoryRunner = module.constructor.factoryRunner;
			if (factoryRunner && factoryRunner.doneDep) {
				factoryRunner.doneDep(self, module, name, runtime, args, exports);
			}

			if (!name) name = module.id; //  没有指定name，则使用全名

			// sys.modules
			if (exports.__name__ === 'sys') exports.modules = runtime.exports;

			// 空module不需要
			if (factory) {
				returnExports = factory.apply(exports, args);
				if (returnExports) {
					// 检测是否有子模块引用了本模块
					runtime.checkRef(name);

					if (typeof returnExports === 'object' || typeof returnExports === 'function') {
						returnExports.toString = Package.prototype.toString;
						returnExports.__name__ = exports.__name__;
					}
					exports = returnExports;
				}
			}
			if (callback) callback(exports, name);
		}

		// file
		if (!module.factory && module.file) {
			// TODO 加入预处理过程，跑出所有需要加载的文件并行加载，在此执行useScript而不是loadScript
			self.loadScript(module.file, function() {
				// 加载进来的脚本没有替换掉相应的模块，文件有问题。
				// 重新读取module，module可能只是个占位
				if (module.file) {
					throw new Error(module.file + ' do not add ' + module.id);
				}
				nextDep();
			}, true);
		} else {
			nextDep();
		}
	};

	/**
	 * 查找页面中的标记script标签，更新 self.lib
	 */
	this.loadLib = function(self) {

		var scripts = self.scripts;

		for (var i = 0, script, id, src, l = scripts.length; i < l; i++) {
			script = scripts[i];
			id = script.getAttribute('data-module');
			if (!id) continue;
			//self.lib中的内容可能是makePrefixModule构造的，只有name
			//在模块a.b先声明，模块a后声明的情况下，无法获取模块a的内容
			if (self.lib[id] && (self.lib[id].factory || self.lib[id].file)) {
				continue;
			}
			src = script.getAttribute('data-src');
			if (!src) {
				continue;
			}
			// 建立前缀module
			self.__makePrefixModule(id);
			self.lib[id] = {
				id: id,
				file: src
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
		if (!src || typeof src != 'string') {
			throw new Error('src should be string');
		}
		src = src.trim();
		if (!!useCache) {
			var scripts = cls.get('scripts');
			for (var i = 0, script, l = scripts.length; i < l; i++) {
				script = scripts[i];
				//src有可能是相对路径，而script.src是绝对路径，导致不一致
				if (script.src && 
						(script.src.indexOf(src) == script.src.length - src.length)) {
					// 连续调用，此脚本正在加载呢
					if (script.loading) {
						// 增加一个回调即可
						script.callbacks.push(callback);
					} else {
						callback(script);
					}
					return;
				}
			}
		}

		var ele = document.createElement('script');
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
			for (var i = 0, l = ele.callbacks.length; i < l; i++) {
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
	 * 处理传入的deps参数
	 * 在parseDeps阶段不需要根据名称判断去重（比如自己use自己），因为并不能避免所有冲突，还有循环引用的问题（比如 core use dom, dom use core）
	 * @param deps 输入
	 * @param ignore 跳过ignore模块，用来避免自己调用自己
	 */
	this.parseDeps = function(self, deps, ignore) {
		if (!deps || typeof deps != 'string') {
			return deps;
		}
		if (typeof deps == 'string') {
			deps = deps.replace(/^,*|,*$/g, '');
			deps = deps.split(/\s*,\s*/ig);
		}

		return deps;
	};

	this.createRuntime = function(self, id) {
		return new LoaderRuntime(id);
	};

	/**
	 * 传入factory，factory的参数会包含use进来的module
	 * 创造一个factory，内部通过 this.xxx 设置的成员都会在这个 factory 下。
	 * @param id
	 * @param deps 用逗号分隔开的模块名称列表
	 * @param factory 这个function会在调用module时调用，并将module通过参数传入factory，第一个参数为exports，后面的参数为每个module的不重复引用，顺序排列
	 * @param constructor package类型
	 */
	this.addPackage = function(self, id, deps, factory, constructor) {
		// 不允许重复添加。
		if (self.lib[id] && self.lib[id].factory) return null;
		if (arguments.length < 4) return null;

		// deps 参数是可选的
		if (typeof deps == 'function') {
			factory = deps;
			deps = [];
		} else {
			deps = self.parseDeps(deps);
		}

		if (!factory || typeof factory != 'function') return null;

		var package = self.lib[id];

		// 已存在，说明是占位的
		if (package) {
			package.constructor = constructor;
			package.dependencies = deps;
			package.factory = factory;
			delete package.file;
		} else {
			// 建立前缀占位模块
			self.__makePrefixModule(id);
			package = self.lib[id] = new constructor(id, deps, factory);
		}

		return package;
	};

	/**
	 * @param id
	 * @param deps
	 * @param factory
	 */
	this.add = function(self, id, deps, factory) {
		return self.addPackage(id, deps, factory, Package);
	};

	/**
	 * 移除模块的定义
	 * @param name 需要移除模块的名字
	 * @param r 是否移除其所有子模块
	 */
	this.remove = function(self, name, r) {
		delete loader.lib[name];
		if (r) {
			Object.keys(loader.lib).forEach(function(key) {
				if (key.indexOf(name + '.') == 0) delete loader.lib[key];
			});
		}
	};

	/**
	 * execute
	 * @param id 执行的入口模块名称
	 */ 
	this.execute = function(self, id) {
		if (!id || typeof id != 'string') {
			return;
		}
		self.loadLib();

		var module = self.lib[id];
		if (!module) throw new object.NoModuleError(id);

		self.load(module, '__main__', self.createRuntime(id));
	};

	/**
	 * use
	 * @param deps 用逗号分隔开的模块名称列表
	 * @param context deps加载后调用，将module通过参数传入context，第一个参数为exports，后面的参数为每个module的不重复引用，顺序排列
	 */
	this.use = function(self, deps, context) {
		if (!context || typeof context != 'function') {
			return;
		}
		self.loadLib();

		var id = '__anonymous_' + self.anonymousModuleCount + '__';
		self.anonymousModuleCount++;
		var module = object.add(id, deps, context);

		// 不要用一个已经有内容、不可控的对象作为executeModule的exports。如window
		self.load(module, '__main__', self.createRuntime(id), function(exports) {
			for (var property in exports) {
				if (property != '__name__' && window[property] === undefined) window[property] = exports[property];
			}
		});

	};

	/**
	 * 建立一个普通的package
	 */
	this.createPackage = function(self, id, deps, factory) {
		return new Package(id, deps, factory);
	};

});

object.Loader = Loader;
object.NoModuleError = NoModuleError;
object.ModuleRequiredError = ModuleRequiredError;

})(object);
