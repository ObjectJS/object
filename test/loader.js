object.define('a/b/d', function() {
	return {d: 1}
});
object.define('a/b/c', './d', function(require) {
	var d = require('./d')
	console.log(d)
});
object.use('a/b/c', function(c) {})
