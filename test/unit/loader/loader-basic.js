function emptyCallback(){};
var emptyJS = ($UNIT_TEST_CONFIG.needPath ? 'loader/' : '') + 'empty.js';
var head = document.getElementsByTagName('head')[0];

module("loader-getUses");
test('getUses-basic', function() {
	var loader = new Loader();
	var edges = $UNIT_TEST_CONFIG.testEdges;
	for(var prop in edges) {
		try {
			loader.getUses(edges[prop]);
			ok(true, 'loader.getUses(' + prop + ') should be ok');
		} catch (e) {
			ok(false, 'loader.getUses(' + prop + ') should be ok : ' + e);
		}
	}

	for(var prop in edges) {
		try {
			loader.getUses('1', edges[prop]);
			ok(true, 'loader.getUses(\'1\', ' + prop + ') should be ok');
		} catch (e) {
			ok(false, 'loader.getUses(\'1\', ' + prop + ') should be ok : ' + e);
		}
	}
});

test('getUses-use', function() {
	var loader = object._loader;
	var uses = loader.getUses('1,2,3,4,5', '1');
	equal(uses.length, 4, 'getUses works well');
	equal(uses.indexOf('1'), -1, '1 is ignored as promised');
	equal(uses.indexOf('2'), 0, '2 is in uses because it is not ignored');
});

test('getUses-ignore', function() {
	var loader = object._loader;
	var uses = loader.getUses('1', '1');
	equal(uses.length, 0, 'getUses works well');
	var uses = loader.getUses('1', 1);
	equal(uses.length, 1, 'getUses(\'1\', 1) should not remove \'1\', ignore must be string, or use === to judge');
	var uses = loader.getUses('true', true);
	equal(uses.length, 1, 'getUses(\'true\', true) should not remove \'true\'');
	var uses = loader.getUses(',1,2,3,4,');
	equal(uses.length, 4, '\',1,2,3,4,\' should be considered');
	//var uses = loader.getUses('1,2,3,4', ['1','2']);
	//equal(uses.length, 2, 'we may want to ignore more than one member at a time');
});

module("loader-loadLib", {teardown: function() {
	// remove inserted script tag after every test case finished
	var scripts = Sizzle('script');
	for(var i=0;i<scripts.length; i++) {
		if(scripts[i].getAttribute('data-module') 
			|| scripts[i].getAttribute('data-src')
			|| scripts[i].callbacks) {
			if(document.head) document.head.removeChild(scripts[i]);
		}
	}
}});

test('loadLib', function() {
	//ok(false, 'what is the difference between self.scripts and cls.scripts in Loader? when to use??');
	var loader = new Loader();
	ok(Object.keys(loader.lib).length == 1, 'only sys in loader.lib');
	loader.loadLib();
	ok(Object.keys(loader.lib).length == 1, 'still only sys in loader.lib');
	ok(loader.scripts != null, 'self.scripts should not be null');
	var len1 = loader.scripts.length;
	
	Loader.loadScript(emptyJS, emptyCallback);
	var len2 = loader.scripts.length;
	equal(len1 + 1, len2, 'when new script inserted, loader.scripts should be added automatically');

	var script = document.createElement('script');
	script.setAttribute('data-module', 'test_module');
	script.setAttribute('data-src', emptyJS);
	head.appendChild(script);
	var len3 = loader.scripts.length;
	equal(len1 + 2, len3, 'when new script inserted, loader.scripts should be added automatically');
	loader.loadLib();
	ok(Object.keys(loader.lib).length == 2, 'new script tag inserted, new module loaded');
	ok(loader.lib['test_module'] != null, 'module test_module is added');
	ok(loader.lib['test_module'].name == 'test_module', 'module test_module is added, name is ok');
	ok(loader.lib['test_module'].file == emptyJS, 'module test_module is added, file is ok');

	var script = document.createElement('script');
	script.setAttribute('data-src', 'test_module_null_data-module');
	head.appendChild(script);
	var oldLength = Object.keys(loader.lib).length;
	loader.loadLib();
	equal(Object.keys(loader.lib).length, oldLength, 'new script tag inserted, but no data-module attribute, so no new module added');

	var script = document.createElement('script');
	script.setAttribute('data-module', 'test_module_null_data-src');
	head.appendChild(script);
	var oldLength = Object.keys(loader.lib).length;
	loader.loadLib();
	equal(Object.keys(loader.lib).length, oldLength, 'new script tag inserted, but no data-src attribute, so no new module added');

	var script = document.createElement('script');
	script.setAttribute('data-module', 'test_module_wrong_data-src');
	script.setAttribute('data-src', 'not-correct-js-file-url');
	head.appendChild(script);
	var oldLength = Object.keys(loader.lib).length;
	loader.loadLib();
	equal(Object.keys(loader.lib).length, oldLength+1, 'new script tag inserted, data-src is not end with .js');
});

module("loader-add");
test('add-basic', function() {
	var loader = new Loader();
	var edges = $UNIT_TEST_CONFIG.testEdges;
	for(var prop in edges) {
		try {
			loader.add(edges[prop], ['a']);
			ok(true, 'loader.add(' + prop + ', [\'a\']) should be ok');
		} catch (e) {
			ok(false, 'loader.add(' + prop + ', [\'a\']) should be ok : ' + e);
		}
	}
});

test('add-usage', function() {
	var loader = new Loader();
	equal(Object.keys(loader.lib).length, 1, 'only sys in loader.lib');
	loader.add('a', function() {});
	equal(Object.keys(loader.lib).length, 2, 'a is added to loader.lib');
	loader.add('b', 'a', function() {});
	equal(Object.keys(loader.lib).length, 3, 'b is added to loader.lib');
	loader.add('c', 'a,b', function() {});
	equal(Object.keys(loader.lib).length, 4, 'c is added to loader.lib');
	equal(loader.lib['c'].uses.length, 2, 'c uses a and b, so lib[c].uses.length = 2');

	loader.add('d.dd', 'a,b,c', function() {});
	equal(Object.keys(loader.lib).length, 6, 'd and d.dd are added to loader.lib');
	equal(loader.lib['d.dd'].uses.length, 3, 'd.dd uses a ,b and c, so lib[d.dd].uses.length = 3');

	loader.add('error1', 'a,b');
	equal(loader.lib['error1'], undefined, 'add module without context, should not be added');
	loader.add('error2', 'a', 'a');
	equal(loader.lib['error2'], undefined, 'add module with not-function context, should not be added');
});

module("loader-use");
test('use-basic', function() {
	try {
		new Loader().use();
	} catch (e) {
	   	ok(false, 'more arguments are needed : loader.use() : ' + e);
	}
	try {
		new Loader().use('a');
	} catch (e) {
	   	ok(false, 'more arguments are needed : loader.use(a) : ' + e);
	}
	var loader = new Loader();
	loader.add('a', function(exports) {
		exports.a = 1;
	});
	try { 
		loader.use('a', 'a'); 
	} catch (e) {
	   	ok(false, 'loader.use(str, str), context should be function : ' + e);
	}
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
		exports.extendToWindow = 1;
	});
	equal(window.extendToWindow, 1, 'extend to window successfully');
});

module("loader-execute");
test('execute-basic', function() {
	var loader = new Loader();
	var edges = $UNIT_TEST_CONFIG.testEdges;
	for(var prop in edges) {
		try {
			loader.execute(edges[prop]);
			ok(true, 'loader.execute(' + prop + ') is ok');
		} catch (e) {
			if(e.message.indexOf('no module named') != 0) {
				ok(false, 'loader.execute(' + prop + ') is ok : ' + e);
			}
		}
	}
});
test('execute-usage', function() {
	expect(2);
	var loader = object._loader;
	delete loader.lib['a'];
	delete loader.lib['b'];
	loader.add('a', function(exports) {
		exports.a = 1;
		ok(true, 'module a executed by loader.execute(a)');
	});
	loader.add('b', 'a', function(exports, a) {
		ok(true, 'module b executed by loader.execute(b)');
	});
	loader.execute('b');
	delete loader.lib['a'];
	delete loader.lib['b'];
});
