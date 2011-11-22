module('events-onxxx');

object.use('events, dom', function(exports, events, dom) {
	window.events = events;
	window.dom = dom;
});

test('events.onxxx - does not have onxxx, execute as ordered', function(){
	Class.inject(events.Events, obj = {});
	var counter = 0;
	obj.addEvent('xxx', function() {
		equal(counter, 0, 'first addEvent should be the first, counter = 0');
		counter ++;
	}, false);
	obj.addEvent('xxx', function() {
		equal(counter, 1, 'second addEvent should be the second, counter = 1');
		counter ++;
	}, false);
	obj.fireEvent('xxx');
	equal(counter, 2, 'two addEvent are executed by fireEvent(xxx) in correct order');
});

test('events.onxxx - has onxxx, only 1 handler', function(){
	Class.inject(events.Events, obj = {});
	var counter = 0;
	obj.onxxx = function() {
		ok(true, 'ok');
		counter ++;
	}
	obj.fireEvent('xxx');
	equal(counter, 1, 'onxxx is executed by fireEvent(xxx)');
});

test('has onxxx, 2 handlers, onxxx is first', function(){
	Class.inject(events.Events, obj = {});
	var counter = 0;
	obj.onxxx = function() {
		equal(counter, 0, 'onxxx should be the first, counter = 0');
		counter ++;
	}
	obj.addEvent('xxx', function() {
		equal(counter, 1, 'addEvent should be the second, counter = 1');
		counter ++;
	}, false);
	obj.fireEvent('xxx');
	equal(counter, 2, 'onxxx and addEvent(xxx) is executed by fireEvent(xxx)');
});

test('has onxxx, 2 handlers, onxxx is last', function(){
	Class.inject(events.Events, obj = {});
	var counter = 0;
	obj.addEvent('xxx', function() {
		equal(counter, 0, 'addEvent should be the first, counter = 0');
		counter ++;
	}, false);
	obj.onxxx = function() {
		equal(counter, 1, 'onxxx should be the second, counter = 1');
		counter ++;
	}
	obj.fireEvent('xxx');
	equal(counter, 2, 'addEvent(xxx) and onxxx is executed by fireEvent(xxx)');
});

test('has onxxx, 3 handlers, onxxx is first', function(){
	Class.inject(events.Events, obj = {});
	var counter = 0;
	obj.onxxx = function() {
		equal(counter, 0, 'onxxx should be the first, counter = 0');
		counter ++;
	}
	obj.addEvent('xxx', function() {
		equal(counter, 1, 'first addEvent should be the second, counter = 1');
		counter ++;
	}, false);
	obj.addEvent('xxx', function() {
		equal(counter, 2, 'second addEvent should be the third, counter = 2');
		counter ++;
	}, false);
	obj.fireEvent('xxx');
	equal(counter, 3, 'onxxx and two addEvent(xxx) are executed by fireEvent(xxx)');
});

test('has onxxx, 3 handlers, onxxx is center', function(){
	Class.inject(events.Events, obj = {});
	var counter = 0;
	obj.addEvent('xxx', function() {
		equal(counter, 0, 'first addEvent should be the first, counter = 0');
		counter ++;
	}, false);
	obj.onxxx = function() {
		equal(counter, 1, 'onxxx should be the second, counter = 1');
		counter ++;
	}
	obj.addEvent('xxx', function() {
		equal(counter, 2, 'second addEvent should be the third, counter = 2');
		counter ++;
	}, false);
	obj.fireEvent('xxx');
	equal(counter, 3, 'onxxx and two addEvent(xxx) are executed by fireEvent(xxx)');
});

test('has onxxx, 3 handlers, onxxx is last', function(){
	Class.inject(events.Events, obj = {});
	var counter = 0;
	obj.addEvent('xxx', function() {
		equal(counter, 0, 'first addEvent should be the first, counter = 0');
		counter ++;
	}, false);
	obj.addEvent('xxx', function() {
		equal(counter, 1, 'second addEvent should be the second, counter = 1');
		counter ++;
	}, false);
	obj.onxxx = function() {
		equal(counter, 2, 'onxxx should be the third, counter = 2');
		counter ++;
	}
	obj.fireEvent('xxx');
	equal(counter, 3, 'onxxx and two addEvent(xxx) are executed by fireEvent(xxx)');
});

test('has onxxx(throw error), 3 handlers, onxxx is first', function(){
	expect(5);
	Class.inject(events.Events, obj = {});
	var counter = 0;
	obj.onxxx = function() {
		equal(counter, 0, 'onxxx should be the first, counter = 0');
		counter ++;
		throw new Error('error');
	}
	obj.addEvent('xxx', function() {
		equal(counter, 1, 'first addEvent should be the second, counter = 1');
		counter ++;
	}, false);
	obj.addEvent('xxx', function() {
		equal(counter, 2, 'second addEvent should be the third, counter = 2');
		counter ++;
	}, false);
	var oldOnerror = window.onerror;
	window.onerror = function() {
		ok(true, 'error is throwed out, but the event chain is not stopped');
		window.onerror = oldOnerror;
	}
	obj.fireEvent('xxx');
	equal(counter, 3, 'onxxx and two addEvent(xxx) are executed by fireEvent(xxx)');
});

test('has onxxx(throw error), 3 handlers, onxxx is center', function(){
	expect(5);
	Class.inject(events.Events, obj = {});
	var counter = 0;
	obj.addEvent('xxx', function() {
		equal(counter, 0, 'first addEvent should be the first, counter = 0');
		counter ++;
	}, false);
	obj.onxxx = function() {
		equal(counter, 1, 'onxxx should be the second, counter = 1');
		counter ++;
		throw new Error('error');
	}
	obj.addEvent('xxx', function() {
		equal(counter, 2, 'second addEvent should be the third, counter = 2');
		counter ++;
	}, false);
	var oldOnerror = window.onerror;
	window.onerror = function() {
		ok(true, 'error is throwed out, but the event chain is not stopped');
		window.onerror = oldOnerror;
	}
	obj.fireEvent('xxx');
	equal(counter, 3, 'onxxx and two addEvent(xxx) are executed by fireEvent(xxx)');
});

test('has onxxx(throw error), 3 handlers, onxxx is last', function(){
	expect(5);
	Class.inject(events.Events, obj = {});
	var counter = 0;
	obj.addEvent('xxx', function() {
		equal(counter, 0, 'first addEvent should be the first, counter = 0');
		counter ++;
	}, false);
	obj.addEvent('xxx', function() {
		equal(counter, 1, 'second addEvent should be the second, counter = 1');
		counter ++;
	}, false);
	obj.onxxx = function() {
		equal(counter, 2, 'onxxx should be the third, counter = 2');
		counter ++;
		throw new Error('error');
	}
	var oldOnerror = window.onerror;
	window.onerror = function() {
		ok(true, 'error is throwed out, but the event chain is not stopped');
		window.onerror = oldOnerror;
	}
	obj.fireEvent('xxx');
	equal(counter, 3, 'onxxx and two addEvent(xxx) are executed by fireEvent(xxx)');
});

test('has onxxx, 3 handlers(first addEvent throw error), onxxx is first', function(){
	expect(5);
	Class.inject(events.Events, obj = {});
	var counter = 0;
	obj.onxxx = function() {
		equal(counter, 0, 'onxxx should be the first, counter = 0');
		counter ++;
	}
	obj.addEvent('xxx', function() {
		equal(counter, 1, 'first addEvent should be the second, counter = 1');
		counter ++;
		throw new Error('error');
	}, false);
	obj.addEvent('xxx', function() {
		equal(counter, 2, 'second addEvent should be the third, counter = 2');
		counter ++;
	}, false);
	var oldOnerror = window.onerror;
	window.onerror = function() {
		ok(true, 'error is throwed out, but the event chain is not stopped');
		window.onerror = oldOnerror;
	}
	obj.fireEvent('xxx');
	equal(counter, 3, 'onxxx and two addEvent(xxx) are executed by fireEvent(xxx)');
});

test('has onxxx, 3 handlers(first addEvent throw error), onxxx is center', function(){
	expect(5);
	Class.inject(events.Events, obj = {});
	var counter = 0;
	obj.addEvent('xxx', function() {
		equal(counter, 0, 'first addEvent should be the first, counter = 0');
		counter ++;
		throw new Error('error');
	}, false);
	obj.onxxx = function() {
		equal(counter, 1, 'onxxx should be the second, counter = 1');
		counter ++;
	}
	obj.addEvent('xxx', function() {
		equal(counter, 2, 'second addEvent should be the third, counter = 2');
		counter ++;
	}, false);
	var oldOnerror = window.onerror;
	window.onerror = function() {
		ok(true, 'error is throwed out, but the event chain is not stopped');
		window.onerror = oldOnerror;
	}
	obj.fireEvent('xxx');
	equal(counter, 3, 'onxxx and two addEvent(xxx) are executed by fireEvent(xxx)');
});

test('has onxxx, 3 handlers(first addEvent throw error), onxxx is last', function(){
	expect(5);
	Class.inject(events.Events, obj = {});
	var counter = 0;
	obj.addEvent('xxx', function() {
		equal(counter, 0, 'first addEvent should be the first, counter = 0');
		counter ++;
		throw new Error('error');
	}, false);
	obj.addEvent('xxx', function() {
		equal(counter, 1, 'second addEvent should be the second, counter = 1');
		counter ++;
	}, false);
	obj.onxxx = function() {
		equal(counter, 2, 'onxxx should be the last, counter = 2');
		counter ++;
	}
	var oldOnerror = window.onerror;
	window.onerror = function() {
		ok(true, 'error is throwed out, but the event chain is not stopped');
		window.onerror = oldOnerror;
	}
	obj.fireEvent('xxx');
	equal(counter, 3, 'onxxx and two addEvent(xxx) are executed by fireEvent(xxx)');
});

test('two onxxx, 5 handlers, 1, onxxx, 2, onxxx, 3', function() {
	expect(6);
	Class.inject(events.Events, obj = {});
	var counter = 0;
	obj.addEvent('xxx', function() {
		equal(counter, 0, 'first addEvent should be the first, counter = 0');
		counter ++;
		throw new Error('error');
	}, false);
	obj.onxxx = function() {
		equal(false, 1, 'this onxxx should not be executed');
		counter ++;	//should not add
	}
	obj.addEvent('xxx', function() {
		equal(counter, 1, 'second addEvent should be the second, counter = 1');
		counter ++;
	}, false);
	obj.onxxx = function() {
		equal(counter, 2, 'onxxx should be the third, counter = 2');
		counter ++;
	}
	obj.addEvent('xxx', function() {
		equal(counter, 3, 'third addEvent should be the fourth, counter = 3');
		counter ++;
	}, false);
	var oldOnerror = window.onerror;
	window.onerror = function() {
		ok(true, 'error is throwed out, but the event chain is not stopped');
		window.onerror = oldOnerror;
	}
	obj.fireEvent('xxx');
	equal(counter, 4, 'two onxxx and three addEvent(xxx) are executed by fireEvent(xxx)');
});

test('two onxxx(standard event), 5 handlers, 1, onxxx, 2, onxxx, 3', function() {
	expect(6);
	Class.inject(events.Events, obj = {});
	var counter = 0;
	obj.addEvent('click', function() {
		equal(counter, 0, 'first addEvent should be the first, counter = 0');
		counter ++;
		throw new Error('error');
	}, false);
	obj.onclick = function() {
		ok(false, 'this onxxx should not be executed');
		counter ++;	//should not add
	}
	obj.addEvent('click', function() {
		equal(counter, 1, 'second addEvent should be the second, counter = 1');
		counter ++;
	}, false);
	obj.onclick = function() {
		equal(counter, 2, 'onxxx should be the third, counter = 2');
		counter ++;
	}
	obj.addEvent('click', function() {
		equal(counter, 3, 'third addEvent should be the fourth, counter = 3');
		counter ++;
	}, false);
	var oldOnerror = window.onerror;
	window.onerror = function() {
		ok(true, 'error is throwed out, but the event chain is not stopped');
		window.onerror = oldOnerror;
	}
	obj.fireEvent('click');
	equal(counter, 4, 'two onclick and three addEvent(click) are executed by fireEvent(click)');
});

test('two onxxx(standard event in DOM Node), 5 handlers, 1, onxxx, 2, onxxx, 3', function() {
	expect(5);
	obj = document.getElementById('qunit-header');
	Class.inject(events.Events, obj);
	var counter = 0;
	obj.addEvent('click', function() {
		equal(counter, 0, 'first addEvent should be the first, counter = 0');
		counter ++;
	}, false);
	obj.onclick = function() {
		ok(false, 'this onxxx should not be executed');
		counter ++;	//should not add
	}
	obj.addEvent('click', function() {
		equal(counter, 1, 'second addEvent should be the second, counter = 1');
		counter ++;
	}, false);
	obj.onclick = function() {
		equal(counter, 2, 'onxxx should be the third, counter = 2');
		counter ++;
	}
	obj.addEvent('click', function() {
		equal(counter, 3, 'third addEvent should be the fourth, counter = 3');
		counter ++;
	}, false);
	//why obj.click can invoke addEvent(click) handlers???
	obj.fireEvent('click');
	equal(counter, 4, 'two onclick and three addEvent(click) are executed by fireEvent(click)');
});

test('two onxxx(standard event in DOM Node - for IE wrap), 5 handlers, 1, onxxx, 2, onxxx, 3', function() {
	expect(6);
	obj = dom.id('qunit-header');
	var counter = 0;
	obj.addEvent('dblclick', function() {
		equal(counter, 0, 'first addEvent should be the first, counter = 0');
		counter ++;
	}, false);
	obj.ondblclick = function() {
		ok(false, 'this onxxx should not be executed');
		counter ++;	//should not add
	}
	obj.addEvent('dblclick', function(e) {
		equal(e.a, 1, 'e.a is ok with IE nativeFireEvent');
		equal(counter, 1, 'second addEvent should be the second, counter = 1');
		counter ++;
	}, false);
	obj.ondblclick = function() {
		equal(counter, 2, 'onxxx should be the third, counter = 2');
		counter ++;
	}
	obj.addEvent('dblclick', function() {
		equal(counter, 3, 'third addEvent should be the fourth, counter = 3');
		counter ++;
	}, false);
	//why obj.click can invoke addEvent(click) handlers???
	obj.fireEvent('dblclick', {a:1});
	equal(counter, 4, 'two onclick and three addEvent(click) are executed by fireEvent(click)');
});

test('remove onxxx in center', function() {
	expect(3);
	Class.inject(events.Events, obj = {});
	var counter = 0;
	obj.onxxx = function() {
		ok(false, 'onxxx should not be executed');
	}
	obj.addEvent('xxx', function() {
		equal(counter, 0, 'onxxx is deleted, so first addEvent should be the first, counter = 0');
		counter ++;
	}, false);
	obj.onxxx = null;
	obj.addEvent('xxx', function() {
		equal(counter, 1, 'onxxx is deleted, so second addEvent should be the second, counter = 1');
		counter ++;
	}, false);
	obj.fireEvent('xxx');
	equal(counter, 2, 'two addEvent(xxx) are executed by fireEvent(xxx)');
});

test('remove onxxx at last', function() {
	expect(3);
	Class.inject(events.Events, obj = {});
	var counter = 0;
	obj.onxxx = function() {
		ok(false, 'onxxx should not be executed');
	}
	obj.addEvent('xxx', function() {
		equal(counter, 0, 'onxxx is deleted, so first addEvent should be the first, counter = 0');
		counter ++;
	}, false);
	obj.addEvent('xxx', function() {
		equal(counter, 1, 'onxxx is deleted, so second addEvent should be the second, counter = 1');
		counter ++;
	}, false);
	obj.onxxx = null;
	obj.fireEvent('xxx');
	equal(counter, 2, 'two addEvent(xxx) are executed by fireEvent(xxx)');
});

//by fireEvent   / by operation
