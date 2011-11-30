$(document).ready(function() {
	var path = $UNIT_TEST_CONFIG.needPath ? 'modules/options/' : '';
	$LAB
	   .script(path + "../../../../src/options.js").wait()
	   .script(path + "options-usage.js").wait()
});
