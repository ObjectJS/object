$(document).ready(function() {
	var path = $UNIT_TEST_CONFIG.needPath ? 'modules/dom/' : '';
	$UNIT_TEST_SCRIPT_LOADER
	   .script(path + "../../../../src/dom/index.js").wait()
	   .script(path + "dom-basic.js").wait()
	   .script(path + "dom-usage.js").wait()
	   //.script(path + "dom-ready.js").wait()
});
