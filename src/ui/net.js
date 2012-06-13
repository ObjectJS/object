object.define('ui/net.js', 'net, ./optionsbase', function(require, exports) {

var net = require('net');
var optionsmod = require('./optionsbase');

exports.Request = new Class(net.Request, function() {
	this.setOption = optionsmod.overloadsetter(function(self, name, value) {
		self[name] = value;
	});
});

});
