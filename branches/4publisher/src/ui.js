object.add('ui', 'string, dom, attribute', function($, string, dom, attribute) {

/**
 * UI模块基类
 * @class
 */
var Component = this.Component = new Class(function() {

	this.__init__ = function(self) {
		self = $.wrap(self);
	};

	/**
	 * @classmethod
	 */
	this._render = classmethod(function(cls, component, name, type, one) {
		if (!type) type = $;

		var methodName  = name + '_render';
		var selector = component.selectors[name];
		var eles;

		if (component[methodName]) {
			eles = component[methodName]();
			eles = $.wrap(eles);
		} else {
			eles = component[one? 'getElement' : 'getElements'](selector);
		}

		if (one) {
			eles = type.wrap(eles);
		} else {
			eles.forEach(function(ele) {
				type.wrap(ele);
			});
		}

		// 通过classmethod使自己能够获得到cls的引用，在给元素增加事件时方便进行遍历
		Object.keys(cls).forEach(function(key) {
			var match = key.match(new RegExp(name + '_' + '(\\w+)'));
			if (!match) return;
			var eventName = match[1];
			if (one) {
				eles.addEvent(eventName, component[key].bind(component));
			} else {
				eles.forEach(function(ele) {
					ele.addEvent(eventName, component[key].bind(component));
				});
			}
		});

		attribute.defineProperty(component, name, {
			get: function() {
				var eles = component[one? 'getElement' : 'getElements'](selector);
				component[name] = eles;
				return eles;
			}
		});

		component[name] = eles;

	});

	this.render1 = function(self, name, type) {
		return self._render(self, name, type, 1);
	};

	this.render = function(self, name, type) {
		return self._render(self, name, type);
	};

	this.bind = function(self, name) {
		return function() {
			self.apply(name, [].slice.call(arguments, 0));
		};
	};

	this.call = function(self, name) {
		self.fireEvent(name, null, self);
		self[name].apply(self, [].slice.call(arguments, 2));
	};

	this.apply = function(self, name, args) {
		self.fireEvent(name, null, self);
		self[name].apply(self, args);
	};

	/**
	 * add component
	 */
	this.add = function(self, name, selector, count, options) {
		if (!options) options = {};
		options.selector = selector;
		options.count = count;
		self.components[name] = options;
	};

	/**
	 * makeOption
	 */
	this.makeOption = function(self, name, type) {
		name = name.toLowerCase();
		var value = self.getData(name);
		if (type === Boolean) {
			value = (value === 'true');
		} else if (type === Number) {
			value = Number(value);
		}

		if (value === null || value === undefined || value === NaN) return null;

		return value;
	};

	/**
	 * ele有可能已经wrap过，要注意不要重新覆盖老的成员
	 * 提供了包装机制不代表同一个元素可以进行多重包装，在相同的继承树上多次包装没有问题，如果将两个无关的类型包装至同一元素，则第二次包装报错
	 * 如果 TabControl.wrap(ele) 后进行 List.wrap(ele) ，则List包装失效并且报错
	 * 如果 TabControl.wrap(ele) 后进行 Component.wrap(ele) 由于TabControl继承于Component，则无需包装
	 * 如果 Component.wrap(ele) 后进行 TabControl.wrap(ele) 由于TabControl继承于Component，则包装成功
	 * @classmethod
	 */
	this.wrap = classmethod(function(cls, ele) {
		if (!ele) return null;

		// 获取class的所有继承关系，存成平面数组
		// TODO: class 的 chain 机制
		function getBases(m) {
			var array = [];
			for (var i = 0, l = m.length; i < l; i++){
				array = array.concat((m[i].__bases__ && m[i].__bases__.length) ? arguments.callee(m[i].__bases__) : m);
			}
			return array;
		}

		if (ele._wrapper) {
			if (ele._wrapper === cls) return ele; // 重复包装相同类

			var wrapperBases = getBases([ele._wrapper]);

			// 已经包装过子类了(包了TabControl再包装Component)，无需包装
			if (wrapperBases.indexOf(cls) !== -1) {
				return ele;
			}

			var classBases = getBases([cls]);

			// 现有包装不在同一继承树上，报错
			if (classBases.indexOf(ele._wrapper) === -1) {
				throw '包装出错，一个元素只能有一个包装类';
			}
		}

		// 将ele注射进cls
		Class.inject(cls, ele);

		ele._wrapper = cls;
		return ele;
	});

});

/**
 * Tab UI
 * @class
 * @event change
 */
this.TabControl = new Class(Component, function() {

	/**
	 * @constructor
	 */
	this.__init__ = function(self) {
		Component.__init__(self);

		self.tabs = dom.getElements('li', self);
		self.selectedEle = null;

		for (var i = 0; i < self.tabs.length; i++) {
			if (dom.Element.wrap(self.tabs[i]).classList.contains('selected')) {
				self.selectedEle = self.tabs[i];
				break;
			}
		}

		self.tabs.forEach(function(ele, i) {
			ele = dom.wrap(ele);

			ele.addEvent('click', function() {
				self.tabs.forEach(function(tab, i) {
					dom.wrap(tab).classList.remove('selected');
				});
				self.selectedEle = ele;
				ele.classList.add('selected');
				self.fireEvent('change', null, self);
			});
		});
	};

});

/**
 * @class
 */
var ForeNextControl = this.ForeNextControl = new Class(Component, function() {

	/**
	 * @constructor
	 */
	this.__init__ = function(self) {
		Component.__init__(self);

		self.selectors = {
			'nextButton': '.nextbutton',
			'foreButton': '.forebutton'
		};

		self.total = parseInt(self.getData('total'));
		self.start = parseInt(self.getData('start')) || 0;
		self.position = self.start;

		self.render('nextButton');
		self.render('foreButton');
	};

	this.nextButton_click = function(self, event) {
		self.call('next');
	};

	this.foreButton_click = function(self, event) {
		self.call('fore');
	};

	this.next = function(self) {
		self.position++;
		self.call('change');
	};

	this.fore = function(self) {
		self.position--;
		self.call('change');
	};

	this.change = function(self) {
		self.call('updateTotal');
		self.call('updatePosition');
	};

	this.updatePosition = function(self) {
		self.getElements('.current').set('html', self.position + 1); // position是从0开始滴～展示的时候+1
	};

	this.updateTotal = function(self) {
		self.getElements('.total').set('html', self.total);
	};

});

});

