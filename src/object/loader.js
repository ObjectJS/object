;(function(object) {

/**
 * 将name中的“.”换成id形式的“/”
 */
function name2id(name) {
	name = String(name);
	var id = name.replace(/\./g, '/');
	return id;
}

/**
 * 去掉路径中的最后文件部分
 */
function dirname(path) {
	path = path.substr(0, path.lastIndexOf('/'));
	if (!path) path = '/';
	return path;
}

/**
 * 格式化path
 */
function realpath(path) {
	// 去掉末尾的“/”
	if (path.lastIndexOf('/') == path.length - 1) path = path.slice(0, -1);
	if (!path) path = '/';
	return path;
}

/**
 * 拼接两个path
 */
function pathjoin(path1, path2) {
	var path;
	if (path1.lastIndexOf('/') != path1.length - 1) path1 += '/'; // 确保path1是个目录
	if (path2.indexOf('/') == 0) path = path2; // absolute path
	else path = path1 + path2; // join
	return realpath(path);
}

/**
 * 计算当前引用objectjs的页面文件的目录路径
 */
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

/**
 * 异步队列
 * @class
 */
function Queue(arr, opt) {
	this.source = arr;
	this.index = -1;
}

Queue.prototype.start = function() {
	this._next();
};

Queue.prototype._next = function() {
	this.index++;
	if (this.index == this.source.length) {
		this.done();
	} else {
		this.next(this._next.bind(this));
	}
};

/**
 * 模块
 * @class
 */
function Module(name) {
	this.__name__ = name;
}
Module.prototype.toString = function() {
	return '<module \'' + this.__name__ + '\'>';
};

/**
 * 找不到模块Error
 * @class
 */
function NoModuleError(id) {
	this.message = 'no module named ' + id;
};
NoModuleError.prototype = new Error();

/**
 * 未对模块进行依赖
 * @class
 */
function ModuleRequiredError(name, parent) {
	this.message = parent.module.id + ': module ' + name + ' required';
};
ModuleRequiredError.prototype = new Error();

/**
 * 循环依赖Error
 * @class
 * @param runtime 出现循环依赖时的堆栈
 * @param pkg 触发了循环依赖的模块
 */
function CyclicDependencyError(runtime, pkg) {
	this.runStack = runtime.stack;
	var msg = '';
	stack.forEach(function(m, i) {
		msg += m.module.id + '-->';
	});
	msg += pkg.id;
	this.message = msg + ' cyclic dependency.';
}
CyclicDependencyError.prototype = new Error();

/**
 * 普通Package
 * @class
 */
function CommonJSPackage(id, dependencies, factory) {
	Package.apply(this, arguments);
}

CommonJSPackage.prototype = new Package();

CommonJSPackage.prototype.constructor = CommonJSPackage;

/**
 * @override
 */
CommonJSPackage.prototype.load = function(name, runtime, callback) {
	var deps = [];
	var pkg = this;

	var queue = new Queue(this.dependencies);

	queue.done = function() {
		if (callback) callback(deps);
	};

	queue.next = function(next) {
		var dep = pkg.getDependency(pkg.dependencies[this.index], runtime);
		deps.push(dep);
		dep.load(runtime, next);
	};

	queue.start();
};

/**
 * 出现循环依赖但并不立刻报错，而是当作此模块没有获取到，继续获取下一个
 * @override
 */
CommonJSPackage.prototype.cyclicLoad = function(depName, runtime, next) {
	next();
};

/**
 * @override
 */
CommonJSPackage.prototype.exports = function(name, deps, runtime) {
	var exports = this.execute(name, deps, runtime);
	runtime.addModule(name, exports);
	return exports;
};

/**
 * 执行factory，返回模块实例
 */
CommonJSPackage.prototype.execute = function(name, deps, runtime) {
	var exports = runtime.modules[name] || new Module(name);
	var returnExports = this.factory.call(exports, this.createRequire(name, deps, runtime), exports, this);
	if (returnExports) {
		returnExports.__name__ = exports.__name__;
		exports = returnExports;
	}
	return exports;
};

CommonJSPackage.prototype.getDependency = function(name, runtime) {
	// object.define中，“.”作为分隔符的被认为是ObjectDependency，其他都是CommenJSDependency
	if (name.indexOf('/') == -1 && name.indexOf('.') != -1) {
		return new ObjectDependency(name, runtime);
	} else {
		return new CommonJSDependency(name, runtime);
	}
};

/**
 * 生成require
 */
CommonJSPackage.prototype.createRequire = function(name, deps, runtime) {
	var loader = runtime.loader;
	var pkg = this;
	function require(name) {
		var index = pkg.dependencies.indexOf(name);
		if (index == -1) {
			throw new ModuleRequiredError(name, pkg);
		}
		var dep = deps[index];
		var exports;
		dep.load(runtime, function(result) {
			var depPkg = loader.getModule(dep.id);
			if (result) {
				exports = depPkg.exports(name, result, runtime);
			} else {
				// 有依赖却没有获取到，说明是由于循环依赖
				if (pkg.dependencies.indexOf(name) != -1) {
					throw new CyclicDependencyError(runtime, depPkg);
				} else {
					// 出错
					console.warn('Unknown Error.');
				}
			}
		});
		return exports;
	}

	require.async = function(dependencies, callback) {
		// 创建一个同名package
		var newPkg = new CommonJSPackage(pkg.id, dependencies, function(require) {
			var args = [];
			dependencies.forEach(function(dep) {
				args.push(require(dep));
			});
			callback.apply(null, args);
		});
		newPkg.load(name, runtime);
	};

	return require;
};

/**
 * 文艺 Package
 */
function ObjectPackage(id, dependencies, factory) {
	Package.apply(this, arguments);
};

ObjectPackage.prototype = new Package();

ObjectPackage.prototype.constructor = ObjectPackage;

/**
 * @override
 */
ObjectPackage.prototype.load = function(name, runtime, callback) {
	var deps = [];
	var pkg = this;

	var queue = new Queue(this.dependencies);

	queue.done = function() {
		var exports = pkg.execute(name, deps, runtime);
		runtime.addModule(name, exports);
		if (callback) callback(exports);
	};

	queue.next = function(next) {
		var dep = pkg.getDependency(this.index, runtime);
		deps.push(dep);
		dep.load(runtime, function(exports) {
			dep.exports = exports;
			next();
		});
	};

	queue.start();

};

/**
 * 出现循环依赖时建立一个空的exports返回，待所有流程走完后会将此模块填充完整。
 * @override
 */
ObjectPackage.prototype.cyclicLoad = function(depName, runtime, next) {
	if (!(depName in runtime.modules)) {
		runtime.addModule(depName, new Module(depName));
	}
	var exports = runtime.modules[depName];
	// stack中，最后一个是自己，倒数第二个是parent
	var parent = runtime.stack[runtime.stack.length - 2];
	// 在空的exports上建立一个数组，用来存储依赖了此模块的所有模块
	if (!exports.__empty_refs__) {
		exports.__empty_refs__ = [];
	}
	exports.__empty_refs__.push(parent.module.id);
	next(exports);
};

/**
 * @override
 */
ObjectPackage.prototype.exports = function(name, exports, runtime) {
	return exports;
};

/**
 * 执行factory，返回模块实例
 */
ObjectPackage.prototype.execute = function(name, deps, runtime) {
	var exports = runtime.modules[name] || new Module(name);
	var returnExports;
	var args = [];
	deps.forEach(function(dep) {
		if (args.indexOf(dep.exports) == -1) {
			args.push(dep.exports);
		}
	});
	// 最后再放入exports，否则当错误的自己依赖自己时，会导致少传一个参数
	args.unshift(exports);
	if (this.factory) {
		returnExports = this.factory.apply(exports, args);
	}

	// 当有returnExports时，之前建立的空模块（即exports变量）则没有用武之地了，给出警告。
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

ObjectPackage.prototype.getDependency = function(index, runtime) {
	var name = this.dependencies[index];
	// object.add中，“/”作为分隔符的被认为是CommonJSDependency，其他都是ObjectDependency
	if (name.indexOf('/') != -1) {
		return new CommonJSDependency(name, runtime);
	} else {
		return new ObjectDependency(name, runtime);
	}
};

/**
 * XX Package
 */
function Package(id, dependencies, factory) {
	if (!id) return;

	this.id = id;
	this.factory = factory;
	this.dependencies = this.parseDependencies(dependencies);
}

/**
 * 加载package，通过callback返回
 */
Package.prototype.load = function(name, runtime, callback) {
	var exports = new Module(name);
	runtime.addModule(name, exports);
	// sys.modules
	if (this.id === '/root/sys') {
		exports.modules = runtime.modules;
	}
	if (callback) callback(exports);
};

/**
 * 处理出现循环依赖的情况
 * @param depName 此依赖被处理时的runtime name
 * @param runtime
 * @param next 处理完毕，执行下一个依赖
 */
Package.prototype.cyclicLoad = function(depName, runtime, next) {
	throw new CyclicDependencyError(runtime);
};

/**
 * 获取此package产生的模块的实例
 */
Package.prototype.exports = function(name, exports, runtime) {
	return exports;
};

/**
 * 处理传入的dependencies参数
 * 在parseDependencies阶段不需要根据名称判断去重（比如自己use自己），因为并不能避免所有冲突，还有循环引用的问题（比如 core use dom, dom use core）
 * @param {String} dependencies 输入
 */
Package.prototype.parseDependencies = function(dependencies) {
	if (Array.isArray(dependencies)) return dependencies;

	if (!dependencies) {
		return [];
	}

	dependencies = dependencies.trim().replace(/^,*|,*$/g, '').split(/\s*,\s*/ig);

	return dependencies;
};

function Dependency(name) {
	if (!name) return;
	this.name = name;
}

/**
 * @param name
 * @param module
 */
function CommonJSDependency(name, runtime) {
	var pParts, parts;
	var parent = runtime.stack[runtime.stack.length - 1];
	if (name.indexOf('/') == 0) { // root
		this.id = name;
		this.runtimeName = this.id;
	} else if (name.indexOf('./') == 0 || name.indexOf('../') == 0) { // relative
		pParts = parent.module.id.split('/');
		pParts.pop();
		parts = name.split(/\//ig);
		parts.forEach(function(part) {
			if (part == '.') {
			} else if (part == '..') {
				pParts.pop();
			} else {
				pParts.push(part);
			}
		});
		this.id = pParts.join('/');
		this.runtimeName = this.id;
	} else { // top level
		['/temp', '/root'].some(function(m) {
			var id = pathjoin(m, name2id(name));
			if (runtime.loader.getModule(id)) {
				this.id = id;
				this.runtimeName = name;
				return true;
			}
		}, this);
	}
	Dependency.call(this, name);
};

CommonJSDependency.prototype = new Dependency();

CommonJSDependency.prototype.constructor = CommonJSDependency;

CommonJSDependency.prototype.load = function(runtime, callback) {
	var exports = runtime.modules[this.runtimeName];
	if (exports) {
		callback(exports);
	} else {
		runtime.loadModule(this.id, this.runtimeName, callback);
	}
};

/**
 * @param name
 */
function ObjectDependency(name, runtime) {
	Dependency.call(this, name);

	// 依赖自己的模块
	var parent = runtime.stack[runtime.stack.length - 1];
	// 需要搜索的所有路径，runtime.context是内置默认的
	var paths = runtime.path.concat([runtime.context]);
	// context + partId == id
	var partId = name2id(this.name);
	// context为id的前缀部分，prefix为name的前缀部分
	var id, context, prefix;

	/**
	 * 检测此id的模块是否存在，若存在，则返回true
	 * @param tempContext 在此路径中寻找
	 * @param path 相对于调用者，正在哪个路径中寻找
	 */
	function find(tempContext, path) {
		var tempId = pathjoin(tempContext, partId);
		// 检测此tempId是否存在
		if (runtime.loader.getModule(tempId)) {
			id = tempId;
			context = tempContext;
			if (path == '') { // 在当前目录中找到的子模块
				prefix = parent.name;
			} else {
				prefix = '';
			}
			return true;
		}
		return false;
	}

	// 分别在以下空间中找：
	// 当前模块(sys.path中通过'.'定义)；
	// 全局模块(sys.path中通过'/root'定义)；
	// 用户模块(sys.path中通过'/temp'定义)；
	// 运行时路径上的模块(默认的)。
	for (var i = 0, l = paths.length, path, findpath; i < l; i++) {
		path = paths[i];

		// 先找子模块
		findpath = pathjoin(parent.module.id, path);
		if (find(findpath, path)) {
			break;
		}

		// 再找同级模块
		findpath = dirname(findpath)
		if (find(findpath, pathjoin(path, '../'))) {
			break;
		}
	}

	// 当一个名为 a/b/c/d/e/f/g 的模块被 a/b/c/d/e/ 在 a/b/c 运行空间下通过 f.g 依赖时：
	// runtime.context: a/b/c
	// dep->name: f.g
	// dep->id: a/b/c/d/e/f/g

	// 当一个名为 a/b/c/d/e/f/g 的模块被 a/b/c/d/e/ 在 xxx/xxx 运行空间下通过 f.g 依赖时：
	// runtime.context: xxx/xxx
	// dep->name: f.g
	// dep->id: a/b/c/d/e/f/g

	// 模块name
	this.nameParts = this.name.split('.');
	// 完整模块id
	this.id = id;
	// id的前缀
	this.context = context;
	// 运行名字的前缀
	this.prefix = prefix;
};

ObjectDependency.prototype = new Dependency();

ObjectDependency.prototype.constructor = ObjectDependency;

ObjectDependency.prototype.load = function(runtime, callback) {
	var context = this.context || '';
	var prefix = this.prefix;
	var pName = prefix;

	/**
	 * 依次获取当前模块的每个部分
	 * 如a.b.c，依次获取a、a.b、a.b.c
	 */
	var queue = new Queue(this.nameParts);

	queue.next = function(next) {
		var id = pathjoin(context, this.source.slice(0, this.index + 1).join('/'));
		var part = this.source[this.index];
		var name = (pName? pName + '.' : '') + part;
		var exports = runtime.modules[name];
		// 使用缓存中的
		if (exports) {
			pName = name;
			next(exports);
		} else {
			runtime.loadModule(id, name, function(exports) {
				runtime.setMemberTo(pName, part, exports);
				pName = name;
				next();
			});
		}
	};

	queue.done = function() {
		callback(runtime.modules[(prefix? prefix + '.' : '') + this.source[0]]);
	};

	queue.start();
};

/**
 * Loader运行时，每一个use、execute产生一个
 */
function LoaderRuntime(context) {

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
	this.context = context;

	/**
	 * sys.path
	 */
	this.path = ['', '/temp', '/root'];
}

/**
 * 加入一个module
 */
LoaderRuntime.prototype.addModule = function(name, exports) {
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
};

/**
* 加载一个module
*/
LoaderRuntime.prototype.loadModule = function(id, name, callback) {

	var runtime = this;
	var loader = this.loader;
	var stack = this.stack;

	var pkg = loader.getModule(id);
	// No module
	if (!pkg) {
		throw new NoModuleError(id);
	}

	function done(result) {
		// 模块load完毕，去除循环依赖检测
		stack.pop();
		if (callback) callback(result);
	}

	function fileDone() {
		var id = pkg.id;
		var file = pkg.file;
		// 重新读取pkg，之前的pkg只是个fileLib中的占位
		pkg = loader.lib[id];

		// 加载进来的脚本没有替换掉相应的模块，文件有问题。
		if (!pkg) {
			throw new Error(file + ' do not add ' + id);
		}
		pkg.load(name, runtime, done);
	}

	var info = {
		name: name,
		module: pkg
	};

	// 记录开始获取当前模块
	stack.push(info);

	// 刚刚push过，应该在最后一个，如果不在，说明循环依赖了
	if (stack.some(function(m, i) {
		// 非最后一个，且名字相等。
		return (i != stack.length - 1) && (m.name === info.name);
	}, this)) {
		pkg.cyclicLoad(name, this, done);
	}

	// file
	else if (pkg.file) {
		// TODO 加入预处理过程，跑出所有需要加载的文件并行加载，在此执行useScript而不是loadScript
		loader.loadScript(pkg.file, fileDone, true);

	// Already define
	} else {
		pkg.load(name, this, done);
	}
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
};

/**
 * object的包管理器
 */
function Loader() {
	this.useCache = true;
	this.lib = {
		'/root/sys': new Package('/root/sys')
	};
	this.fileLib = {};
	this.prefixLib = {};
	this.anonymousModuleCount = 0;

	this.scripts = document.getElementsByTagName('script');
}

// 用于保存url与script节点的键值对
Loader._urlNodeMap = {};

// global pageDir
Loader._pageDir = null;

/**
 * 通过一个src，获取对应文件的绝对路径
 * 例如：http://hg.xnimg.cn/a.js -> http://hg.xnimg.cn/a.js
 *       file:///dir/a.js -> file:///dir/a.js
 *       in http://host/b/c/d/e/f.html, load ../g.js -> http://host/a/b/d/g.js
 *       in file:///dir/b/c/d/e/f.html, load ../g.js -> file:///dir/a/b/d/g.js
 *
 * @param src 地址
 */
Loader.getAbsolutePath = function(src) {

	// 如果本身是绝对路径，则返回src的清理版本
	if (src.indexOf('://') != -1 || src.indexOf('//') === 0) {
		return cleanPath(src);
	}

	if (!Loader._pageDir) {
		Loader._pageDir = calculatePageDir();
	}
	return cleanPath(Loader._pageDir + src);
};

/**
 * 查找页面中的标记script标签，更新 this.fileLib
 */
Loader.prototype.buildFileLib = function() {

	var scripts = this.scripts;

	for (var i = 0, script, names, src, l = scripts.length; i < l; i++) {
		script = scripts[i];
		src = script.getAttribute('data-src');
		names = script.getAttribute('data-module');
		if (!names || !src) continue;
		names.split(/\s+/ig).forEach(function(name) {
			this.defineFile(pathjoin('/temp', name2id(name)), src);
		}, this);
	}
};

/**
 * TODO
 */
Loader.prototype.useScript = function(src, callback) {
};

/**
 * 加载一个script, 执行callback
 * 有冲突检测，如果连续调用两次loadScript同一src的话，则第二个调用会等第一个完毕后直接执行callback，不会加载两次。
 *
 * @param src 地址
 * @param callback callback函数
 */
Loader.prototype.loadScript = function(src, callback, useCache) {
	if (!src || typeof src != 'string') {
		throw new Error('bad arguments.');
	}
	src = src.trim();
	var absPath = Loader.getAbsolutePath(src);
	if (useCache) {
		var urlNodeMap = Loader._urlNodeMap, scriptNode = urlNodeMap[absPath];
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
};

/**
 * 根据src属性，删除一个script标签，并且清除对应的键值对缓存记录
 * @param src 路径
 */
Loader.prototype.removeScript = function(src) {
	if (!src || typeof src != 'string') {
		throw new Error('bad arguments.');
	}
	src = src.trim();
	// 转换为绝对路径
	var absPath = Loader.getAbsolutePath(src);
	// 获取节点
	var urlNodeMap = Loader._urlNodeMap, scriptNode = urlNodeMap[absPath];
	// 如果节点存在，则删除script，并从缓存中清空
	if (scriptNode) {
		delete urlNodeMap[absPath];
		if (scriptNode.parentNode) {
			scriptNode.parentNode.removeChild(scriptNode);
		}
		scriptNode = null;
	}
};

/**
 * 建立一个runtime
 */
Loader.prototype.createRuntime = function(id) {
	var runtime = new LoaderRuntime(id);
	runtime.loader = this;
	return runtime;
};

/**
 * 建立前缀模块
 * 比如 a/b/c/d ，会建立 a a/b a/b/c 三个空模块，最后一个模块为目标模块
 */
Loader.prototype.definePrefixFor = function(id) {
	if (!id || typeof id != 'string') return;

	var idParts = id.split('/');
	for (var i = 0, prefix, pkg, l = idParts.length - 1; i < l; i++) {
		prefix = idParts.slice(0, i + 1).join('/');
		this.definePrefix(prefix);
	}
};

/**
 * 定义一个prefix module
 */
Loader.prototype.definePrefix = function(id) {
	if (!id || typeof id != 'string') return;

	if (id in this.lib || id in this.prefixLib) return;
	this.prefixLib[id] = new Package(id);
};

/**
 * 定义一个file module，供异步加载
 */
Loader.prototype.defineFile = function(id, src) {
	if (!id || typeof id != 'string') return;

	if (this.fileLib[id]) return;

	// prefix已注册
	if (id in this.prefixLib) {
		delete this.prefixLib[id];
	}
	// 添加前缀module到prefixLib
	else {
		this.definePrefixFor(id);
	}

	var pkg = new Package(id);
	pkg.file = src;
	this.fileLib[id] = pkg;
};

/**
 * 定义一个普通module
 */
Loader.prototype.defineModule = function(constructor, id, dependencies, factory) {
	if (arguments.length < 4) return;

	// 不允许重复添加。
	if (id in this.lib) return;

	// prefix已注册
	if (id in this.prefixLib) {
		delete this.prefixLib[id];
	}
	// file已注册
	else if (id in this.fileLib) {
		delete this.fileLib[id];
	}
	// 添加前缀package到prefixLib
	else {
		this.definePrefixFor(id);
	}

	var pkg = new constructor(id, dependencies, factory);
	this.lib[id] = pkg;

	return pkg;
};

/**
 * @param name
 * @param dependencies
 * @param factory
 */
Loader.prototype.define = function(name, dependencies, factory) {
	if (typeof name != 'string') return;

	if (typeof dependencies == 'function') {
		factory = dependencies;
		dependencies = [];
	}

	this.defineModule(CommonJSPackage, pathjoin('/temp', name2id(name)), dependencies, factory);
};

/**
 * @param id
 */
Loader.prototype.getModule = function(id) {
	return this.lib[id] || this.fileLib[id] || this.prefixLib[id];
};

/**
 * @param name
 * @param dependencies
 * @param factory
 */
Loader.prototype.add = function(name, dependencies, factory) {
	if (typeof name != 'string') return;

	if (typeof dependencies == 'function') {
		factory = dependencies;
		dependencies = [];
	}

	// 若为相对路径，则放在temp上
	var id = pathjoin('/temp', name2id(name));
	this.defineModule(ObjectPackage, id, dependencies, factory);
};

/**
 * 移除模块的定义
 * @param name 需要移除模块的name
 * @param all 是否移除其所有子模块
 */
Loader.prototype.remove = function(name, all) {
	var id = pathjoin('/temp', name2id(name));
	delete this.lib[id];
	if (all) {
		Object.keys(this.lib).forEach(function(key) {
			if (key.indexOf(id + '/') == 0) {
				delete this.lib[key];
			}
		}, this);
	}
};

/**
 * execute
 * @param name 执行的入口模块名称
 */ 
Loader.prototype.execute = function(name) {
	if (!name || typeof name != 'string') {
		return;
	}
	this.buildFileLib();

	var id = pathjoin('/temp', name2id(name));

	var runtime = this.createRuntime(id);
	runtime.loadModule(id, '__main__');
};

/**
 * use
 * @param dependencies 用逗号分隔开的模块名称列表
 * @param factory dependencies加载后调用，将module通过参数传入factory，第一个参数为exports，后面的参数为每个module的不重复引用，顺序排列
 */
Loader.prototype.use = function(dependencies, factory) {
	if (!factory || typeof factory != 'function') {
		return;
	}
	this.buildFileLib();

	var id = '__anonymous_' + this.anonymousModuleCount + '__';
	this.anonymousModuleCount++;

	var pkg = this.defineModule(CommonJSPackage, id, dependencies, function(require, exports, module) {
		var args = [];
		module.dependencies.forEach(function(dependency) {
			dep = require(dependency);
			if (args.indexOf(dep) == -1) {
				args.push(dep);
			}
		});

		if (factory.length == args.length + 1) {
			if (typeof console != 'undefined') {
				console.warn('object.use即将不再支持第一个exports参数，请尽快删除。');
			}
			args.unshift(exports);
		}
		factory.apply(null, args);
	});

	var runtime = this.createRuntime(id);
	var name = '__main__';

	runtime.loadModule(id, name, function(deps) {
		pkg.exports(name, deps, runtime);
	});
};

object.Loader = Loader;
object.NoModuleError = NoModuleError;
object.ModuleRequiredError = ModuleRequiredError;

})(object);
