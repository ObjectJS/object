/**
 * @namespace
 * @name dom.event
 */
object.add('dom.event', /**@lends dom.event*/ function($) {

var Events = this.Events = new Class(function() {

	this.addEvent = function(self, name, handler) {
		if (document.addEventListener) {
			document.addEventListener(name, function() {
				handler();
			}, false);
		} else { // TODO
			// TODO
		}
	};

	this.fireEvent = function(self, name) {

		if (document.addEventListener) {
			var dispatchFakeEvent = function() {
				var fakeEvent = document.createEvent("UIEvents");
				fakeEvent.initEvent(name, false, false);
				document.dispatchEvent(fakeEvent);
			};
		} else { // MSIE
			// TODO
		}
	};

	this.removeEvent = function() {
	
	};

});

});

