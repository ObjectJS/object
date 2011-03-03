;;;(function() {

var isIE = !!window.ActiveXObject;

function History(history) {

	var self = this;

	this.history = history;

	this._ignoreHashChange = false;

	history.pushState = function() {
		self.pushState.apply(self, arguments);
	};

	if (isIE) {
		history._onpopstate = function() {
			self.onIFrameChange.apply(self, arguments);
		};
		self.makeIFrame();
	} else {
		window.addEventListener('hashchange', function() {
			self.onHashChange.apply(self, arguments);
		}, false);
	}

	
}

History.prototype = {
	makeIFrame: function() {
		var iframeId = 'html5history-iframe';
		var iframe = document.createElement('iframe');

		iframe.setAttribute('id', iframeId);
		iframe.style.display = 'none';

		document.body.appendChild(iframe);

		this.iframe = iframe;
	},
	makeIFrameHistory: function(url) {
		var doc = this.iframe.contentWindow.document;
		doc.open();
		doc.write([
			'<html>',
			'<head>',
			'<meta http-equiv="Pragma" content="no-cache" />',
			'<meta http-equiv="Expires" content="-1" />',
			'<script>',
			'	function pageLoad() {',
			'		try { top.window.history._onpopstate("' + url + '") } catch(e) {}',
			'	}',
			'</script>',
			'</head>',
			'<body onload="pageLoad()">',
			'<div id="url">' + url + '</div>',
			'</body>',
			'</html>'
		].join(''));
		doc.title = document.title;
		doc.close();
	},
	firePopState: isIE? function() {
		window.onpopstate();
	} : function() {
		var event = document.createEvent('UIEvents');
		event.initEvent('popstate', false, false);
		event.state = null;
		window.dispatchEvent(event);
	},
	pushState: function(state, title, url) {
		if (url.substr(0, 1) != '#' || location.hash == url) {
			throw '由于浏览器限制，你必须传入一个与当前hash不同的hash值';
		}
		this._pushState(state, title, url)
		log('pushState ' + url);
	},
	_pushState: isIE? function(state, title, url) {
		this._ignoreHashChange = true;
		this.makeIFrameHistory(url);
	} : function(state, title, url) {
		this._ignoreHashChange = true;
		window.location.hash = url;
	},
	/**
	 * iframe回调，IEonly
	 */
	onIFrameChange: function(url) {
		if (!this._ignoreHashChange) {
			location.hash = url;
			this.firePopState();
		}
		this._ignoreHashChange = false;
	},
	onHashChange: function(url) {
		if (!this._ignoreHashChange) {
			this.firePopState();
		}
		this._ignoreHashChange = false;
	}
};

History.bind = function(history, window) {
	new History(history);
};

function init() {
	// Firefox 3.6.14中，如果没有一个句柄保存 window.history，后面赋值上的自定义方法就有可能丢掉。
	// 应该是某种垃圾回收机制导致的
	var history = window.history;
	if (history.pushState) return;

	History.bind(history, window);
}

if (document.addEventListener) {
	document.addEventListener('DOMContentLoaded', init, false);
} else {
	var timer = setInterval(function() {
		try {
			document.body.doScroll('left');
			clearInterval(timer);
			init();
		} catch (e) {}
	}, 20); 
}

})();

