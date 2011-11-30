$(document).ready(function() {
	var path = $UNIT_TEST_CONFIG.needPath ? 'loader/' : '';
	$LAB
		.script(path + "loader-basic.js").wait()
		.script(path + "loader-usage.js").wait()
});
