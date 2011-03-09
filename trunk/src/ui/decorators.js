/**
 * @namespace
 * @name ui.decorators
 */
object.add('ui.decorators', /**@lends ui.decorators*/ function(exports, string, dom) {

	/**
	 * fireevent 或 fireevent(eventName)
	 * fireevent 默认eventName通过__name__获得
	 */
	this.fireevent = function(func) {
		// 自定义了事件名称，返回一个decorator
		if (typeof func == 'string') {
			var name = func;
			return function(func) {
				var result = function(self) {
					var handleName = 'on' + name;
					if (self[handleName]) self[handleName]();
					self._node.fireEvent(name, null, self);
					func.apply(this, arguments);
				};
				return result;
			};
		} else {
			return function(self) {
				var name = arguments.callee.__name__;
				var handleName = 'on' + name;
				if (self[handleName]) self[handleName]();
				self._node.fireEvent(name, null, self);
				func.apply(this, arguments);
			};
		}
	};

});
