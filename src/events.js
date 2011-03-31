/**
 * @namespace
 * @name events
 */
object.add('events', /**@lends events*/ function(exports) {

/**
 * decorator
 * 使得相应方法在调用时fire出同名事件，并调用相应的 onxxx 方法
 * fireevent 或 fireevent(eventName)
 * fireevent 默认eventName通过__name__获得
 */
this.fireevent = function(funcOrName) {
	var name, func;

	// 千万别给这个function起名字，否则fire出来的事件都叫一个名字
	var firer = function(self) {
		if (!name) name = arguments.callee.__name__;

		var eventData = {};
		var handleName = 'on' + name;
		if (self[handleName]) self[handleName]();
		var event = self.fireEvent(name, eventData, self);
		var preventDefaulted = event.getPreventDefault? event.getPreventDefault() : event.defaultPrevented;
		if (!preventDefaulted) func.apply(this, arguments);
		return event;
	}

	// 自定义了事件名称，返回一个decorator
	if (typeof funcOrName == 'string') {
		name = funcOrName;
		return function(_func) {
			func = _func;
			return firer;
		};
	} else {
		func = funcOrName;
		return firer;
	}
};

// 事件
this.Events = new Class(/**@lends object.Events*/ {

	initialize : function(self) {
		self._eventListeners = {};
	},

	addEvent : function(self, type, func) {
		if (!self._eventListeners) self._eventListeners = {};

		var funcs = self._eventListeners;
		if (!funcs[type]) funcs[type] = [];
		// 不允许重复添加同一个事件
		else if (funcs[type].indexOf(func) != -1) return self;
		funcs[type].push(func);
		return null;
	},

	removeEvent : function(self, type, func) {
		if (!self._eventListeners) self._eventListeners = {};

		var funcs = self._eventListeners[type];
		if (funcs) {
			for (var i = funcs.length - 1; i >= 0; i--) {
				if (funcs[i] === func) {
					funcs.splice(i, 1);
					break;
				}
			}
		}
		return self;
	},

	fireEvent : function(self, type, eventData) {
		var triggerName = 'on' + type.toLowerCase();
		if (self[triggerName]) self[triggerName].call(self, eventData);

		if (!self._eventListeners || !self._eventListeners[type]) return;
		var funcs = self._eventListeners[type];
		for (var i = 0, j = funcs.length; i < j; i++) {
			if (funcs[i]) {
				funcs[i].call(self, eventData);
			}
		}
	}
});

});
