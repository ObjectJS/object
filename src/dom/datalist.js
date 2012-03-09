object.add('dom.datalist', 'dom, ua, sys', function(exports, dom, ua, sys) {

	var KEY = {
		UP: 38,
		DOWN: 40,
		DEL: 46,
		TAB: 9,
		ENTER: 13,
		ESC: 27,
		BACKSPACE: 8
	};

	var defaultOptions = {
		maxHeight: 190,
		maxCharCount: 150,
		dynamic: false,
		matchFirst : false
	}

	this.DataList = new Class(function() {

		this.initialize = function(self, options) {
			var datalistId = self.getAttribute('list');
			if (!document.getElementById(datalistId)) {
				return;
			}
			self.initOptions(options);
			self._set('autocomplete', 'off');
			self.bindInputEvent();
		};

		this.initOptions = function(self, options) {
			self.options = object.extend(defaultOptions, options);
		}

		this.bindInputEvent = function(self) {
			self.addEvent('focus', function(e) {
				if (!self.isDisplayed() && !self.focusFromContainer) {
					self.showDataList();
				}
				if (self.focusFromContainer) {
					self.focusFromContainer = false;
				}
			}, false);

			self.addEvent('blur', function(e) {
				if (self.clickOnContainer) {
					self.clickOnContainer = false;
				} else {
					self.hideDataList();
				}
			}, false);

			self.addEvent('keydown', function(e) {
				if (!self.isDisplayed()) {
					return;
				}
				var keyCode = e.keyCode;
				switch (keyCode) {
					case KEY.UP : 
						e.preventDefault();
						self.previous();
						self.getFocus();
						break;
					case KEY.DOWN : 
						e.preventDefault();
						self.next();
						self.getFocus();
						break;
					case KEY.ENTER : 
						e.preventDefault();
						if (self._li) {
							self.value = self._li.getAttribute('real_value');
						}
						self.hideDataList();
						return false;
					case KEY.ESC : 
						self.hideDataList();
						break;
					default:
						break;
				}
			}, false);

			self.addEvent('keyup', function(e) {
				var keyCode = e.keyCode;
				switch (keyCode) {
					case KEY.UP : 
					case KEY.DOWN : 
					case KEY.ENTER : 
					case KEY.ESC : 
						break;
					default:
						self._li = null;
						self.filter();
						break;
				};
			}, false);
		}

		this.getFocus = function(self) {
			setTimeout(function() {
				self.focusToPosition(self.value.length);
			}, 0);
		};

		this.previous = function(self) {
			var scrollIndex = 0, direction = 'up', list = self._list, len = list.length, scrollIndex = len - 1;
			if (!self._li) {
				self._li = list[len - 1];
			} else {
				for(var i = 0; i < len; i++) {
					if (list[i] === self._li) {
						StyleUtil.remove(self._li);
						self._li = list[(i == 0 ? len - 1 : i - 1)];
						scrollIndex = (i == 0 ? len - 1 : i - 1);
						break;
					}
				}
			}
			StyleUtil.add(self._li);
			//self.value = self._li.getAttribute('real_value');
			self.scrollTo(scrollIndex, direction);
		};

		this.next = function(self) {
			var scrollIndex = 0, direction = 'down', list = self._list;
			if (!self._li) {
				self._li = list[0];
			} else {
				var len = list.length;
				for(var i = 0; i < len; i++) {
					if (list[i] === self._li) {
						StyleUtil.remove(self._li);
						self._li = list[(i == len - 1 ? 0 : i + 1)];
						scrollIndex = (i == len - 1 ? 0 : i + 1);
						break;
					}
				}
			}
			StyleUtil.add(self._li);
			//self.value = self._li.getAttribute('real_value');
			self.scrollTo(scrollIndex, direction);
		};

		this.scrollTo = function(self, index, direction) {
			var scrollTop = self._ul.scrollTop;
			var scrolled = scrollTop / self._liOffsetHeight;
			var count = self._ul.offsetHeight / self._liOffsetHeight - 1;
			var list = self._list;
			var start = scrolled;
			var end = scrolled + count;
			var shouldScroll = -1;
			if (direction == 'down') {
				if (index == 0) {
					shouldScroll = 0; 
				} else if (index > end) {
					shouldScroll = scrollTop + list[index].offsetHeight;
				}
			} else if (direction == 'up') {
				if (index == list.length - 1) {
					shouldScroll = list.length * self._liOffsetHeight; 
				} else if (index < start) {
					shouldScroll = scrollTop - list[index].offsetHeight; 
				}
			}
			if (shouldScroll != -1) {
				self._ul.scrollTop = shouldScroll;
			}
		};

		var StyleUtil = {
			add : function(li) {
				li.style.backgroundColor = '#316AC5';
				li.style.color = 'white';
				li.style.cursor = 'pointer';
			},
			remove : function(li) {
				if (li) {
					li.style.backgroundColor = 'white';
					li.style.color = 'black';
					li.style.cursor = 'auto';
				}
			}
		};

		var templates = {};
		templates.list = 
			'<ul style="list-style:none;margin:0;padding:0;z-index:4;position:relative;">' + 
				'{{#data}}<li real_value="{{value}}">{{text}}</li>{{/data}}' + 
			'</ul>';
		templates.html = 
			'<div id="datalistContainer" style="border:1px solid gray;position:absolute;z-index:3;left:{{left}}px;top:{{top}}px;background:#fff;font-size:small;">{{#ie6}}<iframe id="datalist_iframe" frameBorder="0" style="position:absolute;z-index:2;top:0px;left:0px;overflow:hidden;display:block;filter:Alpha(Opacity=0);" src="javascript:false;"></iframe>{{/ie6}}</div>';

		this.showDataList = function(self) {
			var data = self.getListData();
			var value = self.value.trim();
			if (value.length != 0) {
				data = data.filter(function(ele) {
					return ele.value.toLowerCase().indexOf(value.toLowerCase()) != -1;
				});
			}
			if (!self._container) {
				var pos = position(self);
				var output = Mustache.to_html(templates.html, {
					ie6 : ua.ua.ie <= 6,
					top : pos.y + self.offsetHeight,
					left : pos.x
				});
				var node = dom.getDom(output);
				if (self.nextSibling) {
					self.parentNode.insertBefore(node, self.nextSibling);
				} else {
					self.parentNode.appendChild(node);
				}
				self._container = dom.id('datalistContainer');
				self.bindEvents();
			}
			
			self.filter();
		}

		this.isDisplayed = function(self) {
			return self._container && self._container.style.display != 'none';
		}

		this.filter = function(self) {
			var data = self.getListData();
			var value = self.value.trim();
			if (value != "") {
				data = data.filter(function(ele) {
					if (self.options.matchFirst) {
						return ele.value.toLowerCase().indexOf(value.toLowerCase()) == 0;
					} else {
						return ele.value.toLowerCase().indexOf(value.toLowerCase()) != -1;
					}
				});
			}

			var ulHtml = Mustache.to_html(templates.list, {
				data: data
			});

			var node = dom.getDom(ulHtml);
			if (self._ul) {
				self._container.removeChild(self._ul);
				self._ul = null;
			}
			self._container.appendChild(node);
			self._ul = dom.getElement('ul', self._container);
			self._list = dom.getElements('li', self._ul);

			if (data.length == 0) {
				self._container.style.display = 'none';
			} else {
				if (!self._liOffsetHeight) {
					self._liOffsetHeight = self._list[0].offsetHeight;
				}
				self._container.style.display = '';
				self.adjust();
			}
		}

		this.adjust = function(self) {
			var ul = self._ul, 
				inputOffsetWidth = self.offsetWidth, 
				ulOffsetWidth = ul.offsetWidth;
			ul.style.maxHeight = self.options.maxHeight + 'px';
			ul.style.minWidth = self._container.style.minWidth = inputOffsetWidth + 'px';
			ul.style.overflow = 'auto';

			var listHeight = self._list.length * self._liOffsetHeight;
			var isScrolled = listHeight > self.options.maxHeight;
			ul.style.width = ulOffsetWidth + (isScrolled ? 20 : 0) + 'px';

			if (ua.ua.ie) {
				ul.style.height = (isScrolled ? self.options.maxHeight : listHeight) + 'px';

				if (ulOffsetWidth < inputOffsetWidth) {
					ul.style.width = inputOffsetWidth + 'px';
				}
				if (ua.ua.ie <= 6) {
					if (!self._iframe) {
						self._iframe = dom.getElement('#datalist_iframe', self._container);
					}
					self._iframe.style.width = self._container.offsetWidth - 2 + 'px';
					self._iframe.style.height = self._container.offsetHeight - 2 + 'px';
				}
			}
		}

		this.bindEvents = function(self) {
			var container = self._container;
			container.delegate('li', 'mouseover', function(e) {
				if (self._li) {
					StyleUtil.remove(self._li);
				}
				var li = e.target;
				self._li = li;
				StyleUtil.add(li);
			});

			container.delegate('li', 'mouseout', function(e) {
				//var li = e.target;
				//var relatedTarget = e.relatedTarget;
				//if (relatedTarget.tagName == 'LI') {
					StyleUtil.remove(self._li);
					self._li = null;
				//}
			});

			self._handlerFlag = false;

			container.addEvent('mousedown', function(e) {
				self.clickOnContainer = true;
				if (!self._handlerFlag && isSubNode(e.target, self._container)) {
					self._handlerFlag = true;
					dom.wrap(document).addEvent('mousedown', function(e) {
						var target = e.target;
						if (target !== self && !isSubNode(target, self._container)) {
							self._handlerFlag = false;
							self.clickOnContainer = false;
							self.hideDataList();
							document.removeEvent('mousedown', arguments.callee, false);
						}
					}, false);
				}
			}, false);

			//container.addEvent('mouseup', function(e) {
			//	self.clickOnContainer = false;
			//}, false);

			container.addEvent('click', function(e) {
				self.getFocus();
			}, false);

			container.delegate('li', 'click', function(e) {
				self.value = e.target.getAttribute('real_value');
				self.focusFromContainer = true;
				self.getFocus();
				self.hideDataList();
			});
		}

		function isSubNode(node, container) {
			var tagName = null;
			while(node) {
				tagName = node.tagName;
				if (tagName === 'BODY' || tagName === 'HTML') {
					return false;
				}
				if (node === container) {
					return true;
				}
				node = node.parentNode;
			}
			return false;
		}

		this.hideDataList = function(self) {
			if (self._container) {
				self._container.style.display = 'none';
				self._li = null;
			}
		}

		this.getListData = function(self) {
			if (!self.options.dynamic && self.data) {
				return self.data;
			}
			var datalistId = self.getAttribute('list');
			var options = dom.getElements('#' + datalistId + ' option');
			if (options.length === 0) {
				throw new Error('浏览器不支持datalist属性或不存在' + datalistId + '对应的datalist');
			}
			var result = [];
			for (var i = 0, l = options.length, current, value; i < l; i++) {
				current = options[i];

				value = current.getAttribute('value') || current.value;
				if (value.trim().length > self.options.maxCharCount) {
					result[result.length] = {value:value,text:value.substring(0, self.options.maxCharCount - 3) + '...'};
				} else {
					result[result.length] = {value:value,text:value};
				}
			}
			if (!self.options.dynamic) {
				self.data = result;
			}
			return result;
		}

		function position(e) {
			var left = 0;
			var top  = 0;

			while (e) {
				left += e.offsetLeft;
				top  += e.offsetTop;
				e = e.offsetParent;
			}

			return {x:left, y:top};
		}
	});
});
