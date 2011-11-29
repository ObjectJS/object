$(document).ready(function() {
	var path = $UNIT_TEST_CONFIG.needPath ? 'modules/lunar/' : '';
	Loader.loadScript(path + "../../../../src/lunar.js", function() {
		// make sure lunar.js loaded firstly
		// why only lunar.js??
		$LAB.script(path + "lunar-usage.js").wait()
	});
	
});
