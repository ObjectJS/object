$(document).ready(function() {
	var path = $LAB.needPath ? 'utils/' : '';
	$LAB
		.script(path + 'utils-basic.js')
		.script(path + 'mustache.js')
});
