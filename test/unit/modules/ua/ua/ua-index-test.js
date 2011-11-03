module('ua-index');

test('ua.*', function() {
	object.use('ua, sys', function(exports, ua, sys) {
		ok(sys.modules['ua'] != null, 'ua is imported');
		ok(ua.numberify != null, 'ua.numberify is ready');
		ok(ua.__detectUA != null, 'ua.__detectUA is ready');
		ok(ua.ua.core != null, 'ua.ua.core is ok : ' + ua.ua.core);
		ok(ua.ua.shell != null, 'ua.ua.shell is ok : ' + ua.ua.shell);
		ok(ua.ua[ua.ua.core] != null, 'core version is ok : ' + ua.ua[ua.ua.core]);
		ok(ua.ua[ua.ua.shell] != null, 'shell version is ok : ' + ua.ua[ua.ua.shell]);
	});
});

test('ua.numberify', function() {
	object.use('ua', function(exports, ua) {
		var numberify = ua.numberify;
		
		var edges = $LAB.globals.testEdges;
		for(var prop in edges) {
			try {
				numberify(edges[prop]);
				ok(true, 'ua.numberify ' + prop + ' is ok');
			} catch (e) {
				ok(false, 'ua.numberify ' + prop + ' is ok');
			}
		}

		var tests = {
			'' : NaN,
			' ' : NaN,
			'          ':NaN,
			'.' : NaN,
			'!' : NaN,
			'a' : NaN,
			'NaN':NaN,
			'..': NaN,
			'.N.': NaN,
			'1..': 1,
			'.1.': 0.1,
			'1.1': 1.1,
			'.1.1':0.11,
			'.1.1.':0.11,
			'1.2_3':1.2,
			'1.2.3':1.23,
			'1.234.5':1.2345,
			'1.234.5N':1.2345,
			'1.1111111111111111111111111111111111111' : 1.1111111111111111111111111111111111111
		}
		for(var prop in tests) {
			var num = numberify(prop);
			if(isNaN(num) && isNaN(tests[prop])) {
				ok(true, prop + ' numberify is ok');
			} else if(!isNaN(tests[prop])) {
				equal(num, tests[prop], prop + ' numberify is ok');
			}
		}
	});
});

var userAgents = [
//IE
{
	str: 'Mozilla/5.0 (compatible; MSIE 10.0; Windows NT 6.1; WOW64; Trident/6.0)',
	core: 'ie',
	core_version: document.documentMode,
	shell: 'ieshell',
	shell_version: 10	//Trident + 4
},{
	str: 'Mozilla/1.22 (compatible; MSIE 10.0; Windows 3.1)',
	core: 'ie',
	core_version: 10,
	shell: 'ieshell',
	shell_version: 10
},
{
	str: 'Mozilla/4.0 (compatible; MSIE 8.0; Windows NT 6.1; WOW64; Trident/4.0; SLCC2;',
	core: 'ie',
	core_version: document.documentMode,
	shell: 'ieshell',
	shell_version: 8
},
//Chrome
{
	str: 'Mozilla/5.0 (X11; U; CrOS i686 0.9.130; en-US) AppleWebKit/534.10 (KHTML, like Gecko) Chrome/8.0.',
	core: 'webkit',
	core_version: 534.1,
	shell: 'chrome',
	shell_version: 8.0 
},
{
	str: 'Mozilla/5.0 (Windows NT 5.1) AppleWebKit/535.6 (KHTML, like Gecko) Chrome/16.0.897.0 Safari/535.6',
	core: 'webkit',
	core_version: 535.6,
	shell: 'chrome',
	shell_version: 16.0897
},
{
	str: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/535.2 (KHTML, like Gecko) Ubuntu/11.04 Chromium/15.0.871.0 Chrome/15.0.871.0 Safari/535.2',
	core: 'webkit',
	core_version: 535.2,
	shell: 'chrome',
	shell_version: 15.0871
},
{
	str: 'Chrome/15.0.860.0 (Windows; U; Windows NT 6.0; en-US) AppleWebKit/533.20.25 (KHTML, like Gecko) Version/15.0.860.0',
	core: 'webkit',
	core_version: 533.2025,
	shell: 'chrome',
	shell_version: 15.086
},
{
	str: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_7_2) AppleWebKit/535.1 (KHTML, like Gecko) Chrome/14.0.835.186 Safari/535.1',
	core: 'webkit',
	core_version: 535.1,
	shell: 'chrome',
	shell_version: 14.0835186
},
//Safari
{
	str: 'Mozilla/5.0 (iPad; U; CPU OS 3_2 like Mac OS X; en-us) AppleWebKit/531.21.10 (KHTML, like Gecko) Version/4.0.4 Mobile/7B334b Safari/531.21.10',
	core: 'webkit',
	core_version: 531.211,
	shell: 'safari',
	shell_version: 4.04
},
{
	str: 'Mozilla/5.0 (Linux; U; Android 2.1; en-us; Nexus One Build/ERD62) AppleWebKit/530.17 (KHTML, like Gecko) Version/4.0 Mobile Safari/530.17',
	core: 'webkit',
	core_version: 530.17,
	shell: 'safari',
	shell_version: 4.0 
},
{
	str: 'Mozilla/5.0 (Macintosh; U; Intel Mac OS X 10_6_7; da-dk) AppleWebKit/533.21.1 (KHTML, like Gecko) Version/5.0.5 Safari/533.21.1',
	core: 'webkit',
	core_version: 533.211,
	shell: 'safari',
	shell_version: 5.05 
},
{
	str: 'Mozilla/5.0 (iPhone; U; CPU iPhone OS 4_1 like Mac OS X; en-us) AppleWebKit/532.9 (KHTML, like Gecko) Version/4.0.5 Mobile/8B117 Safari/6531.22.7',
	core: 'webkit',
	core_version: 532.9,
	shell: 'safari',
	shell_version: 4.05
},
{
	str: 'Mozilla/5.0 (Macintosh; U; Intel Mac OS X; en-us) AppleWebKit/525.1+ (KHTML, like Gecko) Version/3.0.4 Safari/523.10',
	core: 'webkit',
	core_version: 525.1,
	shell: 'safari',
	shell_version: 3.04
},
{
	str: 'Mozilla/5.0 (Macintosh; U; PPC Mac OS X; fi-fi) AppleWebKit/418.8 (KHTML, like Gecko) Safari/419.3',
	core: 'webkit',
	core_version: 418.8,
	shell: 'safari',
	shell_version: undefined
},
//Firefox
{
	str: 'Mozilla/5.0 (Windows NT 6.1; WOW64; rv:6.0a2) Gecko/20110613 Firefox/6.0a2',
	core: 'gecko',
	core_version: 6.0,
	shell: 'firefox',
	shell_version: 6.0
},
{
	str: 'Mozilla/5.0 (X11; Linux i686 on x86_64; rv:5.0a2) Gecko/20110524 Firefox/5.0a2',
	core: 'gecko',
	core_version: 5.0,
	shell: 'firefox',
	shell_version: 5.0
},
{
	str: 'Mozilla/5.0 (X11; Linux) Gecko Firefox/5.0',
	core: 'gecko',
	core_version: 0,
	shell: 'firefox',
	shell_version: 5.0
},
{
	str: 'Mozilla/5.0 (X11; Linux x86_64; rv:2.0b9pre) Gecko/20110111 Firefox/4.0b9pre',
	core: 'gecko',
	core_version: 2.0,
	shell: 'firefox',
	shell_version: 4.0
},
//Opera
{
	str: 'Opera/9.80 (Windows NT 6.1; U; es-ES) Presto/2.9.181 Version/12.00',
	core: 'presto',
	core_version: 2.9181,
	shell: 'opera',
	shell_version: 12.0
},
{
	str: 'Opera/9.80 (Windows NT 6.1; Opera Tablet/15165; U; en) Presto/2.8.149 Version/11.1',
	core: 'presto',
	core_version: 2.8149,
	shell: 'opera',
	shell_version: 11.1
},
{
	str: 'Mozilla/5.0 (compatible; MSIE 9.0; Windows NT 6.1; de) Opera 11.51',
	core: 'presto',
	core_version: undefined,
	shell: 'opera',
	shell_version: 11.51 
},
{
	str: 'Mozilla/5.0 (Windows NT 5.1; U; en; rv:1.8.1) Gecko/20061208 Firefox/5.0 Opera 11.11',
	core: 'presto',
	core_version: undefined,
	shell: 'opera',
	shell_version: 11.11 
},
{
	str: 'Mozilla/5.0 (Windows; U; Windows NT 6.1; en-US; rv:1.9.2.13) Gecko/20101213 Opera/9.80 (Windows NT 6.1; U; zh-tw) Presto/2.7.62 Version/11.01',
	core: 'presto',
	core_version: 2.762,
	shell: 'opera',
	shell_version: 11.01 
}
];

test('ua.core/shell/core_version/shell_version', function() {
	object.use('ua, sys', function(exports, ua, sys) {
		var detect = ua.__detectUA;
		for(var i=0,l=userAgents.length,current; i<l; i++) {
			current = userAgents[i];
			var o =detect(current.str);
			equal(o.core, current.core, 'core is ok : ' + current.core+ ', ' + current.str);
			equal(o.shell, current.shell, 'shell is ok : ' + current.shell+ ', ' + current.str);
			equal(o[o.core], current.core_version, 'core_version is ok : ' + current.core_version + ', ' + current.str);
			equal(o[o.shell], current.shell_version, 'shell_version is ok : ' + current.shell_version+ ', ' + current.str);
		}
	});
});
