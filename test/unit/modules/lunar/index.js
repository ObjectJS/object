$(document).ready(function() {
	var path = $LAB.needPath ? 'modules/lunar/' : '';
	$LAB
	   .script(path + "../../../../src/lunar.js").wait()
	   .script(path + "lunar-usage.js").wait()
});
