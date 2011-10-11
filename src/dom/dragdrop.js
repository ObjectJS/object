/**
 * @namespace
 * @name dom
 */
object.add('dd', 'ua, events', /**@lends dom*/ function(exports, ua, events) {

var _supportHTML5Drag = false;
var _supportHTML5Drop = false;
/**
 * @class
 * @name dom.Element
 */
var DragDrop = this.DragDrop = new Class(/**@lends dom.Element*/ function() {

	Class.mixin(this, events.Events);

	var properties = ['display', 'position', 'width', 'height', 'border', 
		'backgroundColor', 'filter', 'opacity', 'zIndex', 'left', 'top'];

	this.initialize = function(self) {
		if (self.get('draggable') == true 
			&& (self.tagName != 'IMG' && self.tagName != 'A')) {
			self.__doc = wrap(document);
			self.__binder = {
				checkDragging : self.__checkDragging.bind(self),
				cancel : self.__cancel.bind(self),
				dragging: self.__dragging.bind(self),
				stop : self.__stop.bind(self)
			}
			self.set('draggable', true);
		}
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
			self._set('draggable', draggable);
			if(draggable) {
				if(self.__canDrag == true) {
					return;
				}
				self.addEvent('mousedown', self.__handleMouseDown, false);
				self.__canDrag = true;
				self.__droppables = [];
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
					self.removeEvent('mousedown', self.__handleMouseDown, false);
					self.__belongTo = null;
					self.__droppables = null;
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

	this.addDroppable = function(self, droppable, isInit) {
		isInit = isInit || false;
		if(self.__canDrag != true) {
			return;
		}
		self.__droppables = self.__droppables || [];
		self.__droppables.push(droppable);
		if(isInit) {
			self.__belongTo = droppable;
		}
	}

	/**
	 * 处理鼠标的点击以后的拖拽行为
	 */
	this.__handleMouseDown = function(self, e) {	
		//阻止默认行为，让代码控制拖拽行为
		if(e.preventDefault) e.preventDefault();
		if(e.stopPropagation) e.stopPropagation();
		
		var pos = getMousePos(e);
		var pos2 = self.position();
		self.__originX = pos.x;
		self.__originY = pos.y;
		self.__deltaX = pos.x - pos2.x;
		self.__deltaY = pos.y - pos2.y;
		//self.fireEvent('draginit', {ele:self, event:e});
		//给document的mousemove 和 mouseup加上事件
		self.__doc.addEvent('mousemove', self.__binder.checkDragging, false);
		self.__doc.addEvent('mouseup', self.__binder.cancel, false);
		if(ua.ua.ie) {
			self.__doc.addEvent('selectstart', eventStop, false); 
		} else {
			self.__doc.addEvent('mousedown', eventStop, false);
		}
	}

	this.__checkDragging = function(self, e) {
		var pos = getMousePos(e);
		var distance = Math.round(Math.sqrt(Math.pow(pos.x - self.__originX, 2) + 
				Math.pow(pos.y - self.__originY, 2)));
		if(distance > 2) {
			self.__doc.removeEvent('mousemove', self.__binder.checkDragging, false);
			self.__doc.removeEvent('mouseup', self.__binder.cancel, false);
			self.__doc.addEvent('mousemove', self.__binder.dragging, false);
			self.__doc.addEvent('mouseup', self.__binder.stop, false);
			addDraggingStyle(self);
			self.fireEvent('dragstart', {dragging:self, event:e});
			if(self.__belongTo) {
				self.__belongTo.fireEvent('dropinit', {dragging:self, event:e});
			}
		}
	}

	this.__dragging = function(self, e) {
		if(e.preventDefault) e.preventDefault();
		var pos = getMousePos(e);
		self.style.left = (pos.x - self.__deltaX) + 'px';
		self.style.top  = (pos.y - self.__deltaY) + 'px';
		self.fireEvent('drag', {dragging:self, event:e});

		var mousePos = getMousePos(e);
		var selfPos = self.position();
		var width = parseInt(self.getStyle('width'));
		var height = parseInt(self.getStyle('height'));
		var draggingCoordinates = {
			top: selfPos.y,
			left: selfPos.x,
			right: selfPos.x + width,
			bottom: selfPos.y + height
		}

		for(var i=0,current,currentPos,l=self.__droppables.length; i<l; i++) {
			current = self.__droppables[i];
			currentPos = current.position();
			width = parseInt(current.getStyle('width'));
			height = parseInt(current.getStyle('height'));

			var containerCoordinates = {
				top: currentPos.y,
				left: currentPos.x,
				right: currentPos.x + width,
				bottom: currentPos.y + height
			}
			
			if(current == self.__belongTo) {
				if(isInContainer(containerCoordinates, draggingCoordinates)) {
					current.fireEvent('dragover', {from:current, to:current, dragging:self});
				} else {
					current.fireEvent('dragleave', {from:current, to:null, dragging:self});
					self.__belongTo = null;
				}
			} else {
				if(isInContainer(containerCoordinates, draggingCoordinates)) {
					if(self.__belongTo) {
						self.__belongTo.fireEvent('dragleave', {from:self.__belongTo, to:current, dragging:self});
					}
					current.fireEvent('dragenter', {from:self.__belongTo, to:current, dragging:self});
					self.__belongTo = current;
				}
			}
		}	
	}

	this.__stop = function(self, e) {
		self.__doc.removeEvent('mousemove', self.__binder.dragging, false);
		self.__doc.removeEvent('mouseup', self.__binder.stop, false);
		if(ua.ua.ie) {
			self.__doc.removeEvent('selectstart', eventStop, false); 
		} else {
			self.__doc.removeEvent('mousedown', eventStop, false); 
		}
		removeDraggingStyle(self);
		if(self.__belongTo) {
			self.__belongTo.fireEvent('drop', {dragging:self, event:e});
		}
		self.fireEvent('dragend', {dragging:self, event:e});
		return false;
	}

	this.__cancel = function(self, e) {
		self.__doc.removeEvent('mousemove', self.__binder.checkDragging, false);
		self.__doc.removeEvent('mouseup', self.__binder.cancel, false);
		if(ua.ua.ie) {
			self.__doc.removeEvent('selectstart', eventStop, false); 
		} else {
			self.__doc.removeEvent('mousedown', eventStop, false); 
		}
		self.fireEvent('cancel', {dragging:self, event:e});	
	}

	this.addDraggables = function(self, draggables, isInit) {
		if(self.__canDrop != true) {
			throw new Error('can not drop');
		}
		isInit = isInit || false;
		if(!self.__draggables) {
			self.__draggables = [];
		}
		for(var i=0; i<draggables.length; i++) {
			if(!draggables[i]._canDrag) {
				continue;
			} 
			self.__draggables.push(draggables[i]);
			draggables[i].addDroppable(self);
			if(isInit) {
				draggables[i]._belongTo = self;
			}
		}
	}
	
	function addDraggingStyle(element) {
		element.oldStyle = {};
		var currentStyle = element.style;
		properties.forEach(function(prop) {
			element.oldStyle[prop] = currentStyle[prop];
		});
		element.style.display = 'block';
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

	function removeDraggingStyle(element) {
		properties.forEach(function(prop) {
			element.style[prop] = element.oldStyle[prop];
		});
		element.oldStyle = null;
	}

	function getMousePos(ev) {
		if(ev.pageX || ev.pageY) {
			return {x:ev.pageX, y:ev.pageY};
		}
		return {
			x:ev.clientX + document.body.scrollLeft - document.body.clientLeft,
			y:ev.clientY + document.body.scrollTop  - document.body.clientTop
		};
	}

	function isInContainer(container, dragging) {
		if(dragging.bottom < container.top) {
			return false;
		}
		if(dragging.top > container.bottom) {
			return false;
		}
		return true;
	}

	function eventStop() {
		return false;
	}

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

	//TODO 改成property
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
			return {x:box.left + scrollLeft, y:box.top + scrollTop};
		} else if(document.getBoxObjectFor) {    // gecko
			box = document.getBoxObjectFor(self);            
			var borderLeft = (self.style.borderLeftWidth)?parseInt(self.style.borderLeftWidth):0;
			var borderTop = (self.style.borderTopWidth)?parseInt(self.style.borderTopWidth):0; 
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
