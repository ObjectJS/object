$(document).ready(function() {
	var path = $UNIT_TEST_CONFIG.needPath ? 'object/' : '';
	$LAB
		.script(path + "object-functions-basic.js")
		.script(path + "object-functions-usage.js")
});
