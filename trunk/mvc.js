object.add('mvc', function($) {

/**
 * MVC Action 基类
 * @class
 */
var Action = this.Action = new Class(Events, function() {

	this.__init__ = function(self) {
		Events.__init__(self);

		self.view = null;
	};

	this.execute = function(self, view) {
		self.view = view;
		view.load(self);
	};

});

});

