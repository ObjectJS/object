object.define('a', function(require, exports) {
	exports.a = 1;
});
object.define('b', 'a', function(require) {
	var a = require('a');
	console.log(a)
});

object.execute('b');
