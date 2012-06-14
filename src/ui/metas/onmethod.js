object.define('ui/metas/onmethod.js', '../addonablemeta', function(require, exports) {

var addonablemeta = require('../addonablemeta');

var emptyDecorator = function(func) {
	return null;
};

/**
 * 定义一个扩展向宿主元素定义事件的方法
 * @decorator
 */
this.onmethod = function(name) {
	// 名子要匹配带有$后缀
	var match = name.match(/^on([a-zA-Z1-9]+)([\$0-9]*)$/);
	if (!match) {
		// 名字不匹配，返回的decorator返回空
		return emptyDecorator;
	}
	var eventType = match[1];
	// 后面带的无用的东西，只是用来区分addon的
	var surfix = match[2];
	eventType = eventType.slice(0, 1).toLowerCase() + eventType.slice(1);
	return function(func) {
		func.meta = new OnMethodMeta(eventType, name);
		return func;
	};
};

function OnMethodMeta(eventType, fullname) {
	this.eventType = eventType;
	this.fullname = fullname;
}

OnMethodMeta.prototype = new addonablemeta.AddonableMeta();

OnMethodMeta.prototype.constructor = OnMethodMeta;

OnMethodMeta.prototype.storeKey = 'onMethods';

OnMethodMeta.prototype.decorator = exports.onmethod;

OnMethodMeta.prototype.equal = function(other) {
	return this.eventType == other.eventType;
};

OnMethodMeta.prototype.bindEvents = function(self) {
	var eventType = this.eventType;
	var methodName = this.fullname;

	self.addEventTo(self, eventType, function(event) {
		var args = [event];
		//将event._args pass 到函数后面
		if (event._args) {
			args = args.concat(event._args);
		}
		self[methodName].apply(self, args);
	});
};

});

