module('ua-extra');

test('ua.extra.*', function() {
	object.use('ua.extra, sys', function(exports, ua, sys) {
		ok(sys.modules['ua.extra'] != null, 'ua.extra is imported');
		ok(ua.extra.__detectUAExtra != null, 'ua.extra.__detectUAExtra is ready');
		ok(ua.ua.shell != null, 'ua.ua.shell is ok : ' + ua.ua.shell);
		ok(ua.ua[ua.ua.shell] != null, 'shell version is ok : ' + ua.ua[ua.ua.shell]);
	});
});

var userAgents = [
//Maxthon
{
	str : 'Mozilla/5.0 (Windows; U; Windows NT 6.0; en-US) AppleWebKit/533.1 (KHTML, like Gecko) Maxthon/3.0.8.2 Safari/533.1',
	shell : 'maxthon',
	shell_version: 3.082
},
{
	str : 'Mozilla/5.0 (compatible; MSIE 9.0; Windows NT 6.1; Trident/4.0; WOW64; Trident/5.0; .NET CLR 3.5.30729; .NET CLR 3.0.30729; .NET CLR 2.0.50727; Media Center PC 6.0; Maxthon 2.0)',
	shell : 'maxthon',
	shell_version: 2.0
},
{
	str : 'Mozilla/4.0 (compatible; MSIE 8.0; Windows NT 6.1; Trident/4.0; SLCC1; .NET CLR 2.0.50727; Media Center PC 5.0; .NET CLR 3.5.30729; .NET CLR 3.0.30618; MAXTHON 2.0)',
	shell : 'maxthon',
	shell_version: 2.0
},
{
	str : 'Mozilla/4.0 (compatible; MSIE 8.0; Windows NT 6.0; SLCC2; Maxthon 2.0; DigExt; Zune 4.7)',
	shell : 'maxthon',
	shell_version: 2.0
},
{
	str : 'Mozilla/4.0 (compatible; MSIE 8.0; Windows NT 5.1; Trident/4.0; .NET CLR 2.0.50727; .NET CLR 3.0.04506.30; .NET CLR 3.0.4506.2152; .NET CLR 3.5.30729; Maxthon 2; MAXTHON 2.0)',
	shell : 'maxthon',
	shell_version: 2.0
},
{
	str : 'Mozilla/4.0 (compatible; MSIE 8.0; Windows NT 5.1; Trident/4.0; Maxthon; .NET CLR 2.0.50727; InfoPath.2; .NET CLR 3.0.4506.2152; .NET CLR 3.5.30729)',
	shell : 'maxthon',
	shell_version: 0
},
//TheWorld
{
	str : 'Mozilla/5.0 (compatible; MSIE 9.0; Windows NT 6.0; Trident/5.0; TheWorld)',
	shell : 'theworld',
	shell_version: 0
},
{
	str : 'Mozilla/4.0 (compatible; MSIE 7.0; Windows NT 6.1; Trident/5.0; SLCC2; .NET CLR 2.0.50727; .NET CLR 3.5.30729; .NET CLR 3.0.30729; Media Center PC 6.0; TheWorld)',
	shell : 'theworld',
	shell_version: 0
},
//Tencent Traveler
{
	str : 'Mozilla/4.0 (compatible; MSIE 8.0; Windows NT 6.0; Trident/4.0; TencentTraveler 4.0; Trident/4.0; SLCC1; Media Center PC 5.0; .NET CLR 2.0.50727; .NET CLR 3.5.30729; .NET CLR 3.0.30618)',
	shell : 'tt',
	shell_version: 4.0
},
{
	str : 'Mozilla/4.0 (compatible; MSIE 6.0; Windows NT 5.1; SV1; QQDownload 551; QQDownload 661; TencentTraveler 4.0; (R1 1.5))',
	shell : 'tt',
	shell_version: 4.0
},
//360
{
	str : '360SE',
	shell : 'se360',
	shell_version: 3 
},
//Sogou
{
	str : 'SE 3.1.1',
	shell : 'sogou',
	shell_version: 3.11 
},
//QQBrowser
{
	str : 'QQBrowser.1.2.2',
	shell : 'qqbrowser',
	shell_version: 1.22 
},
{
	str : 'QQBrowser. 11.2.2',
	shell : 'qqbrowser',
	shell_version: 1.22 
}
]
test('ua.extra.shell/shell_version', function() {
	object.use('ua.extra, sys', function(exports, ua, sys) {
		var detect = ua.extra.__detectUAExtra;
		for(var i=0,l=userAgents.length,current; i<l; i++) {
			current = userAgents[i];
			var o =detect(current.str);
			equal(o.shell, current.shell, 'shell is ok : ' + current.shell+ ', ' + current.str);
			equal(o[o.shell], current.shell_version, 'shell_version is ok : ' + current.shell_version+ ', ' + current.str);
		}
	});
});
