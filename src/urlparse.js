object.add('./urlparse.js', function() {

/**
* 合并两段url
*/
this.urljoin = function(base, url) {
	if (!base || !url || typeof base != 'string' || typeof url != 'string') {
		return '';
	}
	var baseparts = urlparse(base);
	var urlparts = urlparse(url);
	var output = [];

	if (urlparts[0]) {
		return url;
	} else {
		output[0] = baseparts[0];
		output[1] = baseparts[1];
	}

	if (urlparts[2]) {
		// 判断第一个字符，在IE6下不能用urlparts[2][0]的方式，而需要采用charAt
		if (urlparts[2].charAt(0) == '/') {
			output[2] = urlparts[2];
		} else {
			path = baseparts[2];
			if (path) {
				output[2] = path.substring(0, path.lastIndexOf('/') + 1) + urlparts[2];
			} else {
				output[2] = '/' + urlparts[2];
			}
		}
	} else {
		return base;
	}

	return urlunparse(output);
};

/**
* 解析一个url为 scheme / netloc / path / params / query / fragment 六个部分
* @see http://docs.python.org/library/urlparse.html
*/
var urlparse = this.urlparse = function(url) {
	if (!url || typeof url != 'string') {
		return null;
	}
	url = url.trim();
	
	if (url.indexOf('file') == 0) {
		// file:///F:/works/workspace/objectjs.org/object/test/unit/modules/urlparse/index.html
		var reg = /^(file)\:\/\/()([^\?]*?)?(?:;(.*?))?(?:\?(.*?))?(?:\#(.*))?$/i
	} else {
		// http://www.renren.com:8080/home;32131?id=31321321&a=1#//music/?from=homeleft#fdalfdjal
		var reg = /^(?:(\w+?)\:\/(?:\/)?([\w-_.]+(?::\w+)?))?([^\?]*?)?(?:;(.*?))?(?:\?(.*?))?(?:\#(.*))?$/i;
	}
	if (reg.test(url)) {
		return url.match(reg).slice(1);
	}
	
};

/**
* 将兼容urlparse结果的url部分合并成url
*/
var urlunparse = this.urlunparse = function(parts) {
	if (!parts) {
		return '';
	}
	var url = '';
	if (parts[0]) url += parts[0] + '://' + parts[1];
	url += parts[2];
	if (parts[3]) url += ';' + parts[3];
	if (parts[4]) url += '?' + parts[4];
	if (parts[5]) url += '#' + parts[5];

	return url;
};

});

