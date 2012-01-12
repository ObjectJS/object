object.add('events', 'ua', function(exports, ua) {

/**
 * 在Safari3.0(Webkit 523)下，preventDefault()无法获取事件是否被preventDefault的信息
 * 这里通过一个事件的preventDefault来判断类似情况
 * _needWrapPreventDefault用于在wrapPreventDefault中进行判断
 */
var _needWrapPreventDefault = (function() {
	if (document.createEvent) {
		var event = document.createEvent('Event');
		event.initEvent(type, false, true);

		if (event.preventDefault) {
			event.preventDefault();
			// preventDefault以后返回不了正确的结果
			return !(event.getPreventDefault? event.getPreventDefault() : event.defaultPrevented);
		} 
		// 没有preventDefault方法，则必然要wrap
		else {
			return true;
		}
	}
	return false;
})();

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

/**
 * safari 3.0在preventDefault执行以后，defaultPrevented为undefined，此处包装一下
 */
this.wrapPreventDefault = function(e) {
	if (_needWrapPreventDefault) {
		var oldPreventDefault = e.preventDefault;
		e.preventDefault = function() {
			this.defaultPrevented = true;
			oldPreventDefault.apply(this, arguments);
		}
	}
}

// native events from Mootools
var NATIVE_EVENTS = {
	click: 2, dblclick: 2, mouseup: 2, mousedown: 2, contextmenu: 2, //mouse buttons
	mousewheel: 2, DOMMouseScroll: 2, //mouse wheel
	mouseover: 2, mouseout: 2, mousemove: 2, selectstart: 2, selectend: 2, //mouse movement
	keydown: 2, keypress: 2, keyup: 2, //keyboard
	orientationchange: 2, // mobile
	touchstart: 2, touchmove: 2, touchend: 2, touchcancel: 2, // touch
	gesturestart: 2, gesturechange: 2, gestureend: 2, // gesture
	focus: 2, blur: 2, change: 2, reset: 2, select: 2, submit: 2, paste: 2, oninput: 2, //form elements
	load: 2, unload: 1, beforeunload: 2, resize: 1, move: 1, DOMContentLoaded: 1, readystatechange: 1, //window
	error: 1, abort: 1, scroll: 1 //misc
};

/**
 * 判断某一个nativeEvent是不是适合Node
 * 在IE下，如果Node不支持nativeEvent类型的事件监听，则nativeFireEvent.call(node, eventName, event)会报错
 * 目前每一种Node支持的类型都已经在dom模块中进行了指定，详情请参见src/dom/index.js中元素的nativeEventNames属性
 */
function isNativeEventForNode(node, type) {
	// 如果有nativeEventNames属性，说明是包装过的元素
	if (node.nativeEventNames) {
		// 判断此节点是否支持此事件类型的触发
		return node.nativeEventNames.indexOf(type) != -1;
	}
	// 如果没有包装过，则继续按照默认的进行（可能会有错误发生）
	return type in NATIVE_EVENTS;
}

/**
 * 事件系统
 */
this.Events = new Class(function() {
	
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
				funcs = funcs.slice(0);
				funcs.forEach(function(func) {
					try {
						func.call(self, event);
					} catch(e) {
					}
				});
				funcs = null;
			}
			var natives = self.__nativeEvents? self.__nativeEvents[type] : null;
			if (natives) {
				natives = natives.slice(0);
				natives.forEach(function(func) {
					func.call(self, event);
				});
				natives = null;
			}
		});
	}

	// 不同浏览器对onhandler的执行顺序不一样
	// 	  IE：最先执行onhandler，其次再执行其他监听函数
	// 	  Firefox：如果添加多个onhandler，则第一次添加的位置为执行的位置
	// 	  Chrome ：如果添加多个onhandler，最后一次添加的位置为执行的位置
	// 
	// Chrome的做法是符合标准的，因此在模拟事件执行时按照Chrome的顺序来进行
	//
	// 保证onxxx监听函数的正常执行，并维持onxxx类型的事件监听函数的执行顺序
	function addOnHandlerAsEventListener(self, type) {
		// 只有DOM节点的标准事件，才会由浏览器来执行标准方法
		if (type in NATIVE_EVENTS && self.nodeType == 1) return;

		var boss = self.__boss || self;
		var onhandler = self['on' + type], onhandlerBak = boss['__on' + type];
		// 如果onHandler为空，并且已经添加过，则需要remove
		if (!onhandler && onhandlerBak) {
			boss.removeEventListener(type, onhandlerBak, false);
			boss['__on' + type] = null;
		}
		// 如果onHandler不为空，则需要判断是否已经添加过
		else if (onhandler && onhandler != onhandlerBak) {
			// 如果已经添加过，则先去除原先添加的方法，再将新的方法加入，并更新备份信息
			boss.removeEventListener(type, onhandlerBak, false);
			// 将新的事件监听方法加入列表
			boss.addEventListener(type, onhandler, false);
			// 将新的事件监听方法备份
			boss['__on' + type] = onhandler;
		}
	}
	
	// IE下保证onxxx事件处理函数正常执行
	function attachOnHandlerAsEventListener(self, type) {
		// 只有DOM节点的标准事件，并且此标准事件能够在节点上触发，才会由浏览器来执行标准方法
		if (self.nodeType == 1 && isNativeEventForNode(self, type) && isNodeInDOMTree(self)) return;

		if (!self.__eventListeners) {
			self.__eventListeners = {};
		}
		if (!self.__eventListeners[type]) {
			self.__eventListeners[type] = [];
		}
		var funcs = self.__eventListeners[type];
		var l = funcs.length;
		var onhandler = self['on' + type], onhandlerBak = self['__on' + type];
		// 如果onHandler为空，并且已经添加过，则需要remove
		if (!onhandler && onhandlerBak) {
			for (var i = 0; i < l; i++) {
				if (funcs[i] == onhandlerBak) {
					funcs.splice(i, 1);
					break;
				}
			}
			self['__on' + type] = null;
		}
		// 如果onHandler不为空，则需要判断是否已经添加过
		else if (onhandler && onhandler != onhandlerBak) {
			// 如果已经添加过，则先去除原先添加的方法，再将新的方法加入，并更新备份信息
			for (var i = 0; i < l; i++) {
				if (funcs[i] == onhandlerBak) {
					funcs.splice(i, 1);
					break;
				}
			}
			// 将新的事件监听方法加入列表
			funcs.push(onhandler);
			// 将新的事件监听方法备份
			self['__on' + type] = onhandler;
		}
	}

	/**
	 * 判断节点是否是DOM树中的节点
	 *
	 * 在IE下，如果不是DOM树中的节点，标准事件的onxxx监听不会触发
	 * 因此在fireEvent时需要判断当前节点是否在DOM树中
	 */
	function isNodeInDOMTree(node) {
		if (!node) {
			return false;
		}
		var parent = node.parentNode;
		var top = document.documentElement;
		while (parent) {
			if (parent == top) {
				return true;
			}
			parent = parent.parentNode;
		}
		return false;
	}

	/**
	 * 在preventDefault方法不靠谱的情况下，如果事件由浏览器自动触发，则需要在第一个事件处理函数中将preventDefault覆盖
	 *
	 * 此方法在事件列表最前面（在onxxx之前）添加一个专门处理preventDefault的事件监听函数
	 */
	function insertWrapPreventDefaultHandler(boss, type, cap) {
		if (!boss['__preEventAdded_' + type]) {
			// 标识该事件类型的preventDefault已经包装过了
			boss['__preEventAdded_' + type] = true;
			// 如果有onxxx类型的处理函数，则也暂时去除，待包装函数添加完以后，再添加回去
			if (boss['on' + type]) {
				boss['__on' + type] = boss['on' + type];
				boss['on' + type] = null;
			}
			// 添加事件监听
			boss.addEventListener(type, function(event) {
				exports.wrapPreventDefault(event);
			}, cap);
			// 把onxxx监听函数添加回去
			if (boss['__on' + type]) {
				boss['on' + type] = boss['__on' + type];
				boss['__on' + type] = null;
				try {
					delete boss['__on' + type];
				} catch (e) {}
			}
		}
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
	* @method
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

			// 备份func，以便能够通过innerFunc来删除func
			if (!self.__eventListeners) {
				self.__eventListeners = {};
			}
			if (!self.__eventListeners[type]) {
				self.__eventListeners[type] = [];
			}
			self.__eventListeners[type].push(func);
		}

		// 如果需要包装preventDefault方法，则在事件处理函数最前面添加一个简单的事件监听
		// 该事件监听只负责包装event，使其preventDefault正确执行
		if (_needWrapPreventDefault) {
			insertWrapPreventDefaultHandler(boss, type, cap);
		}

		//处理onxxx类型的事件处理函数
		addOnHandlerAsEventListener(self, type);

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

		attachOnHandlerAsEventListener(self, type);
		funcs.push(func);

	};

	/**
	* 添加系统事件，保证事件这些事件会在注册事件调用最后被执行
	* @method
	* @param type 事件名
	* @param func 事件回调
	*/
	this.addNativeEvent = document.addEventListener? function(self, type, func) {
		var boss = self.__boss || self;
		if (_needWrapPreventDefault) {
			insertWrapPreventDefaultHandler(boss, type, false);
		}
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
	* @method
	* @param type 事件名
	* @param func 事件回调
	* @param cap 冒泡
	*/
	this.removeEvent = document.removeEventListener? function(self, type, func, cap) {
		var boss = self.__boss || self;

		if (!ua.ua.ie && type == 'mouseleave') {
			type = 'mouseout';
			if (self.__eventListeners && self.__eventListeners[type]) {
				var funcs = self.__eventListeners[type];
				for (var i = 0, current, l = funcs.length; i < l; i++) {
					current = funcs[i];
					if (current.innerFunc === func) {
						boss.removeEventListener(type, current, cap);
						funcs.splice(i, 1);
						break;
					}
				}
			}
		} else {
			boss.removeEventListener(type, func, cap);
		}
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
	* obj.fireEvent('name', {
	* data: 'value'
	* });
	* @method
	* @param type 事件名
	* @param eventData 扩展到event对象上的数据
	*/
	this.fireEvent = document.dispatchEvent? function(self, type, eventData) {
		if (!ua.ua.ie && type == 'mouseleave') {
			type = 'mouseout';
		}
		//fireEvent之前仍然需要检查onxxx类型的事件处理函数
		addOnHandlerAsEventListener(self, type);
		var boss = self.__boss || self;

		var event = document.createEvent('Event');
		event.initEvent(type, false, true);
		object.extend(event, eventData);

		exports.wrapPreventDefault(event);

		// 火狐下通过dispatchEvent触发事件，在事件监听函数中抛出的异常都不会在控制台给出
		// see https://bugzilla.mozilla.org/show_bug.cgi?id=503244
		boss.dispatchEvent(event);
		return event;
	} : function(self, type, eventData) {
		if (!eventData) eventData = {};

		// 如果是DOM节点的标准事件，并且该事件能够在节点上由浏览器触发，则由浏览器处理onxxx类型的事件处理函数即可
		// see http://js8.in/731.html
		if (self.nodeType == 1 && isNativeEventForNode(self, type)) {
			var event = exports.wrapEvent(document.createEventObject());
			object.extend(event, eventData);

			// 判断节点是否是加入DOM树的节点
			if (isNodeInDOMTree(self)) {
				// 如果节点在放入DOM树之前调用过addEvent，则标准事件的处理函数onxxx将会被备份
				// 如果在备份之后，将节点插入DOM树，此时标准事件会自动调用onxxx，而onxxx已经备份过一次了
				// 所以在fireEvent之前，需要先检查一下列表中是否已经添加过onxxx的备份，如果添加过，需要删除
				var onhandlerBak = self['__on' + type];
				var funcs = self.__eventListeners[type];
				if (onhandlerBak && funcs) {
					for (var i = 0, l = funcs.length; i < l; i++) {
						if (funcs[i] == onhandlerBak) {
							funcs.splice(i, 1);
							break;
						}
					}
					self['__on' + type] = null;
				}

				if (self._oldFireEventInIE) {
					self._oldFireEventInIE('on' + type, event);
					return event;
				} else {
					if (typeof console != 'undefined') {
						console.warn('请使用dom.wrap方法包装对象以添加事件处理函数');
					}
				}
			}
		}

		attachOnHandlerAsEventListener(self, type);
		var event = exports.wrapEvent(eventData);

		var funcs = self.__eventListeners[type];
		if (funcs) {
			funcs = funcs.slice(0);
			for (var i = 0, j = funcs.length; i < j; i++) {
				if (funcs[i]) {
					try {
						funcs[i].call(self, event, true);
					} catch(e) {
					}
				}
			}
			funcs = null;
		}

		var natives = self.__nativeEvents[type];
		if (natives) {
			natives = natives.slice(0);
			natives.forEach(function(func) {
				func.call(self, event);
			});
			natives = null;
		}

		return event;
	};
});

});
