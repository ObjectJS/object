object.add('ooos', function(exports) {});
object.add('uuua', 'ooos', function(exports) {});
try {
	object.use('uuua', function(exports, uuua) {});
} catch (e) {
	console.log(e)
}

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
