object.define('ui/metas/submethod.js', '../addonablemeta', function(require, exports) {

var addonablemeta = require('../addonablemeta');

var emptyDecorator = function(func) {
	return null;
};

/**
 * 定义一个向子元素注册事件的方法
 * @decorator
 * @param name 一个函数名字
 */
this.submethod = function(name) {
	// 名子要匹配带有$后缀
	var match = name.match(/^([a-zA-Z1-9]+)_([a-zA-Z1-9]+)([\$0-9]*)$/);
	if (!match) {
		// 名字不匹配，返回的decorator返回空
		return emptyDecorator;
	}
	var sub = match[1];
	var eventType = match[2];
	// 后面带的无用的东西，只是用来区分addon的
	var surfix = match[3];
	return function(func) {
		func.meta = new SubMethodMeta(sub, eventType, name);
		return func;
	};
};

function SubMethodMeta(sub1, sub2, fullname) {
	this.sub1 = sub1;
	this.sub2 = sub2;
	this.fullname = fullname;
}

SubMethodMeta.prototype = new addonablemeta.AddonableMeta();

SubMethodMeta.prototype.constructor = SubMethodMeta;

SubMethodMeta.prototype.storeKey = 'subMethods';

SubMethodMeta.prototype.decorator = exports.submethod;

SubMethodMeta.prototype.equal = function(other) {
	return this.sub1 == other.sub1 && this.sub2 == other.sub2;
};

SubMethodMeta.prototype.init = function(self, name) {
	var sub1 = this.sub1;
	// 记录下来，render时从__subMethodsMap获取信息
	if (!self.__subMethodsMap[sub1]) {
		self.__subMethodsMap[sub1] = [];
	}
	self.__subMethodsMap[sub1].push(this);
};

});
