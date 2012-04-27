object.add('./net.js', 'dom, events', function(exports, dom, events) {

var ajaxProxies = this.ajaxProxies = {};

/**
 * 执行一个可跨域的ajax请求
 * 跨域host必须有ajaxproxy.htm
 * callback唯一参数返回 XMLHttpRequest 对象实例
 */
this.ajaxRequest = function(url, callback) {
	if (!url || typeof url != 'string' || url.trim().length == 0) {
		return;
	}
	if (!callback || typeof callback != 'function') {
		callback = function(){};
	}
	var tmpA = document.createElement('a');
	tmpA.href = url;
	var hostname = tmpA.hostname;
	var protocol = tmpA.protocol;

	if (hostname && (hostname != location.hostname)) {
		var xhr = null;
		if (ajaxProxies[hostname]) callback(ajaxProxies[hostname].getTransport());
		else {
			var iframe = document.createElement('iframe');
			iframe.style.display = 'none';
			dom.ready(function() {
				document.body.insertBefore(iframe, document.body.firstChild);
				iframe.src = protocol + '//' + hostname + '/ajaxproxy.htm';
				if (iframe.attachEvent) {
					iframe.attachEvent('onload', function () {
						try {
							var transport = iframe.contentWindow.getTransport();
						} catch (e) {
							throw new Error('message : ' + e.message + ' from url : ' + url);
						}
						// ajaxProxies先缓存，避免callback异常导致缓存没有执行
						ajaxProxies[hostname] = iframe.contentWindow;
						callback(transport);
					});
				} else {
					iframe.onload = function () {
						try {
							var transport = iframe.contentWindow.getTransport();
						} catch (e) {
							throw new Error('message : ' + e.message + ' from url : ' + url);
						}
						// ajaxProxies先缓存，避免callback异常导致缓存没有执行
						ajaxProxies[hostname] = iframe.contentWindow;
						callback(transport);
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

/**
 * 发送一个请求到url
 * @param url url
 */
this.ping = function(url) {
	var n = "_net_ping_"+ (new Date()).getTime();
	var c = window[n] = new Image(); // 把new Image()赋给一个全局变量长期持有
	c.onload = (c.onerror=function(){window[n] = null;});
	c.src = url;
	c = null; // 释放局部变量c
};

/**
 * 发送Ajax请求的类
 * 使用时需要实例化一个Request对象,然后手动调用该对象的send方法完成发送(与base中的xmlhttp不同)
 * 
 * @param {object} options
 * @param {string} options.url 要请求的url
 * @param {string} options.method get/post
 * @param {function} options.onsuccess 请求成功后的回调,参数是封装过的ajax对象
 * @param {function} options.onerror 请求失败后的回调
 * @param {int} options.timeout 请求的超时毫秒数
 */
this.Request = new Class(function() {

	Class.mixin(this, events.Events);

	this.initialize = function(self, options) {
		options = options || {};
		self.url = options.url || '';
		self.method = options.method || 'get';
		self.timeout = options.timeout && options.timeout > 0 ? options.timeout : 0;
		self.headers = {};
		self.data = options.data || null;
		self._xhr = null;

		self.onSuccess = options.onSuccess;
		self.onsuccess = options.onsuccess;
		self.onerror = options.onerror;
		self.oncomplete = options.oncomplete;
	};

	/**
 	 * 将data作为数据进行发送
	 * @param {string} data 发送的数据
	 */
	this.send = function(self, data) {
		exports.ajaxRequest(self.url, function(xhr) {
			// onreadystatechange和timer共同使用的标志
			// 异常出现的情形：
			// 	在设置timeout极短（1ms）时，timer首先执行，timeout事件触发，在abort执行之前，xhr已经成功返回结果，触发success
			//  这样一个请求既触发timeout又触发success，不正确
			// 增加callbackCalled就是为了避免上述情形的出现
			var callbackCalled = false;
			self._xhr = xhr;
			var eventData = {request: self};

			xhr.onreadystatechange = function() {
				var xhr = self._xhr;

				if (xhr.readyState === 4) {


					// 如果timer已经抢先执行，则直接返回
					if (callbackCalled) {
						return;
					} 
					// 如果timer还没有执行，则清除timer
					else if (self._timer) {
						clearTimeout(self._timer);
						self._timer = null;
					}

					// IE6 don't support getResponseHeader method
					// if (xhr.getResponseHeader('Content-Type') == 'text/json') {
						//xhr.responseJSON = JSON.parse(xhr.responseText)
					// }

					self.responseText = xhr.responseText;
					self.responseXML = xhr.responseXML;
					// self.responseJSON = xhr.responseJSON;

					// Compatible
					eventData.responseText = xhr.responseText;
					eventData.responseXML = xhr.responseXML;

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

			if (!data) data = self.data;

			// 处理data
			if (data && self.method == 'get') {
				url += (url.indexOf('?') != -1 ? '&' : '?') + data;
				data = null;
			}

			// open
			xhr.open(self.method, url, true);

			xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');

			// headers
			for (var name in self.headers) {
				xhr.setRequestHeader(name, self.headers[name]);
			}

			if (self.timeout) {
				self._timer = setTimeout(function() {
					callbackCalled = true;
					self.abort();
					self.fireEvent('timeout', eventData);
					self.fireEvent('complete', eventData);
				}, self.timeout);
			}

			self._xhr.send(data);
		});
	};

	/**
	 * 中断请求
	 */
	this.abort = function(self) {
		self._xhr.abort();
		if (self._timer) {
			clearTimeout(self._timer);
			self._timer = null;
		}
	};

	/**
	 * getResponseHeader
	 */
	this.getResponseHeader = function(self, key) {
		return self._xhr.getResponseHeader(key);
	};

	/**
	 * setHeader
	 */
	this.setHeader = function(self, name, value) {
		self.headers[name] = value;
	};

});

});
