object.define('ui/addonablemeta.js', function(require, exports) {

function AddonableMeta() {
}

AddonableMeta.prototype.addTo = function(cls) {
	var meta = cls.get('meta');
	if (!meta[this.storeKey].some(this.equal, this)) {
		this.cls = meta.cls;
		meta[this.storeKey].push(this);
	}
};

AddonableMeta.prototype.addAddonTo = function(addon, meta) {
	var func;
	var fullname;
	var newName;
	var newMember;
	var oGid = addon.get('gid');

	if (!meta[this.storeKey].some(this.strictEqual, this)) {
		fullname = this.fullname;
		newName = fullname + '$' + oGid;
		func = addon.get(fullname, false).im_func;
		// 重新包装，避免名字不同导致warning
		newMember = this.decorator(newName)(function() {
			return func.apply(meta, arguments);
		});
		Type.__setattr__(meta.cls, newName, newMember);
		newMember.meta.cls = this.cls;
		// 传递重新生成的这个meta
		meta[this.storeKey].push(newMember.meta);
	}
};

AddonableMeta.prototype.strictEqual = function(other) {
	return this.equal(other) && this.cls === other.cls;
};

this.AddonableMeta = AddonableMeta;

});
