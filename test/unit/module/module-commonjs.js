module('module-commonjs');

test('sys.modules', function() {
	object.define('test', 'sys', function(require) {
		var sys = require('sys');
		this.a = {};
		ok(sys.getModule('test'), 'sys.getModule ok.');
		equal(sys.modules.test.a, this.a, 'sys.modules ok.');
	});
	object.use('test', function() {
	})
	object.remove('test');
});

test('use object.define - basic', function() {
	object.define('define_b', function(require, exports, module) {
		exports.b = 1;
	});
	object.define('define_c', function(require, exports, module) {
		exports.c = 1;
	});
	object.define('define_a', ['define_b', 'define_c'], function(require, exports, module) {
		var b = require('define_b');
		equal(b.b, 1, 'b in module define_b is loaded');
		var c = require('define_c');
		equal(c.c, 1, 'c in module define_c is loaded');
		exports.a = 1;
		equal(exports.__name__, isUse ? 'define_a' : '__main__', '__name__ is define_a when use this module, is __main__ when execute');
		equal(module.id, loader.base + 'define_a.js', 'module.id is ok');
		equal(module.dependencies.length, 2, 'module.dependencies has two elements');
	});
	var isUse = true;
	// use module
	object.use('define_a', function(define_a) {
		equal(define_a.a, 1, 'a in module define_a is loaded');
	});

	// execute module
	isUse = false;
	object.execute('define_a');

	// keep clean
	object.remove('defile', true);
});

test('use object.define - submodule', function() {
	object.define('subdefinex', function(require, exports) {
		exports.x = 1;
	});
	object.define('subdefine/a', function(require, exports) {
		exports.a = 1;
	});
	object.define('subdefine/b', function(require, exports) {
		exports.b = 1;
	});
	object.define('subdefine.c', function(require, exports) {
		exports.c = 1;
	});
	object.define('subdefine/root', 'subdefinex, ./a, subdefine/b, ./c', function(require, exports) {
		var x = require('subdefinex');
		equal(x.x, 1, 'value from subdefinex is ok');
		var a = require('./a');
		equal(a.a, 1, 'value from subdefine/a is ok');
		var b = require('subdefine/b');
		equal(b.b, 1, 'value from subdefine/b is ok');
		var c = require('./c');
		equal(c.c, 1, 'value from subdefine.c is ok');

		exports.value = 1;

		raises(function() {
			require('subdefine/a');
		}, 'when write ./a in depencencies, should use require(./a) instead of require(subdefine/a)');
		raises(function() {
			require('./b');
		}, 'when write subdefine/b in depencencies, should use require(subdefine/b) instead of require(./b)');

	});
	object.use('subdefine/root', function(subdefine) {
		equal(subdefine.value, 1, 'value from subdefine/root is ok');
	});
	object.remove('subdefine');
});

test('return module', function() {
	object.define('test/a', function() {
		return 1;
	});

	object.define('test/b', './a', function(require) {
		var a = require('./a');
		equal(a, 1, 'return module ok in twice.');
	});

	object.define('test/main', './b, ./a', function(require) {
		var a = require('./a');
		var b = require('./b');
		equal(a, 1, 'return module ok.');
	});

	object.execute('test/main');
	object.remove('test', true);
});

test('require.async', function() {
	object.define('a', function() {
	});
	object.define('b', function(require) {
		require.async('a', function(a) {
			equal(a.__name__, 'a', 'require.async ok.')
		})
	});
	object.use('b', function() {
	})
	object.remove('a');
	object.remove('b');
});

test('require.async - relative', function() {
	expect(1);
	object.define('a/a', function() {
	});
	object.define('a/b', function(require) {
		require.async('./a', function(a) {
			equal(a.__name__, 'a/a.js', 'require.async ok.')
		})
	});
	object.execute('a/b');
	object.remove('a', true);
});

test('require.async - setTimeout', function() {
	expect(1);
	loader.define('a/b', function() {
		this.result = 1;
	});
	loader.define('a/main', './b', function(require, exports) {
		stop();
		setTimeout(function() {
			require.async('./b', function(b) {
				start();
				equals(b.result, 1, 'require.async ok in setTimeout');
				// 必须执行完了再删除，否则在setTimeout执行时a/b已经被删除，找不到了
				loader.remove('a', true);
			});
		}, 0);
	});
	loader.execute('a/main');
});

// 测试由其他模块发起的require.async
test('require.async - dynamic cyclic', function() {

	uiModule = null;

	object.define('a/test', 'a/ui.js', function(require) {
		var ui = require('a/ui.js');
		// 依赖时的写法不同，也确保两个ui模块为同一个，一个a/ui.js，一个a/ui。
		strictEqual(uiModule, ui, 'same module with different dependency write style.');
		this.c = 1;
	});
	object.define('a/ui.js', 'string', function(require) {
		var string = require('string');
		this.load = function() {
			require.async('a/test', function(module) {
				equal(module.c, 1, 'dynamic require.async ok.');
			});
		}
	})
	object.define('a/main', 'a/ui', function(require) {
		// 注意不要加.js，用于测试缓存
		var ui = require('a/ui');
		uiModule = ui;
		ui.load();
	});
	object.execute('a/main');
	object.remove('a', true);
});

test('object.execute auto call exports.main', function() {
	expect(1);
	object.define('test_define', function(require, exports) {
		exports.main = function() {
			ok(true, 'main called with object.define.');
		}
	});

	object.execute('test_define');
	object.remove('test_define');
});

test('objectjs style dependency in object.define', function() {
	object.define('test/a/aa/aaa', function() {
		this.haha = 1;
	});
	object.define('test/b/bb/bbb', function() {
		this.haha = 2;
	});
	object.define('main', 'test.a.aa.aaa, test.b.bb.bbb, test', function(require, exports) {
		require('test.a.aa.aaa');
		require('test.b.bb.bbb');
		var test = require('test');
		equals(test.a.aa.aaa.haha, 1);
		equals(test.b.bb.bbb.haha, 2);
	});

	object.execute('main');
});

test('require mustach template', function() {

	object.define('test/publisher', './publisher.mustache', function(require) {
		var tpl = require('./publisher.mustache');
	});

	//object.use('test/publisher', function(publisher) {
	//});

});
