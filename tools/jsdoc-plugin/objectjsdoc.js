var Token = Packages.org.mozilla.javascript.Token;

var currentModule;

// 修改源文件加入一个comment（会触发jsdocCommentFound，进而触发newDoclet）
// 保证object.add可以触发一个newDoclet
exports.beforeParse = function(e) {
	if (!e.source.match(/\*\/object.add/)) { // object.add前面没有注释
		e.source = e.source.replace(/object.add\(['"](.+?)['"]/g, '/**@module\n@name $1*/object.add("$1"');
	}
};

exports.symbolFound = function(e) {
	var node = e.astnode;
	// object.add的symbolFound被触发时，module的注释已经出发了newDoclet，因此通过currentModule这个变量存储之前已经创建的doclet，再进行修改
	// 完善其name、requires等信息
	if (currentModule && node.parent && node.parent.type == Token.CALL && node.parent.target.toSource() == 'object.add') {
		node = node.parent;
		var moduleName = String(node.arguments.get(0).value);
		var requires, factory;
		if (node.arguments.size() < 3) {
			requires = null;
			factory = node.arguments.get(0);
		} else {
			var ele = node.arguments.get(1);
			if (ele.type == Token.STRING) {
				requires = String(ele.value).split(/\s*,\s*/g);
			} else if (ele.type == Token.ARRAYLIT){
				requires = [];
				var eles = ele.getElements();
				for (var i = 0, name; i < eles.size(); i++) {
					requires.push(String(eles.get(i).value));
				}
			}
			factory = node.arguments.get(2);
		}
		if (requires) {
			currentModule.requires = [];
			requires.forEach(function(one) {
				currentModule.requires.push('module:' + one);
			});
		}
		currentModule.name = moduleName;
		currentModule.longname = 'module:' + moduleName;
	}
};

exports.newDoclet = function(e) {
	var doclet = e.doclet;
	var code = doclet.meta.code;
	var targetName = (code.node && code.node.target)? code.node.target.toSource() : null;
	var owner = findOwner.call(this, doclet);

	if (owner) {
		// owner目前只能找到class，将class中的成员设置正确的memberof
		doclet.setMemberof(owner.longname);
	}

	if (doclet.kind == 'module') {
		currentModule = doclet;

	} else if (['NEW', 'CALL'].indexOf(code.type) != -1 && targetName == 'Class') {
		makeClass.call(this, doclet);

	} else if (doclet.name == '__mixes__' && owner && owner.kind == 'class') {
		makeMixins.call(this, doclet, owner);

	} else if (code.type == 'CALL' && targetName == 'property' && owner && owner.kind == 'class') {
		makeProperty.call(this, doclet, owner);

	} else if (code.type == 'CALL' && targetName == 'staticmethod' && owner && owner.kind == 'class') {
		makeStaticMethod.call(this, doclet, owner);

	} else if (code.type == 'CALL' && targetName == 'classmethod' && owner && owner.kind == 'class') {
		makeClassMethod.call(this, doclet, owner);

	} else if (code.type == 'FUNCTION' && owner && owner.kind == 'class') {
		makeInstanceMethod.call(this, doclet, owner);

	} else if (owner && owner.kind == 'class') {
		setAccess(doclet);
	}
};

function findOwner(doclet) {
	var node = doclet.meta.code.node;
	var classNode;
	if (node && node.enclosingFunction && node.enclosingFunction.parent) classNode = node.enclosingFunction.parent;
	if (classNode && [Token.NEW, Token.CALL].indexOf(classNode.type) !== -1 && classNode.target.toSource() == 'Class') {
		return this.refs['astnode' + classNode.hashCode()];
	}
	return null;
}

function setAccess(doclet) {
	if (doclet.name.indexOf('__') == 0) {
		doclet.access = 'private';
	} else if (doclet.name.indexOf('_') == 0) {
		doclet.access = 'protect';
	} else {
		doclet.access = 'public';
	}
}

function makeMixins(doclet, classDoclet) {
	var node = doclet.meta.code.node;
	if (node.type == Token.ARRAYLIT) {
		var elements = node.getElements();
		for (var i = 0, name; i < elements.size(); i++) {
			name = String(elements.get(i).toSource());
			if (doclet.memberof) {
				name = name.replace(/^(exports)/g, doclet.memberof);
			}
			classDoclet.mix(name);
		}
	}
}

function makeClass(doclet) {
	var node = doclet.meta.code.node;
	var parent, factory;
	if (node.arguments.size() < 2) {
		parent = null;
		factory = node.arguments.get(0);
	} else {
		parent = String(node.arguments.get(0).toSource());
		factory = node.arguments.get(1);
	}
	if (parent && doclet.memberof && !doclet.undocumented) {
		parent = parent.replace(/^(this|exports)/g, doclet.memberof);
		if (parent.indexOf('.') != -1 && parent.indexOf('module:') == -1) {
			parent = 'module:' + parent;
		}
		doclet.addTag('augments', parent);
	}
	doclet.kind = 'class';
}

function makeProperty(doclet, classDoclet) {
	var node = doclet.meta.code.node;
	// TODO 目前的jsdoc如果scope是instance，会导致生成很多带有#的文件，应该是一个bug，暂时用instancemethod代替scope
	doclet.scope = 'property';
	setAccess(doclet);
	if (!classDoclet.properties) {
		classDoclet.properties = [];
	}
	classDoclet.properties.push({
		name: doclet.name,
		description: doclet.description
	});
	// 没有第二个setter参数
	if (node.arguments.size() < 2) {
		doclet.readonly = true;
	}
}

function makeStaticMethod(doclet, classDoclet) {
	doclet.kind = 'function';
	doclet.scope = 'staticmethod';
	setAccess(doclet);
}

function makeClassMethod(doclet, classDoclet) {
	doclet.kind = 'function';
	doclet.scope = 'classmethod';
	setAccess(doclet);
	// 删掉cls参数
	if (doclet.params && doclet.params[0].name != 'cls') {
		doclet.params.shift();
	}
}

function makeInstanceMethod(doclet, classDoclet) {
	// TODO 目前的jsdoc如果scope是instance，会导致生成很多带有#的文件，应该是一个bug，暂时用instancemethod代替scope
	doclet.scope = 'instancemethod';
	setAccess(doclet);
	// 删掉self参数
	if (doclet.params && doclet.params[0].name == 'self') {
		doclet.params.shift();
	}
}
