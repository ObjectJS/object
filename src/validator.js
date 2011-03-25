/**
 * @namespace
 * @name validator
 */
object.add('validator', /**@lends validator*/ function(exports) {

this.isUrl = function(text) {
	return /^(?:(\w+?)\:\/\/([\w-_.]+(?::\d+)?))(.*?)?(?:;(.*?))?(?:\?(.*?))?(?:\#(\w*))?$/i.test(text);
};

this.isEmail = function(text) {
	return /^\w+([-+.]\w+)*@\w+([-.]\w+)*\.\w+([-.]\w+)*$/i.test(text);
};

this.isIP = function(text) {
	return /^(0|[1-9]\d?|[0-1]\d{2}|2[0-4]\d|25[0-5]).(0|[1-9]\d?|[0-1]\d{2}|2[0-4]\d|25[0-5]).(0|[1-9]\d?|[0-1]\d{2}|2[0-4]\d|25[0-5]).(0|[1-9]\d?|[0-1]\d{2}|2[0-4]\d|25[0-5])$/.i.test(text);
}

});
