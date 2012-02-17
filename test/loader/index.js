object.add('module1.module2', function(exports) {
	exports.a = 1;
});
object.add('module1', function(exports) {
	exports.a = 1;
});

object.use('sys, module1.module2', function(sys, module1) {
	console.log(module1.a)
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
