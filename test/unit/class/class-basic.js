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
//set B extended from A, whether A.set will cause changes of B?
test('overwrite class members, by set', function() {
	var A = new Class(function(){
		this.a = 1;
		this.a1 = 1;
		this.a2 = 1;
		this.a3 = 1;
		this.a4 = 1;
		this.b = function(self) { return 1; };
		this.b1 = function(self) { return 1; };
		this.b2 = function(self) { return 1; };
		this.b3 = function(self) { return 1; };
		this.b4 = function(self) { return 1; };
		this.c = staticmethod(function() { return 1; });
		this.c1 = staticmethod(function() { return 1; });
		this.c2 = staticmethod(function() { return 1; });
		this.c3 = staticmethod(function() { return 1; });
		this.c4 = staticmethod(function() { return 1; });
		this.d = classmethod(function(cls) { return 1; });
		this.d1 = classmethod(function(cls) { return 1; });
		this.d2 = classmethod(function(cls) { return 1; });
		this.d3 = classmethod(function(cls) { return 1; });
		this.d4 = classmethod(function(cls) { return 1; });
		this.e = property(function(self) { return 1; });
		this.e1 = property(function(self) { return 1; });
		this.e2 = property(function(self) { return 1; });
		this.e3 = property(function(self) { return 1; });
		this.e4 = property(function(self) { return 1; });
	});
	var a = new A();

	equal(a.get('e'), 1, 'property e is ok before overwrite, after overwrite, it will be deleted');
	//if member is not a property, then it can not be overwrited by non-property member, especially in inheritance;
	A.set('a', 2);
	A.set('a1', function() { return 2});
	A.set('a2', staticmethod(function() { return 2}));
	A.set('a3', classmethod (function(cls) { return 2}));
	A.set('a4', property    (function(self) { return 2}));
	A.set('b', 2);
	A.set('b1', function() { return 2});
	A.set('b2', staticmethod(function() { return 2}));
	A.set('b3', classmethod (function(cls) { return 2}));
	A.set('b4', property    (function(self) { return 2}));
	A.set('c', 2);
	A.set('c1', function() { return 2});
	A.set('c2', staticmethod(function() { return 2}));
	A.set('c3', classmethod (function(cls) { return 2}));
	A.set('c4', property    (function(self) { return 2}));
	A.set('d', 2);
	A.set('d1', function() { return 2});
	A.set('d2', staticmethod(function() { return 2}));
	A.set('d3', classmethod (function(cls) { return 2}));
	A.set('d4', property    (function(self) { return 2}));
	A.set('e', 2);
	A.set('e1', function() { return 2});
	A.set('e2', staticmethod(function() { return 2}));
	A.set('e3', classmethod (function(cls) { return 2}));
	A.set('e4', property    (function(self) { return 2}));
	var a = new A();
	equal(a.a, 2, 'overwrite, from attribute to attribute');
	equal(a.b, 2, 'overwrite, from instancemethod to attribute');
	equal(a.c, 2, 'overwrite, from staticmethod to attribute');
	equal(a.d, 2, 'overwrite, from classmethod to attribute');
	equal(a.e, 2, 'overwrite, from property to attribute');
	equal(a.a1(), 2, 'overwrite, from attribute to instancemethod');
	equal(a.b1(), 2, 'overwrite, from instancemethod to instancemethod');
	equal(a.c1(), 2, 'overwrite, from staticmethod to instancemethod');
	try {
		equal(A.d1(), 2, 'overwrite, from classmethod to instancemethod');
	} catch (e) {
		ok(false, 'overwrite from classmethod to instancemethod, changed the behavior of d1');
	}
	equal(a.e1(), 2, 'overwrite, from property to instancemethod');
	equal(a.a2(), 2, 'overwrite, from attribute to staticmethod');
	equal(a.b2(), 2, 'overwrite, from instancemethod to staticmethod');
	equal(a.c2(), 2, 'overwrite, from staticmethod to staticmethod');
	equal(A.d2(), 2, 'overwrite, from classmethod to staticmethod');
	equal(a.e2(), 2, 'overwrite, from property to staticmethod');
	try {
		equal(a.a3(), 2, 'overwrite, from attribute to classmethod');
	} catch (e) {
		ok(false, 'overwrite from attribute to classmethod, changed the behavior of a3');
	}
	try {
		equal(a.b3(), 2, 'overwrite, from instancemethod to classmethod');
	} catch (e) {
		ok(false, 'overwrite from instancemethod to classmethod, changed the behavior of b3');
	}
	try {
		equal(a.c3(), 2, 'overwrite, from staticmethod to classmethod');
	} catch (e) {
		ok(false, 'overwrite from staticmethod to classmethod, changed the behavior of c3');
	}
	equal(A.d3(), 2, 'overwrite, from classmethod to classmethod');
	try {
		equal(a.e3(), 2, 'overwrite, from property to classmethod');
	} catch (e) {
		ok(false, 'overwrite from property to classmethod, changed the behavior of e3');
	}
	equal(a.a4, 2, 'overwrite, from attribute to property');
	try {
		equal(a.b4(), 2, 'overwrite, from instancemethod to property');
	} catch (e) {
		ok(false, 'overwrite from instancemethod to property, changed the behavior of b4');
	}
	try {
		equal(a.c4(), 2, 'overwrite, from staticmethod to property');
	} catch (e) {
		ok(false, 'overwrite from staticmethod to property, changed the behavior of c4');
	}
	try {
		equal(A.d4(), 2, 'overwrite, from classmethod to property');
	} catch (e) {
		ok(false, 'overwrite from classmethod to property, changed the behavior of d4');
	}	
	
	equal(a.get('e4'), 2, 'overwrite, from property to property');
});

test('set after class instance is created', function() {
	var A = new Class(function() {
		this.a = 1;
		this.b = function(self){return 1;};
		this.c = staticmethod(function(){return 1;});
		this.d = classmethod(function(cls){return 1;});
		this.e = property(function(self){return 1;});
	});
	var a = new A();
	equal(a.get('e'), 1, 'e is an property, get(e) ok');
	A.set('e', 1);
	try {
		equal(a.get('e'), 1, 'e is an property, get(e) ok');
	} catch (e) {
		ok(false, 'A.set changed the behavior of a.get(e), even after instance is created');
	}
});

test('set after extended by many classes', function() {
	var A = new Class(function() {
		this.e = property(function(self){return 1;});
	});
	//in one place
	A.set('e', 1);
	var B = new Class(A, function() {});

	//in another place
	var C = new Class(A, function() {});
	var c = new C();
	try {
		equal(c.get('e'), 1, 'c.get(e) is ok after A.set(e, 1)');
	} catch (e) {
		ok(false, 'A.set(e) changed the behavior of C');
	}
});

test('instancemethod', function() {
	ok(typeof instancemethod == 'undefined', 'instancemethod is not public');
	var A = new Class(function() {
		this.a = function(self) {
			ok(self != this, 'self != this in instancemethod, self is the instance, this is an simple Object{base, parent}');
			try {
				this.parent();
			} catch (e) {
				ok(false, 'if there is no parent method, this.parent() should not cause an error');
			}
			return 1;
		};
	});
	var a = new A();
	ok(a.a.__class__ != null, 'the __class__ of instancemethod is not null, actually it is instancemethod');
	equal(a.a(), 1, 'instancemethod return correct value');	
	equal(A.a, undefined, 'instancemethod can not be retrieved by Class A.a');
});

test('classmethod', function() {
	equal(classmethod(function(){}).__class__, classmethod, 'the __class__ of method wrapped by classmethod, is classmethod');
	var A = new Class(function() {
		this.a = classmethod(function(cls) {
			return 1;
		});
		this.getName = classmethod(function(cls) {
			return cls._name;
		});
	});
	A._name = 'A';
	equal(A.a(), 1, 'classmethod return correct value');
	equal(A.getName(), 'A', 'classmethod return correct class attribute');
	var a = new A();
	try {
		equal(a.a(), 1, 'a is classmethod, instance.a is ok');
	} catch (e) {
		ok(false, 'classmethod can not be retrieved by instance a.a : ' + e);
	}
});

test('staticmethod', function() {
	equal(staticmethod(function(){}).__class__, staticmethod, 'the __class__ of method wrapped by staticmethod, is staticmethod');
	var A = new Class(function() {
		this.a = staticmethod(function() {
			return 1;
		});
	});
	var a = new A();
	equal(A.a(), 1, 'staticmethod can be retrieved by Class A.a');
	equal(a.a(), 1, 'staticmethod can be retrieved by instance a.a');
});

test('property', function() {
	equal(property(function(){}).__class__, property, 'the __class__ of method wrapped by property, is property');
	var A = new Class(function() {
		this.initialize = function(self) {
			self._a = 1;
		};
		this.a = property(function(self) {
			return self._a;
		}, function(self, a) {
			self._a = a;
		});
	});
	var a = new A();
	equal(a.get('a'), 1, 'property initialized successfully');
	a.set('a', 2);
	equal(a.get('a'), 2, 'property get and set successfully');
});

test('name as member of class', function() {
	//this.name == ...
	//A.set('name', fdafda);
});

test('extend Array/String', function() {
});
