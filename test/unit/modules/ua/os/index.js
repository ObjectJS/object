$(document).ready(function() {
	var path = $LAB.needPath ? 'modules/ua/os/' : '';
	$LAB
	   .script(path + "../../../../../src/ua/os.js").wait()
	   .script(path + "os-test.js");
});
