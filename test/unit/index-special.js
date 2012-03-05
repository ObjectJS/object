$(document).ready(function() {
	$UNIT_TEST_CONFIG.needPath = true;
	var config = [
		{module:'dom', url:'modules/dom'},
		{module:'net', url:'modules/net'},
		{}
	];
	for(var i=0,l=config.length - 1; i<l; i++) {
		$UNIT_TEST_SCRIPT_LOADER.script(config[i].url + '/index-special.js');
	}
});
