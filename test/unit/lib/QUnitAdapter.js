/**
 * This is a QUnit adapter for jsTestDriver, supporting asyncTest/stop/start
 *
 * Extended from bundled QUnit adapter: http://code.google.com/p/js-test-driver/wiki/QUnitAdapter
 * Both QUnit and jsTestDriver support asnyc test, but using different API, 
 *    this adapter is based on the APIs of these too tools, 
 *    and trying to transform from one(QUnit API) to the other(jsTestDriver API).
 *
 * @author wangjeaf@gmail.com
 */

//(function() { // this closure will cause error in IE6, reason???

	if (typeof QUnit != 'undefined') {
		window.equiv = QUnit.equiv;
	}

	// general test
    	var QUnitTestCase;
	// async test
	var AsyncQUnitTestCase;

	/**
	 * define a module
	 * @param {String} name module name
	 * @param {Object} lifecycle life cycle of module, contains setup/teardown
	 */
	window.module = function module(name, lifecycle) {
		// general test and async test can exist in the same module
		QUnitTestCase = TestCase(name);
		AsyncQUnitTestCase = AsyncTestCase(name + '_async');
		QUnitTestCase.prototype.lifecycle = lifecycle || {};
		AsyncQUnitTestCase.prototype.lifecycle = lifecycle || {};
	};

	// all functions added in window need name, otherwise will cause error in IE6, reason???
    	window.test = function test(name, expected, func, async) {
		// generate test name in CamelCase
		name = ('test ' + name).replace(/^\s+|\s$/g, '').replace(/\s+\w/g, function(e) {
			return e.replace(/\s+/g, '').toUpperCase();
		});

		if(expected.constructor != Number) {
			func = expected;
		}
		var src = func.toString();
		if (async || /(start|stop)\s*\(\s*\)/.test(src)) {
			// if contains start/stop, add to AsyncTestCase
			addToAsyncTestCase(name, expected, src);
		} else {
			// generate a test according to the rule of jsTestDriver
			QUnitTestCase.prototype[name] = function() {
				if(this.lifecycle.setup) {
					this.lifecycle.setup();
				}
				if(expected.constructor === Number) {
					expectAsserts(expected);        
				} else {
					func = expected;
				}
				func.call(this.lifecycle);
				if(this.lifecycle.teardown) {
					this.lifecycle.teardown();
				}
			};
		}
    	};

	window.asyncTest = function asyncTest(name, expect, func) {
		window.test(name, expect, func, true);
	};
    
    	window.expect = function expect(count) {
        	expectAsserts(count);
    	};
    
   	window.ok = function ok(actual, msg) {
       		assertTrue(msg ? msg : '', !!actual);
    	};
    
	window.equal = function equal(a, b, msg) {
		assertEquals(msg ? msg : '', b, a);
	}

	window.notEqual = function notEqual(a, b, msg) {
		assertNotEquals(msg ? msg : '', b, a);
	}

	window.deepEqual = function deepEqual(a, b, msg) {
		assertSame(msg ? msg : '', b, a);
	};

	window.notDeepEqual = function notDeepEqual(a, b, msg) {
		assertNotSame(msg ? msg : '', b, a);
	};

	window.equals = function equals(a, b, msg) {
		assertEquals(msg ? msg : '', b, a);
	};
    
	window.start = function start() {
		// if source code is not replaced in jsTestDriver, error will be thrown.
		fail('start is not supported, should use AsyncTestCase instead');
	}

	window.stop = function stop() {
		// if source code is not replaced in jsTestDriver, error will be thrown.
		fail('stop is not supported, should use AsyncTestCase instead');
	};
    
	window.same = function same(a, b, msg) {
		assertTrue(msg ? msg : '', window.equiv(b, a));
	};

	window.reset = function reset() {
		fail('reset method is not available when using JS Test Driver');
	};

	window.isLocal = function isLocal() {
		return false;
	};
    
	window.raises = function raises(stmt, msg) {
		var flag = false;
		try {
			stmt();
		} catch (e) {
			flag = true;
		}
		assertTrue(msg ? msg : '', flag);
	}

	window.QUnit = {
        	equiv: window.equiv,
        	ok: window.ok,
		reset : function reset(){}
	};

	/**
	 * add a test to AsyncTestCase
	 * 
	 * @param {String} name test name
	 * @param {int} expected expected assertion count
	 * @param {String} src transformed source code
	 */
	function addToAsyncTestCase(name, expected, src) {
		AsyncQUnitTestCase.prototype[name] = function(queue) {
			var This = this;
			if(expected.constructor === Number) {
				expectAsserts(expected);        
			}
			// setup
			queue.call('setup', function() {
				if(This.lifecycle.setup) {
					This.lifecycle.setup();
				}
			});
			
			// add to queue, callbacks is used for async
			queue.call('do async test', new Function("callbacks", transformSrc(src)));

			// teardown
			queue.call('teardown', function() {
				if(This.lifecycle.teardown) {
					This.lifecycle.teardown();
				}
			});
		}
	}
	
	/**
	 * transform async method source code from QUnit style to jsTestDriver style
	 * @param {String} src source code of async method, written in QUnit(stop/start)
	 * @returns {String} transformed source code for jsTestDriver(callbacks.add)
	 * @example
	 * function() {
	 * 		stop();
	 * 		obj.addCallback('xxxxx' ,function(e) {
	 * 			start();
	 * 			ok(e, 'e is ok');
	 * 		});
	 * }
	 * ------>
	 * function () {
	 * 		var callback0 = callbacks.add(function(e) {
	 * 			ok(e, 'e is ok');
	 * 		});
	 * 		obj.addCallback('xxxxx', function(e) {
	 * 			callback0(e);
	 * 		});
	 * }
	 */
	function transformSrc(src) {
		src = removeComments(src);
		src = src.replace(/\n/g,'').replace(/\t/g, ' ')
			.replace(/stop\(\);/g,'')				// remove stop();
			.replace(/function\s*\(\) \{/,'')		// replace the first function() {
			.replace(/function\s*\(/g, 'function(');// replace function   ()  to function()
		src = src.slice(0, -1);						// remove the last }

		// convert from QUnit callback function to jsTestDriver callback
		//
		// stop(); setTimeout(function(a,b) {start();ok(true, 'ok')}, 10);
		// --->
		// var callback1 = callbacks.add(function(a,b) {ok(true, 'ok')}; 
		//     setTimeout(function() {callback1(a,b);}, 10);
		var callbackCounter = 0;
		var startIndex = src.indexOf('start();');
		while( startIndex != -1) {
			var length = src.length;
			var subSrc = src.substring(0, startIndex)
			var funcIndex = endIndex = subSrc.lastIndexOf('function(');
			var findNextEnd = endIndex;
			var args = '';
			var startRecord = false;
			// find next end brance, args is between the start and end
			while(findNextEnd < length) {
				var current = src.charAt(findNextEnd);
				if (current == '(') {
					startRecord = true;
				} else if (current == ')') {
					break;
				} else {
					if (startRecord) {
						args += current;
					}
				}
				findNextEnd++;
			}
			var counter = 0;
			var added = false;
			// find the end of function
			while(endIndex < length) {
				if (src.charAt(endIndex) == '{') {
					added = true;
					counter ++;	
				} else if (src.charAt(endIndex) == '}') {
					counter --;
				}
				if (counter == 0 && added) {
					break;
				}
				endIndex ++;
			}
			// replace function with callback
			newSrc = '; var callback' + callbackCounter + 
				' = callbacks.add(' + src.substring(funcIndex, startIndex) + 
				src.substring(startIndex + 'start();'.length, endIndex + 1) + ');';
			newSrc += src.substring(0, funcIndex) + ' function (' + args + ') {';
			newSrc += 'callback' + callbackCounter + '(' + args + ');';
			newSrc += src.substring(endIndex, length);
			src = newSrc;
			callbackCounter ++;
			startIndex = src.indexOf('start();');
		}

		// add Clock.tick() at the end of setTimeout
		// WARNING: setTimeout is simulated, can not be trusted...
		//
		// setTimeout(function(){}, 10); ---> setTimeout(function(){}, 10); Clock.tick(11);
		var matched = src.match(/setTimeout/g);
		if (matched) {
			var startIndex = 0;
			var timeoutCounter = matched.length;
			var length = src.length;
			for(var i=0; i<timeoutCounter; i++) {
				var currentMatch = matched[i];
				var part = src.substring(startIndex);
				var endIndex = timeoutIndex = startIndex + part.indexOf('setTimeout');
				var counter = 1;
				endIndex += 'setTimeout'.length + 1;
				startIndex = endIndex;
				// find the end of setTimeout
				while(endIndex < length) {
					if (src.charAt(endIndex) == '(') {
						counter ++;
					} else if (src.charAt(endIndex) == ')') {
						counter --;
					}
					if (counter == 0) {
						break;
					}
					endIndex++;
				}
				// get timeout
				var findTimeoutIndex = endIndex - 1;
				var timeout = '';
				while(findTimeoutIndex > 0) {
					var currentChar = src.charAt(findTimeoutIndex);
					if (currentChar == ',') {
						break;
					}
					timeout = currentChar + timeout;
					findTimeoutIndex --;	
				}
				timeout = parseInt(timeout) + 1;
			}
			// add Clock.tick(timeout)
			src = src.substring(0, endIndex + 1) + ';Clock.tick(' + timeout*2 + ');' + src.substring(endIndex + 1);
		}
		return src;
	}

	/**
	 * remove comments in code
	 * @param {String} code source code
	 * @param {String} source code without comments
	 * @see seajs http://modules.seajs.com/seajs/1.1.0/sea-debug.js
	 */
	function removeComments(code) {
		return code
			.replace(/(?:^|\n|\r)\s*\/\*[\s\S]*?\*\/\s*(?:\r|\n|$)/g, '\n')
			.replace(/(?:^|\n|\r)\s*\/\/.*(?:\r|\n|$)/g, '\n');
	}
	
//});
