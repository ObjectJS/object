var Loader = object.Loader;

// surround with closure
(function() {

function emptyCallback() {};

if (isJsTestDriverRunning) {
	var loc = window['location'];
	var pageUrl = loc.protocol + '//' + loc.host;
	var path = pageUrl + '/test/test/unit/loader/';
} else {
	var path = ($UNIT_TEST_CONFIG.needPath ? 'loader/': '');
}

var emptyJS = path + 'empty.js';

var head = document.getElementsByTagName('head')[0];

// the only loader instance
var loader = new Loader();

module("loader-basic-buildFileLib", {
	teardown: function() {
		// remove inserted script tag after every test case finished
		var scripts = Sizzle('script');
		for (var i = 0; i < scripts.length; i++) {
			if (scripts[i].getAttribute('data-module') || scripts[i].getAttribute('data-src') || scripts[i].callbacks) {
				if (document.head) document.head.removeChild(scripts[i]);
			}
		}
		loader.clear();
	}
});

test('buildFileLib', function() {
	ok(loader.scripts != null, 'self.scripts should not be null');
	var len1 = loader.scripts.length;

	loader.loadScript(emptyJS, emptyCallback);
	var len2 = loader.scripts.length;
	equal(len1 + 1, len2, 'when new script inserted, loader.scripts should be added automatically');

	var script = document.createElement('script');
	script.setAttribute('data-module', 'test_module');
	script.setAttribute('data-src', emptyJS);
	head.appendChild(script);
	var len3 = loader.scripts.length;
	equal(len1 + 2, len3, 'when new script inserted, loader.scripts should be added automatically');
	loader.buildFileLib();
	var pkg = loader.getModule('test_module');
	ok(pkg, 'new script tag inserted, new module loaded');
	ok(pkg.id == '/temp/test_module.js', 'module test_module is added, id is ok');
	ok(pkg.file == emptyJS, 'module test_module is added, file is ok');

	var script = document.createElement('script');
	script.setAttribute('data-src', 'test_module_null_data-module');
	head.appendChild(script);
	var oldLength = Object.keys(loader.lib).length;
	loader.buildFileLib();
	equal(Object.keys(loader.lib).length, oldLength, 'new script tag inserted, but no data-module attribute, so no new module added');

	var script = document.createElement('script');
	script.setAttribute('data-module', 'test_module_null_data-src');
	head.appendChild(script);
	var oldLength = Object.keys(loader.lib).length;
	loader.buildFileLib();
	equal(Object.keys(loader.lib).length, oldLength, 'new script tag inserted, but no data-src attribute, so no new module added');

	var script = document.createElement('script');
	script.setAttribute('data-module', 'test_module_wrong_data-src');
	script.setAttribute('data-src', 'not-correct-js-file-url');
	head.appendChild(script);
	var oldLength = Object.keys(loader.lib).length;
	loader.buildFileLib();
	equal(Object.keys(loader.lib).length, oldLength + 1, 'new script tag inserted, data-src is not end with .js');
});

module('loader-basic-getAbsolutePath');

// 计算当前引用objectjs的页面文件的目录路径
function calculatePageDir() {
	var loc = window['location'];
	var pageUrl = loc.protocol + '//' + loc.host + (loc.pathname.charAt(0) !== '/' ? '/': '') + loc.pathname;
	// IE 下文件系统是以\为分隔符，统一改为/
	if (pageUrl.indexOf('\\') != - 1) {
		pageUrl = pageUrl.replace(/\\/g, '/');
	}
	var pageDir = './';
	if (pageUrl.indexOf('/') != - 1) {
		// 去除文件，留下目录path
		pageDir = pageUrl.substring(0, pageUrl.lastIndexOf('/') + 1);
	}
	return pageDir;
}

var pageDir = calculatePageDir();

test('getAbsolutePath', function() {
	equal(Loader.getAbsolutePath('file://dir/a.js'), 'file://dir/a.js', 'return cleaned path');
	equal(Loader.getAbsolutePath('http://host/a.js'), 'http://host/a.js', 'return cleaned absolute path');
	equal(Loader.getAbsolutePath('http://host//b/c/../../a.js'), 'http://host/a.js', 'http://host//b/c/../../a.js -> http://host/a.js');
	equal(Loader.getAbsolutePath('//a/b/c/../../a.js'), '//a/a.js', '//a/b/c/../../a.js -> //a/a.js');

	equal(Loader.getAbsolutePath('/a/b/c/../../a.js'), pageDir + 'a/a.js', '/a/b/c/../../a.js -> ' + pageDir + 'a/a/.js');
	equal(Loader.getAbsolutePath('/a/b/c/../../a.js?a=1'), pageDir + 'a/a.js?a=1', '/a/b/c/../../a.js?a=1 -> ' + pageDir + 'a/a/.js?a=1');
	equal(Loader.getAbsolutePath('/a/b/c/../../a.js?a=1#'), pageDir + 'a/a.js?a=1', '/a/b/c/../../a.js?a=1# -> ' + pageDir + 'a/a/.js?a=1');
	equal(Loader.getAbsolutePath('http://hg.xnimg.cn/object/src/dom/index.js'), 'http://hg.xnimg.cn/object/src/dom/index.js', 'http://hg.xnimg.cn/object/src/dom/index.js -> http://hg.xnimg.cn/object/src/dom/index.js');
});

module('loader-basic-removeScript');

test('removeScript', function() {
	loader.loadScript(emptyJS, function() {});
	equal(Object.keys(Loader._urlNodeMap).length, 0, 'no cache, so will not add to _urlNodeMap');
	loader.removeScript(emptyJS);
	loader.loadScript(emptyJS, function() {}, true);
	equal(Object.keys(Loader._urlNodeMap).length, 1, 'cache is true, so will add to _urlNodeMap');
	// if jsTestDriver is running, emptyJS contains url, so do not need to add pageDir
	if (isJsTestDriverRunning) {
		pageDir = '';
	}
	notEqual(Loader._urlNodeMap[pageDir + emptyJS], undefined, pageDir + emptyJS + ' is cached in _urlNodeMap');
	loader.removeScript('_' + emptyJS);
	notEqual(Loader._urlNodeMap[pageDir + emptyJS], undefined, 'remove failed, but should not raise error');
	loader.removeScript(emptyJS);
	equal(Loader._urlNodeMap[pageDir + emptyJS], undefined, pageDir + emptyJS + ' is remove from _urlNodeMap');
});

module("loader-basic-add");
test('add-basic', function() {
	var edges = $UNIT_TEST_CONFIG.testEdges;
	for (var prop in edges) {
		try {
			loader.add(edges[prop], ['a']);
			ok(true, 'loader.add(' + prop + ', [\'a\']) should be ok');
		} catch(e) {
			ok(false, 'loader.add(' + prop + ', [\'a\']) should be ok : ' + e);
		}
		loader.remove(edges[prop]);
	}
});

test('add-usage', function() {
	loader.add('a', function() {});
	ok(loader.getModule('a'), 'a is added to loader.lib');
	loader.add('b', 'a', function() {});
	ok(loader.getModule('b'), 'b is added to loader.lib');
	loader.add('c', 'a,b', function() {});
	ok(loader.getModule('c'), 'c is added to loader.lib');
	equal(loader.lib['/temp/c.js'].dependencies.length, 2, 'c dependencies a and b, so lib[c].dependencies.length = 2');

	loader.add('d/dd', 'a,b,c', function() {});
	ok(loader.getModule('d/dd'), 'd.dd are added to loader.lib');
	equal(loader.lib['/temp/d/dd.js'].dependencies.length, 3, 'd.dd dependencies a ,b and c, so lib[d.dd].dependencies.length = 3');

	loader.add('error1', 'a,b');
	ok(loader.getModule('error1'), 'add module without context, should be added');
	loader.add('error2', 'a', 'a');
	ok(loader.getModule('error2'), 'add module with not-function context, should be added');
	loader.remove('a');
	loader.remove('b');
	loader.remove('c');
	loader.remove('d', true);
	loader.remove('error1');
	loader.remove('error2');
});

module('loader-basic-remove');
test('remove-usage', function() {
	loader.add('a', function() {});
	loader.add('a/b', function() {});
	loader.remove('a');
	ok(!('a' in loader.lib), 'remove ok.');
	ok(loader.getModule('a/b'), 'sub not removed, ok');
	loader.remove('a', true);
	ok(!('a/b' in loader.lib), 'sub removed, ok');
});

module("loader-basic-use");
test('use-basic', function() {
	try {
		loader.use();
	} catch(e) {
		ok(false, 'more arguments are needed : loader.use() : ' + e);
	}
	try {
		loader.use('a');
	} catch(e) {
		ok(false, 'more arguments are needed : loader.use(a) : ' + e);
	}
	loader.add('a', function(exports) {
		exports.a = 1;
	});
	try {
		loader.use('a', 'a');
	} catch(e) {
		ok(false, 'loader.use(str, str), context should be function : ' + e);
	}
	loader.remove('a');
});
test('use-usage', function() {
	var loader = object._loader;
	loader.add('a', function(exports) {
		exports.a = 1;
	});
	loader.add('b', function(exports) {
		exports.b = 1;
	});
	loader.use('a,b', function(exports, a, b) {
		equal(a.a, 1, 'module a used successfully');
		equal(b.b, 1, 'module b used successfully');
	});
	loader.remove('a');
	loader.remove('b');
});

module("loader-basic-execute");
test('execute-basic', function() {
	var edges = $UNIT_TEST_CONFIG.testEdges;
	for (var prop in edges) {
		try {
			loader.execute(edges[prop]);
			ok(true, 'loader.execute(' + prop + ') is ok');
		} catch(e) {
			if (e.message.indexOf('no module named') != 0) {
				ok(false, 'loader.execute(' + prop + ') is ok : ' + e);
			}
		}
	}
});
test('execute-usage', function() {
	expect(2);
	var loader = object._loader;
	loader.remove('a');
	loader.remove('b');
	loader.add('a', function(exports) {
		exports.a = 1;
		ok(true, 'module a executed by loader.execute(a)');
	});
	loader.add('b', 'a', function(exports, a) {
		ok(true, 'module b executed by loader.execute(b)');
	});
	loader.execute('b');
	loader.remove('a');
	loader.remove('b');
});

module('loader-basic-loadScript', {
	teardown: function() {
		// remove inserted script tag after every test case finished
		var scripts = Sizzle('script');
		for (var i = 0; i < scripts.length; i++) {
			if (scripts[i].callbacks) {
				head.removeChild(scripts[i]);
			}
		}
	}
});

test('loadScript basic test', function() {
	ok(loader.loadScript, 'loadScript is visible in Loader');
	var len1 = Sizzle('script').length;
	loader.loadScript(emptyJS, emptyCallback);
	var len2 = Sizzle('script').length;
	equal(len2 - len1, 1, 'add one script tag in document after Loader.loadScript is called');
});

// if is executed by jsTestDriver
if (isJsTestDriverRunning) {
	// jsTestDriver testcases start
	var AsynchronousTest_loadScriptWithUrl = AsyncTestCase('loadScriptBasicTest');

	AsynchronousTest_loadScriptWithUrl.prototype.tearDown = function() {
		var scripts = Sizzle('script');
		for (var i = 0; i < scripts.length; i++) {
			if (scripts[i].callbacks) {
				head.removeChild(scripts[i]);
			}
		}	
	}

	AsynchronousTest_loadScriptWithUrl.prototype.testLoadScriptWithUrl = function(queue) {
		var counter = 0;
		queue.call('Step 1: loadScript.', function(callbacks) {
			var onScriptLoaded = callbacks.add(function() {
				counter = 1;
			});
			loader.loadScript(emptyJS, function() {
				onScriptLoaded();
			});
		});

	  	queue.call('Step 2: assert counter', function() {
			assertEquals('callback is called, script is loaded', 1, counter);
	  	});
	};
	// jsTestDriver testcases end 
} else {
// normal qunit testcases
test('loadScript with url', function() {
	// null/''
	// loader.loadScript('',emptyCallback); will case error;
	//ok(false, 'can not loadScript with null url, which will cause empty script tag');
	//ok(false, 'can not loadScript with empty url, which will cause empty script tag');
	//ok(false, 'can not loadScript with an non-javascript url');
	//ok(false, 'can not loadScript with html/jsp/asp...');
	//raises(function() {
	//	loader.loadScript('not-exists-url', emptyCallback);
	//}, 'can not loadScript with not exists url');
	var oldOnError = window.onerror;
	window.onerror = function() {
		ok(true, 'not-exists-url.js is not exist');
		window.onerror = oldOnError;
		return true;
	};
	loader.loadScript('not-exists-url.js', emptyCallback);
	//equal(Sizzle('script[src=not-exists-url.js]').length, 0, 'not exists url, script tag should be deleted');
	stop();
	// is js, and exists
	loader.loadScript(emptyJS, function() {
		start();
		ok(true, 'callback is called');
	});
});

asyncTest('loadScript with/without callback', function() {
	//ok(false, 'callback can not be null');
	loader.loadScript(emptyJS, function() {
		start();
		ok(true, 'callback is called');
	});
	//loader.loadScript('not-exists-url', function() {
	//		ok(false, 'callback is called when not-exists-url loaded');
	//});
})
}

test('loadScript with/without cache', function() {
	var cacheIsOk = false;
	try {
		loader.loadScript(emptyJS, emptyCallback, true);
		cacheIsOk = true;
	} catch(e) {
		ok(false, 'cache should work with loader.loadScript(emptyJS, emptyCallback, true) : ' + e);
	}

	if (cacheIsOk) {
		loader.loadScript(emptyJS, emptyCallback, true);
		var len1 = Sizzle('script').length;
		loader.loadScript(emptyJS, emptyCallback, true);
		var len2 = Sizzle('script').length;
		equal(len1, len2, 'cache works, load same script, get from cache');
	}
})
})();
