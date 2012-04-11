/*
 * 变量说明：
 * 	pkg - 未实例化的模块
 * 	module - 实例化的模块
 * 	dep - 通过toDep方法处理过的依赖信息
 * 	dependency - 字符串形式保存依赖信息
 * 	parent - 在execute阶段当前模块的调用者
 * 	owner - 在load阶段当前依赖的拥有者
 * 	name - 点号形式的模块名字
 * 	id - 路径形式的模块名字
 */

;(function(object) {

// 可以用于scheme的字符
var scheme_chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789+-.';

/**
 * 在字符串url中查找target字符后，利用result对象，返回截断后的前、后字符串
 * @param {Object} result 重复利用的用于返回结果的对象（避免太多内存垃圾产生）
 * @param {String} url 需要截取的url
 * @param {String} target 截断的字符组成的字符串
 * @param {Boolean} remainFirst 是否要保留匹配的字符
 *
 * @return {Object} 形如 {got:'', remained:''}的结果对象
 */
function splitUntil(result, url, target, remainFirst) {
	var min = url.length;
	for(var i=0, len = url.length; i < len; i++) {
		if (target.indexOf(url.charAt(i)) != -1) {
			if (i < min) {
				min = i;
				break;
			}
		}
	}
	result.got = url.substring(0, min);
	result.remained = (remainFirst? url.substring(min) : url.substring(min + 1));
	return result;
}

/**
 * 解析一个url为 scheme / netloc / path / params / query / fragment 六个部分
 * @see http://docs.python.org/library/urlparse.html
 * @example 
 * http://www.renren.com:8080/home/home2;32131?id=31321321&a=1#//music/?from=homeleft#fdalfdjal
 * --> 
 * [http, www.renren.com:8080, /home/home2, 32131, id=31321321&a=1, //music/?from=homeleft#fdalfdjal]
 */
function urlparse(url, default_scheme) {
	if (typeof url != 'string') {
		return ['', '', '', '', '', ''];
	}
	var scheme = '', netloc='', path = '', params = '', query = '', fragment = '', i = 0;
	i = url.indexOf(':');
	if (i > 0) {
		if (url.substring(0, i) == 'http') {
			scheme = url.substring(0, i).toLowerCase();
			url = url.substring(i+1);
		} else {
			for(var i=0, len = url.length; i < len; i++) {
				if (scheme_chars.indexOf(url.charAt(i)) == -1) {
					break;
				}
			}
			scheme = url.substring(0, i);
			url = url.substring(i + 1);
		}
	}
	if (!scheme && default_scheme) {
		scheme = default_scheme;
	}
	var splited = {};
	if (url.substring(0, 2) == '//') {
		splitUntil(splited, url.substring(2), '/?#', true);
		netloc = splited.got;
		url = splited.remained;
	}

	if (url.indexOf('#') != -1) {
		splitUntil(splited, url, '#');
		url = splited.got;
		fragment = splited.remained;
	}
	if (url.indexOf('?') != -1) {
		splitUntil(splited, url, '?');
		url = splited.got;
		query = splited.remained;
	}
	if (url.indexOf(';') != -1) {
		splitUntil(splited, url, ';');
		path = splited.got;
		params = splited.remained;
	}
	
	if (!path) {
		path = url;
	}
	return [scheme, netloc, path, params, query, fragment];
};

/**
* 将兼容urlparse结果的url部分合并成url
*/
function urlunparse(parts) {
	if (!parts) {
		return '';
	}
	var url = '';
	if (parts[0]) url += parts[0] + '://' + parts[1];
	if (parts[1] && parts[2] && parts[2].indexOf('/') != 0) url += '/';
	url += parts[2];
	if (parts[3]) url += ';' + parts[3];
	if (parts[4]) url += '?' + parts[4];
	if (parts[5]) url += '#' + parts[5];

	return url;
};

/**
* 合并两段url
*/
function urljoin(base, url) {
	// 逻辑完全照抄python的urlparse.py

	if (!base) {
		return url;
	}

	if (!url) {
		return base;
	}

	url = String(url);
	base = String(base);

	var bparts = urlparse(base);
	var parts = urlparse(url, bparts[0]);

	// scheme
	if (parts[0] != bparts[0]) {
		return url;
	}

	// netloc
	if (parts[1]) {
		return urlunparse(parts);
	}

	parts[1] = bparts[1];

	// path
	if (parts[2].charAt(0) == '/') {
		return urlunparse(parts);
	}

	// params
	if (!parts[2] && !parts[3]) {
		parts[2] = bparts[2];
		parts[3] = bparts[3];
		if (!parts[4]) {
			parts[4] = bparts[4];
		}
		return urlunparse(parts);
	}

    var segments = bparts[2].split('/').slice(0, -1).concat(parts[2].split('/'))

	// 确保能够生成最后的斜线
	if (segments[segments.length - 1] == '.') {
		segments[segments.length - 1] = '';
	}

	// 去掉所有'.'当前目录
	for (var i = 0, l = segments.length; i < l; i++) {
		if (segments[i] == '.') {
			segments.splice(i, 1);
			i--;
		}
	}

	// 合并所有'..'
	var i;
	while (true) {
		i = 1;
		n = segments.length - 1;
		while (i < n) {
			if (segments[i] == '..' && ['', '..'].indexOf(segments[i - 1]) == -1) {
				segments.splice(i - 1, 2);
				break;
			}
			i++;
		}
		if (i >= n) {
			break;
		}
	}

	if (segments.length == 2 && segments[0] == '' && segments[1] == '..') {
		segments[segments.length - 1] = '';
	}
	else if (segments.length >= 2 && segments[segments.length - 1] == '..') {
		segments.pop();
		segments.pop();
		segments.push('');
	}

	parts[2] = segments.join('/');

	return urlunparse(parts);
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
 * @param stack 出现循环依赖时的堆栈
 * @param pkg 触发了循环依赖的模块
 */
function CyclicDependencyError(stack, pkg) {
	this.runStack = stack;
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

CommonJSPackage.prototype.make = function(name, context, deps, runtime) {
	var exports = new Module(name);
	var require = this.createRequire(name, context, deps, runtime);
	var returnExports = this.factory.call(exports, require, exports, this);
	if (returnExports) {
		returnExports.__name__ = exports.__name__;
		exports = returnExports;
	}
	return exports;
};

/**
 * 执行factory，返回模块实例
 * @override
 */
CommonJSPackage.prototype.execute = function(name, context, runtime) {

	// 循环引用
	// 出现循环引用但并不立刻报错，而是当作此模块没有获取到，继续获取下一个
	if (runtime.getStackItem(name)) {
		return null;
	}

	var deps = runtime.packages[this.id];

	runtime.pushStack(name, this);

	var exports = this.make(name, context, deps, runtime);

	if (name == '__main__' && typeof exports.main == 'function') {
		exports.main();
	}
	runtime.addModule(name, exports);
	runtime.popStack();

	exports.__package__ = this;
	return exports;
};

CommonJSPackage.prototype.toDep = function(i, runtime) {
	var name = this.dependencies[i];
	// object.define中，“.”作为分隔符的被认为是ObjectDependency，其他都是CommenJSDependency
	if (name.indexOf('/') == -1 && name.indexOf('.') != -1) {
		return new ObjectDependency(name, this, runtime);
	} else {
		return new CommonJSDependency(name, this, runtime);
	}
};

/**
 * 生成require
 */
CommonJSPackage.prototype.createRequire = function(name, context, deps, runtime) {
	var loader = runtime.loader;
	var parent = this;
	var parentName = name;
	var parentContext = context;

	function require(name) {
		var index = parent.dependencies.indexOf(name);
		if (index == -1) {
			throw new ModuleRequiredError(name, parent);
		}
		var dep = deps[index];

		var exports = dep.execute(parentName, parentContext);

		if (!exports) {
			// 有依赖却没有获取到，说明是由于循环依赖
			if (parent.dependencies.indexOf(name) != -1) {
				throw new CyclicDependencyError(runtime.stack, loader.lib[dep.id]);
			} else {
				// 出错
				console.warn('Unknown Error.');
			}
		}

		return exports;
	}

	require.async = function(dependencies, callback) {
		// 创建一个同名package
		var newPkg = new CommonJSPackage(parent.id, dependencies, function(require) {
			var args = [];
			newPkg.dependencies.forEach(function(dep) {
				args.push(require(dep));
			});
			callback.apply(null, args);
		});
		newPkg.load(runtime, function() {
			// 由于newPkg的id与之前的相同，load方法会覆盖掉runtime.packages上保存的成员
			var deps = runtime.packages[newPkg.id];
			newPkg.make(name, parentContext, deps, runtime);
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

ObjectPackage.prototype.make = function(name, context, deps, runtime) {
	var returnExports;
	var args = [];
	var exports;

	// 将所有依赖都执行了，放到参数数组中
	deps.forEach(function(dep) {
		var depExports = dep.execute(name, context);
		if (args.indexOf(depExports) == -1) {
			args.push(depExports);
		}
	}, this); 

	// 自己
	exports = runtime.modules[name] || new Module(name);

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

/**
 * 执行factory，返回模块实例
 * @override
 */
ObjectPackage.prototype.execute = function(name, context, runtime) {
	var exports;
	var parent;
	var deps;

	// 循环引用
 	// 出现循环依赖时建立一个空的exports返回，待所有流程走完后会将此模块填充完整。
	if (runtime.getStackItem(name)) {
		if (!(name in runtime.modules)) {
			runtime.addModule(name, new Module(name));
		}
		exports = runtime.modules[name];
		parent = runtime.stack[runtime.stack.length - 1];
		// 在空的exports上建立一个数组，用来存储依赖了此模块的所有模块
		if (!exports.__empty_refs__) {
			exports.__empty_refs__ = [];
		}
		exports.__empty_refs__.push(parent.module.id);

	} else {

		deps = runtime.packages[this.id];

		runtime.pushStack(name, this);

		exports = this.make(name, context, deps, runtime);

		if (name == '__main__' && typeof exports.main == 'function') {
			exports.main();
		}

		runtime.addModule(name, exports);
		runtime.popStack();
	}

	exports.__package__ = this;
	return exports;
};

ObjectPackage.prototype.toDep = function(index, runtime) {
	var name = this.dependencies[index];
	// object.add中，“/”作为分隔符的被认为是CommonJSDependency，其他都是ObjectDependency
	if (name.indexOf('/') != -1) {
		return new CommonJSDependency(name, this, runtime);
	} else {
		return new ObjectDependency(name, this, runtime);
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
 * 尝试获取此模块的所有依赖模块
 */
Package.prototype.load = function(runtime, callback) {
	var deps = [];
	var pkg = this;

	var loaded = -1;
	function next() {
		loaded++;
		if (loaded == pkg.dependencies.length) {
			if (callback) callback();
		}
	}

	this.dependencies.forEach(function(dependency, i) {
		var dep = this.toDep(i, runtime);
		deps.push(dep);
		dep.load(next);
	}, this);

	runtime.packages[this.id] = deps;

	next();
};

/**
 * 获取此package产生的模块的实例
 */
Package.prototype.execute = function(name, context, runtime) {

	if (runtime.getStackItem(name)) {
		throw new CyclicDependencyError(runtime.stack);
	}

	var exports = new Module(name);
	// sys.modules
	if (this.id === 'sys') {
		exports.modules = runtime.modules;
		exports.stack = runtime.stack;
	}

	runtime.addModule(name, exports);
	exports.__package__ = this;
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

function Dependency(name, owner, runtime) {
	if (!name) return;
	this.owner = owner;
	this.runtime = runtime;
	this.name = name;
}

/**
 * @param name
 * @param module
 */
function CommonJSDependency(name, owner, runtime) {
	Dependency.apply(this, arguments);

	var loader = runtime.loader;
    var info, id, context;
	var paths = loader.paths;
	var type = this.getType(name);

	// absolute id
	if (type == 'absolute') {
		id = name;
	}
	// relative id
	else if (type == 'relative') {
		info = loader.find(urljoin(urljoin(owner.id, '.'), name), paths);
		id = info.id;
		context = info.context;
	}
	// root id
	else if (type == 'root') {
		id = urljoin(Loader._pageDir, name);
	}
	// top-level id
	else {
		info = loader.find(name, paths);
		id = info.id;
		context = info.context;
	}

	this.id = id;
	this.context = context;
	this.type = type;
};

CommonJSDependency.prototype = new Dependency();

/**
 * 获取依赖的路径形式
 * absolute: http://xxx/abc.js
 * relative: ./abc.js
 * root: /abc.js
 * top-level: abc.js
 */
CommonJSDependency.prototype.getType = function(name) {
	if (~name.indexOf('://') || name.indexOf('//') === 0) {
		return 'absolute';
	}
	if (name.indexOf('./') === 0 || name.indexOf('../') === 0) {
		return 'relative';
	}
	if (name.charAt(0) === '/' && name.charAt(1) !== '/') {
		return 'root';
	}
	return 'top-level';
};

CommonJSDependency.prototype.constructor = CommonJSDependency;

CommonJSDependency.prototype.load = function(callback) {
	this.runtime.loadModule(this.id, callback);
};

CommonJSDependency.prototype.execute = function(parentName, parentContext) {
	var runtime = this.runtime;
	var loader = runtime.loader;
	var runtimeName;

	if (this.type == 'top-level') {
		runtimeName = this.name;

	} else if (this.type == 'relative') {
		runtimeName = this.id.slice(parentContext.length);

	} else {
		runtimeName = id;
	}

	var exports = runtime.modules[runtimeName];
	var pkg, deps;
	if (!exports) {
		pkg = loader.lib[this.id];
		exports = pkg.execute(runtimeName, this.context, runtime);
	}
	return exports;
};

/**
 * @param name
 * @param owner
 * @param runtime
 */
function ObjectDependency(name, owner, runtime) {
	Dependency.apply(this, arguments);

	var loader = runtime.loader;
	// 需要搜索的所有路径，runtime.moduleId是内置默认的
	var paths = runtime.path.concat([runtime.moduleId]);
	// 此依赖是否是在父模块当前目录中找到的，用于声称其name
	var isRelative = false;

	// 分别在以下空间中找：
	// 当前模块(sys.path中通过'.'定义)；
	// 全局模块(sys.path中通过'/'定义)；
	// 运行时路径上的模块(默认的)。
	var info = loader.find(name.replace(/\./g, '/'), paths, owner.id);
	var id = info.id;
	// context为id的前缀部分
	var context = info.context;
	if (context == '') {
		isRelative = true;
		context = urljoin(urljoin(owner.id, '.'), context);
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
	// 是否是相对依赖模块
	this.isRelative = isRelative;
};

ObjectDependency.prototype = new Dependency();

ObjectDependency.prototype.constructor = ObjectDependency;

ObjectDependency.prototype.load = function(callback) {
	var runtime = this.runtime;
	var loader = runtime.loader;
	var parts = this.nameParts;

	var loaded = -1;
	function next() {
		loaded++;
		if (loaded == parts.length) {
			if (callback) callback();
		}
	}

	/**
	 * 依次获取当前模块的每个部分
	 * 如a.b.c，依次获取a、a.b、a.b.c
	 */
	parts.forEach(function(part, i) {
		var id, info;

		if (i == parts.length - 1) {
			id = this.id;
		} else {
			// 先用最短的名字查找，确保能找到所有的可能
			info = loader.find(urljoin(this.context, parts.slice(0, i + 1).join('/')));
			id = info.id;
			// 没找到，用最后才能查找到的文件名生成临时模块，确保后续手工定义的模块能够在临时模块前被找到。
			if (!info.found) {
				id = id + '/index.js';
				loader.definePrefix(id);
			}
		}
		runtime.loadModule(id, next);
	}, this);

	next();
};

ObjectDependency.prototype.execute = function(parentName, parentContext) {
	var dep = this;
	var runtime = this.runtime;
	var loader = runtime.loader;
	var context = this.context || '';
	var parts = this.nameParts;
	// prefix 为name的前缀，通过父name获得
	var prefix, point;
	if (this.isRelative) {
		point = parentName.lastIndexOf('.');
		if (point == -1) {
			prefix = '';
		} else {
			prefix = parentName.slice(0, point);
		}
	} else {
		prefix = '';
	}
	var pName = prefix;
	var name;

	var rootName = (prefix? prefix + '.' : '') + parts[0];
	var id, pkg, exports;

	/**
	 * 依次获取当前模块的每个部分
	 * 如a.b.c，依次获取a、a.b、a.b.c
	 */
	for (var i = 0, l = parts.length, part; i < l; i++) {
		part = parts[i];

		name = (pName? pName + '.' : '') + part;

		if (!(name in runtime.modules)) {
			if (i == parts.length - 1) {
				id = dep.id;
			} else {
				id = loader.find(urljoin(context, parts.slice(0, i + 1).join('/'))).id;
			}
			pkg = loader.lib[id];
			exports = pkg.execute(name, context, runtime);
			runtime.setMemberTo(pName, part, exports);
		}
		pName = name;
	}

	return runtime.modules[rootName];

};

/**
 * Loader运行时，每一个use、execute产生一个
 */
function LoaderRuntime(moduleId) {

	/**
	 * 此次use运行过程中用到的所有module
	 */
	this.modules = {};

	/**
	 * load阶段所有模块的集合
	 */
	this.packages = {};

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
	 * 运行入口模块的路径
	 */
	this.moduleId = moduleId;

	/**
	 * sys.path，在创建实例时应该同loader.paths合并
	 */
	this.path = [''];
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

LoaderRuntime.prototype.loadModule = function(id, callback) {
	var runtime = this;
	var loader = this.loader;

	if (id in this.packages) {
		callback();
		return;
	}

	this.packages[id] = null;

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
		pkg.load(runtime, callback);
	}

	// file
	if (pkg.file) {
		Loader.loadScript(pkg.file, fileDone, true);

	// Already define
	} else {
		pkg.load(this, callback);
	}
};

LoaderRuntime.prototype.getStackItem = function(id) {
	var result;
	this.stack.some(function(m) {
		if (m.id == id) {
			result = m;
			return true;
		}
	});
	return result;
};

LoaderRuntime.prototype.pushStack = function(id, pkg) {
	this.stack.push({
		id: id,
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
function Loader(base) {
	this.useCache = true;
	this.anonymousModuleCount = 0;
	this.base = base || '/'; // base必须只读
	this.lib = {};
	this.paths = [this.base]; // CommonJSDependency从这里获取paths

	this.scripts = document.getElementsByTagName('script');

	this.lib['sys'] = new Package('sys');
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
 * 将name中的“.”换成id形式的“/”
 * @param name
 * @param withExt 确保扩展名为.js
 */
Loader.prototype.name2id = function(name, withExt) {
	if (typeof name != 'string') return '';

	var id, ext, extdot;

	if (name.indexOf('/') == -1) {
		id = name.replace(/\./g, '/');
	} else {
		id = name;
	}

	// name有可能是个目录
	if (withExt && name.lastIndexOf('/') != name.length - 1) {
		extdot = id.lastIndexOf('.');
		if (extdot != -1) {
			ext = id.slice(extdot);
		} else {
			ext = '';
		}

		if (!ext) {
			id += '.js';
		}
	}

	return id;
};

/**
 * 从paths中寻找符合此id的模块
 * @param id
 * @param paths
 * @param base
 */
Loader.prototype.find = function(id, paths, base) {
	var loader = this;
	var ext = id.slice(id.lastIndexOf('.'));

	if (!paths) {
		paths = this.paths;
	}

	var foundId = null;
	var foundContext = null;

	// 尝试查找不同的扩展名
	function find(id) {
		var pkg;

		if (pkg = loader.lib[id] || loader.lib[id + '.js'] || loader.lib[id + '/index.js']) {
			return pkg.id;
		}
	}

	// 尝试在path中查找
	function findIn(path) {
		var tempId = find(urljoin(urljoin(base, path), id));
		if (tempId) {
			foundId = tempId;
			foundContext = path;
			return true;
		}
	};

	paths.some(findIn);

	return {
		found: !!foundId,
		id: foundId || id,
		context: foundContext
	};
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
		names.trim().split(/\s+/ig).forEach(function(name) {
			this.defineFile(urljoin(this.base, this.name2id(name, true)), src);
		}, this);
	}
};

/**
 * 加载一个script, 执行callback
 * 有冲突检测，如果连续调用两次loadScript同一src的话，则第二个调用会等第一个完毕后直接执行callback，不会加载两次。
 *
 * @param src 地址
 * @param callback callback函数
 */
Loader.loadScript = function(src, callback, useCache) {
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
	runtime.path = runtime.path.concat(this.paths);
	return runtime;
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

	var pkg = new constructor(id, dependencies, factory);
	this.lib[id] = pkg;
};

/**
 * @param name
 */
Loader.prototype.getModule = function(name) {
	var id = this.find(this.name2id(name)).id;
	if (id in this.lib) return this.lib[id];
	return null;
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

	var id = urljoin(this.base, this.name2id(name, true));
	this.defineModule(CommonJSPackage, id, dependencies, factory);
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

	var id = urljoin(this.base, this.name2id(name, true));
	this.defineModule(ObjectPackage, id, dependencies, factory);
};

/**
 * 移除模块的定义
 * @param name 需要移除模块的name
 * @param all 是否移除其所有子模块
 */
Loader.prototype.remove = function(name, all) {
	var id = urljoin(this.base, this.name2id(name, true));

	delete this.lib[id];

	// 只有目录才可能递归删除
	if (all) {
		// 确保all时是个目录
		name = name.charAt(name.length - 1) == '/'? name : name + '/';
		id = urljoin(this.base, this.name2id(name));
		Object.keys(this.lib).forEach(function(key) {
			if (key.indexOf(id) == 0) {
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
		if (prop != 'sys') {
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

	var info = this.find(this.name2id(name));
	var id = info.id;
	var context = info.context;

	var runtime = this.createRuntime(id, context);
	runtime.loadModule(id, function() {
		var pkg = runtime.loader.lib[id];
		pkg.execute('__main__', context, runtime);
	});
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

	this.defineModule(CommonJSPackage, id, dependencies, function(require, exports, module) {
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

	runtime.loadModule(id, function() {
		var pkg = runtime.loader.lib[id];
		pkg.execute('__main__', '', runtime);
	});
};

object.Loader = Loader;
object.NoModuleError = NoModuleError;
object.ModuleRequiredError = ModuleRequiredError;

})(object);
