$(document).ready(function() {
	var path = $UNIT_TEST_CONFIG.needPath ? 'modules/lunar/' : '';
	$LAB
	   .script(path + "../../../../src/lunar.js").wait()
	   .script(path + "lunar-usage.js").wait()
});
