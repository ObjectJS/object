




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

this.camelCase = function(str) {
	return str.replace(/-\D/g, function(match){
		return match.charAt(1).toUpperCase();
	});
};

this.hyphenate = function(str) {
	return str.replace(/[A-Z]/g, function(match){
		return ('-' + match.charAt(0).toLowerCase());
	});
};

this.capitalize = function(str) {
	return str.replace(/\b[a-z]/g, function(match){
		return match.toUpperCase();
	});
};

this.trim = function(str) {
	return (str || '').replace(/^\s+|\s+$/g, '');
};

this.ltrim = function(str) {
	return (str || '').replace(/^\s+/ , '');
};

this.rtrim = function(str) {
	return (str || '').replace(/\s+$/ , '');
};

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

