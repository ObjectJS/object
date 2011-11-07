
/**
 * @namespace
 * @name string
 */
object.add('string', /**@lends string*/ function(exports) {

/**
 * 模板
 */
this.substitute = function() {
	return Mustache.to_html.apply(null, arguments);
};

/**
* 转换为驼峰式
*/
this.camelCase = function(str) {
	return str.replace(/-\D/g, function(match){
		return match.charAt(1).toUpperCase();
	});
};

/**
* 转换为减号(-)分隔式
*/
this.hyphenate = function(str) {
	return str.replace(/[A-Z]/g, function(match){
		return ('-' + match.charAt(0).toLowerCase());
	});
};

/**
* 转换为首字母大写
*/
this.capitalize = function(str) {
	return str.replace(/\b[a-z]/g, function(match){
		return match.toUpperCase();
	});
};

/**
* 清空字符串左右两端的空白
*/
this.trim = function(str) {
	return (str || '').replace(/^\s+|\s+$/g, '');
};

/**
* 清空字符串左端的空白
*/
this.ltrim = function(str) {
	return (str || '').replace(/^\s+/ , '');
};

/**
* 清空字符串右端的空白
*/
this.rtrim = function(str) {
	return (str || '').replace(/\s+$/ , '');
};

/**
* 字符长度（包含中文）
*/
this.lengthZh = function(str) {
	return str.length;
};

/**
 * 将对象转换为querystring
 * 来自 mootools
 */
this.toQueryString = function(object) {
	var queryString = [];

	for (var key in object) {
		var value = object[key];

		var result;

		if (value && value.constructor === Array) {
			var qs = {};
			value.forEach(function(val, i) {
				qs[i] = val;
			});

			result = arguments.callee(qs, key);
		} else if (typeof value == 'object') {
			result = arguments.callee(value, key);
		} else {
			result = key + '=' + encodeURIComponent(value);
		}

		if (value !== null) queryString.push(result);
	}

	return queryString.join('&');
};

});
