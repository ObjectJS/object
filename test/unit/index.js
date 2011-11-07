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
		{module:'dom', url:'modules/dom'}
	];
	for(var i=0,l=config.length; i<l; i++) {
		$LAB.script(config[i].url + '/index.js');
	}
});
