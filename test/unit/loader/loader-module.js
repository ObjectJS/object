module('loader-loadScript', {teardown: function() {
	// remove inserted script tag after every test case finished
	var scripts = Sizzle('script');
	for(var i=0;i<scripts.length; i++) {
		if(scripts[i].callbacks) {
			document.head.removeChild(scripts[i]);
		} else if(scripts[i].getAttribute('data-module')) {
			document.head.removeChild(scripts[i]);
		}
	}
	delete object._loader.lib['module1'];
	delete object._loader.lib['module2'];
	delete object._loader.lib['module1.module2'];
	delete object._loader.lib['module1.module2.module3'];
}});

var path = ($LAB.needPath ? 'loader/' : '');
function emptyCallback(){};
var emptyJS = path + 'empty.js';
var module1JS_seperate = path + 'module1.js';
var module2JS_seperate = path + 'module2.js';
var module1JS_depends = path + 'module1-depends.js';
var module2JS_depends = path + 'module2-depends.js';
var module1JS_parent = path + 'module1-parent.js';
var module2JS_parent = path + 'module2-sub.js';
var module1JS_parent_2 = path + 'module1-parent-2.js';
var module2JS_parent_2 = path + 'module2-sub-2.js';
var module1JS_same_name = path + 'module1-same-name.js';
var module2JS_same_name = path + 'module2-same-name.js';
var module1JS_request_file_once = path + 'module1-request-file-once.js';

function addModuleScriptToHead(name, src) {
	var script = document.createElement('script');
	script.setAttribute('data-module', name);
	script.setAttribute('data-src', src);
	document.head.appendChild(script);
}
test('add script as module', function() {
	addModuleScriptToHead('module1', module1JS_seperate);
	addModuleScriptToHead('module2', module2JS_seperate);
	var loader = object._loader;
	loader.loadLib();
	ok(loader.lib['module1'] != null, 'module1 is in loader.lib');
	ok(loader.lib['module2'] != null, 'module2 is in loader.lib');
	equal(loader.lib['module1'].file, module1JS_seperate, 'module1 js file is ' + module1JS_seperate);
	equal(loader.lib['module2'].file, module2JS_seperate, 'module2 js file is ' + module2JS_seperate);

	stop();
	loader.use('module1', function(exports, module1) {
		start();
		equal(module1.a, 1, 'module load from file, module1.a = 1 is ok');
	});
	stop();
	loader.use('module2', function(exports, module2) { 
		start();
		equal(module2.a, 2, 'module load from file, module2.a = 1 is ok');
	});
});

test('file module1 depends on file module2', function() {
	addModuleScriptToHead('module1', module1JS_depends);
	addModuleScriptToHead('module2', module2JS_depends);
	var loader = object._loader;
	loader.loadLib();
	stop();
	loader.use('module1', function(exports, module1) {
		start();
		equal(module1.a, 1, 'module1.a is ok : 1');
		equal(module1.b, 2, 'module1.b, from module2.b is ok : 2');
	});
});

test('file module1 is parent, file module1.module2 is sub', function() {
	addModuleScriptToHead('module1', module1JS_parent);
	addModuleScriptToHead('module1.module2', module2JS_parent);
	var loader = object._loader;
	stop();
	loader.loadLib();
	loader.use('module1.module2', function(exports, module1) {
		start();
		equal(module1.a, 1, 'use module1.module2, module1.a is ok : 1');
		equal(module1.module2.a, 2, 'use module1.module2, module1.module2.a is ok : 2');
	});
	loader.use('module1', function(exports, module1) {
		equal(module1.a, 1, 'only use module1, module1.a is ok : 1');
	});
});

test('file module1 is parent, file module1.module2.module3 is sub', function() {
	addModuleScriptToHead('module1', module1JS_parent_2);
	addModuleScriptToHead('module1.module2.module3', module2JS_parent_2);
	var loader = object._loader;
	stop();
	loader.loadLib();
	loader.use('module1.module2.module3', function(exports, module1) {
		start();
		equal(module1.a, 1, 'use module1.module2, module1.a is ok : 1');
		equal(module1.module2.module3.a, 2, 'use module1.module2.module3, module1.module2.module3.a is ok : 2');
	});
	loader.use('module1', function(exports, module1) {
		equal(module1.a, 1, 'only use module1, module1.a is ok : 1');
	});
});

test('file module1 name is module1, file module2 name is the same', function() {
	addModuleScriptToHead('module1', module1JS_same_name);
	addModuleScriptToHead('module1', module2JS_same_name);
	stop();
	setTimeout(function() {
		var loader = object._loader;
		loader.loadLib();
		loader.use('module1', function(exports, module1) {
			start();
			equal(module1.a, 1, 'use module1, will choose the first module');
		});
	}, 200);
});

test('request module file only once', function() {
	expect(4);
	addModuleScriptToHead('module1', module1JS_request_file_once);
	var loader = object._loader;
	loader.loadLib();
	stop();
	window.moduleFileRequestTimeCounter = 0;
	setTimeout(function() {
		loader.use('module1', function(exports, module1) {
			start();
			equal(module1.test, 1, 'use module1, which add counter by one on window');
			equal(window.moduleFileRequestTimeCounter, 1, 'request module file once');
		});
		stop();
		setTimeout(function() {
			loader.use('module1', function(exports, module1) {
				start();
				equal(module1.test, 1, 'use module1, which add counter by one on window');
				equal(window.moduleFileRequestTimeCounter, 1, 'request module file only once');
			});
		}, 200);
		
	}, 200);
});

//loadNext(0) each time when meet a file
//__class__ is in instance, __this__ is also in instance
//
//add two different seperate module
//add as same module with different url
//parent module and sub module
//parent module appear after sub module
//add same script tag, no error, will not get same module file twice
//
//add many tags, many files
