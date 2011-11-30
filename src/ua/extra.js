object.add('ua.extra', 'sys', function(exports, sys) {

	var uamodule = sys.modules['ua'];

	if (uamodule) {
		//将detectUAExtra挂接在模块上，用于在外部进行单元测试
		this.__detectUAExtra = detectUAExtra;
		var o = detectUAExtra();
		object.extend(uamodule.ua, o);
	}

	function detectUAExtra(ua) {
		/* Copy start here */

		var m, shell, o = {}, numberify = uamodule.numberify;
		/**
		 * 说明：
		 * @子涯总结的各国产浏览器的判断依据: http://spreadsheets0.google.com/ccc?key=tluod2VGe60_ceDrAaMrfMw&hl=zh_CN#gid=0
		 * 根据 CNZZ 2009 年度浏览器占用率报告，优化了判断顺序：http://www.tanmi360.com/post/230.htm
		 * 如果检测出浏览器，但是具体版本号未知用 0 作为标识
		 * 世界之窗 & 360 浏览器，在 3.x 以下的版本都无法通过 UA 或者特性检测进行判断，所以目前只要检测到 UA 关键字就认为起版本号为 3
		 */
		
		if(!ua && typeof ua != 'string') {
			ua = navigator.userAgent;
		}
		// 360Browser
		var getExternal = function(key){
			try{
				return window.external[key];
			}catch(e){
				return null;
			}
		}; 

		if (m = ua.match(/360SE/) || (getExternal('twGetRunPath') && window.external.twGetRunPath().indexOf('360se.exe') != -1)) {
			o[shell = 'se360'] = 3; // issue: 360Browser 2.x cannot be recognised, so if recognised default set verstion number to 3
		// Maxthon
		} else if (m = ua.match(/Maxthon|MAXTHON/) || getExternal('max_version')) {
			// issue: Maxthon 3.x in IE-Core cannot be recognised and it doesn't have exact version number
			// but other maxthon versions all have exact version number
			shell = 'maxthon';
			try {
				o[shell] = numberify(window.external['max_version']);
			} catch(ex) {
				o[shell] = 0;
			}
		// TT
		} else if (m = ua.match(/TencentTraveler\s([\d\.]*)/)) {
			o[shell = 'tt'] = m[1] ? numberify(m[1]) : 0;
		// TheWorld
		// 无法识别世界之窗极速版
		} else if (m = ua.match(/TheWorld/)) {
			o[shell = 'theworld'] = 3; // issue: TheWorld 2.x cannot be recognised, so if recognised default set verstion number to 3
		// Sogou
		} else if (m = ua.match(/SE\s([\d\.]*)/)) {
			o[shell = 'sogou'] = m[1] ? numberify(m[1]) : 0;
		// QQBrowser
		} else if (m = ua.match(/QQBrowser.([\d\.]*)/)) {
			o[shell = 'qqbrowser'] = m[1] ? numberify(m[1]) : 0;
		}

		// If the browser has shell(no matter IE-core or Webkit-core or others), set the shell key
		shell && (o.shell = shell);
		
		/* Copy end here */
		return o;
	}
});
