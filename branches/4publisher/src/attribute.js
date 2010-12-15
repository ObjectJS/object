object.add('attribute', function() {

this.defineProperty = function(object, prop, descriptor) {
	if (!object._properties) object._properties = {};
	object._properties[prop] = descriptor;
};

this.defineProperties = function(object, descriptors) {
	for (var prop in descriptors) {
		if (descriptors.hasOwnProperty(prop)) {
			object._properties[prop] = descriptors[prop];
		}
	}
};

this.Attribute = new Class(function() {
	
	this.__init__ = function(self) {
	};

	this.set = function(self, prop, value) {
		var property = self._properties[prop];
		if (property && property.set) {
			property.set.call(self, value);
		} else {
			throw 'set not definedProperty ' + prop;
		}
	};

	this.get = function(self, prop, value) {
		var property = self._properties[prop];
		if (property && property.get) {
			return property.get.apply(self);
		} else {
			throw 'get not definedProperty ' + prop;
		}
	};

});

});
