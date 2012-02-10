object.add('/root/mvc.js', 'events', function(exports, events) {


/**
 * MVC Action 基类
 * @class
 */
this.Action = new Class(events.Events, function() {

	/**
	 * initialize
	 */
	this.initialize = function(self) {
		events.Events.initialize(self);

		self.view = null;
	};

	/**
	 * execute
	 */
	this.execute = function(self, view) {
		self.view = view;
		view.load(self);
	};

});

});

