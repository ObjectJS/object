object.define('ui/options.js', 'events', function(require, exports) {

/**
 * {'a.b.c': 1, b: 2} ==> {a: {b.c:1}, b: 2}
 */
this.parse = function(options) {
	var parsed = {};
	Object.keys(options).forEach(function(name) {
		exports.setOptionTo(parsed, name, options[name]);
	});
	return parsed;
};

/**
 * 解析一个option项，若不是子元素则调用parser1，若存在子元素则调用paser
 */
this.setOptionTo = function(parsed, name, value, parser1, parser) {
	var pointAt = name.indexOf('.');
	var prefix, surfix;
	// 直接name
	if (pointAt == -1) {
		parsed[name] = value;
		if (parser1) {
			parser1();
		}
	}
	// 子option
	else {
		prefix = name.slice(0, pointAt);
		surfix = name.slice(pointAt + 1);
		if (!parsed[prefix]) {
			parsed[prefix] = {};
		}
		parsed[prefix][surfix] = value;
		if (parser) {
			parser(prefix, surfix);
		}
	}
};

/**
 * 从parsed中获取name的option
 */
this.getOptionFrom = function(parsed, name, getter1) {
	var pointAt = name.indexOf('.');
	var p, l;
	var prefix, surfix;
	var value;

	// 直接找到
	if (pointAt == -1) {
		value = parsed[name];
		// 定义查找
		if (getter1) {
			value = getter1(value);
		}
	}
	// 多重名字
	else {
		prefix = name.slice(0, pointAt);
		surfix = name.slice(pointAt + 1);
		p = surfix + '.';
		l = p.length;

		if (parsed[prefix]) {
			if (parsed[prefix][surfix] != undefined) {
				value = parsed[prefix][surfix];
			} else {
				value = {};
				Object.keys(parsed[prefix]).forEach(function(key) {
					if (key.indexOf(p) == 0) {
						value[key.slice(l)] = parsed[prefix][key];
					}
				});
			}
		}
	}

	return value;
};

// 仿照 mootools 的overloadSetter，返回一个 key/value 这种形式的function参数的包装，使其支持{key1: value1, key2: value2} 这种形式
var enumerables = true, APslice = Array.prototype.slice;
for (var i in {toString: 1}) enumerables = null;
if (enumerables) enumerables = ['hasOwnProperty', 'valueOf', 'isPrototypeOf', 'propertyIsEnumerable', 'toLocaleString', 'toString', 'constructor'];
// func有可能是个method，需要支持传递self参数
this.overloadsetter = function(func) {
	return function() {
		var a = arguments[func.length - 2] || null;
		var b = arguments[func.length - 1];
		var passArgs = args = APslice.call(arguments, 0, func.length - 2);

		if (a === null) return this;
		if (typeof a != 'string') {
			for (var k in a) {
				args = passArgs.slice(0); // 复制，否则循环多次参数就越来越多了
				args.push(k);
				args.push(a[k]);
				func.apply(this, args);
			}
			if (enumerables) {
				for (var i = enumerables.length; i > 0; i--) {
					k = enumerables[i];
					if (a.hasOwnProperty(k)) func.call(this, k, a[k]);
				}
			}
		} else {
			args.push(a);
			args.push(b);
			func.apply(this, args);
		}
		return this;
	};
};

// 暂时放在ui/options.js ，待搞清options.js的依赖后用这个替换之

this.Options = new Class(function() {

	this.getOption = function(self, name) {
		// TODO
	};

	/**
	 * 设置option的值
	 * @param name name
	 * @param value value
	 */
	this.setOption = exports.overloadsetter(function(self, name, value) {
		// TODO
	});

});


});
