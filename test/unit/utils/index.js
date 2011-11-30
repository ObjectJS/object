$(document).ready(function() {
	var path = $UNIT_TEST_CONFIG.needPath ? 'utils/' : '';
	$LAB
		.script(path + 'utils-basic.js')
		.script(path + 'mustache.js')
});
