/**
 * @namespace
 * @name object
 */
/**@class Array*/
/**@class String*/
/**@class Function*/
var object = new (function(globalHost) {

var object = this;

// 获取function的name
// 判断function TEST() 是否能取到name属性来选择不同的算法函数
if ((function TEST(){}).name) {
	Function.__get_name__ = function(func) {
		return func.name;
	};
}
// IE
else {
	var funcNameRegExp = /^function ([\w$]+)/;
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
 * @param obj 源
 * @param properties 目标
 * @param ov 是否覆盖，默认true
 */
this.extend = function(obj, properties, ov) {
	if (ov !== false) ov = true;

	for (var property in properties) {
		if (ov || obj[property] === undefined) {
			obj[property] = properties[property];
		}
	}
	if (properties && properties.hasOwnProperty('call')) {
		obj.call = properties.call;
	}

	return obj;
};

/**
 * 浅拷贝
 * @name object.clone
 */
this.clone = function(obj) {
	var clone = {};
	for (var key in obj) clone[key] = obj[key];
	return clone;
};

/**
 * 将成员引用放到window上
 * @name object.bind
 */
this.bind = function(host) {
	object.extend(host, object);
};

this._loader = null;

})(window);
