;;;(function() {

if (!window.log) log = function() {}

// 两种情况，一种是拥有hashchange事件的标准浏览器，直接监听此事件，其他不支持的，通过一个iframe创造历史
// IE6/IE7(包括IE8的IE7兼容模式)需要用到iframe
var useIframe = (!!window.ActiveXObject && (!window.XMLHttpRequest || (!!window.XMLHttpRequest && (!document.documentMode || document.documentMode === 7))));

function HTML5History(history, adapter) {

	var self = this;

	this.history = history;

	this._ignoreHashChange = false;

	history.pushState = function() {
		self.pushState.apply(self, arguments);
	};

	if (!document.createEvent && adapter) {
		self.fireEvent = adapter.fireEvent;
	}

	if (useIframe) {
		history._oniframechange = function() {
			self.onIFrameChange.apply(self, arguments);
		};
		// 确保iframe创建完毕后再触发初始化的 popstate 事件
		self.makeIFrame(function() {
			// IE67中只有iframe*变化*才会出现历史，首次创建iframe并不会导致这个变化，因此需要在进入页面时就注册这个iframe
			self._isInit = true;
			self.makeIFrameHistory('');
		});
	} else if (window.addEventListener) {
		window.addEventListener('hashchange', function() {
			self.onHashChange.apply(self, arguments);
		}, false);
		// 根据标准，页面初始化也会触发一个 popstate 事件
		self.firePopState();
	} else {
		window.attachEvent('onhashchange', function() {
			self.onHashChange.apply(self, arguments);
		});
		// 根据标准，页面初始化也会触发一个 popstate 事件
		self.firePopState();
	}

}

HTML5History.prototype = {
	makeIFrame: function(callback) {
		var iframeId = 'html5history-iframe';
		var iframe = document.createElement('iframe');

		iframe.setAttribute('id', iframeId);
		if (document.domain != location.hostname) iframe.setAttribute('src', 'http://' + document.domain + '/ajaxproxy.htm');
		iframe.style.display = 'none';

		document.body.appendChild(iframe);
		iframe.attachEvent('onload', function() {
			var func = arguments.callee;
			// 虽然是onload事件，但是在IE6下好像还是没有加载完毕，导致获取iframe.contentWindow.document出现拒绝访问
			// 用一个setTimeout 0就解决了，IE6nb!
			setTimeout(function() {
				callback();
				iframe.detachEvent('onload', func);
			}, 0);
		});

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
			(document.domain != location.hostname)? '	document.domain="' + document.domain + '";' : '',
			'	function pageLoad() {',
			'		try { top.window.history._oniframechange("' + url + '") } catch(e) {}',
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
	/**
	 * 对于支持fire自定义事件的浏览器，直接使用createEvent触发事件
	 * 对于其他浏览器，则需要使用者配置一个adapter，使用其自己的fireEvent/addEvent事件
	 */
	firePopState: function() {
		if (this.fireEvent) {
			this.fireEvent(window, 'popstate');
		} else if (document.createEvent) {
			var event = document.createEvent('UIEvents');
			event.initEvent('popstate', false, false);
			event.state = null;
			window.dispatchEvent(event);
		}
		if (typeof window.onpopstate == 'function') window.onpopstate();
	},
	pushState: function(state, title, url) {
		if (url.substr(0, 1) != '#' || location.hash == url) {
			throw '由于浏览器限制，你必须传入一个与当前hash不同的hash值';
		}
		this._pushState(state, title, url)
		log('pushState ' + url);
	},
	_pushState: useIframe? function(state, title, url) {
		this._ignoreHashChange = true;
		this.makeIFrameHistory(url);
	} : function(state, title, url) {
		this._ignoreHashChange = true;
		window.location.hash = url;
	},
	/**
	 * iframe回调，IE67only
	 * 在IE注册初始化时传进来的url是空字符串，可以不修改location.hash，否则会导致出现一个空的 # 在url后面
	 * 但是不能通过url是否为空来判断是不是应该修改location.hash，因为在后退时触发的也是这个事件，这时就需要将hash删掉了。
	 *
	 * @param url 应该是一个hash
	 */
	onIFrameChange: function(url) {
		// 是进入页面时的调用，不修改hash以避免出现不必要的空#
		if (this._isInit) {
			this._isInit = false;
		} else {
			location.hash = url;
		}
		if (!this._ignoreHashChange) {
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

HTML5History.bind = function(history, adapter) {
	// Firefox 3.6.14中，如果没有一个句柄保存 window.history，后面赋值上的自定义方法就有可能丢掉。
	// 应该是某种垃圾回收机制导致的
	if (history.pushState) return;

	new HTML5History(history, adapter);
};

window.HTML5History = HTML5History;

})();

