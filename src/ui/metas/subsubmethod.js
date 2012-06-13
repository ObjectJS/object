object.define('ui/metas/subsubmethod.js', '../addonablemeta', function(require, exports) {

var addonablemeta = require('../addonablemeta');

var emptyDecorator = function(func) {
	return null;
};

this.subsubmethod = function(name) {
	// 名子要匹配带有$后缀
	var match = name.match(/^([a-zA-Z1-9]+)_([a-zA-Z1-9]+)_([a-zA-Z1-9]+)([\$0-9]*)$/);
	if (!match) {
		// 名字不匹配，返回的decorator返回空
		return emptyDecorator;
	}
	var sub = match[1];
	var methodName = match[2];
	var aopType = match[3];
	// 后面带的无用的东西，只是用来区分addon的
	var surfix = match[4];
	return function(func) {
		func.meta = new SubSubMethodMeta(sub, methodName, aopType, name);
		return func;
	};
};

function SubSubMethodMeta(sub1, sub2, sub3, fullname) {
	this.sub1 = sub1;
	this.sub2 = sub2;
	this.sub3 = sub3;
	this.fullname = fullname;
}

SubSubMethodMeta.prototype = new addonablemeta.AddonableMeta();

SubSubMethodMeta.prototype.constructor = SubSubMethodMeta;

SubSubMethodMeta.prototype.storeKey = 'subSubMethods';

SubSubMethodMeta.prototype.decorator = exports.subsubmethod;

SubSubMethodMeta.prototype.equal = function(other) {
	return this.sub1 == other.sub1 && this.sub2 == other.sub2 && this.sub3 == other.sub3;
};

SubSubMethodMeta.prototype.init = function(self, name) {
	var sub1 = this.sub1;
	// 记录下来，render时从__subSubMethodsMap获取信息
	if (!self.__subSubMethodsMap[sub1]) {
		self.__subSubMethodsMap[sub1] = [];
	}
	self.__subSubMethodsMap[sub1].push(this);
};

});
