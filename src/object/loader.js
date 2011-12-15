;(function(object) {

/**
 * 模块
 */
function Module(name) {
	this.__name__ = name;
}
Module.prototype.toString = function() {
	return '<module \'' + this.__name__ + '\'>';
};

/**
 * 找不到模块Error
 */
function NoModuleError(name) {
	this.message = 'no module named ' + name;
};
NoModuleError.prototype = new Error();

/**
 * 未对模块进行依赖
 */
function ModuleRequiredError(name) {
	this.message = 'module ' + name + ' required';
};
ModuleRequiredError.prototype = new Error();

/**
 * 循环依赖Error
 */
function CyclicDependencyError(id) {
	this.message = id + ' cyclic dependency.';
}
CyclicDependencyError.prototype = new Error('循环依赖');

/**
 * 普通Package
 */
function CommonJSPackage(id, deps, factory) {
	Package.apply(this, arguments);
}

CommonJSPackage.prototype = new Package();

CommonJSPackage.prototype.constructor = CommonJSPackage;

/**
 * 执行一个package，返回其exports
 */
CommonJSPackage.prototype.execute = function(name, runtime) {
	var exports = runtime.modules[name] || new Module(name);
	var returnExports = this.factory.call(exports, this.createRequire(name, runtime), exports, this);
	if (returnExports) {
		returnExports.__name__ = exports.__name__;
		exports = returnExports;
	}
	return exports;
};

CommonJSPackage.prototype.createRequire = function(name, runtime) {
	var loader = runtime.loader;
	var module = this;
	function require(id) {
		var dep = module.getDep(id);
		if (!dep) {
			throw new ModuleRequiredError(id);
		}
		var exports = dep.getRef(runtime);
		// 有依赖却没有获取到，说明是由于循环依赖
		if (!exports && module.dependencies.indexOf(id) != -1) {
			throw new CyclicDependencyError(id);
		}
		return exports;
	}

	require.async = function(deps, callback) {
		deps = module.parseDeps(deps);
		var pkg = new CommonJSPackage(name, deps, function(require) {
			var args = [];
			deps.forEach(function(dep) {
				args.push(require(dep));
			});
			callback.apply(null, args);
		});
		pkg.load(name, runtime);
	};

	return require;
};

/**
 * 文艺 Package
 */
function ObjectPackage(id, deps, factory) {
	Package.apply(this, arguments);
};

ObjectPackage.prototype = new Package();

ObjectPackage.prototype.constructor = ObjectPackage;

/**
 * 执行一个package，返回其exports
 */
ObjectPackage.prototype.execute = function(name, runtime) {
	var exports = runtime.modules[name] || new Module(name);
	var args = [exports];
	this.dependencies.forEach(function(depId) {
		var depExports = this.getDep(depId).getRef(runtime);
		if (args.indexOf(depExports) == -1) {
			args.push(depExports);
		}
	}, this);
	var returnExports = this.factory.apply(exports, args);
	if (returnExports) {
		// 检测是否有子模块引用了本模块
		if (exports.__empty_refs__) {
			exports.__empty_refs__.forEach(function(ref) {
				if (typeof console != 'undefined') {
					console.warn(ref + '无法正确获得' + name + '模块的引用。因为该模块是通过return返回模块实例的。');
				}
			});
		}

		returnExports.__name__ = exports.__name__;
		exports = returnExports;
	} else {
		delete exports.__empty_refs__;
	}
	return exports;
};

ObjectPackage.prototype.handleCyclicDependency = function(dep, pkg, runtime, next) {
	var exports = runtime.modules[dep.id] || new Module(dep.id);
	runtime.modules[dep.id] = exports;
	if (!exports.__empty_refs__) exports.__empty_refs__ = [];
	exports.__empty_refs__.push(pkg.id);
	next(exports);
};

/**
 * XX Package
 */
function Package(id, deps, factory) {
	if (!id) return;

	this.id = id.replace(/\//g, '.');
	this.dependencies = this.parseDeps(deps);
	this.factory = factory;
	this.deps = {};
	this.initDeps();
}

Package.prototype.initDeps = function() {
	this.dependencies.forEach(function(depId) {
		var dep;
		if (depId.indexOf('/') != -1) {
			dep = new CommonJSDependency(depId, this);
		} else {
			dep = new ObjectDependency(depId, this);
		}
		this.deps[depId] = dep;
	}, this);
};

Package.prototype.execute = function(name, runtime) {
	return new Module(name);
};

Package.prototype.load = function(name, runtime, callback) {
	var currentUse = -1; 
	var pkg = this;

	/**
	 * 顺序执行pkg中的dependencies
	 * @param pExports 上一个nextDep返回的模块实例
	 */
	function nextDep(pExports) {
		var deps = pkg.dependencies;
		var factory = pkg.factory;
		var dep, depPkg;

		if (pExports) {
			// 模块获取完毕，去除循环依赖检测
			runtime.stack.pop();
		}

		currentUse++;

		// 模块获取完毕，执行factory，将exports通过callback传回去。
		// 已经处理到最后一个
		if (currentUse == deps.length) {
			doneDep();

		} else {
			dep = pkg.getDep(deps[currentUse]);
			depPkg = dep.getModule(runtime);

			// 记录开始获取当前模块
			runtime.stack.push(depPkg);

			// 刚刚push过，应该在最后一个，如果不在，说明循环依赖了
			if (runtime.stack.indexOf(depPkg) != runtime.stack.length - 1) {
				depPkg.handleCyclicDependency(dep, pkg, runtime, nextDep);

			} else {
				dep.load(runtime, nextDep);
			}
		}
	}

	/**
	 * 已执行完毕最后一个dependency
	 */
	function doneDep() {
		if (!name) name = pkg.id; // 没有指定name，则使用全名

		var exports = pkg.execute(name, runtime);

		runtime.addModule(name, exports);

		// sys.modules
		if (exports.__name__ === 'sys') exports.modules = runtime.modules;

		if (callback) callback(exports, name);
	}

	nextDep();
};

Package.prototype.handleCyclicDependency = function(dep, pkg, runtime, next) {
	// 但并不立刻报错，而是当作此模块没有获取到，继续获取下一个
	next();
};

Package.prototype.getDep = function(id) {
	return this.deps[id];
};

/**
 * 处理传入的deps参数
 * 在parseDeps阶段不需要根据名称判断去重（比如自己use自己），因为并不能避免所有冲突，还有循环引用的问题（比如 core use dom, dom use core）
 * @param {String} deps 输入
 */
Package.prototype.parseDeps = function(deps) {
	if (Array.isArray(deps)) return deps;

	if (!deps) {
		return [];
	}

	deps = deps.trim();
	if (/^\.[^\/]|\.$/.test(deps)) {
		throw new Error('deps should not startWith/endWith \'.\', except startWith \'./\'');
	}
	deps = deps.replace(/^,*|,*$/g, '');
	deps = deps.split(/\s*,\s*/ig);

	return deps;
};

function Dependency(id, owner) {
	if (!id) return;
	this.id = id;
	this.owner = owner;
}

Dependency.prototype.getModule = function(runtime) {
	var pkg = runtime.loader.getModule(this.moduleId); 
	return pkg;
};

/**
 * @param id
 * @param module
 */
function CommonJSDependency(id, owner) {
	if (id.indexOf('./') == 0) {
		id = id.slice(2);
		id = id.replace(/\//g, '.');
		this.moduleId = owner.id + '.' + id;
		id = './' + id;
	} else {
		id = id.replace(/\//g, '.');
		this.moduleId = id;
	}
	Dependency.call(this, id, owner);
};

CommonJSDependency.prototype = new Dependency();

CommonJSDependency.prototype.constructor = CommonJSDependency;

/**
 * 处理当前模块
 * @param callback 异步方法，模块获取完毕后通过callback的唯一参数传回
 */
CommonJSDependency.prototype.load = function(runtime, callback) {
	var ownerId = this.owner.id;
	var id = this.id;

	var isRelative = false;
	var context;
	// Relative
	if (id.indexOf('.\/') == 0) {
		id = id.slice(2);
		context = runtime.getName(ownerId);
		// 去除root
		// 说明确实去除了root，是一个相对引用，在获取fullId时需要加上root
		isRelative = (context != ownerId);
	}

	id = context? (context + '.' + id) : id;
	fullId = isRelative? runtime.getId(id) : id;
	runtime.loadModule(fullId, id, callback);
};

/**
 * 获取此依赖的引用
 */
CommonJSDependency.prototype.getRef = function(runtime) {
	var root = runtime.getName(this.moduleId);
	return runtime.modules[root];
};

ObjectDependency = function(id, owner) {
	if (id.indexOf('./') == 0) {
		id = id.slice(2);
		this.moduleId = owner.id + '.' + id;
		this.idParts = id.split('.');
		this.root = owner.id + '.' + this.idParts[0];
		this.isRelative = true;
		id = './' + id;
	} else {
		this.idParts = id.split('.');
		this.root = this.idParts[0];
		this.moduleId = id;
	}
	Dependency.call(this, id, owner);
};

ObjectDependency.prototype = new Dependency();

ObjectDependency.prototype.constructor = ObjectDependency;

ObjectDependency.prototype.load = function(runtime, callback) {
	var ownerId = this.owner.id;
	var idParts = this.idParts;
	var context = null; // 当前dep是被某个模块通过相对路径调用的
	var moduleId = ''; // 当前模块在运行时保存在modules中的名字，为context+idParts的第一部分
	var isRelative = false; // 当前dep是否属于execute的模块的子模块，如果是，生成的名称应不包含其前缀
	var pId, part, partId, currentPart = -1;

	/**
	 * 依次获取当前模块的每个部分
	 * 如a.b.c，依次获取a、a.b、a.b.c
	 * @param pExprorts 上一部分的模块实例，如果是初次调用，为空
	 * @param id 截止到当前部分的包含context前缀的名字
	 */
	function nextPart(pExports, id) {

		var fullId, depModule;

		if (pExports) {
			runtime.setModule(id, pExports);
			// 生成对象链
			runtime.setMemberTo(pId, part, pExports);
		}

		pId = id;

		currentPart++;

		if (currentPart == idParts.length) {
			callback(runtime.modules[moduleId]);

		} else {
			part = idParts[currentPart];
			partId = (pId? pId + '.' : '') + part;
			fullId = isRelative? runtime.getId(partId) : partId;
			runtime.loadModule(fullId, partId, nextPart);
		};
	}

	// Relative
	if (this.isRelative) {
		// 去除root
		context = runtime.getName(ownerId);
		// 说明确实去除了root，是一个相对引用，在获取fullId时需要加上root
		isRelative = (context != ownerId);
	}

	moduleId = (context? context + '.' : '') + idParts[0];

	nextPart(null, context);
};

/**
 * 获取此依赖的引用
 */
ObjectDependency.prototype.getRef = function(runtime) {
	var root = runtime.getName(this.root);
	return runtime.modules[root];
};

/**
 * Loader运行时，每一个use、execute产生一个
 */
function LoaderRuntime(root) {

	/**
	 * 此次use运行过程中用到的所有module
	 */
	this.modules = {};

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

LoaderRuntime.prototype = {
	/**
	 * 加入一个module
	 */
	addModule: function(name, exports) {
		exports = exports || new Module(name);
		this.modules[name] = exports;

		// 已获取到了此host的引用，将其子模块都注册上去。
		var members = this.members[name];
		if (members) {
			members.forEach(function(member) {
			  this.modules[name][member.id] = member.value;
			}, this);
		}

		return exports;
	},

	/**
	 * 设置一个已存在的module
	 */
	setModule: function(name, exports) {
		this.modules[name] = exports;
	},

	/**
	* 加载一个module
	*/
	loadModule: function(id, name, callback) {
		var loader = this.loader;

		var exports = this.modules[name];

		// 使用缓存中的
		if (exports) {
			callback(exports, name);

		} else {
			loader.load(id, name, this, callback);
		}
	},

	/**
	 * 加上root前缀的完整id
	 */
	getId: function(name) {
		return this.root + '.' + name;
	},

	/**
	 * 去掉root前缀的模块名
	 */
	getName: function(id) {
		var root = this.root;
		if (id == root || id.indexOf(root + '.') == 0) {
			id = id.slice(root.length + 1);
		}
		return id;
	},

	/**
	 * 为名为host的module设置member成员为value
	 */
	setMemberTo: function(host, member, value) {

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
	}
};

// 计算当前引用objectjs的页面文件的目录路径
function calculatePageDir() {
	var loc = window['location'];
	var pageUrl = loc.protocol + '//' + loc.host + (loc.pathname.charAt(0) !== '/' ? '/' : '') + loc.pathname; 
	// IE 下文件系统是以\为分隔符，统一改为/
	if (pageUrl.indexOf('\\') != -1) {
		pageUrl = pageUrl.replace(/\\/g, '/');
	}
	var pageDir = './';
	if (pageUrl.indexOf('/') != -1) {
		// 去除文件，留下目录path
		pageDir = pageUrl.substring(0, pageUrl.lastIndexOf('/') + 1);
	}
	return pageDir;
}


var pageDir = calculatePageDir();

/**
 * object的包管理器
 * 这个class依赖于object._lib ，且会修改它
 */
var Loader = new Class(function() {

	// 用于保存url与script节点的键值对
	this._urlNodeMap = {};

	this.scripts = document.getElementsByTagName('script');

	this.initialize = function(self) {
		self.useCache = true;
		self.lib = {
			'sys': new Package('sys', [], function() {})
		};
		self.fileLib = {};
		self.prefixLib = {};
		self.anonymousModuleCount = 0;
	};

	/**
	 * 将路径形式的id转换成.形式
	 */
	this.parseId = function(self, id) {
		return id.replace(/\//g, '.');
	};

	/**
	 * 加载一个module
	 *
	 * @param pkg 被执行的module
	 * @param name 执行时的name
	 * @param {LoaderRuntime} runtime
	 * @param callback 异步方法，执行完毕后调用，传入模块实例及名字
	 */
	this.load = function(self, id, name, runtime, callback) {

		var pkg = self.getModule(id);

		// No module
		if (!pkg) {
			throw new NoModuleError(id);
		}

		// file
		else if (pkg.file) {
			// TODO 加入预处理过程，跑出所有需要加载的文件并行加载，在此执行useScript而不是loadScript
			self.loadScript(pkg.file, function() {
				var id = pkg.id;
				var file = pkg.file;
				// 重新读取pkg，之前的pkg只是个fileLib中的占位
				pkg = self.lib[id];

				// 加载进来的脚本没有替换掉相应的模块，文件有问题。
				if (!pkg) {
					throw new Error(file + ' do not add ' + id);
				}
				pkg.load(name, runtime, callback);
			}, true);

		// Already define
		} else {
			pkg.load(name, runtime, callback);
		}
	};

	/**
	 * 查找页面中的标记script标签，更新 self.fileLib
	 */
	this.buildFileLib = function(self) {

		var scripts = self.scripts;

		for (var i = 0, script, ids, src, l = scripts.length; i < l; i++) {
			script = scripts[i];
			src = script.getAttribute('data-src');
			ids = script.getAttribute('data-module');
			if (!ids || !src) continue;
			ids.split('\s+').forEach(function(id) {
				self.defineFile(id, src);
			});
		}
	};

	/**
	 * 通过一个src，获取对应文件的绝对路径
	 * 例如：http://hg.xnimg.cn/a.js -> http://hg.xnimg.cn/a.js
	 *       file:///dir/a.js -> file:///dir/a.js
	 *       in http://host/b/c/d/e/f.html, load ../g.js -> http://host/a/b/d/g.js
	 *       in file:///dir/b/c/d/e/f.html, load ../g.js -> file:///dir/a/b/d/g.js
	 *
	 * @param src 地址
	 */
	this._getAbsolutePath = staticmethod(function(src) {

		/**
		 * 清理路径url，去除相对寻址符号
		 */
		function cleanPath(path) {
			// 去除多余的/
			path = path.replace(/([^:\/])\/+/g, '$1\/');
			// 如果没有相对寻址，直接返回path
			if (path.indexOf('.') === -1) {
				return path;
			}

			var parts = path.split('/');
			// 把所有的普通var变量都写在一行，便于压缩
			var result = [];

			for (var i = 0, part, len = parts.length; i < len; i++) {
				part = parts[i];
				if (part === '..') {
					if (result.length === 0) {
						throw new Error('invalid path: ' + path);
					}
					result.pop();
				} else if (part !== '.') {
					result.push(part);
				}
			}

			// 去除尾部的#号
			return result.join('/').replace(/#$/, '');
		}

		// 如果本身是绝对路径，则返回src的清理版本
		if (src.indexOf('://') != -1 || src.indexOf('//') === 0) {
			return cleanPath(src);
		}

		return cleanPath(pageDir + src);
	});

	/**
	 * TODO
	 */
	this.useScript = function(self, src, callback) {
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
		var absPath = cls._getAbsolutePath(src);
		if (useCache) {
			var urlNodeMap = cls.get('_urlNodeMap'), scriptNode = urlNodeMap[absPath];
			if (scriptNode) {
				if (scriptNode.loading) {
					// 增加一个回调即可
					scriptNode.callbacks.push(callback);
				} else {
					callback(scriptNode);
				}
				return;
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

		if (useCache) { 
			// 利用绝对路径来存键值对，key为绝对路径，value为script节点
			urlNodeMap[absPath] = ele;
		}
	});

	/**
	 * 根据src属性，删除一个script标签，并且清除对应的键值对缓存记录
	 * 目前只供单元测试还原测试环境使用
	 * @param src 路径
	 */
	this.removeScript = classmethod(function(cls, src) {
		if (!src || typeof src != 'string') {
			throw new Error('src should be string');
		}
		src = src.trim();
		// 转换为绝对路径
		var absPath = cls._getAbsolutePath(src);
		// 获取节点
		var urlNodeMap = cls.get('_urlNodeMap'), scriptNode = urlNodeMap[absPath];
		// 如果节点存在，则删除script，并从缓存中清空
		if (scriptNode) {
			delete urlNodeMap[absPath];
			if (scriptNode.parentNode) {
				scriptNode.parentNode.removeChild(scriptNode);
			}
			scriptNode = null;
		}
	});

	/**
	 * 建立一个runtime
	 */
	this.createRuntime = function(self, id) {
		var runtime = new LoaderRuntime(id);
		runtime.loader = self;
		return runtime;
	};

	/**
	 * 建立前缀模块
	 * 比如 a.b.c.d ，会建立 a a.b a.b.c 三个空模块，最后一个模块为目标模块
	 */
	this.definePrefixFor = function(self, id) {
		if (!id || typeof id != 'string') return;
		if (arguments.length < 2) return;
		id = self.parseId(id);

		var idParts = id.split('.');
		for (var i = 0, prefix, pkg, l = idParts.length - 1; i < l; i++) {
			prefix = idParts.slice(0, i + 1).join('.');
			self.definePrefix(prefix);
		}
	};

	/**
	 * 定义一个prefix module
	 */
	this.definePrefix = function(self, id) {
		if (!id || typeof id != 'string') return;
		if (arguments.length < 2) return;

		id = self.parseId(id);

		if (self.prefixLib[id]) return;
		self.prefixLib[id] = new Package(id, [], function(){});
	};

	/**
	 * 定义一个file module，供异步加载
	 */
	this.defineFile = function(self, id, src) {
		if (!id || typeof id != 'string') return;
		if (arguments.length < 2) return;
		id = self.parseId(id);

		if (self.fileLib[id]) return;

		// prefix已注册
		if (id in self.prefixLib) {
			delete self.prefixLib[id];
		}
		// 添加前缀module到prefixLib
		else {
			self.definePrefixFor(id);
		}

		self.fileLib[id] = {
			id: id,
			file: src
		};
	};

	/**
	 * 定义一个普通module
	 */
	this.defineModule = function(self, constructor, id, deps, factory) {
		if (!id || typeof id != 'string') return;
		if (arguments.length < 4) return;

		// deps 参数是可选的
		if (typeof deps == 'function') {
			factory = deps;
			deps = [];
		}

		if (!factory || typeof factory != 'function') return;

		id = self.parseId(id);

		// 不允许重复添加。
		if (id in self.lib) return;

		// prefix已注册
		if (id in self.prefixLib) {
			delete self.prefixLib[id];
		}
		// file已注册
		else if (id in self.fileLib) {
			delete self.fileLib[id];
		}
		// 添加前缀module到prefixLib
		else {
			self.definePrefixFor(id);
		}

		var pkg = new constructor(id, deps, factory);
		self.lib[id] = pkg;
	};

	/**
	 * @param id
	 * @param deps
	 * @param factory
	 */
	this.define = function(self, id, deps, factory) {
		self.defineModule(CommonJSPackage, id, deps, factory);
	};

	/**
	 * @param id
	 * @param deps
	 * @param factory
	 */
	this.add = function(self, id, deps, factory) {
		self.defineModule(ObjectPackage, id, deps, factory);
	};

	/**
	 * @param id
	 */
	this.getModule = function(self, id) {
		return self.lib[id] || self.fileLib[id] || self.prefixLib[id];
	};

	/**
	 * 移除模块的定义
	 * @param id 需要移除模块的id
	 * @param all 是否移除其所有子模块
	 */
	this.remove = function(self, id, all) {
		delete self.lib[id];
		if (all) {
			Object.keys(self.lib).forEach(function(key) {
				if (key.indexOf(id + '.') == 0) delete self.lib[key];
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
		self.buildFileLib();

		var runtime = self.createRuntime(id);
		runtime.loadModule(id, '__main__');
	};

	/**
	 * use
	 * @param deps 用逗号分隔开的模块名称列表
	 * @param factory deps加载后调用，将module通过参数传入factory，第一个参数为exports，后面的参数为每个module的不重复引用，顺序排列
	 */
	this.use = function(self, deps, factory) {
		if (!factory || typeof factory != 'function') {
			return;
		}
		self.buildFileLib();

		var id = '__anonymous_' + self.anonymousModuleCount + '__';
		self.anonymousModuleCount++;

		object.define(id, deps, function(require, exports, module) {
			var args = [];
			module.dependencies.forEach(function(dep) {
				dep = require(dep);
				if (args.indexOf(dep) == -1) {
					args.push(dep);
				}
			});

			if (['exports', 'e'].indexOf(/^function.*\((.*)\)/.exec(factory.toString())[1].split(/\s*,\s*/)[0]) != -1) {
				if (typeof console != 'undefined') {
					console.warn('object.use即将不再支持第一个exports参数，请尽快删除。');
				}
				args.unshift(exports);
			}
			factory.apply(null, args);
		});

		var runtime = self.createRuntime(id);
		runtime.loadModule(id, '__main__', function() {});
	};

});

object.Loader = Loader;
object.NoModuleError = NoModuleError;
object.ModuleRequiredError = ModuleRequiredError;

})(object);
