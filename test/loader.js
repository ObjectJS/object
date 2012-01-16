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

object.add('XN.dom', 'dom', function(exports, dom) {
	exports.haha = 1;
	setTimeout(function() {
		console.log(dom)
	})
});
object.add('lala', 'XN.dom', function(exports, XN) {
	console.log(XN.dom)
});
object.use('lala, sys', function(lala, sys) {
	console.dir(sys.modules)
});
