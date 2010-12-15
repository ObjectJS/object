object.add('dom', 'ua, attribute, sys', function($, ua, attribute, sys) {

var UID = 1;
var storage = {};

var get = function(uid) {
	return (storage[uid] || (storage[uid] = {}));
};

var $uid = this.$uid = (window.ActiveXObject) ? function(item){
	return (item.uid || (item.uid = [UID++]))[0];
} : function(item){
	return item.uid || (item.uid = UID++);
};

$uid(window);
$uid(document);

var domLoaded = false;
var domloadHooks = [];

function runHooks() {
	if (!domloadHooks) return;

	domloadHooks.forEach(function(f, i) {
		try {
			f();
		} catch (e) {
			if(true) throw e;
		}
	});

	domloadHooks = [];
}

var timer = null;
if (ua.ua.webkit && ua.ua.webkit < 525) {
	timer = setInterval(function() {
		if (/loaded|complete/.test(document.readyState)) {
			domLoaded = true;
			clearInterval(timer);
			runHooks();
		}
	}, 10); 
} else if (ua.ua.ie) {
	timer = setInterval(function() {
		try {
			document.body.doScroll('left');
			clearInterval(timer);
			domLoaded = true;
			runHooks();
		} catch (e) {}
	}, 20); 
}

this.ready = function(callback) {
	if (document.body) {
		callback();
	} else {
		if (ua.ua.webkit && ua.ua.webkit < 525) {
			domLoaded = true;
			domloadHooks.push(callback);
		} if (document.addEventListener) {
			document.addEventListener('DOMContentLoaded', callback, false);
		} else {
			domLoaded = true;
			domloadHooks.push(callback);
		}
	}
};

/**
 * native node进行包装
 * @param ele
 */
var wrap = this.wrap = function(ele) {
	if (!ele) return null;

	if (Array.isArray(ele)) {
		return new Elements(ele);
	} else {
		// 已经wrap过了
		if (ele._nativeWrapper) return ele;

		var wrapper = getWrapper(ele);
		$uid(ele);
		wrapper.wrap(ele);

		ele._nativeWrapper = wrapper;
		return ele;
	}
};

var getElements = this.getElements = function() {
	var eles = Sizzle.apply(null, arguments);
	return new Elements(eles);
};

this.getElement = function() {
	var eles = Sizzle.apply(null, arguments);
	return wrap(eles[0]);
};

this.id = function(id) {
	return document.getElementById(id);
};


/**
 * eval inner js
 * 执行某个元素中的script标签
 */
var eval_inner_JS = this.eval_inner_JS = function(ele) {
	var js = [];
	if (ele.nodeType == 11) { // Fragment
		for (var i = 0; i < ele.childNodes.length; i++) {
			if (ele.childNodes[i].nodeType === 1) {
				js = js.concat(ele.childNodes[i].getElementsByTagName('script'));
			}
		}
	} else if (ele.nodeType == 1) { // Node
		js = ele.getElementsByTagName('script');
	}


	// IE下此句不生效
	// js = [].slice.call(js, 0);

	var arr = [];
	for (i = 0; i < js.length; i++) {
		arr.push(js[i]);
	}

	arr.forEach(function(s, i) {
		if (s.src) {
			// TODO
			return;
		} else {
			var inner_js = '__inner_js_out_put = [];\n';
			inner_js += s.innerHTML.replace( /document\.write/g, '__inner_js_out_put.push' );
			eval(inner_js);
			if (__inner_js_out_put.length !== 0) {
				var tmp = document.createDocumentFragment();
				$(tmp).appendHTML(__inner_js_out_put.join(''));
				s.parentNode.insertBefore(tmp, s);
			}
		}
	});
};

/**
 * html5 classList api
 * @see http://eligrey.com
 * @class ElementClassList
 */
var ElementClassList = this.ElementClassList = new Class(Array, function() {

	this.checkAndGetIndex = staticmethod(function(classes, token) {
        if (token === "") {
            throw "SYNTAX_ERR";
        }
        if (/\s/.test(token)) {
            throw "INVALID_CHARACTER_ERR";
        }
 
        return classes.indexOf(token);
	});

	this.setClasses = staticmethod(function(ele, classes) {
        ele.className = classes.join(" ");
	});

	this.__init__ = function(self, ele) {
		self.length = 0; // for Array

		var trim = /^\s+|\s+$/g;
		self._ele = ele;
        self._classes  = ele.className.replace(trim, "").split(/\s+/);
	};

	this.toggle = function(self, token) {
		if (self.checkAndGetIndex(self._classes, token) === -1) {
			self.add(token);
		} else {
			self.remove(token);
		}
	};

	this.add = function(self, token) {
		if (self.checkAndGetIndex(self._classes, token) === -1) {
			self._classes.push(token);
			self.length = self._classes.length;
			self.setClasses(self._ele, self._classes);
		}
	};

	this.remove = function(self, token) {
		var index = self.checkAndGetIndex(self._classes, token);
		if (index !== -1) {
			self._classes.splice(index, 1);
			self.length = self._classes.length;
			self.setClasses(self._ele, self._classes);
		}
	};

	this.contains = function(self, token) {
        return self.checkAndGetIndex(self._classes, token) !== -1;
	};

	this.item = function(self, i) {
        return self._classes[i] || null;
	};

	this.toString = function (self) {
		return self._ele.className;
	};

});

/**
 * @class Element
 */
var Element = this.Element = new Class(attribute.Attribute, function() {

	var _needGetDom = (function() {
		// 检测浏览器是否支持通过innerHTML设置未知标签，典型的就是IE不支持
		var t = document.createElement('div');
		t.innerHTML = '<TEST_TAG></TEST_TAG>';
		// IE 下无法获取到自定义的Element，其他浏览器会得到HTMLUnknownElement
		return (t.firstChild === null);
	})();

	this._eventListeners = {};

	this.__init__ = function(self, tagName) {

		// 直接new Element，用来生成一个新元素
		if (tagName) {
			self = document.createElement(tagName);
			wrap(self);

		// 包装现有元素
		} else {
			attribute.Attribute.__init__(self);
		}

		self._eventListeners = {};
		if (self.classList === undefined && self !== document && self !== window) {
			self.classList = new ElementClassList(self);
		}
	};

	/*
	 * 从dom读取数据
	 */
	this.retrieve = function(self, property, dflt){
		var storage = get(self.uid), prop = storage[property];
		if (dflt !== null && prop === null) prop = storage[property] = dflt;
		return prop !== null ? prop : null;
	};

	/**
	 * 存储数据至dom
	 */
	this.store = function(self, property, value){
		var storage = get(self.uid);
		storage[property] = value;
		return self;
	};

	/**
	 * 事件
	 * @param type 事件名
	 * @param func 事件回调
	 * @param cap 冒泡
	 */
	this.addEvent = function(self, type, func, cap) {
		if (cap === null) cap = false;

		// 存储此元素的事件
		if (!self._eventListeners[type]) {
			self._eventListeners[type] = [];
		}
		var funcs = self._eventListeners[type];

		// 标准浏览器
		if (self.addEventListener) {
			self.addEventListener(type, func, cap);
			funcs.push(func);
		} else {
			// 不允许两次添加同一事件
			if (funcs.some(function(f) {
				return f.innerFunc === func;
			})) return;

			// 为IE做事件包装，使回调的func的this指针指向元素本身，并支持preventDefault等
			// 包装Func，会被attachEvent
			// 包装Func存储被包装的func，detach的时候，参数是innerFunc，需要通过innerFunc找到wrapperFunc进行detach
			var wrapperFunc = function() {
				var e = self.wrapEvent(window.event);
				var args = [].slice.call(arguments, 0);
				args[0] = e;
				func.apply(self, args);
			};
			wrapperFunc.innerFunc = func;

			funcs.push(wrapperFunc);

			self.attachEvent('on' + type, wrapperFunc);
		}
	};

	this._addEvent = function(self, type, func, cap) {
		if (self.addEventListener) {
			self.addEventListener(type, func, cap);
		} else if (self.attachEvent) {
			var propertyName = '_event_' + type;
			if (self[propertyName] === undefined) {
				self[propertyName] = 0;
			}
			self.attachEvent('onpropertychange', function(event) {
				if (event.propertyName == propertyName) {
					func();
				}
			});
		}
	};

	/**
	 * @param type 事件名
	 * @param func 事件回调
	 * @param cap 冒泡
	 */
	this.removeEvent = function(self, type, func, cap) {
		var funcs = self._eventListeners[type];
		if (!funcs) return;

		// func 是 innerFunc，需要找到 wrapperFunc
		for (var i = 0, wrapperFunc; i < self._eventListeners[type].length; i++) {
			wrapperFunc = self._eventListeners[type][i];
			if (wrapperFunc === func || wrapperFunc.innerFunc === func) {
				funcs.splice(i, 1); // 将这个function删除
				break;
			}
		}

		if (self.removeEventListener) self.removeEventListener(type, func, cap);
		else self.detachEvent('on' + type, wrapperFunc);
	};

	this._removeEvent = function(self, type, func, cap) {
		if (self.removeEventListener) {
			self.removeEventListener(type, func, cap);
		} else if (self.detatchEvent) {
			// TODO
		}
	};

	/**
	 * @param type 事件名
	 */
	this.fireEvent = function(self, type) {
		if (!self._eventListeners[type]) return;
		var funcs = self._eventListeners[type];
		var args = Array.prototype.slice.call(arguments, 0);
		args.shift();
		args.shift();
		for (var i = 0, j = funcs.length; i < j; i++) {
			if (funcs[i]) {
				funcs[i].apply(self, args);
			}
		}
	};

	this._fireEvent = function(self, type) {
		if (document.createEvent) {
			var event = document.createEvent('UIEvents');
			event.initEvent(type, false, false);
			self.dispatchEvent(event);
		} else if (document.attachEvent) {
			var propertyName = '_event_' + type;
			self[propertyName]++;
		}
	};

	/**
	 * @param selector
	 * @param type
	 * @param callback
	 */
	this.delegate = function(self, selector, type, callback) {
		self.addEvent(type, function(e) {
			var ele = e.srcElement || e.target;
			do {
				if (ele && Element.matchesSelector(ele, selector)) callback.call(Element.wrap(ele), e);
			} while((ele = ele.parentNode));
		});
	};

	/**
	 * html5 matchesSelector api
	 * 检测元素是否匹配selector
	 * @param selector css选择符
	 */
	this.matchesSelector = function(self, selector) {
		return Sizzle.matches(selector, [self]).length > 0;
	};

	/**
	 * @param data name
	 * @return data value
	 */
	this.getData = function(self, name) {
		return self.getAttribute('data-' + name);
	};

	/**
	 * 通过字符串设置此元素的内容
	 * 为兼容HTML5标签，IE下无法直接使用innerHTML
	 * @param str html代码
	 */
	this.setHTML = function(self, str) {
		if (_needGetDom) {
			self.innerHTML = '';
			var nodes = self.fromString(str);
			while (nodes.firstChild) self.appendChild(nodes.firstChild);
		} else {
			self.innerHTML = str;
		}
	};

	/**
	 */
	this.setContent = this.setHTML;

	/**
	 * 根据选择器返回第一个
	 * @param selector css选择符
	 * @param cls 包装类型
	 */
	this.getElement = function(self, selector, cls) {
		var ele = Sizzle(selector, self)[0];
		if (!cls) cls = Element;
		return cls.wrap(ele);
	};

	/**
	 * 根据选择器返回数组
	 * @param selector css选择符
	 * @param cls 包装类型
	 */
	this.getElements = function(self, selector) {
		var eles = Sizzle(selector, self);
		return new Elements(eles);
	};

	var inserters = {
		before: function(context, element){
			var parent = element.parentNode;
			if (parent) parent.insertBefore(context, element);
		},
		after: function(context, element){
			var parent = element.parentNode;
			if (parent) parent.insertBefore(context, element.nextSibling);
		},
		bottom: function(context, element){
			element.appendChild(context);
		},
		top: function(context, element){
			element.insertBefore(context, element.firstChild);
		}
	};
	inserters.inside = inserters.bottom;

	this.grab = function(self, el, where) {
		inserters[where || 'bottom'](el, self);
		return self;
	};

	this.inject = function(self, el, where) {
		inserters[where || 'bottom'](self, el);
		return self;
	};

	this.getPrevious = function(expression) {
		// TODO
	};

	this.getAllPrevious = function(expression) {
		// TODO
	};

	this.getNext = function(expression) {
		// TODO
	};

	this.getAllNext = function(expression) {
		// TODO
	};

	this.getFirst = function(expression) {
		// TODO
	};

	this.getLast = function(expression) {
		// TODO
	};

	/**
	 * 查找符合selector的父元素
	 * @param selector css选择符
	 */
	this.getParent = function(self, selector) {
		if (!selector) return Element.wrap(self.parentNode);

		var element = self;
		do {
			if (Element.matchesSelector(element, selector)) return Element.wrap(element);
		} while ((element = element.parentNode));
		return null;
	};

	this.getParents = function(expression) {
		// TODO
	};

	this.getSiblings = function(expression) {
		// TODO
	};

	this.getChildren = function(expression) {
		// TODO
	};

	/**
	 * 隐藏一个元素
	 */
	this.hide = function(self) {
		if (self.style.display !== 'none') self.oldDisplay = self.style.display;
		self.style.display = 'none';
	};

	/**
	 * 显示一个元素
	 */
	this.show = function(self) {
		self.style.display = self.oldDisplay || '';
	};

	/**
	 * 切换显示
	 */
	this.toggle = function(self) {
		if (self.style.display == 'none') self.show();
		else self.hide();
	};

	// set('html')
	attribute.defineProperty(this, 'html', {
		set: function(html) {
			this.innerHTML = html;
		}
	});

	/**
	 * 将IE中的window.event包装一下
	 * @staticmethod
	 */
	this.wrapEvent = staticmethod(function(e) {

		e.target = e.srcElement;

		e.stopPropagation = function() {
			this.cancelBubble = true;
		};

		e.preventDefault = function() {
			this.returnValue = false;
		};

		e.stop = function() {
			this.stopPropagation();
			this.preventDefault();
		};

		return e;
	});

	attribute.defineProperty(this, 'tagName', {
		get: function() {
			return this.tagName.toLowerCase();
		}
	});

	/**
	 * 将字符串转换成dom
	 * @staticmethod
	 */
	this.fromString = staticmethod(function(str) {
		var tmp = document.createElement('div');
		var result = document.createDocumentFragment();

		if (_needGetDom) {
			tmp.style.display = 'none';
			document.body.appendChild(tmp);
		}

		tmp.innerHTML = str;
		while (tmp.firstChild) result.appendChild(tmp.firstChild);

		if (_needGetDom) tmp.parentNode.removeChild(tmp);

		return result;
	});

	this.wrap = classmethod(function(cls, ele) {
		if (!ele) return null;

		for (var i in cls.prototype) {
			if (cls.prototype[i].im_func === undefined) {
				ele[i] = cls.prototype[i];
			}
		}
		cls.__init__(ele);

		return ele;
	
	});

});

/**
 * 表单
 */
var FormElement = this.FormElement = new Class(Element, function() {

	this.__init__ = function(self) {
		Element.__init__(self);
	};

	// set('sendOptions')
	attribute.defineProperty(this, 'sendOptions', {
		get: function() {
			return this.retrieve('sendOptions');
		},
		set: function(options) {
			var xhr = this.retrieve('send');
			if (!xhr) {
				var net = sys.modules['net'];
				if (net) {
					xhr = new net.Request(options);
					this.store('send', xhr);
				} else {
					throw new ModuleRequiredError('net');
				}
			}
			this.store('sendOptions', options);
		}
	});

	/**
	 * 用ajax发送一个表单
	 */
	this.send = function(self, params) {
		if (!params) {
			params = self.toQueryString();
		}
		var xhr = self.retrieve('send');
		xhr.method = self.method;
		xhr.url = self.action;
		xhr.send(params);
	};

	/**
	 * 将一个表单转换成queryString
	 */
	this.toQueryString = function(self) {
		var queryString = [];
		self.getElements('input, select, textarea').forEach(function(el) {
			var type = el.type;
			if (!el.name || el.disabled || type == 'submit' || type == 'reset' || type == 'file' || type == 'image') return;

			var value = (el.tagName.toLowerCase() == 'select') ? el.getSelected().map(function(opt) {
				// IE
				return document.id(opt).get('value');
			}) : ((type == 'radio' || type == 'checkbox') && !el.checked) ? null : el.value;

			if (typeof value != 'undefined') queryString.push(encodeURIComponent(el.name) + '=' + encodeURIComponent(value));
		});
		return queryString.join('&');
	};

	this.getSelected = function(self) {
		self.selectedIndex; // Safari 3.2.1
		return new Elements(self.options.filter(function(option) {
			return option.selected;
		}));
	};

});

var FormItemElement = this.FormItemElement = new Class(Element, function() {

	this.__init__ = function(self) {
		Element.__init__(self);

		if (['input, textarea'].indexOf(self.get('tagName'))) {
			self.bindPlaceholder(self);
		}
	};

	/**
	 * bind一个input或者textarea，使其支持placeholder属性
	 */
	this.bindPlaceholder = staticmethod(function(input) {
		// 通过autocomplete=off避免浏览器记住placeholder
		function checkEmpty(input, event) {
			if (input.classList.contains("placeholder")) {
				if (event.type == "focus") {
					input.value = "";
				}
				input.classList.remove("placeholder");
				input.removeAttribute("autocomplete");

			// IE不支持autocomplete=off，刷新页面后value还是placeholder（其他浏览器为空，或者之前用户填写的值），只能通过判断是否相等来处理
			} else if (!input.value || ((ua.ua.ie == 6 || ua.ua.ie == 7) && !event && input.value == input.getAttribute("placeholder"))) {
				input.classList.add("placeholder");
				input.value = input.getAttribute("placeholder");
				input.setAttribute("autocomplete", "off");
			}
		}
		input.addEvent("focus", function(event) {
			return checkEmpty(event.target, event);
		});
		input.addEvent("blur", function(event) {
			return checkEmpty(event.target, event);
		});
		if (input.form) {
			wrap(input.form).addEvent('submit', function() {
				if (input.classList.contains('placeholder')) {
					input.value = '';
				}
			});
		}
		checkEmpty(input);
	});

});

/**
 * 一个包装类，实现Element方法的统一调用
 * 注意，这个包装仅仅包含Element的方法，并不包含其他扩展元素（form等）的方法
 * 但是其中的每个元素还是正确wrap的
 * 也就是说，Elements仅仅包含Element方法的统一调用，其他方法还是需要在循环中调用
 * @class Elements
 */
var Elements = this.Elements = new Class(Array, function() {

	// 所有Element相关类的方法名
	var _allMethods = (function() {
		var allMethods = [];
		[Element, FormElement, FormItemElement].forEach(function(Klass) {
			Object.keys(Klass.prototype).forEach(function(key) {
				if (typeof Klass.prototype[key] == 'function' && allMethods.indexOf(key) == -1) allMethods.push(key);
			});
		});
		return allMethods;
	})();

	/**
	 * @constructor
	 * @param elements native dom elements
	 */
	this.__init__  = function(self, elements) {
		self.length = 0;

		_allMethods.forEach(function(name) {
			self[name] = function() {
				var element;
				for (var i = 0; i < elements.length; i++) {
					element = elements[i];
					if (typeof element[name] == 'function') {
						element[name].apply(elements[i], [].slice.call(arguments, 0));
					}
				}
			};
		});

		for (var i = 0; i < elements.length; i++) {
			self.push(wrap(elements[i]));
		}
	};

});

var _tagMap = {
	'form': FormElement,
	'input': FormItemElement,
	'textarea': FormItemElement,
	'output': FormItemElement,
	'select': FormItemElement,
	'option': FormItemElement,
	'button': FormItemElement
};

// 根据ele的tagName返回他所需要的wrapper class
function getWrapper(ele) {
	var tag = ele.tagName.toLowerCase();
	var cls = _tagMap[tag];
	if (cls) return cls;
	else return Element;
}

});

