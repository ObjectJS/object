$(document).ready(function() {
     var path = $UNIT_TEST_CONFIG.needPath ? 'module/' : '';
     $UNIT_TEST_SCRIPT_LOADER
		.script(path + 'module-usage.js')
		.script(path + 'module-commonjs.js');
});
