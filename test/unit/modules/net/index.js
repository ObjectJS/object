$(document).ready(function() {
	return;
	try {
		// error in Chrome
		document.domain = 'renren.com';
	} catch (e){}
	var path = $UNIT_TEST_CONFIG.needPath ? 'modules/net/' : '';
	if(document.location.protocol != 'http:') {
		$UNIT_TEST_SCRIPT_LOADER
	   		.script(path + "../../../../src/net.js").wait()
	   		.script(path + "net-http.js").wait()
	} else {
		$UNIT_TEST_SCRIPT_LOADER
		   .script(path + "../../../../src/net.js").wait()
		   .script(path + "net-basic.js").wait()
		   .script(path + "net-usage.js").wait()
	}
});
