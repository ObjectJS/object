object.add('XN', 'ua', function(exports, ua) {
});
object.add('XN.array', 'XN', function(exports, XN) {
});
object.add('XN.func', function(exports) {
});
object.add('XN.string', 'XN', function(exports, XN) {
});
object.add('XN.json', function(exports) {
});
object.add('XN.util', 'XN, XN.json, XN.array, XN.event, XN.string', function(exports, XN) {
});
object.add('XN.datasource', 'XN, XN.json, XN.net, XN.string, XN.array', function(exports, XN) {
});
object.add('XN.browser', 'sys, XN', function(exports, sys, XN) {
});
object.add('XN.cookie', 'XN', function(exports, XN) {
});
object.add('XN.net', 'XN, XN.form, XN.util, XN.event, XN.func, XN.browser, XN.element', function(exports, XN) {
});
object.add('XN.env', function(exports) {
});
object.add('XN.event', 'XN, XN.browser, XN.array, XN.element', function(exports, XN) {
});
object.add('XN.dom', 'dom, ua, XN, XN.event, XN.array, XN.browser, XN.element', function(exports, dom, ua, XN) {
});
object.add('XN.element', 'sys, XN, XN.browser, XN.env', function(exports, sys, XN) {
});
object.add('XN.template', 'XN.env', function(exports, XN) {
});
object.add('XN.form', 'sys, XN, XN.event, XN.json, XN.array, XN.element, XN.string, XN.env', function(exports, sys, XN) {
});
object.add('XN.effect', 'XN.func, XN.element, XN.event', function(exports, XN) {
});
object.add('XN.ui', 'XN.event, XN.browser, XN.util, XN.dom, XN.func, XN.string, XN.env, XN.net, XN.json, XN.form, XN.datasource', function(exports, XN) {
});
object.add('XN.Do', 'XN, XN.func, XN.array, XN.ui', function(exports, XN) {
});

var now = new Date().getTime();
try {
object.use([
		'XN', 
		'XN.array',
		'XN.browser',
		'XN.cookie',
		'XN.Do',
		'XN.dom',
		'XN.effect',
		'XN.element',
		'XN.env',
		'XN.event',
		'XN.form',
		'XN.func',
		'XN.json',
		'XN.net',
		'XN.string',
		'XN.template',
		'XN.ui',
		'XN.util',
		'XN.datasource'
	],
function(XN) {
	console.log(XN)
});
}catch(e) {
	alert(e.message)
}
alert(new Date().getTime() - now);
