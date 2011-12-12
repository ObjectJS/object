module('loader-usage-loadScript');

function recoverEnv() {
	var scripts = Sizzle('script');
	var head = document.getElementsByTagName('head')[0];
	for (var i = 0; i < scripts.length; i++) {
		if (scripts[i].callbacks || scripts[i].getAttribute('data-module') 
				|| /(module[\dsA-Z])|empty/.test(scripts[i].src)) {
			if (scripts[i].src) {
				Loader.removeScript(scripts[i].src);
			} else {
				if(scripts[i].parentNode) {
					scripts[i].parentNode.removeChild(scripts[i]);
				}
			}
		}
	}
	for (var prop in object._loader.lib) {
		if (/module/.test(prop)) {
			delete object._loader.lib[prop];
		}
	}
	for (var prop in object._loader.fileLib) {
		if (/module/.test(prop)) {
			delete object._loader.fileLib[prop];
		}
	}
	for (var prop in object._loader.prefixLib) {
		if (/module/.test(prop)) {
			delete object._loader.prefixLib[prop];
		}
	}
}

if (isJsTestDriverRunning) {
	var loc = window['location'];
	var pageUrl = loc.protocol + '//' + loc.host;
	var path = pageUrl + '/test/test/unit/loader/';
} else {
	var path = ($UNIT_TEST_CONFIG.needPath ? 'loader/': '');
}
function emptyCallback() {};
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
var module_manyModules = path + 'one-file-many-modules.js';

function addModuleScriptToHead(name, src) {
	var script = document.createElement('script');
	script.setAttribute('data-module', name);
	script.setAttribute('data-src', src);
	document.getElementsByTagName('head')[0].appendChild(script);
	return script;
}

// if is executed by jsTestDriver
if (isJsTestDriverRunning) {
	var loader = object._loader;
	var AsyncTestCase_loaderUsageLoadScript = AsyncTestCase('loaderUsageLoadScript');

	AsyncTestCase_loaderUsageLoadScript.prototype.testAddScriptAsModule = function(queue) {
		queue.call('Step 1: recoverEnv.', function() {
			recoverEnv();
		});
		queue.call('Step2 : basic test', function() {
			addModuleScriptToHead('module1', module1JS_seperate);
			addModuleScriptToHead('module2', module2JS_seperate);
			loader.buildFileLib();
			ok(loader.fileLib['module1'] != null, 'module1 is in loader.lib');
			ok(loader.fileLib['module2'] != null, 'module2 is in loader.lib');
			equal(loader.fileLib['module1'].file, module1JS_seperate, 'module1 js file is ' + module1JS_seperate);
			equal(loader.fileLib['module2'].file, module2JS_seperate, 'module2 js file is ' + module2JS_seperate);
		});
		queue.call('Step3 : use module1', function(callbacks) {
			var callback = callbacks.add(function(value) {
				assertEquals('module load from file, module1.a = 1 is ok', 1, value);
			});
			var callback2 = callbacks.add(function(value) {
				assertEquals('module load from file, module2.a = 2 is ok', 2, value);
			});
			object.use('module1', function(module1) {
				callback(module1.a);
			});
			object.use('module2', function(module2) {
				callback2(module2.a);
			});
		});
	};

	AsyncTestCase_loaderUsageLoadScript.prototype['testAddScriptAsModule,ButIsAnotherModule'] = function(queue) {
		queue.call('Step 1: recoverEnv.', function() {
			recoverEnv();
		});
		queue.call('Step2 : add file', function() {
			addModuleScriptToHead('module1', module2JS_seperate);
			loader.buildFileLib();
		});
		queue.call('Step3 : use module1', function(callbacks) {
			// for global error throwed in callback of executeModule
			var oldError = window.onerror;
			var callback = callbacks.add(function(value) {
				assertEquals('error occurred when data-module is module1, data-src file is about module2', value, 1);
				window.onerror = oldError;
			});
			window.onerror = function(a, b, c) {
				callback(1);
				return true;
			};
			loader.use('module1', function(module1) {});
		});
	};
	AsyncTestCase_loaderUsageLoadScript.prototype['testFileModule1DependsOnFileModule2'] = function(queue) {
		queue.call('Step 1: recoverEnv.', function() {
			recoverEnv();
		});
		queue.call('Step2 : add file', function() {
			addModuleScriptToHead('module1', module1JS_depends);
			addModuleScriptToHead('module2', module2JS_depends);
			loader.buildFileLib();
		});
		queue.call('Step3 : use module1, which depends on module2', function(callbacks) {
			var callback = callbacks.add(function(a, b) {
				equal(a, 1, 'module1.a is ok : 1');
				equal(b, 2, 'module1.b, from module2.b is ok : 2');
			});
			loader.use('module1', function(module1) {
				callback(module1.a, module1.b);
			});
		});
	};

	AsyncTestCase_loaderUsageLoadScript.prototype['testFileModule1DependsOnFileModule2'] = function(queue) {
		queue.call('Step 1: recoverEnv.', function() {
			recoverEnv();
		});
		queue.call('Step2 : add file', function() {
			addModuleScriptToHead('module1', module1JS_depends);
			addModuleScriptToHead('module2', module2JS_depends);
			loader.buildFileLib();
		});
		queue.call('Step3 : use module1, which depends on module2', function(callbacks) {
			var callback = callbacks.add(function(a, b) {
				equal(a, 1, 'module1.a is ok : 1');
				equal(b, 2, 'module1.b, from module2.b is ok : 2');
			});
			loader.use('module1', function(module1) {
				callback(module1.a, module1.b);
			});
		});
	};

	AsyncTestCase_loaderUsageLoadScript.prototype['testManyModulesInOneModuleFile'] = function(queue) {
		queue.call('Step 1: recoverEnv.', function() {
			recoverEnv();
		});
		queue.call('Step2 : add file', function() {
			addModuleScriptToHead('module1', module_manyModules);
			addModuleScriptToHead('module2', module_manyModules);
			addModuleScriptToHead('module3', module_manyModules);
			loader.buildFileLib();
		});
		queue.call('Step3 : use module1, which depends on module2', function(callbacks) {
			window.oneFileManyModules_load_times = 0;
			var callback1 = callbacks.add(function(a) {
				equal(a, 1, 'module1.a is ok : 1');
			});
			var callback2 = callbacks.add(function(b) {
				equal(b, 1, 'module2.b is ok : 1');
			});
			var callback3 = callbacks.add(function(c) {
				equal(c, 1, 'module3.c is ok : 1');
				equal(window.oneFileManyModules_load_times, 1, 'only load script once');
			});
			loader.use('module1', function(module1) {
				callback1(module1.a);
			});
			loader.use('module2', function(module2) {
				callback2(module2.b);
			});
			loader.use('module3', function(module3) {
				callback3(module3.c);
			});
		});
		queue.call('Step4 : recoverEnv again', function() {
			recoverEnv();
		});
	};

	AsyncTestCase_loaderUsageLoadScript.prototype['testModule1IsParent,Module1.Module2IsSubFromFile'] = function(queue) {
		queue.call('Step 1: recoverEnv.', function() {
			recoverEnv();
		});
		queue.call('Step2 : add file', function() {
			addModuleScriptToHead('module1', module1JS_parent);
			addModuleScriptToHead('module1.module2', module2JS_parent);
			loader.buildFileLib();
		});
		queue.call('Step3 : use module1, which depends on module2', function(callbacks) {
			var callback1 = callbacks.add(function(a, b) {
				equal(a, 1, 'use module1.module2, module1.a is ok : 1');
				equal(b, 2, 'use module1.module2, module1.module2.a is ok : 2');
			});
			var callback2 = callbacks.add(function(b) {
				equal(b, 1, 'only use module1, module1.a is ok : 1');
			});
			loader.use('module1.module2', function(module1) {
				callback1(module1.a, module1.module2.a);
			});
			loader.use('module1', function(module1) {
				callback2(module1.a);
			});
		});
	};

	AsyncTestCase_loaderUsageLoadScript.prototype['testModule1IsParent,Module1.Module2.Module3IsSubFromFile'] = function(queue) {
		queue.call('Step 1: recoverEnv.', function() {
			recoverEnv();
		});
		queue.call('Step2 : add file', function() {
			addModuleScriptToHead('module1', module1JS_parent_2);
			addModuleScriptToHead('module1.module2.module3', module2JS_parent_2);
			loader.buildFileLib();
		});
		queue.call('Step3 : use module1, which depends on module2', function(callbacks) {
			var callback1 = callbacks.add(function(a, b) {
				equal(a, 1, 'use module1.module2, module1.a is ok : 1');
				equal(b, 2, 'use module1.module2.module3, module1.module2.module3.a is ok : 2');
			});
			var callback2 = callbacks.add(function(b) {
				equal(b, 1, 'only use module1, module1.a is ok : 1');
			});
			loader.use('module1.module2.module3', function(module1) {
				callback1(module1.a, module1.module2.module3.a);
			});
			loader.use('module1', function(module1) {
				callback2(module1.a);
			});
		});
	};

	AsyncTestCase_loaderUsageLoadScript.prototype['testFileModule1NameIsModule1,FileModule2NameIsTheSame'] = function(queue) {
		queue.call('Step 1: recoverEnv.', function() {
			recoverEnv();
		});
		queue.call('Step2 : add file', function() {
			addModuleScriptToHead('module1', module1JS_same_name);
			addModuleScriptToHead('module1', module2JS_same_name);
			loader.buildFileLib();
		});
		queue.call('Step3 : use module1, which depends on module2', function(callbacks) {
			var callback1 = callbacks.add(function(a) {
				equal(a, 1, 'use module1, will choose the first script tag whose data-module is module1');
			});
			loader.use('module1', function(module1) {
				callback1(module1.a);
			});
		});
	};

	AsyncTestCase_loaderUsageLoadScript.prototype['testRequestModuleFileOnlyOnce'] = function(queue) {
		queue.call('Step 1: recoverEnv.', function() {
			recoverEnv();
		});
		queue.call('Step2 : add file', function() {
			addModuleScriptToHead('module1', module1JS_request_file_once);
			loader.buildFileLib();
		});
		queue.call('Step3 : use module1, which depends on module2', function(callbacks) {
			window.moduleFileRequestTimeCounter = 0;
			var callback1 = callbacks.add(function() {
				equal(window.moduleFileRequestTimeCounter, 1, 'request module file only once');
			});
			var callback2 = callbacks.add(function() {
				equal(window.moduleFileRequestTimeCounter, 1, 'request module file only once');
			});
			loader.use('module1', function(module1) {
				equal(module1.test, 1, 'use module1, which add counter by one on window');
				callback1();
			});
			loader.use('module1', function(module1) {
				equal(module1.test, 1, 'use module1, which add counter by one on window');
				callback2();
			});
		});
		queue.call('Step 4: recoverEnv again.', function() {
			recoverEnv();
		});
	};
	
	AsyncTestCase_loaderUsageLoadScript.prototype['testFileModule1IsUsedByAnExistingModule'] = function(queue) {
		queue.call('Step 1: recoverEnv.', function() {
			recoverEnv();
		});
		queue.call('Step2 : add file', function() {
			addModuleScriptToHead('module1', module1JS_request_file_once);
			loader.buildFileLib();
		});
		queue.call('Step3 : use module1, which depends on module2', function(callbacks) {
			var callback = callbacks.add(function(value) {
				equal(value, 1, 'use_module1.a is ok');
			});
			loader.add('use_module1', 'module1', function(exports, module1) {
				exports.a = 1;
				equal(module1.test, 1, 'use module1 in object.add');
			});
			loader.use('use_module1', function(use_module1) {
				callback(use_module1.a);
			});
		});
	};

	AsyncTestCase_loaderUsageLoadScript.prototype['testSubModuleAppearsBeforeParentModule'] = function(queue) {
		queue.call('Step 1: recoverEnv.', function() {
			recoverEnv();
		});
		queue.call('Step2 : add file', function() {
			addModuleScriptToHead('module1.module2', module2JS_parent);
			addModuleScriptToHead('module1', module1JS_parent);
			loader.buildFileLib();
		});
		queue.call('Step3 : use module1, which depends on module2', function(callbacks) {
			var callback = callbacks.add(function(a, b) {
				equal(a, 1, 'use module1.module2, module1.a is ok : 1');
				equal(b, 2, 'use module1.module2, module1.module2.a is ok : 2');
			});
			var callback2 = callbacks.add(function(a) {
				equal(a, 1, 'only use module1, module1.a is ok : 1');
			});
			loader.use('module1.module2', function(module1) {
				callback(module1.a, module1.module2.a);
			});
			loader.use('module1', function(module1) {
				callback2(module1.a);
			});
		});
	};

	AsyncTestCase_loaderUsageLoadScript.prototype['testUseManyModules'] = function(queue) {
		queue.call('Step 1: recoverEnv.', function() {
			recoverEnv();
		});
		queue.call('Step2 : add file', function() {
			addModuleScriptToHead('moduleA', moduleAJS_abc);
			addModuleScriptToHead('moduleB', moduleBJS_abc);
			addModuleScriptToHead('moduleC', moduleCJS_abc);
			loader.buildFileLib();
		});
		queue.call('Step3 : use module1, which depends on module2', function(callbacks) {
			var callback = callbacks.add(function(a, b, c) {
				equal(a, 1, 'moduleA got');
				equal(b, 1, 'moduleB got');
				equal(c, 1, 'moduleC got');
			});
			loader.use('moduleA,moduleB,moduleC', function(moduleA, moduleB, moduleC) {
				callback(moduleA.a, moduleB.b, moduleC.c);
			});
		});
		queue.call('Step 4: recoverEnv again.', function() {
			recoverEnv();
		});
	};

	AsyncTestCase_loaderUsageLoadScript.prototype['testManyUrlsPointingToTheSameFile'] = function(queue) {
		queue.call('Step 1: recoverEnv.', function() {
			recoverEnv();
		});
		queue.call('Step2 : add file', function() {
			Loader.loadScript(emptyJS, function() {}, true);
			equal(Object.keys(Loader.get('_urlNodeMap')).length, 1, 'one file added');
			Loader.loadScript(emptyJS + '/abc/..', function() {}, true);
			equal(Object.keys(Loader.get('_urlNodeMap')).length, 1, '/test.js/abc/.. is the same whti test.js');
			Loader.loadScript(emptyJS + '#', function() {}, true);
			equal(Object.keys(Loader.get('_urlNodeMap')).length, 1, '/test/unit/xxx.js# is the same dir with xxx.js, will not load again');
		});
		queue.call('Step 3: recoverEnv again.', function() {
			recoverEnv();
		});
	};
} else {
	test('add script as module', function() {
		recoverEnv();
		addModuleScriptToHead('module1', module1JS_seperate);
		addModuleScriptToHead('module2', module2JS_seperate);
		var loader = object._loader;
		loader.buildFileLib();
		ok(loader.fileLib['module1'] != null, 'module1 is in loader.lib');
		ok(loader.fileLib['module2'] != null, 'module2 is in loader.lib');
		equal(loader.fileLib['module1'].file, module1JS_seperate, 'module1 js file is ' + module1JS_seperate);
		equal(loader.fileLib['module2'].file, module2JS_seperate, 'module2 js file is ' + module2JS_seperate);

		stop();
		loader.use('module1', function(module1) {
			start();
			equal(module1.a, 1, 'module load from file, module1.a = 1 is ok');
		});
		loader.use('module2', function(module2) {
			start();
			equal(module2.a, 2, 'module load from file, module2.a = 2 is ok');
		});
	});
	test('add script as module, but is another module', function() {
		recoverEnv();
		addModuleScriptToHead('module1', module2JS_seperate);
		var loader = object._loader;
		loader.buildFileLib();
		stop();
		// for global error throwed in callback of executeModule
		var oldError = window.onerror;
		window.onerror = function(a, b, c) {
			start();
			ok(true, 'error occurred when data-module is module1, data-src file is about module2');
			window.onerror = oldError;
			return true;
		};
		loader.use('module1', function(module1) {});
	});

	test('file module1 depends on file module2', function() {
		recoverEnv();
		addModuleScriptToHead('module1', module1JS_depends);
		addModuleScriptToHead('module2', module2JS_depends);
		var loader = object._loader;
		loader.buildFileLib();
		stop();
		loader.use('module1', function(module1) {
			start();
			equal(module1.a, 1, 'module1.a is ok : 1');
			equal(module1.b, 2, 'module1.b, from module2.b is ok : 2');
		});
	});

	test('one module file, many modules', function() {
		recoverEnv();
		addModuleScriptToHead('module1', module_manyModules);
		addModuleScriptToHead('module2', module_manyModules);
		addModuleScriptToHead('module3', module_manyModules);
		var loader = object._loader;
		loader.buildFileLib();
		window.oneFileManyModules_load_times = 0;
		stop();
		loader.use('module1', function(module1) {
			start();
			equal(module1.a, 1, 'module1.a is ok : 1');
			stop();
			loader.use('module2', function(module2) {
				start();
				equal(module2.b, 1, 'module2.b is ok : 1');
				stop();
				loader.use('module3', function(module3) {
					start();
					equal(module3.c, 1, 'module3.c is ok : 1');
					equal(window.oneFileManyModules_load_times, 1, 'only load script once');
					recoverEnv();
				});
			});
		});
	});

	test('file module1 is parent, file module1.module2 is sub', function() {
		recoverEnv();
		addModuleScriptToHead('module1', module1JS_parent);
		addModuleScriptToHead('module1.module2', module2JS_parent);
		var loader = object._loader;
		stop();
		loader.buildFileLib();
		loader.use('module1.module2', function(module1) {
			start();
			equal(module1.a, 1, 'use module1.module2, module1.a is ok : 1');
			equal(module1.module2.a, 2, 'use module1.module2, module1.module2.a is ok : 2');
		});
		loader.use('module1', function(module1) {
			equal(module1.a, 1, 'only use module1, module1.a is ok : 1');
		});
	});

	test('file module1 is parent, file module1.module2.module3 is sub', function() {
		recoverEnv();
		addModuleScriptToHead('module1', module1JS_parent_2);
		addModuleScriptToHead('module1.module2.module3', module2JS_parent_2);
		var loader = object._loader;
		stop();
		loader.buildFileLib();
		loader.use('module1.module2.module3', function(module1) {
			start();
			equal(module1.a, 1, 'use module1.module2, module1.a is ok : 1');
			equal(module1.module2.module3.a, 2, 'use module1.module2.module3, module1.module2.module3.a is ok : 2');
		});
		loader.use('module1', function(module1) {
			equal(module1.a, 1, 'only use module1, module1.a is ok : 1');
		});
	});

	test('file module1 name is module1, file module2 name is the same', function() {
		recoverEnv();
		addModuleScriptToHead('module1', module1JS_same_name);
		addModuleScriptToHead('module1', module2JS_same_name);
		stop();
		var loader = object._loader;
		loader.buildFileLib();
		loader.use('module1', function(module1) {
			start();
			equal(module1.a, 1, 'use module1, will choose the first script tag whose data-module is module1');
		});
	});

	test('request module file only once', function() {
		recoverEnv();
		addModuleScriptToHead('module1', module1JS_request_file_once);
		var loader = object._loader;
		loader.buildFileLib();
		stop();
		window.moduleFileRequestTimeCounter = 0;
		loader.use('module1', function(module1) {
			start();
			equal(module1.test, 1, 'use module1, which add counter by one on window');
			equal(window.moduleFileRequestTimeCounter, 1, 'request module file once');
			stop();
			loader.use('module1', function(module1) {
				start();
				equal(module1.test, 1, 'use module1, which add counter by one on window');
				equal(window.moduleFileRequestTimeCounter, 1, 'request module file only once');
				recoverEnv();
			});
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
		loader.use('use_module1', function(use_module1) {
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
		loader.buildFileLib();
		loader.use('module1.module2', function(module1) {
			start();
			equal(module1.a, 1, 'use module1.module2, module1.a is ok : 1');
			equal(module1.module2.a, 2, 'use module1.module2, module1.module2.a is ok : 2');
		});
		loader.use('module1', function(module1) {
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
		loader.use('moduleA,moduleB,moduleC', function(moduleA, moduleB, moduleC) {
			start();
			equal(moduleA.a, 1, 'moduleA got');
			equal(moduleB.b, 1, 'moduleB got');
			equal(moduleC.c, 1, 'moduleC got');
			recoverEnv();
		});
	});

	test('many urls pointing to the same file', function() {
		recoverEnv();
		// only test when test in test-runner
		if (!$UNIT_TEST_CONFIG.needPath || isJsTestDriverRunning) {
			return;
		}
		Loader.loadScript(emptyJS, function() {}, true);
		equal(Object.keys(Loader.get('_urlNodeMap')).length, 1, 'one file added');
		Loader.loadScript('../unit/' + emptyJS, function() {}, true);
		equal(Object.keys(Loader.get('_urlNodeMap')).length, 1, '../unit/xxx.js is the same dir with xxx.js, will not load again');
		Loader.loadScript('..//unit/' + emptyJS, function() {}, true);
		equal(Object.keys(Loader.get('_urlNodeMap')).length, 1, '..//unit/xxx.js is the same dir with xxx.js, will not load again');
		Loader.loadScript('../../test/unit/' + emptyJS, function() {}, true);
		equal(Object.keys(Loader.get('_urlNodeMap')).length, 1, '../../test/unit/xxx.js is the same dir with xxx.js, will not load again');
		Loader.loadScript('../../test/unit/' + emptyJS + '#', function() {}, true);
		equal(Object.keys(Loader.get('_urlNodeMap')).length, 1, '../../test/unit/xxx.js# is the same dir with xxx.js, will not load again');
		recoverEnv();
	});
}
