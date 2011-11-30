$(document).ready(function() {
	var path = $UNIT_TEST_CONFIG.needPath ? 'modules/events/' : '';
	$LAB
	   .script(path + "../../../../src/events.js").wait()
	   //.script(path + "events-basic.js").wait()
	   //.script(path + "events-usage.js").wait()
	   .script(path + "events-onxxx.js").wait()
});
