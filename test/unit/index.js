$(document).ready(function() {
	$UNIT_TEST_CONFIG.needPath = true;
	var config = [
		{module:'class', url:'class'},
		{module:'object',url:'object'},
		{module:'utils', url:'utils'},
		{module:'ua/os', url:'modules/ua/os'},
		{module:'ua/ua', url:'modules/ua/ua'},
		{module:'ua/flashdetect', url:'modules/ua/flashdetect'},
		{module:'dom', url:'modules/dom'},
		{module:'events', url:'modules/events'},
		{module:'urlparse', url:'modules/urlparse'},
		{module:'options', url:'modules/options'},
		{module:'net', url:'modules/net'},
		{module:'lunar', url:'modules/lunar'},
		{module:'ui', url:'modules/ui'},
		{module:'loader',url:'loader'},
		{module:'module',url:'module'}
	];

	for (var i=0, l=config.length; i < l; i++) {
		$UNIT_TEST_SCRIPT_LOADER.script(config[i].url + '/index.js');
	}
});

