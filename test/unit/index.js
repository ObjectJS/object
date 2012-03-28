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
		{module:'lunar', url:'modules/lunar'}
	];

	for (var i=0, l=config.length - 1; i < l; i++) {
		if (i == l - 1) {
			$UNIT_TEST_SCRIPT_LOADER.script(config[i].url + '/index.js', loadNext);
		} else {
			$UNIT_TEST_SCRIPT_LOADER.script(config[i].url + '/index.js');
		}
	}

	var delayedModules = [
		{module:'loader',url:'loader'},
		{module:'module',url:'module'}
	];

	var i = 0, l=delayedModules.length - 1;
	function loadNext() {
		if (l == -1 || i == l) {
			return;
		}
		$UNIT_TEST_SCRIPT_LOADER.script(delayedModules[i].url + '/index.js', function() {
			i ++;
			loadNext();
		});
	}
});

