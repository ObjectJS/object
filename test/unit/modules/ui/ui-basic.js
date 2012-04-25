module('basic');

test('sub property', function() {

object.use('ui', function(ui) {
	var initCalled = 0;
	var TestComponent = new Class(ui.Component, function() {
		this.test = ui.define1('.test');
		this.test2 = ui.define1(function(self) {
			return self._node.getElement('.test');
		});
		this.test3 = ui.define1('.test');
		this._init = function(self) {
			initCalled++;
		};
	});
	TestComponent.set('test4', ui.define1('.test'));

	var div = document.createElement('div');
	div.innerHTML = '<div class="test">test</div><div class="foo"></div>';

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
	strictEqual(test.test4, testComp, 'component defined after class created.');

	// 直接获取节点方式
	equals(test.test2.getNode(), testNode, 'using one same node when selector same.');
	equals(test.test3.getNode(), testNode, 'using one same node when selector same.');
	equals(test.test4.getNode(), testNode, 'component defined after class created.');

	// 修改selector
	test.setOption('test.meta.selector', '.foo');
	equal(test.get('test').getNode().className, 'foo', 'change selector ok.');

	// dispose
	test.test.dispose();
	equal(test.test, null, 'disposed.');
});

});

test('mutiple sub property', function() {

object.use('ui', function(ui) {

	var methodCalled = 0;

	var A = new Class(ui.Component, function() {
		this._test = function() {
			methodCalled++;
		};
	});

	var TestComponent = new Class(ui.Component, function() {
		this.test = ui.define('.test', A);
		this.test2 = ui.define('.test');
	});
	TestComponent.set('test3', ui.define('.test'));

	var div = document.createElement('div');
	div.innerHTML = '<div class="test">test1</div><div class="test">test2</div><div class="test">test3</div><div class="test">test4</div>';

	var test = new TestComponent(div);
	var testComp = test.test;
	var testNode = test.test.getNode();

	// 初始化时会获取所有sub
	equals(test.test.length, 4, 'define components ok.');
	equals(test.test.getNode().length, 4, 'define components node ok.');

	// 下环线形式获取节点
	equals(test._test, testNode, 'define components right when init.');

	// 公用方法调用
	test.test.test();
	equal(methodCalled, 1, 'method called.');

	// dispose
	test.test[0].dispose();
	equals(test.test.length, 3, 'dispose one component ok.');

	// dispose all
	test.test.dispose();
	strictEqual(test.test.length, 0, 'dispose all ok.');
});

});

test('parent property', function() {

object.use('ui', function(ui) {

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

	ok(test.test.parent === test, 'parent component ok.');
});
});

test('async load component', function() {

object.use('ui', function(ui) {
	expect(2);

	var script = document.createElement('script');
	script.setAttribute('data-src', 'async-module.js');
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
});

test('async load template', function() {

	var script = document.createElement('script');
	script.setAttribute('data-src', 'async-template.js');
	script.setAttribute('data-module', 'test/template.mustache');
	document.body.appendChild(script);
	object._loader.buildFileLib();

	object.define('test/index.js', 'ui', function(require) {

		var ui = require('ui');

		var TestComponent = new Class(ui.Component, function() {
			this.test = ui.define1('.test', function(self, make) {
				self.getNode().appendChild(make());
			});
			this.test2 = ui.define1('.test', function(self, make) {
				self.getNode().appendChild(make());
			});
		});

		var div = document.createElement('div');
		var test = new TestComponent(div, {
			'test.meta.templatemodule': 'test/template.mustache',
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
	});

	object.use('test, sys', function(test, sys) {
	});
});

test('option property', function() {
object.use('ui', function(ui) {

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

		this.test_change = function(self, event) {
			equal(event.oldValue, 1, 'old value ok.');
			equal(event.value, 2, 'new value set.');
			optionChangeFired++;
		};

		this.test2_change = function(self, event) {
			event.preventDefault();
		};
	});

	var div = document.createElement('div');
	div.setAttribute('data-test3', '');
	div.setAttribute('custom-attr', 'custom-value');
	div.innerHTML = '<div class="test"></div>';

	var test = new TestComponent(div, {
		'sub.test': true
	});

	// 默认属性
	equals(test.test, 1, 'default option value ok.');

	// 普通设置
	test.set('test', 2);
	equals(test.test, 2, 'set option value ok.');

	// 设置会触发事件
	equals(optionChangeFired, 1, 'set option fired change event.');

	// 阻止option设置
	test.set('test2', 'xxx');
	equals(test.test2, 'string', 'set option prevented.');

	// 从属性获取option
	equals(test.test3, false, 'get option from node.');

	// 自定义属性getter取代从属性获取
	equals(test.test4, 'custom-value', 'get option from custom getter.');

	// option传递
	equals(test.sub.test, true, 'option pass to sub.');

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
});

test('request property', function() {
object.use('ui', function(ui) {

var errorCalled = 0;
var successCalled = 0;

var TestComponent = new Class(ui.Component, function() {

	this.dataFetcher = ui.request('error');
	this.dataFetcher2 = ui.request('request.txt');
	this.dataFetcher3 = ui.request('error');

	this.dataFetcher_error = function(self, event) {
		errorCalled++;
	}; 

	this.dataFetcher2_success = function(self, event) {
		successCalled++;
	};

	this.dataFetcher3_success = function(self, event) {
		successCalled++;
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
	equal(successCalled, 1, 'request success fired.');
};

stop();
test.setOption('dataFetcher3.url', 'request.txt');
test.get('dataFetcher3').send();
test.get('dataFetcher3').oncomplete = function() {
	start();
	equal(successCalled, 2, 'request success fired by url changed.');
};

});
});

test('handle method', function() {
object.use('ui', function(ui) {

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
});

test('on event method', function() {
object.use('ui', function(ui) {

	var eventFired = 0;
	var onEventCalled = 0;
	var fireEventCalled = 0;

	var AddonComponent = new Class(ui.Component, function() {

		this.onTest = function(self, event) {
			// 不应该被执行，因为被下面覆盖掉了
			onEventCalled++;
			ok(false, 'on event override failed.');
		};

	});
	AddonComponent.set('onTest', function() {
		ok(true, 'on event override ok.');
		// 应该被执行
		onEventCalled++;
	});

	var TestComponent = new Class(ui.Component, function() {

		this.__mixins__ = [AddonComponent];

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

	var div = document.createElement('div');
	var test = new TestComponent(div);
	test.test();
	equal(eventFired, 1, 'event fired.');
	equal(onEventCalled, 2, 'on event called.');

	test.fireEvent('test2');
	equal(fireEventCalled, 1, 'on event called by fireEvent.');

});
});

test('extend on event method', function() {
object.use('ui', function(ui) {

	var onEventCalled = 0;
	var AddonComponent = new Class(ui.Component, function() {
		this.onTest = function(self) {
			onEventCalled++;
		};
	});
	var TestComponent = new Class(ui.Component, function() {
		this.__mixins__ = [AddonComponent];
	});
	var TestComponent2 = new Class(TestComponent, function() {
		this._test = function(self) {
		}
	});

	var div = document.createElement('div');
	var test = new TestComponent2(div);
	test.test();

	equal(onEventCalled, 1, 'on event called in extend.');
});
});

test('sub event method', function() {
object.use('ui', function(ui) {


	var clickEventCalled = 0;
	var customEventCalled = 0;

	var Test2Component = new Class(ui.Component, function() {
		this._test = function(self, a) {
		}
	});

	var TestComponent = new Class(ui.Component, function() {

		this.test = ui.define1('.test', Test2Component);

		this.test_click = function(self, event) {
			// 传递的是正确的事件
			equals(event.type, 'click', 'arguments pass ok.');
			// 从event上能够找到触发此事件的component信息。
			equals(event.target.component, self.test, 'component arguments pass ok with click event.');

			clickEventCalled++;
		};

		this.test_test = function(self, event, a) {
			// 从event上能够找到触发此事件的component信息。
			equals(event.target.component, self.test, 'component arguments pass ok with custom event.');
			// 自定义事件传递的参数可以获取
			equals(a, 'test', 'custom arguments pass ok with custom event.');

			customEventCalled++;
		};

	});

	var div = document.createElement('div');
	div.innerHTML = '<div class="test">test</div>';

	var test = new TestComponent(div);

	test.test.getNode().click();
	equals(clickEventCalled, 1, 'sub click event called.');

	test.test.test('test');
	equals(customEventCalled, 1, 'sub custom event called.');
});
});

test('addons', function() {
object.use('ui', function(ui) {

	var addonInitCalled = 0;
	var initCalled = 0;
	var eventCalled = 0;

	var A = new Class(ui.Component, function() {

		this.a = ui.define('.a');

		this._init = function(self) {
			addonInitCalled++;
		};
	});

	var Test = new Class(ui.Component, function() {
		this.__mixins__ = [A];

		this.test = ui.define('.test');

		this.a_show = function() {
			eventCalled++;
		};

		this._init = function(self) {
			initCalled++;
		};
	});

	var div = document.createElement('div');
	div.innerHTML = '<div class="a"></div>';

	var test = new Test(div);

	equal(addonInitCalled, 1, 'addon init method called.');
	equal(initCalled, 1, 'init method called.');

	ok(test.a, 'component addoned.');

	test.a.fireEvent('show');
	equal(eventCalled, 1, 'addoned event called.');
});
});

test('custom addons', function() {
object.define('test.test', 'ui', function(require) {
	var ui = require('ui');
	this.TestComponent = new Class(ui.Component, function() {
		this.a = 1;
	});
	this.TestComponent2 = new Class(ui.Component, function() {
		this.b = 1;
	});
});
object.use('ui', function(ui) {

	var A = new Class(ui.Component, function() {
		this.foo = 1;
	});

	var SubComponent = new Class(ui.Component, function() {
		this.__mixins__ = [A];
	});

	// custom addon
	var TestComponent = new Class(ui.Component, function() {
		this.test = ui.define1(false, SubComponent, function(self, make) {
			return document.createElement('div');
		});
	});

	var test = new TestComponent(document.createElement('div'), {
		'test.meta.addons': 'test.test.TestComponent',
	});

	// 使用不同的addons
	var test2 = new TestComponent(document.createElement('div'), {
		'test.meta.addons': 'test.test.TestComponent2',
	});

	test.render('test');
	test2.render('test');

	equal(test.test.a, 1, 'test use addon.');
	equal(test2.test.b, 1, 'test2 use another addon.');
	ok(test.test.constructor !== test2.test.constructor, 'different addon using different constructor.');

});
});

test('async custom addons', function() {
object.use('ui', function(ui) {

	var script = document.createElement('script');
	script.setAttribute('data-src', 'async-module.js');
	script.setAttribute('data-module', 'test.test');
	document.body.appendChild(script);
	object._loader.buildFileLib();

	var A = new Class(ui.Component, function() {
		this.foo = 1;
	});

	var SubComponent = new Class(ui.Component, function() {
		this.__mixins__ = [A];
	});

	// custom addon
	var TestComponent = new Class(ui.Component, function() {

		this.test = ui.define1('.test', SubComponent);

		this.test2 = ui.define1('.test2', 'test.test.TestComponent');

		this._init = function(self) {
			start();
			// a、b均来自于addon
			equal(self.test.a, 1, 'custom addon addoned.');
			equal(self.test.b, 1, 'mutiple custom addon addoned.');

			// a来自于自定义类型，b来自于addon
			equal(self.test2.a, 1, 'custom addon addoned with custom type.');
			equal(self.test2.b, 1, 'mutiple custom addon addoned with custom type.');

			var type = self.test2.constructor;
			// 刷新内容，测试constructor是否一致
			self.getNode().innerHTML += '';
			// 确保多次获取时用的都是生成的同一个类，而不是多次生成
			ok(self.get('test2').constructor === type, 'custom addon using same constructor.');

			// test已存在一个addon为A，确保不会被重置掉
			equal(self.test.get('foo'), 1, 'write-in addon ok.');
		};
	});

	var div = document.createElement('div');
	div.innerHTML = '<div class="test"></div><div class="test2"></div>';

	stop();
	var test = new TestComponent(div, {
		'test.meta.addons': 'test.test.TestComponent, test.test.TestComponent2',
		'test2.meta.addons': 'test.test.TestComponent2'
	});

	document.body.removeChild(script);

});
});

test('render', function() {
object.use('ui', function(ui) {

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
	equal(test.getNode().innerHTML, '<div class="test">test</div>', 'template render ok by default options.');
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
});

test('render free component', function() {
object.use('ui', function(ui) {

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
});

test('addon factory', function() {
object.use('ui', function(ui) {

	var eventFired = 0;

	var A = new Class(ui.Component, function() {
	});

	var BaseClass = new Class(ui.AddonClass, function() {

		this.$trigger = '{{name}}Trigger';

		this['{{trigger}}_click'] = function(cls, self) {
			ok(self.test, 'arguments ok.');
			var $name = cls.get('$name');
			equal($name, 'test', 'variable ok.');
			eventFired++;
		};

	});

	var TestClass = new Class(BaseClass, function() {

		this.$name = 'test';

		this['{{name}}'] = ui.define1(false, function() {
			return document.createElement('div');
		});

		this['{{trigger}}'] = ui.define1(false, function() {
			return document.createElement('span');
		});
	});

	var Test2Class = new Class(BaseClass, function() {

		this.$name = 'test2';

		this['{{name}}'] = ui.define1(false, function() {
			return document.createElement('div');
		});

		this['{{trigger}}'] = ui.define1(false, function() {
			return document.createElement('span');
		});
	});

	var Test = new TestClass({});
	var Test2 = new Test2Class({});

	var test = new Test(document.createElement('div'));
	var test2 = new Test2(document.createElement('div'));

	test.render('test', function() {
		equal(test.test.getNode().tagName, 'DIV', 'render component ok.');
	});

	test.render('testTrigger', function() {
		test.testTrigger.getNode().click();
	});

	test2.render('test2Trigger', function() {
		test.testTrigger.getNode().click();
	});

});
});

test('page', function() {

object.use('ui', function(ui) {

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

});

});

test('different component define same node', function() {
object.use('ui', function(ui) {

	var eventCalled = 0;

	var div = document.createElement('div');
	div.innerHTML = '<div><div class="test"></div><div class="test2"></div></div>';

	var Base1 = new Class(ui.Component, {});
	var Base2 = new Class(ui.Component, {});

	var A = new Class(ui.Component, function() {
		this.test = ui.define1('.test');

		this.test2 = ui.define1('.test2', Base1);

		this.test_click = function() {
			eventCalled++;
		};
	});

	var B = new Class(ui.Component, function() {
		this.test = ui.define1('.test');

		this.test2 = ui.define1('.test2', Base2);

		this.test_click = function() {
			eventCalled++;
		};
	});

	var a = new A(div);
	var b = new B(div.getElementsByTagName('div')[0]);

	// 检测是否确实是同一引用
	strictEqual(a.test, b.test, 'using same node.');

	// 事件绑定
	a.test.fireEvent('click');
	equal(eventCalled, 2, 'both event called.');

	// 类型不同
	notEqual(a.test2, b.test2, 'using same node with different type.');
});
});

test('different components define same nodes', function() {
object.use('ui', function(ui) {

	var eventCalled = 0;

	var div = document.createElement('div');
	div.innerHTML = '<div><div class="test"></div><div class="test"></div><div class="test"></div></div>';

	var A = new Class(ui.Component, function() {
		this.test = ui.define('.test');
		this.test_click = function() {
			eventCalled++;
		};
	});

	var B = new Class(ui.Component, function() {
		this.test = ui.define('.test');
		this.test_click = function() {
			eventCalled++;
		};
	});

	var a = new A(div);
	var b = new B(div.getElementsByTagName('div')[0]);

	// 检测是否确实是同一引用
	strictEqual(a.test.length, b.test.length, 'using same node.');
	strictEqual(a.test[0], b.test[0], 'using same node.');

	// 事件绑定
	a.test.fireEvent('click'); // 触发了3个节点的fireEvent
	equal(eventCalled, 6, 'both event called.');
});
});
