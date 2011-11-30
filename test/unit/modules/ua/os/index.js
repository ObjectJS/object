$(document).ready(function() {
	var path = $UNIT_TEST_CONFIG.needPath ? 'modules/ua/os/' : '';
	$LAB
	   .script(path + "../../../../../src/ua/os.js").wait()
	   .script(path + "os-usage.js");
});
