object.add('mvc', 'events', /**@lends mvc*/ function(exports, events) {


/**
 * MVC Action 基类
 * @class
 */
var Action = this.Action = new Class(events.Events, function() {

	this.initialize = function(self) {
		events.Events.initialize(self);

		self.view = null;
	};

	this.execute = function(self, view) {
		self.view = view;
		view.load(self);
	};

});

});

