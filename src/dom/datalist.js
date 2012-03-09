// TODO 注意可能存在的属性名称冲突
object.add('dom.datalist', 'dom, ua, sys', function(exports, dom, ua, sys) {

	// 定义键位与名称的映射
	var KEY = {
		UP: 38,
		DOWN: 40,
		DEL: 46,
		TAB: 9,
		ENTER: 13,
		ESC: 27,
		BACKSPACE: 8
	};

	// 一些默认设置（貌似不能通过传参来设置）
	var defaultOptions = {
		maxHeight: 190,
		maxCharCount: 150,
		dynamic: false,
		matchFirst : false
	}

	/**
	 * 数据列表实现类，模拟HTML5的input元素的list属性
	 */
	this.DataList = new Class(function() {

		/**
		 * 初始化方法，判断list属性是否存在，并调用init方法
		 */
		this.initialize = function(self) {
			var datalistId = self.getAttribute('list');
			if (datalistId == null) {
				return;
			} else if(!document.getElementById(datalistId)) {
				throw new Error('list属性设置错误' + datalistId);
			}
			self.init();
		};

		/**
		 * 初始化方法
		 */
		this.init = function(self) {
			self.initOptions(defaultOptions);
			// 屏蔽浏览器默认的自动提示
			self._set('autocomplete', 'off');
			// 为input元素绑定事件
			self.bindEventForInput();
		}

		/**
		 * 定义list property，使得能够利用getter/setter设置input的list属性
		 *
		 * @param {String} list datalist元素的id属性
		 */
		this.list = property(function(self) {
			return self.getAttribute('list');
		}, function(self, list) {
			self._set('list', list);
			self.setAttribute('list', list);
			if (list && document.getElementById(list)) {
				self.init();
			}
		});

		/**
		 * 初始化options属性
		 * @param {Object} options 属性设置
		 */
		this.initOptions = function(self, options) {
			self.options = object.extend(defaultOptions, options);
		}

		/**
		 * 为input绑定事件，包括focus、blur、keydown、keyup等
		 */
		this.bindEventForInput = function(self) {
			// 获取焦点时显示列表
			self.addEvent('focus', function(e) {
				if (!self.isDisplayed() && !self.focusFromContainer) {
					self.showDataList();
				}
				if (self.focusFromContainer) {
					self.focusFromContainer = false;
				}
			}, false);

			// 焦点移除时隐藏列表
			self.addEvent('blur', function(e) {
				if (self.clickOnContainer) {
					self.clickOnContainer = false;
				} else {
					self.hideDataList();
				}
			}, false);

			// 键盘按键点击时的处理
			self.addEvent('keydown', function(e) {
				if (!self.isDisplayed()) {
					return;
				}
				var keyCode = e.keyCode;
				switch (keyCode) {
					case KEY.UP : 
						// 向上则选择上一条
						e.preventDefault();
						self.previous();
						self.getFocus();
						break;
					case KEY.DOWN : 
						// 向下则选择下一条
						e.preventDefault();
						self.next();
						self.getFocus();
						break;
					case KEY.ENTER : 
						// 回车则选择当前项，并且隐藏列表
						e.preventDefault();
						if (self._li) {
							self.value = self._li.getAttribute('real_value');
						}
						self.hideDataList();
						// 屏蔽表单的默认提交
						return false;
					case KEY.ESC : 
						// ESC键隐藏列表
						self.hideDataList();
						break;
					default:
						break;
				}
			}, false);

			// keyup的时候才能正确处理字符输入
			self.addEvent('keyup', function(e) {
				var keyCode = e.keyCode;
				// TODO 判断keyCode是否是字符输入
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

		/**
		 * 让input获取焦点
		 */
		this.getFocus = function(self) {
			setTimeout(function() {
				self.focusToPosition(self.value.length);
			}, 0);
		};

		/**
		 * 选择上一条记录
		 */
		this.previous = function(self) {
			var scrollIndex = 0, direction = 'up', list = self._list, len = list.length, scrollIndex = len - 1;
			if (!self._li) {
				self._li = list[len - 1];
			} else {
				for(var i = 0; i < len; i++) {
					if (list[i] === self._li) {
						rmStyle(self._li);
						self._li = list[(i == 0 ? len - 1 : i - 1)];
						scrollIndex = (i == 0 ? len - 1 : i - 1);
						break;
					}
				}
			}
			addStyle(self._li);
			//self.value = self._li.getAttribute('real_value');
			self.scrollTo(scrollIndex, direction);
		};

		/**
		 * 选择下一条记录
		 */
		this.next = function(self) {
			var scrollIndex = 0, direction = 'down', list = self._list;
			if (!self._li) {
				self._li = list[0];
			} else {
				var len = list.length;
				for(var i = 0; i < len; i++) {
					if (list[i] === self._li) {
						rmStyle(self._li);
						self._li = list[(i == len - 1 ? 0 : i + 1)];
						scrollIndex = (i == len - 1 ? 0 : i + 1);
						break;
					}
				}
			}
			addStyle(self._li);
			//self.value = self._li.getAttribute('real_value');
			self.scrollTo(scrollIndex, direction);
		};

		/**
		 * 控制滚动条滚动到选中的数据项上
		 * @param {int} index 选中项的索引
		 * @param {String} direction 按键的方向（up/down）
		 */
		this.scrollTo = function(self, index, direction) {
			// TODO 干掉这一堆var
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

		function addStype(li) {
			if (li) {
				li.style.backgroundColor = '#316AC5';
				li.style.color = 'white';
				li.style.cursor = 'pointer';
			}
		}

		function rmStyle(li) {
			if (li) {
				li.style.backgroundColor = 'white';
				li.style.color = 'black';
				li.style.cursor = 'auto';
			}
		}

		var templates = {
			list : '<ul style="list-style:none;margin:0;padding:0;z-index:4;position:relative;">' + 
						'{{#data}}<li real_value="{{value}}">{{text}}</li>{{/data}}' + 
				   '</ul>',
			//ie6下只有一条记录的时候会出现滚动条 https://github.com/brandonaaron/bgiframe/blob/master/jquery.bgiframe.js
			html : '<div id="datalistContainer" style="border:1px solid gray;position:absolute;z-index:3;left:{{left}}px;top:{{top}}px;background:#fff;font-size:small;">{{#ie6}}<iframe id="datalist_iframe" frameBorder="0" style="position:absolute;z-index:2;top:0px;left:0px;overflow:hidden;display:block;filter:Alpha(Opacity=0);" src="javascript:false;"></iframe>{{/ie6}}</div>'
		};

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
				self.bindEventForContainer();
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

		this.bindEventForContainer = function(self) {
			var container = self._container;
			container.delegate('li', 'mouseover', function(e) {
				if (self._li) {
					rmStyle(self._li);
				}
				var li = e.target;
				self._li = li;
				addStyle(li);
			});

			container.delegate('li', 'mouseout', function(e) {
				//var li = e.target;
				//var relatedTarget = e.relatedTarget;
				//if (relatedTarget.tagName == 'LI') {
					rmStyle(self._li);
					self._li = null;
				//}
			});

			self._handlerFlag = false;

			//点击滚动条不会mouseup  通过监听下一次mousedown的位置来确定是否隐藏 参考jquery autocomplete
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
			var datalistId = self.get('list');
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
