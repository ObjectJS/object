object.use('ui/ui2.js', function(ui) {

module('basic');

test('sub property.', function() {
	var TestComponent = new Class(ui.Component, function() {
		this.test = ui.define1('.test');
		this.test2 = ui.define1('.test');
	});
	TestComponent.set('test3', ui.define1('.test'));

	var div = document.createElement('div');
	div.innerHTML = '<div class="test">test</div>';

	var test = new TestComponent(div);
	// 初始化时会获取所有sub
	equals(test.test.getNode().className, 'test', 'define1 component right when init.');

	// 两个引用相同，返回相同一个component引用
	var testComp = test.test;
	ok(test.test2 === testComp, 'using one same component when selector same.');
	ok(test.test3 === testComp, 'component defined after class created.');

	// TODO mutiple define
});

test('handle method.', function() {
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

test('on event method.', function() {

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

		this._test = function(self, arg) {
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

test('sub event method.', function() {
	var TestComponent = new Class(ui.Component, function() {

		this.test = ui.define1('.test');

		this.test_click = function() {
		};

	});

	var div = document.createElement('div');
	div.innerHTML = '<div class="test">test</div>';

	var test = new TestComponent(div);
});

});
