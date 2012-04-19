object.define('ui/options.js', 'events', function(require, exports) {

/**
 * 用于承载options的空对象
 */
function Options() {
}

/**
 * 向current这个对象的name成员设置value值
 * @param current 需要被设置的对象
 * @param name 一个通过.分开各个部分的名称
 * @param value 需要设置的值
 * @pram ov 是否覆盖已有值
 */
this.setOptionTo = function(current, name, value, ov) {
	var parts = Array.isArray(name)? name : name.split('.');
	// 生成前缀对象
	for (var i = 0, part; i < parts.length - 1; i++) {
		part = parts[i];
		if (current[part] === undefined) {
			current[part] = new Options();
		}
		current = current[part];
	}
	var last = parts[parts.length - 1];
	if (!current[last] || ov !== false) {
		current[last] = value;
	}
};

/**
 * {'a.b.c': 1, b: 2} ==> {a: {b.c:1}, b: 2}
 */
this.parse = function(options) {
	if (options.constructor == Options) return options;

	var parsed = new Options();
	Object.keys(options).forEach(function(name) {
		exports.setOptionTo(parsed, name, options[name]);
	});
	return parsed;
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
