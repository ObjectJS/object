object.add('haha.lala', 'sys, dom', function(exports, sys, dom) {
	exports.name = 'lala';
});
object.define('haha.baba', function() {
});
object.define('xn/flashUploader/async', 'xn/flashUploader/async, haha, haha.lala, haha.baba', function(require) {

	var haha = require('haha');

	require.async('xn/flashUploader', function(flashUploader) {
		flashUploader.init();
	});

});

object.use('xn/flashUploader/async, haha.lala, haha.baba, sys', function(async, haha) {
	console.log(haha.lala.name)
});

object.add('a', 'b', function(exports, b) {
	console.log(b.b);
	this.a = 'a'
	return {}
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
