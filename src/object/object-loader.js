/**
 * 创建object的loader
 */
;(function(object) {

var loader = new object.Loader();

object._loader = loader;

function SeaPackage(id, deps, factory) {
	this.id = id;
	this.dependencies = deps;
	this.factory = factory;
}
SeaPackage.factoryRunner = {
	doneDep: function(loader, module, name, runtime, args, exports) {
		function require(id) {
			if (id.indexOf('./') == 0) {
				id = runtime.getId(name) + '.' + id.slice(2);
			}
			var exports = runtime.modules[id.replace(/\//g, '.')];
			if (!exports) throw new object.ModuleRequiredError(id);
			return exports;
		}
		require.async = function(deps, callback) {
			deps = loader.parseDeps(deps);
			loader.load(new SeaPackage(name, deps, function(require) {
				var args = [];
				deps.forEach(function(dep) {
					args.push(require(dep));
				});
				callback.apply(null, args);
			}), name, runtime);
		};
		// 最后传进factory的参数
		args.push(require);
		args.push(exports);
		args.push(module);
	}
};

object.define = function(id, deps, factory) {
	return loader.addPackage(id, deps, factory, SeaPackage);
};

object.add = loader.add.bind(loader);
object.remove = loader.remove.bind(loader);
object.use = loader.use.bind(loader);
object.execute = loader.execute.bind(loader);

/**
 * 增加window模块，如果其他模块中需要使用或修改window的相关内容，必须显式的依赖window模块
 * 例如： 
 *    object.add('test', 'ua, window', function(exports, ua, window) {
 *        window.globalMember = 1;
 *    });
 */
object.add('window', function(exports) {
	return window;
});

object.add('loader', function(exports) {
	exports.Loader = object.Loader;
});

})(object);
