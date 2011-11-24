$(document).ready(function() {
	var path = $UNIT_TEST_CONFIG.needPath ? 'modules/urlparse/' : '';
	$LAB
	   .script(path + "../../../../src/urlparse.js").wait()
	   .script(path + "urlparse-basic.js").wait()
	   .script(path + "urlparse-usage.js").wait()
});
