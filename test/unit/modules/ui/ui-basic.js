module('basic');

test('Component wrap', function() {
	object.use('ui', function(ui) {
		var div = document.createElement('div');
		var a = new ui.Component(div);
		a.addEvent('test', function() {
			alert('test');
		});
		var b = new ui.Component(div);
		b.fireEvent('test');
	});
});
