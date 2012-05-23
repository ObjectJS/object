object.add('./urlparse.js', function(exports) {

// 可以用于scheme的字符
var scheme_chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789+-.';

/**
 * 在字符串url中查找target字符后，利用result对象，返回截断后的前、后字符串
 * @param {Object} result 重复利用的用于返回结果的对象（避免太多内存垃圾产生）
 * @param {String} url 需要截取的url
 * @param {String} target 截断的字符组成的字符串
 * @param {Boolean} remainFirst 是否要保留匹配的字符
 *
 * @return {Object} 形如 {got:'', remained:''}的结果对象
 */
function splitUntil(result, url, target, remainFirst) {
	var min = url.length;
	for(var i=0, len = url.length; i < len; i++) {
		if (target.indexOf(url.charAt(i)) != -1) {
			if (i < min) {
				min = i;
				break;
			}
		}
	}
	result.got = url.substring(0, min);
	result.remained = (remainFirst? url.substring(min) : url.substring(min + 1));
	return result;
}

/**
 * 解析一个url为 scheme / netloc / path / params / query / fragment 六个部分
 * @see http://docs.python.org/library/urlparse.html
 * @example 
 * http://www.renren.com:8080/home/home2;32131?id=31321321&a=1#//music/?from=homeleft#fdalfdjal
 * --> 
 * [http, www.renren.com:8080, /home/home2, 32131, id=31321321&a=1, //music/?from=homeleft#fdalfdjal]
 */
function urlparse(url, default_scheme) {
	if (typeof url != 'string') {
		return ['', '', '', '', '', ''];
	}
	var scheme = '', netloc='', path = '', params = '', query = '', fragment = '', i = 0;
	i = url.indexOf(':');
	if (i > 0) {
		if (url.substring(0, i) == 'http') {
			scheme = url.substring(0, i).toLowerCase();
			url = url.substring(i+1);
		} else {
			for(var i=0, len = url.length; i < len; i++) {
				if (scheme_chars.indexOf(url.charAt(i)) == -1) {
					break;
				}
			}
			scheme = url.substring(0, i);
			url = url.substring(i + 1);
		}
	}
	if (!scheme && default_scheme) {
		scheme = default_scheme;
	}
	var splited = {};
	if (url.substring(0, 2) == '//') {
		splitUntil(splited, url.substring(2), '/?#', true);
		netloc = splited.got;
		url = splited.remained;
	}

	if (url.indexOf('#') != -1) {
		splitUntil(splited, url, '#');
		url = splited.got;
		fragment = splited.remained;
	}
	if (url.indexOf('?') != -1) {
		splitUntil(splited, url, '?');
		url = splited.got;
		query = splited.remained;
	}
	if (url.indexOf(';') != -1) {
		splitUntil(splited, url, ';');
		path = splited.got;
		params = splited.remained;
	}
	
	if (!path) {
		path = url;
	}
	return [scheme, netloc, path, params, query, fragment];
};

/**
 * 将兼容urlparse结果的url部分合并成url
 */
function urlunparse(parts) {
	if (!parts) {
		return '';
	}
	var url = '';
	if (parts[0]) url += parts[0] + '://' + parts[1];
	if (parts[1] && parts[2] && parts[2].indexOf('/') != 0) url += '/';
	url += parts[2];
	if (parts[3]) url += ';' + parts[3];
	if (parts[4]) url += '?' + parts[4];
	if (parts[5]) url += '#' + parts[5];

	return url;
};

/**
 * 合并两段url
 */
function urljoin(base, url) {
	// 逻辑完全照抄python的urlparse.py

	if (!base) {
		return url;
	}

	if (!url) {
		return base;
	}

	url = String(url);
	base = String(base);

	var bparts = urlparse(base);
	var parts = urlparse(url, bparts[0]);

	// scheme
	if (parts[0] != bparts[0]) {
		return url;
	}

	// netloc
	if (parts[1]) {
		return urlunparse(parts);
	}

	parts[1] = bparts[1];

	// path
	if (parts[2].charAt(0) == '/') {
		return urlunparse(parts);
	}

	// params
	if (!parts[2] && !parts[3]) {
		parts[2] = bparts[2];
		parts[3] = bparts[3];
		if (!parts[4]) {
			parts[4] = bparts[4];
		}
		return urlunparse(parts);
	}

    var segments = bparts[2].split('/').slice(0, -1).concat(parts[2].split('/'))

	// 确保能够生成最后的斜线
	if (segments[segments.length - 1] == '.') {
		segments[segments.length - 1] = '';
	}

	// 去掉所有'.'当前目录
	for (var i = 0, l = segments.length; i < l; i++) {
		if (segments[i] == '.') {
			segments.splice(i, 1);
			i--;
		}
	}

	// 合并所有'..'
	var i;
	while (true) {
		i = 1;
		n = segments.length - 1;
		while (i < n) {
			if (segments[i] == '..' && ['', '..'].indexOf(segments[i - 1]) == -1) {
				segments.splice(i - 1, 2);
				break;
			}
			i++;
		}
		if (i >= n) {
			break;
		}
	}

	if (segments.length == 2 && segments[0] == '' && segments[1] == '..') {
		segments[segments.length - 1] = '';
	}
	else if (segments.length >= 2 && segments[segments.length - 1] == '..') {
		segments.pop();
		segments.pop();
		segments.push('');
	}

	parts[2] = segments.join('/');

	return urlunparse(parts);
}

exports.urlparse = urlparse;
exports.urlunparse = urlunparse;
exports.urljoin = urljoin;

});

