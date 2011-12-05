object.add('haha.lala', 'sys, dom', function(exports, sys, dom) {
	console.log(dom.dd)
	exports.name = 'lala';
});
object.define('haha.baba', function() {
});
object.define('xn/flashUploader/async', 'haha.lala, haha.baba', function(require) {

	var haha = require('haha');

	require.async('xn/flashUploader', function(flashUploader) {
		flashUploader.init();
	});

});

object.use('xn/flashUploader/async, haha.lala, haha.baba, sys', function(async, haha) {
	console.log(haha.lala.name)
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
