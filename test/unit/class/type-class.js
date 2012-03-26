module('type-class');

test('base', function() {
	var M = new Class(type, function() {
		this.a = function(cls) {
			console.log(cls);
		}

		this.initialize = function(cls, name, base, dict) {
			console.log(cls.a);
		};
	});

	var MM = new Class(M, function() {
	});

	var A = new Class(object, function() {
		this.__metaclass__ = MM;
	});
});
