$(document).ready(function() {
	var path = $LAB.needPath ? 'loader/' : '';
	$LAB
		//.script(path + "loader-basic.js");
		.script(path + "loader-module.js");
});
