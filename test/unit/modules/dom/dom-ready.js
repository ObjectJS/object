module('dom.ready')


if (isJsTestDriverRunning) {
	var loc = window['location'];
	var pageUrl = loc.protocol + '//' + loc.host;
	var path = pageUrl + '/test/test/unit/modules/dom/';
} else {
	var path = $UNIT_TEST_CONFIG.needPath ? 'modules/dom/' : '';
}

function createIframeWithCallback(src, callback) {
	var iframe = document.createElement('iframe');
	//iframe.style.border = '1px solid red';
	iframe.style.display = 'none';
	iframe.src = path + src;
	document.body.appendChild(iframe);
	if (iframe.attachEvent) {
		iframe.attachEvent('onload', callback);
	} else {
		iframe.onload = callback;
	}
	return iframe;
}

var MAX_INTERVAL_COUNTER = 100;
test('dom.ready is usable', function() {
	object.use('dom', function(exports, dom) {
		dom.ready(function() {
			ok(true, 'dom.ready is usable');
		});
	});
});

if (isJsTestDriverRunning) {
	var domAsyncTest = AsyncTestCase('domAsyncTest');

	// how to export value from iframe in jsTestDriver???
	/*
	domAsyncTest.prototype.testIframeIsUsableInJsTestDriver = function(queue) {
		queue.call('go', function(callbacks) {
			var callback = callbacks.add(function(value) {
				assertEquals('ok', value, 1);
			});
			var iframe = createIframeWithCallback('dom-ready-iframe-test.html', function() {
				clearTimeout(timeout);
				callback(1);
			});
			var timeout = setTimeout(function() {
				callback(0);
			}, 1000);
		});
	}
	*/
} else {
test('dom.ready is usable in iframe', function() {
	if (document.location.href.indexOf('test-runner-special.html') != -1) {
		ok(true, 'run http://xxxx.renren.com/objectjs.org/object/test/unit/modules/dom/index-special.html instead');
		return;
	}
	stop();
	createIframeWithCallback('dom-ready-iframe-test.html', function() {
		window.counter = 0;
		var interval = setInterval(function() {
			window.counter ++;
			if(counter > MAX_INTERVAL_COUNTER) {
				start();
				ok(false, 'readyCallbackValue_iframe_test is 1');
				clearInterval(interval);
			}
			if(window.readyCallbackValue_iframe_test == 1) {
				start();
				ok(true, 'readyCallbackValue_iframe_test is 1');
				clearInterval(interval);
			}
		}, 10);
	});
});

test('dom.ready - dom-ready-normal.html', function() {
	if (document.location.href.indexOf('test-runner-special.html') != -1) {
		ok(true, 'run http://xxxx.renren.com/objectjs.org/object/test/unit/modules/dom/index-special.html instead');
		return;
	}
	stop();
	createIframeWithCallback('dom-ready-normal.html', function() {
		window.counter = 0;
		var interval = setInterval(function() {
			window.counter ++;
			if(counter > MAX_INTERVAL_COUNTER) {
				start();
				ok(false, 'basic dom.ready is ok');
				clearInterval(interval);
			}
			if(window.readyCallbackValue_dom_ready_normal == 1) {
				start();
				ok(true, 'basic dom.ready is ok');
				clearInterval(interval);
			}
		}, 10);
	});
});

test('dom.ready - dom-ready-dynamic.html', function() {
	if (document.location.href.indexOf('test-runner-special.html') != -1) {
		ok(true, 'run http://xxxx.renren.com/objectjs.org/object/test/unit/modules/dom/index-special.html instead');
		return;
	}
	stop();
	// when iframe dom is ready, iframe document.body.onload is not executed, 
	// iframe.onload is executed before iframe body.document.onload, so we must wait
	var iframe1 = createIframeWithCallback('dom-ready-dynamic.html', function() {
		window.counter = 0;
		var interval = setInterval(function() {
			window.counter ++;
			if(counter > MAX_INTERVAL_COUNTER) {
				start();
				ok(false, 'load objectjs in document.body.onload, dom.ready is ok');
				clearInterval(interval);
			}
			if(window.readyCallbackValue_dom_ready_dynamic == 1) {
				start();
				ok(true, 'load objectjs in document.body.onload, dom.ready is ok');
				clearInterval(interval);
			}
		}, 10);
	});
});

test('dom.ready - dom-ready-dynamic-by-button.html', function() {
	if (document.location.href.indexOf('test-runner-special.html') != -1) {
		ok(true, 'run http://xxxx.renren.com/objectjs.org/object/test/unit/modules/dom/index-special.html instead');
		return;
	}
	stop();
	// when iframe dom is ready, iframe document.body.onload is not executed, 
	// iframe.onload is executed before iframe body.document.onload, so we must wait
	var iframe = createIframeWithCallback('dom-ready-dynamic-by-button.html', function() {
		window.counter = 0;
		iframe.contentWindow.document.getElementById('importObjectjs').click();
		var counter = 0;
		var interval = setInterval(function() {
			counter ++;
			if(counter > MAX_INTERVAL_COUNTER) {
				start();
				ok(false, 'load objectjs in button.click, dom.ready is ok');
				clearInterval(interval);
			}
			if(window.readyCallbackValue_dom_ready_dynamic_by_button == 1) {
				start();
				ok(true, 'load objectjs in button.click, dom.ready is ok');
				clearInterval(interval);
			}
		}, 10);
	});
});
}
