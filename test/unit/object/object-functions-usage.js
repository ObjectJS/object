module("object-functions-usage");

test('extend', function() {
	var obj = {value:1, obj:{value:1}};
	var extended = object.extend({}, obj);
	var extended2 = object.extend({}, obj);
	equal(extended.value, 1, 'simple value is ok');
	extended.value = 2;
	equal(extended2.value, 1, 'simple value should not be modified');

	extended.obj.value = 2;
	equal(obj.obj.value, 2, 'is modified by extended obj(need deep clone)');
	equal(extended2.obj.value, 2, 'is modified by other extended objs(need deep clone)');
});

test('clone', function() {
	var obj = {value:1, obj:{value:1}};
	var extended = object.clone(obj);
	var extended2 = object.extend(obj);
	equal(extended.value, 1, 'simple value is ok');
	extended.value = 2;
	equal(extended2.value, 1, 'simple value should not be modified');

	extended.obj.value = 2;
	equal(obj.obj.value, 2, 'is modified by extended obj(need deep clone)');
	equal(extended2.obj.value, 2, 'is modified by other extended objs(need deep clone)');
});

test('bind', function() {
	var binder = {};
	object.bind(binder);
	ok(binder.clone != undefined, 'bind ok');
	equal(binder.clone, object.clone, 'is almost the same as object');
});

test('add and use, basic', function() {
	object.add('1', function(exports){
		equal(exports, this, 'exports is equals to this, in module');
		this.a = 1;
	});
	ok(object._loader.lib['1'] != null, 'module is added');
	object.use('1', function(exports, a) {
		equal(exports, this, 'exports is equals to this, in module');
		equal(a.a, 1, 'module add and use successfully');
	});
	try {
		object.add('sys', function(exports) {});
		ok(true, 'object.add(sys) is ok, though nothing happened');
	} catch (e) {}

	try {
		object.add('1', function(exports){});
		ok(true, 'object.add(1) again is ok, though nothing happened');
	} catch (e) {}

	try {
		object.use('not_exists_a.b.c', function(exports, a){});
		ok(false, 'un-exists module not_exists_a.b.c, will cause error');
	} catch (e) {
		ok(true, 'un-exists module not_exists_a.b.c, will cause error : ' + e);
	};
	object.remove('1');
	object.remove('not_exists_', true);
});

test('add and use, with seperator', function() {
	object.add('test.a.b.c.d', function(exports) {
		exports.a = 1;
		exports.value = 2;
	});
	object.use('test.a.b.c.d', function(exports, test) {
		equal(test.a.b.c.d.a, 1, 'test.a.b.c.d.a = 1, it is ok');
	});
	object.add('test.a.b', function(exports) {
		exports.c = 1;
		exports.value = 1;
	});
	object.use('test.a.b.c.d, sys', function(exports, test, sys) {
		equal(test.a.b.c, 1, 'c set in test.a.b is overwrited by module test.a.b.c.d');
		equal(test.a.b.value, 1, 'test.a.b.value is not overwrited');
		equal(test.a.b.c.d.value, 2, 'test.a.b.c.d.value is ok');
	});
});

test('add and use, same name module', function() {
	object.add('test', function(exports) {
		exports.a = 1;
	});
	object.add('test', function(exports) {
		exports.a = 2;
	});
	object.use('test', function(exports, test) {
		equal(test.a, 1, 'when module name is the same, only use the first added module');
	});
});

test('auto-import parent package', function() {
	object.add('XN', function(exports) {
		exports.a = 1;
	});
	object.add('XN.env', function(exports) {
		exports.domain = 1;
	});
	object.add('XN.env.inner', function(exports) {
		exports.value = 1;
	});
	object.use('XN.env.inner', function(exports, XN) {
		equal(XN.a, 1, 'XN is imported automatically');
		equal(XN.env.domain, 1, 'XN.env is imported automatically');
		equal(XN.env.inner.value, 1, 'XN.env.inner is imported');
	});
});

test('many uses', function() {
	object.add('many_a', function(exports) {exports.a = 1});
	object.add('many_b', function(exports) {exports.a = 1});
	object.add('many_c', function(exports) {exports.a = 1});
	object.add('many_d', function(exports) {exports.a = 1});
	object.add('many_d.s', function(exports) {exports.a = 1});
	object.use('many_a,many_b,many_c,many_d.s', function(exports, a, b, c, d){
		equal(a.a, 1, 'a is imported');
		equal(b.a, 1, 'b is imported');
		equal(c.a, 1, 'c is imported');
		equal(d.a, 1, 'd is imported');
		equal(d.s.a, 1, 'd.s is imported');
	});
});

test('execute', function() {
	expect(2);
	raises(function() {
		object.execute('notexists', function(exports){});
	}, 'execute an un-exists module, which will cause an error');
	object.add('test_execute', function(exports){
		exports.a = 1;
		ok(true, 'module test executed');
	});
	object.execute('test_execute');
});

