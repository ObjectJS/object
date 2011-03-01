/**
 * @namespace
 * @name events
 */
object.add('events', /**@lends events*/ function(exports) {

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

	fireEvent : function(self, type) {
		if (!self._eventListeners || !self._eventListeners[type]) return;

		var funcs = self._eventListeners[type];
		for (var i = 0, j = funcs.length; i < j; i++) {
			if (funcs[i]) {
				funcs[i].apply(self, Array.prototype.slice.call(arguments, 2));
			}
		}
	}
});

});
