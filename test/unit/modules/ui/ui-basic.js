module('ui-basic');

var path = transTestDir('modules/ui/');

var async_module_js = path + 'async-module.js';
var async_template_js = path + 'async-template.js';
var request_txt = path + 'request.txt';
var notexists = path + 'not-exists.txt';

object.use('ui', function(ui) {
	window.ui = ui;
});

test('sub property', function() {

	var initCalled = 0;
	var TestComponent = new Class(ui.Component, function() {
		this.test = ui.define1('.test');
		this.test2 = ui.define1(function(self) {
			return self._node.getElement('.test');
		});
		this.test3 = ui.define1('.test');
		this.test4 = ui.define1('.test4', {
			'meta.async': true
		});
		this._init = function(self) {
			initCalled++;
		};
	});
	TestComponent.set('test5', ui.define1('.test'));

	var div = document.createElement('div');
	div.innerHTML = '<div class="test">test</div><div class="foo"></div><div class="test4"></div>';

	var test = new TestComponent(div);
	var testComp = test.test;
	var testNode = test.test.getNode();

	// 初始化执行init
	equal(initCalled, 1, 'init called.');

	// 初始化时会获取所有sub
	equals(test.test.getNode().className, 'test', 'define1 component right when init.');

	// 获取节点
	equals(test.test.getNode(), testNode, 'define1 component right when init.');

	// 引用相同，返回相同一个component引用
	strictEqual(test.test2, testComp, 'using one same component when selector same.');
	strictEqual(test.test3, testComp, 'using one same component when selector same.');
	strictEqual(test.test5, testComp, 'component defined after class created.');

	// 异步节点，不初始化，render才生成
	strictEqual(test.test4, null, 'async node ok.');
	test.render('test4', function() {
		equal(test.test4.getNode().tagName, 'DIV', 'async node ok.');
	});

	// 直接获取节点方式
	equals(test.test2.getNode(), testNode, 'using one same node when selector same.');
	equals(test.test3.getNode(), testNode, 'using one same node when selector same.');
	equals(test.test5.getNode(), testNode, 'component defined after class created.');

	// 修改selector
	test.setOption('test.meta.selector', '.foo');
	equal(test.get('test').getNode().className, 'foo', 'change selector ok.');

	// dispose
	test.test.dispose();
	equal(test.test, null, 'disposed.');
});

test('mutiple sub property', function() {

	var methodCalled = 0;

	var A = new Class(ui.Component, function() {
		this._test = function(self) {
			methodCalled++;
		};
	});

	var TestComponent = new Class(ui.Component, function() {
		this.test = ui.define('.test', A);
		this.test2 = ui.define('.test');
	});
	TestComponent.set('test3', ui.define('.test'));

	var div = document.createElement('div');
	div.innerHTML = '<div class="test">test1</div><div class="test">test2</div><div class="test">test3</div><div class="test">test5</div>';

	var test = new TestComponent(div);
	var testComp = test.test;
	var testNode = test.test.getNode();

	// 初始化时会获取所有sub
	equals(test.test.length, 4, 'define components ok.');
	equals(test.test.getNode().length, 4, 'define components node ok.');

	// 下环线形式获取节点
	strictEqual(test._test, testNode, 'define components right when init.');

	// 公用方法调用
	test.test.test();
	equal(methodCalled, 4, 'method called.');

	// dispose
	test.test[0].dispose();
	equals(test.test.length, 3, 'dispose one component ok.');

	// dispose all
	test.test.dispose();
	strictEqual(test.test.length, 0, 'dispose all ok.');
});

test('parent property', function() {

	var TestComponent = new Class(ui.Component, function() {
		this.parent = ui.parent(function() {
			return ParentComponent;
		});
	});

	var ParentComponent = new Class(ui.Component, function() {
		this.test = ui.define1('.test', TestComponent);
	});

	var div = document.createElement('div');
	div.innerHTML = '<div class="test"></div>';
	var test = new ParentComponent(div);

	strictEqual(test.test.parent, test, 'parent component ok.');
});

test('deep parent property', function() {

	var TestComponent = new Class(ui.Component, function() {
		this.parent = ui.parent(function() {
			return ParentComponent;
		});
	});

	var ParentComponent = new Class(ui.Component, function() {
	});

	var div = document.createElement('div');
	div.innerHTML = '<div class="parent"><div class="test"></div></div>';

	// div和parent都包装为ParentComponent
	var parent1 = new ParentComponent(div);
	var parent2 = new ParentComponent(div.getElement('div.parent'));

	var test = new TestComponent(div.getElement('div.test'));

	// parent1 包装 parent2，都是ParentComponent，向上查找时应该找到第一个找到的parent2
	strictEqual(test.parent, parent2, 'found right parent.');

});

test('async load component', function() {

	expect(2);
	var script = document.createElement('script');
	script.setAttribute('data-src', async_module_js);
	script.setAttribute('data-module', 'test.test');
	document.body.appendChild(script);
	object._loader.buildFileLib();

	var TestComponent = new Class(ui.Component, function() {
		this.test = ui.define1('.test', 'test.test.TestComponent');
		this.test2 = ui.define1('.test2', 'test.test.TestComponent', function(self, make) {
			self._node.appendChild(make());
		});

		this._init = function(self) {
			ok(self.test, 'init called after load.');
		};
	});

	var div = document.createElement('div');
	div.innerHTML = '<div class="test"></div>';

	var test = new TestComponent(div, {
		'test2.meta.template': '<div class="test2"></div>'
	});
	stop();
	test.render('test2', null, function() {
		start();
		ok(test.test2, 'async render component ok.');
	});

	document.body.removeChild(script);
});

test('async load template', function() {

	var script = document.createElement('script');
	script.setAttribute('data-src', async_template_js);
	script.setAttribute('data-module', 'test_ui/template.mustache');
	document.body.appendChild(script);
	object._loader.buildFileLib();

	object.define('test_ui/index.js', 'ui', function(require, exports) {

		var ui = require('ui');

		exports.TestComponent = new Class(ui.Component, function() {
			this.test = ui.define1('.test', function(self, make) {
				self.getNode().appendChild(make());
			});
			this.test2 = ui.define1('.test', function(self, make) {
				self.getNode().appendChild(make());
			});
		});
	});

	var test_ui_module = null;
	object.use('test_ui, sys', function(test, sys) {
		test_ui_module = test;
	});
	var div = document.createElement('div');
	var test = new test_ui_module.TestComponent(div, {
		'test.meta.templatemodule': 'test_ui/template.mustache',
		'test2.meta.templatemodule': './template.mustache'
	});
	stop();
	test.render('test', {
		'msg': 'haha'
	}, function() {
		start();
		ok(test.test, 'render component by async template ok.');
	});

	// 测试相对路径
	stop();
	test.render('test2', {
		'msg': 'haha'
	}, function() {
		start();
		ok(test.test2, 'render component by relative async template ok.');
	});

	document.body.removeChild(script);
	object.remove('test_ui');
});

test('option property', function() {
	optionChangeFired = 0;

	var SubComponent = new Class(ui.Component, function() {
		this.test = ui.option(false);
	});

	var TestComponent = new Class(ui.Component, function() {

		this.sub = ui.define1('.test', SubComponent);

		this.sub2 = ui.define1('.test2', SubComponent, function(self) {
			var test2 = document.createElement('div');
			test2.className = 'test2';
			self._node.appendChild(test2);
		});

		this.test = ui.option(1);

		this.test2 = ui.option('string');

		this.test3 = ui.option(true);

		this.test4 = ui.option(false, function(self) {
			return self.getNode().getAttribute('custom-attr');
		});

		this.test5 = ui.option('string');

		this.test_change = function(self, event) {
			if (event.value == 2) {
				equal(event.oldValue, 10, 'old value ok.');
				equal(event.value, 2, 'new value set.');
			}
			optionChangeFired++;
		};

		this.test2_change = function(self, event) {
			event.preventDefault();
		};

		this.test3_change = function(self) {
			optionChangeFired++;
		};

		this.test5_change = function(self) {
			optionChangeFired++;
		};
	});

	var div = document.createElement('div');
	div.setAttribute('data-test3', '');
	div.setAttribute('custom-attr', 'custom-value');
	div.innerHTML = '<div class="test"></div>';

	var test = new TestComponent(div, {
		'test': 10,
		'sub.test': true
	});

	// 初始化传递参数会触发setOption
	equals(optionChangeFired, 1, 'set option fired on init.');

	// 默认属性
	equals(test.test, 10, 'default option value ok.');

	// 设置同默认值相等
	test.set('test5', 'string');
	equals(optionChangeFired, 1, 'set same value as default not fired change.');

	// 普通设置
	test.set('test', 2);
	equals(test.test, 2, 'set option value ok.');

	// 设置会触发事件
	equals(optionChangeFired, 2, 'set option fired change event.');

	// 设置相同的value不会触发事件
	test.set('test', 2);
	equal(optionChangeFired, 2, 'set same value to option wont fired change event.');

	// 设置不存在的成员
	test.set('nonexistent', 1);
	equals(test.nonexistent, 1, 'set nonexistent ok.');
	strictEqual(test.getNode().nonexistent, undefined, 'set nonexistent not passed to node.');

	// 阻止option设置
	test.set('test2', 'xxx');
	equals(test.test2, 'string', 'set option prevented.');
	equals(test.getOption('test2'), 'string', 'set option prevented.');

	// 从node获取option
	strictEqual(test.test3, false, 'get option from node.');

	// node定义的option无法通过setOption覆盖
	test.setOption('test3', true);
	strictEqual(test.test3, false, 'not override option value from node.');

	// node定义的option被修改不会触发change
	equal(optionChangeFired, 2, 'change not fired when option from node.');

	// 自定义属性getter取代从属性获取
	equals(test.test4, 'custom-value', 'get option from custom getter.');

	// option传递
	equals(test.sub.test, true, 'option pass to sub.');

	// setOption到node
	test.setOption('node.placeholder', 'test');
	equal(test.getNode().placeholder, 'test', 'set option passed to node.');

	// setOption给未定义引用
	test.setOption('a.b.c', 1);
	equal(test.getOption('a.b.c'), 1, 'setOption to undefined sub ok.');

	// setOption给已存在引用
	test.setOption('sub.test', false);
	strictEqual(test.sub.get('test'), false, 'setOption to exist sub ok.');

	// setOption给未存在引用
	test.setOption('sub2.test', true);
	test.setOption('sub2.test2', true);
	test.render('sub2');
	// 已定义的option，getOption和get均能获取。
	strictEqual(test.sub2.get('test'), true, 'can get defined option.');
	strictEqual(test.sub2.getOption('test'), true, 'setOption to nonexistent defined sub ok.');
	// 未定义的option，只能通过getOption获取，无法通过get获取。
	strictEqual(test.sub2.get('test2'), undefined, 'can\'t get undefined option.');
	strictEqual(test.sub2.getOption('test2'), true, 'setOption to nonexistent undefined sub ok.');
});

test('request property', function() {

var errorCalled = 0;
var successCalled1 = 0;
var successCalled2 = 0;

var TestComponent = new Class(ui.Component, function() {

	this.dataFetcher = ui.request(notexists);
	this.dataFetcher2 = ui.request(request_txt);
	this.dataFetcher3 = ui.request(notexists);

	this.dataFetcher_error = function(self, event) {
		errorCalled++;
	}; 

	this.dataFetcher2_success = function(self, event) {
		successCalled1++;
	};

	this.dataFetcher3_success = function(self, event) {
		successCalled2++;
	};

});

var test = new TestComponent(document.createElement('div'));

stop();
test.get('dataFetcher').send();
test.get('dataFetcher').oncomplete = function() {
	start();
	equal(errorCalled, 1, 'request error fired.');
};

stop();
test.get('dataFetcher2').send();
test.get('dataFetcher2').oncomplete = function() {
	start();
	equal(successCalled1, 1, 'request success fired.');
};

stop();
test.setOption('dataFetcher3.url', request_txt);
test.get('dataFetcher3').send();
test.get('dataFetcher3').oncomplete = function() {
	start();
	equal(successCalled2, 1, 'request success fired by url changed.');
};

});

test('handle method', function() {
	var methodCalled = 0;
	var eventFired = 0;
	var TestComponent = new Class(ui.Component, function() {
		this._test = function(self, arg) {
			strictEqual(arg, 'test', 'arguments pass ok.');
			methodCalled = 1;
		};
		this._test2 = function(self) {
			ok(false, 'preventDefault bad when event fired.')
		};
	});
	TestComponent.set('_test3', function() {
		ok(true, 'handle defined after class created.');
	});

	var test = new TestComponent(document.createElement('div'));
	test.addEvent('test', function() {
		eventFired = 1;
	});
	test.addEvent('test2', function(event) {
		event.preventDefault();
	});
	test.test('test');
	test.test2();
	test.test3();
	equals(methodCalled, 1, 'method called.');
	equals(eventFired, 1, 'event fired.');
});

test('on event method', function() {

	var eventFired = 0;
	var onEventCalled = 0;
	var fireEventCalled = 0;

	var TestComponent = new Class(ui.Component, function() {

		this._test = function(self) {
			eventFired++;
		};

		this.onTest = function(self, event) {
			ok(true, 'on event called in self.');
			onEventCalled++;
		};

		this.onTest2 = function(self) {
			fireEventCalled++;
		};

	});
	TestComponent.set('onTest', function() {
		ok(true, 'on event override ok.');
		// 应该被执行
		onEventCalled++;
	});


	var div = document.createElement('div');
	var test = new TestComponent(div);
	test.test();
	equal(eventFired, 1, 'event fired.');
	equal(onEventCalled, 1, 'on event called.');

	test.fireEvent('test2');
	equal(fireEventCalled, 1, 'on event called by fireEvent.');

});

test('sub event method', function() {

	var clickEventCalled = 0;
	var customEventCalled = 0;

	var Test1Component = new Class(ui.Component, function() {
		this._test = function(self, a) {
		}
	});

	var Test2Component = new Class(ui.Component, function() {
		this._test = function(self, a) {
		}
	});

	var TestComponent = new Class(ui.Component, function() {

		this.test = ui.define1('.test', Test1Component);

		this.test2 = ui.define('.test2', Test2Component);

		this.test_click = function(self, event) {
			// 传递的是正确的事件
			equals(event.type, 'click', 'arguments pass ok.');
			// 从event上能够找到触发此事件的component信息。
			equals(event.targetComponent, self.test, 'component arguments pass ok with click event.');

			clickEventCalled++;
		};

		this.test_test = function(self, event, a) {
			// 从event上能够找到触发此事件的component信息。
			equals(event.targetComponent, self.test, 'component arguments pass ok with custom event.');
			// 自定义事件传递的参数可以获取
			equals(a, 'test', 'custom arguments pass ok with custom event.');

			customEventCalled++;
		};

		this.test2_click = function(self, event) {
			// 传递的是正确的事件
			equals(event.type, 'click', 'arguments pass ok.');
			// 从event上能够找到触发此事件的component信息。
			equals(event.targetComponent, self.test2[0], 'component arguments pass ok with click event.');

			clickEventCalled++;
		};

		this.test2_test = function(self, event, a) {
			// 自定义事件传递的参数可以获取
			equals(a, 'test', 'custom arguments pass ok with custom event.');

			customEventCalled++;
		};

	});

	var div = document.createElement('div');
	div.innerHTML = '<div class="test">test</div><div class="test2"></div><div class="test2"></div>';

	var test = new TestComponent(div);

	// 单个引用，内置事件
	test.test.getNode().click();
	equals(clickEventCalled, 1, 'sub click event called.');

	// 单个引用，自定义事件
	test.test.test('test');
	equals(customEventCalled, 1, 'sub custom event called.');

	// 多个引用，内置事件
	test.test2[0].getNode().click();
	equals(clickEventCalled, 2, 'sub click event called.');

	// 多个引用，自定义事件
	test.test2.test('test');
	equals(customEventCalled, 3, 'sub custom event called.');
});

test('render', function() {

	var ua = null;
	object.use('ua', function(ua2) {
		ua = ua2;
	});
	var renderedEventCalled = 0;

	var ParentComponent = new Class(ui.Component, function() {
	});

	var SubComponent = new Class(ui.Component, function() {
		this.parent = ui.parent(ParentComponent);
		this.test = ui.option(false);
	});

	var TestComponent = new Class(ui.Component, function() {

		this.test = ui.define1('.test', SubComponent, {
			'meta.template': '<div class="test">{{hello}}</div>'
		}, function(self, make) {
			var a = make();
			self._node.appendChild(a);
		});

		this.test2 = ui.define1('.test2', SubComponent, function(self, make, data) {
			ok(data, 'data arguments ok.');
			data.bar = 3;
			self._node.appendChild(make());
		});

		this.test3 = ui.define1('.test3', SubComponent, {
			'meta.template': '<div class="test3">old</div>'
		}, function(self, make, data) {
			self._node.appendChild(make({value:data.value + 1}));
		});

		this.test_click = function(self) {
			renderedEventCalled++;
		}

	});

	var parent = new ParentComponent(document.createElement('div'));
	var div = document.createElement('div');
	parent.getNode().appendChild(div);

	var test = new TestComponent(div, {
		'test.test': true,
		'test.hello': 'test',
		'test2.meta.template': '<div class="test2">foo:{{foo}},bar:{{bar}}</div>',
		'test3.meta.template': '<div class="test3">{{value}}</div>'
	});

	var renderCallbackCalled = 0;

	// 渲染
	test.render('test', function() {
		// render时将node插入后才生成comp
		ok(test.test.parent, 'parent got when render.');
		renderCallbackCalled++;
	});
	if (ua.ua.ie) {
		// IE的innerHTML：tagName是大写的/draggable等属性也会显示
		ok(/<DIV class=test.+>test<\/DIV>/.test(test.getNode().innerHTML), 'template render ok by default options.');
	} else {
		equal(test.getNode().innerHTML, '<div class="test">test</div>', 'template render ok by default options.');
	}
	equal(renderCallbackCalled, 1, 'render callback called.');

	// 第二次渲染，调用callback
	// 忽略第二个参数
	test.render('test', function() {
		renderCallbackCalled++;
	});
	equal(renderCallbackCalled, 2, 'render callback called.');

	// option传递
	equal(test.test.test, true, 'option pass to sub.');

	// 事件
	test.test.getNode().click();
	equal(renderedEventCalled, 1, 'rendered component event called.');

	// 删除
	test.test.dispose();
	ok(test.test === null, 'dispose ok.');

	// data传递
	test.render('test2', {foo: 1, bar: 2}, function() {
		equal(test.test2.getNode().innerHTML, 'foo:1,bar:3', 'data pass ok in render.');
	});

	// data传递且替换
	test.render('test3', {value: 1}, function() {
		equal(test.test3.getNode().innerHTML, '2', 'data pass and write ok in render by overwide default options.');
	});

});

test('render free component', function() {

	var TestComponent = new Class(ui.Component, function() {
		this.free = ui.define1(false);
		this.free2 = ui.define(false, function(self, make) {
			return [make(), make()];
		});
		this.free3 = ui.define1(false, function(self) {
			// 没有selector，没用make，也没return，无法找到节点
		});
		this.free4 = ui.define(false, function(self, make) {
			// 定义为多个，却没有返回数组
			return make();
		});
	});

	var test = new TestComponent(document.createElement('div'), {
		'free.meta.template': '<div>{{value}}</div>',
		'free2.meta.template': '<div>{{value}}</div>',
		'free4.meta.template': '<div>{{value}}</div>'
	})

	// 渲染free，无所谓selector，render出来就能取到
	test.render('free', {value: 'free'}, function() {
		equal(test.free.getNode().innerHTML, 'free', 'render free component ok.');
	});

	test.render('free2', {value: 'free2'}, function() {
		equal(test.free2.getNode().length, 2, 'render free components ok.');
		equal(test.free2.getNode()[0].innerHTML, 'free2', 'render free components ok.');
	});

	test.render('free3', function() {
		strictEqual(test.free3, null, 'render empty free components.');
	});

	test.render('free4', {value: 'free4'}, function() {
		equal(test.free4.getNode().length, 1, 'render free components with single return value.');
		equal(test.free4.getNode()[0].innerHTML, 'free4', 'render free components with single return value.');
	});
});

test('extend component', function() {

	var eventCalled = 0;
	var methodCalled = 0;
	var onEventCalled = 0;

	var A = new Class(ui.Component, function() {
		this.test = ui.define1('.test');
		this._a = function(self) {
			ok(true, 'parent called in method.');
			methodCalled++;
		};
		this.test_click = function(self) {
			ok(true, 'parent called in sub event.');
			eventCalled++;
		};
		this.onA = function(self) {
			ok(true, 'parent called in on event.');
			onEventCalled++;
		};
	});

	var AA = new Class(A, function() {
		this._a = function(self) {
			this.parent(self);
			methodCalled++;
		};
		this.test_click = function(self) {
			this.parent(self);
			eventCalled++;
		};
		this.onA = function(self) {
			this.parent(self);
			onEventCalled++;
		};
	});

	var div = document.createElement('div');
	div.innerHTML = '<div class="test"></div>';

	var aa = new AA(div);
	aa.test.getNode().click();
	aa.a();

	equal(eventCalled, 2, 'override parent sub event.');
	equal(methodCalled, 2, 'override parent method.');
	equal(onEventCalled, 2, 'override parent on event.');

});

test('destroy', function() {

	var eventCalled = 0;

	var div = document.createElement('div');
	div.innerHTML = '<div class="a"></div>';

	var A = new Class(ui.Component, function() {
		this._test = function(self) {
		};
	});

	var Test = new Class(ui.Component, function() {
		this.a = ui.define1('.a', A);
		this.a_test = function(self) {
			eventCalled++;
		};
	});

	var test = new Test(div);
	test.a.test();
	test.destroy();
	test.a.test();

	equal(eventCalled, 1, 'event not called after destroyed.');

});

test('page', function() {


	var TestComponent = new Class(ui.Component, function() {
	});

	var Home = new Class(ui.Page, function() {
		this.test = ui.define1('.test', TestComponent);
	});

	var Profile = new Class(ui.Page, function() {
		this.free = ui.define1(false, TestComponent, function(self) {
			var div = document.createElement('div');
			div.innerHTML = 'test';
			self.getNode().appendChild(div);
			return div;
		});

		this.test = ui.define1(false, function(self, make) {
			make();
		});
	});

	var div = document.createElement('div');
	div.innerHTML = '<div class="test"></div>';

	document.body.appendChild(div);

	window.home = new Home(document.body);
	window.profile = new Profile({
		'test.meta.template': '<div>{{value}}</div>'
	});

	window.profile.render('free', function() {
		equal(window.profile.free.getNode().innerHTML, 'test', 'render free component ok.');
	});

	window.profile.render('test', {value: 'test'}, function() {
		equal(window.profile.test.getNode().innerHTML, 'test', 'render templated component ok.');
	});

	document.body.removeChild(div);

});

test('virtual component', function() {

	var eventCalled = 0;

	var div = document.createElement('div');
	div.innerHTML = '<div><div class="test"></div><div class="test2"></div></div>';

	var Base1 = new Class(ui.Component, {});
	var Base2 = new Class(ui.Component, {});

	var A = new Class(ui.Component, function() {
		this.test = ui.define1('.test', {
			a: 1
		});

		this.test2 = ui.define1('.test2', Base1);

		this.test3 = ui.define1('.test2', Base1);

		this.test_click = function() {
			eventCalled++;
		};
	});

	var B = new Class(ui.Component, function() {
		this.test = ui.define1('.test', {
			a: 2
		});

		this.test2 = ui.define1('.test2', Base2);

		this.test3 = ui.define1('.test2', Base2, {
			'meta.virtual': true
		});

		this.test_click = function() {
			eventCalled++;
		};
	});

	var a = new A(div);
	equal(a.test.getOption('a'), 1, 'default options ok.');

	// b重新获取了test，并将其options赋值到了a
	var b = new B(div.getElementsByTagName('div')[0]);
	equal(a.test.getOption('a'), 2, 'change options ok.');

	// 检测是否确实是同一引用
	strictEqual(a.test, b.test, 'using same node.');

	// 事件绑定
	a.test.fireEvent('click');
	equal(eventCalled, 2, 'both event called.');

	// 类型不同
	notEqual(a.test2, b.test2, 'using same node with different type.');
});

test('virtual components', function() {

	var eventCalled = 0;

	var div = document.createElement('div');
	div.innerHTML = '<div><div class="test"></div><div class="test"></div><div class="test"></div></div>';

	var A = new Class(ui.Component, function() {
		this.test = ui.define('.test', {
			a: 1
		});
		this.test_click = function() {
			eventCalled++;
		};
	});

	var B = new Class(ui.Component, function() {
		this.test = ui.define('.test', {
			a: 2
		});
		this.test_click = function() {
			eventCalled++;
		};
	});

	var a = new A(div);
	equal(a.test[0].getOption('a'), 1, 'default options ok.');
	equal(a.test[1].getOption('a'), 1, 'default options ok.');
	equal(a.test[2].getOption('a'), 1, 'default options ok.');

	// b重新获取了test，并将其options赋值到了a
	var b = new B(div.getElementsByTagName('div')[0]);
	equal(a.test[0].getOption('a'), 2, 'change options ok.');
	equal(a.test[1].getOption('a'), 2, 'change options ok.');
	equal(a.test[2].getOption('a'), 2, 'change options ok.');

	// 检测是否确实是同一引用
	strictEqual(a.test.length, b.test.length, 'using same node.');
	strictEqual(a.test[0], b.test[0], 'using same node.');

	// 事件绑定
	a.test.fireEvent('click'); // 触发了3个节点的fireEvent
	equal(eventCalled, 6, 'both event called.');
});
