/*
QUnitAdapter
Version: 1.1.0

Run qunit tests using JS Test Driver

This provides almost the same api as qunit.

Tests must run sychronously, which means no use of stop and start methods.
You can use jsUnit Clock object to deal with timeouts and intervals:
http://googletesting.blogspot.com/2007/03/javascript-simulating-time-in-jsunit.html

The qunit #main DOM element is not included. If you need to do any DOM manipulation
you need to set it up and tear it down in each test.

*/
//(function() {

	window.equiv = QUnit.equiv;

    var QUnitTestCase;

    window.module = function module(name, lifecycle) {
        QUnitTestCase = TestCase(name);
        QUnitTestCase.prototype.lifecycle = lifecycle || {};
    };
    
    window.test = function test(name, expected, test) {

		// generate test name
		name = ('test ' + name).replace(/^\s+|\s$/g, '').replace(/\s+\w/g, function(e) {
			return e.replace(/\s+/g, '').toUpperCase();
		});

		// generate a test according to rule of jsTestDriver
        QUnitTestCase.prototype[name] = function() {
			if(this.lifecycle.setup) {
				this.lifecycle.setup();
			}
			if(expected.constructor === Number) {
				expectAsserts(expected);        
			} else {
				test = expected;
			}
			test.call(this.lifecycle);
			if(this.lifecycle.teardown) {
				this.lifecycle.teardown();
			}
		};
    };

	// equals to test temporary
	window.asyncTest = window.test;
    
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
		fail('start is not supported, should use AsyncTestCase instead');
	}

    window.stop = function stop() {
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

//});
