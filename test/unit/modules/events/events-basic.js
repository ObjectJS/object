module('events-basic');

test('events is usable', function() {
	expect(7);
	object.use('events', function(exports, events) {
		ok(true, 'events module exists');
		ok(events.Events != null, 'events.Events is ok');
		var A = new Class(function() {
			Class.mixin(this, events.Events);
			this.e = events.fireevent(function() {
				ok(true, 'funtion called : e');
			});	
			this.e_with_preventDefault = events.fireevent(function() {
				// preventDefault, should not be called
				ok(false, 'funtion called : e_with_preventDefault');
			});	
		});
		var a = new A();
		a.addEvent('e', function(e) {
			a.removeEvent('e', arguments.callee);
			ok(true, 'event fired, event handler executed');
		}, false);
		a.addEvent('e_with_preventDefault', function(e) {
			e.preventDefault();
			ok(true, 'event e_with_preventDefault fired, event handler executed');
			a.removeEvent('e', arguments.callee);
		});
		a.e();
		a.e_with_preventDefault();
		a.addEvent('e', function(e) {
			equal(e.a, 1, 'value a passed when fireEvent');
			equal(e.b, 2, 'value b passed when fireEvent');
			a.removeEvent('e', arguments.callee);
		}, false);
		a.fireEvent('e', {a:1,b:2});
	});
});

test('events.wrapEvent', function() {
	object.use('events', function(exports, events) {
		var edges = $UNIT_TEST_CONFIG.testEdges;
		for(var prop in edges) {
			try {
				events.wrapEvent(edges[prop]);
			} catch (e) {
				// ok(false, 'events.wrapEvent(' + prop + ') throw error');
			}
		}
	});
});

test('events.addEvent', function() {
	object.use('events', function(exports, events) {
		var A = new Class(function() {
			Class.mixin(this, events.Events);
		});
		var a = new A();
		try {
			a.addEvent();
		} catch (e) {
			// should throw error, do not eat it
			ok(true, 'a.addEvent() throw error : ' + e);
		}
		try {
			a.addEvent('e');
		} catch (e) {
			// should throw error, do not eat it
			ok(true, 'a.addEvent(e) throw error : ' + e);
		}
		try {
			a.addEvent('e', function() {});
		} catch (e) {
			ok(false, 'a.addEvent(e, function() {}) throw error : ' + e);
		}
		try {
			a.addEvent('e', function() {}, false);
		} catch (e) {
			ok(false, 'a.addEvent(e, function() {}, false) throw error : ' + e);
		}
		var edges = $UNIT_TEST_CONFIG.testEdges;
		for(var prop in edges) {
			try {
				a.addEvent(edges[prop], function(){}, true);
			} catch (e) {
				ok(false, 'a.addEvent(' + prop + ', function(){}, true) throw error : ' + e);
			}
		}
		for(var prop in edges) {
			try {
				a.addEvent('e', edges[prop], true);
			} catch (e) {
				// ok(false, 'a.addEvent(e, ' + prop + ', true) throw error : ' + e);
			}
		}
		for(var prop in edges) {
			try {
				a.addEvent('e', function() {}, edges[prop]);
			} catch (e) {
				ok(false, 'a.addEvent(e, function(){}, ' + prop + ') throw error : ' + e);
			}
		}
	});
});
test('events.removeEvent', function() {
	object.use('events', function(exports, events) {
		var A = new Class(function() {
			Class.mixin(this, events.Events);
		});
		var a = new A();
		try {
			a.removeEvent();
		} catch (e) {
			ok(false, 'a.removeEvent() throw error : ' + e);
		}
		try {
			a.removeEvent('e');
		} catch (e) {
			ok(false, 'a.removeEvent(e) throw error : ' + e);
		}
		try {
			a.removeEvent('e', function() {});
		} catch (e) {
			ok(false, 'a.removeEvent(e, function() {}) throw error : ' + e);
		}
		try {
			a.removeEvent('e', function() {}, false);
		} catch (e) {
			ok(false, 'a.removeEvent(e, function() {}, false) throw error : ' + e);
		}
		var edges = $UNIT_TEST_CONFIG.testEdges;
		for(var prop in edges) {
			try {
				a.removeEvent(edges[prop], function(){}, true);
			} catch (e) {
				ok(false, 'a.removeEvent(' + prop + ', function(){}, true) throw error : ' + e);
			}
		}
		for(var prop in edges) {
			try {
				a.removeEvent('e', edges[prop], true);
			} catch (e) {
				// ok(false, 'a.removeEvent(e, ' + prop + ', true) throw error : ' + e);
			}
		}
		for(var prop in edges) {
			try {
				a.removeEvent('e', function() {}, edges[prop]);
			} catch (e) {
				ok(false, 'a.removeEvent(e, function(){}, ' + prop + ') throw error : ' + e);
			}
		}
	});
});
test('events.fireEvent', function() {
	object.use('events', function(exports, events) {
		var A = new Class(function() {
			Class.mixin(this, events.Events);
		});
		var a = new A();
		try {
			a.fireEvent();
		} catch (e) {
			ok(false, 'a.fireEvent() throw error : ' + e);
		}
		try {
			a.fireEvent('e');
		} catch (e) {
			ok(false, 'a.fireEvent(e) throw error : ' + e);
		}
		try {
			a.fireEvent('e', {a:1});
		} catch (e) {
			ok(false, 'a.fireEvent(e, {a:1}) throw error : ' + e);
		}
		
		var edges = $UNIT_TEST_CONFIG.testEdges;
		for(var prop in edges) {
			try {
				a.fireEvent(edges[prop], {a:1});
			} catch (e) {
				// ok(false, 'a.fireEvent(' + prop + ', {a:1}) throw error : ' + e);
			}
		}
		for(var prop in edges) {
			try {
				a.fireEvent('e', edges[prop]);
			} catch (e) {
				// ok(false, 'a.fireEvent(e, ' + prop + ') throw error : ' + e);
			}
		}
	});
});
