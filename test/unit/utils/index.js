$(document).ready(function() {
	var path = $UNIT_TEST_CONFIG.needPath ? 'utils/' : '';
	$LAB
		.script(path + 'util-basic.js')
		.script(path + 'mustache-usage.js')
});
