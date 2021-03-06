/**
 * 创建object的loader
 */
;(function(object) {

var loader = new object.Loader('http://pub.objectjs.org/object/');

object._loader = loader;

object.add = loader.add.bind(loader);
object.define = loader.define.bind(loader);
object.remove = loader.remove.bind(loader);
object.use = loader.use.bind(loader);
object.execute = loader.execute.bind(loader);
object.addPath = function(path) {
	loader.paths.push(path);
};

/**
 * 增加window模块，如果其他模块中需要使用或修改window的相关内容，必须显式的依赖window模块
 */
object.define('./window.js', 'sys', function(require) {
	var sys = require('sys');
	var dom = sys.modules['dom'];
	if (dom) dom.wrap(window);
	return window;
});

object.define('./loader.js', function(require, exports) {
	exports.Loader = object.Loader;
});

})(object);
