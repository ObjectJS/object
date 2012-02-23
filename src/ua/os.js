object.add('ua.os', 'sys', function(exports, sys) {

var uamodule = sys.modules['ua'];

/**
 * 由于需要先替换下划线，与ua模块中的numberify不同，因此这里再定义此方法
 */
var numberify = function(s) {
	var c = 0;
	// convert '1.2.3.4' to 1.234
	return parseFloat(s.replace(/_/g, '.').replace(/\./g, function() {
		return (c++ === 0) ? '.' : '';
	}));
};

if (uamodule) {
	//将detectOS方法导出，便于单元测试
	this._detectOS = detectOS;
	var o = detectOS(navigator.userAgent.toLowerCase());
	object.extend(exports, o);
}

//判断对象obj是否是type类型
function is(obj, type) {
	type = type.replace(/\b[a-z]/g, function(match){
		return match.toUpperCase();
	});
	return Object.prototype.toString.call(obj) == '[object ' + type + ']';
}

//断言，如果bool不是true，则抛出异常消息msg
function assertTrue(bool, msg) {
	if(!bool) {
		throw new Error(msg);
	}
}

//断言，确保传入的obj不是空，如果为空，则抛出异常消息msg
function assertNotNull(obj, msg) {
	if(obj == null) {
		throw new Error(msg);
	}
}

/**
 * 传入ua，便于模拟ua字符串进行单元测试
 * @see http://forums.precentral.net/palm-pre-pre-plus/277613-webos-2-1-user-agent.html
 * @see http://www.developer.nokia.com/Community/Wiki/User-Agent_headers_for_Nokia_devices
 */
function detectOS(ua) {
	ua = ua || navigator.userAgent;
	ua = ua.toLowerCase();
	
	/**
	 * 所有的操作系统检测的配置项
	 *	{
	 *		core: 操作系统内核
	 *		match: 操作系统内核匹配，可以是正则表达式，也可以是function，function参数是userAgent字符串，返回值是true/false
	 *		versionRule：获取操作系统版本的正则表达式
	 *		version: 指定的操作系统版本值
	 *	} 
	 */
	var osDetecters = [
	{core: 'windowsnt',		match: function(ua) {
								return /windows\snt/.test(ua) && !/xblwp7/.test(ua);
							},						versionRule: /windows nt\s([\.\d]*)/},
	{core: 'windowsnt',		match: /windows\sxp/,	version: 5.1},
	{core: 'windowsnt', 	match: /windows\s2000/, version: 5.0},
	{core: 'windowsnt', 	match: /winnt/,			version: 4.0},
	{core: 'windows',		match: /windows me/,	version: 'me'},
	{core: 'windows',		match: /windows 98|win98/,version: '98'},
	{core: 'windows',		match: /windows 95|win95/,version: '95'},
	{core: 'windows',		match: /win16/,			version: '3.1'},
	{core: 'windows/phone',	match: /windows\sphone/,versionRule: /windows phone os ([\d\.]*)/},
	{core: 'windows/phone',	match: /xblwp7/,		version: 7.0},
	{core: 'windows/mobile',match: /windows mobile|wce|windows ce|pocket pc|wince/,	
													versionRule: /iemobile ([\.\d]*)/},
	{core: 'windows',		match: /win/,			version: 'unknown'},
	
	{core: 'android', 		match: /\sandroid/,		versionRule:/android ([^\s]*);/},

	{core: 'linux/debian',	match: /debian/, 		versionRule: /debian[\s\/-]([\.\d]*)/},
	{core: 'linux/redhat',	match: /red\shat/, 		versionRule: /red hat[\s\/-]([\.\d]*)/},
	{core: 'linux/fedora',	match: /fedora/, 		versionRule: /fedora[\s\/-]([\.\d]*)/},
	{core: 'linux/ubuntu',	match: /ubuntu/, 		versionRule: /ubuntu[\s\/-]([\.\d]*)/},
	{core: 'linux/suse',	match: /suse/, 			versionRule: /suse[\s\/-]([\.\d]*)/},
	{core: 'linux/mint',	match: /mint/, 			versionRule: /mint[\s\/-]([\.\d]*)/},
	{core: 'linux/centos',	match: /centos/, 		versionRule: /centos[\s\/-]([\.\d]*)/},
	{core: 'linux/gentoo',	match: /gentoo/, 		version: 'unknown'},
	{core: 'linux',			match: /linux/,			version: 'unknown'},

	{core: 'chromeos' ,		match: /cros/,  		version: 'unknown'},

	{core: 'unix/sunos' ,	match: /sunos/,  		version: 'unknown'},
	{core: 'unix/freebsd',	match: /freebsd/,  		version: 'unknown'},
	{core: 'unix/openbsd',	match: /openbsd/,  		version: 'unknown'},
	{core: 'unix/aix' ,		match: /aix/,  			version: 'unknown'},
	{core: 'unix/hp_ux' ,	match: /hp-ux/,  		version: 'unknown'},
	{core: 'unix',			match: /x11/,			version: 'unknown'},
	
	{core: 'macos' ,		match:/mac_powerpc|ppc/,version: 'ppc'},
	{core: 'macos' ,		match: /intel/,  		version: 'intel'},
	{core: 'macos' ,		match: /mac_68000|68k/, version: '68k'},
	{core: 'ios',			match: function(ua) {
		   						return /applewebkit/.test(ua) && / mobile\//.test(ua) && /like/.test(ua);
	   						},						versionRule: /os ([\_\.\d]*)/},
	{core: 'macos' ,		match: /mac/,  			version: 'unknown'},
	
	{core: 'os2' ,			match: function(ua) {
								return /os\/2|ibm-webexplorer/.test(ua) || navigator.appVersion.indexOf("os/2") != -1;
							},						version: 'unknown'},
	{core: 'symbian',		match: /symbian|s60|symbos|symbianos|series40|series60|nokian/,
													versionRule: /symbian(?:os)?\/([\d\.]*);/},
	{core: 'blackberry',	match: /blackberry|rim\stablet\sos/, 					
													versionRule: /(?:version\/|blackberry[\d]{4}\/)([\d\.]*)/},
	{core: 'webos', 		match: /webos/,			versionRule:/webos\/([^\s]*);/},
	{core: 'palmos',		match: /palmos/,		version: 'unknown'}
	];

	var o = {};

	//操作系统检测主逻辑
	for(var i=0, l=osDetecters.length, current, matchFlag = false; i<l; i++) {
		current = osDetecters[i];
		var match = current.match;
		//确保match是正则表达式或者是function
		assertTrue(is(match, 'RegExp') || is(match, 'Function'), 'match rule should be regexp or function');
		if(is(match, 'RegExp')) {
			//如果是正则表达式，则查看是否匹配
			matchFlag = match.test(ua);
		}else if(is(match, 'Function')) {
			//如果是方法，则执行，并传入ua作为参数
			matchFlag = match(ua);
			assertNotNull(matchFlag, 'match function must return true/false');
		} 
		//如果不匹配，则继续循环
		if(!matchFlag) {
			continue;
		}
		//执行到这里，说明已经匹配了
		var parent=null, packages=current.core.split('\/'), pLength=packages.length;
		if(pLength > 1) {
			//说明有子类型，比如windows/phone
			o.oscore = packages[0];
			parent = o;
			//构造子类型对象链
			for(var m=0; m<pLength - 1; m++) {				
				parent = parent[packages[m]] = {};
			}
		} else {
			o.oscore = current.core;
		}
		//获取版本信息
		var version = current.version || 'unknown';
		//如果有版本获取规则，则执行此规则，规则中必须取出版本号
		if(current.versionRule) {
			assertTrue(is(current.versionRule, 'RegExp'), 'version rule should be regexp');
			m = ua.match(current.versionRule);
			if(m && m[1]) version = numberify(m[1]);
		}
		//将版本信息放入返回的对象中
		if(parent) {
			parent[packages[pLength - 1]] = version;
		} else {
			o[o.oscore] = version;
		}
		break;
	}
	
	//如果是ios，继续判断移动设备
	if(o.ios) {
		m = ua.match(/ipad|ipod|iphone/);
		if (m && m[0]) {
			o[m[0]] = o.ios;
		}
	}
	//判断 Google Caja, from YUI-client
	if(navigator && navigator.cajaVersion) {
		o.caja = navigator.cajaVersion;
	}

	if(!matchFlag) {
		o.oscore = 'unknown';
	}

	//wow64  : Windows-On-Windows 64-bit
	//x64    : 64-bit windows version
	//win64  : Win32 for 64-Bit-Windows
	//ia64   : I-tanium 64-bit processor from Intel
	//sparc64: 64-bit Sun UltraSPARC processor
	//ppc64  : 64-bit PowerPC microprocessor
	//x86_64 : 64-bit Intel processor
	if (/wow64|x64|win64|ia64|x86_64|amd64|sparc64|ppc64/.test(ua)){
		o.processor = 64;
	} else {
		o.processor = 32;
	}
	
	//检测分辨率（devicePixelRatio说明是高密度的显示屏，如iphone）
	//http://developer.android.com/guide/webapps/targeting.html
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

	//检测屏幕方向，首先确保支持屏幕方向
	var supportOrientation = typeof window.orientation != 'undefined' ? true : false;
	if(supportOrientation) {
		if(window.innerWidth != undefined) {
			//通过屏幕的高度和宽度的值大小，来判断是横向还是纵向
			o.orientation = window.innerWidth > window.innerHeight ? 'profile' : 'landscape';
		} else {
			o.orientation = window.screen.width > window.screen.height ? 'profile' : 'landscape';
		}
	} else {
		o.orientation = 'unknown';
	}

	return o;
}
});

