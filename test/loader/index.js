object.define('ttt', function(require, exports) {
	exports.a = 1;
});

object.define('xn/mention', 'ttt', function(require, exports, module) {
	var ttt = require('ttt');
});

object.use('xn.mention', function(xn) {
	console.log(xn)
});

//object.use('module1', function(module1) {
	//console.log(module1)
//});

//object.define('test', 'module3', function(require) {
	//console.log(require('module3'))
//});
//object.use('test', function() {
//});

//object.use('module3', function(a) {
	//console.log(a);
//})
