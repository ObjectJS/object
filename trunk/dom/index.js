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

/**
 * native node进行包装
 * @param ele
 */
this.wrap = function(ele) {
	if (ele) Element.wrap(ele);
	return ele || null;
};

this.getElements = function() {
	var eles = Sizzle.apply(null, arguments);
	for (var i = 0; i < eles.length; i++) {
		eles[i] = Element.wrap(eles[i]);
	}
	return eles;
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
 * 一个包装类，实现被包装类型的统一调用
 * @class Elements
 */
var Elements = this.Elements = new Class(Array, function() {

	/**
	 * @constructor
	 * @param elements native dom elements
	 * @param cls 包装类型
	 */
	this.__init__  = function(self, elements, cls) {
		self.length = 0;
		if (cls === undefined) cls = Element;

		for (var name in cls) {
			self[name] = (function(name) {
				return function() {
					for (var i = 0; i < this.length; i++) {
						var ele = this[i] = cls.wrap(this[i]);
						var args = [].slice.call(arguments, 0);
						args.unshift(ele);
						cls[name].apply(ele, args);
					}
				};
			})(name);
		}

		for (var i = 0; i < elements.length; i++) self.push(cls.wrap(elements[i]));
	};

});

/**
 * @class Element
 */
var Element = this.Element = new Class(attribute.Attribute, function() {

	// 检测浏览器是否支持通过innerHTML设置未知标签，典型的就是IE不支持
	var t = document.createElement('div');
	t.innerHTML = '<TEST_TAG></TEST_TAG>';
	// IE 下无法获取到自定义的Element，其他浏览器会得到HTMLUnknownElement
	var __needGetDom = t.firstChild === null;
	this._eventListeners = {};

	this.__init__ = function(self) {
		attribute.Attribute.__init__(self);
		self._eventListeners = {};

		if (self.classList === undefined && self !== document && self !== window) {
			self.classList = new ElementClassList(self);
		}
	};

	this.retrieve = function(self, property, dflt){
		var storage = get(self.uid), prop = storage[property];
		if (dflt != null && prop == null) prop = storage[property] = dflt;
		return prop != null ? prop : null;
	};

	this.store = function(self, property, value){
		var storage = get(self.uid);
		storage[property] = value;
		return self;
	};

	/**
	 * @param type 事件名
	 * @param func 事件回调
	 * @param cap 冒泡
	 */
	this.addEvent = function(self, type, func, cap) {
		if (cap === null) cap = false;

		// 存储此元素的事件
		if (!self._eventListeners[type]) self._eventListeners[type] = [];
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
		if (__needGetDom) {
			self.innerHTML = '';
			var nodes = self.getDom(str);
			while (nodes.firstChild) self.appendChild(nodes.firstChild);
		} else {
			self.innerHTML = str;
		}
	};

	/**
	 */
	this.setContent = this.setHTML;

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

	/**
	 * 根据选择器返回第一个
	 * @param selector css选择符
	 */
	this.getElement = function(self, selector) {
		return Element.wrap(Sizzle(selector, self)[0]);
	};

	/**
	 * 根据选择器返回数组
	 * @param selector css选择符
	 * @param native 关闭wrap，返回原始Node
	 * @param cls 包装类型
	 */
	this.getElements = function(self, selector, cls) {
		var eles = Sizzle(selector, self);
		return new Elements(eles, cls);
	};

	this.hide = function(self) {
		if (self.style.display !== 'none') self.oldDisplay = self.style.display;
		self.style.display = 'none';
	};

	this.show = function(self) {
		self.style.display = self.oldDisplay || '';
	};

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

	this.send = function(self, params) {
		var xhr = self.retrieve('send');
		if (!xhr.method) xhr.method = self.method;
		if (!xhr.url) xhr.url = self.action;
		xhr.send(params);
	};

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

	/**
	 * 将字符串转换成dom
	 * for IE
	 * @staticmethod
	 */
	this.getDom = staticmethod(function(str) {
		var tmp = document.createElement('div');
		tmp.style.display = 'none';
		document.body.appendChild(tmp);

		tmp.innerHTML = str;
		var ele = document.createElement('div');
		while (tmp.firstChild) ele.appendChild(tmp.firstChild);
		tmp.parentNode.removeChild(tmp);
		return ele;
	});

	/**
	 * ele有可能已经wrap过，要注意不要重新覆盖老的成员
	 * 提供了包装机制不代表同一个元素可以进行多重包装，在相同的继承树上多次包装没有问题，如果将两个无关的类型包装至同一元素，则第一次包装失效
	 * 比如 TabControl.wrap(ele) 后进行 List.wrap(ele) ，ele将不再具备 TabControl 的功能
	 * 而 TabControl.wrap(ele) 后进行 Element.wrap(ele) 由于TabControl继承于Element，则包装成功
	 * @classmethod
	 */
	this.wrap = classmethod(function(cls, ele) {
		if (!ele) return null;

		$uid(ele);

		// 判断已经包装过的对象取消包装
		// 1 包装为现有包装的子类的，比如先包装 TabControl 再包装 Element
		// 2 重复包装相同类的
		if (ele.wrapper) {
			if (ele.wrapper === cls) return ele;

			// 获取cls的所有继承关系，存成平面数组
			var allBases = (function(m) {
				var array = [];
				for (var i = 0, l = m.length; i < l; i++){
					array = array.concat((m[i].__bases__ && m[i].__bases__.length) ? arguments.callee(m[i].__bases__) : m);
				}
				return array;
			})([ele.wrapper]);

			// 已包装过
			if (allBases.indexOf(cls) !== -1) return ele;
		}

		// 对于classmethod，不做重新绑定
		// 1是classmethod可以动态获取当前类，不需要重新绑定
		// 2是IE下会报“无法得到xxx属性，参数无效”的错误
		for (var i in cls.prototype) {
			if (cls.prototype[i].im_func === undefined) ele[i] = cls.prototype[i];
		}
		cls.__init__(ele);

		ele.wrapper = cls;
		return ele;
	});

});

/**
 * bind一个input或者textarea，使其支持placeholder属性
 */
this.bindPlaceholder = function(input) {

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
	if ($.wrap(input.form)) {
		input.form.addEvent('submit', function() {
			if (input.classList.contains('placeholder')) {
				input.value = '';
			}
		});
	}
	checkEmpty(input);
};

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

});

