module('events-onxxx');

object.use('events, dom, ua', function(exports, events, dom, ua) {
	window.events = events;
	window.dom = dom;
	window.ua = ua;
});

var isChrome = ua.ua.chrome || ua.ua.opera || ua.ua.webkit > 525;
var isFF = ua.ua.firefox;
var isIE = ua.ua.ie;

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
	expect(isChrome ? 5 : 4);
	Class.inject(events.Events, obj = {});
	var counter = 0;
	obj.onxxx = function() {
		equal(counter, 0, 'onxxx should be the first, counter = 0');
		counter ++;
		throw new Error('error throwed in onhandler');
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
	expect(isChrome ? 5 : 4);
	Class.inject(events.Events, obj = {});
	var counter = 0;
	obj.addEvent('xxx', function() {
		equal(counter, 0, 'first addEvent should be the first, counter = 0');
		counter ++;
	}, false);
	obj.onxxx = function() {
		equal(counter, 1, 'onxxx should be the second, counter = 1');
		counter ++;
		throw new Error('error throwed in onhandler');
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
	expect(isChrome ? 5 : 4);
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
		throw new Error('error throwed in onhandler');
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
	expect(isChrome ? 5 : 4);
	Class.inject(events.Events, obj = {});
	var counter = 0;
	obj.onxxx = function() {
		equal(counter, 0, 'onxxx should be the first, counter = 0');
		counter ++;
	}
	obj.addEvent('xxx', function() {
		equal(counter, 1, 'first addEvent should be the second, counter = 1');
		counter ++;
		throw new Error('error throwed in addEvent handler');
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
	expect(isChrome ? 5 : 4);
	Class.inject(events.Events, obj = {});
	var counter = 0;
	obj.addEvent('xxx', function() {
		equal(counter, 0, 'first addEvent should be the first, counter = 0');
		counter ++;
		throw new Error('error throwed in addEvent handler');
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
	expect(isChrome ? 5 : 4);
	Class.inject(events.Events, obj = {});
	var counter = 0;
	obj.addEvent('xxx', function() {
		equal(counter, 0, 'first addEvent should be the first, counter = 0');
		counter ++;
		throw new Error('error throwed in addEvent handler');
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
	expect(isChrome ? 6 : 5);
	Class.inject(events.Events, obj = {});
	var counter = 0;
	obj.addEvent('xxx', function() {
		equal(counter, 0, 'first addEvent should be the first, counter = 0');
		counter ++;
		throw new Error('error throwed in addEvent handler');
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
	expect(isChrome ? 6 : 5);
	Class.inject(events.Events, obj = {});
	var counter = 0;
	obj.addEvent('click', function() {
		equal(counter, 0, 'first addEvent should be the first, counter = 0');
		counter ++;
		throw new Error('error throwed in addEvent handler');
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
	if (!obj) {
		obj = document.createElement('div');
		document.body.appendChild(obj);
	}
	object.use('dom', function(exports, dom) {
		dom.wrap(obj);
	});
	var counter = 0;
	obj.addEvent('click', function() {
		var expect = isIE ? 1 : (isChrome ? 0 : 0);
		equal(counter, expect, 'first addEvent, order : ' + expect);
		counter ++;
	}, false);
	obj.onclick = function() {
		ok(false, 'this onxxx should not be executed');
		counter ++;	//should not add
	}
	obj.addEvent('click', function() {
		var expect = isIE ? 2 : (isChrome || ua.ua.webkit < 525 ? 1 : 2);
		equal(counter, expect, 'second addEvent, order : ' + expect);
		counter ++;
	}, false);
	obj.onclick = function() {
		var expect = isIE ? 0 : (isChrome  || ua.ua.webkit < 525 ? 2 : 1);
		equal(counter, expect, 'onxxx , order :  ' + expect);
		counter ++;
	}
	obj.addEvent('click', function() {
		var expect = isIE ? 3 : (isChrome ? 3 : 3);
		equal(counter, expect, 'third addEvent, order : ' + expect);
		counter ++;
	}, false);
	obj.fireEvent('click');
	equal(counter, 4, 'two onclick and three addEvent(click) are executed by fireEvent(click)');
});

test('two onxxx(standard event in DOM Node - for IE wrap), 5 handlers, 1, onxxx, 2, onxxx, 3', function() {
	expect(6);
	var obj = dom.id('qunit-header')
	if (!obj) {
		obj = dom.wrap(document.createElement('div'));
		document.body.appendChild(obj);
	}
	var counter = 0;
	obj.addEvent('dblclick', function() {
		var expect = isIE ? 1 : (isChrome ? 0 : 0);
		equal(counter, expect, 'first addEvent, order : ' + expect);
		counter ++;
	}, false);
	obj.ondblclick = function() {
		ok(false, 'this onxxx should not be executed');
		counter ++;	//should not add
	}
	obj.addEvent('dblclick', function(e) {
		var expect = isIE ? 2 : (isChrome || ua.ua.webkit < 525  ? 1 : 2);
		equal(e.a, 1, 'e.a is ok with IE nativeFireEvent');
		equal(counter, expect, 'second addEvent, order : ' + expect);
		counter ++;
	}, false);
	obj.ondblclick = function() {
		var expect = isIE ? 0 : (isChrome || ua.ua.webkit < 525  ? 2 : 1);
		equal(counter, expect, 'onxxx , order :  ' + expect);
		counter ++;
	}
	obj.addEvent('dblclick', function() {
		var expect = isIE ? 3 : (isChrome ? 3 : 3);
		equal(counter, expect, 'third addEvent, order : ' + expect);
		counter ++;
	}, false);
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

test('standard event on DOM node - event can not be fired on node', function() {
	expect(6);
	var obj = dom.id('qunit-header')
	if (!obj) {
		obj = dom.wrap(document.createElement('div'));
		document.body.appendChild(obj);
	}
	var counter = 0;
	obj.addEvent('reset', function() {
		var expect = isIE ? 0 : (isChrome ? 0 : 0);
		equal(counter, expect, 'first addEvent, order : ' + expect);
		counter ++;
	}, false);
	obj.onreset = function() {
		ok(false, 'this onxxx should not be executed');
		counter ++;	//should not add
	}
	obj.addEvent('reset', function(e) {
		var expect = isIE ? 1 : (isChrome || ua.ua.webkit < 525  ? 1 : 2);
		equal(e.a, 1, 'e.a is ok with IE nativeFireEvent');
		equal(counter, expect, 'second addEvent, order : ' + expect);
		counter ++;
	}, false);
	obj.onreset = function() {
		var expect = isIE ? 2 : (isChrome || ua.ua.webkit < 525  ? 2 : 1);
		equal(counter, expect, 'onxxx , order :  ' + expect);
		counter ++;
	}
	obj.addEvent('reset', function() {
		var expect = isIE ? 3 : (isChrome ? 3 : 3);
		equal(counter, expect, 'third addEvent, order : ' + expect);
		counter ++;
	}, false);
	obj.fireEvent('reset', {a:1});
	equal(counter, 4, 'two onreset and three addEvent(reset) are executed by fireEvent(reset)');
});

test('standard event on DOM node - Node not inserted', function() {
	expect(6);
	obj = dom.wrap(document.createElement('div'));
	var counter = 0;
	obj.addEvent('reset', function() {
		var expect = isIE ? 0 : (isChrome ? 0 : 0);
		equal(counter, expect, 'first addEvent, order : ' + expect);
		counter ++;
	}, false);
	obj.onreset = function() {
		ok(false, 'this onxxx should not be executed');
		counter ++;	//should not add
	}
	obj.addEvent('reset', function(e) {
		var expect = isIE ? 1 : (isChrome || ua.ua.webkit < 525  ? 1 : 2);
		equal(e.a, 1, 'e.a is ok with IE nativeFireEvent');
		equal(counter, expect, 'second addEvent, order : ' + expect);
		counter ++;
	}, false);
	obj.onreset = function() {
		var expect = isIE ? 2 : (isChrome || ua.ua.webkit < 525  ? 2 : 1);
		equal(counter, expect, 'onxxx , order :  ' + expect);
		counter ++;
	}
	document.body.appendChild(obj)
	obj.addEvent('reset', function() {
		var expect = isIE ? 3 : (isChrome ? 3 : 3);
		equal(counter, expect, 'third addEvent, order : ' + expect);
		counter ++;
	}, false);
	obj.fireEvent('reset', {a:1});
	equal(counter, 4, 'two onreset and three addEvent(reset) are executed by fireEvent(reset)');
});

test('wrap DOM node', function() {
	var wrapper = dom.Element;
	wrapper.prototype.innerHTML = '1';
	wrapper.prototype.tagName = '2';
	wrapper.prototype.testFunction = function() {
		return 1;
	}
	document.fireEvent = function() {}
	document.testFunction = function() {}

	document.innerHTML = 'inner';
	document.tagName = 'window';

	Class.inject(wrapper, document, function(dest, src, prop) {
		// dest原有的属性中，function全部覆盖，属性不覆盖已有的
		if (typeof src[prop] != 'function') {
			if (!(prop in dest)) {
				return true;
			} else {
				return false;
			}
		} else {
			return true;
		}
	});

	notEqual(document.innerHTML, '1', 'innerHTML is not wrapped');
	notEqual(document.tagName , '2', 'tagName is not wrapped');
	equal(document.testFunction(), 1, 'testFunction is wrapped');
	document.addEvent('a', function() {
		ok(true, 'window.addEvent is ok');
	});
	document.ona = function() {
		ok(true, 'window.one is ok');
	}
	document.fireEvent('a');
});
//by fireEvent   / by operation

test('onrequestsuccess and requestSuccess event', function() {
	expect(4);
	var obj = {};
	Class.inject(events.Events, obj);
	var counter = 0;
	obj.onrequestsuccess = function() {
		ok(true, 'onrequestsuccess called');
	}
	obj.addEvent('requestSuccess', function() {
		ok(true, 'addEvent handler called');
	}, false);

	obj.fireEvent('requestSuccess');

	obj.onrequestsuccess = null;
	obj.fireEvent('requestSuccess');

	obj.onrequestsuccess2 = function() {
		ok(true, 'onrequestsuccess called');
	}
	obj.fireEvent('requestSuccess2');

	obj.onrequestsuccess2 = null;
	obj.fireEvent('requestSuccess2');

});
