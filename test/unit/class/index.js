$(document).ready(function() {
	var path = $LAB.needPath ? 'class/' : '';
	$LAB
		.script(path + 'class-test.js').wait()
		.script(path + 'mixin-basic.js').wait()
		.script(path + 'mixin-usage.js').wait()
		.script(path + 'metaclass.js').wait()
});
