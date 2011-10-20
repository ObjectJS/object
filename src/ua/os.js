/**
 * @namespace
 * @name ua.extra
 */
object.add('ua.os', 'sys', function(exports, sys) {

var uamodule = sys.modules['ua'];

if (uamodule) {
	detectOS(navigator.userAgent.toLowerCase());
}

function detectOS(ua) {
	//windows
	var osDetectArray = [
	{core : 'windowsnt',	match : [/windows\snt/],		versionRule : /windows nt\s([\.\d]*)/},
	{core : 'windowsnt',	match : [/windows\sxp/],		version : 5.1},
	{core : 'windowsnt', 	match : [/windows\s2000/], 		version : 5.0},
	{core : 'windowsnt', 	match : [/winnt/],				version : 4.0},
	{core : 'windows',		match : [/windows me/],			version : 'me'},
	{core : 'windows',		match : [/windows 98/],			version : '98'},
	{core : 'windows',		match : [/windows 95/],			version : '95'},
	{core : 'windows',		match : [/win16/],				version : '3.1'},
	{core : 'windows/phone',match : [/windows\sphone|wp7/],	version: 7.0},
		//versionRule: [{rule : /windows phone os ([\d\.]*)/},{rule : 'xblwp7', 			version: 7.0}]},
	{core : 'windows',		match : [/windows mobile/],	version : 'mobile'},
	{core : 'windows', 		match : [/wce/, function() {
			return ['WinCE', 'Windows CE', 'Pocket PC', 'WCE'].indexOf(navigator.platform) != -1
		}], version: 'ce'},
	//linux
	{core : 'linux/debian',		match : [/debian/], 	versionRule : /debian[\/-]([\.\d]*)/, version: 'debian'},
	{core : 'linux/redhat',		match : [/red\shat/], 	versionRule : /red hat[\/-]([\.\d]*)/,version: 'redhat'},
	{core : 'linux/fedora',		match : [/fedora/], 	versionRule : /fedora[\/-]([\.\d]*)/, version: 'fedora'},
	{core : 'linux/ubuntu',		match : [/ubuntu/], 	versionRule : /ubuntu[\/-]([\.\d]*)/, version: 'ubuntu'},

	//unix
	{core : 'unix' ,		match : [/sunos/],  	version: 'sunos'},
	{core : 'unix' ,		match : [/freebsd/],  	version: 'freebsd'},
	{core : 'unix' ,		match : [/openbsd/],  	version: 'openbsd'},
	{core : 'unix' ,		match : [/aix/],  		version: 'aix'},
	{core : 'unix' ,		match : [/hp-ux/],  	version: 'hp_ux'},
	{core : 'unix' ,		match : [/irix64/],  	version: 'irix64'},

	//mac
	{core : 'macos' ,	match : [/mac_68000|68k/],  	version: '68k'},
	{core : 'macos' ,	match : [/mac_powerpc|ppc/], 	version: 'ppc'},
	{core : 'macos' ,	match : [/intel/],  			version: 'intel'},

	//ibm os/2
	{core : 'os2' ,		match : [/os\/2|ibm-webexplorer/, function() {
			return navigator.appVersion.indexOf("os/2") != -1;
		}]},

	//palmos
	{core : 'palmos',	match : [function() {return navigator.platform == 'PalmOS';}]},

	//mobile os
	{core : 'android', 	match : [/\sandroid/],	versionRule:/android ([^\s]*);/},
	{core : 'symbian',	match : [/symbian|s60|symbos|symbianos/],  	versionRule : /symbianos\/([\d\.]*);/},
	{core : 'blackberry',match : [/blackberry/, /rim\stablet\sos/], 	versionRule : /version\/([\d\.]*)/},
	{core : 'webos', 	match : [/webos/],		versionRule:/webos\/([^\s]*);/}];

	function isArray(obj) {
		return Object.prototype.toString.call(obj) == '[object Array]';
	}

	function isRegExp(obj) {
		return Object.prototype.toString.call(obj) == '[object RegExp]';
	}

	function isFunction(obj) {
		return typeof obj == 'function';
	}

	function assertTrue(bool) {
		if(!bool) {
			throw new Error('assert failure');
		}
	}

	var o = {},
		numberify = uamodule.numberify;

	for(var i=0, l=osDetectArray.length, current, matchFlag = false; i<l; i++) {
		current = osDetectArray[i];
		assertTrue(isArray(current.match));
		for(var j=0,lj=current.match.length,match; j<lj; j++) {
			match = current.match[j];
			assertTrue(isRegExp(match) || isFunction(match));
			if(isFunction(match)) {
				matchFlag = match();
			} else if(isRegExp(match)) {
				matchFlag = match.test(ua);
			}
			if(matchFlag) break;
		}
		if(matchFlag) {
			var parent, packages;
			if(current.core.indexOf('\/') != -1) {
				packages = current.core.split('\/');
				o.core = packages[0];
				parent = o;
				for(var m=0,lm=packages.length; m<lm; m++) {
					if(m == lm-1) {
						break;
					} else {
						parent = parent[packages[m]] = {};
					}
				}
			} else {
				parent = null;	//为什么这里一定要这句？？？
				o.core = current.core;
			}
			if(current.version) {
				if(parent) {
					parent[packages[packages.length - 1]] = current.version;
				} else {
					o[o.core] = current.version;
				}
			} else if(current.versionRule) {
				assertTrue(isRegExp(current.versionRule));
				m = ua.match(current.versionRule);
				if (m && m[1]) {
					if(parent) {
						parent[packages[packages.length - 1]] = numberify(m[1]);
					} else {
						o[o.core] = numberify(m[1]);
					}
				}
			}
			break;
		}	
	}
	
	if(!matchFlag) {
		//test ios
		if (/ mobile\//.test(ua)) {
			m = ua.match(/os ([^\s]*)/);
			if (m && m[1]) {
				m = numberify(m[1].replace('_', '.'));
			}
			o[core = 'ios'] = m;
			m2 = ua.match(/ipad|ipod|iphone/);
			if (m2 && m2[0]) o[m2[0]] = m;
		} else {
			o.core = 'unknown';
		}
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
	}

	object.extend(uamodule.ua, o);
}
});

