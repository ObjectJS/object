object.add('a/sys', function() {
	console.error('should not appear');
})
object.add('a/sys2', function() {
	console.log('should appear');
})
object.add('a', 'b', function(exports, b) {
	console.log('a', this.__name__);
})
object.add('a/b', 'c.d', function(exports, b) {
	console.log('a/b', this.__name__);
})
object.add('a/b/c/d', function(exports) {
	console.log('a/b/c/d', this.__name__);
});
object.add('a/c', function(exports) {
	console.error('should not appear');
});
object.add('a/b/c', 'sys, sys2', function(exports, sys, sys2) {
	console.log('a/b/c', this.__name__);
	setTimeout(function() {
		console.dir(sys.modules);
	})
});
//object.execute('a');
object.remove('a', true);

object.add('a.b.c.d.e.f.g', function(exports) {
});
object.add('a.b.c.d.e', 'f.g', function(exports, f) {
	console.log(f)
});
object.add('a.b.c', 'sys, a.b.c.d.e', function(exports, sys, a) {
	console.log(a);
});
object.execute('a/b/c');
