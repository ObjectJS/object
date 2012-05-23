object.add('dom/dd.js', 'ua, events, sys', function(exports, ua, events, sys) {

	//如何判断浏览器支持HTML5的拖拽：
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
	//正确的判断是否支持HTML5的拖拽方法 from Modernizr.js ：http://modernizr.github.com/Modernizr/annotatedsource.html
	var _supportHTML5DragDrop = !iOS && isEventSupported('dragstart') && isEventSupported('drop');

	/**
	 * 拖拽模块
	 */
	this.DragDrop = new Class(function() {

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
			//如果draggable元素的值为true，则模拟HTML5的行为，让元素可拖拽，并且触发一系列事件
			//IMG和A标签在支持HTML5拖拽的浏览器中默认是true的，因此需要特殊处理
			if (self.get('draggable') == true 
				&& (_autoDraggableTags.indexOf(self.tagName) == -1)) {
				//需要为document添加事件
				self.__docForDD = sys.modules['dom'].wrap(document);
				//bind事件，将bind后的函数作为事件监听
				self.__binderForDD = {
					checkDragging : self._checkDragging.bind(self),
					cancel : self._cancelDrag.bind(self),
					dragging: self._dragging.bind(self),
					finish: self._finishDrag.bind(self)
				}
				//为元素添加拖拽的相关行为
				self.set('draggable', true);
				//屏蔽当前拖拽元素下的A和IMG的拖拽行为，让元素的拖拽行为可以disable
				self._forbidAutoDraggableNodes();
			}
			//模拟放置行为(暂时dropzone还只是用来作为简单标识)
			if (self.get('dropzone') != undefined && self.get('dropzone') != "") { 
				self.set('dropzone', 'default');
			}
		};

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
					self.addEvent('mousedown', self._handleMouseDownForDD, false);
					self.__canDrag = true;
					//如果已经有归属了，则不再重新计算
					if(self.__belongToDroppable	!= null) {
						return;
					}
					//保存所有的容器元素列表
					self.__droppables = [];
					//往上寻找自己所属的容器
					var parent = self.parentNode;
					while(parent && parent.tagName != 'BODY' && parent.tagName != 'HTML') {
						if(parent.dropzone != undefined && parent.dropzone != '') {
							parent = sys.modules['dom'].wrap(parent);
							self.__belongToDroppable = parent;
							self.__droppables.push(parent);
							break;
						}
						parent = parent.parentNode;
					}
				} else {
					if(self.__canDrag == true) {
						//去除自身的鼠标点击监听
						self.removeEvent('mousedown', self._handleMouseDownForDD, false);
						//保留当前所属容器和容器列表，为再次可拖拽做准备
						//self.__belongToDroppable = null;
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
		this.getDroppableList = function(self) {
			return self.__canDrag ? self.__droppables : null;
		}
		/**
		 * 获取当前所在的容器
		 */
		this.getCurrentDroppable = function(self) {
			return self.__canDrag ? self.__belongToDroppable : null;
		}

		/**
		 * 为容器添加其他可拖拽的元素（意味着其他元素可以拖放进入此容器）
		 *
		 * @param draggables  添加的可拖拽元素，元素本身必须是可拖拽的
		 * @param isInit 	  当前容器是否是这些可拖拽元素的初始容器
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
					current.__belongToDroppable = self;
				}
			}
			return self;
		}

		/**
		 * 为当前可拖拽元素增加一个新的可放置容器
		 *
		 * @param droppable 新增加的容器对象
		 * @param isInit	是否作为初始容器（draggable元素的当前容器）
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
				self.__belongToDroppable = droppable;
			}
			return self;
		}

		if(_supportHTML5DragDrop) {
			/**
			 * 屏蔽当前可拖拽元素的所有A，IMG元素的拖拽行为
			 */
			this._forbidAutoDraggableNodes = function(self) {
				if(self.__canDrag != true) {
					return self;
				}
				//获取子元素
				var subNodes = sys.modules['dom'].getElements(_autoDraggableTags.join(','), self);
				for(var i=0,l=subNodes.length; i<l; i++) {
					subNodes[i].draggable = false;
				}
				return self;
			}
		} else {
			/**
			 * 如果不支持HTML5的拖拽，则不需要屏蔽
			 */
			this._forbidAutoDraggableNodes = function(self) {
				return self;
			}
		}


		/**
		 * 考虑框架页对事件addEvent方法的影响，封装为document元素添加事件的方法
		 * 但是在dom模块中增加了对页面框架模块asyncHTMLManager的判断，不是好的解决方案
		 */	
		this._addEventToDoc = function(self, type, callback, bubble) {
			//如果有页面框架模块，则采用覆盖前的addEvent
			var addEvent = window.asyncHTMLManager ?
				window.asyncHTMLManager.dom.Element.prototype.addEvent : self._doc.addEvent;

			addEvent.call(self.__docForDD, type, callback, bubble);
		}

		/**
		 * 考虑框架页对事件removeEvent方法的影响，封装为document元素删除事件的方法
		 */	
		this._removeEventFromDoc = function(self, type, callback, bubble) {
			//如果有页面框架模块，则采用覆盖前的removeEvent
			var removeEvent = window.asyncHTMLManager ?
				window.asyncHTMLManager.dom.Element.prototype.removeEvent : self._doc.removeEvent;

			removeEvent.call(self.__docForDD, type, callback, bubble);
		}	

		/**
		 * 处理鼠标的点击以后的拖拽行为
		 *
		 * @param e 点击发生时的事件对象
		 */
		this._handleMouseDownForDD = function(self, e) {	
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
			}
			//用于拖拽时，定位元素相对于鼠标指针的位置
			self.__deltaX = mousePos.x - selfPos.x;
			self.__deltaY = mousePos.y - selfPos.y;

			//触发draginit事件，HTML5标准钟并没有此事件，因此暂不触发
			//self.fireEvent('draginit', {dragging:self, event:e});

			//给document的mousemove 和 mouseup加上事件
			self._addEventToDoc('mousemove', self.__binderForDD.checkDragging, false);
			self._addEventToDoc('mouseup', self.__binderForDD.cancel, false);

			//屏蔽拖拽元素的选择行为
			self.__selectionEventName = ua.ua.ie ? 'selectstart' : 'mousedown';
			self._addEventToDoc(self.__selectionEventName, returnFalse, false); 
		}

		/**
		 * 根据鼠标的移动距离，判断是否已经开始拖拽
		 *
		 * 初始情况下为document的mousemove方法添加的是checkDragging，判断是否是拖拽操作
		 * 如果开始拖拽，再将checkDragging改为dragging，正式执行拖拽的功能
		 *
		 * @param e 事件对象
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
			if(distance > 3) {
				//把mousemove由检查拖拽改为执行拖拽，把mouseup由取消改为完成
				self._removeEventFromDoc('mousemove', self.__binderForDD.checkDragging, false);
				self._removeEventFromDoc('mouseup', self.__binderForDD.cancel, false);
				self._addEventToDoc('mousemove', self.__binderForDD.dragging, false);
				self._addEventToDoc('mouseup', self.__binderForDD.finish, false);
			
				//给元素添加拖拽时候的基本样式
				addDraggingStyle(self);

				//触发dragstart事件，参考HTML5规范
				self.fireEvent('dragstart', {dragging:self, event:e});

				//这里也触发所属元素的dropinit事件
				//dropinit不是HTML5规范规定的，但是也是有必要的
				//dragstart, drag, dragend是draggable元素的完整生命周期，
				//但是如果没有dropinit，droppable元素只有dropenter, dropover, dropleave, drop，没有初始状态，不完整
				//具体示例：如果在拖拽初始时需要创建占位元素，如果没有dropinit，就只能针对每一个元素的dragstart编写代码了
				if(self.__belongToDroppable) {
					self.__belongToDroppable.fireEvent('dropinit', {dragging:self, event:e});
				}
			}
		}

		/**
		 * 拖拽时的事件处理方法
		 *
		 * @param e 事件对象
		 */
		this._dragging = function(self, e) {
			//阻止默认事件
			if(e.preventDefault) e.preventDefault();

			//利用鼠标位置，修改拖拽元素的位置
			var mousePos = getMousePos(e);
			self.style.left = (mousePos.x - self.__deltaX) + 'px';
			self.style.top  = (mousePos.y - self.__deltaY) + 'px';
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
				if(current == self.__belongToDroppable) {
					//如果容器是拖拽元素所属容器
					if(isInContainer(containerCoordinates, draggingCoordinates)) {
						//如果还在容器内，说明在所属容器内部移动，触发dragover事件
						current.fireEvent('dragover', {from:current, to:current, dragging:self});
					} else {
						//如果不在容器内，说明从所属容器中移出，触发dragleave事件
						current.fireEvent('dragleave', {from:current, to:null, dragging:self});
						self.__belongToDroppable = null;
					}
				//如果容器不是拖拽元素所属容器
				} else if(isInContainer(containerCoordinates, draggingCoordinates)) {
					//如果拖拽元素所属容器不为空，说明从拖拽容器中脱离出来了(是不是会跟上面事件触发有重复?试验还没出现这种情况)
					if(self.__belongToDroppable) {
						self.__belongToDroppable.fireEvent('dragleave', {from:self.__belongToDroppable, to:current, dragging:self});
					}
					//进入此容器了，触发dragenter
					//注意元素初始情况下会属于某个容器，初始化的时候要记录，避免错误的触发dragenter，mootools貌似没有判断
					current.fireEvent('dragenter', {from:self.__belongToDroppable, to:current, dragging:self});
					self.__belongToDroppable = current;
				}
			}	
		}

		/**
		 * 拖拽完成时调用的方法
		 *
		 * @param e 事件对象
		 */
		this._finishDrag = function(self, e) {
			if(e.preventDefault) e.preventDefault();

			//拖拽已完成，去除给document添加的一系列事件
			self._removeEventFromDoc('mousemove', self.__binderForDD.dragging, false);
			self._removeEventFromDoc('mouseup', self.__binderForDD.finish, false);
			self._removeEventFromDoc(self.__selectionEventName, returnFalse, false); 

			//去除基本的拖拽样式设置
			removeDraggingStyle(self);
			//如果元素属于某个容器，则触发该容器的drop事件
			if(self.__belongToDroppable) {
				self.__belongToDroppable.fireEvent('drop', {dragging:self, event:e});
			}
			//触发dragend事件，按照HTML5的标准，应该在容器drop事件之后触发
			self.fireEvent('dragend', {dragging:self, event:e});
			
			if(ua.ua.chrome) {
				//获取当前位置(应该放在drop和dropend事件之后，因为在这两个事件中可以继续调整元素的位置)
				var pos = self.position();
				//如果没有发生变化，则屏蔽chrome的click事件，避免再次请求页面
				if(pos.x == self.__originX && pos.y == self.__originY) {
					self.addEvent('click', fixChromeClick, false);
				}	
			}
		}

		/**
		 * 取消拖拽操作，在checkDragging的过程中已经释放鼠标，说明并不是拖拽
		 *
		 * @param e 事件对象
		 */
		this._cancelDrag = function(self, e) {
			//去除为document添加的所有事件
			self._removeEventFromDoc('mousemove', self.__binderForDD.checkDragging, false);
			self._removeEventFromDoc('mouseup', self.__binderForDD.cancel, false);
			self._removeEventFromDoc(self.__selectionEventName, returnFalse, false); 

			//触发取消事件（HTML5中没有此事件，Mootools中有）
			self.fireEvent('cancel', {dragging:self, event:e});	
		}

		/********************************* DragDrop的辅助方法 ************************************/

		/**
		 * 为屏蔽Chrome下拖拽再放回原处认为是单击的问题，这里将click事件进行屏蔽
		 *
		 * @param e 事件对象
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
		 * @param element 拖拽的元素
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
		 * @param element 拖拽的元素
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
		 * @param ev 事件对象
		 */ 
		function getMousePos(ev) {
			return {
				x : (ev.pageX != null) ? ev.pageX : ev.clientX + document.body.scrollLeft - document.body.clientLeft,
				y : (ev.pageY != null) ? ev.pageY : ev.clientY + document.body.scrollTop  - document.body.clientTop
			};		
		}

		/**
		 * 根据两个坐标位置，判断dragging是否在container中
		 *
		 * @param container 容器
		 * @param dragging  拖拽元素
		 *
		 * TODO 目前只是简单的判断了垂直方向的位置，还应该引入更加完善的判断方式
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
		 * @param style 属性名称
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
		 * 此方法来自网络，需要参考标准获取方法和其他框架内容，再完善 
		 * @return 形如{x:xxx, y:xxx}的位置信息对象，x是横向坐标，y是纵向坐标
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

});
