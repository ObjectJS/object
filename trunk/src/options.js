object.add('options', function($) {

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
 * @class
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
 * @class
 */
this.Options = new Class({

	/**
	 * 提供一个实现了 makeOption 接口的“提供者”参数，这样，在 setOption 时会自动根据name获取value，不用手工调用
	 */
	initialize: function(self, provider) {
		if (provider) self._provider = provider;
		self._options = {};
	},

	setOptions: function(self, options, host) {
		if (!host) host = self._options;

		for (var i in options) {
			if (host[i] !== undefined) host[i] = options[i];
		}
	},

	setOption: function(self, name, type, value) {
		if (value !== undefined) {
			self._options[name] = value;
		} else {
			value = self._provider.makeOption(name, type);
			if (value === null) return;
			else self._options[name] = value;
		}
	},

	getOptions: function(self) {
		return self._options;
	}

});

});

