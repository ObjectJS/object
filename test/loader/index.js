object.add('ttt.a', 'sys', function(exports, sys){
});
object.add('ttt.b', function(exports) {
	exports.a = 'a'
});
object.add('c', function(exports) {
	exports.a = 'a'
});
object.use('ttt.a, ttt.b, c, sys', function(exports, ttt, c, sys){
	console.log(ttt.b);
});

//object.define('test2', 'test', function(require, exports) {
	//console.log('b');
//});
//object.define('test', 'test2', function(require, exports) {
	//var test2 = require('test2');
	//console.log('a');
//});
//object.use('test', function(test) {
	//console.log(test)
//});

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
