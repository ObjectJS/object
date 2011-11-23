module('dom.usage')

function assertPropExists(props, obj, desc, showTrue) {
	desc = desc || '';
	for(var i=0,l=props.length; i<l; i++) {
		if(!(props[i] in obj) && !(props[i] in obj.__properties__)) {
			ok(false, props[i] + ' missed in ' + desc);
		} else {
			if(showTrue || $UNIT_TEST_CONFIG.SHOW_TRUE) {
				ok(true, props[i] + ' is mixined in ' + desc);
			}
		}
	}
}
function assertPropNotExists(props, obj, desc, showTrue) {
	desc = desc || '';
	for(var i=0,l=props.length; i<l; i++) {
		if(props[i] in obj || props[i] in obj.__properties__) {
			ok(false, props[i] + ' should not exist in ' + desc);
		} else {
			if(showTrue || $UNIT_TEST_CONFIG.SHOW_TRUE) {
				ok(true, props[i] + ' is not mixined in ' + desc + ', which is correct');
			}
		}
	}
}
function getProps(obj) {
	var props = [];
	for(var prop in obj) {
		if(prop.indexOf('__') == 0) {
			continue;
		}
		props.push(prop);
	}
	return props;
}

function createNode(tagName, className) {
	var node = document.createElement(tagName);
	node.className = className;
	node.style.display = 'none';
	document.body.appendChild(node);
	return node;
}

object.use('dom', function(exports, dom) {
	window.elementProps = Class.keys(dom.Element);
	window.formInputElementPropsOnly = ['selectionStart', 'selectionEnd', 'getSelected', 'value', 'validity',
			'validationMessage','setCustomValidity', 'checkValidity', 'focusToPosition'];
	window.formInputElementProps = formInputElementPropsOnly.concat(window.elementProps);
});
test('dom.utils-wrap', function() {
	object.use('dom', function(exports, dom) {
		ok(dom.__name__ == 'dom', 'dom is imported');
	});
});
//$uid
test('dom.$uid', function() {
	object.use('dom', function(exports, dom) {
		var oldUID = window.UID;
		var obj = {};
		dom.$uid(obj);
		equal(obj.uid, oldUID, 'uid is assigned to obj');
		equal(window.UID, oldUID + 1, 'window.$UID is added by one');
		equal(window.uid, 1, 'window.uid = 1');
		equal(document.uid, 2, 'document.uid = 2');
	});
});

//wrap
test('dom.wrap - method mixinined into element', function() {
	object.use('dom', function(exports, dom) {
		var elementProps = getProps(new dom.Element('div'));

		var element = dom.wrap(window);
		ok(window._wrapped, 'window is wrapped');
		ok(window.addEvent != null, 'addEvent is wrapped window');
		element = dom.wrap(document);
		ok(document._wrapped, 'document is wrapped');

		element = dom.wrap(document.createElement('div'));
		assertPropExists(elementProps, element, 'document.createElement(div)');

		element = dom.wrap('string');
		equal(element, 'string', 'dom.wrap do not handle String');

		element = dom.wrap(document.createElement('img'));
		assertPropExists(elementProps, element, 'document.createElement(img)');
		assertPropExists(['naturalWidth', 'naturalHeight'], element, 'document.createElement(img)');

		element = dom.wrap(document.createElement('form'));
		assertPropExists(['send', 'toQueryString', 'checkValidity'].concat(elementProps), 
			element, 'document.createElement(form)');

		element = dom.wrap(document.createElement('input'));
		assertPropExists(formInputElementProps.concat(['placeholder', 'bindPlaceholder', 'formAction', 'formEnctype', 'formMethod', 'formNoValidate', 'formTarget', 'send']), element, 'document.createElement(input)');
		element = dom.wrap(document.createElement('textarea'));
		assertPropExists(formInputElementProps.concat(['placeholder', 'bindPlaceholder']), element, 'document.createElement(textarea)');
		element = dom.wrap(document.createElement('output'));
		assertPropExists(formInputElementProps, element, 'document.createElement(output)');
		element = dom.wrap(document.createElement('select'));
		assertPropExists(formInputElementProps, element, 'document.createElement(select)');
		element = dom.wrap(document.createElement('option'));
		assertPropExists(formInputElementProps.filter(function(ele) {
			// option has no validity
			return ele != 'setCustomValidity' && ele != 'checkValidity';
		}), element, 'document.createElement(option)');
		element = dom.wrap(document.createElement('button'));
		assertPropExists(formInputElementProps, element, 'document.createElement(button)');
	});
});

test('getElements/getElement', function() {
	object.use('dom', function(exports, dom) {
		var forms = dom.getElements('div');
		for (var i=0,l=forms.length; i<l; i++) {
			assertPropExists(elementProps, forms[i], 'dom.getElements(div)');
		}
		var form = dom.getElement('div');
		assertPropExists(elementProps, form, 'dom.getElement(div)');

		var inputNode = createNode('input', 'test-two-inputs');
		var selectNode = createNode('select', 'test-two-inputs');
		var nodes = dom.getElements('input.test-two-inputs, select.test-two-inputs'); // should be wrapped by FormItemElement
		for(var i=0, l=nodes.length, node; i < l; i++) {
			node = nodes[i];
			assertPropExists(formInputElementProps,node,'dom.getElements(input.test-two-inputs, select.test-two-inputs) '+node.tagName);
		}
		ok('focusToPosition' in nodes, 'common methods is wrapped in Array-Like object by dom.getElements, Fantastic!');

		var divNode = createNode('div', 'div-test');
		var inputNode2 = createNode('input', 'test-with-div');
		var nodes = dom.getElements('div.div-test, input.test-with-div');
		for(var i=0, l=nodes.length, node; i < l; i++) {
			node = nodes[i];
			if(node.tagName == 'INPUT') {
				assertPropExists(formInputElementProps, node, 
					'dom.getElements(div.div-test, input.test-with-div) ' + node.tagName);
			} else {
				assertPropExists(elementProps, node, 
					'dom.getElements(div.div-test, input.test-with-div) ' + node.tagName);	
			}
		}

		var inputNode3 = createNode('input', 'test-alone');
		var node = dom.getElement('input.test-alone');
		assertPropExists(formInputElementProps, node, 'dom.getElement(input.test-alone) ' + node.tagName);

		document.body.removeChild(inputNode);
		document.body.removeChild(selectNode);
		document.body.removeChild(divNode);
		document.body.removeChild(inputNode2);
		document.body.removeChild(inputNode3);
	});
});

test('dom.id', function() {
	object.use('dom', function(exports, dom) {
		var ele = dom.id('qunit-header');
		assertPropExists(elementProps, ele, 'dom.id(qunit-header)');
	});
});

//eval_inner_JS
test('dom.eval_inner_JS', function() {
	object.use('dom', function(exports, dom) {
		var div = document.createElement('div');
		//&nbsp; is needed for IE
		div.innerHTML = '<div class="tpl-blank">&nbsp;</div><script> ok(true, \'script executed by eval_inner_JS\'); window.a = 1;</sc' + 'ript>';
		dom.eval_inner_JS(div);
		equal(window.a, 1, 'window.a = 1, assigned by script string');
		
		var tmp = document.createDocumentFragment();
		var div2 = document.createElement('div');
		div2.innerHTML = '<div class="tpl-blank2">&nbsp;</div><script> ok(true, \'script executed by eval_inner_JS\'); window.a = 2;</sc' + 'ript>';
		while(div2.firstChild) {
			tmp.appendChild(div2.firstChild);
		}
		equal(tmp.childNodes.length, 2, 'two nodes in DocumentFragment');
		dom.eval_inner_JS(tmp);
		equal(window.a, 2, 'window.a = 2, assigned by script string');

		var div3 = document.createElement('div');
		div3.innerHTML = '<div class="tpl-blank2">&nbsp;</div><script> ok(true, \'script executed by eval_inner_JS\'); window.a = 3;</sc' + 'ript>';

		dom.eval_inner_JS(div3);
		equal(window.a, 3, 'window.a = 3, assigned by script string, after dom.eval_inner_JS(div3)');

		var div4 = document.createElement('div');
		div4.innerHTML = '<div class="tpl-blank2">&nbsp;</div><script>document.write(\'<div id="by-write" class="by-write"></div>\');</sc' + 'ript>';
		document.body.appendChild(div4);

		try {
			dom.eval_inner_JS(div4);
			equal(document.getElementById('by-write').className, 'by-write', 'an div tag is written to document by script string document.write(<div id=by-write class=by-write></div>)');
		} catch (e) {
			ok(false, 'dom.eval_inner_JS(div4), with document.write, should not raise error ' + e);
		}
		document.body.removeChild(div4);

		//eval_inner_JS can handle string
		dom.eval_inner_JS('<script>window.value = 2;</sc' + 'ript>');
		equal(window.value, 2, 'eval_inner_JS(<script>window.value = 2;</sc' + 'ript>), so window.value = 2 now');

		dom.eval_inner_JS('<div>&nbsp;</div><script>window.value2 = 2;</sc' + 'ript><div></div><script>window.value2 ++;</sc' + 'ript><script>window.value2 ++;</sc' + 'ript><div>&nbsp;</div>');
		equal(window.value2, 4, 'eval_inner_JS(<div>&nbsp;</div><script>window.value2 = 2;</sc' + 'ript><div></div><script>window.value2 ++;</sc' + 'ript><script>window.value2 ++;</sc' + 'ript><div>&nbsp;</div>), so window.value2 = 4 now');
		try {
			delete window.value;
			delete window.value2;
			delete window.a;
		} catch (e) {
			window.value = window.value2 = window.a = undefined;
		}
	});
});

//getDom
test('dom.getDom', function() {
	object.use('dom', function(exports, dom) {
		var fragment = dom.getDom('<div></div>');
		equal(fragment.firstChild.tagName, 'DIV', 'an div tag is generated by dom.getDom(<div></div>)');
		try {
			document.createElement("output");
			fragment = dom.getDom('<output></output>');
			equal(fragment.firstChild.tagName.toLowerCase(), 'output', 'an output tag is generated');
		} catch (e) {
			ok(false, 'dom.getDom(<output></output>) should not raise error : ' + e);
		}
		fragment = dom.getDom('<div><span></span></div>');
		equal(fragment.firstChild.firstChild.tagName, 'SPAN', 'nested tag <div><span></span></div> is ok');
		try {
			document.createElement("article");
			// create article, then article is ok , orz...
			fragment = dom.getDom('<article><div></div></article>');
			equal(fragment.firstChild.firstChild.tagName, 'DIV', 'nested tag <article><div></div></article> is ok');
		} catch (e) {
			ok(false, 'dom.getDom(<article><div></div></article>) should not raise error : ' + e);
		}
		fragment = dom.getDom('<div></div><div></div>');
		equal(fragment.childNodes.length, 2, 'getDom(<div></div><div></div>) gets two divs');
		fragment = dom.getDom('<div id=\'test1\'></div><p id=\'test2\'></p>');
		equal(fragment.childNodes[0].id, 'test1', 'getDom(<div id=\'test1\'></div><p id=\'test2\'></p>) gets two divs with id');
		equal(fragment.childNodes[1].id, 'test2', 'getDom(<div id=\'test1\'></div><p id=\'test2\'></p>) gets two divs with id');
		try {
			fragment.getElementById('test1');
		} catch (e) {
			ok(true, 'fragment.getElementById is null for DocumentFragment ' + e);
		}
		try {
			fragment.querySelector('test1');
			ok(true, 'fragment.querySelector is ok');
		} catch (e) {
			ok(false, 'fragment.querySelector causes error : ' + e);
		}
	});
});

//ElementClassList
test('dom.ElementClassList', function() {
	object.use('dom', function(exports, dom) {
		var node = document.createElement('input');
		node.className = 'className1 className2';
		var wrapped = new dom.ElementClassList(node);
		equal(wrapped._classes.length, 2, '_classes.length is correct after initialize');

		wrapped.toggle('className3');
		equal(wrapped._classes.length, 3, '_classes.length + 1, after toggle className3, now className: ' + 
			node.className + ', _classes is : ' + wrapped._classes.join(','));
		ok(wrapped._ele.className.indexOf('className3') != -1, 
			'toggle className3 : className3 added, now className: ' + node.className + 
			', _classes is : ' + wrapped._classes.join(','));
		wrapped.toggle('className3');
		equal(wrapped._classes.length, 2, '_classes.length - 1, after toggle className3 again, now className: ' + 
			node.className + ', _classes is : ' + wrapped._classes.join(','));
		ok(wrapped._ele.className.indexOf('className3') == -1, 
			'toggle className3 : className3 removed, now className: ' + 
			node.className + ', _classes is : ' + wrapped._classes.join(','));
		
		node.className = 'className1 className2';
		wrapped = new dom.ElementClassList(node);
		wrapped.toggle('className1');
		equal(wrapped._classes.length, 1, '_classes.length - 1, after toggle className1, now className: ' + 
				node.className + ', _classes is : ' + wrapped._classes.join(','));
		wrapped.toggle('className1');
		equal(wrapped._classes.length, 2, '_classes.length + 1, after toggle className1 again, now className: ' + 
				node.className + ', _classes is : ' + wrapped._classes.join(','));

		//node.className = 'className1 className2';
		//wrapped = new dom.ElementClassList(node);
		//wrapped.toggle('className1 className2');
		//equal(wrapped._classes.length, 0, 
		//		'_classes.length - 2, after toggle className1 and className2, now className: ' + 
		//		node.className + ', _classes is : ' + wrapped._classes.join(','));
		//wrapped.toggle('className1 className2');
		//equal(wrapped._classes.length, 2, 
		//		'_classes.length + 2, after toggle className1 and className2 again, now className: ' + 
		//		node.className + ', _classes is : ' + wrapped._classes.join(','));

		//node.className = 'className1 className2';
		//wrapped = new dom.ElementClassList(node);
		//wrapped.toggle('className1 className3');
		//equal(wrapped._classes.length, 2, 
		//		'_classes.length + 1 - 1, after toggle className1 and className3 , now className: ' + 
		//		node.className + ', _classes is : ' + wrapped._classes.join(','));
		//wrapped.toggle('className1 className3');
		//equal(wrapped._classes.length, 2, 
		//		'_classes.length + 1 - 1, after toggle className1 and className3 again, now className: ' + 
		//		node.className + ', _classes is : ' + wrapped._classes.join(','));

		node.className = 'className1 className2';
		ok(wrapped.contains('className1'), 'contains(className1)  is ok');
		//ok(wrapped.contains('className1 className2'), 'contains(className1 className2) is ok');
		wrapped.add('className3');
		ok(wrapped.contains('className3'), 'contains(className3) is ok after add className3');
		wrapped.remove('className2');
		ok(!wrapped.contains('className2'), 'contains(className2) return false after delete className2');

		wrapped.remove('className3');
		equal(wrapped.item(0), 'className1', 'item(0) is className1');
		equal(wrapped.item(1), null, 'className3 is removed, so item(1) should be null now');
		
		equal(wrapped.toString(), 'className1', 'toString() return ele.className, which should be trimmed');
	});
});

test('new Features for dom.Element', function() {
	object.use('dom', function(exports, dom) {
		var node = document.createElement('div');
		node.id = 'containerOfSpans';
		document.body.appendChild(node);
		node.innerHTML = '<span id=\'inner1\'></span><span id=\'inner2\'></span><span id=\'inner3\'><!--f--></span>';

		var wrapped = dom.id('inner3');
		equal(wrapped.getPrevious().id, 'inner2', 'inner1, inner2, inner3, inner3 previous is inner2');
		equal(wrapped.getPrevious().getPrevious().id, 'inner1', 'inner1, inner2, inner3, inner3 previous is inner2, inner2 previous is inner1');

		equal(wrapped.getPrevious('#inner1').id, 'inner1', 'inner3.getPrevious(#inner1)');
		equal(wrapped.getPrevious('span').id, 'inner2', 'inner3.getPrevious(span), return inner2');
		wrapped = dom.id('inner1');
		equal(wrapped.getPrevious(), null, 'inner1 do not has previous');


		var wrapped = dom.id('inner3');
		equal(wrapped.getAllPrevious().length, 2, 'two previous');
		equal(wrapped.getAllPrevious('span').length, 2, 'two span previous');
		equal(wrapped.getAllPrevious('span.#inner1, span.#inner2').length, 2, 'two span previous with ids');
		equal(wrapped.getAllPrevious('span.#inner1').length, 1, 'one span previous with id : inner1');
		

		var wrapped = dom.id('inner1');
		equal(wrapped.getNext().id, 'inner2', 'inner1, inner2, inner3, inner1 next is inner2');
		equal(wrapped.getNext().getNext().id, 'inner3', 'inner1, inner2, inner3, inner1 next is inner2, inner2 next is inner3');

		equal(wrapped.getNext('#inner2').id, 'inner2', 'inner1.getNext(#inner2)');
		equal(wrapped.getNext('span').id, 'inner2', 'inner1.getNext(span), return inner2');
		wrapped = dom.id('inner3');
		equal(wrapped.getNext(), null, 'inner3 do not has previous');

		var wrapped = dom.id('inner1');
		equal(wrapped.getAllNext().length, 2, 'two next');
		equal(wrapped.getAllNext('span').length, 2, 'two span next');
		equal(wrapped.getAllNext('span.#inner3, span.#inner2').length, 2, 'two span next with ids');
		equal(wrapped.getAllNext('span.#inner3').length, 1, 'one span next with id : inner3');

		var wrapped = dom.id('containerOfSpans');
		equal(wrapped.getFirst().id, 'inner1', 'first node is inner1');
		equal(wrapped.getFirst('span#inner2').id, 'inner2', 'first node matches span#inner2 is inner2');
		equal(wrapped.getLast().id, 'inner3', 'last node is inner3');
		equal(wrapped.getLast('span#inner1').id, 'inner1', 'last node matches span#inner1 is inner1');

		var wrapped = dom.id('inner1');
		var parents = wrapped.getParents();
		equal(parents[0].tagName.toLowerCase(), 'div', 'first parent : div');
		equal(parents[1].tagName.toLowerCase(), 'body', 'second parent : body');
		equal(parents[2].tagName.toLowerCase(), 'html', 'third parent : html');
		equal(parents[3], document, 'fourth parent : document');
		equal(wrapped.getParents().length, 4, '4 parents');

		equal(wrapped.getParents('div')[0].tagName.toLowerCase(), 'div', 'getParents(div) will get div');
		equal(wrapped.getParents('div#containerOfSpans')[0].tagName.toLowerCase(), 'div', 'getParents(div#containerOfSpans) will get div');
		equal(wrapped.getParents('body')[0], document.body, 'getParents(body) will get document.body');
		equal(wrapped.getParents('html')[0], document.documentElement, 'getParents(html) will get document.documentElement');

		equal(wrapped.getParents('span').length, 0, 'no parent is span');

		var wrapped = dom.id('inner2');
		equal(wrapped.getSiblings().length, 2, 'two brothers');
		equal(wrapped.getSiblings('span').length, 2, 'two brothers');
		equal(wrapped.getSiblings('span#inner1').length, 1, 'one brother named inner1');
		equal(wrapped.getSiblings('span#inner4').length, 0, 'no brother named inner4');

		var wrapped = dom.id('containerOfSpans');
		equal(wrapped.getChildren().length, 3, 'three children');
		equal(wrapped.getChildren('span').length, 3, 'three span children');
		equal(wrapped.getChildren('span#inner1').length, 1, 'one span child with id : inner1');
		equal(wrapped.getChildren('span#inner1, span#inner2').length, 2, 'two span children with ids : inner1,inner2');
		var wrapped = dom.id('inner2');
		equal(wrapped.getChildren().length, 0, 'inner2 has no child');
	});
});

//Element
test('only dom.Element', function() {
	object.use('dom', function(exports, dom) {
		var node = document.createElement('div');
		node.id = 'test-dom-Element';
		node.innerHTML = '<span id=\'inner-test-span\'></span>';
		document.body.appendChild(node);

		var wrapped = dom.id('test-dom-Element');

		ok(wrapped.__eventListeners != null, 'wrapped.__eventListeners is not null');
		equal(typeof dom.$uid(wrapped), 'number', 'after wrap, uid is set');
		wrapped.store('abc', 1);
		equal(wrapped.retrieve('abc'), 1, 'store abc and retrieve abc, which is 1');
		equal(wrapped.retrieve('not-exists', 2), 2, 'retrieve a not-exists property with default, should return 2');
		equal(wrapped.retrieve('not-exists'), 2, 'not-exists property is set by default value');
		ok(wrapped.retrieve('not-exists-2') === undefined, 'not-exists-2 is undefined');
		//dflt !== null && prop === null will always be false
		ok(wrapped.retrieve('not-exists-2') === undefined, 'not-exists-2 should be stored, but dflt !== null && prop === null will always be false');

		ok(wrapped.matchesSelector('div'), 'wrapped.matchesSelector(div) ok');
		ok(wrapped.matchesSelector('div#test-dom-Element'), 'wrapped.matchesSelector(div#test-dom-Element) ok');

		wrapped.setAttribute('data-test', 'test');
		wrapped.setAttribute('data-module', 'moduleName');
		equal(wrapped.getData('test'), 'test', 'getData(test) returns data-test value');
		equal(wrapped.getData('module'), 'moduleName', 'getData(module) returns data-module value');

		ok(wrapped.innerHTML.indexOf('inner-test-span') != -1, 'innerHTML before modify');
		//how to test delegate???
		wrapped.setHTML('<div></div>');
		ok(wrapped.innerHTML.toLowerCase().indexOf('div') != -1, 'innerHTML after modify by setHTML');
		wrapped.setContent('<div id="test-setContent">123</div>');
		ok(wrapped.innerHTML.toLowerCase().indexOf('test-setcontent') != -1, 'innerHTML after modify by setContent');

		var innerElement = wrapped.getElement('div#test-setContent');
		ok(innerElement.matchesSelector('div'), 'innerElement is also wrapped');
		equal(innerElement.innerHTML, '123', 'getElement success');

		wrapped.setContent('<div id="test1"></div><div id="test2"></div>');
		var innerElements = wrapped.getElements('div#test1, div#test2');
		equal(innerElements.length, 2, 'get two elements, return Elements');

		//how to test grab
		var grabbedNode = document.createElement('div');
		grabbedNode.id = 'grabbed-node';
		wrapped.grab(grabbedNode, 'bottom');
		ok(wrapped.childNodes[wrapped.childNodes.length - 1] == grabbedNode, 'grab to bottom ok');
		wrapped.removeChild(grabbedNode);

		wrapped.grab(grabbedNode, 'inside');
		ok(wrapped.childNodes[wrapped.childNodes.length - 1] == grabbedNode, 'grab to inside ok');
		wrapped.removeChild(grabbedNode);

		wrapped.grab(grabbedNode, 'top');
		ok(wrapped.childNodes[0] == grabbedNode, 'grab to top ok');
		wrapped.removeChild(grabbedNode);

		wrapped.parentNode.appendChild(grabbedNode);
		wrapped.grab(grabbedNode, 'before');
		ok(grabbedNode.nextSibling == wrapped, 'grab to before ok');
		wrapped.parentNode.removeChild(grabbedNode);

		wrapped.parentNode.appendChild(grabbedNode);
		wrapped.grab(grabbedNode, 'after');
		ok(wrapped.nextSibling == grabbedNode, 'grab to after ok');
		wrapped.parentNode.removeChild(grabbedNode);

		//grab and inject, something wrong with this two method

		equal(wrapped.getParent(), wrapped.parentNode, 'getParent return parentNode if no selector passed');
		equal(wrapped.getParent('html').tagName, 'HTML', 'getParent(html) return HTMLElement');

		wrapped.addClass('classAdded');
		equal(wrapped.className, 'classAdded', 'class is added');
		wrapped.removeClass('class');
		equal(wrapped.className, 'classAdded', 'class is not removed because of the wrong className');
		wrapped.removeClass('classAdded');
		equal(wrapped.className, '', 'class is removed');

		wrapped.toggleClass('toggleClass');
		ok(wrapped.hasClass('toggleClass'), 'toggleClass added');
		wrapped.toggleClass('toggleClass');
		ok(!wrapped.hasClass('toggleClass'), 'toggleClass removed');

		wrapped.setStyle('background-color','red');
		equal(wrapped.style.backgroundColor, 'red', 'background-color set successfully');
		try {
			document.body.appendChild(wrapped);
			wrapped.setStyle('opacity', '0.5');
			equal(wrapped.getStyle('opacity'), '0.5', 'opacity get and set ok');
			equal(wrapped.get('opacity'), '0.5', 'opacity get and set ok');
		} catch (e) {
			ok(false, 'wrapped.setStyle(opacity, 0.5) should not cause error : ' + e);
		}
		try {
			wrapped.setStyle('float', 'left');
			equal(wrapped.getStyle('float'), 'left', 'float get and set ok');
		} catch (e) {
			ok(false, 'wrapped.setStyle(float, left) should not cause error : ' + e);
		}

		wrapped.hide();
		equal(wrapped.style.display, 'none', 'wrapped.hide() means display must be none');
		wrapped.show();
		notEqual(wrapped.style.display, 'none', 'wrapped.show() means display should not be none');

		wrapped.toggle();
		equal(wrapped.style.display, 'none', 'wrapped.toggle() for the first time');
		wrapped.toggle();
		notEqual(wrapped.style.display, 'none', 'wrapped.toggle() for the second time');

		equal(wrapped.get('tagName'), 'DIV', 'tagname is uppercase');
		equal(wrapped.parentNode, document.body, 'before disposed, parent node is document.body');
		wrapped.dispose();
		notEqual(wrapped.parentNode, document.body, 'after disposed, parent node is not document.body now');

		var fragment = dom.Element.fromString('<div>text</div>');
		equal(fragment.innerHTML, 'text', 'DocumentFragment is created, innerHTML is text');
	});
});
//ImageElement

test('dom.ImageElement', function() {
	object.use('dom', function(exports, dom) {
		var image = dom.wrap(document.createElement('img'));
		ok('naturalWidth' in image.__properties__, 'img wrapped successfully');
		image.src = 'http://hdn.xnimg.cn/photos/hdn421/20110803/0920/tiny_gZQg_12580o019117.jpg';
		equal(image.width, 50, 'width of head image is 50px');
		equal(image.height, 50, 'height of head image is 50px');
		image.width = image.height = 20;
		equal(image.width, 20, 'width is modified');
		equal(image.height, 20, 'height is modified');
		equal(image.get('naturalWidth'), 50, 'image.get(naturalWidth) is still 50');
		equal(image.get('naturalHeight'), 50, 'image.get(naturalHeight) is still 50');
	});
});
//FormElement

test('dom.FormElement', function() {
	object.use('dom, net', function(exports, dom, net) {
		var form = dom.wrap(document.createElement('form'));

		ok('send' in form, 'form wrapped successfully');
		
		var input = document.createElement('input');
		input.type = 'text';
		input.name = 'test-form';
		input.value = 'value';
		form.appendChild(input);
		equal(form.toQueryString(), 'test-form=value', 'got test-form=value');

		var input2 = document.createElement('input');
		input2.type = 'radio';
		input2.name = 'test-form2';
		input2.value = 'value2';
		input2.checked = true;
		form.appendChild(input2);
		equal(form.toQueryString(), 'test-form=value&test-form2=value2', 'got test-form=value&test-form2=value2');
		form.removeChild(input);
		form.removeChild(input2);

		var textarea = document.createElement('textarea');
		textarea.name = 'test-name';
		textarea.value = 'test-value';
		form.appendChild(textarea);
		equal(form.toQueryString(), 'test-name=test-value', 'got test-name=test-value');

		var select = document.createElement('select');
		select.name = 'test-select';
		// not support in IE
		// select.innerHTML = '<option value=1>1</option><option value=2 selected>2</option>'
		var newOpt = document.createElement('option');
		newOpt.value = "1";
		newOpt.text = "1";
		select.options.add(newOpt);
		var newOpt = document.createElement('option');
		newOpt.value = "2";
		newOpt.text = "2";
		newOpt.selected = true;
		select.options.add(newOpt);

		form.appendChild(select);
		equal(form.toQueryString(), 'test-name=test-value&test-select=2', 'got test-name=test-value&test-select=2');
		form.removeChild(textarea);
		form.removeChild(select);

		var image = document.createElement('input');
		image.type = 'image';
		image.name = 'test-image';
		image.value= 'test-value';
		form.appendChild(image);
		equal(form.toQueryString(), '', 'image is ignored');
		form.removeChild(image);

		var disabledInput = document.createElement('input');
		disabledInput.type = 'text';
		disabledInput.name = 'test-image';
		disabledInput.value= 'test-value';
		disabledInput.disabled = true;
		form.appendChild(disabledInput);
		equal(form.toQueryString(), '', 'disabled input element is ignored');
		form.removeChild(disabledInput);

		// checkValidity, form must be appended to document.body
		document.body.appendChild(form);
		ok(form.checkValidity(), 'checkValidity is ok when no element in form');
		var requiredInput = document.createElement('input');
		requiredInput.type = 'text';
		requiredInput.name = 'name';
		requiredInput.required = true;
		requiredInput.value = '';
		form.appendChild(requiredInput);
		equal(form.checkValidity(), false, 'value of required input is empty, checkValidity must be false');
		requiredInput.value = 'value';
		equal(form.checkValidity(), true, 'value of required input is not empty now, checkValidity should be true');
		document.body.removeChild(form);
	});
});

test('dom.FormItemElement - selectionStart/selectionEnd', function() {
	object.use('dom', function(exports, dom) {
		var formItem = dom.wrap(document.createElement('input'));
		document.body.appendChild(formItem);
		formItem.value = '1234';
		try {
			formItem.get('selectionStart');
		} catch (e) {
			ok(false, 'get selectionStart of hidden input element should not cause an error : ' + e);
		}
		try {
			formItem.get('selectionEnd');
		} catch (e) {
			ok(false, 'get selectionEnd of hidden input element should not cause an error : ' + e);
		}
		try {
			equal(formItem.get('selectionStart'), 4, 'selectionStart is 4');
			equal(formItem.get('selectionEnd'), 4, 'selectionEnd is 4');
		} catch (e) {
			ok(false, 'formItem.get(selectionStart) should not raise error : ' + e);
		}
		try {
			formItem.select();
			equal(formItem.get('selectionStart'), 0, 'selectionStart is 0 after formItem.select()');
			equal(formItem.get('selectionEnd'), 4, 'selectionEnd is 4 after formItem.select()');
		} catch (e) {
			ok(false, 'formItem.get(selectionStart) after formItem.select(), should not raise error : ' + e);
		}
		formItem.focusToPosition(2);
		try {
			equal(formItem.get('selectionStart'), 2, 'selectionStart is 2 after formItem.focusToPosition(2)');
		} catch (e) {
			ok(false, 'formItem.get(selectionStart) after formItem.focusToPosition(), should not raise error : ' + e);
		}
		formItem.dispose();
	});
});
//FormItemElement
test('dom.FormItemElement', function() {
	object.use('dom', function(exports, dom) {
		var formItem = dom.wrap(document.createElement('input'));
		ok('selectionStart' in formItem.__properties__, 'formItem wrapped successfully');
		document.body.appendChild(formItem);
		formItem.value = '1234';
		try {
			formItem.focus();
		} catch (e) {};

		var selectItem = dom.wrap(document.createElement('select'));
		var newOpt = document.createElement('option');
		newOpt.value = "1";
		newOpt.text = "1";
		selectItem.options.add(newOpt);
		newOpt = document.createElement('option');
		newOpt.value = "2";
		newOpt.text = "2";
		newOpt.selected = true;
		selectItem.options.add(newOpt);
		
		equal(selectItem.getSelected().length, 1, 'getSelected in selectItem is ok');
		equal(selectItem.value, '2', 'selectItem.value = 2, ok');
		equal(selectItem.get('value'), '2', 'selectItem.get(value) = 2, ok');
		selectItem.set('value', '1');
		equal(selectItem.get('value'), '1', 'selectItem.get(value) = 1 after set to 1');
		selectItem.set('value', '2');
		equal(selectItem.get('value'), '2', 'selectItem.get(value) = 2 after set to 2');
		selectItem.set('value', '0');
		notEqual(selectItem.get('value'), '0', 'selectItem.get(value) != 0 after set to 0 (because select do not have a option with value 0)');
		equal(formItem.get('value'), '1234', 'formItem.get(value) = 1234');
		formItem.set('value', 'anyvalue');
		equal(formItem.get('value'), 'anyvalue', 'formItem.get(value) = anyvalue after set to anyvalue');
		formItem.required = true;
		formItem.set('value', '');
		ok(formItem.get('validationMessage') != null, 'validationMessage is updated after set value to empty : ' + formItem.get('validationMessage'));
		formItem.value = '1234';
		formItem.dispose();

		// how to test bindPlaceholder???
	});
});

//Window/Document
test('dom.Window/dom.Document', function() {
	object.use('dom', function(exports, dom) {
		var wrappedWindow = dom.wrap(window);
		assertPropExists(elementProps, wrappedWindow, 'dom.wrap(window)');
		var wrappedDocument = dom.wrap(document);
		assertPropExists(elementProps, wrappedDocument, 'dom.wrap(document)');
	});
});

//Elements
test('dom.Elements', function() {
	object.use('dom', function(exports, dom) {
		var input1 = document.createElement('input');
		input1.className = 'input1';
		input1.style.display = 'none';
		document.body.appendChild(input1);
		var input2 = document.createElement('input');
		input2.className = 'input2';
		input2.style.display = 'none';
		document.body.appendChild(input2);

		var inputs = dom.getElements('input.input1, input.input2');
		assertPropExists(formInputElementProps.filter(function(el) {
			return typeof dom.FormItemElement.get(el) == 'function';
		}), inputs, 'dom.getElements(input.input1, input.input2)', true);

		equal(input1.style.display, 'none', 'input1 hide before inputs.show()');
		equal(input2.style.display, 'none', 'input2 hide before inputs.show()');
		inputs.show();
		notEqual(input1.style.display, 'none', 'input1 show after inputs.show()');
		notEqual(input2.style.display, 'none', 'input2 show after inputs.show()');
		inputs.hide();
		equal(input1.style.display, 'none', 'input1 hide after inputs.hide()');
		equal(input2.style.display, 'none', 'input2 hide after inputs.hide()');
		inputs.set('value', '1234');
		equal(input1.get('value'), '1234', 'input1.value == 1234, after inputs.set(value, 1234)');
		equal(input2.get('value'), '1234', 'input2.value == 1234, after inputs.set(value, 1234)');
		inputs.show();
		inputs.focusToPosition(2);
		try {
			equal(input1.get('selectionStart'), 2, 'input1.get(selectionStart) should be 2');
		} catch (e) {
			ok(false, 'input1.get(selectionStart) after input1.focusToPosition(2), should not raise error : ' + e);
		}
		try {
			equal(input2.get('selectionStart'), 2, 'input2.get(selectionStart) should be 2');
		} catch (e) {
			ok(false, 'input2.get(selectionStart) after input2.focusToPosition(2), should not raise error : ' + e);
		}
		inputs.dispose();

		var input = document.createElement('input');
		input.className = 'is-input';
		input.style.display = 'none';
		document.body.appendChild(input);
		var div = document.createElement('div');
		div.className = 'is-div';
		div.style.width = '100px';
		div.style.height = '100px';
		div.style.display = 'none';
		document.body.appendChild(div);

		var elements = dom.getElements('input.is-input, div.is-div');
		equal(elements.length, 2, 'got two elements by dom.getElements');
		assertPropNotExists(formInputElementPropsOnly.filter(function(el) {
			return typeof dom.FormItemElement.get(el) == 'function';
		}), elements, 'dom.getElements(input.is-input, div.is-div)', true);
		
		elements.show();
		notEqual(div.style.display, 'none', 'div is displayed');
		notEqual(input.style.display, 'none', 'input is displayed');
		elements.setStyle('background-color', 'red');
		equal(div.style.backgroundColor, 'red', 'div background color is red after elements.setStyle');
		equal(input.style.backgroundColor, 'red', 'input background color is red after elements.setStyle');
		elements.hide();
		elements.dispose();
	});
});
