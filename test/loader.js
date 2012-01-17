object.add('ttt.a', 'sys', function(exports, sys){
});
object.add('ttt.b', function(exports) {});

object.use('ttt.a, ttt.b, sys', function(ttt, sys){
});

