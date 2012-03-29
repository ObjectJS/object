module('type-class');

test('general', function() {
	var newCalled = 0;
	var initCalled = 0;

	var BM = new Class(type, function() {
	});

	var M = new Class(type, function() {
		this.__new__ = function(cls, name, base, dict) {
			newCalled++;
			ok(cls.get('a'), 'type-class member get.');
			dict.b = 1;
			return type.__new__(cls, name, base, dict);
		};

		this.a = function(cls, value) {
			console.log(arguments)
			return value;
		};

		this.initialize = function(cls) {
			initCalled++;
		};

		this.__setattr__ = function(cls, name, member) {
		};

		this.__getattr__ = function(cls, name, member) {
		};
	});

	var A = new M(function() {
	});

	ok(BM.__new__, 'default __new__ exists.');
	ok(BM.initialize, 'default initialize exists.');
	ok(M.__new__, 'custom __new__ exists.');
	ok(M.initialize, 'custom initialize exists.');
	equal(A.get('b'), 1, 'new a metaclass create a class.');
	equal(newCalled, 1, '__new__ in metaclass called.');
	equal(initCalled, 1, 'initialize in metaclass called.');
	ok(M.get('a'), 'get custom member in type-based class.');
	ok(A.get('a'), 'get metaclass\'s custom member in class.');
	equal(A.get('a')('ok'), 'ok', 'metaclass\'s custom method called in class return value ok.');
});

test('base', function() {
	baseNewCalled = 0;
	baseInitCalled = 0;

	var M = new Class(type, function() {
		this.__new__ = function(cls, name, base, dict) {
			baseNewCalled++;
			//ok(cls.get('a'), 'type-class member get.');
			return type.__new__(cls, name, base, dict);
		};

		this.a = function(cls) {
		}

		this.initialize = function(cls, name, base, dict) {
			baseInitCalled++;
		};
	});

	var MM = new Class(M, function() {
	});

	var A = new Class(object, function() {
		this.__metaclass__ = MM;
	});

	// 确保继承关系在metaclass中也有效
	equal(baseNewCalled, 1, '__new__ method in base called.');
	equal(baseInitCalled, 1, 'initialize method in base called.');
});
