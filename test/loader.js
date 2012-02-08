function addModuleScriptToHead(name, src) {
	var script = document.createElement('script');
	script.setAttribute('data-module', name);
	script.setAttribute('data-src', src);
	document.getElementsByTagName('head')[0].appendChild(script);
	return script;
}
addModuleScriptToHead('module1', 'http://test.renren.com/objectjs.org/object/test/unit/loader/module1-depends.js');
addModuleScriptToHead('module2', 'http://test.renren.com/objectjs.org/object/test/unit/loader/module2-depends.js');
object.use('module1', function(flashUploader) {
	console.log(flashUploader)
});
