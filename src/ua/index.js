/**
* @namespace
* @name ua
*/
object.add('ua', /**@lends ua*/ function(exports) {

	var numberify = this.numberify = function(s) {
		var c = 0;
		// convert '1.2.3.4' to 1.234
		return parseFloat(s.replace(/\./g, function() {
			return (c++ === 0) ? '.' : '';
		}));
	};

	var o = this.ua = {};
	var ua = navigator.userAgent, m, m2;
	var core, shell;

	// check IE
	if ((m = ua.match(/MSIE\s([^;]*)/)) && m[1]) {

		// IE8: always IE8, with Trident 4
		// IE9: same as documentMode, with Trident 5
		// IE10: same as documentMode, with Trident 6
		if ((m2 = ua.match(/Trident\/([\d.]*)/)) && m2[1]) {
			o.trident = numberify(m2[1]);
			o[core = 'ie'] = document.documentMode;
			o[shell = 'ieshell'] = o.trident + 4;
		// IE6
		// IE7
		} else {
			o[shell = 'ieshell'] = o[core = 'ie'] = numberify(m[1]);
		}

	} else {

		// check core

		// Webkit
		if ((m = ua.match(/AppleWebKit\/([\d.]*)/)) && m[1]) {
			o[core = 'webkit'] = numberify(m[1]);

		// Gecko
		} else if ((m = ua.match(/Gecko/))) {
			o[core = 'gecko'] = 0; // Gecko detected, look for revision
			if ((m = ua.match(/rv:([\d.]*)/)) && m[1]) {
				o[core] = numberify(m[1]);
			}

		// Presto
		// ref: http://www.useragentstring.com/pages/useragentstring.php
		} else if ((m = ua.match(/Presto\/([\d.]*)/)) && m[1]) {
			o[core = 'presto'] = numberify(m[1]);
		}

		// check shell

		// Chrome
		if ((m = ua.match(/Chrome\/([\d.]*)/)) && m[1]) {
			o[shell = 'chrome'] = numberify(m[1]);

		// Safari
		} else if ((m = ua.match(/\/([\d.]*) Safari/)) && m[1]) {
			o[shell = 'safari'] = numberify(m[1]);

		// Firefox
		} else if ((m = ua.match(/Firefox\/([\d.]*)/)) && m[1]) {
			o[shell = 'firefox'] = numberify(m[1]);

		// Opera
		} else if ((m = ua.match(/Opera\/([\d.]*)/)) && m[1]) {
			o[shell = 'opera'] = numberify(m[1]); // Opera detected, look for revision

			if ((m = ua.match(/Opera\/.* Version\/([\d.]*)/)) && m[1]) {
				o[shell] = numberify(m[1]);
			}
		}
	}

	o.shell = shell;
	o.core = core;

});

