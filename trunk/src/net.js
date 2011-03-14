/**
 * @namespace
 * @name net
 */
object.add('net', 'dom, events', /**@lends net*/ function(exports, dom, events) {

var ajaxProxies = this.ajaxProxies = {};

// 执行一个可跨域的ajax请求
// 跨域host必须有ajaxproxy.htm
// callback唯一参数返回 XMLHttpRequest 对象实例
this.ajaxRequest = function(url, callback) {
	var tmpA = document.createElement('a');
	tmpA.href = url;
	var hostname = tmpA.hostname;

	if (hostname && (hostname != location.hostname)) {
		var xhr = null;
		if (ajaxProxies[hostname]) callback(ajaxProxies[hostname].getTransport());
		else {
			var iframe = document.createElement('iframe');
			iframe.style.display = 'none';
			dom.ready(function() {
				document.body.insertBefore(iframe, document.body.firstChild);
				iframe.src = 'http://' + hostname + '/ajaxproxy.htm';
				if (iframe.attachEvent) {
					iframe.attachEvent('onload', function () {
						callback(iframe.contentWindow.getTransport());
						ajaxProxies[hostname] = iframe.contentWindow;
					});
				} else {
					iframe.onload = function () {
						callback(iframe.contentWindow.getTransport());
						ajaxProxies[hostname] = iframe.contentWindow;
					};
				}
			});
		}
	} else {
		if (window.ActiveXObject) {
			try {
				callback(new ActiveXObject('Msxml2.XMLHTTP'));
			} catch(e) {
				callback(new ActiveXObject('Microsoft.XMLHTTP'));
			}
		} else callback(new XMLHttpRequest());
	}
};

this.ping = function(url) {
	var n = "_net_ping_"+ (new Date()).getTime();
	var c = window[n] = new Image(); // 把new Image()赋给一个全局变量长期持有
	c.onload = (c.onerror=function(){window[n] = null;});
	c.src = url;
	c = null; // 释放局部变量c
};

this.Request = new Class(function() {

	Class.mixin(this, events.Events);

	this.initialize = function(self, options) {
		self.url = options.url || '';
		self.method = options.method || 'get';
		self.headers = {};
		self._xhr = null;

		self.onSuccess = options.onSuccess;
		self.onsuccess = options.onsuccess;
		self.onerror = options.onerror;
		self.oncomplete = options.oncomplete;
	};

	this.send = function(self, params) {
		exports.ajaxRequest(self.url, function(xhr) {
			self._xhr = xhr;
			var eventData = {request: xhr};

			xhr.onreadystatechange = function() {
				var xhr = self._xhr;

				if (xhr.readyState === 4) {
					if (xhr.status === undefined || xhr.status === 0 || (xhr.status >= 200 && xhr.status < 300)) {
						self.fireEvent('success', eventData);
						if (self.onSuccess) self.onSuccess(eventData);
					} else {
						self.fireEvent('error', eventData);
					}
					self.fireEvent('complete', eventData);
				}
			};
			var xhr = self._xhr;
			var url = self.url;

			// 处理params
			if (params && self.method == 'get') {
				url += (url.indexOf('?') != -1 ? '&' : '?') + params;
				params = null;
			}

			// open
			xhr.open(self.method, url, true);

			xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');

			// headers
			for (var name in self.headers) {
				xhr.setRequestHeader(name, self.headers[name]);
			}

			self._xhr.send(params);
		});
	};

	this.setHeader = function(self, name, value) {
		self.headers[name] = value;
	};

});

});

