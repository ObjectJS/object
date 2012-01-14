object.add('a/sys', function() {
	console.log('fuck')
})
object.add('a/sys2', function() {
	console.log('fuck')
})
object.add('a', 'b', function(exports, b) {
})
object.add('a/b', 'c', function(exports, b) {
})
object.add('a/c', function(exports) {
});
object.add('a/b/c', 'sys, sys2', function(exports, sys, sys2) {
});
object.execute('a')
