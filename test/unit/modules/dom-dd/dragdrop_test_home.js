// 复制这段JS，打开v5首页，在控制台运行，并拖拽左侧菜单元素

XN.dom.ready(function () {
var container = document.getElementById('site-menu-nav'),
	section = container.getElementsByTagName('section')[0];
	section.dropzone = 'test-drop-zone';
	
	var elements = Sizzle('.nav-item', section);
	for(var i=0; i<elements.length; i++) {
		elements[i].draggable = true;
	}

object.use('dom', function(exports, dom) {
	section = dom.wrap(section);

	function makeElementsDraggableInContainer(container) {
		container.cloneNode = null;
		var elements = dom.getElements('.nav-item', container);
		for(var i=0,l=elements.length; i<l; i++) {
			handleDrag(elements[i], container);
		}
		return elements;
	}

	function handleDrag(element, container) {
		element.addEvent('dragstart', function(e) {
			container.elements = dom.getElements('.nav-item', container);
			container.cloneNode = createDelegate(element);
			container.insertBefore(container.cloneNode, element.nextSibling);
		}, false);
		element.addEvent('drag', function(e) {
			var element = e.dragging;
			var draggingTop = element.position().y;
			var draggingHeight = parseInt(element.offsetHeight);
			var elements = container.elements;
			for(var k=0,length=elements.length; k < length; k++) {
				if(elements[k] === element) {
					continue;
				}
				//判断原则还需要调整一下 TODO
				if(elements[k].position().y - draggingTop > draggingHeight/2) {
					container.insertBefore(container.cloneNode, elements[k]);
					break;
				}
			}
			if(k == length) {
				//如果可拖拽元素后还有不可拖拽的元素
				var node = elements[length - 1].nextSibling;
				if(node) {
					container.insertBefore(container.cloneNode, node);
				} else {
					container.appendChild(container.cloneNode);
				}
			}
		}, false);
		element.addEvent('dragend', function(e) {
			//console.log('dragend');
			if(container.cloneNode) {
				container.replaceChild(e.dragging, container.cloneNode);
				container.cloneNode = null;
				container.elements = null;
			}
		}, false);	
	}
	makeElementsDraggableInContainer(section);

	function addListeners(section) {
		section.addEvent('dropinit', function(e) {
			//console.log('dropinit');
		}, false);
		section.addEvent('dragover', function(e) {
			//console.log('dragover');
		}, false);
		section.addEvent('drop', function(e) {
			//console.log('drop');
		}, false);
		section.addEvent('dragleave', function(e) {
			//console.log('dragleave');
		}, false);
		section.addEvent('dragenter', function(e) {
			//console.log('dragenter', e);
		}, false);	
	}
	addListeners(section);
	function createDelegate(element) {
		var cloneNode = document.createElement('div');
		cloneNode.style.width = element.offsetWidth - 2 + 'px';
		cloneNode.style.height = element.offsetHeight - 2 + 'px';      
		cloneNode.style.border = '1px dashed gray';	
		return cloneNode;
	}
});
});
