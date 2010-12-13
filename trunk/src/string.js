object.add('string', function($) {

/**
 * 模板
 */
this.substitute = function() {
	return Mustache.to_html.apply(null, arguments);
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

