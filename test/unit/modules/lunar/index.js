$(document).ready(function() {
	var path = $UNIT_TEST_CONFIG.needPath ? 'modules/lunar/' : '';
	object.Loader.loadScript(path + "../../../../src/lunar.js", function() {
		// make sure lunar.js loaded firstly
		// why only lunar.js??
		$UNIT_TEST_SCRIPT_LOADER.script(path + "lunar-usage.js").wait()
	});
	
});
