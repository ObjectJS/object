window.oneFileManyModules_load_times += 1;
object.add('module1', function(exports) {
	exports.a = 1;
});
object.add('module2', function(exports) {
	exports.b = 1;
});
object.add('module3', function(exports) {
	exports.c = 1;
});
