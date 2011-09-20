/**
 * @namespace
 * @name dom
 */
object.add('dom', 'ua, events, string, sys', /**@lends dom*/ function(exports, ua, events, string, sys) {

window.UID = 1;
var storage = {};

var get = function(uid) {
	return (storage[uid] || (storage[uid] = {}));
};

var $uid = this.$uid = (window.ActiveXObject) ? function(item){
	return (item.uid || (item.uid = [window.UID++]))[0];
} : function(item){
	return item.uid || (item.uid = window.UID++);
};

$uid(window);
$uid(document);

function runHooks() {
	window.__domloadHooks.forEach(function(f, i) {
		try {
			f();
		} catch (e) {
			if (XN && XN.DEBUG_MODE) throw e;
		}
	});
	window.__domloadHooks = [];
}

if (!window.__domloadHooks) {
	window.__domloadHooks = [];

	var timer = null;
	if (ua.ua.webkit && ua.ua.webkit < 525) {
		timer = setInterval(function() {
			if (/loaded|complete/.test(document.readyState)) {
				clearInterval(timer);
				runHooks();
			}
		}, 10); 
	} else if (ua.ua.ie) {
		timer = setInterval(function() {
			try {
				document.body.doScroll('left');
				clearInterval(timer);
				runHooks();
			} catch (e) {}
		}, 20); 
	}
}

/**
 * 在dom加载完毕后执行callback。
 * 不同于 DOMContentLoaded 事件，如果 dom.ready 是在页面已经加载完毕后调用的，同样会执行。
 * 用此方法限制需要执行的函数一定会在页面结构加载完毕后执行。
 * @param callback 需要执行的callback函数
 */
this.ready = function(callback) {
	if (document.body) {
		callback();
	} else {
		if ((ua.ua.webkit && ua.ua.webkit < 525) || !document.addEventListener) {
			window.__domloadHooks.push(callback);
		} else if (document.addEventListener) {
			document.addEventListener('DOMContentLoaded', callback, false);
		}
	}
};

/**
 * 包装一个元素，使其拥有相应的Element包装成员
 * 比如 div 会使用 Element 进行包装
 * form 会使用 FormElement 进行包装
 * input / select 等会使用 FormItemElement 进行包装
 * 包装后的节点成员请参照相应的包装类成员
 * @function
 * @name dom.wrap
 * @param node 一个原生节点
 */
var wrap = this.wrap = function(node) {
	if (!node) return null;

	if (Array.isArray(node)) {
		return new Elements(node);
	} else {
		// 已经wrap过了
		if (node._wrapped) return node;

		var wrapper;
		if (node === window) {
			wrapper = Window;
		} else if (node === window.document) {
			wrapper = Document;
		} else if (node.nodeType === 1) {
			wrapper = getWrapper(node.tagName);
		} else {
			return node;
		}

		// 尽早的设置_wrapped，因为在wrapper的initialize中可能出现递归调用（FormElement/FormItemElement）
		node._wrapped = true;

		$uid(node);

		Class.inject(wrapper, node);

		return node;
	}
};

/**
 * 通过selector获取context作用域下的节点集合
 * dom.Elements包装后的节点数组拥有相应最小Element的统一调用方法
 * 比如 forms = dom.getElements('form'); 'send' in forms // true
 * @function
 * @name dom.getElements
 * @param selector 一个css selector
 * @param context 一个节点
 * @returns {dom.Elements}
 */
var getElements = this.getElements = function(selector, context) {
	if (!context) context = document;

	// 解析成Slick Selector对象
	var parsed = Slick.parse(selector);

	// Slick在面对自定义标签时各种不靠谱，换用sizzle
	var eles = Sizzle(selector, context);

	// 这里通过分析selector的最后一个部分的tagName，来确定这批eles的wrapper
	// 例如selector是 div form.xxx 则wrapper是 FormElement
	// 例如selector是 div .xxx 则wrapper是 Element
	// 例如selector是 div select.xxx, div.input.xxx 则wrapper是 FormItemElement

	var wrapper, part;
	// 绝大部分情况都是length=0，只有1个selector，保证其性能
	if (parsed.expressions.length == 1) {
		part = parsed.expressions[0];
		wrapper = getWrapper(part[part.length - 1].tag);

	// 由多个selector组成，比如 div select.xxx, div.input.xxx，要保证这种能取到 FormItemElement
	} else {
		// 通过生成每个selector wrapper的继承链，不断的生成当前selector和上一个selector的继承链的相同部分
		// 最后的chain的最后一个元素，既是公用wrapper
		for (var i = 0, chain, previousChain; i < parsed.expressions.length; i++) {
			part = parsed.expressions[i];
			wrapper = getWrapper(part[part.length - 1].tag);

			// 当前selector最后元素的wrapper chain
			// slice(0, -1) 过滤掉Element继承的 Attribute 类
			chain = Class.getChain(wrapper).slice(0, -1).reverse();
			if (previousChain) {
				chain = getCommon(chain, previousChain);
			}
			// 如果相同部分length=1，则代表找到Element类了，可以停止继续搜索
			if (chain.length == 1) break;
			previousChain = chain;
		}
		wrapper = chain[chain.length - 1];
	}

	return new Elements(eles, wrapper);
};

/**
 * 通过selector获取context作用域下的第一个节点
 * @function
 * @name dom.getElement
 * @param selector 一个css selector
 * @param context 一个节点
 * @returns 一个包装后的结点
 */
var getElement = this.getElement = function(selector, context) {
	if (!context) context = document;

	var ele = Sizzle(selector, context)[0];
	ele = wrap(ele);
	return ele;
};

/**
 * document.getElementById 的简单调用
 * @param id id
 */
this.id = function(id) {
	return exports.wrap(document.getElementById(id));
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
	
var _needGetDom = (function() {
	// 检测浏览器是否支持通过innerHTML设置未知标签，典型的就是IE不支持
	var t = document.createElement('div');
	t.innerHTML = '<TEST_TAG></TEST_TAG>';
	// IE 下无法获取到自定义的Element，其他浏览器会得到HTMLUnknownElement
	return (t.firstChild === null);
})();

/**
 * 通过一个字符串创建一个Fragment
 * @function
 * @static
 * @name dom.Element.getDom
 */
this.getDom = function(str) {
	var tmp = document.createElement('div');
	var result = document.createDocumentFragment();

	if (_needGetDom) {
		tmp.style.display = 'none';
		document.body.appendChild(tmp);
	}

	tmp.innerHTML = str;
	while (tmp.firstChild) {
		result.appendChild(wrap(tmp.firstChild));
	}

	if (_needGetDom) tmp.parentNode.removeChild(tmp);

	return result;
};

/**
 * html5 classList api
 * @class
 * @name dom.ElementClassList
 * @extends Array
 */
var ElementClassList = this.ElementClassList = new Class(Array, /**@lends dom.ElementClassList*/ function() {

	this.initialize = function(self, ele) {
		self.length = 0; // for Array

		self._ele = ele;
		self._loadClasses();
	};

	this._loadClasses = function(self) {
    	self._classes  = self._ele.className.replace(/^\s+|\s+$/g, '').split(/\s+/);
	};

	this.toggle = function(self, token) {
		if (self.contains(token)) self.remove(token);
		else self.add(token);
	};

	this.add = function(self, token) {
		if (!self.contains(token)) self._ele.className += (' ' + token); // 根据规范，不允许重复添加
	};

	this.remove = function(self, token) {
		self._ele.className = self._ele.className.replace(new RegExp(token, 'i'), '');
	};

	this.contains = function(self, token) {
		self._loadClasses();
		if (self._classes.indexOf(token) != -1) return true;
		else return false;
	};

	this.item = function(self, i) {
		return self._classes[i] || null;
	};

	this.toString = function (self) {
		return self._ele.className;
	};

});

/**
 * @class
 * @name dom.Element
 */
var Element = this.Element = new Class(/**@lends dom.Element*/ function() {

	Class.mixin(this, events.Events);

	this.initialize = function(self, tagName) {

		// 直接new Element，用来生成一个新元素
		if (tagName) {
			self = document.createElement(tagName);
			wrap(self);

		// 包装现有元素
		} else {
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
	 * 事件代理
	 * @param self
	 * @param selector 需要被代理的子元素selector
	 * @param type 事件名称
	 * @param callback 事件回调
	 */
	this.delegate = function(self, selector, type, callback) {
		self.addEvent(type, function(e) {
			var ele = e.srcElement || e.target;
			do {
				if (ele && Element.get('matchesSelector')(ele, selector)) callback.call(wrap(ele), e);
			} while((ele = ele.parentNode));
		});
	};

	/**
	 * html5 matchesSelector api
	 * 检测元素是否匹配selector
	 * @param self
	 * @param selector css选择符
	 */
	this.matchesSelector = function(self, selector) {
		return Sizzle.matches(selector, [self]).length > 0;
	};

	/**
	 * 获取元素上通过 data- 前缀定义的属性值
	 * @param self
	 * @param data name
	 * @return data value
	 */
	this.getData = function(self, name) {
		return self.getAttribute('data-' + name);
	};

	/**
	 * 设置元素的innerHTML
	 * @param self
	 * @param str html代码
	 */
	this.setHTML = function(self, str) {
		self.set('innerHTML', str);
	};

	/**
	 * @function
	 * @name dom.Element#setContent
	 * @borrows dom.Element.setHTML
	 */
	this.setContent = this.setHTML;

	/**
	 * 根据选择器返回第一个符合selector的元素
	 * @param self
	 * @param selector css选择符
	 */
	this.getElement = function(self, selector) {
		return getElement(selector, self);
	};

	/**
	 * 根据选择器返回数组
	 * @param self
	 * @param selector css选择符
	 */
	this.getElements = function(self, selector) {
		return getElements(selector, self);
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

	/**
	 * @param self
	 * @param el 被添加的元素
	 * @param where {'bottom'|'top'|'after'|'before'} 添加的位置
	 */
	this.grab = function(self, el, where) {
		inserters[where || 'bottom'](el, self);
		return self;
	};

	/**
	 * @param self
	 * @param el 被添加的元素
	 * @param where {'bottom'|'top'|'after'|'before'} 添加的位置
	 */
	this.inject = function(self, el, where) {
		inserters[where || 'bottom'](self, el);
		return self;
	};

	this.getPrevious = function(self) {
		// TODO
	};

	this.getAllPrevious = function(self) {
		// TODO
	};

	this.getNext = function(self) {
		// TODO
	};

	this.getAllNext = function(self) {
		// TODO
	};

	this.getFirst = function(self) {
		// TODO
	};

	this.getLast = function(self) {
		// TODO
	};

	/**
	 * 查找符合selector的父元素
	 * @param selector css选择符
	 */
	this.getParent = function(self, selector) {
		if (!selector) return wrap(self.parentNode);

		var element = self;
		do {
			if (Element.get('matchesSelector')(element, selector)) return wrap(element);
		} while ((element = element.parentNode));
		return null;
	};

	this.getParents = function(self) {
		// TODO
	};

	this.getSiblings = function(self) {
		// TODO
	};

	this.getChildren = function(self) {
		// TODO
	};

	/**
	 * 添加className
	 * @param self
	 * @param name
	 */
	this.addClass = function(self, name) {
		self.classList.add(name);
	};

	/**
	 * 移除className
	 * @param self
	 * @param name
	 */
	this.removeClass = function(self, name) {
		self.classList.remove(name);
	};

	/**
	 * 切换className
	 * @param self
	 * @param name
	 */
	this.toggleClass = function(self, name) {
		self.classList.toggle(name);
	};

	/**
	 * 检查是否拥有className
	 * @param self
	 * @param name
	 */
	this.hasClass = function(self, name) {
		return self.classList.contains(name);
	};

	/**
	 * 设置inline style
	 * @param self
	 * @param property
	 * @param value
	 */
	this.setStyle = function(self, property, value) {
		switch (property){
			case 'opacity':
				return self.set('opacity', parseFloat(value));
			case 'float':
				property = floatName;
				break;
			default:
				break;
		}
		property = string.camelCase(property);
		self.style[property] = value;

		return null;
	};

	/**
	 * 移除自己
	 * @param self
	 */
	this.dispose = function(self) {
		return (self.parentNode) ? self.parentNode.removeChild(self) : self;
	};
	
	/**
	 * 隐藏一个元素
	 * @param self
	 */
	this.hide = function(self) {
		if (self.style.display !== 'none') self.oldDisplay = self.style.display;
		self.style.display = 'none';
	};

	/**
	 * 显示一个元素
	 * @param self
	 */
	this.show = function(self) {
		self.style.display = self.oldDisplay || '';
	};

	/**
	 * 切换显示
	 * @param self
	 */
	this.toggle = function(self) {
		if (self.style.display == 'none') self.show();
		else self.hide();
	};

	/**
	 * 通过字符串设置此元素的内容
	 * 为兼容HTML5标签，IE下无法直接使用innerHTML
	 */
	this.innerHTML = property(null, function(self, html) {
		if (_needGetDom) {
			var nodes = exports.getDom(html);
			self.innerHTML = '';
			while (nodes.firstChild) self.appendChild(nodes.firstChild);
		} else {
			self.innerHTML = html;
		}
	});

	/**
	 * 保证大写的tagName
	 */
	this.tagName = property(function(self) {
		return self.tagName.toUpperCase();
	});

	/**
	 * 通过一个字符串创建一个包装后的dom节点
	 * 一下元素无法被处理哦：
	 * html/head/body/meta/link/script/style
	 * @function
	 * @static
	 * @name dom.Element.fromString
	 */
	this.fromString = staticmethod(function(str) {
		var tmp = document.createElement('div');
		if (_needGetDom) {
			tmp.style.display = 'none';
			document.body.appendChild(tmp);
		}
		tmp.innerHTML = str.trim();
		var result = wrap(tmp.firstChild);
		if (_needGetDom) tmp.parentNode.removeChild(tmp);
		return result;
	});

});

this.ImageElement = new Class(Element, function() {

	var _supportNatural = 'naturalWidth' in document.createElement('img');

	function _getNaturalSize(img) {
		var style = img.runtimeStyle;
		var old = {
			w: style.width,
			h: style.height
		}; //保存原来的尺寸
		style.width = style.height = "auto"; //重写
		var w = img.width; //取得现在的尺寸
		var h = img.height;
		style.width  = old.w; //还原
		style.height = old.h;
		return {
			width: w,
			height: h
		}
	};

	this.naturalWidth = property(function(self) {
		if (_supportNatural) {
			return self.naturalWidth;
		} else {
			return _getNaturalSize(self).width;
		}
	});

	this.naturalHeight = property(function(self) {
		if (_supportNatural) {
			return self.naturalHeight;
		} else {
			return _getNaturalSize(self).height;
		}
	});

});

/**
 * 表单
 * @class
 * @name dom.FormElement
 * @extends dom.Element
 */
this.FormElement = new Class(Element, /**@lends dom.FormElement*/ function() {

	this.initialize = function(self) {
		this.parent(self);

		if (self.elements) {
			for (var i = 0; i < self.elements.length; i++) {
				wrap(self.elements[i]);
			}
		}
	};

	/**
	 * 用ajax发送一个表单
	 */
	this.send = function(self, params) {
		if (!params) {
			params = self.toQueryString();
		}
		var net = sys.modules['net'];
		if (net) {
			xhr = new net.Request({
				onsuccess: function(event) {
					self.fireEvent('requestSuccess', {request: event.request});
				},
				onerror: function(event) {
					self.fireEvent('requestError', {request: event.request});
				}
			});
		} else {
			throw new ModuleRequiredError('net');
		}
		xhr.method = self.method;
		xhr.url = self.action;
		xhr.send(params);
	};

	/**
	 * 将一个表单转换成queryString
	 */
	this.toQueryString = function(self) {
		var queryString = [];

		function addItem(name, value) {
			if (typeof value != 'undefined') queryString.push(encodeURIComponent(name) + '=' + encodeURIComponent(value));
		}

		self.getElements('input, select, textarea, output').forEach(function(el) {
			var type = el.type;
			if (!el.name || el.disabled || type == 'submit' || type == 'reset' || type == 'file' || type == 'image') return;

			if (el.tagName.toLowerCase() == 'select') {
				el.getSelected().map(function(opt) {
					// IE
					var value = wrap(opt).get('value');
					addItem(el.name, value);
				});
			} else if (type == 'radio' || type == 'checkbox') {
				if (el.checked) {
					addItem(el.name, el.get('value'));
				}
			} else {
				addItem(el.name, el.get('value'));
			}

		});
		return queryString.join('&');
	};

	this.checkValidity = function(self) {
		return self.getElements('input, select, textarea, output').every(function(el) {
			return el.checkValidity();
		});
	};

});

/**
 * textarea / input / textarea / select / option
 * @class
 * @name dom.FormItemElement
 * @extends dom.Element
 */
this.FormItemElement = new Class(Element, /**@lends dom.FormItemElement*/ function() {

	var _needBindPlaceholder = (function() {
		return !('placeholder' in document.createElement('input'));
	})();

	var _supportHTML5Forms = (function() {
		return ('checkValidity' in document.createElement('input'));
	})();

	this.initialize = function(self) {
		this.parent(self);

		if (_needBindPlaceholder && ['INPUT', 'TEXTAREA'].indexOf(self.get('tagName')) !== -1) {
			self.bindPlaceholder(self);
		}
	};

	this.selectionStart = property(function(self) {
		if (typeof self.selectionStart == 'number') {
			return self.selectionStart;

		// IE
		} else if (document.selection) {
			self.focus();

			var range = document.selection.createRange();
			var start = 0;
			if (range.parentElement() == self) {
				var range_all = document.body.createTextRange();
				range_all.moveToElementText(self);
				
				for (start = 0; range_all.compareEndPoints('StartToStart', range) < 0; start++) {
					range_all.moveStart('character', 1);
				}
				
				for (var i = 0; i <= start; i++) {
					if (self.get('value').charAt(i) == '\n') start++;
				}
			}
			return start;
		}
	});
        
	this.selectionEnd = property(function(self) {
		if (typeof self.selectionEnd == 'number') {
			return self.selectionEnd;
		}
		// IE
		else if (document.selection) {
			self.focus();

			var range = document.selection.createRange();
			var end = 0;
			if (range.parentElement() == self) {
				var range_all = document.body.createTextRange();
				range_all.moveToElementText(self);
				
				for (end = 0; range_all.compareEndPoints('StartToEnd', range) < 0; end++) {
					range_all.moveStart('character', 1);
				}
				
				for (var i = 0; i <= end; i++) {
					if (self.get('value').charAt(i) == '\n') end++;
				}
			}
			return end;
		}
	});

	// for select
	this.getSelected = function(self) {
		self.selectedIndex; // Safari 3.2.1
		var selected = [];
		for (var i = 0; i < self.options.length; i++) {
			if (self.options[i].selected) selected.push(self.options[i]);
		};
		return selected;
	};

	this.value = property(function(self) {
		// 如果是placeholder，则value为空
		if (self.classList.contains('placeholder')) return '';
		return self.value;
	}, function(self, value) {
		// 设置value的时候取消placeholder模式
		if (self.classList.contains('placeholder')) {
			self.classList.remove('placeholder');
			self.removeAttribute('autocomplete');
			self.value = '';
		}
		self.value = value;
		if (_needBindPlaceholder && !self.value && self.getAttribute('placeholder')) {
			self.classList.add('placeholder');
			self.value = self.getAttribute('placeholder');
			self.setAttribute('autocomplete', 'off');
		};
		self.checkValidity();
	});

	if (!_supportHTML5Forms) {
		/* TODO */
		// autofocus
		// willvalidate
		// formnovalidate

		this.validity = property(function(self) {
			// required pattern min max step
			// text search url tel email password
			var value = self.get('value');
			
			var validity = {
				valueMissing: self.getAttribute('required') && !value? true : false,
				typeMismatch: (function(type) {
					if (type == 'url') return !(/^\s*(?:(\w+?)\:\/\/([\w-_.]+(?::\d+)?))(.*?)?(?:;(.*?))?(?:\?(.*?))?(?:\#(\w*))?$/i).test(value);
					if (type == 'tel') return !(/[^\r\n]/i).test(value);
					if (type == 'email') return !(/^\w+([-+.]\w+)*@\w+([-.]\w+)*\.\w+([-.]\w+)*$/i).test(value);
					return false;
				})(self.getAttribute('type')),
				patternMismatch: (function() {
					var pattern = self.getAttribute('pattern');
					if (pattern) return !(new RegExp('^' + pattern + '$')).test(value);
					else return false;
				})(),
				tooLong: (function() {
					var maxlength = self.getAttribute('maxlength');
					var n = Number(maxlength);
					if (n != maxlength) return false;
					return value.length > n;
				})(),
				customError: !!self.__customValidity,
				// 以下三个 firefox 4 beta 也不支持，暂时不支持
				rangeUnderflow: false,
				rangeOverflow: false,
				stepMismatch: false
			};
			validity.valid = ['valueMissing', 'typeMismatch', 'patternMismatch', 'tooLong', 'rangeUnderflow', 'rangeOverflow', 'stepMismatch', 'customError'].every(function(name) {
				return validity[name] === false;
			});
			self.__validationMessage = (function() {
				if (validity.valid) return '';
				// Logic from webkit
				// http://www.google.com/codesearch#N6Qhr5kJSgQ/WebCore/html/ValidityState.cpp&type=cs
				// 文案通过Firefox和Chrome测试而来
				// 虽然有可能同时不满足多种验证，但是message只输出第一个
				if (validity.customError) return self.__customValidity;
				if (validity.valueMissing) return '请填写此字段。';
				if (validity.typeMismatch) return '请输入一个' + self.getAttribute('type') + '。';
				if (validity.patternMismatch) return '请匹配要求的格式。';
				if (validity.tooLong) return '请将该文本减少为 ' + self.getAttribute('maxlength') + ' 个字符或更少（您当前使用了' + self.get('value').length + '个字符）。';
				if (validity.rangeUnderflow) return '值必须大于或等于' + self.getAttribute('min') + '。';
				if (validity.rangeOverflow) return '值必须小于或等于' + self.getAttribute('max') + '。';
				if (validity.stepMismatch) return '值无效。';
			})();
			self._set('validationMessage', self.__validationMessage);

			self._set('validity', validity);
			return validity;
		});

		this.validationMessage = property(function(self) {
			self.get('validity');
			return self.__validationMessage;
		});

		this.setCustomValidity = function(self, message) {
			self.__customValidity = message;
			self.get('validity');
		};

		/**
		 * html5 forms checkValidity
		 */
		this.checkValidity = function(self) {
			self.get('validity');
			return self.validity.valid;
		};

	} else {
		this.validity = property(function(self) {
			return self.validity;
		});

		this.validationMessage = property(function(self) {
			return self.validationMessage;
		});
	}

	/**
	 * focus，并且将光标定位到指定的位置上
	 */
	this.focusToPosition = function(self, position) {
		if (position === undefined) {
			position = self.get('value').length;
		}

		if (self.setSelectionRange) {
			self.focus();
			self.setSelectionRange(self.get('value').length, position);
		} else if (self.createTextRange) {
			var range = self.createTextRange();
			range.moveStart('character', position);
			range.collapse(true);
			range.select();
			self.focus();
		} else {
			self.focus();
		}
	};

	/**
	 * bind一个input或者textarea，使其支持placeholder属性
	 */
	this.bindPlaceholder = staticmethod(function(input) {
		// 通过autocomplete=off避免浏览器记住placeholder
		function checkEmpty(input, event) {
			var placeholder = input.getAttribute('placeholder');
			if (!placeholder) return;

			if (input.classList.contains('placeholder')) {
				if (event.type == 'focus' && input.value === placeholder) {
					input.value = '';
				}
				input.classList.remove('placeholder');
				input.removeAttribute('autocomplete');

			// IE不支持autocomplete=off，刷新页面后value还是placeholder（其他浏览器为空，或者之前用户填写的值），只能通过判断是否相等来处理
			} else if (!input.value || ((ua.ua.ie == 6 || ua.ua.ie == 7) && !event && input.value == placeholder)) {
				input.classList.add('placeholder');
				input.value = placeholder;
				input.setAttribute('autocomplete', 'off');
			}
		}
		input.addEvent('focus', function(event) {
			return checkEmpty(event.target, event);
		});
		input.addEvent('blur', function(event) {
			return checkEmpty(event.target, event);
		});
		// 在IE6下，由于事件执行顺序的问题，当通过send()发送一个表单时，下面这段脚本实际上是不工作的
		// 也就是说，在send()时，input.value还是placeholder的值，导致把placeholder的值发送出去了
		// 通过在toQueryString中调用get('value')过滤掉placeholder的值
		// 完美的解决方法大概是需要接管IE6下的事件系统，工程量比较大。
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
 * @class
 * @name dom.Window
 * @extends dom.Element
 */
var Window = this.Window = new Class(Element, /**@lends dom.Window*/ function() {
});

/**
 * @class
 * @name dom.Document
 * @extends dom.Element
 */
var Document = this.Document = new Class(Element, /**@lends dom.Document*/ function() {
});

/**
 * 一个包装类，实现Element方法的统一调用
 * @class
 * @name dom.Elements
 * @extends Array
 */
var Elements = this.Elements = new Class(Array, /**@lends dom.Elements*/ function() {

	/**
	 * @param elements native dom elements
	 * @param wrapper 这批节点的共有类型，默认为Element
	 */
	this.initialize  = function(self, elements, wrapper) {
		if (!wrapper) wrapper = Element;

		for (var i = 0; i < elements.length; i++) {
			self.push(wrap(elements[i]));
		}

		Class.keys(wrapper).forEach(function(name) {
			if (typeof wrapper.get(name) != 'function') return;

			self[name] = function() {
				var element;
				for (var i = 0; i < self.length; i++) {
					element = self[i];
					if (typeof element[name] == 'function') {
						element[name].apply(self[i], [].slice.call(arguments, 0));
					}
				}
			};
		});

		self.set = function(key, value) {
			for (var i = 0; i < self.length; i++) {
				self[i].set(key, value);
			}
		};

		self.get = function(key) {
			var result = [];
			for (var i = 0; i < self.length; i++) {
				result.push(self[i].get(key));
			}
			return result;
		};
	};

});

var _tagMap = {
	'IMG': exports.ImageElement,
	'FORM': exports.FormElement,
	'INPUT': exports.FormItemElement,
	'TEXTAREA': exports.FormItemElement,
	'OUTPUT': exports.FormItemElement,
	'SELECT': exports.FormItemElement,
	'OPTION': exports.FormItemElement,
	'BUTTON': exports.FormItemElement
};

// 根据ele的tagName返回他所需要的wrapper class
function getWrapper(tagName) {
	var tag = tagName.toUpperCase();
	var cls = _tagMap[tag];
	if (cls) return cls;
	else return Element;
}

// 比较两个数组，直到同位的成员不同，返回之前的部分
// [1,2,3,4], [1,2,5,6] 返回 [1,2]
function getCommon(arr1, arr2) {
	var i;
	for (i = 0, l = arr1.length; i < l; i++) {
		if (!arr2[i] || arr2[i] !== arr1[i]) {
			break;
		}
	}
	return arr1.slice(0, i);
}

});
