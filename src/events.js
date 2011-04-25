/**
 * @namespace
 * @name events
 */
object.add('events', 'ua', /**@lends events*/ function(exports, ua) {

function IEEvent() {

}
IEEvent.prototype.stopPropagation = function() {
	this.cancelBubble = true;
};

IEEvent.prototype.preventDefault = function() {
	this.returnValue = false;
};

IEEvent.prototype.getPreventDefault = function() {
	// 自定义事件是没有 returnValue 值的，如果设置默认为true，则会导致非自定义的事件后面再设置false失效，出现无法preventDefault()的问题
	// 不能设置默认值，就只能严格限制returnValue === false才算preventDefaulted
	return this.returnValue === false;
};

IEEvent.prototype.stop = function() {
	this.stopPropagation();
	this.preventDefault();
};

/**
 * decorator
 * 使得相应方法在调用时fire出同名事件，并支持preventDefault
 * fireevent 或 fireevent(eventName)
 * fireevent 默认eventName通过__name__获得
 */
this.fireevent = function(arg1) {
	var name, func, eventDataNames;

	// 千万别给这个function起名字，否则fire出来的事件都叫一个名字
	var firer = function(self) {
		var nativeName = Function.__get_name__(arguments.callee) || arguments.callee.__name__;
		if (!name) name = nativeName;

		// 根据eventDataNames生成eventData，每一个参数对应一个eventData
		var eventData = {};
		if (eventDataNames) {
			for (var i = 0; i < eventDataNames.length; i++) {
				// 名字对应方法的参数，从第2个参数开始，因为第一个是self
				eventData[eventDataNames[i]] = arguments[i + 1];
			}
		}

		var event = self.fireEvent(name, eventData, self);

		// 执行 xxx_createEvent 方法，可用于定制event
		var createEventMethod = self[nativeName + '_createEvent'];
		if (createEventMethod) {
			var args = Array.prototype.slice.call(arguments, 1);
			args.unshift(event);
			createEventMethod.apply(self, args);
		}

		// Webkit 使用 defaultPrevented
		// Gecko 使用 getPreventDefault()
		// IE 用 returnValue 模拟了 getPreventDefault
		var preventDefaulted = event.getPreventDefault? event.getPreventDefault() : event.defaultPrevented;
		if (!preventDefaulted) func.apply(this, arguments);
		return event;
	};

	if (typeof arg1 == 'function') {
		func = arg1;
		return firer;

	// 自定义了事件名称，返回一个decorator
	} else {
		if (Array.isArray(arguments[0])) {
			eventDataNames = arguments[0];
		} else {
			name = arg1;
			if (arguments[1]) eventDataNames = arguments[1];
		}
		return function(_func) {
			func = _func;
			return firer;
		};
	}

};

/**
 * 将IE中的window.event包装一下
 */
this.wrapEvent = function(e) {
	// 之前手贱在这里写了个 e.returnValue = true
	// 于是所有的事件都无法阻止执行了
	// IE可能只认第一次赋值，因为后面还是有重新把returnValue设置成false的

	e.target = e.srcElement;
	e.stopPropagation = IEEvent.prototype.stopPropagation;
	e.preventDefault = IEEvent.prototype.preventDefault;
	e.getPreventDefault = IEEvent.prototype.getPreventDefault;
	e.stop = IEEvent.prototype.stop;

	return e;
};

// 事件
this.Events = new Class(/**@lends object.Event*/ function() {

	this.__addEvent = function(self, type, func, cap) {
		var propertyName = '_event_' + type;
		if (self[propertyName] === undefined) {
			self[propertyName] = 0;
		}
		self.attachEvent('onpropertychange', function(event) {
			if (event.propertyName == propertyName) {
				func();
			}
		});
	};

	this.initialize = function(self) {
		if (!self.addEventListener) {
			self._eventListeners = {};
		}
		// 自定义事件，用一个隐含div用来触发事件
		if (!self.addEventListener && !self.attachEvent) {
			self.__boss = document.createElement('div');
		}
	};

	/**
	 * 添加事件
	 * @param self
	 * @param type 事件名
	 * @param func 事件回调
	 * @param cap 冒泡
	 */
	this.addEvent = document.addEventListener? function(self, type, func, cap) {
		var boss = self.__boss || self;

		if (cap === null) cap = false;

		// 非IE不支持mouseleave/mouseenter事件
		// 在老base中大量使用了这个事件，支持一下
		if (!ua.ua.ie && type == 'mouseleave') {
			var ismouseleave = function(event, element) {
				var p = event.relatedTarget;
				while ( p && p != element ) try { p = p.parentNode; } catch(error) { p = element; }
				return p !== element;
			};
			var innerFunc = func;
			func = function(event) {
				var p = event.relatedTarget;
				while (p && p != self) try {
					p = p.parentNode;
				} catch (e) {
					p = self;
				}
				if (p !== self && innerFunc) innerFunc.call(self, event);
			};
			func.innerFunc = innerFunc;
			type = 'mouseout';
		}

		boss.addEventListener(type, func, cap);
	} : function(self, type, func) {
		var boss = self.__boss || self;

		// 存储此元素的事件
		if (!self._eventListeners[type]) {
			self._eventListeners[type] = [];
		}
		var funcs = self._eventListeners[type];

		// 不允许两次添加同一事件
		if (funcs.some(function(f) {
			return f.innerFunc === func;
		})) return;

		// 为IE做事件包装，使回调的func的this指针指向元素本身，并支持preventDefault等
		// 包装Func，会被attachEvent
		// 包装Func存储被包装的func，detach的时候，参数是innerFunc，需要通过innerFunc找到wrapperFunc进行detach
		var wrapperFunc = function(eventData) {
			var e = arguments.length > 1? eventData : exports.wrapEvent(window.event);
			func.call(self, e);
		};
		wrapperFunc.innerFunc = func;

		funcs.push(wrapperFunc);

		boss.attachEvent('on' + type, wrapperFunc);
	};

	/**
	 * 移除事件
	 * @param self
	 * @param type 事件名
	 * @param func 事件回调
	 * @param cap 冒泡
	 */
	this.removeEvent = document.removeEventListener? function(self, type, func, cap) {
		var boss = self.__boss || self;

		boss.removeEventListener(type, func, cap);
	} : function(self, type, func, cap) {
		var boss = self.__boss || self;

		if (!self._eventListeners) self._eventListeners = {};
		var funcs = self._eventListeners[type];
		if (!funcs) return;

		// func 是 innerFunc，需要找到 wrapperFunc
		for (var i = 0, wrapperFunc; i < funcs.length; i++) {
			wrapperFunc = funcs[i];
			if (wrapperFunc === func || wrapperFunc.innerFunc === func) {
				funcs.splice(i, 1); // 将这个function删除
				break;
			}
		}
		// 如果没有找到func，虽然此次remove无效，但是根据标准，不应该报错。
		if (wrapperFunc) boss.detachEvent('on' + type, wrapperFunc);
	};

	/**
	 * 触发事件
	 * @param self
	 * @param type 事件名
	 * @param eventData 扩展到event对象上的数据
	 */
	this.fireEvent = document.dispatchEvent? function(self, type, eventData) {
		var boss = self.__boss || self;

		var triggerName = 'on' + type.toLowerCase();
		var event = document.createEvent('Event');
		event.initEvent(type, false, true);
		extend(event, eventData);

		if (self[triggerName]) {
			var returnValue = self[triggerName].call(self, event);
			if (returnValue === false) event.preventDefault();
		}

		boss.dispatchEvent(event);
		return event;
	} : function(self, type, eventData) {
		if (!eventData) eventData = {};
		var triggerName = 'on' + type.toLowerCase();
		var event = exports.wrapEvent(eventData);

		if (self[triggerName]) {
			var returnValue = self[triggerName].call(self, event);
			if (returnValue === false) event.preventDefault();
		}

		if (!self._eventListeners[type]) return event;
		var funcs = self._eventListeners[type];
		for (var i = 0, j = funcs.length; i < j; i++) {
			if (funcs[i]) {
				funcs[i].call(self, event, true);
			}
		}
		return event;
	};
});

});
