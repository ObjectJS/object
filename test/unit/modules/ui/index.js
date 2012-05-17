$(document).ready(function() {
	var path = $UNIT_TEST_CONFIG.needPath ? 'modules/ui/' : '';
	$UNIT_TEST_SCRIPT_LOADER
	   .script(path + "ui-basic.js").wait()
	   .script(path + "ui-addons.js").wait()
});

