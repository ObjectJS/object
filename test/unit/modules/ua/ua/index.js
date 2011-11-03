$(document).ready(function() {
	var path = $LAB.needPath ? 'modules/ua/ua/' : '';
	$LAB
	   .script(path + "../../../../../src/ua/extra.js").wait()
	   .script(path + "ua-index-test.js").wait()
	   .script(path + "ua-extra-test.js").wait()
});
