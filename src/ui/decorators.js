/**
 * @namespace
 * @name ui.decorators
 */
object.add('ui.decorators', /**@lends ui.decorators*/ function(exports) {

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
		var event = self._node.fireEvent(name, eventData, self);
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

});
