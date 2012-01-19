object.add('/a/b/c/d/e/f/g', function(exports, b) {
});

object.add('/a/b/c/d', 'e.f.g', function(exports, e) {
	console.log(e)
});

object.add('a/b', 'sys, a.b.c.d', function(exports, sys, a) {
	console.dir(sys.modules);
});

object.execute('a/b');
