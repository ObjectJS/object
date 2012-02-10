object.add('/root/ua/flashdetect.js', function(exports) {

/**
* getFlashVersionv Flash Player version detection http://stauren.net
* released under the MIT License:
* http://www.opensource.org/licenses/mit-license.php
*/
this.getFlashVersion = function(){
	var _ver = false;
	if(navigator.plugins&&navigator.mimeTypes.length){
		var x=navigator.plugins["Shockwave Flash"];
		if(x&&x.description){
			_ver=x.description.replace(/([a-zA-Z]|\s)+/,"").replace(/(\s+r|\s+b[0-9]+)/,".").split(".")[0];
		}
	} else {
		if(navigator.userAgent&&navigator.userAgent.indexOf("Windows CE")>=0) {
			var axo=1;
			var _tempVer=3;
			while(axo) {
				try{
					_tempVer++;
					axo=new ActiveXObject("ShockwaveFlash.ShockwaveFlash."+_tempVer);
					_ver=_tempVer;
				} catch(e) {
					axo=null;
				}
			}
		} else {
			try {
				var axo=new ActiveXObject("ShockwaveFlash.ShockwaveFlash.7");
			} catch(e) {
				try {
					var axo=new ActiveXObject("ShockwaveFlash.ShockwaveFlash.6");
					_ver=6;
					axo.AllowScriptAccess="always";
				} catch(e) {
					if(_ver==6){
						return _ver;
					}
				}
				try {
					axo=new ActiveXObject("ShockwaveFlash.ShockwaveFlash");
				} catch(e) {}
			}
			if(axo!=null) {
				_ver= axo.GetVariable("$version").split(" ")[1].split(",")[0];
			}
		}
	}
	return _ver;
}

});
