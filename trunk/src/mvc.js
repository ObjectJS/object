/**
 * @namespace
 * @name mvc
 */
object.add('mvc', /**@lends mvc*/ function($) {

/**
 * MVC Action 基类
 * @class
 */
var Action = this.Action = new Class(Events, function() {

	this.initialize = function(self) {
		Events.initialize(self);

		self.view = null;
	};

	this.execute = function(self, view) {
		self.view = view;
		view.load(self);
	};

});

});

