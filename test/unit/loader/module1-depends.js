object.add('module1', 'module2', function(exports, module2) {
	exports.a = 1;
	exports.b = module2.b;
});
