$(document).ready(function() {
	var path = $LAB.needPath ? 'modules/events/' : '';
	$LAB
	   .script(path + "../../../../src/events.js").wait()
	   .script(path + "events-basic.js").wait()
	   .script(path + "events-usage.js").wait()
	   .script(path + "events-onxxx.js").wait()
});
