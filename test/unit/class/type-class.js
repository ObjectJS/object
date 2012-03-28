module('type-class');

test('general', function() {

	var M = new Class(type, function() {
		this.__new__ = function(cls, name, base, dict) {
			ok(cls.get('a'), 'type-class member get.');
			return type.__new__(cls, name, base, dict);
		};

		this.a = function(cls) {
		};

		this.initialize = function(cls) {
		};
	});

	//var A = new Class(object, function() {
		//this.__metaclass__ = M;
	//});

	var B = new M(function() {
	});
});

test('base', function() {
	baseNewCalled = 0;

	var M = new Class(type, function() {
		this.__new__ = function(cls, name, base, dict) {
			baseNewCalled++;
			//ok(cls.get('a'), 'type-class member get.');
			return type.__new__(cls, name, base, dict);
		};

		this.a = function(cls) {
		}

		this.initialize = function(cls, name, base, dict) {
		};
	});

	var MM = new Class(M, function() {
	});

	var A = new Class(object, function() {
		this.__metaclass__ = MM;
	});

	// 确保继承关系在metaclass中也有效
	equal(baseNewCalled, 1, '__new__ method in base called.')
});
