module('dom.ready')

test('dom.ready', function() {
	object.use('dom', function(exports, dom) {
		ok(true, 'dom.ready test please see object/test/dom/dom-ready-*.html');
	});
});
