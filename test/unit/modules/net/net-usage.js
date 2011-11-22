module('net-usage');

test('net.ajaxRequst - correct url', function() {
	object.use('net', function(exports, net) {
		stop();
		net.ajaxRequest('http://www.renren.com', function() {
			start();
			ok(true, 'http://www.renren.com/ajaxproxy.htm exists');
			stop();
			net.ajaxRequest('http://blog.renren.com', function() {
				start();
				ok(true, 'http://blog.renren.com/ajaxproxy.htm exists');
			});
		});
	});
});

test('net.ajaxRequst - wrong url', function() {
	return;
	expect(1);
	object.use('net', function(exports, net) {
		stop();
		net.ajaxRequest('http://not-exists.renren.com', function(obj) {
			start();
			ok(false, 'wrong url, should not call the callback');
		});
		raises(function() {
			net.ajaxRequest('http://fdasjlfjdajfa.abc.com', function(obj) {
				start();
				ok(false, 'wrong url, should not call the callback');
			});
		}, 'when ajaxproxy.htm is not exist, some information should be given');
	});
});

test('net.ajaxRequst - ajaxProxies', function() {
	object.use('net', function(exports, net) {
		stop();
		net.ajaxRequest('http://www.renren.com', function() {
			start();
			setTimeout(function() {
				ok(net.ajaxProxies['www.renren.com'] != null, 'XHR object of www.renren.com is cached');
				equal(Object.keys(net.ajaxProxies).length, 1, '1 cached XHR object');
				stop();
				net.ajaxRequest('http://blog.renren.com', function() {
					start();
					setTimeout(function() {
						ok(net.ajaxProxies['blog.renren.com'] != null, 'XHR object of blog.renren.com is cached');
						equal(Object.keys(net.ajaxProxies).length, 2, '2 cached XHR objects');
					}, 10);
				});
			}, 10);
		});
	});
});

test('net.Request - request framework', function() {
	//some event fire error in IE, onsuccess will be executed after success event fired, so success execute twice
	//expect(6);
	object.use('net', function(exports, net) {
		stop();
		var request = new net.Request({
			url : 'http://www.renren.com/feedfocuscount.do',
			onSuccess : function(data) {
				start();
				ok(true, 'onSuccess called');
			},
			onsuccess : function(data) {
				ok(true, 'onsuccess called');
			},
			oncomplete : function(data) {
				ok(true, 'oncomplete called');
			}
		});
		request.addEvent('success', function(data) {
			ok(true, 'success event fired');
		}, false);
		request.addEvent('complete', function(data) {
			ok(true, 'complete event fired');
		}, false);
		request.addEvent('error', function(data) {
			ok(false, 'error event should not be fired');
		}, false);
		request.addEvent('not-exist', function(data) {
			ok(false, 'not-exist event should not be fired');
		}, false);
		equal(request.method, 'get', 'default method is get');
		request.send();
	});
});

test('net.Request - success', function() {
	// some event fire error in IE, onsuccess will be executed after success event fired, so success execute twice
	//expect(11);
	object.use('net', function(exports, net) {
		stop();
		var request = new net.Request({
			url : 'http://www.renren.com/feedfocuscount.do',
			method : 'get',
			onSuccess : function(data) {
				start();
				ok(data.responseText != null, 'responseText is not null, from onSuccess');
				ok(data.responseXML != null, 'responseXML is not null, from onSuccess');
				equal(data.responseText, request._xhr.responseText, 'data.responseText is from request._xhr');
				equal(data.responseXML, request._xhr.responseXML, 'data.responseXML is from request._xhr');
				equal(Object.keys(net.ajaxProxies).length, 1, 'net.ajaxProxies has one element now');
				equal(request._xhr.status, 200, 'XMLHttpRequest.status is 200');
			},
			onsuccess : function(data) {
				start();
				ok(data.responseText != null, 'responseText is not null, from onsuccess');
				ok(data.responseXML != null, 'responseXML is not null, from onsuccess');
			},
			oncomplete : function(data) {
				start();
				ok(data.responseXML != null, 'responstXML is not null, from oncomplete');
			}
		});
		request.addEvent('success', function(data) {
			ok(true, 'success event fired');
		}, false);
		request.addEvent('complete', function(data) {
			ok(true, 'complete event fired');
		}, false);
		request.addEvent('error', function(data) {
			ok(false, 'error event should be be fired');
		}, false);
		request.send();
	});
});

test('net.Request - error host', function() {
	return;
	ok(false, 'how to catch this kind of error??? try { if(iframe.contentWindow.getTransport) ...} catch (e){}');
	object.use('net', function(exports, net) {
		try {
			var request = new net.Request({
				url : 'http://www.____.com',
				onerror : function(data) {
					ok(true, 'request onerror called');
				}
			});
			request.send();
		} catch (e) {
			ok(false, 'not-exists host should raise error : ' + e);
		}
		try {
			var request = new net.Request({
				url : 'http://www.baidu.com',
				onerror : function(data) {
					ok(true, 'request onerror called');
				}
			});
			request.send();
		} catch (e) {
			ok(false, 'not-exists host should raise error : ' + e);
		}
	});
});

test('net.Request - error url', function() {
	return;
	object.use('net', function(exports, net) {
		stop();
		var request = new net.Request({
			url : 'http://www.renren.com/wrong-url.do',
			onerror : function(data) {
				start();
				ok(true, 'request onerror called');
				equal(Object.keys(net.ajaxProxies).length, 1, 'failure request, it is none of ajaxproxy.html\'s business, so it should be cached too');
			}
		});
		request.addEvent('success', function(data) {
			ok(false, 'success event should not be fired');
		}, false);
		request.addEvent('error', function(data) {
			start();
			ok(true, 'request.addEvent(error) called, with data : ' + data);
		}, false);
		request.send();
	});
});

test('net.ping', function() {
	object.use('net', function(exports, net) {
		net.ping('http://www.renren.com');
	});
});
