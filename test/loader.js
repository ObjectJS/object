object.define('a', 'b', function(require) {
	var b = require('b')
	console.log(b)
});
object.define('b', 'c', function(require) {
	var c = require('c');
	console.log(c)
});
object.define('c', 'a', function(require) {
	var a = require('a');
	console.log(a)
});

object.use('a', function() {
});
