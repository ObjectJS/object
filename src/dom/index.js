object.add('dom', 'ua, events, string, dom/dd, sys', function(exports, ua, events, string, dd, sys) {

window.UID = 1;
var storage = {};

var get = function(uid) {
	return (storage[uid] || (storage[uid] = {}));
};

var $uid = this.$uid = (window.ActiveXObject) ? function(item){
	if (item === undefined || item === null) return null;
	return (item.uid || (item.uid = [window.UID++]))[0];
} : function(item){
	if (item === undefined || item === null) return null;
	return item.uid || (item.uid = window.UID++);
};

$uid(window);
$uid(document);

if (!window.__domloadHooks) {
	window.__domLoaded = false;
	window.__domloadHooks = [];

	if (document.addEventListener) {
		document.addEventListener('DOMContentLoaded', function() {
			document.removeEventListener('DOMContentLoaded', arguments.callee, false);
			window.__domLoaded = true;
		}, false);
	}

	var timer = null;
	if (ua.ua.webkit && ua.ua.webkit < 525) {
		timer = setInterval(function() {
			if (/loaded|complete/.test(document.readyState)) {
				clearInterval(timer);
				window.__domLoaded = true;
				runHooks();
			}
		}, 10); 
	} else if (ua.ua.ie) {
		timer = setInterval(function() {
			try {
				document.body.doScroll('left');
				clearInterval(timer);
				window.__domLoaded = true;
				runHooks();
			} catch (e) {}
		}, 20); 
	}
}

function runHooks() {
	var callbacks = window.__domloadHooks;
	var fn;
	while (callbacks[0]) {
		try {
			fn = callbacks.shift();
			fn();
		} catch (e) {
			// TODO 去掉XN依赖
			if (XN && XN.DEBUG_MODE) throw e;
		}
	}
}

/**
 * 在dom加载完毕后执行callback。
 * 不同于 DOMContentLoaded 事件，如果 dom.ready 是在页面已经加载完毕后调用的，同样会执行。
 * 用此方法限制需要执行的函数一定会在页面结构加载完毕后执行。
 * @param callback 需要执行的callback函数
 */
this.ready = function(callback) {
	if (typeof callback != 'function') {
		return;
	}
	if (window.__domLoaded == true) {
		callback();
		return;
	}
	//处理DOMContentLoaded触发完毕再动态加载objectjs的情况
	//此时DOMContentLoaded事件已经触发完毕，为DOMContentLoaded添加的事件不触发，且此时window.__domLoaded依然为false
	//解决方案：
	//	参考jQuery的做法，判断readyState是否为complete。
	//	对于3.6以前的Firefox，不支持readyState的，这里暂时忽略
	//	http://webreflection.blogspot.com/2009/11/195-chars-to-help-lazy-loading.html
	//	https://bugzilla.mozilla.org/show_bug.cgi?id=347174
	if (document.readyState == 'complete') {
		window.__domLoaded = true;
		runHooks();
		callback();
		return;
	} 
	if ((ua.ua.webkit && ua.ua.webkit < 525) || !document.addEventListener) {
		window.__domloadHooks.push(callback);
	} else if (document.addEventListener) {
		document.addEventListener('DOMContentLoaded', callback, false);
	}	
};

/**
 * 包装一个元素，使其拥有相应的Element包装成员
 * 比如 div 会使用 Element 进行包装
 * form 会使用 FormElement 进行包装
 * input / select 等会使用 FormItemElement 进行包装
 * 包装后的节点成员请参照相应的包装类成员
 * @param node 一个原生节点
 */
var wrap = this.wrap = function(node) {
	if (!node) return null;

	if (Array.isArray(node)) {
		return new exports.Elements(node);
	} else {
		// 已经wrap过了
		if (node._wrapped) return node;
		if (ua.ua.ie && node.fireEvent) {
			node._oldFireEventInIE = node.fireEvent;
		}

		var wrapper;
		if (node === window) {
			wrapper = exports.Window;
		} else if (node === window.document) {
			wrapper = exports.Document;
		} else if (node.nodeType === 1) {
			wrapper = getWrapper(node.tagName);
		} else {
			return node;
		}

		// 尽早的设置_wrapped，因为在wrapper的initialize中可能出现递归调用（FormElement/FormItemElement）
		node._wrapped = true;

		$uid(node);

		// 为了解决子类property覆盖父类instancemethod/classmethod等的问题，需要将property同名的prototype上的属性改为undefined
		// Class.inject对node赋值时，会将undefined的值也进行赋值，而innerHTML、value等值，不能设置为undefined
		Class.inject(wrapper, node, function(dest, src, prop) {
			// dest原有的属性中，function全部覆盖，属性不覆盖已有的
			if (typeof src[prop] != 'function') {
				if (!(prop in dest)) {
					return true;
				} else {
					return false;
				}
			} else {
				return true;
			}
		});

		return node;
	}
};

/**
 * 通过selector获取context作用域下的节点集合
 * dom.Elements包装后的节点数组拥有相应最小Element的统一调用方法
 * 比如 forms = dom.getElements('form'); 'send' in forms // true
 * @param selector 一个css selector
 * @param context 一个节点
 * @returns {dom.Elements}
 */
this.getElements = function(selector, context) {
	if (!selector || typeof selector != 'string') {
		return null;
	}
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

	return new exports.Elements(eles, wrapper);
};

/**
 * 通过selector获取context作用域下的第一个节点
 * @param selector 一个css selector
 * @param context 一个节点
 * @returns 一个包装后的结点
 */
this.getElement = function(selector, context) {
	if (!selector || typeof selector != 'string') {
		return null;
	}
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
 * @param ele script元素
 */
var eval_inner_JS = this.eval_inner_JS = function(ele) {
	if (!ele) {
		return;
	}
	if (typeof ele == 'string') {
		var node = document.createElement('div');
		// <div>&nbsp;</div> is for IE
		node.innerHTML = '<div>&nbsp;</div> ' + ele;
		ele = node;
	}
	var js = [];
	if (ele.nodeType == 11) { // Fragment
		for (var i = 0, l=ele.childNodes.length, current; i < l; i++) {
			current = ele.childNodes[i];
			if (current.tagName && current.tagName.toUpperCase() == 'SCRIPT') {
				js.push(current);
			} else if (current.nodeType === 1) {
				var subScripts = current.getElementsByTagName('script');
				for(var j = 0, subLength = subScripts.length; j < subLength; j++) {
					js.push(subScripts[j]);
				}
			}
		}
	} else if (ele.nodeType == 1) { // Node
		if (ele.tagName && ele.tagName.toUpperCase() == 'SCRIPT') {
			js.push(ele);
		} else {
			js = ele.getElementsByTagName('script');
		}
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
				var div = document.createElement('div');
				div.innerHTML = __inner_js_out_put.join('');
				while(div.firstChild) {
					tmp.appendChild(div.firstChild);
				}
				s.parentNode.insertBefore(tmp, s);
			}
		}
	});
};
	
var _supportUnknownTags = (function() {
	// 检测浏览器是否支持通过innerHTML设置未知标签，典型的就是IE不支持
	var t = document.createElement('div');
	t.innerHTML = '<TEST_TAG></TEST_TAG>';
	// IE 下无法获取到自定义的Element，其他浏览器会得到HTMLUnknownElement
	return !(t.firstChild === null);
})();
// 检测在修改了表单元素的name值后是否会同步form.elements的同名成员
var _supportNamedItemSync = (function() {
	if (ua.ua.ie < 8) return false;
	return true;
})();
var _supportPlaceholder = 'placeholder' in document.createElement('input');
var _supportNaturalWH = 'naturalWidth' in document.createElement('img');
var _supportHTML5Forms = 'checkValidity' in document.createElement('input');
var _supportHidden = 'hidden' in document.createElement('div');
var _supportMultipleSubmit = 'formAction' in document.createElement('input');
// 检测一下是否支持利用selectionStart获取所选区域的光标位置
var _supportSelectionStart = 'selectionStart' in document.createElement('input');

var nativeproperty = function() {
	var prop = property(function(self) {
		return self[prop.__name__];
	}, function(self, value) {
		self._set(prop.__name__, value);
	});
	return prop;
};

var attributeproperty = function(defaultValue, attr) {
	var prop = property(function(self) {
		if (!attr) attr = prop.__name__.toLowerCase();
		var value = self.getAttribute(attr);
		return value != null? value : defaultValue;
	}, function(self, value) {
		if (!attr) attr = prop.__name__.toLowerCase();
		// Webkit 534.12中，value为null时，属性会被设置成字符串 null
		if (!value) value = '';
		self.setAttribute(attr, value);
	});
	return prop;
};

/**
 * 通过一个字符串创建一个Fragment
 * @param str html字符串
 */
this.getDom = function(str) {
	var tmp = document.createElement('div');
	var result = document.createDocumentFragment();

	if (!_supportUnknownTags) {
		tmp.style.display = 'none';
		document.body.appendChild(tmp);
	}

	tmp.innerHTML = str;
	while (tmp.firstChild) {
		result.appendChild(wrap(tmp.firstChild));
	}

	if (!_supportUnknownTags) tmp.parentNode.removeChild(tmp);

	return result;
};

/**
 * html5 classList api
 */
this.ElementClassList = new Class(Array, function() {

	this.initialize = function(self, ele) {
		self.length = 0; // for Array

		self._ele = ele;
		self._loadClasses();
	};

	this._loadClasses = function(self) {
    	self._classes  = self._ele.className.replace(/^\s+|\s+$/g, '').split(/\s+/);
	};

	/**
	 * 切换className
	 * @param token class
	 */
	this.toggle = function(self, token) {
		if (self.contains(token)) self.remove(token);
		else self.add(token);
	};

	/**
	 * 增加一个class
	 * @param token class
	 */
	this.add = function(self, token) {
		if (!self.contains(token)) {
			self._ele.className = (self._ele.className + ' ' + token).trim(); // 根据规范，不允许重复添加
			self._loadClasses();
		}
	};

	/**
	 * 删除class
	 * @param token class
	 */
	this.remove = function(self, token) {
		if (!token || typeof token != 'string') return;
		//为了避免出现classAdded中remove class的情况，增加处理
		if (!self.contains(token)) return;
		self._ele.className = self._ele.className.replace(new RegExp(token.trim(), 'i'), '').trim();
		self._loadClasses();
	};

	/**
	 * 检测是否包含该class
	 * @param token class
	 */
	this.contains = function(self, token) {
		if (self._classes.indexOf(token) != -1) return true;
		else return false;
	};

	/**
	 * 返回此下标的class
	 * @param {int} i 下标
	 */
	this.item = function(self, i) {
		return self._classes[i] || null;
	};

	this.toString = function (self) {
		return self._ele.className;
	};

});

/**
 * 每一个待封装DOM元素都包含的事件
 */
var basicNativeEventNames = ['click', 'dblclick', 'mouseup', 'mousedown', 'contextmenu',
		'mouseover', 'mouseout', 'mousemove', 'selectstart', 'selectend', 'keydown', 'keypress', 'keyup']
/**
 * 普通元素的包装
 */
this.Element = new Class(function() {

	Class.mixin(this, events.Events);
	Class.mixin(this, dd.DragDrop);

	this.nativeEventNames = basicNativeEventNames;

	this.initialize = function(self, tagName) {
		// 直接new Element，用来生成一个新元素
		if (tagName) {
			self = document.createElement(tagName);
			wrap(self);

		// 包装现有元素
		} else {
		}
		// self可能是已经包装过的对象，不要将其身上的__eventListeners清除掉
		if (!self.__eventListeners) self.__eventListeners = {};
		if (!self.__nativeEvents) self.__nativeEvents = {};
		if (self.classList === undefined && self !== document && self !== window) {
			self.classList = new exports.ElementClassList(self);
		}
		self.delegates = {};
	};

	/**
	 * 控制显示隐藏
	 */
	this.hidden = _supportHidden? nativeproperty() : property(function(self) {
		return self.style.display == 'none';
	}, function(self, value) {
		if (value == true) {
			if (self.style.display !== 'none') self.__oldDisplay = self.style.display;
			self.style.display = 'none';
		} else {
			self.style.display = self.__oldDisplay || '';
		}
	});

	/**
	 * 从dom读取数据
	 * @param property 数据key
	 * @param defaultValue 若没有，则返回此默认值
	 */
	this.retrieve = function(self, property, defaultValue){
		var storage = get(self.uid);
		if (!(property in storage) && defaultValue !== undefined) storage[property] = defaultValue;
		return storage[property];
	};

	/**
	 * 存储数据至dom
	 * @param property 数据key
	 * @param value 数据值
	 */
	this.store = function(self, property, value){
		var storage = get(self.uid);
		storage[property] = value;
		return self;
	};

	/**
	 * 事件代理
	 * @param selector 需要被代理的子元素selector
	 * @param type 事件名称
	 * @param callback 事件回调
	 * @param option 事件的冒泡/捕获阶段，是否lock的组合标识
	 */
	this.delegate = function(self, selector, type, fn, option) {

		function wrapper(e) {
			var ele = e.srcElement || e.target;
			do {
				if (ele && exports.Element.get('matchesSelector')(ele, selector)) fn.call(wrap(ele), e);
			} while((ele = ele.parentNode));
		}

		var key = selector + '_' + type;
		if (!self.delegates) {
			self.delegates = {};
		}
		if (!(key in self.delegates)) {
			self.delegates[key] = [];
		}
		self.delegates[key].push({
			wrapper: wrapper,
			fn: fn
		});

		self.addEvent(type, wrapper, option);
	};

	/**
	 * 事件代理
	 * @param selector 需要被代理的子元素selector
	 * @param type 事件名称
	 * @param callback 事件回调
	 * @param option 事件的冒泡/捕获阶段，是否lock的组合标识
	 */
	this.undelegate = function(self, selector, type, fn, option) {

		var key = selector + '_' + type;
		if (!self.delegates) {
			self.delegates = {};
		}
		// 没有这个代理
		if (!(key in self.delegates)) return;

		self.delegates[key].forEach(function(item) {
			if (item.fn === fn) {
				self.removeEvent(type, item.wrapper, option);
				return;
			}
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
	 * 获取元素上通过 data- 前缀定义的属性值
	 * @param data name
	 * @return data value
	 */
	this.getData = function(self, name) {
		return self.getAttribute('data-' + name);
	};

	/**
	 * 设置元素的innerHTML
	 * @param str html代码
	 */
	this.setHTML = function(self, str) {
		self.set('innerHTML', str);
	};

	/**
	 * @borrows dom.Element.setHTML
	 */
	this.setContent = this.setHTML;

	/**
	 * 根据选择器返回第一个符合selector的元素
	 * @param selector css选择符
	 */
	this.getElement = function(self, selector) {
		return exports.getElement(selector, self);
	};

	/**
	 * 根据选择器返回数组
	 * @param selector css选择符
	 */
	this.getElements = function(self, selector) {
		return exports.getElements(selector, self);
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
	 * @param el 被添加的元素
	 * @param where {'bottom'|'top'|'after'|'before'} 添加的位置
	 */
	this.grab = function(self, el, where) {
		inserters[where || 'bottom'](el, self);
		return self;
	};

	/**
	 * @param el 被添加的元素
	 * @param where {'bottom'|'top'|'after'|'before'} 添加的位置
	 */
	this.inject = function(self, el, where) {
		inserters[where || 'bottom'](self, el);
		return self;
	};

	/**
	 * 获取第一个符合selector的前兄弟节点
	 *
	 * @param selector css选择符
	 */
	this.getPrevious = function(self, selector) {
		var matchesSelector = selector ? exports.Element.get('matchesSelector') : null;
		var element = self;
		while(element = element.previousSibling) {
			// 注释节点
			if (element.nodeType == 8) {
				continue;
			}
			if (!matchesSelector || matchesSelector(element, selector)) {
				return wrap(element);
			}
		}
		return null;
	};

	/**
	 * 获取符合selector的所有前兄弟节点
	 *
	 * @param selector css选择符
	 */
	this.getAllPrevious = function(self, selector) {
		var matchesSelector = selector ? exports.Element.get('matchesSelector') : null;
		var result = [];
		var element = self;
		while(element = element.previousSibling) {
			// 注释节点
			if (element.nodeType == 8) {
				continue;
			}
			if (!matchesSelector || matchesSelector(element, selector)) {
				result.push(wrap(element));
			}
		}
		return result;
	};

	/**
	 * 获取第一个符合selector的后兄弟节点
	 *
	 * @param selector css选择符
	 */
	this.getNext = function(self, selector) {
		var matchesSelector = selector ? exports.Element.get('matchesSelector') : null;
		var element = self;
		while(element = element.nextSibling) {
			// 注释节点
			if (element.nodeType == 8) {
				continue;
			}
			if (!matchesSelector || matchesSelector(element, selector)) {
				return wrap(element);
			}
		}
		return null;
	};

	/**
	 * 获取所有符合selector的后兄弟节点列表
	 *
	 * @param selector css选择符
	 */
	this.getAllNext = function(self, selector) {
		var matchesSelector = selector ? exports.Element.get('matchesSelector') : null;
		var result = [];
		var element = self;
		while(element = element.nextSibling) {
			// 注释节点
			if (element.nodeType == 8) {
				continue;
			}
			if (!matchesSelector || matchesSelector(element, selector)) {
				result.push(wrap(element));
			}
		}
		return result;
	};

	/**
	 * 获取第一个符合selector的子节点
	 *
	 * @param selector css选择符
	 */
	this.getFirst = function(self, selector) {
		var matchesSelector = selector ? exports.Element.get('matchesSelector') : null;
		var childrens = self.childNodes, l = childrens.length;
		for (var i = 0, element; i < l; i++) {
			element = childrens[i];
			if (element.nodeType == 8) {
				continue;
			}
			if (!matchesSelector || matchesSelector(element, selector)) {
				return wrap(element);
			}
		}
		return null;
	};

	/**
	 * 获取最后一个符合selector的子节点
	 *
	 * @param selector css选择符
	 */
	this.getLast = function(self, selector) {
		var matchesSelector = selector ? exports.Element.get('matchesSelector') : null;
		var childrens = self.childNodes, l = childrens.length;
		for (var i = l - 1, element; i >= 0 ; i--) {
			element = childrens[i];
			if (element.nodeType == 8) {
				continue;
			}
			if (!matchesSelector || matchesSelector(element, selector)) {
				return wrap(element);
			}
		}
		return null;
	};

	/**
	 * 查找符合selector的父元素
	 *
	 * @param selector css选择符
	 */
	this.getParent = function(self, selector) {
		if (!selector) return wrap(self.parentNode);

		var matchesSelector = exports.Element.get('matchesSelector');
		var element = self;
		do {
			if (matchesSelector(element, selector)) return wrap(element);
		} while ((element = element.parentNode));
		return null;
	};
	
	/**
	 * 查找符合selector的所有父元素
	 *
	 * @param selector css选择符
	 */
	this.getParents = function(self, selector) {
		var matchesSelector = selector ? exports.Element.get('matchesSelector') : null;
		var result = [];
		var element = self;
		while(element = element.parentNode) {
			// 注释节点
			if (element.nodeType == 8) continue;
			if (!matchesSelector || matchesSelector(element, selector)) {
				result.push(wrap(element));
			}
		}
		return result;
	};

	/**
	 * 获取所有符合selector的兄弟节点列表
	 *
	 * @param selector css选择符
	 */
	this.getSiblings = function(self, selector) {
		return self.getAllPrevious(selector).concat(self.getAllNext(selector));
	};

	/**
	 * 获取所有符合selector的孩子节点列表
	 *
	 * @param selector css选择符
	 */
	this.getChildren = function(self, selector) {
		var matchesSelector = selector ? exports.Element.get('matchesSelector') : null;
		var childrens = self.childNodes, l = childrens.length, result = [];
		for (var i = 0, element; i < l ; i++) {
			element = childrens[i];
			if (element.nodeType == 8) {
				continue;
			}
			if (!matchesSelector || matchesSelector(element, selector)) {
				result.push(wrap(element));
			}
		}
		return result;
	};

	/**
	 * 添加className<br>
	 * 坚决支持标准，addClass方法传空字串会报错（火狐）
	 * @param name
	 */
	this.addClass = function(self, name) {
		if (!name) {
			throw new Error('addClass的参数不能为空');
			return;
		}
		self.classList.add(name);
	};

	/**
	 * 移除className
	 * @param name
	 */
	this.removeClass = function(self, name) {
		self.classList.remove(name);
	};

	/**
	 * 切换className
	 * @param name
	 */
	this.toggleClass = function(self, name) {
		self.classList.toggle(name);
	};

	/**
	 * 检查是否拥有className
	 * @param name
	 */
	this.hasClass = function(self, name) {
		return self.classList.contains(name);
	};

	// opacity属性的辅助内容，参考Mootools
	var html = document.documentElement;
	var floatName = (html.style.cssFloat == null) ? 'styleFloat' : 'cssFloat',
		hasOpacity = (html.style.opacity != null),
		hasFilter = (html.style.filter != null),
		reAlpha = /alpha\(opacity=([\d.]+)\)/i;

	/**
	 * 透明度属性设置
	 */
	this.opacity = property(function(self) {
		if (hasOpacity) {
			return self.style.opacity;
		} else if (hasFilter) {
			// var filter = self.style.filter || self.getComputedStyle('filter');
			var filter = self.style.filter || self.currentStyle.filter;
			if (filter) opacity = filter.match(reAlpha);
			return (opacity == null || filter == null) ? 1 : (opacity[1] / 100);
		} else {
			return self.retrieve('opacity');
		}
	}, function(self, opacity) {
		if (hasOpacity) {
			self.style.opacity = opacity;
		} else if (hasFilter) {
			if (!self.currentStyle || !self.currentStyle.hasLayout) self.style.zoom = 1;
			opacity = parseInt(opacity * 100);
			if (opacity > 100) {
				opacity = 100;
			} else if (opacity < 0) {
				opacity = 0;
			}
			
			var opacityStr = opacity == 100 ? '' : 'alpha(opacity=' + opacity + ')';
			// getComputedStyle在IE中并不存在，Mootools中使用了
			// var filter = self.style.filter || self.getComputedStyle('filter') || '';
			var filter = self.style.filter || self.currentStyle.filter || '';
			self.style.filter = reAlpha.test(filter) ? filter.replace(reAlpha, opacityStr) : filter + opacityStr;
		} else {
			self.store('opacity', opacity);
			self.style.visibility = opacity > 0 ? 'visible' : 'hidden';
		}
	});

	/**
	 * 设置inline style
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
	 */
	this.dispose = function(self) {
		return (self.parentNode) ? self.parentNode.removeChild(self) : self;
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

	/**
	 * 通过字符串设置此元素的内容
	 * 为兼容HTML5标签，IE下无法直接使用innerHTML
	 */
	this.innerHTML = property(null, function(self, html) {
		if (_supportUnknownTags) {
			self.innerHTML = html;
		} else {
			var nodes = exports.getDom(html);
			self.innerHTML = '';
			while (nodes.firstChild) self.appendChild(nodes.firstChild);
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
	 * 以下元素无法被处理哦：
	 * html/head/body/meta/link/script/style
	 */
	this.fromString = staticmethod(function(str) {
		var tmp = document.createElement('div');
		if (!_supportUnknownTags) {
			tmp.style.display = 'none';
			document.body.appendChild(tmp);
		}
		tmp.innerHTML = str.trim();
		var result = wrap(tmp.firstChild);
		if (!_supportUnknownTags) tmp.parentNode.removeChild(tmp);
		return result;
	});

});

/**
 * img元素的包装
 */
this.ImageElement = new Class(exports.Element, function() {

	this.nativeEventNames = basicNativeEventNames.concat(['error', 'abort']);

	// 获取naturalWidth和naturalHeight的方法
	// http://jacklmoore.com/notes/naturalwidth-and-naturalheight-in-ie/
	function _getNaturalSize(img) {
		// 参考jQuery
		var anotherImg = new Image();
		anotherImg.src = img.src;
		return {
			width : anotherImg.width,
			height : anotherImg.height
		};

		/**
		 * 在IE下得不到原来的尺寸
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
		};
		*/
	};

	this.naturalWidth = property(function(self) {
		if (_supportNaturalWH) {
			return self.naturalWidth;
		} else {
			return _getNaturalSize(self).width;
		}
	});

	this.naturalHeight = property(function(self) {
		if (_supportNaturalWH) {
			return self.naturalHeight;
		} else {
			return _getNaturalSize(self).height;
		}
	});

});

/**
 * form元素的包装
 */
this.FormElement = new Class(exports.Element, function() {

	this.nativeEventNames = basicNativeEventNames.concat(['reset', 'submit']);

	this.initialize = function(self) {
		this.parent(self);

		if (self.elements) {
			for (var i = 0; i < self.elements.length; i++) {
				wrap(self.elements[i]);
			}
		}

		// 用自己的namedItem替换系统提供的，系统提供的在修改了name属性后无法同步
		if (!_supportNamedItemSync) {
			self.elements.namedItem = function(name) {
				return Sizzle('*[name=' + name + ']', self)[0];
			}
		}

		// 对于不支持多表单提交的浏览器在所有表单提交时都判断一下是否来源于特殊的提交按钮
		if (!_supportMultipleSubmit) {
			self.addNativeEvent('submit', function(event) {
				// 不是由一个特殊按钮触发的，直接返回
				if (!self.__submitButton) return;

				var button = self.__submitButton;
				self.__submitButton = null;

				// 在提交之前，用按钮的属性替换表单的属性
				var oldAction = self.action;
				var oldMethod = self.method;
				var oldEnctype = self.encoding || self.enctype;
				var oldNoValidate = self.noValidate;
				var oldTarget = self.target;
				var formAction = button.getAttribute('formaction');
				var formMethod = button.getAttribute('formmethod');
				var formEnctype = button.getAttribute('formenctype');
				var formNoValidate = button.getAttribute('formnovalidate');
				var formTarget = button.getAttribute('formtarget');
				if (formAction) self.action = formAction;
				if (formMethod) self.method = formMethod;
				if (formEnctype) self.enctype = self.encoding = formEnctype;
				if (formNoValidate) self.formNoValidate = formNoValidate;
				if (formTarget) self.target = formTarget;

				var preventDefaulted = event.getPreventDefault? event.getPreventDefault() : event.defaultPrevented;
				if (!preventDefaulted) {
					event.preventDefault();
					self.submit();
				}

				// 傲游3的webkit内核在执行submit时是异步的，导致submit真正执行前，下面这段代码已经执行，action和target都被恢复回去了。
				// 做一个兼容，maxthon3中用setTimeout进行恢复。
				if (ua.ua.webkit <= 534.12) {
					setTimeout(function() {
						// 提交之后再恢复回来
						self.action = oldAction;
						self.method = oldMethod;
						self.enctype = self.encoding = oldEnctype;
						self.formNoValidate = oldNoValidate;
						self.target = oldTarget;
					}, 0);
				} else {
					// 提交之后再恢复回来
					self.action = oldAction;
					self.method = oldMethod;
					self.enctype = self.encoding = oldEnctype;
					self.formNoValidate = oldNoValidate;
					self.target = oldTarget;
				}

			});
		}
	};

	/**
	 * 根据现有表单，创建一个Request对象
	 */
	this.createRequest = function(self, params) {
		if (!params) params = {};
		if (!params.method) params.method = self.method;
		if (!params.url) params.url = self.action;
		if (!params.data) params.data = self.toQueryString();
		if (!params.onsuccess) params.onsuccess = function(event) {
			self.fireEvent('requestSuccess', {request: event.request});
		};
		if (!params.onerror) params.onerror = function(event) {
			self.fireEvent('requestError', {request: event.request});
		};
		var net = sys.modules['net'];
		if (net) {
			xhr = new net.Request(params);
		} else {
			throw new ModuleRequiredError('net');
		}
		return xhr;
	};

	/**
	 * 用ajax发送一个表单
	 */
	this.send = function(self, data) {
		var request = self.createRequest();
		request.send(data);
		return request;
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
 * textarea / input / textarea / select / option 元素的包装
 */
this.FormItemElement = new Class(exports.Element, function() {

	this.nativeEventNames = basicNativeEventNames.concat(['focus', 'blur', 'change', 'select', 'paste']);

	this.required = _supportHTML5Forms ? nativeproperty() : attributeproperty(false);
	this.pattern  = _supportHTML5Forms ? nativeproperty() : attributeproperty('');
	this.maxlength = nativeproperty();
	this.type = _supportHTML5Forms ? nativeproperty() : attributeproperty('text');
	this.min = _supportHTML5Forms ? nativeproperty() : attributeproperty('');
	this.max = _supportHTML5Forms ? nativeproperty() : attributeproperty('');

	/**
	 * selectionStart
	 * IE下获取selectionStart时，必须先在业务代码中focus该元素，否则返回-1
	 *
	 * @return 获取过程中发生任何问题，返回-1，否则返回正常的selectionStart
	 */
	this.selectionStart = property(function(self) {
		try {
			// 避免在火狐下，获取不可见元素的selectionStart出错
			if (typeof self.selectionStart == 'number') {
				return self.selectionStart;
			}
		} catch (e) {
			return -1;
		}

		// IE
		if (document.selection) {
			// 参考JQuery插件：fieldSelection
			var range = document.selection.createRange();
			// IE下要求元素在获取selectionStart时必须先focus，如果focus的元素不是自己，则返回-1
			if (range == null || range.parentElement() != self) {
				if (self.__selectionPos) {
					return self.__selectionPos.start;
				} else {
					return -1;
				}
			}
			return calculateSelectionPos(self).start;
		} else {
			return -1;
		}
	});
        
	/**
	 * selectionEnd
	 * IE下获取selectionEnd时，必须先在业务代码中focus该元素，否则返回-1
	 *
	 * @return 获取过程中发生任何问题，返回-1，否则返回正常的selectionEnd
	 */
	this.selectionEnd = property(function(self) {
		try {
			// 避免在火狐下，获取不可见元素的selectionEnd出错
			if (typeof self.selectionEnd == 'number') {
				return self.selectionEnd;
			}
		} catch (e) {
			return -1;
		}

		// IE
		if (document.selection) {
			// 参考JQuery插件：fieldSelection
			var range = document.selection.createRange();
			// IE下要求元素在获取selectionEnd时必须先focus，如果focus的元素不是自己，则返回0
			if (range == null || range.parentElement() != self) {
				if (self.__selectionPos) {
					return self.__selectionPos.end;
				} else {
					return -1;
				}
			}
			return calculateSelectionPos(self).end;
		} else {
			return -1;
		}
	});

	/**
	 * select元素所有已选择元素
	 */
	this.getSelected = function(self) {
		self.selectedIndex; // Safari 3.2.1
		var selected = [];
		for (var i = 0; i < self.options.length; i++) {
			if (self.options[i].selected) selected.push(self.options[i]);
		};
		return selected;
	};

	/**
	 * value，在不支持placeholder的浏览器忽略placeholder的值
	 */
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
		if (!_supportPlaceholder && !self.value && self.getAttribute('placeholder')) {
			self.classList.add('placeholder');
			self.value = self.getAttribute('placeholder');
			self.setAttribute('autocomplete', 'off');
		};
		self.checkValidity();
	});

	/**
	 * HTML5 validity
	 */
	this.validity = _supportHTML5Forms? property(function(self) {
		return self.validity;
	}) : property(function(self) {
		// required pattern min max step
		// text search url tel email password
		var value = self.get('value');
		
		var validity = {
			// 在firefox3.6.25中，self.getAttribute('required')只能获取到self.setAttribute('required', true)的值
			// self.required = true设置的值无法获取
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
				var maxlength = self.get('maxlength');
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
			if (validity.tooLong) return '请将该文本减少为 ' + self.get('maxlength') + ' 个字符或更少（您当前使用了' + self.get('value').length + '个字符）。';
			if (validity.rangeUnderflow) return '值必须大于或等于' + self.getAttribute('min') + '。';
			if (validity.rangeOverflow) return '值必须小于或等于' + self.getAttribute('max') + '。';
			if (validity.stepMismatch) return '值无效。';
		})();
		self._set('validationMessage', self.__validationMessage);

		self._set('validity', validity);
		return validity;
	});

	/**
	 * HTML5 validationMessage
	 */
	this.validationMessage = _supportHTML5Forms? property(function(self) {
		return self.validationMessage;
	}) : property(function(self) {
		self.get('validity');
		return self.__validationMessage;
	});

	if (!_supportHTML5Forms) {
		/* TODO */
		// autofocus
		// willvalidate
		// formnovalidate

		/**
		 * HTML5 setCustomValidity
		 */
		this.setCustomValidity = function(self, message) {
			self.__customValidity = message;
			self.get('validity');
		};

		/**
		 * HTML5 checkValidity
		 */
		this.checkValidity = function(self) {
			self.get('validity');
			return self.validity.valid;
		};
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

});

/**
 * input / textarea 元素的包装类的基类
 */
this.TextBaseElement = new Class(exports.FormItemElement, function() {

	this.initialize = function(self) {
		this.parent(self);

		if (!_supportPlaceholder) {
			self.bindPlaceholder();
		}
		if (!_supportSelectionStart) {
			// 在每一次即将失去焦点之前，保存一下当前的selectionStart和selectionEnd的值
			self.addEvent('beforedeactivate', function() {
				/** 在失去焦点时保存selectionStart和selectionEnd的值，只在IE下用 */
				self.__selectionPos = calculateSelectionPos(self);
			});
		}
	};

	/**
	 * 占位符
	 */
	this.placeholder = property(function(self) {
		return self.getAttribute('placeholder');
	}, function(self, value) {
		self.setAttribute('placeholder', value);
		if (!_supportPlaceholder) {
			self.bindPlaceholder();
			if (self.get('_placeholding')) self.value = value;
		}
	});

	/**
	 * 是否处于占位符状态
	 */
	this._placeholding = property(function(self) {
		return self.classList.contains('placeholder');
	}, function(self, value) {
		if (value) {
			self.classList.add('placeholder');
			self.setAttribute('autocomplete', 'off');
		} else {
			self.classList.remove('placeholder');
			self.removeAttribute('autocomplete');
		}
	});

	/**
	 * bind一个input或者textarea，使其支持placeholder属性
	 */
	this.bindPlaceholder = function(self) {
		if (self._binded) return;
		self._binded = true;

		// 通过autocomplete=off避免浏览器记住placeholder
		function checkEmpty(event) {
			var placeholder = self.get('placeholder');
			if (!placeholder) return;

			if (self.get('_placeholding')) {
				if (event.type == 'focus' && self.value === placeholder) {
					self.value = '';
				}
				self.set('_placeholding', false);

			// IE不支持autocomplete=off，刷新页面后value还是placeholder（其他浏览器为空，或者之前用户填写的值），只能通过判断是否相等来处理
			} else if (!self.value || ((ua.ua.ie == 6 || ua.ua.ie == 7) && !event && self.value == placeholder)) {
				self.set('_placeholding', true);
				self.value = placeholder;
			}
		}
		self.addNativeEvent('focus', function(event) {
			return checkEmpty(event);
		});
		self.addNativeEvent('blur', function(event) {
			return checkEmpty(event);
		});
		// 在IE6下，由于事件执行顺序的问题，当通过send()发送一个表单时，下面这段脚本实际上是不工作的
		// 也就是说，在send()时，self.value还是placeholder的值，导致把placeholder的值发送出去了
		// 通过在toQueryString中调用get('value')过滤掉placeholder的值
		// 完美的解决方法大概是需要接管IE6下的事件系统，工程量比较大。
		if (self.form) {
			// addNativeEvent，确保此事件在最后执行
			wrap(self.form).addNativeEvent('submit', function() {
				if (self.classList.contains('placeholder')) {
					self.set('_placeholding', false);
					self.value = '';
					// 如果此表单提交没有导致浏览器刷新，则会执行以下setTimeout，将placeholder置回
					setTimeout(function() {
						checkEmpty();
					}, 0);
				}
			});
		}
		checkEmpty();
	};

});

/**
 * input元素的包装类
 * @class
 */
this.InputElement = new Class(exports.TextBaseElement, function() {

	/**
	 * HTML5 formAction
	 */
	this.formAction = _supportMultipleSubmit? nativeproperty() : attributeproperty('');

	/**
	 * HTML5 formEnctype
	 */
	this.formEnctype = _supportMultipleSubmit? nativeproperty() : attributeproperty('application/x-www-form-urlencoded');

	/**
	 * HTML5 formMethod
	 */
	this.formMethod = _supportMultipleSubmit? nativeproperty() : attributeproperty('get');

	/**
	 * HTML5 formNoValidate
	 */
	this.formNoValidate = _supportMultipleSubmit? nativeproperty() : attributeproperty(false);

	/**
	 * HTML5 formTarget
	 */
	this.formTarget = _supportMultipleSubmit? nativeproperty() : attributeproperty('');

	this.initialize = function(self) {
		this.parent(self);

		if (!_supportMultipleSubmit) {
			self.addNativeEvent('click', function(event) {
				if (self.type == 'submit') {
					self.form.__submitButton = self;
				}
			});
		}
	};

	/**
	 * 用ajax发送一个表单
	 * @param data 发送的数据
	 */
	this.send = function(self, data) {
		if (self.type != 'submit') return;
		var request = self.form.createRequest({
			method: self.getAttribute('formmethod') || self.form.method,
			url: self.getAttribute('formaction') || self.form.action,
			onsuccess: function(event) {
				self.fireEvent('requestSuccess', {request: event.request});
			},
			onerror: function(event) {
				self.fireEvent('requestError', {request: event.request});
			}
		});
		request.send(data);
		return request;
	};

});

/**
 * textarea元素的包装类
 */
this.TextAreaElement = new Class(exports.TextBaseElement, function() {
});

/**
 * window元素的包装类
 */
this.Window = new Class(exports.Element, function() {
	this.nativeEventNames = basicNativeEventNames.concat(
		['load', 'unload', 'beforeunload', 'resize', 'move', 'DomContentLoaded', 'readystatechange', 'scroll', 'mousewheel', 'DOMMouseScroll']);
});

/**
 * document元素的包装类
 */
this.Document = new Class(exports.Element, function() {
	this.nativeEventNames = basicNativeEventNames.concat(
		['load', 'unload', 'beforeunload', 'resize', 'move', 'DomContentLoaded', 'readystatechange', 'scroll', 'mousewheel', 'DOMMouseScroll']);
});

/**
 * 一个包装类，实现Element方法的统一调用
 */
this.Elements = new Class(Array, function() {

	/**
	 * @param elements native dom elements
	 * @param wrapper 这批节点的共有类型，默认为Element
	 */
	this.initialize  = function(self, elements, wrapper) {
		if (!wrapper) wrapper = exports.Element;

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
	'INPUT': exports.InputElement,
	'TEXTAREA': exports.TextAreaElement,
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
	else return exports.Element;
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

/**
 * IE下，在焦点即将离开此元素时，计算一下selectionStart和selectionEnd备用
 *
 * @param {HTMLElement} field 焦点即将离开的元素，input/textarea
 * @return {Object} 位置信息对象，包含{start:起始位置, end:终止位置}
 */
function calculateSelectionPos(field) {
	// 参考JQuery插件：fieldSelection
	var range = document.selection.createRange();
	if (range == null || range.parentElement() != field) {
		return {start:-1, end:-1};
	}
	var elementRange = field.createTextRange();
	var duplicated = elementRange.duplicate();
	elementRange.moveToBookmark(range.getBookmark());
	//将选中区域的起始点作为整个元素区域的终点
	duplicated.setEndPoint('EndToStart', elementRange);
	return {
		start: duplicated.text.length, 
		end  : duplicated.text.length + range.text.length
	};
}
});
