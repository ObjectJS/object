object.define('ui/metas/eventmethod.js', 'events', function(require, exports) {

var events = require('events');

var emptyDecorator = function(func) {
	return null;
};

function EventMethodMeta() {
}

EventMethodMeta.prototype.addTo = function(cls, name, member) {
	Type.__setattr__(cls, name.slice(1), events.fireevent(member));
};

this.eventmethod = function(name) {
	if (name.slice(0, 1) == '_' && name.slice(0, 2) != '__' && name != '_set') {
		return function(func) {
			func.meta = new EventMethodMeta();
			return func;
		};
	} else {
		return emptyDecorator;
	}
};

});
