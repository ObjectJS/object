$(document).ready(function() {
	var path = $UNIT_TEST_CONFIG.needPath ? 'object/' : '';
	$UNIT_TEST_SCRIPT_LOADER
		.script(path + "object-functions-basic.js")
		.script(path + "object-functions-usage.js")
});
