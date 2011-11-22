module("module");
test('modules in object._loader.lib', function() {
	expect(6);
	raises(function() {
		object.use('not_defined_module', function(exports){});
	}, 'use not defined module, should raise error');
	object.add('test_object_add', function(exports){});
	ok(object._loader.lib.sys != null, 'sys module exists after object.add is called');
	object.use('test_object_add', function(exports, test) {});
	ok(object._loader.lib.test_object_add != null, 'test_object_add module exists');
	ok(object._loader.lib.__anonymous_0__ != null, 'anonymous module exists');
	equal(object._loader.lib.test_object_add.name, 'test_object_add', 'module name test pass');
	ok(object._loader.lib.__anonymous_0__.name == '__anonymous_0__', 'anonymous module name pass');
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

test('circular dependency', function() {
	expect(4);
	raises(function() {
		object.add('a', 'b', function(exports, b) {});
		object.add('b', 'a', function(exports, a) {});
		object.use('a', function(exports, a) {});
	}, 'a->b->a should throw circular dependency error');
	delete object._loader.lib['a'];
	delete object._loader.lib['b'];

	raises(function() {
		object.add('c1', 'c2', function(exports, b) {});
		object.add('c2', 'c3', function(exports, a) {});
		object.add('c3', 'c2', function(exports, a) {});
		object.use('c1', function(exports, a) {});
	}, 'c1->c2->c3->c2 should throw circular dependency error');
	delete object._loader.lib['c1'];
	delete object._loader.lib['c2'];
	delete object._loader.lib['c3'];

	raises(function() {
		object.add('c', 'c', function(exports, c) {});
		object.use('c', function(exports, c) {});
	}, 'c->c should throw circular dependency error');
	delete object._loader.lib['c'];

	object.add('uuua.ooos', function(exports) {});
	object.add('uuua', 'uuua.ooos', function(exports) {});
	try {
		object.use('uuua', function(exports, uuua) {});
	} catch (e) {
		ok(false, 'uuua use uuua.ooos will cause an circular dependency error');
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
		ok(false, 'object.add(\'cause_error\', \'.used\') cause an error');
		delete object._loader.lib['cause_error'];
	}
	try {
		object.add('cause_error', 'used.', function(exports) {});
		object.use('cause_error', function(exports, a) {});
	} catch (e) {
		ok(false, 'object.add(\'cause_error\', \'used.\') cause an error');
		delete object._loader.lib['cause_error'];
	}
	object.add('.cause_error', 'used', function(exports) {});
	object.use('.cause_error', function(exports, a) {});
	ok(object._loader.lib[''] == undefined, 'object._loader.lib[\'\'] should be undefined');
	delete object._loader.lib['.cause_error'];
	delete object._loader.lib[''];

	object.add('.cause_error.', 'used', function(exports) {});
	object.use('.cause_error.', function(exports, a) {});
	ok(object._loader.lib[''] == undefined, 'object._loader.lib[\'\'] should be undefined');
	ok(object._loader.lib['.cause_error.'] == undefined,'object._loader.lib[\'.cause_error.\'] should be undefined');
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

