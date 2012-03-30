object.use('ui/ui2.js', function(ui) {

module('basic');

test('sub property', function() {
	var TestComponent = new Class(ui.Component, function() {
		this.test = ui.define1('.test');
		this.test2 = ui.define1('.test');
	});
	TestComponent.set('test3', ui.define1('.test'));

	var div = document.createElement('div');
	div.innerHTML = '<div class="test">test</div>';

	var test = new TestComponent(div);
	var testComp = test.test;
	var testNode = test.test.getNode();

	// 初始化时会获取所有sub
	equals(test.test.getNode().className, 'test', 'define1 component right when init.');

	// 下环线形式获取节点
	equals(test._test, testNode, 'define1 component right when init.');

	// 两个引用相同，返回相同一个component引用
	equals(test.test2, testComp, 'using one same component when selector same.');
	equals(test.test3, testComp, 'component defined after class created.');

	// 直接获取节点方式
	equals(test._test2, testNode, 'using one same node when selector same.');
	equals(test._test3, testNode, 'component defined after class created.');
});

test('mutiple sub property', function() {
	var TestComponent = new Class(ui.Component, function() {
		this.test = ui.define('.test');
		this.test2 = ui.define('.test');
	});
	TestComponent.set('test3', ui.define('.test'));

	var div = document.createElement('div');
	div.innerHTML = '<div class="test">test1</div><div class="test">test2</div><div class="test">test3</div><div class="test">test4</div>';

	var test = new TestComponent(div);
	var testComp = test.test;
	var testNode = test.test.getNode();

	// 初始化时会获取所有sub
	equals(test.test.getNode().length, 4, 'define components node ok.');

	// 下环线形式获取节点
	equals(test._test, testNode, 'define components right when init.');
});

test('option property', function() {

	optionChangeFired = 0;

	var SubComponent = new Class(ui.Component, function() {
		this.test = ui.option(false);
	});

	var TestComponent = new Class(ui.Component, function() {

		this.sub = ui.define1('.test', SubComponent);

		this.test = ui.option(1);

		this.test2 = ui.option('string');

		this.test3 = ui.option(true);

		this.test4 = ui.option(false, function(self) {
			return self.getNode().getAttribute('custom-attr');
		});

		this.test_change = function(self, event) {
			equal(event.oldValue, 1, '');
			equal(event.value, 2, '');
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
	equals(test.sub.test, true, 'option pass to sub.')
});

test('handle method', function() {
	var methodCalled = 0;
	var eventFired = 0;
	var TestComponent = new Class(ui.Component, function() {
		this._test = function(self, arg) {
			ok(arg, 'test', 'arguments pass ok.');
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

	var AddonComponent = new Class(ui.Component, function() {

		this.ontest = function(self, event) {
			// 不应该被执行，因为被下面覆盖掉了
			onEventCalled++;
			ok(false, 'on event override failed.');
		};

	});
	AddonComponent.set('ontest', function() {
		ok(true, 'on event override ok.');
		// 应该被执行
		onEventCalled++;
	});

	var TestComponent = new Class(ui.Component, function() {

		this.__mixins__ = [AddonComponent];

		this._test = function(self) {
			eventFired++;
		};

		this.ontest = function(self, event) {
			// 不应该执行，因为是自己身上的
			onEventCalled++;
			ok(false, 'on event runed by self.');
		};

	});

	var div = document.createElement('div');
	var test = new TestComponent(div);
	test.test();
	equal(eventFired, 1, 'event fired.');
	equal(onEventCalled, 1, 'on event called.');

});

test('on event method in extend', function() {
	var onEventCalled = 0;
	var AddonComponent = new Class(ui.Component, function() {
		this.ontest = function(self) {
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

test('sub event method', function() {

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

test('render', function() {

	var renderedEventCalled = 0;

	var TestComponent = new Class(ui.Component, function() {

		this.test = ui.define1('.test', ui.Component, function(self, make) {
			var a = make();
			self._node.appendChild(a._node);
		});

		this.test_click = function(self) {
			renderedEventCalled++;
		}

	});

	var div = document.createElement('div');

	var test = new TestComponent(div, {
		'test.hello': 'test',
		'test.template': '<div class="test">{{hello}}</div>'
	});

	// 渲染
	test.render('test');
	equal(test.getNode().outerHTML, '<div><div class="test">test</div></div>', 'template render ok.');

	// 事件
	test.test.getNode().click();
	equal(renderedEventCalled, 1, 'rendered component event called.');

	// 删除
	test.test.dispose();
	equal(test.test, null, 'dispose ok.');

});

});
