object.add('/home/a/b/c/d/e/f/g', function(exports, b) {
});

object.add('/home/a/b/c/d', 'a.b.c.d.e.f.g', function(exports, a) {
	console.log(a);
});

object.add('/home/a/b', 'sys, c.d', function(exports, sys, c) {
	exports.haha = 1;
});

object.execute('a/b');
