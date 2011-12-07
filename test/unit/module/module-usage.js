module("module-usage");
test('modules in object._loader.lib', function() {
	expect(4);
	raises(function() {
		object.use('not_defined_module', function(exports){});
	}, 'use not defined module, should raise error');
	object.add('test_object_add', function(exports){});
	ok(object._loader.lib.sys != null, 'sys module exists after object.add is called');
	object.use('test_object_add', function(exports, test) {});
	ok(object._loader.lib.test_object_add != null, 'test_object_add module exists');
	ok(object._loader.lib.__anonymous_0__ != null, 'anonymous module exists');
	//equal(object._loader.lib.test_object_add.exports.__name__, 'test_object_add', 'module name test pass');
	//equal(object._loader.lib.__anonymous_0__.exports.__name__, '__main__', 'anonymous module name is __main__');
});

test('sys.modules - exists', function() {
	object.add('ttt.a', 'sys', function(exports, sys){
		ok(sys.modules != null, 'sys.modules exists');
		ok(sys.modules['sys'] != null, 'sys.modules[sys] exists');
		ok(sys.modules['ttt'] != null, 'sys.modules[ttt] exists');
	});
	object.add('ttt.b', function(exports) {});
	object.use('ttt.a, ttt.b, sys', function(exports, ttt, sys){
		ok(sys.modules != null, 'sys.modules exists');
		ok(sys.modules['ttt'] != null, 'sys.modules[ttt] exists');
		ok(sys.modules['ttt.a'] != null, 'sys.modules[ttt.a] exists');
		ok(sys.modules['ttt.b'] != null, 'sys.modules[ttt.b] exists');
	});
	object.remove('ttt', true);
});

test('sys.molules - submodule by execute', function() {
	object.add('test2.c', function() {});

	object.add('test2', './c', function(exports, c) {});

	object.add('test1.a.b.c', function(exports) {
		this.name = 'test1.a.b.c';
		equal(this.__name__, 'a.b.c');
	});
    
	object.add('test1.a', './b.c, sys', function(exports, b, sys) {
		this.name = 'test1.a';
		equal(this.__name__, 'a');
	});

	object.add('test1', './a, test2, test2, test2, test2, sys', function(exports, a, test2, sys) {
		this.name = 'test1';
		equal(this.__name__, '__main__');
		if(!sys) {
			ok(false, 'sys is undefined when use ./a, test2, test2, test2, test2, sys');
		} else {
			ok(sys.modules['a'] != null, 'test1.a is used by ./a, so a is in sys.modules');
			ok(sys.modules['a.b'] != null, 'a.b is in sys.modules');
			ok(sys.modules['a.b.c'] != null, 'a.b.c is in sys.modules');
			ok(sys.modules['test2'] != null, 'test2 is in sys.modules');
			ok(sys.modules['test2.c'] != null, 'test2.c is in sys.modules');
		}
	});

	object.execute('test1');
	object.remove('test1', true);
	object.remove('test2', true);
});

test('sys.molules - submodule by use', function() {
	object.add('test3.c', function() {});

	object.add('test3', './c', function(exports, c) {});

	object.add('test4.a.b.c', function(exports) {
		this.name = 'test4.a.b.c';
		equal(this.__name__, 'test4.a.b.c');
	});
    
	object.add('test4.a', './b.c, sys', function(exports, b, sys) {
		this.name = 'test4.a';
		equal(this.__name__, 'test4.a');
	});

	object.add('test4', './a, test3, test3, test3, test3, sys', function(exports, a, test3, sys) {
		equal(this.__name__, 'test4');
	});

	object.use('test4, sys', function(exports, test, sys) {
		ok(sys.modules['test4.a'] != null, 'test4.a is used by ./a, so a is in sys.modules');
		ok(sys.modules['test4.a.b'] != null, 'a.b is in sys.modules');
		ok(sys.modules['test4.a.b.c'] != null, 'a.b.c is in sys.modules');
		ok(sys.modules['test3'] != null, 'test3 is in sys.modules');
		ok(sys.modules['test3.c'] != null, 'test3.c is in sys.modules');
	});
	object.remove('test3', true);
	object.remove('test4', true);
});

test('simple use of module', function() {
	expect(4);
	object.add('module1', function(exports) {
		exports.a = 1;
		exports.method = function() {
			ok(true, 'method in module1 invoked');
		};
	});
	object.add('module2', 'module1', function(exports, module1) {
		equal(module1.a, 1, 'a in module1 is correct'); 
		module1.method();
		exports.a = 2;
		exports.method = function() {
			ok(true, 'method in module2 invoked');
		};
	});
	object.use('module2', function(exports, module2) {
		equal(module2.a, 2, 'a in module2 is correct');
		module2.method();
	});
	delete object._loader.lib['module1'];
	delete object._loader.lib['module2'];
});

test('return value of module', function() {
	expect(9);
	object.add('return_number', function(exports) {
		return 1;
	});
	object.use('return_number', function(exports, return_number) {
		ok(typeof return_number == 'number', 'number as return value');
		ok(return_number == 1, 'number as return value');
		ok(return_number.__name__ == null, 'number has no __name__ property');
	});
	object.add('return_object', function(exports) {
		return {value : 1};
	});
	object.use('return_object', function(exports, return_object) {
		ok(typeof return_object == 'object', 'object as return value');
		ok(return_object.value == 1, 'property in object is ok');
		ok(return_object.__name__ == 'return_object', 'object has __name__ property');
	});
	object.add('return_function', function(exports) {
		return function() {
			ok(true, 'returned function invoked');
		}
	});
	object.use('return_function', function(exports, return_function) {
		ok(typeof return_function == 'function', 'object as return value');
		return_function();
		ok(return_function.__name__ == 'return_function', 'object has __name__ property');
	});
});

test('relative module - use', function() {

	object.add('foo2.c', function() {});
	object.add('foo2', './c', function(exports, c) {
		equal(c.__name__, 'foo2.c', 'module name with same prefix.');
	});
	object.add('foo.a.b.c', function(exports) { });
	object.add('foo.a', './b.c, sys', function(exports, b, sys) {
		equal(b.__name__, 'foo.a.b', 'relative submodule name.');
		equal(b.c.__name__, 'foo.a.b.c', 'global context name.');
	});
	object.add('foo.b', function(exports) {
	});
	object.add('foo.c', function(exports) {
	});
	object.add('foo', './a, ./b, ./c, foo2, sys', function(exports, a, b, c, foo2, sys) {
		ok(a.__name__ == 'foo.a' && b.__name__ == 'foo.b' && c.__name__ == 'foo.c', 'arguments pass.');
	});
	object.use('foo', function() {
	});
	object._loader.remove('foo', true);
	object._loader.remove('foo2', true);

	object.add('foo.a.b.c', function(exports) {
	});
	object.add('foo.a', './b.c, sys', function(exports, b, sys) {
		equal(b.__name__, 'a.b', 'relative submodule name.');
		equal(b.c.__name__, 'a.b.c', 'ralative context module name.');
	});
	object.add('foo', './a', function(exports, a) {
	});

	object.execute('foo');
});

test('circular dependency', function() {
	expect(14);
	object.add('a', 'b', function(exports, b) {
		exports.a = 1;
	});
	object.add('b', 'a', function(exports, a) {
		equal(a.__name__, 'a', 'module a is ok in circular dependency');
		equal(a.a, undefined, 'a.a is undefined in b, not prepared yet');
		stop();
		setTimeout(function() {
			start();
			equal(a.a, 1, 'a.a is ok in b, after 100 ms');
		}, 100);
	});
	object.use('a', function(exports, a) {
		equal(a.__name__, 'a', 'module a is ok in circular dependency');
		equal(a.a, 1, 'a.a is ok in circular dependency');
	});
	delete object._loader.lib['a'];
	delete object._loader.lib['b'];

	object.add('c1', 'c2', function(exports, c2) {
		exports.c1 = 1;
	});
	object.add('c2', 'c3', function(exports, c3) {
		equal(c3.c3, 1, 'c3.c3 is prepared when use in c2');
		exports.c2 = 1;
	});
	object.add('c3', 'c2', function(exports, c2) {
		equal(c2.c2, undefined, 'c2.c2 is not prepared when use in c3');
		stop();
		setTimeout(function() {
			start();
			equal(c2.c2, 1, 'c2.c2 is prepared, after 100ms');
		}, 100);
		exports.c3 = 1;
	});
	object.use('c1, c2, c3', function(exports, c1, c2, c3) {
		equal(c1.c1, 1, 'c1.c1 is ok in circular dependency : c1 -> c2 -> c3 -> c2');
		equal(c2.c2, 1, 'c2.c2 is ok in circular dependency : c1 -> c2 -> c3 -> c2');
		equal(c3.c3, 1, 'c3.c3 is ok in circular dependency : c1 -> c2 -> c3 -> c2');
	});
	delete object._loader.lib['c1'];
	delete object._loader.lib['c2'];
	delete object._loader.lib['c3'];

	object.add('c', 'c', function(exports, c) {
		exports.c = 1;
	});
	object.use('c', function(exports, c) {
		equal(c.__name__, 'c', 'c.__name__ is ok in circular dependency : c -> c');
		equal(c.c, 1, 'c.c is ok when circular dependency : c -> c');
	});
	delete object._loader.lib['c'];

	object.add('uuua.ooos', function(exports) {});
	object.add('uuua', './ooos', function(exports) {});
	try {
		object.use('uuua', function(exports, uuua) {});
		ok(true, 'uuua use ./ooos will not cause an circular dependency error');
	} catch (e) {
		ok(false, 'uuua use ./ooos will cause an circular dependency error');
	}
	delete object._loader.lib['uuua.ooos'];
	delete object._loader.lib['uuua'];
});

test('string starts/ends with .', function() {
	object.add('used', function(exports) {});
	try {
		object.add('cause_error', '.used', function(exports) {});
		object.use('cause_error', function(exports, a) {});
	} catch (e) {
		ok(true, 'object.add(\'cause_error\', \'.used\') cause an error : ' + e);
	}
	delete object._loader.lib['cause_error'];
	try {
		object.add('cause_error', './used', function(exports) {});
		object.add('cause_error.used', function(exports) {});
		object.use('cause_error', function(exports, a) {});
		ok(true, 'start with ./ is ok in uses');
	} catch (e) {
		ok(true, 'object.add(\'cause_error\', \'.used\') cause an error : ' + e);
	}
	delete object._loader.lib['cause_error'];
	try {
		object.add('cause_error', 'used.', function(exports) {});
		object.use('cause_error', function(exports, a) {});
	} catch (e) {
		ok(true, 'object.add(\'cause_error\', \'used.\') cause an error : ' + e);
	}
	delete object._loader.lib['cause_error'];
	try {
		object.add('.cause_error', 'used', function(exports) {});
		object.use('.cause_error', function(exports, a) {});
		ok(object._loader.lib[''] == undefined, 'object._loader.lib[\'\'] should be undefined');
	} catch (e) {
		ok(true, 'add .cause_error causes error : ' + e); 
	}
	delete object._loader.lib['.cause_error'];
	delete object._loader.lib[''];

	try {
		object.add('.cause_error.', 'used', function(exports) {});
		object.use('.cause_error.', function(exports, a) {});
		ok(object._loader.lib[''] == undefined, 'object._loader.lib[\'\'] should be undefined');
		ok(object._loader.lib['.cause_error.'] == undefined,'object._loader.lib[\'.cause_error.\'] should be undefined');
	} catch (e) {
		ok(true, 'add .cause_error. causes error : ' + e);
	}
	delete object._loader.lib[''];
	delete object._loader.lib['.cause_error'];
	delete object._loader.lib['.cause_error.'];
});

test('parent module and sub module', function() {
	object.add('parent', function(exports) {
		exports.b = 1;
	});
	object.add('parent.sub', function(exports) {
		exports.b = 2;
	});
	object.use('parent.sub', function(exports, parent) {
		equal(parent.b, 1, 'parent module is loaded automatically');
		equal(parent.sub.b, 2, 'sub module is loaded successfully');
	});
	object.add('parent.sub2.sub3', function(exports) {
		exports.b = 3;
	});
	object.use('parent.sub2.sub3', function(exports, parent) {
		equal(parent.b, 1, 'parent module is loaded');
		ok(parent.sub2 != null, 'parent.sub2 is not null');
		ok(parent.sub2.fn === undefined && parent.sub2.file === undefined, 
			'parent.sub2 is not null, but it is an empty module');
		equal(parent.sub2.sub3.b, 3, 'parent.sub2.sub3 module is loaded');
	});
	delete object._loader.lib['parent.sub2.sub3'];
	delete object._loader.lib['parent.sub'];

	object.add('parent.sub.sub2.sub', function(exports) {
		exports.a = 1;
	});
	object.use('parent.sub.sub2.sub', function(exports, parent) {
		equal(parent.sub.sub2.sub.a, 1, 'parent.sub.sub2.sub.a = 1 is ok');
		equal(parent.sub.fn, undefined, 'parent.sub.fn is undefined');
		equal(parent.sub.sub2.fn, undefined, 'parent.sub.sub2.fn is undefined');
	});
	delete object._loader.lib['parent.sub.sub2.sub'];
	delete object._loader.lib['parent.sub.sub2'];
	delete object._loader.lib['parent.sub'];
});

