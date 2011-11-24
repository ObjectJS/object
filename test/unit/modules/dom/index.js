$(document).ready(function() {
	var path = $LAB.needPath ? 'modules/dom/' : '';
	$LAB
	   .script(path + "../../../../src/dom/index.js").wait()
	   .script(path + "dom-basic.js").wait()
	   .script(path + "dom-usage.js").wait()
	   .script(path + "dom-ready.js").wait()
});
