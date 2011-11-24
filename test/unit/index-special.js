$(document).ready(function() {
	$UNIT_TEST_CONFIG.needPath = true;
	var config = [
		{module:'loader',url:'loader'},
		{module:'dom', url:'modules/dom'},
		{module:'net', url:'modules/net'},
		{}
	];
	for(var i=0,l=config.length - 1; i<l; i++) {
		$LAB.script(config[i].url + '/index-special.js');
	}
});
