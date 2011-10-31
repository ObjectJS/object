module('class usage');
test('new class', function() {
	//传入一个参数
	//传入两个参数
	//不传入参数
});

test('class member', function() {
	//自己新建属性
	//继承自Array和String的属性
	//instancemethod
	//classmethod
	//staticmethod
	//利用实例，分别调用以上三种类型的方法
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
	raises(function() {
		B.classMethod();
	},'class method cann not be inheritted from parent class');
	equal(A.staticMethod(), 'staticmethod', 'staticmethod called by A.staticMethod');
	raises(function() {
		B.staticMethod()
	}, 'static method cannot be inheritted from parent class');
});
test('speed', function() {
	var st = new Date().getTime();
	var proto = {};
	for (var i = 0; i < 10000; i++) {
		proto['m' + i] = classmethod(function(self) {
			alert(this);
		}.bind(i));
	}
	var MyClass = new Class(proto);
	var time = new Date().getTime() - st;
	//ok(time < 100, 'total time(10000 times) is less than 100ms : ' + time + 'ms');
});
test('Class.xxxMethod', function() {
});
