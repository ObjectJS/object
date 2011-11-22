$(document).ready(function() {
	$LAB.needPath = true;
	var config = [
		{module:'class', url:'class'},
		{module:'loader',url:'loader'},
		{module:'module',url:'module'},
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
		{}
	];
	for(var i=0,l=config.length - 1; i<l; i++) {
		$LAB.script(config[i].url + '/index.js');
	}
});
