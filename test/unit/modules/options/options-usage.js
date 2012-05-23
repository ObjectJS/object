module('options-usage');

test('options is usable', function() {
	object.use('options', function(exports, options) {
		ok(options != null, 'options is not null');
		ok(options.overloadsetter != null, 'options.overloadsetter is not null');
		ok(options.Arguments != null, 'options.Arguments is not null');
		ok(options.Options != null, 'options.Options is not null');
	});
});

test('options-usage: overloadsetter', function() {
	expect(12);
	object.use('options', function(exports, options) {
		function A(a, b) {
			equal(Number(a)+1, b, 'a+1 = b');
		}
		A(1,2);
		var A2 = options.overloadsetter(A);
		//A2();		// not call
		
		// key must be string
		A2('1',2);	// not call
		A2({1:2});
		A2({'1':2});
		A2({'1':2,'2':3});


		function B(a, b) {
			equal(a+b, 'function', 'ok');
		}
		B('','function');
		B('func', 'tion');
		var B2 = options.overloadsetter(B);
		B2('func', 'tion');
		B2({'func':'tion'});
		B2({'func':'tion', 'f':'unction'});
	});
});

test('options-usage: Arguments', function() {
	object.use('options', function(exports, options) {
		var args = new options.Arguments({a:1,b:2});
		equal(args.a, 1, 'Arguments is ok');
		equal(args.b, 2, 'Arguments is ok');

		args = new options.Arguments({a:1,b:2}, {a:2,b:3});
		equal(args.a, 2, 'overwrite default');
		equal(args.b, 3, 'overwrite default');

		args = new options.Arguments({a:1,b:2}, {c:3,d:4});
		equal(args.a, 1, 'default value');
		equal(args.b, 2, 'default value');
		equal(args.c, undefined, 'will not extend args account');
		equal(args.d, undefined, 'will not extend args account');
	});
});

test('options-usage: Options', function() {
	object.use('options', function(exports, options) {
		var opt = new options.Options();
		opt.setOptions();
		try {
			opt.setOption('name','type');
		} catch (e) {
			ok(false, 'opt.setOption(name, type) raises error : ' + e);
		}

		var opt = new options.Options({});
		try {
			opt.setOption('name','type');
		} catch (e) {
			ok(false, 'opt.setOption(name, type) raises error : ' + e);
		}

		opt.setOption('a', '', 0);
		opt.setOption('b', '', 0);
		opt.setOptions({a:1,b:2});
		equal(opt.getOptions().a, 1, 'ok');
		equal(opt.getOptions().b, 2, 'ok');
		opt.setOptions({a:1,b:2}, b={});
		equal(b.a, undefined, 'b does not have a,b member, so b.a is undefined');
		equal(b.b, undefined, 'b does not have a,b member, so b.b is undefined');
		opt.setOptions({a:1,b:2}, b={a:undefined,b:undefined});
		equal(b.a, 1, 'b has a,b, but both are undefined, can be overwritten, so b.a should be 1');
		equal(b.b, 2, 'b has a,b, but both are undefined, can be overwritten, so b.b should be 2');
		opt.setOptions({a:1,b:2}, b={a:2,b:2});
		equal(b.a, 1, '{a:1,b:2} => {a:2,b:2} = {a:1,b:2}');
		equal(b.b, 2, '{a:1,b:2} a{a:2,b:2} = {a:1,b:2}');
	});	
});
