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
	expect(2);
	raises(function() {
		object.add('a', 'b', function(exports, b) {});
		object.add('b', 'a', function(exports, a) {});
		object.use('a', function(exports, a) {});
	}, 'should throw circular dependency error');
	raises(function() {
		object.add('c', 'c', function(exports, c) {});
		object.use('c', function(exports, c) {});
	}, 'should throw circular dependency error');
});
test('common usage', function() {
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
});
