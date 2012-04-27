/**
 * @namespace
 * @name object
 */
/**@class Array*/
/**@class String*/
/**@class Function*/
var object = (function(globalHost) {

var object = function() {
};

// 获取function的name
// 判断function TEST() 是否能取到name属性来选择不同的算法函数
if ((function TEST(){}).name) {
	Function.__get_name__ = function(func) {
		return func.name;
	};
}
// IE
else {
	// IE下方法toString返回的值有可能是(开头
	var funcNameRegExp = /(?:^|\()function ([\w$]+)/;
	//Function.__get_name__((function a() {})) -> (function a(){}) -> a
	Function.__get_name__ = function(func) {
		// IE 下没有 Function.prototype.name，通过代码获得
		var result = funcNameRegExp.exec(func.toString());
		if (result) return result[1];
		return '';
	};
}

/**
 * 为obj增加properties中的成员
 * @name object.extend
 * @param {Object} obj 被扩展的对象
 * @param {Object} properties 扩展属性的来源对象
 * @param {Boolean|Function} ov 是否覆盖obj对象中的原有成员，如果是true（默认），则覆盖，false则不覆盖原有成员
 * 		如果传入的是function，则按照function的返回值来判断是否覆盖
 * 		function的参数依次是：属性值、目标对象、源对象
 */
object.extend = function(obj, properties, ov) {
	var filter = null;
	if (typeof ov == 'function') {
		filter = ov;
	} else if (ov === true || typeof ov === 'undefined') {
		filter = function(prop, dest, src) {
			return true;
		};
	} else {
		filter = function(prop, dest, src) {
			return !(prop in dest);
		};
	}

	for (var property in properties) {
		if (filter(property, obj, properties)) {
			obj[property] = properties[property];
		}
	}
	if (properties && properties.hasOwnProperty('call') && filter(obj, properties, 'call')) {
		obj.call = properties.call;
	}

	return obj;
};

/**
 * 浅拷贝
 * @name object.clone
 */
object.clone = function(obj) {
	var clone = {};
	for (var key in obj) clone[key] = obj[key];
	return clone;
};

/**
 * 将成员引用放到window上
 * @name object.bind
 */
object.bind = function(host) {
	object.extend(host, object);
};

object._loader = null;

return object;

})(window);
