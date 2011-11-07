module('dom.utils')

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
test('dom.wrap - Element', function() {
	function assertPropExists(props, obj, desc) {
		desc = desc || '';
		for(var i=0,l=props.length; i<l; i++) {
			if(!props[i] in obj) {
				ok(false, props[i] + ' missed ' + desc);
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
	object.use('dom', function(exports, dom) {
		var elementProps = getProps(new dom.Element('div'));

		var element = dom.wrap(window);
		ok(window._wrapped, 'window is wrapped');
		ok(window.addEvent != null, 'addEvent is wrapped in window');
		element = dom.wrap(document);
		ok(document._wrapped, 'document is wrapped');

		element = dom.wrap(document.createElement('div'));
		assertPropExists(elementProps, element, 'in document.createElement(div)');

		element = dom.wrap('string');
		equal(element, 'string', 'dom.wrap do not handle String');

		element = dom.wrap(document.createElement('img'));
		assertPropExists(elementProps, element, 'in document.createElement(img)');
		assertPropExists(['naturalWidth', 'naturalHeight'], element, 'in document.createElement(img)');

		element = dom.wrap(document.createElement('form'));
		assertPropExists(elementProps, element, 'in document.createElement(form)');
		assertPropExists(['send', 'toQueryString', 'checkValidity'], element, 'in document.createElement(form)');
		element = dom.wrap(document.createElement('input'));
		assertPropExists(elementProps, element, 'in document.createElement(input)');
		var formInputElementProps = ['selectionStart', 'selectionEnd', 'getSelected', 'value', 'validity',
			'validationMessage','setCustomValidity', 'checkValidity', 'focusToPosition', 'bindPlaceholder',];

		assertPropExists(formInputElementProps, element, 'in document.createElement(form)');
		
		ok('validationMessage' in element, 'checkValidity in element, wrap FormItemElement success');
		element = dom.wrap(document.createElement('textarea'));
		ok('validationMessage' in element, 'checkValidity in element, wrap FormItemElement success');
		element = dom.wrap(document.createElement('output'));
		ok('validationMessage' in element, 'checkValidity in element, wrap FormItemElement success');
		element = dom.wrap(document.createElement('select'));
		ok('validationMessage' in element, 'checkValidity in element, wrap FormItemElement success');
		element = dom.wrap(document.createElement('option'));
		ok('validationMessage' in element, 'checkValidity in element, wrap FormItemElement success');
		element = dom.wrap(document.createElement('button'));
		ok('validationMessage' in element, 'checkValidity in element, wrap FormItemElement success');
	});
});

//getElements/getElement
//id
//eval_inner_JS
//__needGetDom
//getDom
//ElementClassList
//Element
//ImageElement
//FormElement
//FormItemElement
//Window/Document
//Elements
//getWrapper
//getCommon
