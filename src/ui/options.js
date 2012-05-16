object.define('ui/options.js', 'events', function(require, exports) {

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

this.OptionsClass = new Class(Type, function() {

	this.__new__ = function(cls, name, base, dict) {

		var optionGetter1 = cls.get('optionGetter1');
		var optionSetter1 = cls.get('optionSetter1');
		var optionSetter = cls.get('optionSetter');

		dict.initialize = function(self) {
			self._options = {};
		};

		/**
		 * 设置option的值
		 * 支持复杂name的设置
		 * comp.setOption('xxx', value) 设置comp的xxx
		 * comp.setOption('sub.xxx', value) 若comp.sub已存在，则赋值到comp.sub，若未存在，则comp.sub在建立时会被赋值
		 * @param name name
		 * @param value value
		 */
		dict.getOption = function(self, name) {
			var parsed = self._options;
			var pointAt = name.indexOf('.');
			var p, l;
			var prefix, surfix;
			var value;

			// 直接找到
			if (pointAt == -1) {
				value = parsed[name];
				// 定义查找
				if (optionGetter1) {
					value = optionGetter1(self, name, value);
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

		/**
		 * 设置option的值
		 * @param name name
		 * @param value value
		 */
		dict.setOption = exports.overloadsetter(function(self, name, value) {
			var oldValue = self.getOption(name);
			var parsed = self._options;
			var pointAt = name.indexOf('.');
			var prefix, surfix;
			// 直接name
			if (pointAt == -1) {
				parsed[name] = value;
				if (optionSetter1) {
					optionSetter1(self, name, value, oldValue);
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
				if (optionSetter) {
					optionSetter(self, prefix, surfix, value);
				}
			}

		});

		return Type.__new__(cls, name, base, dict);
	};
});

// 暂时放在ui/options.js ，待搞清options.js的依赖后用这个替换之
//this.Options = new exports.OptionsClass(function() {});

});
