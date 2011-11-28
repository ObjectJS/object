object.add('ua', function(exports) {

	var numberify = this.numberify = function(s) {
		if(!s || typeof s != 'string') {
		
		}
		var c = 0;
		// convert '1.2.3.4' to 1.234
		return parseFloat(s.replace(/\./g, function() {
			return (c++ === 0) ? '.' : '';
		}));
	};

	//将方法挂接在ua模块上，便于单元测试
	this.__detectUA = detectUA;

	this.ua = {};
	var o = detectUA(navigator.userAgent);
	object.extend(this.ua, o);

	//检测浏览器内核和版本的主方法
	function detectUA(ua) {
		if(!ua && typeof ua != 'string') {
			ua = navigator.userAgent;
		}
		var m, m2;
		var o = {}, core, shell;

		// check IE
		if (!~ua.indexOf('Opera') && (m = ua.match(/MSIE\s([^;]*)/)) && m[1]) {

			// IE8: always IE8, with Trident 4
			// IE9: same as documentMode, with Trident 5
			// IE10: same as documentMode, with Trident 6
			if ((m2 = ua.match(/Trident\/([\d\.]*)/)) && m2[1]) {
				o[core = 'ie'] = document.documentMode;
				o[shell = 'ieshell'] = numberify(m2[1]) + 4;
			// IE6
			// IE7
			} else {
				o[shell = 'ieshell'] = o[core = 'ie'] = numberify(m[1]);
			}

		} else {

			// check core

			// Webkit
			if ((m = ua.match(/AppleWebKit\/([\d\.]*)/)) && m[1]) {
				o[core = 'webkit'] = numberify(m[1]);

			// Gecko
			// 避免Opera userAgent：Mozilla/5.0 (Windows NT 5.1; U; en; rv:1.8.1) Gecko/20061208 Firefox/5.0 Opera 11.11
			} else if (!~ua.indexOf('Opera') && (m = ua.match(/Gecko/))) {
				o[core = 'gecko'] = 0; // Gecko detected, look for revision
				if ((m = ua.match(/rv:([\d\.]*)/)) && m[1]) {
					o[core] = numberify(m[1]);
				}

			// Presto
			// ref: http://www.useragentstring.com/pages/useragentstring.php
			} else if ((m = ua.match(/Presto\/([\d\.]*)/)) && m[1]) {
				o[core = 'presto'] = numberify(m[1]);
			}

			// check shell

			// Chrome
			if ((m = ua.match(/Chrome\/([\d\.]*)/)) && m[1]) {
				o[shell = 'chrome'] = numberify(m[1]);

			// Safari
			} else if ((m = ua.match(/\/([\d\.]*)( Mobile\/?[\w]*)? Safari/)) && m[1]) {
				o[shell = 'safari'] = numberify(m[1]);
			} else if (/\/[\d\.]* \(KHTML, like Gecko\) Safari/.test(ua)) {
				o[shell = 'safari'] = undefined;

			// Firefox
			// 避免Opera userAgent：Mozilla/5.0 (Windows NT 5.1; U; en; rv:1.8.1) Gecko/20061208 Firefox/5.0 Opera 11.11
			} else if (!~ua.indexOf('Opera') && (m = ua.match(/Firefox\/([\d\.]*)/)) && m[1]) {
				o[shell = 'firefox'] = numberify(m[1]);

			// Opera
			} else if ((m = ua.match(/Opera\/([\d\.]*)/)) && m[1]) {
				o[shell = 'opera'] = numberify(m[1]); // Opera detected, look for revision

				if ((m = ua.match(/Opera\/.* Version\/([\d\.]*)/)) && m[1]) {
					o[shell] = numberify(m[1]);
				}
			} else if ((m = ua.match(/Opera ([\d\.]*)/)) && m[1]) {
				core = 'presto';
				o[shell = 'opera'] = numberify(m[1]);
			}
		}

		o.shell = shell;
		o.core = core;
		return o;
	}
});

