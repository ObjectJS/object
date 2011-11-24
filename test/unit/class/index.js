$(document).ready(function() {
	var path = $UNIT_TEST_CONFIG.needPath ? 'class/' : '';
	$LAB
		.script(path + 'class-basic.js').wait()
		.script(path + 'class-usage.js').wait()
		.script(path + 'mixin-basic.js').wait()
		.script(path + 'mixin-usage.js').wait()
		.script(path + 'metaclass.js').wait()
		.script(path + 'parent.js').wait()
		.script(path + 'prototype.js').wait()
});
