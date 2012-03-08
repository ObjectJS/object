object.add('urlparse', function(exports) {

/**
 * 解析一个url为 scheme / netloc / path / params / query / fragment 六个部分
 * @see http://docs.python.org/library/urlparse.html
 */
function urlparse(url, scheme) {
	var reg, parts;
	if (typeof url != 'string') {
		return null;
	}
	url = url.trim();
	
	if (url.indexOf('file') == 0) {
		// file:///F:/works/workspace/objectjs.org/object/test/unit/modules/urlparse/index.html
		reg = /^(file)\:\/\/()([^\?]*?)?(?:;(.*?))?(?:\?(.*?))?(?:\#(.*))?$/i
	} else {
		// http://www.renren.com:8080/home;32131?id=31321321&a=1#//music/?from=homeleft#fdalfdjal
		reg = /^(?:(\w+?)\:\/(?:\/)?([\w-_.]+(?::\w+)?))?([^\?]*?)?(?:;(.*?))?(?:\?(.*?))?(?:\#(.*))?$/i;
	}
	if (reg.test(url)) {
		parts = url.match(reg).slice(1);
		if (!parts[0] && scheme) parts[0] = scheme;
		for (var i = 0; i < parts.length; i++) {
			if (!parts[i]) parts[i] = '';
		}
		return parts;
	} else {
		return ['', '', '', '', '', ''];
	}
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

