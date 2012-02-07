$(document).ready(function() {
	var path = $UNIT_TEST_CONFIG.needPath ? 'loader/' : '';
	$UNIT_TEST_SCRIPT_LOADER
		.script(path + "loader-basic.js").wait()
		.script(path + "loader-usage.js").wait()
});
