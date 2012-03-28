object.define('xn.net', 'sys, net', function(require, exports) {

var sys = require('sys');
var net = require('net');

console.log(net);

});

object.add('xn', './xn/net', function(exports, net) {
});

object.define('xn.feed', 'net', function(require, exports) {
	var net = require('net');
});

object.add('xn.feed.newsfeed', 'xn.feed', function(exports, xn) {
});

object.execute('xn.feed.newsfeed');

//object.define('test2', 'test', function(require, exports) {
	//console.log('b');
//});
//object.define('test', 'test2', function(require, exports) {
	//var test2 = require('test2');
	//console.log('a');
//});
//object.use('test', function(test) {
	//console.log(test)
//});

//object.use('module1', function(module1) {
	//console.log(module1)
//});

//object.define('test', 'module3', function(require) {
	//console.log(require('module3'))
//});
//object.use('test', function() {
//});

//object.use('module3', function(a) {
	//console.log(a);
//})
