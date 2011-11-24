module('net-basic');

test('net is usable', function() {
	ok(true);
});

test('net.ping - basic', function() {
	var edges = $UNIT_TEST_CONFIG.testEdges;
	object.use('net', function(exports, net) {
		for(var prop in edges) {
			try {
				net.ping(edges[prop]);
			} catch (e) {
				ok(false, 'net.ping(' + prop + ') should not raise error : ' + e);
			}
		}
	});
});

test('net.ajaxRequest - basic', function() {
	var edges = $UNIT_TEST_CONFIG.testEdges;
	object.use('net', function(exports, net) {
		for(var prop in edges) {
			try {
				net.ajaxRequest(edges[prop], function(){});
			} catch (e) {
				ok(false, 'net.ajaxRequest(' + prop + ', function(){}) should not raise error : ' + e);
			}
		}
		for(var prop in edges) {
			try {
				net.ajaxRequest('', edges[prop]);
			} catch (e) {
				ok(false, 'net.ajaxRequest(\'\', ' + prop + ') should not raise error : ' + e);
			}
		}
	});
});
test('net.Request', function() {
	var edges = $UNIT_TEST_CONFIG.testEdges;
	object.use('net', function(exports, net) {
		try {
			new net.Request();
		} catch (e) {
			ok(false, 'net.Request() should not raise error : ' + e);
		}
		for(var prop in edges) {
			try {
				new net.Request(edges[prop]);
			} catch (e) {
				ok(false, 'net.Request(' + prop + ') should not raise error : ' + e);
			}
		}
		var req = new net.Request({});
		for(var prop in edges) {
			try {
				req.send(edges[prop]);
			} catch (e) {
				ok(false, 'req.send(' + prop + ') should not raise error : ' + e);
			}
		}

		for(var prop in edges) {
			try {
				req.setHeader(edges[prop], '');
			} catch (e) {
				ok(false, 'req.setHeader(' + prop + ', \'\') should not raise error : ' + e);
			}
			try {
				req.setHeader('', edges[prop]);
			} catch (e) {
				ok(false, 'req.setHeader(\'\', ' + prop + ') should not raise error : ' + e);
			}
		}
	});
});
