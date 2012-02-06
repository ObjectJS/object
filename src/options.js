object.add('options', function(exports) {

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

/**
 * 这个类辅助这种参数传递方式的实现：
 * callFunc({
 *	param1: someValue1,
 *	param2: someValue2
 * })
 * 在声明函数时，通过：
 * var opts = new ns.Arguments(opts, {
 *	param1: 1,
 *	param2: 2
 * });
 * 来设定默认值，没有设置过默认值的成员不会输出
 */
this.Arguments = new Class(function() {

	/**
	 * @param defaults 默认值列表
	 * @param opts 参数列表
	 */
	this.initialize = function(self, defaults, opts) {
		if (opts == undefined) opts = {};

		var output = {};
		for (var key in defaults) {
			output[key] = (opts[key] != undefined? opts[key] : defaults[key]);
		}
		return output;
	};

});

/**
 * 参数
 */
this.Options = new Class({

	/**
	 * 提供一个实现了 makeOption 接口的“提供者”参数，这样，在 setOption 时会自动根据name获取value，不用手工调用
	 */
	initialize: function(self, provider) {
		if (provider) {
			/** provider */
			self._provider = provider;
		}
		/** 用于保存所有的选项 */
		self._options = {};
	},

	/**
	 * 设置options属性
	 */
	setOptions: function(self, options, host) {
		if (!host) host = self._options;

		for (var i in options) {
			// host[i] !== undefined is false when the value is undefined
			if (i in host) host[i] = options[i];
		}
	},

	/**
	 * 设置一个option
	 */
	setOption: function(self, name, type, value) {
		if (value !== undefined) {
			self._options[name] = value;
		} else if (self._provider && self._provider.makeOption){
			value = self._provider.makeOption(name, type);
			if (value === null) return;
			else self._options[name] = value;
		}
	},

	/**
	 * 获取options
	 */
	getOptions: function(self) {
		return self._options;
	}

});

});

