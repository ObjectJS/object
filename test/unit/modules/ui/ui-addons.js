module('addons');

test('basic', function() {
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

var addonInitCalled = 0;
var onEventCalled = 0;

object.define('test2', 'ui', function(require) {
	var ui = require('ui');
	this.TestComponent = new Class(ui.Component, function() {
		this.test = 1;
		this._init = function(self) {
			addonInitCalled++;
		};
		this._a = function(self) {
		};
	});
	this.TestComponent2 = new Class(ui.Component, function() {
		this.test2 = 1;
		this._init = function(self) {
			addonInitCalled++;
		};
	});
});
object.use('ui', function(ui) {
	var B = new Class(ui.Component, function() {
		this.b = ui.option('b');
		this._init = function(self) {
			addonInitCalled++;
		};
		this.onA = function(self) {
			onEventCalled++;
		};
	});

	var A = new Class(ui.Component, function() {
		this.__mixins__ = [B];
		this._init = function(self) {
			addonInitCalled++;
		};
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
		'test.meta.addons': 'test2.TestComponent',
	});

	// 使用不同的addons
	var test2 = new TestComponent(document.createElement('div'), {
		'test.meta.addons': 'test2.TestComponent2',
	});

	test.render('test', function() {
		equal(test.test.test, 1, 'test use addon.');
		test.test.a();
		equal(onEventCalled, 1, 'on event called.');
	});
	test2.render('test', function() {
		equal(test2.test.test2, 1, 'test2 use another addon.');
	});

	ok(test.test.constructor !== test2.test.constructor, 'different addon using different constructor.');

	// 通过meta设置的addon、内置addon、addon的addon都会调用init
	equal(addonInitCalled, 6, 'addon init called.');
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

test('on event method', function() {
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

test('addon class', function() {
object.use('ui', function(ui) {

	var eventFired = 0;

	var A = new Class(ui.Component, function() {
	});

	var BaseClass = new Class(ui.AddonClass, function() {

		this.$trigger = '{{name}}Trigger';

		this['{{trigger}}_click'] = function(cls, vars) {
			return function(self) {
				ok(self.test, 'arguments ok.');
				equal(vars.name, 'test', 'variable ok.');
				eventFired++;
			}
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

