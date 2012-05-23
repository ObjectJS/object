$(document).ready(function() {
	var path = $UNIT_TEST_CONFIG.needPath ? 'modules/ua/os/' : '';
	$UNIT_TEST_SCRIPT_LOADER
	   .script(path + "../../../../../src/ua/os.js").wait()
	   .script(path + "os-usage.js");
});
