object.add('./urlparse.js', function(exports) {

// 可以用于scheme的字符
scheme_chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789+-.';

// 在字符串url中查找target字符后，返回截断后的前、后字符串
// remainFirst表示是否要保留匹配的字符
function find_until(url, target, remainFirst) {
	var len = url.length;
	for(var i=0; i<url.length; i++) {
		if (target.indexOf(url.charAt(i)) != -1) {
			if (i < len) {
				len = i;
				break;
			}
		}
	}
	return {
		got: url.substring(0, len),
		remained: (remainFirst? url.substring(len) : url.substring(len + 1))
	}
}
/**
 * 解析一个url为 scheme / netloc / path / params / query / fragment 六个部分
 * 算法借鉴自python urlparse.py
 * @see http://docs.python.org/library/urlparse.html
 */
function urlparse(url, scheme) {
	//http://www.renren.com:8080/home/home2;32131?id=31321321&a=1#//music/?from=homeleft#fdalfdjal
	//<scheme>://<netloc>/<path>;<params>?<query>#<fragment>
	if (typeof url != 'string') {
		return ['', '', '', '', '', ''];
	}
	var netloc='', path = '', params = '', query = '', fragment = '', i = 0;
	i = url.indexOf(':');
	if (i > 0) {
		if (url.substring(0, i) == 'http') {
			scheme = url.substring(0, i).toLowerCase();
			url = url.substring(i+1);

			if (url.substring(0, 2) == '//') {
				url = url.substring(2);
				tmp = find_until(url, '/?#', true);
				netloc = tmp.got;
				url = tmp.remained;
			}
			
			if (url.indexOf('#') != -1) {
				tmp = find_until(url, '#');
				url = tmp.got;
				fragment = tmp.remained;
			}
			if (url.indexOf('?') != -1) {
				tmp = find_until(url, '?');
				url = tmp.got;
				query = tmp.remained;
			}
			if (url.indexOf(';') != -1) {
				tmp = find_until(url, ';');
				path = tmp.got;
				params = tmp.remained;
			}

			if (!path) {
				path = url;
			}

			return [scheme, netloc, path, params, query, fragment];
		} else {
			for(var i=0; i<url.length; i++) {
				if (scheme_chars.indexOf(url.charAt(i)) == -1) {
					break;
				}
			}
			scheme = url.substring(0, i);
			url = url.substring(i + 1);
		}
	}
	if (url.substring(0, 2) == '//') {
		tmp = find_until(url.substring(2), '/?#', true);
		netloc = tmp.got;
		url = tmp.remained;
	}

	if (url.indexOf('#') != -1) {
		tmp = find_until(url, '#');
		url = tmp.got;
		fragment = tmp.remained;
	}
	if (url.indexOf('?') != -1) {
		tmp = find_until(url, '?');
		url = tmp.got;
		query = tmp.remained;
	}
	if (url.indexOf(';') != -1) {
		tmp = find_until(url, ';');
		path = tmp.got;
		params = tmp.remained;
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

