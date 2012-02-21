;(function(object) {

var pathutil = {};

;(function(exports) {

	/**
	 * 拆分dirname和basename
	 */
	exports.split = function(path) {
		var i = path.length;
		var seps = ['\/', '\\'];

		while (i && seps.indexOf(path.charAt(i - 1)) == -1) {
			i--;
		}

		var head = path.slice(0, i);
		var tail = path.slice(i);

		var head2 = head;
		while (head2 && seps.indexOf(head2.slice(-1)) != -1) {
			head2 = head2.slice(0, -1);
		}

		head = head2 || head;

		return [head, tail];
	};

	/**
	 * 去掉路径中的最后文件部分
	 */
	exports.dirname = function(path) {
		return exports.split(path)[0];
	};

	/**
	 * 只保留路径中的最后文件部分
	 */
	exports.basename = function(path) {
		return exports.split(path)[1];
	};

	/**
	 * 格式化path
	 */
	exports.realpath = function(path) {
		// 去掉末尾的“/”
		if (path.lastIndexOf('/') == path.length - 1) path = path.slice(0, -1);
		if (!path) path = '/';

		var result = [];

		parts = path.split(/\//ig);
		parts.forEach(function(part, i) {
			if (part == '.') {
			} else if (part == '..') {
				result.pop();
			} else {
				result.push(part);
			}
		});
		path = result.join('/');

		return path;
	};

	/**
	 * 拼接两个path
	 */
	exports.join = function(path1, path2) {
		var path;
		if (path1.lastIndexOf('/') != path1.length - 1) path1 += '/'; // 确保path1是个目录
		if (path2.indexOf('/') == 0) path = path2; // absolute path
		else path = path1 + path2; // join
		return exports.realpath(path);
	};

})(pathutil);

/**
 * 将name中的“.”换成id形式的“/”
 */
function name2id(name) {
	if (typeof name != 'string') return '';

	var id;

	if (name.indexOf('/') == -1) {
		id = name.replace(/\./g, '/');
	} else {
		id = name;
	}

	var filename = pathutil.basename(id);
	var ext = filename.slice(filename.lastIndexOf('.'));

	if (ext != '.js') {
		id += '/index.js';
	}

	return id;
}

/**
 * http://sample.com/a.js
 */
function isAbsolute(id) {
	return ~id.indexOf('://') || id.indexOf('//') === 0;
}

/**
 * ./a.js
 * ../a.js
 * ../../a.js
 */
function isRelative(id) {
	return id.indexOf('./') === 0 || id.indexOf('../') === 0;
}

/**
 * /a.js
 */
function isRoot(id) {
	return id.charAt(0) === '/' && id.charAt(1) !== '/';
}

/**
 * a.js
 */
function isTopLevel(id) {
	var c = id.charAt(0);
	return id.indexOf('://') === -1 && c !== '.' && c !== '/';
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
	this.message = parent.id + ': module ' + name + ' required';
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
	runtime.stack.forEach(function(m, i) {
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

	var index = -1;

	function next() {
		index++;
		if (index == pkg.dependencies.length) {
			runtime.popStack();
			if (callback) callback(deps);
		} else {
			deps[index].load(next);
		}
	}

	runtime.pushStack(name, this);

	this.dependencies.forEach(function(dependency, i) {
		var dep = this.initDependency(this.dependencies[i], runtime);
		deps.push(dep);
	}, this);

	next();
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
CommonJSPackage.prototype.execute = function(name, deps, runtime) {
	if (this.exports) return this.exeports;

	var exports = this.make(name, deps, runtime);
	runtime.addModule(name, exports);
	return exports;
};

/**
 * 执行factory，返回模块实例
 */
CommonJSPackage.prototype.make = function(name, deps, runtime) {
	var exports = runtime.modules[name] || new Module(name);
	var returnExports = this.factory.call(exports, this.createRequire(name, deps, runtime), exports, this);
	if (returnExports) {
		returnExports.__name__ = exports.__name__;
		exports = returnExports;
	}
	if (name == '__main__' && typeof exports.main == 'function') {
		exports.main();
	}
	return exports;
};

CommonJSPackage.prototype.initDependency = function(name, runtime) {
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
		var depPkg = loader.lib[dep.id];
		var exports;
		dep.load(function(result) {
			if (result) {
				exports = depPkg.execute(dep.runtimeName, result, runtime);
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
			newPkg.dependencies.forEach(function(dep) {
				args.push(require(dep));
			});
			callback.apply(null, args);
		});
		newPkg.load(name, runtime, function(deps) {
			newPkg.execute(name, deps, runtime);
		});
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

	var index = -1;

	function next() {
		index++;
		if (index == pkg.dependencies.length) {
			var exports = pkg.make(name, deps, runtime);
			runtime.addModule(name, exports);
			runtime.popStack();
			if (callback) callback(exports);
		} else {
			var dep = deps[index];
			dep.load(function(exports) {
				dep.exports = exports;
				next();
			});
		}
	}

	runtime.pushStack(name, this);

	this.dependencies.forEach(function(dependency, i) {
		var dep = this.initDependency(i, runtime);
		deps.push(dep);
	}, this);

	next();

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
ObjectPackage.prototype.make = function(name, deps, runtime) {
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
	if (name == '__main__' && typeof exports.main == 'function') {
		exports.main();
	}
	return exports;
};

ObjectPackage.prototype.initDependency = function(index, runtime) {
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
Package.prototype.execute = function(name, exports, runtime) {
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

function Dependency(name, runtime) {
	if (!name) return;
	this.runtime = runtime;
	this.name = name;
}

Dependency.prototype.find = function(id) {
	var loader = this.runtime.loader;

	var filename = pathutil.basename(id);
	var ext = filename.slice(filename.lastIndexOf('.'));

	if (ext == '.css') {
		// TODO
	}

	var pkg;
	if (pkg = loader.lib[id] || loader.lib[id + '.js'] || loader.lib[id + '/index.js']) {
		return pkg.id;
	}
	return null;
}

/**
 * @param name
 * @param module
 */
function CommonJSDependency(name, runtime) {
	Dependency.apply(this, arguments);

	var parent = runtime.stack[runtime.stack.length - 1];
    var tempId, id, runtimeName;
	var paths = ['/temp', '/root'];

	// absolute id
	if (isAbsolute(name)) {
		id = name;
	}
	// relative id
	else if (isRelative(name)) {
		tempId = pathutil.join(pathutil.dirname(parent.module.id), name);
		id = this.find(tempId);
		if (!id) id = tempId;
	}
	// root id
	else if (isRoot(name)) {
		id = pathutil.join(Loader._pageDir, name);
	}
	// top-level id
	else {
		paths.some(function(m) {
			tempId = pathutil.join(m, name);
			id = this.find(tempId);
			if (id) return true;
		}, this);
		runtimeName = this.name;

		if (!id) id = tempId;
	}

	this.id = pathutil.realpath(id);
	this.runtimeName = runtimeName || id;
};

CommonJSDependency.prototype = new Dependency();

CommonJSDependency.prototype.constructor = CommonJSDependency;

CommonJSDependency.prototype.load = function(callback) {
	var runtime = this.runtime;
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
	Dependency.apply(this, arguments);

	// 依赖自己的模块
	var parent = runtime.stack[runtime.stack.length - 1];
	// 需要搜索的所有路径，runtime.context是内置默认的
	var paths = runtime.path.concat([runtime.context]);
	// context为id的前缀部分，prefix为name的前缀部分
	var id, context, prefix;
	// 用于查找路径
	var partId = name.replace(/\./g, '/');

	// 分别在以下空间中找：
	// 当前模块(sys.path中通过'.'定义)；
	// 全局模块(sys.path中通过'/root'定义)；
	// 用户模块(sys.path中通过'/temp'定义)；
	// 运行时路径上的模块(默认的)。
	paths.some(function(m) {
		var path = pathutil.join(parent.module.id, m);
		id = pathutil.join(path, partId);
		var tid = this.find(id);
		if (tid) {
			id = tid;
			context = path;
			if (m == '') { // 在当前目录中找到的子模块
				prefix = parent.name;
			} else {
				prefix = '';
			}
			return true;
		}
	}, this);

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

ObjectDependency.prototype.load = function(callback) {
	var dep = this;
	var runtime = this.runtime;
	var context = this.context || '';
	var prefix = this.prefix;
	var pName = prefix;
	var parts = this.nameParts;

	var index = -1;

	/**
	 * 依次获取当前模块的每个部分
	 * 如a.b.c，依次获取a、a.b、a.b.c
	 */
	function next() {
		var id, part, name;

		index++;

		if (index == parts.length) {
			callback(runtime.modules[(prefix? prefix + '.' : '') + parts[0]]);
		} else {
			part = parts[index];
			name = (pName? pName + '.' : '') + part;
			// 使用缓存中的
			if (runtime.modules[name]) {
				pName = name;
				next();
			} else {
				if (index == parts.length - 1) {
					id = dep.id;
				} else {
					id = pathutil.join(context, parts.slice(0, index + 1).join('/')) + '/index.js';
				}
				runtime.loadModule(id, name, function(result) {
					var exports = runtime.loader.lib[id].execute(name, result, runtime);
					runtime.setMemberTo(pName, part, exports);
					pName = name;
					next();
				});
			}
		}
	}

	next();
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

	var pkg = loader.lib[id];

	if (!pkg) {
		throw new NoModuleError(id);
	}

	function fileDone() {
		var id = pkg.id;
		var file = pkg.file;
		// 重新读取pkg，之前的pkg只是个占位
		pkg = loader.lib[id];

		// 加载进来的脚本没有替换掉相应的模块，文件有问题。
		if (!pkg || !pkg.factory) {
			throw new Error(file + ' do not add ' + id);
		}
		pkg.load(name, runtime, callback);
	}

	// 已经存在此name了，说明循环依赖了
	if (stack.some(function(m, i) {
		return m.name === name;
	}, this)) {
		pkg.cyclicLoad(name, this, callback);
	}

	// file
	else if (pkg.file) {
		// TODO 加入预处理过程，跑出所有需要加载的文件并行加载，在此执行useScript而不是loadScript
		loader.loadScript(pkg.file, fileDone, true);

	// Already define
	} else {
		pkg.load(name, this, callback);
	}
};

LoaderRuntime.prototype.executeModule = function(id, name, callback) {
	var runtime = this;
	var loader = this.loader;
	this.loadModule(id, name, function(result) {
		loader.lib[id].execute(name, result, runtime);
	});
};

LoaderRuntime.prototype.pushStack = function(name, pkg) {
	this.stack.push({
		name: name,
		module: pkg
	});
};

LoaderRuntime.prototype.popStack = function() {
	this.stack.pop();
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
 * 查找页面中的标记script标签，更新lib
 */
Loader.prototype.buildFileLib = function() {

	var scripts = this.scripts;

	for (var i = 0, script, names, src, l = scripts.length; i < l; i++) {
		script = scripts[i];
		src = script.getAttribute('data-src');
		names = script.getAttribute('data-module');
		if (!names || !src) continue;
		names.split(/\s+/ig).forEach(function(name) {
			this.defineFile(pathutil.join('/temp', name2id(name)), src);
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
 * 比如 a/b/c/d.js ，会建立 a a/b a/b/c 三个空模块，最后一个模块为目标模块
 */
Loader.prototype.definePrefixFor = function(id) {
	if (!id || typeof id != 'string') return;

	var idParts = pathutil.dirname(id).split('/');
	for (var i = 0, prefix, pkg, l = idParts.length; i < l; i++) {
		prefix = idParts.slice(0, i + 1).join('/');
		prefix += '/index.js';
		this.definePrefix(prefix);
	}
};

/**
 * 定义一个prefix module
 */
Loader.prototype.definePrefix = function(id) {
	if (!id || typeof id != 'string') return;

	// 只要存在就返回
	if (id in this.lib) return;

	this.lib[id] = new Package(id);
};

/**
 * 定义一个file module，供异步加载
 */
Loader.prototype.defineFile = function(id, src) {
	if (!id || typeof id != 'string') return;

	// 存在factory或file则返回
	if (id in this.lib && (this.lib[id].factory || this.lib[id].file)) return;

	this.definePrefixFor(id);

	var pkg = new Package(id);
	pkg.file = src;
	this.lib[id] = pkg;
};

/**
 * 定义一个普通module
 */
Loader.prototype.defineModule = function(constructor, id, dependencies, factory) {
	if (arguments.length < 4) return;

	// 不允许重复添加
	if (id in this.lib && this.lib[id].factory) return;

	// 添加前缀package
	this.definePrefixFor(id);

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

	var id = pathutil.join('/temp', name2id(name));

	this.defineModule(CommonJSPackage, id, dependencies, factory);
};

/**
 * @param name
 */
Loader.prototype.getModule = function(name) {
	var id = pathutil.join('/temp', name2id(name));
	return this.lib[id];
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
	var id = pathutil.join('/temp', name2id(name));

	this.defineModule(ObjectPackage, id, dependencies, factory);
};

/**
 * 移除模块的定义
 * @param name 需要移除模块的name
 * @param all 是否移除其所有子模块
 */
Loader.prototype.remove = function(name, all) {
	var id = pathutil.join('/temp', name2id(name));
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
 * 清空模块
 */
Loader.prototype.clear = function() {
	for (var prop in this.lib) {
		if (prop != '/root/sys') {
			this.remove(prop);
		}
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

	var id = pathutil.join('/temp', name2id(name));
	var pkg = this.lib[id];
	var name = '__main__';

	var runtime = this.createRuntime(id);
	runtime.executeModule(id, name);
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

	var id = '/runtime/__anonymous_' + this.anonymousModuleCount + '__';
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

	runtime.executeModule(id, name);
};

object.Loader = Loader;
object.NoModuleError = NoModuleError;
object.ModuleRequiredError = ModuleRequiredError;

})(object);
