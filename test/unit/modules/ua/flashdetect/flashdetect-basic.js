module('flashdetect-basic')
test('use flashdetect', function() {
	return;
	object.use('ua.flashdetect', function(exports, ua) {
		ok(ua.flashdetect != null, 'flashdetect module is imported');
		ok(ua.flashdetect.getFlashVersion != null, 'getFlashVersion exists');
		var version = ua.flashdetect.getFlashVersion();
		ok(version != 0, 'getFlashVersion called, returns : ' + version);
	});
});
