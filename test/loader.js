object.define('haha.lala', function() {
});
object.define('xn/flashUploader/async', function(require) {

	require.async('xn/flashUploader', function(flashUploader) {
		flashUploader.init();
	});

});

object.use('xn/flashUploader/async, haha.lala', function(async, haha) {
   console.log(arguments)
});

object.define('a', 'b', function(require, exports, module) {
	var b = require('b');
	console.log(b.b);
	this.a = 'a'
});
object.define('b', 'a', function(require) {
	setTimeout(function() {
		var a = require('a');
		console.log(a.a);
	}, 300);
	this.b = 'b'
});
object.use('a', function(a) {
	console.log(a.a)
})

