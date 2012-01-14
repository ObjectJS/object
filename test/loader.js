object.define('test/a/b/d', function() {
	return {d: 1};
});
object.define('test/a/b/c', './d', function(require) {
	this.d = require('./d');
});
object.add('test.a', 'sys', function(exports, sys) {
	if (this.__name__ == '__main__') {
		console.dir(sys.modules);
	}
});

object.execute('test.a');
