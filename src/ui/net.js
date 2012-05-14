object.define('ui/net.js', 'net, ./options', function(require, exports) {

var net = require('net');
var optionsmod = require('./options');

exports.Request = new Class(net.Request, function() {
	this.setOption = optionsmod.overloadsetter(function(self, name, value) {
		self[name] = value;
	});
});

});
