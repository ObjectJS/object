module("class basic");
test('modify global variable in constructor', function() {
	var counter = 0;
	var A = new Class(function() {
		counter = counter + 1;
	});
	ok(counter == 0, 'just define a new class A, global variable(counter) should not be modified');
});

test('modify global variable in initialize method', function() {
	var counter = 0;
	var A = new Class(function() {
		this.initialize = function(self) {
			counter ++;
		};
	});
	new A();
	equal(counter, 1, 'ok');
	new A();
	equal(counter, 2, 'ok');
});

test('getter/setter basic', function() {
	var A = new Class(function(){
		this.a = property(function(self){
			return self.a;
		}, function(self, a) {
			self.a = a;
		});
	});
	A.b = 2;

	var a = new A();
	ok(A.set != null, 'A.set is not null');
	ok(a.set != null, 'a.set is not null');
	ok(A.get != null, 'A.get is not null');
	ok(a.get != null, 'a.get is not null');

	equal(a.get('a'), undefined, 'self.get(a) is undefined');
	a.set('a', 1);
	equal(a.get('a'), 1, 'self.get(a) is 1 after set by a.set(a, 1)');
	a.set('a');
	equal(a.get('a'), undefined, 'self.get(a) is undefined after set by a.set(a)');
	try {
		a.set('b');
	} catch (e) {
	   ok(true, 'can not set a property value without property(getter, setter) in instance : ' + e);
	}

	equal(A.get('b'), 2, 'cls.get is ok, because A.b=2, so A.get(b) is 2');
	A.set('b', 4);
	equal(A.get('b'), 4, 'A.get(b) should be 4 after A.set(b, 4)');
});

test('set to null/0/""/undefined/NaN', function() {
	var A = new Class(function() {});
	A.set('a', null);
	equal(A.get('a'), null, 'set to null, get null');
	A.set('b', 0);
	equal(A.get('b'), 0, 'set to 0, get 0');
	A.set('c', "");
	equal(A.get('c'), "", 'set to "", get ""');
	A.set('c', undefined);
	equal(A.get('c'), undefined, 'set to undefined, get undefined');
	A.set('c', NaN);
	ok(isNaN(A.get('c')), 'set to NaN, get NaN');
});

//set special property: __mixins__/__metaclass__/__new__/__this__/__base__
test('set special property : __mixins__', function() {
	var mixin = new Class(function() {
		this.mixin_by_mixin = function() {
			return 1;
		}
	});
	var A = new Class(function(){
		Class.mixin(this, mixin);
	});

	var a = new A();

	A.set('__mixins__', 'mixin');
	equal(A.get('__mixins__'), 'mixin', '__mixins__ can be set as string???');

	try {
		var b = new A();
	} catch (e) {
		ok(false, 'new A() raises error after __mixins__ is setted to string : ' + e);
	}
});

test('set special property : __metaclass__', function() {
	var meta = new Class(function() {
		this.initialize = function(cls, name, base, dict) {};
		this.__new__ = function(cls, name, base, dict) {
			return type.__new__(cls, name, base, dict);
		};
	});
	var A = new Class(function(){
		this.__metaclass__ = meta;
	});

	A.set('__metaclass__', 'string');
	equal(A.get('__metaclass__'), 'string', '__metaclass__ is changed by set');

	try {
		var B = new Class(A, function() {});
		ok(true, 'B inherited from A is ok after __metaclass__ is setted to string');
	} catch (e) {
		ok(false, 'B inherited from A, raises error after __metaclass__ is setted to string : ' + e);
	}
});

test('set special property : __new__', function() {
	var A = new Class(function() {
		this.initialize = function(cls, name, base, dict) {};
		this.__new__ = function(cls, name, base, dict) {
			return type.__new__(cls, name, base, dict);
		};
	});
	A.set('__new__', 'string');

	equal(A.get('__new__'), 'string', '__new__ is changed by set');

	try {
		var B = new Class(function() {
			this.__metaclass__ = A;
		});
		ok(true, 'new A() is ok after __new__ is setted to string');
	} catch (e) {
		ok(false, 'new A() raises error after __new__ is setted to string : ' + e);
	}
});

test('set special property : __this__', function() {
	var A = new Class(function(){
		this.a = classmethod(function(cls) {
			return cls._name;
		});
	});

	var B = new Class(A, function() {
		this.a = classmethod(function(cls) {
			return this.parent();
		});
	});

	B.set('__this__', 'string');
	equal(B.get('__this__'), 'string', '__this__ is changed by set');

	B._name = 1;

	try {
		equal(B.a(), 1, 'ok');
	} catch (e) {
		ok(false, 'B.a() raises error after set __this__ to string : ' + e);
	}
});

test('set special property : __base__', function() {
	var A = new Class(function(){
		this.a = function(self) {
			return 1;
		}
	});
	var B = new Class(A, function(){
		this.a = function(self) {
			return this.parent();
		}
	});
	B.set('__base__', 'string');
	equal(B.get('__base__'), 'string', '__base__ is changed by set');

	var b = new B();
	try {
		equal(b.a(), 1, 'xxx.parent() is ok, after __base__ is setted to string');
	} catch (e) {
		ok(false, 'xxx.parent() raises error after __new__ is setted to string : ' + e);	
	}
});

test('set special property : @mixins', function() {
	var mixin = new Class(function() {
		this.mixin_by_mixin = function() {
			return 1;
		}
	});
	var A = new Class(function(){
		Class.mixin(this, mixin);
	});

	A.set('@mixins', 'mixin');
	equal(A.get('@mixins'), 'mixin', 'set @mixins, but only can get by __mixins__, not convenient');
	
	try {
		var b = new A();
		ok(true, 'new A() is ok after @mixins is setted to string');
	} catch (e) {
		ok(false, 'new A() raises error after @mixins is setted to string : ' + e);
	}

});

//set instancemethod/classmethod/staticmethod/property
//set, then check Class/Class.prototype/instance.prototype
//set is different in class and instance(cls.set/instance.set/cls.get/instance.get);

test('instancemethod', function() {
	ok(typeof instancemethod == 'undefined', 'instancemethod is not public');
});

test('classmethod', function() {
});

test('staticmethod', function() {
});

test('property', function() {
});

test('extend Array/String', function() {
});
