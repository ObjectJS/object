window.$UNIT_TEST_CONFIG = {};
$UNIT_TEST_CONFIG.testEdges = {
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
	'\'string\'' : 'string',
	'Array' : Array,
	'[1,2]' : [1,2],
	'Date' : Date,
	'date' : new Date(),
	'RegExp' : RegExp,
	'regexp': /test/g,
	'{a:1}' : {a:1},
	'object': object,
	'Class' : Class,
	'Loader': Loader
};

$UNIT_TEST_CONFIG.arrayEdges = {
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

$UNIT_TEST_CONFIG.emptys = [[], NaN, 0, null, undefined, '', {}, 
	false, new Array, new Object, new Function];
$UNIT_TEST_CONFIG.emptysDesc = ['[]','NaN', '0', 'null', 'undefined', '\'\'', '{}', 
	'false', 'new Array', 'new Object', 'new Function'];

$UNIT_TEST_CONFIG.trues = [true, ' ', 1, {}, {'':''}, function(){}];
$UNIT_TEST_CONFIG.objectEdges = {
	'new Object' : new Object,
	'new Object(0)' : new Object(0),
	'new Object({a:1})' : new Object({a:1}),
	'{}' : {},
	'{\'\':\'\'}' : {'':''},
	'{undefined:undefined}' : {undefined:undefined},
	//'{null:null}': {null:null},		// not allowed in IE
	'{NaN:NaN}': {NaN:NaN},
	'{0:0}': {0:0},
	//'{false:false}': {false:false},  	// not allowed in IE
	'{Object:Object}': {Object:Object},
	//'{var:1}': {var:1}				// not allowed in IE
	//'{[]:[]}': {[]:[]},
	//'{{}:{}}': {{}:{}},
	//'{function(){}:function(){}}': {function(){}:function(){}},
	//'{{a:1}:{a:1}}': {{a:1}:{a:1}}
};
$UNIT_TEST_CONFIG.SHOW_TRUE = $UNIT_TEST_CONFIG.showTrue = false;
