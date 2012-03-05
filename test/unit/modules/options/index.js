$(document).ready(function() {
	var path = $UNIT_TEST_CONFIG.needPath ? 'modules/options/' : '';
	$UNIT_TEST_SCRIPT_LOADER
	   .script(path + "../../../../src/options.js").wait()
	   .script(path + "options-usage.js").wait()
});
