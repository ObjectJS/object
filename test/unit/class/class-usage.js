module('class usage');

test('new class', function() {
	try {
		var A = new Class();
		ok(true, 'empty class is ok');
	} catch (e) {
		ok(false, 'empty class is ok');
	}
});

test('extend from non-class value', function() {
	var values = $UNIT_TEST_CONFIG.testEdges;
	for(var prop in values) {
		try {
			new Class(values[prop], function() {});
			ok(true, 'extend from ' + prop + ' should be considered');
		} catch (e) {
			ok(false, 'extend from ' + prop + ' should be considered : ' + e);
		}
		try {
			new Class(values[prop]);
			ok(true, 'extend from ' + prop + ', no constructor, should be considered');
		} catch (e) {
			ok(false, 'extend from ' + prop + ', no constructor, should be considered');
		}
	}
	try {
		var A = new Class(A, function() {});
		ok(true, 'extend from self should be considered');
	} catch (e) {
		ok(false, 'extend from self should be considered : ' + e);
	}
});

test('extend Array/String', function() {
	var A = new Class(Array, function() {});
	var a = new A();
	equal(a.length, 0, 'empty array sub class');
	ok(a.indexOf != undefined, 'Array methods inherited by A');
	equal(a.indexOf.call([1,2,3], 2), 1, 'indexOf in a is ok');
	ok(a.concat!= undefined, 'Array methods inherited by A');
	var B = new Class(String, function() {});
	var b = new B();
	equal(b.length, 0, 'empty string sub class');
	ok(b.trim != undefined, 'String methods inherited by B');
	if(b.trim != undefined) {
		equal(b.trim.call('  123   '), '123', 'trim method in b is ok');
	}
});

test('A complete Class', function() {
	var mixin = new Class(function() {
		this.mixined = function() { return 1; };
		this.same = function(self) {return 'mixined'};
	});
	var Parent = new Class(function() {
		this.extended = function() { return 1; };
		this.same = function(self) {return 'Parent'};
	});
	var metaclass = new Class(function() {
		this.initialize = function(cls, name, base, dict) {
			cls.metaclassed = function(self) {
				return 1;
			};
		};
		this.__new__ = function(cls, name, base, dict) {
			return type.__new__(cls, name, base, dict);
		};
	});
	var A = new Class(Parent, function() {
		this.__metaclass__ = metaclass;
		Class.mixin(this, mixin);
		this.initialize = function(self) {self._a = 1;};
		this.a = 1;
		this.b = function(self) { return 1; };
		this.c = staticmethod(function() { return 1; });
		this.d = classmethod(function(cls) { return 1; });
		this.e = property(function(self) { return self._a; }, function(self, v) {self._a = v;});
		this.same = function(self) {return 'A'};
	});
	A.set('f', 1);

	var a = new A();
	equal(a.a, 1, 'attribute is ok');
	equal(a.b(), 1, 'instancemethod is ok');
	equal(a.c(), 1, 'staticmethod is ok');
	equal(A.d(), 1, 'classmethod is ok');
	equal(a.get('e'), 1, 'property getter is ok');
	a.set('e', 2);
	equal(a.get('e'), 2, 'property setter is ok');
	equal(A.get('f'), 1, 'property set after Class construction is ok');
	equal(a.mixined(), 1, 'mixined method is ok');
	equal(a.extended(), 1, 'extended method is ok');
	equal(A.metaclassed(), 1, 'metaclassed method is ok');
	equal(a.same(), 'A', 'class member has the highest priority');
});

test('extend class', function() {
	var A = new Class(function() {
		this.a = function() {return 'a';}
	}); 
	A._name = 'A';
	var B = new Class(A, function() {
		this.b = function() {return 'b';}
	});
	B._name = 'B';

	b = new B();

	A.set({
		prop : {foo:1},
		method: function() {
			return 'method';
		},
		staticMethod : staticmethod(function() {
			return 'staticmethod';
		}),
		classMethod : classmethod(function(cls) {
			return cls._name;
		})
	});
	b.prop.bar = 2;

	equal(b.prop.foo, 1, 'property');
	equal(b.prop.bar, 2, 'property');
	equal(b.a(), 'a', 'method from parent');
	equal(b.b(), 'b', 'method from son');
	equal(b.method(), 'method', 'method is setted by A.method');
	equal(A.classMethod(), 'A', 'A.classMethod called successfully');
	try {
		B.classMethod();
		ok(true, 'class method should be inheritted from parent class');
	} catch (e) {
		ok(false, 'class method should be inheritted from parent class');
	}
	equal(A.staticMethod(), 'staticmethod', 'staticmethod called by A.staticMethod');
	try {
		B.staticMethod()
	   	ok(true, 'static method should be inheritted from parent class');
	} catch (e) {
	   ok(false, 'static method should be inheritted from parent class');
	}
});

test('do not overwrite exists member in subclass', function() {
	var A = new Class(function() {
		this.a = 1;
		this.b = property(function(self) {
			return 1;
		});
	});
	var B = new Class(A, function() {
		this.a = undefined;
		this.b = undefined;
	});
	var b = new B();
	ok('a' in b, 'a should be in b');
	equal(b.a, undefined, 'a in subclass is undefined, should not be overwrited');
	equal(b.b, undefined, 'b in subclass is undefined, should not be overwrited');
});

test('reference members in class - Array', function() {
	var array = [];
	var A = new Class(function() {
		this.add = function(self) {
			array.push(1);
		};
	});
	var B = new Class(A, function() {});
	var a = new A();
	var b = new B();
	a.add();
	b.add();
	equal(array.length, 2, 'method reference global object');

	var A = new Class(function() {
		this.a = [];
	});
	var B = new Class(A, function() {});
	var a = new A();
	var b = new B();
	a.a.push(1);
	equal(b.a.length, 0, 'a is array, when modified in parent class, member in subclass should not be modified');
	var b = new B();
	equal(b.a.length, 0, 'new an instance of B, it did not do anything, so array length should be 0');
	
	var A = new Class(function() {
		this.a = [];
	});
	var B = new Class(A, function() {});
	var b = new B();
	b.a.push(1);
	equal(b.a.length, 1, 'b.a.push(1), by instance of subclass, b.a.length should be 1');
	var a = new A();
	equal(a.a.length, 0, 'b.a.push(1), instance of A should not be influenced, a.a.length should be 0');
});

test('reference members in class - Object', function() {
	var A = new Class(function() {
		this.a = {};
	});
	var B = new Class(A, function() {});
	var a = new A();
	var b = new B();
	a.a.prop = 1;
	equal(b.a.prop, 1, 'a is object, when modified in parent class, member in subclass should not be modified');
	var b = new B();
	equal(b.a.prop, undefined, 'new an instance of B, it did not do anything, so b.a.prop should be 0');
	
	var A = new Class(function() {
		this.a = {};
	});
	var B = new Class(A, function() {});
	var b = new B();
	b.a.prop = 1;
	equal(b.a.prop, 1, 'b.a.prop = 1, by instance of subclass, b.a.prop should be 1');
	var a = new A();
	equal(a.a.prop, undefined, 'instance of A should not be modified, a.a.prop should be undefined');
});

test('closure in Class', function() {
	var Test = new Class(function() {
		a = {};
		this.initialize = function(self) {
			self.a = a;
		}
		this.add = function(self, name, value) {
			self.a[name] = value;    
		}
	});
	var t1 = new Test();
	t1.add('ok', 'ok');
	var t2 = new Test();
	t2.add('ok2', 'ok2');
	equal(t1.a.ok, 'ok', 't1 add ok, so t1.a.ok is ok');
	equal(t2.a.ok, undefined, 't2 did not add ok, so t2.a.ok should be undefined');
	equal(t1.a.ok2, undefined, 't1 did not add ok2, so t1.a.ok2 is should be undefined');
	equal(t2.a.ok2, 'ok2', 't2 add ok2, so t2.a.ok2 is ok2');
});

test('speed test', function() {
	return; // costs time, do this test seperately;
	var st = new Date().getTime();
	var proto = {};
	for (var i = 0; i < 10000; i++) {
		proto['m' + i] = classmethod(function(self){}.bind(i));
	}
	var MyClass = new Class(proto);
	var time = new Date().getTime() - st;
	ok(time < 100, 'total time(10000 times) is less than 100ms : ' + time + 'ms');
});
