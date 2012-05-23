module("os-usage");
test('basic info in module ua.os', function() {
	expect(9);
	object.use('ua.os', function(exports, ua) {
		ok(ua.os != null, 'ua.os loaded successfully');
		ok(ua.os.oscore != null, 'ua.os.oscore : ' + ua.os.oscore);
		ok(ua.os[ua.os.oscore] != null, 'ua.os.windowsnt : ' + ua.os[ua.os.oscore]);
		ok(ua.os.resolution != null, 'ua.os.resolution is not null');
		ok(ua.os.resolution.width > 0, 'ua.os.resolution.width : ' + ua.os.resolution.width);
		ok(ua.os.resolution.height > 0, 'ua.os.resolution.height : ' + ua.os.resolution.height);
		ok(ua.os.hasOwnProperty('orientation'), 'ua.os hasOwnProperty : orientation');
		ok(ua.os.orientation == 'unknown', 'ua.os.orientation : ' + ua.os.orientation);
		ok(ua.os._detectOS != null, 'detectOS method is defined');
	});
});

test('simulate userAgent - unknown',function() {
	object.use('ua.os', function(exports, ua) {
		var detectOS = ua.os._detectOS, o;
		o = detectOS('2321321');
		equal(o.oscore, 'unknown', 'os core is unknown');
		o = detectOS('fda');
		equal(o.oscore, 'unknown', 'os core is unknown');
		o = detectOS('win');
		equal(o.oscore, 'windows', 'win is windows');
		o = detectOS('x11');
		equal(o.oscore, 'unix', 'x11 is unix');
	});
});

//http://www.useragentstring.com/
test('simulate userAgent - windows', function() {
	var userAgents = [
	 {core:'windowsnt',	
		 version:6.1,	
		 str:'Mozilla/5.0 (Windows NT 6.1; WOW64; rv:6.0a2) Gecko/20110613 Firefox/6.0a2'},
	 {core:'windowsnt',	
		 version:5.1,	
		 str:'Mozilla/5.0 (Windows; U; Windows XP; en-US; rv:1.8a4) Gecko/20040927'},
	 {core:'windowsnt',	
		 version:5.0,	
		 str:'Mozilla/5.0 (Windows; U; Windows 2000; en-US; rv:1.8a4) Gecko/20040927'},
	 {core:'windowsnt',	
		 version:4.0,
		 str:'Mozilla/5.0 (Windows; U; WinNT4.0; en-US; rv:1.7.9) Gecko/20050711 Firefox/1.5'},
	 {core:'windows',	
		 version:'me',	
		 str:'Mozilla/5.0 (Windows ME 6.1; rv:6.0a2) Gecko/20110613 Firefox/6.0a2'},
	 {core:'windows',	
		 version:'98',	
		 str:'Mozilla/5.0 (Windows 98; U; en; rv:1.8.0) Gecko/20060728 Firefox/1.5.0'},
	 {core:'windows',	
		 version:'95',	
		 str:'Mozilla/5.0 (Windows 95; U; en; rv:1.8.0) Gecko/20060728 Firefox/1.5.0'},
	 {core:'windows',	
		 version:'3.1',	
		 str:'Mozilla/5.0 (Win16; U; en; rv:1.8.0) Gecko/20060728 Firefox/1.5.0'},
	 {core:'windows',	
		 version: {'phone' : 7.0},				
		 str:'Mozilla/4.0 (compatible; MSIE 7.0; Windows Phone OS 7.0; Trident/3.1; IEMobile/7.0) '},
	 {core:'windows',	
		 version: {'phone' : 7.0},		
		 str:'Mozilla/4.0 (compatible; MSIE 7.0; Windows NT 6.1; XBLWP7; ZuneWP7)'},
	 {core:'windows',	
		 version: {'mobile': 6.12},				
		 str:'Mozilla/4.0 (compatible; MSIE 6.0; Windows CE; IEMobile 6.12)'},
	 {core:'windows',	
		 version: {'mobile': 'unknown'},				
		 str:'Mozilla/4.0 (compatible; MSIE 6.0; Windows CE; IEMobile)'},
	 {core:'windows',	
		 version:'unknown',
		 str:'Mozilla/4.0 (compatible; MSIE 6.0; Windows)'}];

	testUserAgentArray(userAgents);
});

test('simulate userAgent - linux', function() {
	var userAgents = [
	 {core:'linux',		
		 version: {'debian' : 1.814},
		 str: 'Mozilla/5.0 (X11; U; Linux i686; en-US; rv:1.8.1.4) Gecko/20070508 (Debian-1.8.1.4-2ubuntu5)'},
	 {core:'linux',		
		 version: {'ubuntu' : 9.25},
		 str: 'Mozilla/5.0 (X11; U; Linux i686; pl-PL; rv:1.9.0.2) Gecko/20121223 Ubuntu/9.25 (jaunty) Firefox/3.8'},
	 {core:'linux',		
		 version: {'ubuntu' : 7.04},
		 str: 'Mozilla/5.0 (X11; U; Linux i686; Ubuntu 7.04; de-CH; rv:1.8.1.5) Gecko/20070309 Firefox/2.0.0.5'},
	 {core:'linux',		
		 version: {'ubuntu' : 'unknown'},
		 str: 'Mozilla/5.0 (X11; U; Linux x86_64; en-US; rv:1.8.0.4) Gecko/20060608 Ubuntu/dapper Firefox/1.5.0.4'},
	 {core:'linux',		
		 version: {'debian' : 1.81},
		 str: 'Mozilla/5.0 (X11; U; Linux x86_64; en-US; rv:1.8.1.4)  Firefox/2.0.0.4 (Debian-1.8.1 Ubuntu-feisty)'},
	 {core:'linux',		
		 version: {'fedora' : 2.0019},
		 str: 'Mozilla/5.0 (X11; U; Linux i686; en-US; rv:1.8.1.19) Gecko/20081216 Fedora/2.0.0.19-1.fc8'},
	 {core:'linux',		
		 version: {'redhat' : 1.505},
		 str: 'Mozilla/5.0 (X11; U; Linux i686 (x86_64); en-US; rv:1.8.0.5) Gecko/20060726 Red Hat/1.5.0.5-0.el4.1'},
	 {core:'linux',		
		 version: {'redhat' : 'unknown'},
		 str: 'Mozilla/5.0 (X11; U; Linux i686 (x86_64); en-US; rv:1.8.0.5) Gecko/20060726 Red Hat'},
	 {core:'linux',		
		 version: {'suse' : 3.08},
		 str: 'Mozilla/5.0 (X11; U; Linux x86_64; en-US; rv:1.9.0.8) Gecko/2009032600 SUSE/3.0.8-1.1 Firefox/3.0.8'},
	 {core:'linux',		
		 version: {'mint' : 7},
		 str: 'Mozilla/5.0 (X11; U; Linux x86_64; en-US; rv:1.9.0.11) Gecko/2009060309 Linux Mint/7 Firefox/3.0.11'},
	 {core:'linux',		
		 version: {'centos' : 3.05},
		 str: 'Mozilla/5.0 (X11; U; Linux x86_64; en-US; rv:1.9.0.5) Gecko/2008122014 CentOS/3.0.5-1.el4.centos'},
	 {core:'linux',		
		 version: {'mint' : 'unknown'},
		 str: 'Mozilla/5.0 (X11; U; Linux x86_64; en-US; rv:1.9.0.8) Gecko/2009032600 Mint Firefox/3.0.8'},
	 {core:'linux',		
		 version: {'gentoo' : 'unknown'},
		 str: 'Mozilla/5.0 (X11; U; Linux x86_64; en-US; rv:1.9.0.11) Gecko/2009070612 Gentoo Firefox/3.0.11'},
	 {core:'linux',		
		 version: 'unknown',
		 str: 'Mozilla/5.0 (X11; U; Linux i686; ru; rv:1.8.0.4) Gecko/20060508 Firefox/1.5.0.4'},
	 {core:'linux',		
		 version: 'unknown',
		 str: 'Mozilla/5.0 (X11; U; Linux i686; en-US; rv:1.9.2.8) Gecko/20100727 Firefox/3.6.8'},
	  //Nokia N900
	 {core:'linux',		
		 version: 'unknown',
		 str: 'Mozilla/5.0 (X11; U; Linux armv7l; en-GB; rv:1.9.2b6pre) Gecko/20100318 Firefox/3.5 Maemo Browser 1.7.4.7 RX-51 N900'}
	];
	testUserAgentArray(userAgents);
});
test('simulate userAgent - unix', function() {
	var userAgents = [
	 {core:'unix',		
		 version: {'freebsd' : 'unknown'},
		 str: 'Mozilla/5.0 (X11; U; FreeBSD x86_64; en-US) AppleWebKit/534.16 (KHTML, like Gecko) '},
	 {core:'unix',		
		 version: {'sunos' : 'unknown'},
		 str: 'Mozilla/5.0 (X11; U; SunOS i86pc; fr; rv:1.9.0.4) Gecko/2008111710 Firefox/3.0.4'},
	 {core:'unix',		
		 version: {'openbsd' : 'unknown'},
		 str: 'Mozilla/5.0 (X11; U; OpenBSD sparc64; en-US; rv:1.8.1.6) Gecko/20070816 Firefox/2.0.0.6'},
	 {core:'unix',		
		 version: {'aix' : 'unknown'},
		 str: 'Mozilla/5.0 (X11; U; AIX 005A471A4C00; en-US; rv:1.0rc2) Gecko/20020514'},
	 {core:'unix',		
		 version: {'hp_ux' : 'unknown'},
		 str: 'Mozilla/5.0 (X11; U; HP-UX 9000/785; en-US; rv:1.0.0) Gecko/20020605'},
	 {core:'unix',		
		 version: 'unknown',
		 str: 'Mozilla/5.0 (X11; xx i686; rv:6.0) Gecko/20100101 Firefox/6.0'}
	];
	testUserAgentArray(userAgents);
});

test('simulate userAgent - mac/ios', function() {
	var userAgents = [
	 {core:'macos',		
		 version: '68k',
		 str: 'Mozilla/5.0 (Macintosh; U; 68k Mac OS X Mach-O; en-US; rv:1.6) Gecko/20040113'},
	 {core:'macos',		
		 version: '68k',
		 str: 'Mozilla/5.0 (Macintosh; U; mac_68000 Mac OS X Mach-O; en-US; rv:1.6) Gecko/20040113'},
	 {core:'macos',		
		 version: 'ppc',
		 str: 'Mozilla/5.0 (Macintosh; U; PPC Mac OS X Mach-O; en-US; rv:1.6) Gecko/20040113'},
	 {core:'macos',		
		 version: 'ppc',
		 str: 'Mozilla/5.0 (Macintosh; U; mac_powerpc Mac OS X Mach-O; en-US; rv:1.6) Gecko/20040113'},
	 {core:'macos',		
		 version: 'intel',
		 str: 'Mozilla/5.0 (Macintosh; U; Intel Mac OS X 10.5; en-US; rv:1.9.0.1) Gecko/2008070206'},
	 {core:'ios',		
		 version: 3.2,
		 str: 'Mozilla/5.0 (iPad; U; CPU OS 3_2 like Mac OS X; en-us) AppleWebKit/531.21.10 (KHTML, like Gecko) Version/4.0.4 Mobile/7B334b Safari/531.21.10'},
	 //http://www.gtrifonov.com/2009/04/08/iphone-user-agent-strings/
	 {core:'ios',		
		 version: 'unknown',
		 str: 'Mozilla/5.0 (iPhone; U; CPU like Mac OS X; en) AppleWebKit/420+ (KHTML, like Gecko) Version/3.0 Mobile/1A543a Safari/419.3'}
	];
	testUserAgentArray(userAgents);
});

test('simulate userAgent - chromeos', function() {
	var userAgents = [
	 {core:'chromeos',		
		 version: 'unknown',
		 str: 'Mozilla/5.0 (X11; U; CrOS i686 0.9.130; en-US) AppleWebKit/534.10 (KHTML, like Gecko) Chrome/8.0.'}
	];
	testUserAgentArray(userAgents);
});

test('simulate userAgent - android', function() {
	//http://www.gtrifonov.com/2011/04/15/google-android-user-agent-strings-2/
	var userAgents = [
	 {core:'android',		
		 version: 2.2,
		 str: 'Mozilla/5.0 (Linux; U; Android 2.2; en-us; Nexus One Build/FRF91) AppleWebKit/533.1 (KHTML, like Gecko) Version/4.0 Mobile Safari/533.1'},
	 {core:'android',		
		 version: 2.1,
		 str: 'Mozilla/5.0 (Linux; U; Android 2.1; en-us; Nexus One Build/ERD62) AppleWebKit/530.17 (KHTML, like Gecko) Version/4.0 Mobile Safari/530.17'},
	 {core:'android',		
		 version: 1.6,
		 str: 'Mozilla/5.0 (Linux; U; Android 1.6; en-gb; Dell Streak Build/Donut AppleWebKit/528.5+ (KHTML, like Gecko) Version/3.1.2 Mobile Safari/ 525.20.1'},
	 {core:'android',		
		 version: 2.1,
		 str: 'Mozilla/5.0 (Linux; U; Android 2.1-update1; de-de; HTC Desire 1.19.161.5 Build/ERE27) AppleWebKit/530.17 (KHTML, like Gecko) Version/4.0 Mobile Safari/530.17'}
	];
	testUserAgentArray(userAgents);
});

test('simulate userAgent - other mobiles', function() {
	var userAgents = [
	//http://www.developer.nokia.com/Community/Wiki/User-Agent_headers_for_Nokia_devices
	 {core:'symbian',		
		 version: 9.2,
		 str: 'Mozilla/5.0 (SymbianOS/9.2; U; Series60/3.1 NokiaXxx/1.0; Profile/MIDP-2.0 Configuration/CLDC-1.1) AppleWebKit/413 (KHTML, like Gecko) Safari/413'},
	 {core:'symbian',		
		 version: 9.3,
		 str: 'Mozilla/5.0 (SymbianOS/9.3; U; Series60/3.2 NokiaE75-1/110.48.125 Profile/MIDP-2.1 Configuration/CLDC-1.1 ) AppleWebKit/413 (KHTML, like Gecko) Safari/413'},
	 {core:'symbian',		
		 version: 9.4,
		 str: 'Mozilla/5.0 (SymbianOS/9.4; U; Series60/5.0 Nokia5800d-1/21.0.025; Profile/MIDP-2.1 Configuration/CLDC-1.1 ) AppleWebKit/413 (KHTML, like Gecko) Safari/413'},
	 {core:'symbian',		
		 version: 3,
		 str: 'Mozilla/5.0 (Symbian/3; Series60/5.2 NokiaN8-00/013.016; Profile/MIDP-2.1 Configuration/CLDC-1.1 ) AppleWebKit/525 (KHTML, like Gecko) Version/3.0 BrowserNG/7.2.8.10 3gpp-gba'},
	 {core:'symbian',		
		 version: 'unknown',
		 str: 'Mozilla/5.0 (Series40; NokiaX3-02/le6.32; Profile/MIDP-2.1 Configuration/CLDC-1.1) Gecko/20100401 S40OviBrowser/1.0.0.11.8'},
//http://supportforums.blackberry.com/t5/Web-and-WebWorks-Development/How-to-detect-the-BlackBerry-Browser/ta-p/559862
	 {core:'blackberry',		
		 version: 0.01,
		 str: 'Mozilla/5.0 (PlayBook; U; RIM Tablet OS 1.0.0; en-US) AppleWebKit/534.8+ (KHTML, like Gecko) Version/0.0.1 Safari/534.8+'},
	 {core:'blackberry',		
		 version: 7.001,
		 str: 'Mozilla/5.0 (BlackBerry; U; BlackBerry AAAA; en-US) AppleWebKit/534.11+ (KHTML, like Gecko) Version/7.0.0.1 Mobile Safari/534.11+'},
	 {core:'blackberry',		
		 version: 5.0093,
		 str: 'BlackBerry9000/5.0.0.93 Profile/MIDP-2.0 Configuration/CLDC-1.1 VendorID/179'},
	//http://forums.precentral.net/palm-pre-pre-plus/277613-webos-2-1-user-agent.html
	//webos和palmos到底是什么关系？
	 {core:'webos',		
		 version: 1.3,
		 str: 'Mozilla/5.0 (webOS/1.3; U; en-US) AppleWebKit/532.2 (KHTML, like Gecko) Version/1.0 Safari/532.2 Desktop/1.0'}
	];
	testUserAgentArray(userAgents);
});

test('simulate userAgent - others', function() {
	var userAgents = [
	 {core:'os2',		
		 version: 'unknown',
		 str: 'Mozilla/4.61 [en] (OS/2; U) '},
	 //http://palmos.combee.net/blog/User-AgentStrings.html
	 {core:'palmos',		
		 version: 'unknown',
		 str: 'Mozilla/5.0 [en] (PalmOS; U; WebPro/3.5; palm-MT64) '}
	];
	testUserAgentArray(userAgents);
});

test('simulate userAgent - iphone/ipad/ipod', function() {
	object.use('ua.os', function(exports, ua) {
		var detectOS = ua.os._detectOS, o;
		o = detectOS('Mozilla/5.0 (iPhone; U; CPU like Mac OS X; en) AppleWebKit/420+ (KHTML, like Gecko) Version/3.0 Mobile/1A543a Safari/419.3');
		ok(o.ios != null, 'ios is ok');
		equal(o.ios, o.iphone, 'ios is equal with iphone');

		o = detectOS('Mozilla/5.0 (iPad; U; CPU like Mac OS X; en) AppleWebKit/420+ (KHTML, like Gecko) Version/3.0 Mobile/1A543a Safari/419.3');
		ok(o.ios != null, 'ios is ok');
		equal(o.ios, o.ipad, 'ios is equal with ipad');

		o = detectOS('Mozilla/5.0 (iPod; U; CPU like Mac OS X; en) AppleWebKit/420+ (KHTML, like Gecko) Version/3.0 Mobile/1A543a Safari/419.3');
		ok(o.ios != null, 'ios is ok');
		equal(o.ios, o.ipod, 'ios is equal with ipod');
	});
});

test('test google caja', function() {
	object.use('ua.os', function(exports, ua) {
		var detectOS = ua.os._detectOS, o;
		navigator.cajaVersion = 1;
		o = detectOS();
		equal(o.caja, navigator.cajaVersion, 'caja version is ok');
	});
	
});

test('test processor', function() {
	object.use('ua.os', function(exports, ua) {
		var detectOS = ua.os._detectOS, o;
		o = detectOS();
		ok(o.processor == 32 || o.processor == 64, 'processor is 32-bit or 64-bit');

		o = detectOS('Mozilla/5.0 (Windows NT 6.1; WOW64; rv:6.0a2) Gecko/20110613 Firefox/6.0a2');
		equal(o.processor, 64, '64-bit processor');

		o = detectOS('Mozilla/5.0 (X11; Linux i686 on x86_64; rv:5.0a2) Gecko/20110524 Firefox/5.0a2');
		equal(o.processor, 64, '64-bit processor');

		o = detectOS('Mozilla/5.0 (X11; U; Linux amd64; en-US; rv:5.0) Gecko/20110619 Firefox/5.0');
		equal(o.processor, 64, '64-bit processor');

		o = detectOS('Mozilla/5.0 (Windows NT 6.1; Win64; x64; rv:5.0) Gecko/20110619 Firefox/5.0');
		equal(o.processor, 64, '64-bit processor');

		o = detectOS('Mozilla/5.0 (X11; Linux x86_64; rv:5.0) Gecko/20100101 Firefox/5.0 Firefox/5.0');
		equal(o.processor, 64, '64-bit processor');

		o = detectOS('Mozilla/5.0 (X11; U; OpenBSD sparc64; en-US; rv:1.8.1.6) Gecko/20070816 Firefox/2.0.0.6');
		equal(o.processor, 64, '64-bit processor');

		o = detectOS('Mozilla/5.0 (X11; U; Linux ppc64; en-US; rv:1.8.1.14) Gecko/20080418 Ubuntu/7.10 (gutsy) ');
		equal(o.processor, 64, '64-bit processor');

		equal(o.oscore, 'linux', 'is linux');
		equal(o.linux.ubuntu, 7.10, 'is ubuntu 7.10');
	});
});

test('test resolution', function() {
	object.use('ua.os', function(exports, ua) {
		var detectOS = ua.os._detectOS, o;
		o = detectOS();
		ok(o.resolution != null, 'resolution is not null');
		ok(o.resolution.width > 0, 'resolution.width > 0');
		ok(o.resolution.height > 0, 'resolution.height > 0');
		window.devicePixelRatio = 2;

		// window.devicePixelRatio == 1 in Opera...
		if (window.devicePixelRatio == 2) {
			o2 = detectOS();
			equal(o2.resolution.width, 2 * o.resolution.width, 'devicePixelRatio is used');
			equal(o2.resolution.height, 2 * o.resolution.height, 'devicePixelRatio is used');
		}
	});
});

test('test orientation', function() {
	object.use('ua.os', function(exports, ua) {
		var detectOS = ua.os._detectOS, o;
		o = detectOS();
		ok(o.orientation == 'unknown', 'orientation is not null');
		window.orientation = 'ok';
		o2 = detectOS();
		ok(o2.orientation == 'landscape', 'window.orientation != null, o.orientation will not be unknown');
	});
});
function testUserAgentArray(userAgents) {
	object.use('ua.os', function(exports, ua) {
		var detectOS = ua.os._detectOS, o;
		for(var i=0,current,l=userAgents.length; i<l; i++) {
			current = userAgents[i];
			o = detectOS(current.str);
			if(typeof current.version == 'object') {
				for(var prop in current.version) {
					equal(o.oscore, current.core, 'os core is ' + o.oscore);
					equal(o[o.oscore][prop], current.version[prop], 'type version is ' + current.version[prop]);
					ok(o[o.oscore][prop] === current.version[prop]
						&& o.oscore === current.core, 
						'core : ' + o.oscore + ', ' + 
						'type : ' + prop + ', ' + 
						'version : ' + current.version[prop] + ', ' + 
						'str : ' + current.str);
				}
			} else {
				equal(o.oscore, current.core, 'os core is ' + o.oscore);
				equal(o[o.oscore], current.version, 'os version is ' + current.version);
				ok(o.oscore === current.core, 
						'core : ' + o.oscore + ', ' + 
						'version : ' + current.version + ', ' + 
						'str : ' + current.str);
			}
		}
	});
}
