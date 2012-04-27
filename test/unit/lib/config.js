// for loader
(function(global) {
	var loader = {}, basicScript = document.createElement('script');
	loader.wait = function() {
		return loader;
	};
	loader.script = function(src, callback) {
		var script = basicScript.cloneNode(true);
		script.src = src;
		script.async = false;
		script.defer = true;
		script.type = 'text/javascript';
		if (callback) {
			if (script.addEventListener) {
				script.addEventListener('load', callback, false);
				script.addEventListener('error', callback, false);
			} else {
				script.attachEvent('onreadystatechange', function() {
					var rs = script.readyState; if (rs === 'loaded' || rs === 'complete') { callback(); }
				});
			}
		}
		document.body.appendChild(script);
		return loader;
	}
	global.$UNIT_TEST_SCRIPT_LOADER = loader;
})(window);

// for config
(function(global) {
	var config = {};
	config.testEdges = {
		'null' : null, 
		'undefined' : undefined, 
		'false' : false, 
		'{}' : {}, 
		'0' : 0, 
		'NaN' : NaN, 
		'[]' : [], 
		'\'\'' : '',
		'1' : '1',
		'true' : true,
		'function(){}' : function() {},
		//'window' : window,
		//'document' : document,
		//'document.createElement(\'div\')' : document.createElement('div'),
		//'document.createElement(\'object\')' : document.createElement('object'),
		//'location' : location,
		'String' : String,
		'Array' : Array,
		'[1,2]' : [1,2],
		//'Date' : Date,
		//'date' : new Date(),
		'RegExp' : RegExp,
		'regexp': /test/g,
		'{a:1}' : {a:1},
		'object': object,
		'Class' : Class,
		'Loader': object.Loader
	};

	config.arrayEdges = {
		'new Array': new Array,
		'new Array(0)' : new Array(0),
		'new Array(1)' : new Array(1),
		'[]': [],
		'[[]]': [[]],
		'[\'\']' : [''],
		'[undefined]' : [undefined],
		'[null]' : [null],
		'[NaN]' : [NaN],
		'[0]' : [0],
		'[false]' : [false],
		'[{}]' : [{}],
		'[Array]' : [Array],
		'[function(){}]' : [function(){}],
		'[undefined, undefined]' : [undefined, undefined],
		'[\'a\', {}, new Array]' : ['a', {}, new Array],
		'[{a:1}]' : [{a:1}]
	};

	config.emptys = [[], NaN, 0, null, undefined, '', {}, 
		false, new Array, new Object, new Function];
	config.emptysDesc = ['[]','NaN', '0', 'null', 'undefined', '\'\'', '{}', 
		'false', 'new Array', 'new Object', 'new Function'];

	config.trues = [true, ' ', 1, {}, {'':''}, function(){}];
	config.objectEdges = {
		'new Object' : new Object,
		'new Object(0)' : new Object(0),
		'new Object({a:1})' : new Object({a:1}),
		'{}' : {},
		'{\'\':\'\'}' : {'':''},
		'{undefined:undefined}' : {undefined:undefined},
		'{NaN:NaN}': {NaN:NaN},
		'{0:0}': {0:0},
		'{Object:Object}': {Object:Object}
		//'{[]:[]}': {[]:[]},
		//'{{}:{}}': {{}:{}},
		//'{{a:1}:{a:1}}': {{a:1}:{a:1}}
	};
	config.SHOW_TRUE = config.showTrue = false;

	global.$UNIT_TEST_CONFIG = config;
})(window);

window.Loader = object.Loader;

$UNIT_TEST_CONFIG.pageTestDir = '';
window.isJsTestDriverRunning = typeof jstestdriver != 'undefined';
if (isJsTestDriverRunning) {
	try {
		console = console || {};
		console.log = function() { jstestdriver.console.log.apply(jstestdriver.console, arguments); };
		//console.debug = function() { jstestdriver.console.debug.apply(jstestdriver.console, arguments); };
		//console.info = function() { jstestdriver.console.info.apply(jstestdriver.console, arguments); };
		//console.warn = function() { jstestdriver.console.warn.apply(jstestdriver.console, arguments); };
		//console.error = function() { jstestdriver.console.error.apply(jstestdriver.console, arguments); };
	} catch (e) {}
	$UNIT_TEST_CONFIG.needPath = true;

	try {
		var loc = window['location'];
		var pageUrl = loc.protocol + '//' + loc.host;
		$UNIT_TEST_CONFIG.pageTestDir = pageUrl + '/test/test/unit/';
	} catch (e){}
};

window.transTestDir = function transTestDir(dir) {
	dir = dir || '';
	return $UNIT_TEST_CONFIG.pageTestDir + ($UNIT_TEST_CONFIG.needPath ? dir : '');
};
