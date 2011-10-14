/**
 * @namespace
 * @name dom
 */
object.add('dom', 'ua, events, string, dd, sys', /**@lends dom*/ function(exports, ua, events, string, dd, sys) {

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
 * 拖拽模块
 * @class
 * @name dom.DragDrop
 */
var DragDrop = this.DragDrop = new Class(/**@lends dom.Element*/ function() {

	//如何判断浏览器支持HTML5的拖拽(TODO 只需判断一次即可)：
	//Detecting "draggable' in document.createElement('span') seems like a good idea, but in practice it doesn't work.
	//iOS claims that draggable is in the element but doesn't allow drag and drop.(Reference: Safari Web Content Guide: Handling Events)
	//IE9 claims that draggable is NOT in the element, but does allow drag and drop. (Reference: my testing HTML5 drag and drop in IE.)
	
	//from http://kangax.github.com/iseventsupported/
	function isEventSupported(eventName, element) {
		var TAGNAMES = {
			'select': 'input', 'change': 'input',
			'submit': 'form', 'reset': 'form',
			'error': 'img', 'load': 'img', 'abort': 'img'
		};
		element = element || document.createElement(TAGNAMES[eventName] || 'div');
		eventName = 'on' + eventName;
		
		var isSupported = (eventName in element);
		
		if (!isSupported) {
			// if it has no `setAttribute` (i.e. doesn't implement Node interface), try generic element
			if (!element.setAttribute) {
				element = document.createElement('div');
			}
			if (element.setAttribute && element.removeAttribute) {
				element.setAttribute(eventName, '');
				isSupported = typeof element[eventName] == 'function';

				// if property was created, "remove it" (by setting value to `undefined`)
				if (typeof element[eventName] != 'undefined') {
					element[eventName] = undefined;
				}
				element.removeAttribute(eventName);
			}
		}
		
		element = null;
		return isSupported;
	}
	
	var iOS = !!navigator.userAgent.match('iPhone OS') || !!navigator.userAgent.match('iPad');
	//正确的判断方法 from Modernizr.js ：http://modernizr.github.com/Modernizr/annotatedsource.html
	//var _supportHTML5DragDrop = !iOS && isEventSupported('dragstart') && isEventSupported('drop');

	//判断浏览器是否支持HTML5的拖拽
	var _supportHTML5Drag = !iOS && isEventSupported('dragstart');
	var _supportHTML5Drop = !iOS && isEventSupported('drop');
	//拖拽时会修改拖拽元素的默认样式
	var _modifiedPropertiesByDrag = ['display', 'position', 'width', 'height', 'border', 
			'backgroundColor', 'filter', 'opacity', 'zIndex', 'left', 'top'];
	//支持HTML5拖拽的浏览器下，自动draggable等于true的元素tag
	var _autoDraggableTags = ['IMG', 'A'];

	Class.mixin(this, events.Events);

	//屏蔽IE默认的拖拽行为
	if(ua.ua.ie) {
		document.ondragstart = returnFalse;
	}

	this.initialize = function(self) {
		//设置基本的配置项
		self.__options = {
			axis : 'XY', 				//X/Y/XY
			switcher : {
				type : 'distance', 		//distance/time
				value : 3
			}
		};
		//如果draggable元素的值为true，则模拟HTML5的行为，让元素可拖拽，并且触发一系列事件
		//IMG和A标签在支持HTML5拖拽的浏览器中默认是true的，因此需要特殊处理
		if (self.get('draggable') == true 
			&& (_autoDraggableTags.indexOf(self.tagName) == -1)) {
			//需要为document添加事件
			self.__doc = wrap(document);
			//bind事件，将bind后的函数作为事件监听
			self.__binder = {
				checkDragging : self._checkDragging.bind(self),
				cancel : self._cancel.bind(self),
				dragging: self._dragging.bind(self),
				finish: self._finish.bind(self)
			}
			//为元素添加拖拽的相关行为
			self.enableDrag();
			//屏蔽当前拖拽元素下的A和IMG的拖拽行为，让元素的拖拽行为可以disable
			self._forbidAutoDraggableNodes();
		}
		//模拟放置行为(暂时dropzone还只是用来作为简单标识)
		if (self.get('dropzone') != undefined && self.get('dropzone') != "") { 
			self.set('dropzone', 'default');
		}
	};

	/**
	 * 为元素添加拖拽的相关行为
	 */
	this.enableDrag = function(self) {
		self.set('draggable', true);
		return self;
	}

	/**
	 * 禁用元素的拖拽相关行为
	 */
	this.disableDrag = function(self) {
		self.set('draggable', false);
		return self;
	}

	/**
	 * 定义draggable的获取和设置方法
	 */
	this.draggable = property(
		function(self){
			return self.draggable;
		}, 
		function(self, draggable){
			//设置元素的draggable为true
			self._set('draggable', draggable);
			if(draggable) {
				if(self.__canDrag == true) {
					return;
				}
				//为元素自身添加鼠标点击的监听
				self.addEvent('mousedown', self._handleMouseDown, false);
				self.__canDrag = true;
				//如果已经有归属了，则不再重新计算
				if(self.__belongTo != null) {
					return;
				}
				//保存所有的容器元素列表
				self.__droppables = [];
				//往上寻找自己所属的容器
				var parent = self.parentNode;
				while(parent && parent.tagName != 'BODY' && parent.tagName != 'HTML') {
					if(parent.dropzone != undefined && parent.dropzone != '') {
						parent = wrap(parent);
						self.__belongTo = parent;
						self.__droppables.push(parent);
						break;
					}
					parent = parent.parentNode;
				}
			} else {
				if(self.__canDrag == true) {
					//去除自身的鼠标点击监听
					self.removeEvent('mousedown', self._handleMouseDown, false);
					//保留当前所属容器和容器列表，为再次可拖拽做准备
					//self.__belongTo = null;
					//self.__droppables = null;
					self.__canDrag = false;
				}
			}
		}
	);

	/**
	 * 定义dropzone的获取和设置方法
	 */
	this.dropzone = property(
		function(self){
			return self.dropzone;
		}, 
		function(self, dropzone){
			self._set('dropzone', dropzone);
			if(dropzone != undefined && dropzone != '') {
				if(self.__canDrop != true) {
					self.__canDrop = true;
				}	
			} else {
				if(self.__canDrop == true) {
					self.__canDrop = false;
				}
			}
		}
	);

	/**
	 * 获取容器列表
	 */	
	this.getContainerList = function(self) {
		return self.__canDrag ? self.__droppables : null;
	}
	/**
	 * 获取当前所在的容器
	 */
	this.getCurrentContainer = function(self) {
		return self.__canDrag ? self.__belongTo : null;
	}

	/**
	 * 为容器添加其他可拖拽的元素（意味着其他元素可以拖放进入此容器）
	 *
	 * @param self
	 * @param draggables  : 添加的可拖拽元素，元素本身必须是可拖拽的
	 * @param isInit 	  : 当前容器是否是这些可拖拽元素的初始容器
	 */
	this.addDraggables = function(self, draggables, isInit) {
		if(self.__canDrop != true) {
			return self;
		}
		isInit = isInit || false;
		if(!self.__draggables) {
			self.__draggables = [];
		}
		for(var i=0,l=draggables.length,current; i<l; i++) {
			current = draggables[i];
			if(!current._canDrag) {
				current.enableDrag();
			} 
			//如果新添加元素的容器列表中已经有当前元素了，则不需要重新再添加
			if(current.__droppables.indexOf(self) == -1) {
				current.__droppables.push(self);
			}
			if(isInit) {
				current.__belongTo = self;
			}
		}
		return self;
	}

	/**
	 * 为当前可拖拽元素增加一个新的可放置容器
	 *
	 * @param self
	 * @param droppable : 新增加的容器对象
	 * @param isInit	: 是否作为初始容器（draggable元素的当前容器）
	 */
	this.addDroppable = function(self, droppable, isInit) {
		if(self.__canDrag != true) {
			return self;
		}
		isInit = isInit || false;
		self.__droppables = self.__droppables || [];
		//放入容器列表
		self.__droppables.push(droppable);
		if(isInit) {
			//将此容器作为初始容器
			self.__belongTo = droppable;
		}
		return self;
	}

	/**
	 * 屏蔽当前可拖拽元素的所有A，IMG元素的拖拽行为
	 */
	this._forbidAutoDraggableNodes = function(self) {
		if(!_supportHTML5Drag || self.__canDrag != true) {
			return self;
		}
		//获取子元素
		var subNodes = getElements(_autoDraggableTags.join(','), self);
		for(var i=0,l=subNodes.length; i<l; i++) {
			subNodes[i].draggable = false;
		}
		return self;
	}

	/**
	 * 考虑框架页对事件addEvent方法的影响，封装为document元素添加事件的方法
	 * 但是在dom模块中增加了对页面框架模块asyncHTMLManager的判断，不是好的解决方案
	 */	
	this._addEventToDoc = function(self, type, callback, bubble) {
		//如果有页面框架模块，则采用覆盖前的addEvent
		var addEvent = window.asyncHTMLManager ?
			window.asyncHTMLManager.dom.Element.prototype.addEvent : self._doc.addEvent;

		addEvent.call(self.__doc, type, callback, bubble);
	}

	/**
	 * 考虑框架页对事件removeEvent方法的影响，封装为document元素删除事件的方法
	 */	
	this._removeEventFromDoc = function(self, type, callback, bubble) {
		//如果有页面框架模块，则采用覆盖前的removeEvent
		var removeEvent = window.asyncHTMLManager ?
			window.asyncHTMLManager.dom.Element.prototype.removeEvent : self._doc.removeEvent;

		removeEvent.call(self.__doc, type, callback, bubble);
	}	

	/**
	 * 处理鼠标的点击以后的拖拽行为
	 *
	 * @param e : 点击发生时的事件对象
	 */
	this._handleMouseDown = function(self, e) {	
		//阻止默认行为，让代码控制拖拽行为
		if(e.preventDefault) e.preventDefault();
		if(e.stopPropagation) e.stopPropagation();
		
		var mousePos = getMousePos(e);
		var selfPos = self.position();
		//初始的鼠标位置
		self.__originMouseX = mousePos.x;
		self.__originMouseY = mousePos.y;
		//初始的元素坐标位置(top, left)，用于解决chrome浏览器的拖拽位置不变认为是单击的问题
		if(ua.ua.chrome) {
			self.__originX = selfPos.x;
			self.__originY = selfPos.y;
			//确保chrome下添加的click事件一定被移除了，这里不会抛出异常
			self.removeEvent('click', fixChromeClick, false);
			//console.log(selfPos.x, selfPos.y);
		}
		//用于拖拽时，定位元素相对于鼠标指针的位置
		self.__deltaX = mousePos.x - selfPos.x;
		self.__deltaY = mousePos.y - selfPos.y;

		//触发draginit事件，HTML5标准钟并没有此事件，因此暂不触发
		//self.fireEvent('draginit', {dragging:self, event:e});

		//给document的mousemove 和 mouseup加上事件
		self._addEventToDoc('mousemove', self.__binder.checkDragging, false);
		self._addEventToDoc('mouseup', self.__binder.cancel, false);

		//屏蔽拖拽元素的选择行为
		self.__selectionEventName = ua.ua.ie ? 'selectstart' : 'mousedown';
		self._addEventToDoc(self.__selectionEventName, returnFalse, false); 
	}

	/**
	 * 根据鼠标的移动距离，判断是否已经开始拖拽
	 *
	 *   初始情况下为document的mousemove方法添加的是checkDragging，判断是否是拖拽操作
	 *   如果开始拖拽，再将checkDragging改为dragging，正式执行拖拽的功能
	 *
	 * @param e : 事件对象
	 */	
	this._checkDragging = function(self, e) {
		//在IE下，如果拖动非常迅速时，鼠标变成禁止符号，这里需要禁止默认事件的发生
		if(e.preventDefault) e.preventDefault();
		
		//计算鼠标移动的距离，如果大于某一个阈值，则认为开始拖动
		//这是Mootools的方案，Kissy还提供了一种鼠标点击持续事件的判断，如果大于200ms，说明是拖拽
		var mousePos = getMousePos(e);
		var distance = Math.round(Math.sqrt(Math.pow(mousePos.x - self.__originMouseX, 2) + 
				Math.pow(mousePos.y - self.__originMouseY, 2)));
		//说明开始拖拽了
		if(self.__options.switcher.type == 'distance' && distance > self.__options.switcher.value) {
			//把mousemove由检查拖拽改为执行拖拽，把mouseup由取消改为完成
			self._removeEventFromDoc('mousemove', self.__binder.checkDragging, false);
			self._removeEventFromDoc('mouseup', self.__binder.cancel, false);
			self._addEventToDoc('mousemove', self.__binder.dragging, false);
			self._addEventToDoc('mouseup', self.__binder.finish, false);
		
			//给元素添加拖拽时候的基本样式
			addDraggingStyle(self);

			//触发dragstart事件，参考HTML5规范
			self.fireEvent('dragstart', {dragging:self, event:e});

			//这里也触发所属元素的dropinit事件
			//dropinit不是HTML5规范规定的，但是也是有必要的
			//dragstart, drag, dragend是draggable元素的完整生命周期，
			//但是如果没有dropinit，droppable元素只有dropenter, dropover, dropleave, drop，没有初始状态，不完整
			//具体示例：如果在拖拽初始时需要创建占位元素，如果没有dropinit，就只能针对每一个元素的dragstart编写代码了
			if(self.__belongTo) {
				self.__belongTo.fireEvent('dropinit', {dragging:self, event:e});
			}
		}
	}

	/**
	 * 拖拽时的事件处理方法
	 *
	 * @param e : 事件对象
	 */
	this._dragging = function(self, e) {
		//阻止默认事件
		if(e.preventDefault) e.preventDefault();

		//利用鼠标位置，修改拖拽元素的位置
		var mousePos = getMousePos(e);
		if(self.__options.axis == 'XY') {
			self.style.left = (mousePos.x - self.__deltaX) + 'px';
			self.style.top  = (mousePos.y - self.__deltaY) + 'px';
		} else if(self.__options.axis == 'X') {
			self.style.left = (mousePos.x - self.__deltaX) + 'px';
		} else if(self.__options.axis == 'Y') {
			self.style.top  = (mousePos.y - self.__deltaY) + 'px';
		}
		//触发drag事件，遵循HTML5规范
		self.fireEvent('drag', {dragging:self, event:e});

		//计算当前元素的具体位置坐标
		var selfPos = self.position();
		var draggingCoordinates = {
			top: selfPos.y,
			left: selfPos.x,
			right: selfPos.x + parseInt(self.getStyle('width')),
			bottom: selfPos.y + parseInt(self.getStyle('height'))
		}

		//针对每一个容器，检查当前元素是否在容器当中
		for(var i=0,current,currentPos,containerCoordinates,l=self.__droppables.length; i<l; i++) {
			current = self.__droppables[i];

			//计算每一个容器的边界
			currentPos = current.position();
			containerCoordinates = {
				top: currentPos.y,
				left: currentPos.x,
				right: currentPos.x + parseInt(current.getStyle('width')),
				bottom: currentPos.y + parseInt(current.getStyle('height'))
			}
			
			//判断容器的关系
			if(current == self.__belongTo) {
				//如果容器是拖拽元素所属容器
				if(isInContainer(containerCoordinates, draggingCoordinates)) {
					//如果还在容器内，说明在所属容器内部移动，触发dragover事件
					current.fireEvent('dragover', {from:current, to:current, dragging:self});
				} else {
					//如果不在容器内，说明从所属容器中移出，触发dragleave事件
					current.fireEvent('dragleave', {from:current, to:null, dragging:self});
					self.__belongTo = null;
				}
			} else {
				//如果容器不是拖拽元素所属容器
				if(isInContainer(containerCoordinates, draggingCoordinates)) {
					//如果拖拽元素所属容器不为空，说明从拖拽容器中脱离出来了(是不是会跟上面事件触发有重复?试验还没出现这种情况)
					if(self.__belongTo) {
						self.__belongTo.fireEvent('dragleave', {from:self.__belongTo, to:current, dragging:self});
					}
					//进入此容器了，触发dragenter
					//注意元素初始情况下会属于某个容器，初始化的时候要记录，避免错误的触发dragenter，mootools貌似没有判断
					current.fireEvent('dragenter', {from:self.__belongTo, to:current, dragging:self});
					self.__belongTo = current;
				}
			}
		}	
	}

	/**
	 * 拖拽完成时调用的方法
	 *
	 * @param self
	 * @param e : 事件对象
	 */
	this._finish= function(self, e) {
		if(e.preventDefault) e.preventDefault();

		//拖拽已完成，去除给document添加的一系列事件
		self._removeEventFromDoc('mousemove', self.__binder.dragging, false);
		self._removeEventFromDoc('mouseup', self.__binder.finish, false);
		self._removeEventFromDoc(self.__selectionEventName, returnFalse, false); 

		//去除基本的拖拽样式设置
		removeDraggingStyle(self);
		//如果元素属于某个容器，则触发该容器的drop事件
		if(self.__belongTo) {
			self.__belongTo.fireEvent('drop', {dragging:self, event:e});
		}
		//触发dragend事件，按照HTML5的标准，应该在容器drop事件之后触发
		self.fireEvent('dragend', {dragging:self, event:e});
		
		if(ua.ua.chrome) {
			//获取当前位置(应该放在drop和dropend事件之后，因为在这两个事件中可以继续调整元素的位置)
			var pos = self.position();
			//如果没有发生变化，则屏蔽chrome的click事件，避免再次请求页面
			//console.log(pos.x, pos.y, self.__originX, self.__originY);
			if(pos.x == self.__originX && pos.y == self.__originY) {
				self.addEvent('click', fixChromeClick, false);
			}	
		}
	}

	/**
	 * 取消拖拽操作，在checkDragging的过程中已经释放鼠标，说明并不是拖拽
	 *
	 * @param self
	 * @param e : 事件对象
	 */
	this._cancel = function(self, e) {
		//去除为document添加的所有事件
		self._removeEventFromDoc('mousemove', self.__binder.checkDragging, false);
		self._removeEventFromDoc('mouseup', self.__binder.cancel, false);
		self._removeEventFromDoc(self.__selectionEventName, returnFalse, false); 

		//触发取消事件（HTML5中没有此事件，Mootools中有）
		self.fireEvent('cancel', {dragging:self, event:e});	
	}


	/********************************* DragDrop的辅助方法 ************************************/

	/**
	 * 为屏蔽Chrome下拖拽再放回原处认为是单击的问题，这里将click事件进行屏蔽
	 *
	 * @param e : 事件对象
	 */
	function fixChromeClick(e) {
		//点击以后马上移除
		this.removeEvent('click', arguments.callee, false);
		//阻止默认执行和冒泡
		e.preventDefault();
		e.stopPropagation();
	}

	/**
	 * 为元素增加拖拽时的样式设置
	 *
	 * @param element : 拖拽的元素
	 */
	function addDraggingStyle(element) {
		//备份元素在拖拽之前的属性值
		element.oldStyle = {};
		var currentStyle = element.style;
		_modifiedPropertiesByDrag.forEach(function(prop) {
			element.oldStyle[prop] = currentStyle[prop];
		});
		//设置拖拽元素的基本属性
		element.style.display = 'block';
		//width和height一定要在设置position属性之前获取
		element.style.width = parseInt(element.getStyle('width')) + 'px';
		element.style.height = parseInt(element.getStyle('height')) + 'px';
		element.style.position = 'absolute';
		element.style.backgroundColor = '#ccc';
		if(ua.ua.ie) {
			element.style.filter = 'Alpha(opacity=70)';
		} else {
			element.style.opacity = '0.7';
		}
		element.style.zIndex = '10000';	
	}

	/**
	 * 为元素去除拖拽的样式设置
	 *
	 * @param element : 拖拽的元素
	 */
	function removeDraggingStyle(element) {
		_modifiedPropertiesByDrag.forEach(function(prop) {
			element.style[prop] = element.oldStyle[prop];
		});
		element.oldStyle = null;
	}

	/**
	 * 获取鼠标的具体位置坐标（完善此方法）
	 *
	 * @param ev : 事件对象
	 */ 
	function getMousePos(ev) {
	   /** 
		* mootools:
		*  this.page = {
		   	x: (event.pageX != null) ? event.pageX : event.clientX + doc.scrollLeft,
		   	y: (event.pageY != null) ? event.pageY : event.clientY + doc.scrollTop
		   };
		   this.client = {
		   	x: (event.pageX != null) ? event.pageX - win.pageXOffset : event.clientX,
		   	y: (event.pageY != null) ? event.pageY - win.pageYOffset : event.clientY
		   };
		*/
		return {
			x : (ev.pageX != null) ? ev.pageX : ev.clientX + document.body.scrollLeft - document.body.clientLeft,
			y : (ev.pageY != null) ? ev.pageY : ev.clientY + document.body.scrollTop  - document.body.clientTop
		};		
	}

	/**
	 * 根据两个坐标位置，判断dragging是否在container中
	 *
	 * @param container : 容器
	 * @param dragging  : 拖拽元素
	 *
	 * TODO 目前只是简单的判断了垂直方向的位置，还应该引入更加复杂的判断方式
	 */
	function isInContainer(container, dragging) {
		return dragging.bottom >= container.top && dragging.top <= container.bottom; 
	}

	/**
	 * 辅助方法，用于作为事件监听
	 */
	function returnFalse() {
		return false;
	}

	/**
	 * 获取元素的属性值
	 *
	 * @param self
	 * @param style : 属性名称
	 *
	 * @returns 属性名称对应的属性值
	 *
	 * 此方法来自XN.element
	 */
	this.getStyle = function(self, style) {
		if(ua.ua.ie) {
			style = (style == 'float' || style == 'cssFloat') ? 'styleFloat' : style;
		    var value = self.style[style];
		    if (!value && self.currentStyle) value = self.currentStyle[style];
		
		    if (style == 'opacity') {
				if (value = (self.style['filter'] || '').match(/alpha\(opacity=(.*)\)/)) {
					if (value[1]) {
						return parseFloat(value[1]) / 100;
					}
				}
				return 1.0;
		    }
		    if (value == 'auto') {
				if ((style == 'width' || style == 'height') && (self.getStyle('display') != 'none')) {
					return self['offset'+ (style == 'width' ? 'Width' : 'Height')] + 'px';
				}
				return null;
		    }
		    return value;
		} else {
			style = style == 'float' ? 'cssFloat' : style;
			var value = self.style[style];
			if (!value) {
				var css = document.defaultView.getComputedStyle(self, null);
				value = css ? css[style] : null;
			}
			if (style == 'opacity') return value ? parseFloat(value) : 1.0;
			return value == 'auto' ? null : value;
		}
	};

	/**
	 * 获取元素的具体位置信息
	 *
	 * @param self
	 * @return 形如{x:xxx, y:xxx}的位置信息对象，x是横向坐标，y是纵向坐标
	 *
	 * 此方法来自网络，需要参考标准获取方法和其他框架内容，再完善 
	 */
	this.position = function(self){
		if(self.parentNode === null || self.style.display == 'none') {
			return false;
		}

		var parent = null;
		var pos = [];
		var box;
	 
		if(self.getBoundingClientRect) {     //IE    
			box = self.getBoundingClientRect();
			var scrollTop = Math.max(document.documentElement.scrollTop, document.body.scrollTop);
			var scrollLeft = Math.max(document.documentElement.scrollLeft, document.body.scrollLeft); 
			return {x : box.left + scrollLeft, y : box.top + scrollTop};
		} else if(document.getBoxObjectFor) {    // gecko
			box = document.getBoxObjectFor(self);            
			var borderLeft = (self.style.borderLeftWidth) ? parseInt(self.style.borderLeftWidth) : 0;
			var borderTop = (self.style.borderTopWidth) ? parseInt(self.style.borderTopWidth) : 0; 
			pos = [box.x - borderLeft, box.y - borderTop];
		} else {    // safari & opera   
			pos = [self.offsetLeft, self.offsetTop];
			parent = self.offsetParent;
			if (parent != self) {
				while (parent) {
					pos[0] += parent.offsetLeft;
					pos[1] += parent.offsetTop;
					parent = parent.offsetParent;
				}
			}
			if (ua.ua.opera  
				|| ( ua.ua.safari && self.style.position == 'absolute' )) { 
				pos[0] -= document.body.offsetLeft;
				pos[1] -= document.body.offsetTop;
			}  
		}
			 
		parent = self.parentNode || null;

		while (parent && parent.tagName != 'BODY' && parent.tagName != 'HTML') { 
			// account for any scrolled ancestors
			pos[0] -= parent.scrollLeft;
			pos[1] -= parent.scrollTop;   
			parent = parent.parentNode; 
		}
		return {x:pos[0], y:pos[1]};
	};
});

/**
 * @class
 * @name dom.Element
 */
var Element = this.Element = new Class(/**@lends dom.Element*/ function() {

	Class.mixin(this, events.Events);
	Class.mixin(this, DragDrop);

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
