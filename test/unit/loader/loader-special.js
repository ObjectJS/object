var head = document.getElementsByTagName('head')[0];
module('loader-loadScript', {teardown: function() {
	// remove inserted script tag after every test case finished
	var scripts = Sizzle('script');
	for(var i=0;i<scripts.length; i++) {
		if(scripts[i].callbacks) {
			head.removeChild(scripts[i]);
		}
	}
}});

function emptyCallback(){};
var emptyJS = ($UNIT_TEST_CONFIG.needPath ? 'loader/' : '') + 'empty.js';

test('loadScript basic test', function() {
	ok(Loader.loadScript, 'loadScript is visible in Loader');
	var len1 = Sizzle('script').length;
	Loader.loadScript(emptyJS, emptyCallback);
	var len2 = Sizzle('script').length;
	equal(len2 - len1, 1, 'add one script tag in document after Loader.loadScript is called');
});

test('loadScript with url', function() {
	// null/''
	// Loader.loadScript('',emptyCallback); will case error;
	//ok(false, 'can not loadScript with null url, which will cause empty script tag');
	//ok(false, 'can not loadScript with empty url, which will cause empty script tag');
	//ok(false, 'can not loadScript with an non-javascript url');
	//ok(false, 'can not loadScript with html/jsp/asp...');
	//raises(function() {
	//	Loader.loadScript('not-exists-url', emptyCallback);
	//}, 'can not loadScript with not exists url');

	var oldOnError = window.onerror;
	window.onerror = function() {
		ok(true, 'not-exists-url.js is not exist');
		window.onerror = oldOnError;
		return true;
	};
	Loader.loadScript('not-exists-url.js', emptyCallback);
	//equal(Sizzle('script[src=not-exists-url.js]').length, 0, 'not exists url, script tag should be deleted');
	stop();
	// is js, and exists
	Loader.loadScript(emptyJS, function() {
		start();
		ok(true, 'callback is called');
	});
});

asyncTest('loadScript with/without callback', function() {
	//ok(false, 'callback can not be null');
	Loader.loadScript(emptyJS, function() {
		start();
		ok(true, 'callback is called');
	});
	//Loader.loadScript('not-exists-url', function() {
	//		ok(false, 'callback is called when not-exists-url loaded');
	//});
})

test('loadScript with/without cache', function() {
	var cacheIsOk = false;
	try {
		Loader.loadScript(emptyJS, emptyCallback, true);
		cacheIsOk = true;
	} catch (e) {
		ok(false, 'cache should work with Loader.loadScript(emptyJS, emptyCallback, true) : ' + e);
	}

	if(cacheIsOk) {
		Loader.loadScript(emptyJS, emptyCallback, true);
		var len1 = Sizzle('script').length;
		Loader.loadScript(emptyJS, emptyCallback, true);
		var len2 = Sizzle('script').length;
		equal(len1, len2, 'cache works, load same script, get from cache');
	}
})
