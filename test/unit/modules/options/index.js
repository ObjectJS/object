$(document).ready(function() {
	var path = $LAB.needPath ? 'modules/options/' : '';
	$LAB
	   .script(path + "../../../../src/options.js").wait()
	   .script(path + "options-usage.js").wait()
});
