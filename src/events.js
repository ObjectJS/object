/**
 * @module
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
		// 获取function原生name似乎没什么用
		// var nativeName = Function.__get_name__(arguments.callee) || arguments.callee.__name__;
		var nativeName = arguments.callee.__name__;
		if (!name) name = nativeName;

		// 根据eventDataNames生成eventData，每一个参数对应一个eventData
		var eventData = {};
		// 保存func被调用时的所有参数（除了self）
		var args = Array.prototype.slice.call(arguments, 1);
		if (eventDataNames) {
			for (var i = 0; i < eventDataNames.length; i++) {
				// 名字对应方法的参数，从第2个参数开始，因为第一个是self
				eventData[eventDataNames[i]] = arguments[i + 1];
			}
		}
		// 默认有一个_args的data，
		eventData._args = args;

		var event = self.fireEvent(name, eventData, self);

		// 执行 xxx_createEvent 方法，可用于定制event
		var createEventMethod = self[nativeName + '_createEvent'];
		if (createEventMethod) {
			args.unshift(event);
			createEventMethod.apply(self, args);
		}

		// Webkit 使用 defaultPrevented
		// Gecko 使用 getPreventDefault()
		// IE 用 returnValue 模拟了 getPreventDefault
		var preventDefaulted = event.getPreventDefault? event.getPreventDefault() : event.defaultPrevented;
		if (!preventDefaulted) return func.apply(this, arguments);
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
this.Events = new Class(/**@lends events.Event*/ function() {

	// 在标准浏览器中使用的是系统事件系统，无法保证nativeEvents在事件最后执行。
	// 需在每次addEvent时，都将nativeEvents的事件删除再添加，保证在事件队列最后，最后才执行。
	function moveNativeEventsToTail(self, type) {
		var boss = self.__boss || self;
		if (self.__nativeEvents && self.__nativeEvents[type]) {
			// 删除之前加入的
			boss.removeEventListener(type, self.__nativeEvents[type].run, false);
			// 重新添加到最后
			boss.addEventListener(type, self.__nativeEvents[type].run, false);
		}
	};

	function handle(self, type) {
		var boss = self.__boss || self;
		boss.attachEvent('on' + type, function(eventData) {
			var event = arguments.length > 1? eventData : exports.wrapEvent(window.event);
			var funcs = self.__eventListeners? self.__eventListeners[type] : null;
			if (funcs) {
				funcs.forEach(function(func) {
					try {
						func.call(self, event);
					} catch(e) {
					}
				});
			}
			var natives = self.__nativeEvents? self.__nativeEvents[type] : null;
			if (natives) {
				natives.forEach(function(func) {
					func.call(self, event);
				});
			}
		});
	}

	this.initialize = function(self) {
		if (!self.addEventListener) {
			// 在一些情况下，你不知道传进来的self对象的情况，不要轻易的将其身上的__eventListeners清除掉
			if (!self.__eventListeners) self.__eventListeners = {};
			if (!self.__nativeEvents) self.__nativeEvents = {};
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
		moveNativeEventsToTail(self, type);

	} : function(self, type, func) {
		var boss = self.__boss || self;

		// 存储此元素的事件
		var funcs;
		if (!self.__eventListeners) self.__eventListeners = {};
		if (!self.__eventListeners[type]) {
			funcs = [];
			self.__eventListeners[type] = funcs;
			if (!self.__nativeEvents || !self.__nativeEvents[type]) {
				handle(self, type);
			}
		} else {
			funcs = self.__eventListeners[type];
		}

		// 不允许两次添加同一事件
		if (funcs.some(function(f) {
			return f === func;
		})) return;

		funcs.push(func);

	};

	this.addNativeEvent = document.addEventListener? function(self, type, func) {
		var boss = self.__boss || self;
		var natives;
		if (!self.__nativeEvents) self.__nativeEvents = {};
		if (!self.__nativeEvents[type]) {
			natives = [];
			self.__nativeEvents[type] = natives;
			self.__nativeEvents[type].run = function(event) {
				natives.forEach(function(func) {
					func.call(self, event);
				});
			};
			moveNativeEventsToTail(self, type);
		} else {
			natives = self.__nativeEvents[type];
		}
		natives.push(func);

	} : function(self, type, func) {
		var boss = self.__boss || self;
		var natives;
		if (!self.__nativeEvents) self.__nativeEvents = {};
		if (!self.__nativeEvents[type]) {
			natives = [];
			self.__nativeEvents[type] = natives;
			if (!self.__nativeEvents || !self.__eventListeners[type]) {
				handle(self, type);
			}
		} else {
			natives = self.__nativeEvents[type];
		}

		// 不允许两次添加同一事件
		if (natives.some(function(f) {
			return f === func;
		})) return;

		natives.push(func);
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

		if (!self.__eventListeners) self.__eventListeners = {};
		var funcs = self.__eventListeners[type];
		if (!funcs) return;

		for (var i = 0; i < funcs.length; i++) {
			if (funcs[i] === func) {
				funcs.splice(i, 1); // 将这个function删除
				break;
			}
		}
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
		object.extend(event, eventData);

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

		if (!self.__eventListeners[type]) return event;
		var funcs = self.__eventListeners[type];
		for (var i = 0, j = funcs.length; i < j; i++) {
			if (funcs[i]) {
					try {
						funcs[i].call(self, event, true);
					} catch(e) {
					}
			}
		}

		var natives = self.__nativeEvents[type];
		if (natives) {
			natives.forEach(function(func) {
				func.call(self, event);
			});
		}

		return event;
	};
});

});
