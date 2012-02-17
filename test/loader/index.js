object.define('test2', function(require, exports) {
	exports.main = function() {
		ok(true, 'main called with object.define');
	}
})

object.execute('test2');

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
