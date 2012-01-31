object.add('/home/a/b/c/d/e/f/g', function(exports, b) {
});

object.add('/home/a/b/c/d', 'e.f.g', function(exports, e) {
	console.log(e)
});

object.add('/home/a/b', 'sys, a.b.c.d', function(exports, sys, a) {
	exports.haha = 1;
	console.log(a.b.haha);
});

object.execute('a/b');
