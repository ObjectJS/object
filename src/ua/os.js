/**
 * @namespace
 * @name ua.extra
 */
object.add('ua.os', 'sys', function(exports, sys) {

var uamodule = sys.modules['ua'];

var numberify = function(s) {
	var c = 0;
	// convert '1.2.3.4' to 1.234
	return parseFloat(s.replace(/_/g, '.').replace(/\./g, function() {
		return (c++ === 0) ? '.' : '';
	}));
};
if (uamodule) {
	this._detectOS = detectOS;
	var o = detectOS(navigator.userAgent.toLowerCase());
	object.extend(uamodule.ua, o);
}

//传入ua和numberify，便于对detectOS进行单元测试
function detectOS(ua) {
	ua = ua || navigator.userAgent;
	ua = ua.toLowerCase();
	
	var osDetecters = [
	//windows
	{core : 'windowsnt',	match : function(ua) {
								return /windows\snt/.test(ua) && !/xblwp7/.test(ua);
							},							versionRule : /windows nt\s([\.\d]*)/},
	{core : 'windowsnt',	match : /windows\sxp/,	version : 5.1},
	{core : 'windowsnt', 	match : /windows\s2000/, 	version : 5.0},
	{core : 'windowsnt', 	match : /winnt/,			version : 4.0},
	{core : 'windows',		match : /windows me/,		version : 'me'},
	{core : 'windows',		match : /windows 98/,		version : '98'},
	{core : 'windows',		match : /windows 95/,		version : '95'},
	{core : 'windows',		match : /win16/,			version : '3.1'},
	{core : 'windows/phone',match : /windows\sphone/,	versionRule: /windows phone os ([\d\.]*)/},
	{core : 'windows/phone',match : /xblwp7/,			version: 7.0},
	{core : 'windows/mobile',match: /windows mobile|wce|windows ce|pocket pc|wince/,	
														versionRule : /iemobile ([\.\d]*)/},
	{core : 'windows',		match : /win/,			version : 'unknown'},
	//android	
	{core : 'android', 		match : /\sandroid/,		versionRule:/android ([^\s]*);/},

	//linux
	{core : 'linux/debian',	match : /debian/, 		versionRule : /debian[\s\/-]([\.\d]*)/},
	{core : 'linux/redhat',	match : /red\shat/, 		versionRule : /red hat[\s\/-]([\.\d]*)/},
	{core : 'linux/fedora',	match : /fedora/, 		versionRule : /fedora[\s\/-]([\.\d]*)/},
	{core : 'linux/ubuntu',	match : /ubuntu/, 		versionRule : /ubuntu[\s\/-]([\.\d]*)/},
	{core : 'linux/suse',	match : /suse/, 			versionRule : /suse[\s\/-]([\.\d]*)/},
	{core : 'linux/mint',	match : /mint/, 			versionRule : /mint[\s\/-]([\.\d]*)/},
	{core : 'linux/centos',	match : /centos/, 		versionRule : /centos[\s\/-]([\.\d]*)/},
	//{core : 'linux/asplinux',match: [/asplinux/,		versionRule : /asplinux[\/-\s]([\.\d]*)/},
	{core : 'linux/gentoo',	match : /gentoo/, 		version : 'unknown'},
	{core : 'linux',		match : /linux/,			version : 'unknown'},
	//chromeOS
	{core : 'chromeos' ,	match : /cros/,  			version: 'unknown'},
	//unix
	{core : 'unix/sunos' ,	match : /sunos/,  		version: 'unknown'},
	{core : 'unix/freebsd',	match : /freebsd/,  		version: 'unknown'},
	{core : 'unix/openbsd',	match : /openbsd/,  		version: 'unknown'},
	{core : 'unix/aix' ,	match : /aix/,  			version: 'unknown'},
	{core : 'unix/hp_ux' ,	match : /hp-ux/,  		version: 'unknown'},
	//{core : 'unix/irix64',match : /irix64/,  		version: 'unknown'},
	{core : 'unix',			match : /x11/,			version: 'unknown'},
	//mac
	{core : 'macos' ,		match : /mac_powerpc|ppc/,version: 'ppc'},
	{core : 'macos' ,		match : /intel/,  		version: 'intel'},
	{core : 'macos' ,		match : /mac_68000|68k/,  version: '68k'},
	//ios 
	{core : 'ios',			match : function(ua) {
		   						return /applewebkit/.test(ua) && / mobile\//.test(ua) && /like/.test(ua);
	   						},							versionRule: /os ([\_\.\d]*)/},
	{core : 'macos' ,		match : /mac/,  			version: 'unknown'},
	//ibm os/2
	{core : 'os2' ,			match : function(ua) {
								return /os\/2|ibm-webexplorer/.test(ua) || navigator.appVersion.indexOf("os/2") != -1;
							},							version: 'unknown'},
	//palmos
	{core : 'palmos',		match : /palmos/,							version: 'unknown'},
	//other mobile os
	{core : 'symbian',		match : /symbian|s60|symbos|symbianos|series40|series60/,
																		versionRule: /symbian(?:os)?\/([\d\.]*);/},
	{core : 'blackberry',	match : function(ua) {
								return /blackberry/.test(ua) || /rim\stablet\sos/.test(ua);
							}, 	versionRule: /(?:version\/|blackberry[\d]{4}\/)([\d\.]*)/},
	{core : 'webos', 		match : /webos/,							versionRule:/webos\/([^\s]*);/}
	];

	//http://forums.precentral.net/palm-pre-pre-plus/277613-webos-2-1-user-agent.html
	//what is the relationship between webos and palmos????

	function isArray(obj) {
		return Object.prototype.toString.call(obj) == '[object Array]';
	}

	function isRegExp(obj) {
		return Object.prototype.toString.call(obj) == '[object RegExp]';
	}

	function isFunction(obj) {
		return typeof obj == 'function';
	}

	function assertTrue(bool, msg) {
		if(!bool) {
			throw new Error(msg);
		}
	}

	var o = {};

	for(var i=0, l=osDetecters.length, current, matchFlag = false; i<l; i++) {
		current = osDetecters[i];
		var match = current.match;
		assertTrue(isRegExp(match) || isFunction(match), 'match rule should be regexp or function');
		if(isFunction(match)) {
			matchFlag = match(ua);
		} else if(isRegExp(match)) {
			matchFlag = match.test(ua);
		}
		if(!matchFlag) {
			continue;
		}
		var parent=null, packages=current.core.split('\/'), pLength=packages.length;
		if(pLength > 1) {
			o.oscore = packages[0];
			parent = o;
			for(var m=0; m<pLength - 1; m++) {				
				parent = parent[packages[m]] = {};
			}
		} else {
			o.oscore = current.core;
		}
		var version = current.version || 'unknown';
		if(current.versionRule) {
			assertTrue(isRegExp(current.versionRule), 'version rule should be regexp');
			m = ua.match(current.versionRule);
			if(m && m[1]) version = numberify(m[1]);
		}
		if(parent) {
			parent[packages[pLength - 1]] = version;
		} else {
			o[o.oscore] = version;
		}
		break;
	}
	

	if(o.ios) {
		m = ua.match(/ipad|ipod|iphone/);
		if (m && m[0]) {
			o[m[0]] = o.ios;
		}
	}
	if(!matchFlag) {
		o.oscore = 'unknown';
	}

	//detect resolution
	if(window.devicePixelRatio >= 2) {
		o.resolution = {
			width : screen.width  * window.devicePixelRatio,
			height: screen.height * window.devicePixelRatio
		};
	} else {
		o.resolution = {
			width: screen.width,
			height: screen.height
		}
	}

	//detect direction
	var isMobile = typeof window.orientation != 'undefined' ? true : false;
	if(isMobile) {
		o.orientation = window.innerWidth > window.innerHeight ? 'profile' : 'landscape';
	} else {
		o.orientation = undefined;
	}

	return o;
}
});

