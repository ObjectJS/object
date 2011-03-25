/**
 * @namespace
 * @name urlparser
 */
object.add('urlparse', /**@lends urlparser*/ function() {

this.urljoin = function(base, url) {
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
		if (urlparts[2][0] == '/') {
			output[2] = urlparts[2];
		} else {
			path = baseparts[2];
			output[2] = path.substring(0, path.lastIndexOf('/') + 1) + urlparts[2];
		}
	} else {
		return base;
	}

	return urlunparse(output);
};

var urlparse = this.urlparse = function(url) {
	return url.match(/^(?:(\w+?)\:\/\/([\w-_.]+(?::\d+)?))?(.*?)?(?:;(.*?))?(?:\?(.*?))?(?:\#(\w*))?$/i).slice(1);
};

var urlunparse = this.urlunparse = function(parts) {
	var url = '';
	if (parts[0]) url += parts[0] + '://' + parts[1];
	url += parts[2];
	if (parts[3]) url += ';' + parts[3];
	if (parts[4]) url += '?' + parts[4];
	if (parts[5]) url += '#' + parts[5];

	return url;
};

});

