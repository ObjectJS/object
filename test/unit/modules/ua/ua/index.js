$(document).ready(function() {
	var path = $UNIT_TEST_CONFIG.needPath ? 'modules/ua/ua/' : '';
	$UNIT_TEST_SCRIPT_LOADER
	   .script(path + "../../../../../src/ua/extra.js").wait()
	   .script(path + "ua-index.js").wait()
	   .script(path + "ua-extra.js").wait()
});
