module('loader-loadScript');

function recoverEnv() {
	var scripts = Sizzle('script');
	var head = document.getElementsByTagName('head')[0];
	for(var i=0;i<scripts.length; i++) {
		if(scripts[i].callbacks || scripts[i].getAttribute('data-module') || /module[\dA-Z]/.test(scripts[i].src)) {
			head.removeChild(scripts[i]);
		}
	}
	for(var prop in object._loader.lib) {
		if(/module/.test(prop)|| /__anonymous_/.test(prop)) {
			delete object._loader.lib[prop];
		}
	}
}

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
var moduleAJS_abc = path + 'moduleABC-a.js'
var moduleBJS_abc = path + 'moduleABC-b.js'
var moduleCJS_abc = path + 'moduleABC-c.js'

function addModuleScriptToHead(name, src) {
	var script = document.createElement('script');
	script.setAttribute('data-module', name);
	script.setAttribute('data-src', src);
	document.getElementsByTagName('head')[0].appendChild(script);
	return script;
}

test('add script as module', function() {
	recoverEnv();
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
	loader.use('module2', function(exports, module2) { 
		start();
		equal(module2.a, 2, 'module load from file, module2.a = 1 is ok');
	});
});

test('file module1 depends on file module2', function() {
	recoverEnv();
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
	recoverEnv();
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
	recoverEnv();
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
	recoverEnv();
	addModuleScriptToHead('module1', module1JS_same_name);
	addModuleScriptToHead('module1', module2JS_same_name);
	stop();
	setTimeout(function() {
		var loader = object._loader;
		loader.loadLib();
		loader.use('module1', function(exports, module1) {
			start();
			equal(module1.a, 1, 'use module1, will choose the first script tag whose data-module is module1');
		});
	}, 200);
});

test('request module file only once', function() {
	recoverEnv();
	addModuleScriptToHead('module1', module1JS_request_file_once);
	var loader = object._loader;
	loader.loadLib();
	stop();
	window.moduleFileRequestTimeCounter = 0;
	loader.use('module1', function(exports, module1) {
		start();
		equal(module1.test, 1, 'use module1, which add counter by one on window');
		equal(window.moduleFileRequestTimeCounter, 1, 'request module file once');
	});
	stop();
	loader.use('module1', function(exports, module1) {
		start();
		equal(module1.test, 1, 'use module1, which add counter by one on window');
		equal(window.moduleFileRequestTimeCounter, 1, 'request module file only once');
		recoverEnv();
	});
});

test('file module1 is used by an existing module', function() {
	recoverEnv();
	addModuleScriptToHead('module1', module1JS_request_file_once);
	stop();
	var loader = object._loader;
	object.add('use_module1', 'module1', function(exports, module1) {
		exports.a = 1;
		equal(module1.test, 1, 'use module1 in object.add');
	})
	loader.use('use_module1', function(exports, use_module1) {
		start();
		equal(use_module1.a, 1, 'use_module1.a is ok');
	});
});

test('sub module appears before parent module', function() {
	recoverEnv();
	addModuleScriptToHead('module1.module2', module2JS_parent);
	addModuleScriptToHead('module1', module1JS_parent);
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

test('use many modules', function() {
	recoverEnv();
	addModuleScriptToHead('moduleA', moduleAJS_abc);
	addModuleScriptToHead('moduleB', moduleBJS_abc);
	addModuleScriptToHead('moduleC', moduleCJS_abc);
	var loader = object._loader;
	stop();
	loader.use('moduleA,moduleB,moduleC', function(exports, moduleA, moduleB, moduleC) {
		start();
		equal(moduleA.a, 1, 'moduleA got');
		equal(moduleB.b, 1, 'moduleB got');
		equal(moduleC.c, 1, 'moduleC got');
		recoverEnv();
	});
});
//parent module appear after sub module
//add same script tag, no error, will not get same module file twice
//add many tags, many files
