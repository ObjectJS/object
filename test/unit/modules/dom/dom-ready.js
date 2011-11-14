module('dom.ready')

// can not access window.parent in iframe in Chrome
// so if your browser is chrome, open xxxx.html with your browser to test dom.ready
var chrome = 0;
object.use('ua', function(exports, ua) {
	chrome = ua.ua.chrome;
});

function createIframeWithCallback(src, callback) {
	var iframe = document.createElement('iframe');
	//iframe.style.border = '1px solid red';
	iframe.style.display = 'none';
	iframe.src = src;
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
		stop();
		dom.ready(function() {
			start();
			ok(true, 'dom.ready is usable');
		});
	});
});

asyncTest('dom.ready is usable in iframe', function() {
	if (chrome) {
		ok(true, 'please use dom-ready-iframe-test.html to test this test case');
		start();
		return;
	}
	var iframe = createIframeWithCallback('dom-ready-iframe-test.html', function() {
		var counter = 0;
		var interval = setInterval(function() {
			counter ++;
			var value = window.readyCallbackValue_iframe_test;
			if(value == 1) {
				start();
				ok(true, 'readyCallbackValue_iframe_test is 1');
				clearInterval(interval);
			}
			if(counter > MAX_INTERVAL_COUNTER) {
				start();
				ok(false, 'readyCallbackValue_iframe_test is 1');
				clearInterval(interval);
			}
		}, 10);
	});
});

asyncTest('dom.ready - dom-ready-normal.html', function() {
	if (chrome) {
		ok(true, 'please use dom-ready-normal.html to test this test case');
		start();
		return;
	}
	var iframe = createIframeWithCallback('dom-ready-normal.html', function() {
		var counter = 0;
		var interval = setInterval(function() {
			counter ++;
			var value = window.readyCallbackValue_dom_ready_normal;
			if(value == 1) {
				start();
				ok(true, 'readyCallbackValue_dom_ready_normal is 1');
				clearInterval(interval);
			}
			if(counter > MAX_INTERVAL_COUNTER) {
				start();
				ok(false, 'readyCallbackValue_dom_ready_normal is 1');
				clearInterval(interval);
			}
		}, 10);
	});
});

asyncTest('dom.ready - dom-ready-dynamic.html', function() {
	if (chrome) {
		ok(true, 'please use dom-ready-dynamic.html to test this test case');
		start();
		return;
	}
	// when iframe dom is ready, iframe document.body.onload is not executed, 
	// iframe.onload is executed before iframe body.document.onload, so we must wait
	var iframe = createIframeWithCallback('dom-ready-dynamic.html', function() {
		testResultInput = iframe.contentWindow.document.getElementById('test');
		var counter = 0;
		var interval = setInterval(function() {
			counter ++;
			var value = testResultInput.value;
			if(counter > MAX_INTERVAL_COUNTER) {
				start();
				ok(false, 'load objectjs in document.body.onload, dom.ready is ok');
			}
			if(value == 'true') {
				start();
				ok(true, 'load objectjs in document.body.onload, dom.ready is ok');
				clearInterval(interval);
			}
		}, 10);
	});
});

asyncTest('dom.ready - dom-ready-dynamic-by-button.html', function() {
	if (chrome) {
		ok(true, 'please use dom-ready-dynamic-by-button.html to test this test case');
		start();
		return;
	}
	// when iframe dom is ready, iframe document.body.onload is not executed, 
	// iframe.onload is executed before iframe body.document.onload, so we must wait
	var iframe = createIframeWithCallback('dom-ready-dynamic-by-button.html', function() {
		iframe.contentWindow.document.getElementById('importObjectjs').click();
		testResultInput = iframe.contentWindow.document.getElementById('test');
		var counter = 0;
		var interval = setInterval(function() {
			counter ++;
			var value = testResultInput.value;
			if(counter > MAX_INTERVAL_COUNTER) {
				start();
				ok(false, 'load objectjs in document.body.onload, dom.ready is ok');
				clearInterval(interval);
			}
			if(value == 'true') {
				start();
				ok(true, 'load objectjs in document.body.onload, dom.ready is ok');
				clearInterval(interval);
			}
		}, 10);
	});
});
