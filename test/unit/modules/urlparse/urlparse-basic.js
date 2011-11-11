module('urlparse-basic');

test('urlparse module is usable', function() {
	object.use('urlparse', function(exports, urlparse) {
		equal(urlparse+'', "<module 'urlparse'>" , 'urlparse is usable');
		ok(urlparse.urlparse != null, 'urlparse.urlparse is not null');
		ok(urlparse.urlunparse != null, 'urlparse.urlunparse is not null');
		ok(urlparse.urljoin != null, 'urlparse.urljoin is not null');
	});
});

test('urlparse.urlparse : basic', function() {
	object.use('urlparse', function(exports, urlparse) {
		var edges = $UNIT_TEST_CONFIG.testEdges;
		for(var prop in edges) {
			try {
				urlparse.urlparse(edges[prop]);
			} catch (e) {
				ok(false, 'urlparse.urlparse(' + prop + ') throw error : ' + e);
			}
		}
	});
});

test('urlparse.urlunparse : basic', function() {
	object.use('urlparse', function(exports, urlparse) {
		var edges = $UNIT_TEST_CONFIG.testEdges;
		for(var prop in edges) {
			try {
				urlparse.urlunparse(edges[prop]);
			} catch (e) {
				ok(false, 'urlparse.urlunparse(' + prop + ') throw error : ' + e);
			}
		}
	});
});

test('urlparse.urljoin : basic', function() {
	object.use('urlparse', function(exports, urlparse) {
		var edges = $UNIT_TEST_CONFIG.testEdges;
		for(var prop in edges) {
			try {
				urlparse.urljoin(edges[prop], 'url');
			} catch (e) {
				ok(false, 'urlparse.urljoin(' + prop + ', url) throw error : ' + e);
			}
		}
		for(var prop in edges) {
			try {
				urlparse.urljoin('url', edges[prop]);
			} catch (e) {
				ok(false, 'urlparse.urljoin(url, ' + prop + ') throw error : ' + e);
			}
		}
	});
});
