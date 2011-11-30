$(document).ready(function() {
	var path = $UNIT_TEST_CONFIG.needPath ? 'modules/ua/flashdetect/' : '';
	$LAB
	   .script(path + "../../../../../src/ua/flashdetect.js").wait()
	   .script(path + "flashdetect-basic.js").wait()
});
