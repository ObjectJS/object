$(document).ready(function() {
	var path = $LAB.needPath ? 'modules/ua/flashdetect/' : '';
	$LAB
	   .script(path + "../../../../../src/ua/flashdetect.js").wait()
	   .script(path + "flashdetect-basic.js").wait()
});
