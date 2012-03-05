module('dom-basic')

test('dom imported', function() {
	object.use('dom', function(exports, dom) {
		ok(dom.__name__ == 'dom', 'dom is imported');
		ok(dom.wrap, 'dom.wrap is ok');
	});
});
//$uid
test('dom.$uid basic', function() {
	object.use('dom', function(exports, dom) {
		var edges = $UNIT_TEST_CONFIG.testEdges;
		var counter = 0, start = window.UID;
		for(var prop in edges) {
			try {
				dom.$uid(edges[prop]);
				if(edges[prop] == window || edges[prop] == document
					|| edges[prop] === undefined || edges[prop] === null) {
					continue;
				}
				counter ++;
			} catch (e) {
				ok(false, 'dom.$uid(' + prop + ') throws error : ' + e);
			}
		}
		var end = window.UID;
		equal(end - start, counter, 'window.UID added correctly');//window and document is uided
	});
});
//ready
test('dom.ready basic', function() {
	object.use('dom', function(exports, dom) {
		var edges = $UNIT_TEST_CONFIG.testEdges;
		for(var prop in edges) {
			try {
				if(prop == 'Class') 
					continue;
				dom.ready(edges[prop]);
			} catch (e) {
				ok(false, 'dom.ready(' + prop + ') throws error : ' + e);
			}
		}
	});
});
//wrap
test('dom.wrap basic', function() {
	object.use('dom', function(exports, dom) {
		var edges = $UNIT_TEST_CONFIG.testEdges;
		for(var prop in edges) {
			try {
				dom.wrap(edges[prop]);
			} catch (e) {
				ok(false, 'dom.wrap(' + prop + ') throws error : ' + e);
			}
		}
	});
});
//getElements/getElement
test('dom.getElements basic', function() {
	object.use('dom', function(exports, dom) {
		var edges = $UNIT_TEST_CONFIG.testEdges;
		for(var prop in edges) {
			try {
				dom.getElements(edges[prop]);
			} catch (e) {
				ok(false, 'dom.getElements(' + prop + ') throws error : ' + e);
			}
		}
		for(var prop in edges) {
			try {
				dom.getElement(edges[prop]);
			} catch (e) {
				ok(false, 'dom.getElement(' + prop + ') throws error : ' + e);
			}
		}
	});
});
//id
test('dom.id basic', function() {
	object.use('dom', function(exports, dom) {
		var edges = $UNIT_TEST_CONFIG.testEdges;
		for(var prop in edges) {
			try {
				dom.id(edges[prop]);
			} catch (e) {
				ok(false, 'dom.id(' + prop + ') throws error : ' + e);
			}
		}
	});
});
//eval_inner_JS
test('dom.eval_inner_JS basic', function() {
	object.use('dom', function(exports, dom) {
		var edges = $UNIT_TEST_CONFIG.testEdges;
		for(var prop in edges) {
			try {
				dom.eval_inner_JS(edges[prop]);
			} catch (e) {
				ok(false, 'dom.eval_inner_JS(' + prop + ') throws error : ' + e);
			}
		}
	});
});
//getDom
test('dom.getDom basic', function() {
	object.use('dom', function(exports, dom) {
		var edges = $UNIT_TEST_CONFIG.testEdges;
		for(var prop in edges) {
			try {
				dom.getDom(edges[prop]);
			} catch (e) {
				ok(false, 'dom.getDom(' + prop + ') throws error : ' + e);
			}
		}
	});
});
//ElementClassList
test('ElementClassList basic', function() {
	return;
	object.use('dom', function(exports, dom) {
		var edges = $UNIT_TEST_CONFIG.testEdges;
		for(var prop in edges) {
			try {
				new dom.ElementClassList(edges[prop]);
			} catch (e) {
				ok(false, 'new dom.ElementClassList(' + prop + ') throws error : ' + e);
			}
		}
	});
});
//Element
test('Element basic', function() {
	return;
	object.use('dom', function(exports, dom) {
		var edges = $UNIT_TEST_CONFIG.testEdges;
		for(var prop in edges) {
			try {
				new dom.Element(edges[prop]);
			} catch (e) {
				ok(false, 'new dom.Element(' + prop + ') throws error : ' + e);
			}
		}
	});
});
//ImageElement
test('ImageElement basic', function() {
	return;
	object.use('dom', function(exports, dom) {
		var edges = $UNIT_TEST_CONFIG.testEdges;
		for(var prop in edges) {
			try {
				new dom.ImageElement(edges[prop]);
			} catch (e) {
				ok(false, 'new dom.ImageElement(' + prop + ') throws error : ' + e);
			}
		}
	});
});
//FormElement
test('FormElement basic', function() {
	return;
	object.use('dom', function(exports, dom) {
		var edges = $UNIT_TEST_CONFIG.testEdges;
		for(var prop in edges) {
			try {
				new dom.FormElement(edges[prop]);
			} catch (e) {
				ok(false, 'new dom.FormElement(' + prop + ') throws error : ' + e);
			}
		}
	});
});
//FormItemElement
test('FormItemElement basic', function() {
	return;
	object.use('dom', function(exports, dom) {
		var edges = $UNIT_TEST_CONFIG.testEdges;
		for(var prop in edges) {
			try {
				new dom.FormItemElement(edges[prop]);
			} catch (e) {
				ok(false, 'new dom.FormItemElement(' + prop + ') throws error : ' + e);
			}
		}
	});
});
//Window/Document
test('Window basic', function() {
	return;
	object.use('dom', function(exports, dom) {
		var edges = $UNIT_TEST_CONFIG.testEdges;
		for(var prop in edges) {
			try {
				new dom.Window(edges[prop]);
			} catch (e) {
				ok(false, 'new dom.Window(' + prop + ') throws error : ' + e);
			}
		}
	});
});
//Elements
test('Elements basic', function() {
	return;
	object.use('dom', function(exports, dom) {
		var edges = $UNIT_TEST_CONFIG.testEdges;
		for(var prop in edges) {
			try {
				new dom.Elements(edges[prop]);
			} catch (e) {
				ok(false, 'new dom.Elements(' + prop + ') throws error : ' + e);
			}
		}
		for(var prop in edges) {
			try {
				new dom.Elements([], edges[prop]);
			} catch (e) {
				ok(false, 'new dom.Elements([], ' + prop + ') throws error : ' + e);
			}
		}
	});
});

//getCommon
test('getCommon', function() {
	function getCommon(arr1, arr2) {
		if(!arr1 || !arr2) return null;
		var i = 0;
		while(arr1[i] && arr1[i] === arr2[i]) i++;
		return arr1.slice(0, i);
	}
	equal(1, getCommon([1,2], [1,3])[0], 'getCommon works');
	equal(1, getCommon([1,2,5], [1,3])[0], 'getCommon works');
	equal(2, getCommon([1,2,5], [1,2,3])[1], 'getCommon return correct elements');
	equal(0, getCommon([5,1,2,3], [1,2,3]).length, 'getCommon return []');
	equal(0, getCommon([1,2], [2,1]).length, 'getCommon return []');
	equal(null, getCommon(null,[1,2]), 'getCommon return null');
});
