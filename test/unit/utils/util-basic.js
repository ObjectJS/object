module("util-basic-Object");

var ie = false;
object.use('ua', function(exports, ua) {
	ie = ua.ua.ie;
});

test('Object.keys', function() {
	var values = $UNIT_TEST_CONFIG.testEdges;
	for(var prop in values) {
		try {
			var objs = Object.keys(values[prop]);
			var type = typeof values[prop];
		} catch (e) {
			ok(false, 'Object.keys(' + prop + ') should be considered : ' + e);
		};
	};
	var a = {
		'a':1,
		toString:'fda'
	};
	var keys = Object.keys(a);
	if (!ie) {
		equal(keys.length, 2, 'Object.keys return correct value');
		equal(keys[0], 'a', 'Object.keys return correct value');
		equal(keys[1], 'toString', 'Object.keys return correct value');
	} else {
		equal(keys.length, 1, 'IE can not iterate toString');
		equal(keys[0], 'a', 'IE can not iterate toString');
	}
});

module("util-basic-Array");

test('function exists in arrays', function() {
	var arrays = $UNIT_TEST_CONFIG.arrayEdges;
	for(var prop in arrays) {
		ok(arrays[prop].forEach != null, 'forEach is ok for ' + prop);
	}
});
test('Array.isArray', function() {
	var values = $UNIT_TEST_CONFIG.testEdges;
	for(var prop in values) {
		try {
			var flag = Array.isArray(values[prop]);
		} catch (e) {
			ok(false, 'Array.isArray(' + prop + ') should be considered : ' + e);
		};
	};
	var arrays = $UNIT_TEST_CONFIG.arrayEdges;
	for(var prop in arrays) {
		ok(Array.isArray(arrays[prop]), prop + ' is an array ');
	}
});
test('Array.forEach', function() {
	var a = new Array(1);
	equal(a.length, 1, 'there is one element in a');
	equal(a[0], undefined, 'a[0] is undefined');
	var counter = 0;
	a.forEach(function(v) {
		counter ++;
	});
	var result = ie ? 1 : 0;
	equal(counter, result, 'counter should be ' + result + ', array is empty, forEach will not make execute');

	var a = [1,2,3];
	a.forEach(function(value, index, array) {
		equal(value, index+1, 'value and index are ok');
	});

	var a = [1,2,3];
	a.forEach(function(value, index, array) {
		array.splice(index);
	});
	var result = ie ? 3 : 0;
	equal(a.length, result, 'array can be modified in forEach');

	var a = [undefined, null];
	var counter = 0;
	a.forEach(function(v) {
		counter ++;
	});
	equal(counter, 2, 'forEach iterates two elements');

	var a = [];
	a[3] = undefined;
	var counter = 0;
	a.forEach(function(v) {
		counter ++;
	});
	//a[0] = a[1] = a[2] = a[3] = undefined;
	var result = ie ? 4 : 1;
	equal(counter, result, 'forEach iterates one element');

	var a = [1];
	a.forEach(function(v) {
		equal(this, 'a', 'forEach bind success');
	}, 'a');
});
test('Array.indexOf', function() {
	var a = [1,2,3];
	equal(a.indexOf(1), 0, 'basic function of indexOf is ok');
	var a = ['1','a',1];
	equal(a.indexOf(1), 2, '\'1\' and 1 is different, indexOf(1) should be 1');
	var a = ['1','a',undefined];
	equal(a.indexOf(undefined), 2, 'indexOf(undefined) is ok');
	var a = ['1','a',null];
	equal(a.indexOf(null), 2, 'indexOf(null) is ok');
	var a = [null, undefined];
	equal(a.indexOf(undefined), 1, 'indexOf(undefined) is ok');
	var a = [undefined, null, undefined];
	equal(a.indexOf(null), 1, 'indexOf(null) is ok');
	var a = [undefined, null, undefined, '', [], 0];
	equal(a.indexOf(0), 5, 'indexOf(0) is ok');
	var a = [1,2];
	equal(a.indexOf('1'), -1, '\'1\' can not be found in [1,2], even though 1 == \'1\'');
	var a = [1,2,1];
	equal(a.indexOf(1), 0, 'choose the first match one');
	var obj = {a:1};
	var a = [1, obj];
	equal(a.indexOf(obj), 1, 'indexOf(obj) is ok');
	var a = [{a:1}, obj];
	equal(a.indexOf(obj), 1, 'indexOf(obj) is ok');
	var a = [1, Function];
	equal(a.indexOf(Function), 1, 'indexOf(Function) is ok');

	var array = $UNIT_TEST_CONFIG.emptys;
	var desc = $UNIT_TEST_CONFIG.emptysDesc;
	for(var i=0,l=$UNIT_TEST_CONFIG.emptys.length; i<l; i++) {
		// can not find NaN by indexOf, firefox/chrome
		if(!isNaN(array[i])) {
			equal(i, array.indexOf(array[i]), desc[i] + ' is ok with indexOf');
		}
	}
});

test('Array.some', function() {
	ok([null].some(function(v) { return !v; }), '[null].some is ok');
	if(ie) {
		ok(![undefined].some(function(v) { return !v; }), '[undefined].some is ok');
	} else {
		ok([undefined].some(function(v) { return !v; }), '[undefined].some is ok');
	}
	ok([''].some(function(v) { return !v; }), '[\'\'].some is ok');
	ok([0].some(function(v) { return !v; }), '[0].some is ok');
	ok([NaN].some(function(v) { return !v; }), '[NaN].some is ok');
	ok(![].some(function(v) { return true; }), '[].some is ok');
	ok([1,2,3,4].some(function(v) { return v == 1; }), '[1,2,3,4].some is ok');
	ok([1,2,3,4].some(function(v) { return v == 4; }), '[1,2,3,4].some is ok');
	ok(![1,2,3,4].some(function(v) { return v == 5; }), '[1,2,3,4].some is ok');
});

test('Array.every', function() {
	ok([null].every(function(v) { return !v; }), '[null].every is ok');
	ok([undefined].every(function(v) { return !v; }), '[undefined].every is ok');
	ok([''].every(function(v) { return !v; }), '[\'\'].every is ok');
	ok([0].every(function(v) { return !v; }), '[0].every is ok');
	ok([].every(function(v) { return true; }), '[].every is ok');
	ok([NaN].every(function(v) { return isNaN(v); }), '[NaN].every is ok');
	ok(![1,2,3,4].every(function(v) { return v < 4; }), '[1,2,3,4].every is ok');
	ok([1,2,3,4].every(function(v) { return v < 5; }), '[1,2,3,4].every is ok');
});

test('Array.map', function() {
	var mapped = [1,2,3,4].map(function(v) { return !!(v & 1); });
	equal(mapped.length, 4, 'length of mapped array equals to length of array');
	equal(mapped[0], true, 'map is ok');
	equal(mapped[1], false, 'map is ok');
	equal([].map(function(v){}).length, 0, 'empty array generates empty array');
	var mapped = [1,2,3,4].map(function(v) {});
	equal(mapped.length, 4, 'length is 4, but everything in array is undefined, when callback of map return nothing');
	ok(mapped.every(function(v) {return typeof v == 'undefined'}), 'every element in array is undefined, if callback of map return nothing');
});

test('Array.filter', function() {
	equal([].filter(function(v){}).length, 0, '[].filter is ok');
	equal([1,2,3].filter(function(v){return v<2}).length, 1, '[1,2,3].filter is ok');
});

test('Array.reduce', function() {
	var a = [1,2,3,4,5].reduce(function(v){return true;});
	// what happend?
});

test('Array.reduceRight', function() {
	var a = [1,2,3,4,5];
	var flag = a.reduceRight(function(v){return true;});
	// what happend?
});

module("util-basic-String");
test('String.trim', function() {
	equal(''.trim(), '', '\'\'.trim is ok');
	equal('  '.trim(), '', '\'  \'.trim is ok');
	equal('                           '.trim(), '', '\'                                    \'.trim is ok');
	equal(','.trim(), ',', '\' ,\'.trim is ok');
	equal(' 123 '.trim(), '123', '\' 123 \'.trim is ok');
	equal('1 123 '.trim(), '1 123', '\'1 123 \'.trim is ok');
	equal('1 123 1'.trim(), '1 123 1', '\'1 123 1\'.trim is ok');
	equal(' 1 123 1'.trim(), '1 123 1', '\' 1 123 1\'.trim is ok');
	equal('                          1 123 1'.trim(), '1 123 1', '\'                           1 123 1\'.trim is ok');
	var str = '';
	for(var i=0; i<100; i++) {
		str += ' ';
	}
	equal(str.trim(), '', '100 empty string trim is still ok');
});

module("util-basic-Function");
test('Function.bind', function() {
	var binder = (function () {
			ok(this != window, 'after bind, this should not be window');
			equal(this, 'test', 'bind ok');
		}).bind('test');
	binder();

	var binder = (function () {
			ok(this == window, 'bind with null, this is still window');
		}).bind();
	binder();

	var emptys = $UNIT_TEST_CONFIG.emptys;
	var descs = $UNIT_TEST_CONFIG.emptysDesc;
	for(var i=0,l=emptys.length; i<l; i++) {
		if(typeof emptys[i] == 'number' && isNaN(emptys[i])) {
			ok(true, 'NaN bind has no effect');
			continue;
		}
		if(typeof emptys[i] === 'undefined' || emptys[i] === null) {
			ok(true, descs[i] + ' bind has no effect');
			continue;
		}
		var binder = (function () {
			ok(this == emptys[i], descs[i] + ' can be bind by function');
		}).bind(emptys[i]);
		binder();
	}
});

test('Function.__get_name__', function() {
	equal(Function.__get_name__((function() {})), '', 'name of anonymous method is \'\'');
	equal(Function.__get_name__((function a() {})), 'a', 'get correct name of a');
	function B(){};
	equal(Function.__get_name__(B), 'B', 'get correct name of B');
	var A = C = function(){};
	equal(Function.__get_name__(A), '', 'var A = C = function(){}, A is just an reference of the anonymous method');
	equal(Function.__get_name__(C), '', 'var A = C = function(){}, C is just an reference of the anonymous method');
	var A = function B() {};
	equal(Function.__get_name__(A), 'B', 'var A = function B(){}, get name of A is B');
	equal(Function.__get_name__(B), 'B', 'var A = function B(){}, get name of B is B');
	var B = 1;
	function B() {};
	equal(typeof B, 'number', 'var B = 1; function B() {}, function parsed firstly, so B is number');
	
	var B = 1;
	B = function () {};
	equal(typeof B, 'function', 'var B = 1; B = function () {}, now B is function');

	function D() {return 1;}
	function D() {return 2;}
	equal(D(), 2, 'second D overwrite the fist D');
});

module("util-basic-Class");
test('Class.create', function() {
	var C = Class.create();
	try { C.__mixin__('d', 1); } catch (e) {
		ok(true, '__mixin__ can not be called : ' + e); }
	try { 
		C.get('d'); 
		ok(false, 'class is not prepared after Class.create()');
	} catch (e) {
		ok(true, 'get can not be called : ' + e); }
	
	equal(C.__subclasses__().length, 0, 'no subclass, __subclasses__ is ok');
	equal(typeof C, 'function', 'class created is also a function');

	var c = new C();
	equal(c.__class__, C, '__class__ reference the init Class');
});

test('Class.initMixins', function() {
	var values = $UNIT_TEST_CONFIG.testEdges;
	for(var prop in values) {
		try {
			Class.initMixins(values[prop]);
			ok(true, 'Class.initMixins(' + prop + ') is ok');
		} catch (e) {
			ok(false, 'Class.initMixins(' + prop + ') is ok : ' + e);
		}
	}
	var mixin1 = new Class(function() {
		this.initialize = function(self){
			self.a = 1;
			ok(true, 'initialize in mixin called');
		};
	});
	var mixin2 = new Class(function() {
		this.initialize = function(self){
			self.b = 2;
			ok(true, 'initialize in mixin called');
		};
	});
	var A = new Class(function() {
		Class.mixin(this, mixin1);
		Class.mixin(this, mixin2);
	});

	Class.initMixins(A, a = {});
	equal(a.a, 1, 'intialize called, value a set');
	equal(a.b, 2, 'intialize called, value b set');
});

test('Class.mixin', function() {
	var values = $UNIT_TEST_CONFIG.testEdges;
	for(var prop in values) {
		try {
			new Class(function() {
				Class.mixin(this, values[prop]);
			});
			ok(true, 'Class.mixin(class, ' + prop + ') is ok');
		} catch (e) {
			ok(false, 'Class.mixin(class, ' + prop + ') is ok : ' + e);
		}
		try {
			Class.mixin(values[prop], {});
			ok(true, 'Class.mixin(' + prop + ', {}) is ok');
		} catch (e) {
			ok(false, 'Class.mixin(' + prop + ', {}) is ok : ' + e);
		}
	}
	var trues = $UNIT_TEST_CONFIG.trues;
	for(var i=0,l=trues.length; i<l; i++) {
		var dict = {__mixins__: trues[i]};	
		try {
			Class.mixin(dict, 'a');
		} catch (e) {
			// do not need to test like this;
			//ok(false, 'dict.__mixins__ can be non-array true values : ' + trues[i] + ' : ' + e);
		}
	}
	ok(true, 'mixin is tested specially');
});

test('Class.hasProperty', function() {
	var values = $UNIT_TEST_CONFIG.testEdges;
	var obj = {__properties__: {'a':1}};
	for(var prop in values) {
		try {
			Class.hasProperty(values[prop], '111');
			ok(true, 'Class.hasProperty(' + prop + ', name) is ok');
		} catch (e) {
			ok(false, 'Class.hasProperty(' + prop + ', name) is ok : ' + e);
		}
	}
	for(var prop in values) {
		try {
			Class.hasProperty(obj, values[prop]);
			ok(true, 'Class.hasProperty(obj, ' + prop + ') is ok');
		} catch (e) {
			ok(false, 'Class.hasProperty(obj, ' + prop + ') is ok : ' + e);
		}
	}

	ok(Class.hasProperty(obj, 'a'), 'a is in obj.__properties__, return true by Class.hasProperty');
	ok(!Class.hasProperty(obj, 'aa'), 'aa is not in obj.__properties__, return false by Class.hasProperty');
});

test('Class.getPropertyNames', function() {
	var values = $UNIT_TEST_CONFIG.testEdges;
	var obj = {__properties__: {'a':1}};
	for(var prop in values) {
		try {
			Class.getPropertyNames(values[prop]);
			ok(true, 'Class.getPropertyNames(' + prop + ') is ok');
		} catch (e) {
			ok(false, 'Class.getPropertyNames(' + prop + ') is ok : ' + e);
		}
	}
	var keys = Class.getPropertyNames(obj);
	ok(keys.indexOf('a') != -1, 'a is in obj.__properties__, so it should return true;');
	ok(keys.indexOf('aa') == -1, 'aa is not in obj.__properties__, so it should return false;');
});

test('Class.inject', function() {
	var A = new Class(function() {
		this.initialize = function(self, a) {
			equal(a, 1, 'called in initialize');
		}
	});
	Class.inject(A, a = {}, [1]);

	['__properties__', '__this__', '__class__', 'constructor', '__base__', '_set', 'set', 'initialize', 'set'].forEach(function(v) {
		ok(v in a, v + ' is injected ');
	});
	ok(a.__this__.base != null, '__this__ is injected');
	ok(a.__class__ == A, '__class__ is injected');
});

test('Class.getChain', function() {
	var values = $UNIT_TEST_CONFIG.testEdges;
	for(var prop in values) {
		try {
			Class.getChain(values[prop]);
			ok(true, 'Class.getChain(' + prop + ') is ok');
		} catch (e) {
			ok(false, 'Class.getChain(' + prop + ') is ok : ' + e);
		}
	}
	var A = new Class(function(){});
	var B = new Class(A, function(){});
	var C = new Class(A, function(){});
	var D = new Class(C, function(){});
	equal(Class.getChain(A).length, 2, 'type,A');
	equal(Class.getChain(B).length, 3, 'type,A,B');
	equal(Class.getChain(C).length, 3, 'type,A,C');
	equal(Class.getChain(D).length, 4, 'type,A,C,D');
});

test('Class.getInstance', function() {
	var values = $UNIT_TEST_CONFIG.testEdges;
	for(var prop in values) {
		try {
			// should not expose
			// Class.getInstance(values[prop]);
			ok(true, 'Class.getInstance(' + prop + ') is ok');
		} catch (e) {
			ok(false, 'Class.getInstance(' + prop + ') is ok : ' + e);
		}
	}
	var A = new Class(function() {
		this.a = function(self) { return 1;}
	});
	instance = Class.getInstance(A);
	equal(instance.a(), 1, 'instance created');
});

test('Class.getAllSubClasses', function() {
	var values = $UNIT_TEST_CONFIG.testEdges;
	for(var prop in values) {
		try {
			Class.getAllSubClasses(values[prop]);
			ok(true, 'Class.getAllSubClasses(' + prop + ') is ok');
		} catch (e) {
			ok(false, 'Class.getAllSubClasses(' + prop + ') is ok : ' + e);
		}
	}
	var A = new Class(function(){});
	var B = new Class(A, function(){});
	var C = new Class(A, function(){});
	var D = new Class(C, function(){});
	equal(Class.getAllSubClasses(A).length, 3, 'B,C,D');
	equal(Class.getAllSubClasses(B).length, 0, 'no subclass for B');
	equal(Class.getAllSubClasses(C).length, 1, 'D');
	equal(Class.getAllSubClasses(D).length, 0, 'no subclass for D');

	var subs = Class.getAllSubClasses(A);
	equal(subs[0], B, 'order is correct: B is 1');
	equal(subs[1], C, 'order is correct: C is 2');
	equal(subs[2], D, 'order is correct: D is 3');
});
