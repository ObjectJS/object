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
(function() {

	window.equiv = QUnit.equiv;

    var QUnitTestCase;

    window.module = function(name, lifecycle) {
        QUnitTestCase = TestCase(name);
        QUnitTestCase.prototype.lifecycle = lifecycle || {};
    };
    
    window.test = function(name, expected, test) {

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
    
    window.expect = function(count) {
        expectAsserts(count);
    };
    
    window.ok = function(actual, msg) {
        assertTrue(msg ? msg : '', !!actual);
    };
    
	window.equal = function(a, b, msg) {
		assertEquals(msg ? msg : '', b, a);
	}

	window.notEqual = function(a, b, msg) {
		assertNotEquals(msg ? msg : '', b, a);
	}

	window.deepEqual = function(a, b, msg) {
		assertSame(msg ? msg : '', b, a);
	};

	window.notDeepEqual = function(a, b, msg) {
		assertNotSame(msg ? msg : '', b, a);
	};

    window.equals = function(a, b, msg) {
        assertEquals(msg ? msg : '', b, a);
    };
    
	window.start = function() {
		fail('start is not supported, should use AsyncTestCase instead');
	}

    window.stop = function() {
		fail('stop is not supported, should use AsyncTestCase instead');
	};
    
    window.same = function(a, b, msg) {
        assertTrue(msg ? msg : '', window.equiv(b, a));
    };
    
    window.reset = function() {
        fail('reset method is not available when using JS Test Driver');
    };

    window.isLocal = function() {
        return false;
    };
    
	window.raises = function(stmt, msg) {
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
		reset : function(){}
    };

})();

