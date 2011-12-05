$(document).ready(function() {
	var path = $UNIT_TEST_CONFIG.needPath ? 'utils/' : '';
	$UNIT_TEST_SCRIPT_LOADER
		.script(path + 'util-basic.js')
		.script(path + 'mustache-usage.js')
});
