$(document).ready(function() {
	var path = $UNIT_TEST_CONFIG.needPath ? 'loader/' : '';
	$LAB
		.script(path + "loader-special.js")
		.script(path + "loader-module.js")
});
