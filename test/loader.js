object.define('a/b/d', function() {
	return {d: 1}
});
object.define('a/b/c', './d', function(require) {
	require.async('./d', function(d) {
		console.log(d)
	})
});
object.use('a.b.c, sys', function(a, sys) {
	console.log(sys.modules)
})
