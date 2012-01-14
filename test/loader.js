object.add('a/sys', function() {
	console.error('should not appear');
})
object.add('a/sys2', function() {
	console.log('should appear');
})
object.add('a', 'b', function(exports, b) {
	console.log('a', this.__name__);
})
object.add('a/b', 'c', function(exports, b) {
	console.log('a/b', this.__name__);
})
object.add('a/c', function(exports) {
	console.error('should not appear');
});
object.add('a/b/c', 'sys, sys2', function(exports, sys, sys2) {
	console.log('a/b/c', this.__name__);
});
object.execute('a')
