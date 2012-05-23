module('events-usage');

test('events.wrapEvent', function(){
});

test('events.fireevent', function() {
	expect(13);
	object.use('events', function(exports, events) {
		var A = new Class(function() {
			Class.mixin(this, events.Events);
			this.a = events.fireevent(function() {
				ok(true, 'a method is called');
			});
			this.b = events.fireevent(['data1', 'data2'])(function() {
				ok(true, 'b method is called');
			});
			this.c = events.fireevent('my-event-name', ['data1', 'data2'])(function() {
				ok(true, 'c method is called');
			});
			this.d = events.fireevent('a', ['data1'])(function() {
				ok(true, 'd method is called');
			});
		});
		var a = new A();

		// normal
		a.addEvent('a', function(e) {
			a.removeEvent('a', arguments.callee);
			ok(true, 'event a fired');
		}, false);
		a.a();

		// prevent default
		a.addEvent('a', function(e) {
			a.removeEvent('a', arguments.callee);
			e.preventDefault();
			ok(true, 'event a fired, and default method is prevented');
		});
		a.a();

		//fireevent([])
		a.addEvent('b', function(e) {
			a.removeEvent('b', arguments.callee);
			equal(e.data1, 1, 'e.data1 is 1 in event b : fireevent([])');
			equal(e.data2, 2, 'e.data2 is 2 in event b : fireevent([])');
		}, false);
		a.b(1,2);

		//fireevent('', [])
		a.addEvent('my-event-name', function(e) {
			a.removeEvent('my-event-name', arguments.callee);
			equal(e.data1, 1, 'e.data1 is 1 in event c : fireevent(str, [])');
			equal(e.data2, 2, 'e.data2 is 2 in event c : fireevent(str, [])');
		}, false);
		a.c(1,2);

		//fireevent('', []) eventName is already exist
		a.addEvent('a', function(e) {
			ok(ok, 'a should not be called, data1 = ' + e.data1);
		}, false);
		a.a();
		a.d('d');
	});
});

test('events.Events: addEvent/removeEvent/fireEvent', function() {
	expect(5)
	object.use('events, dom', function(exports, events, dom) {
		var A = new Class(function() {
			Class.mixin(this, events.Events);
		});
		var a = new A();
		//event: not-exist
		a.addEvent('not-exist', function(e) {
			a.removeEvent('not-exist', arguments.callee);
			ok(true, 'not-exist event handler executed');
		}, false);
		a.fireEvent('not-exist');

		//event: not-exist, two handlers
		a.addEvent('not-exist-2', function(e) {
			ok(true, 'not-exist-2 event handler 1 executed (both handler 1 and 2)');
			a.removeEvent('not-exist-2', arguments.callee);
		}, false);
		a.addEvent('not-exist-2', function(e) {
			ok(true, 'not-exist-2 event handler 2 executed (both handler 1 and 2)');
			a.removeEvent('not-exist-2', arguments.callee);
		}, false);
		a.fireEvent('not-exist-2');

		var counter = 0;
		var handler = function(e) {
			counter ++;
			ok(true, 'handler should execute only once');
			equal(counter, 1, 'handler executed only once, correct');
		}

		// remove not-exist handler
		try {
			a.removeEvent('e', handler, false);
			ok(true, 'remove not-exist event handler should not cause error');
		} catch (e) {
			ok(true, 'remove not-exist event handler should not cause error : ' + e);
		}

		// remove from not-exist event
		try {
			a.removeEvent('not-exist-event-name', handler, false);
			ok(true, 'remove handler from not-exist event name should not cause error');
		} catch (e) {
			ok(true, 'remove handler from not-exist event name should not cause error : ' + e);
		}

		// add the same event handler
		a.addEvent('e', handler, false);
		a.addEvent('e', handler, false);

	});
});

var chrome = false;
var ie = false;
object.use('ua', function(exports, ua) {
	chrome = ua.ua.chrome || ua.ua.webkit > 525 || ua.ua.opera;
	ie =  ua.ua.ie;
});

test('events.Events: play with the standard - without error', function() {
	expect(7);
	object.use('events, dom', function(exports, events, dom) {
		var A = new Class(function() {
			Class.mixin(this, events.Events);
		});
		var a = new A();
		// on-e should not be executed when fire self-defined event : e
		var counter1 = 0;
		a.one = function() {
			ok(true, 'a.on-e should be executed when event e fired : in handler');
			counter1 ++;
		}
		a.fireEvent('e');
		equal(counter1, 1, 'a.on-e should be executed when event e fired');

		// standard event : click on obj
		var counter2 = 0;
		a.onclick = function() {
			counter2 ++;
			ok(true, 'standard event(click) on obj should not be fired manually');
		}
		a.addEvent('click', function() {
			ok(true, 'standard event(click) should be fired manually');
		}, false);
		a.fireEvent('click');
		equal(counter2, 1, 'standard event(click) on obj should be fired manually');

		// standard event : click on div
		var node = dom.wrap(document.createElement('div'));
		// must be in the DOM tree
		//document.body.appendChild(node);
		node.onclick = function() {
			// not execute in IE
			ok(true, 'div.onclick is executed, which is not executed in IE');
		};
		node.addEvent('click', function(e) {
			e.preventDefault();
			ok(true, 'standard event(click) on div should be fired manually');
		}, false);
		//document.body.appendChild(node);
		node.fireEvent('click');
	});
});

// window.onerror的方式在jsTestDriver中不行~~
if (!isJsTestDriverRunning || chrome) {
test('events.Events: play with the standard - throw error', function() {
	expect(chrome ? 4 : 3);
	var oldError = window.onerror;
	object.use('events, dom', function(exports, events, dom) {
		var A = new Class(function() {
			Class.mixin(this, events.Events);
		});
		var a = new A();

		var counter3 = 0;
		a.addEvent('fire-error', function() {
			ok(true, 'fire event fire-error, should not stop the event chain - handler 1');
			counter3 ++;
			throw new Error('throw error in handler');
		}, false);
		a.addEvent('fire-error', function() {
			counter3 ++;
			ok(true, 'fire event fire-error, should not stop the event chain - handler 2');
		}, false);
        window.onerror = function(a,b,c) {
			start();
			ok(true, 'should raise error after fireEvent(fire-error), but should not stop the event chain');
			window.onerror = oldError;
			return true;
        };
		a.fireEvent('fire-error');
		equal(counter3, 2, 'should not stop the event chain');
	});
});
}

if (ie) {
	test('events.Events : IE new dom node, onxxx - addEvent - fireEvent', function() {
		expect(2);
		object.use('dom', function(exports, dom) {
			var node = dom.wrap(document.createElement('div'));
			node.onclick = function() {
				ok(true, 'div.onclick is executed, which is not executed in IE');
			};
			node.addEvent('click', function(e) {
				e.preventDefault();
				ok(true, 'standard event(click) on div should be fired manually');
			}, false);
			node.fireEvent('click');	
		});
	});
	test('events.Events : IE new dom node, addEvent - onxxx - fireEvent', function() {
		expect(2);
		object.use('dom', function(exports, dom) {
			var node = dom.wrap(document.createElement('div'));
			node.onclick = function() {
				ok(true, 'div.onclick is executed, which is not executed in IE');
			};
			node.addEvent('click', function(e) {
				e.preventDefault();
				ok(true, 'standard event(click) on div should be fired manually');
			}, false);
			node.fireEvent('click');	
		});
	});
	test('events.Events : IE new dom node, appendChild - onxxx - addEvent - fireEvent', function() {
		expect(2);
		object.use('dom', function(exports, dom) {
			var node = dom.wrap(document.createElement('div'));
			document.body.appendChild(node);
			node.onclick = function() {
				ok(true, 'div.onclick is executed, which is not executed in IE');
			};
			node.addEvent('click', function(e) {
				e.preventDefault();
				ok(true, 'standard event(click) on div should be fired manually');
			}, false);
			node.fireEvent('click');	
		});
	});
	test('events.Events : IE new dom node, onxxx - appendChild - addEvent - fireEvent', function() {
		expect(2);
		object.use('dom', function(exports, dom) {
			var node = dom.wrap(document.createElement('div'));
			node.onclick = function() {
				ok(true, 'div.onclick is executed, which is not executed in IE');
			};
			document.body.appendChild(node);
			node.addEvent('click', function(e) {
				e.preventDefault();
				ok(true, 'standard event(click) on div should be fired manually');
			}, false);
			node.fireEvent('click');	
		});
	});
	test('events.Events : IE new dom node, onxxx - addEvent - appendChild - fireEvent', function() {
		expect(2);
		object.use('dom', function(exports, dom) {
			var node = dom.wrap(document.createElement('div'));
			node.onclick = function() {
				ok(true, 'div.onclick is executed, which is not executed in IE');
			};
			node.addEvent('click', function(e) {
				e.preventDefault();
				ok(true, 'standard event(click) on div should be fired manually');
			}, false);
			document.body.appendChild(node);
			node.fireEvent('click');	
		});
	});
	
	test('events.Events : IE new dom node, addEvent - onxxx - fireEvent - appendChild - fireEvent', function() {
		expect(4);
		object.use('dom', function(exports, dom) {
			var node = dom.wrap(document.createElement('div'));
			node.onclick = function() {
				ok(true, 'div.onclick is executed, which is not executed in IE');
			};
			node.addEvent('click', function(e) {
				e.preventDefault();
				ok(true, 'standard event(click) on div should be fired manually');
			}, false);
			node.fireEvent('click');	
			document.body.appendChild(node);
			node.fireEvent('click');	
		});
	});

	test('events.Events : IE new dom node, onxxx - addEvent - appendChild - onxxx - fireEvent', function() {
		expect(2);
		object.use('dom', function(exports, dom) {
			var node = dom.wrap(document.createElement('div'));
			node.onclick = function() {
				ok(false, 'div.onclick is executed, which is not executed in IE');
			};
			node.addEvent('click', function(e) {
				e.preventDefault();
				ok(true, 'standard event(click) on div should be fired manually');
			}, false);
			document.body.appendChild(node);
			node.onclick = function() {
				ok(true, 'div.onclick, overwrite another');
			};
			node.fireEvent('click');	
		});
	});
}

test('addEvent/removeEvent : mouseleave', function() {
	expect(ie ? 4 : 6);
	object.use('dom', function(exports, dom) {
		var node = dom.wrap(document.createElement('div'));
		node.addEvent('mouseleave', function(e) {
			ok(true, 'mouseleave is fired');
		}, false);
		node.fireEvent('mouseleave');

		var handler = function(e) {
			ok(true, 'should be remove after node.removeEvent called');
		}
		node.addEvent('mouseleave', handler, false);
		node.fireEvent('mouseleave');
		if (!ie) {
			// except IE
			equal(node.__eventListeners['mouseout'].length, 2, 'handler is added to __eventListeners');
		}
		node.removeEvent('mouseleave', handler);
		if (!ie) {
			// except IE
			equal(node.__eventListeners['mouseout'].length, 1, 'handler is removed from __eventListeners');
		}
		node.fireEvent('mouseleave');
	});
});

function fireMouseEventOnElement(element) {
	if (ie) {
		try {
			element.click();
		} catch (e){
			ok(false, 'element.click() throw error in IE : ' + e);
		}
	} else {
		var evt = document.createEvent("MouseEvents");
		evt.initMouseEvent("click", true, true, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
		element.dispatchEvent(evt);	
	}
}

test('wrapPreventDefault for events fired by browser', function() {
	object.use('dom', function(exports, dom) {
		var counter = 0;
		// preventDefault in onclick
		var node = dom.wrap(document.createElement('div'));
		node.onclick = function(event) {
			event.preventDefault();
		};
		node.addEvent('click', function(event) {
			var prevented = event.getPreventDefault? event.getPreventDefault() : event.defaultPrevented;
			if (prevented) {
				counter = counter + 1;
			}
		});
		document.body.appendChild(node);
		fireMouseEventOnElement(node);
		document.body.removeChild(node);

		// preventDefault in addEvent handler
		var node = dom.wrap(document.createElement('div'));
		node.addEvent('click', function(event) {
			event.preventDefault();
			var prevented = event.getPreventDefault? event.getPreventDefault() : event.defaultPrevented;
			if (prevented) {
				counter = counter + 2;
			}
		});
		document.body.appendChild(node);
		fireMouseEventOnElement(node);
		document.body.removeChild(node);

		equal(counter, 3, 'preventDefault in both onxxx and addEvent are ok');
	});
});

test('onxxx, addEvent and addNativeEvent', function() {
	object.use('dom', function(exports, dom) {
		var counter = 0;
		var node = dom.wrap(document.createElement('div'));
		node.onttt = function() {
			equal(counter, 0, 'onttt execute first');
			counter++;
		}
		node.addEvent('ttt', function(){
			equal(counter, 1, 'first addEvent execute first');
			counter ++;
		}, false);
		node.addNativeEvent('ttt', function(){
			equal(counter, 3, 'addNativeEvent execute last');
			counter ++;
		}, false);
		node.addEvent('ttt', function(){
			equal(counter, 2, 'second addEvent execute second');
			counter ++;
		}, false);
		node.fireEvent('ttt');

		var counter2 = 0;
		node.onclick = function() {
			equal(counter2, 0, 'onttt execute first');
			counter2++;
		}
		node.addEvent('click', function(){
			equal(counter2, 1, 'first addEvent execute first');
			counter2 ++;
		}, false);
		node.addNativeEvent('click', function(){
			equal(counter2, 3, 'addNativeEvent execute last');
			counter2 ++;
		}, false);
		node.addEvent('click', function(){
			equal(counter2, 2, 'second addEvent execute second');
			counter2 ++;
		}, false);
		node.fireEvent('click');
	});
});

test('addNativeEvent and preventDefault', function() {
	object.use('dom', function(exports, dom) {
		var counter = 0;
		// preventDefault in onclick
		var node = dom.wrap(document.createElement('div'));
		node.onclick = function(event) {
			event = event || window.event;
			if (event) {
				event.preventDefault();
			}
		};
		node.addNativeEvent('click', function(event) {
			var prevented = event.getPreventDefault? event.getPreventDefault() : event.defaultPrevented;
			if (prevented) {
				counter = counter + 1;
			}
		});
		node.addEvent('click', function(event) {}, false);
		document.body.appendChild(node);
		fireMouseEventOnElement(node);
		document.body.removeChild(node);

		// preventDefault in addEvent handler
		var node = dom.wrap(document.createElement('div'));
		node.addNativeEvent('click', function(event) {
			event.preventDefault();
			var prevented = event.getPreventDefault? event.getPreventDefault() : event.defaultPrevented;
			if (prevented) {
				counter = counter + 2;
			}
		});
		document.body.appendChild(node);
		fireMouseEventOnElement(node);
		document.body.removeChild(node);

		equal(counter, 3, 'preventDefault in both onxxx and addNativeEvent are ok');
	});
});

