/**
 * @see https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Object/keys
 */
Object.keys = function(o) {
	var result = [];
	if (o === undefined || o === null) {
		return result;
	}

	// 在Safari 5.0.2(7533.18.5)中，在这里用for in遍历parent会将prototype属性遍历出来，导致原型被指向一个错误的对象
	// 经过试验，在Safari下，仅仅通过 obj.prototype.xxx = xxx 这样的方式就会导致 prototype 变成自定义属性，会被 for in 出来
	// 而其他浏览器仅仅是在重新指向prototype时，类似 obj.prototype = {} 这样的写法才会出现这个情况
	// 因此，在使用时一定要注意
	for (var name in o) {
		if (o.hasOwnProperty(name)) {
			result.push(name);
		}
	}

	// for IE
	// 在IE下for in无法遍历出来修改过的call方法
	// 为什么允许修改call方法？对于一个class来说，没有直接Class.call的应用场景，任何Class都应该是new出来的，因此可以修改这个方法
	if (o.call !== undefined && o.call !== Function.prototype.call && result.indexOf('call') === -1) {
		result.push('call');
	}

	return result; 
};

/**
 * @method
 * @see https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Array/isArray
 */
Array.isArray = Array.isArray || function(o) {
	return Object.prototype.toString.call(o) === '[object Array]';
};

/**
 * @method
 * @see https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Array/forEach
 */
Array.prototype.forEach = Array.prototype.forEach || function(fn, bind) {
	for (var i = 0; i < this.length; i++) {
		fn.call(bind, this[i], i, this);
	}
};

/**
 * @method
 * @see https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Array/indexOf
 */
Array.prototype.indexOf = Array.prototype.indexOf || function(str) {
	for (var i = 0; i < this.length; i++) {
		if (str === this[i]) {
			return i;
		}
	}
	return -1;
};

/**
 * @method
 * @see https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Array/some
 */
Array.prototype.some = Array.prototype.some || function(fn, bind) {
	for (var i = 0, l = this.length; i < l; i++) {
		if ((i in this) && fn.call(bind, this[i], i, this)) return true;
	}
	return false;
};

/**
 * @method
 * @see https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Array/every
 */
Array.prototype.every = Array.prototype.every || function(fn, bind) {
	for (var i = 0, l = this.length; i < l; i++) {
		if ((i in this) && !fn.call(bind, this[i], i, this)) return false;
	}
	return true;
};

/**
 * @method
 * @see https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Array/map
 */
Array.prototype.map = Array.prototype.map || function (fn, bind) {
	var results = [];
	for (var i = 0, l = this.length; i < l; i++) {
		if (i in this) results[i] = fn.call(bind, this[i], i, this);
	}
	return results;
};

/**
 * @method
 * @see https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Array/filter
 */
Array.prototype.filter = Array.prototype.filter || function(fn, bind) {
	var results = [];
	for (var i = 0, l = this.length; i < l; i++) {
		if ((i in this) && fn.call(bind, this[i], i, this)) results.push(this[i]);
	}
	return results;
};

/**
 * @method
 * @see https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Array/reduce
 */
Array.prototype.reduce = Array.prototype.reduce || function(fun /*, initialValue */) {
	"use strict";

	if (this === undefined || this === null)
		throw new TypeError();

	var t = Object(this);
	var len = t.length >>> 0;
	if (typeof fun !== "function")
		throw new TypeError();

	// no value to return if no initial value and an empty array
	if (len === 0 && arguments.length == 1)
		throw new TypeError();

	var k = 0;
	var accumulator;
	if (arguments.length >= 2) {
		accumulator = arguments[1];
	} else {
		do {
			if (k in t) {
				accumulator = t[k++];
				break;
			}

			// if array contains no values, no initial value to return
			if (++k >= len) {
				throw new TypeError();
			}

		} while (true);
	}

	while (k < len) {
		if (k in t)
			accumulator = fun.call(undefined, accumulator, t[k], k, t);
		k++;
	}

	return accumulator;
};

/**
 * @method
 * @see https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Array/reduceRight
 */
Array.prototype.reduceRight = Array.prototype.reduceRight || function(callbackfn /*, initialValue */) {
	"use strict";

	if (this === undefined || this === null)
		throw new TypeError();

	var t = Object(this);
	var len = t.length >>> 0;
	if (typeof callbackfn !== "function")
		throw new TypeError();

	// no value to return if no initial value, empty array
	if (len === 0 && arguments.length === 1)
		throw new TypeError();

	var k = len - 1;
	var accumulator;
	if (arguments.length >= 2) {
		accumulator = arguments[1];
	} else {
		do {
			if (k in this) {
				accumulator = this[k--];
				break;
			}

			// if array contains no values, no initial value to return
			if (--k < 0) {
				throw new TypeError();
			}
		}
		while (true);
	}

	while (k >= 0) {
		if (k in t)
			accumulator = callbackfn.call(undefined, accumulator, t[k], k, t);
		k--;
	}

	return accumulator;
};

/**
 * @method
 * @see https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/String/trim
 */
String.prototype.trim = String.prototype.trim || function() {
	// High Performance JavaScript 中描述此方法较快
	return this.replace(/^\s\s*/, "").replace(/\s\s*$/, "");
};

// 有些老页面引用了js/compact.js，其中有一个错误的Function.prototype.bind
if (!Function.prototype.bind || Function.prototype.bind === window.__hualuOldBind) {
	/**
 	 * @method
	 * @see https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Function/bind
	 */
	Function.prototype.bind = function(object) {
		var method = this;
		return function() {
			method.apply(object, arguments); 
		};
	};
}
