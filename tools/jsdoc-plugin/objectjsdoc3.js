/**
 * objectjs的jsdoc扩展
 *
 * 主要改进：
 * 1、修改了模块注释的插入方式，原来的方式忽略了针对模块的原有注释内容，并且使得代码行数对不上，现在的方式保留了模块的注释
 * 2、增加了mixin的支持，通过__mixins__和Class.mixin的方式增加的mixin都能识别
 * 3、为模块和类的成员自动添加注释，避免模块内容因为没有jsdoc而缺失注释
 * 4、利用备份信息的方式，避免了继承或者mixin时，父类的jsdoc还没有生成导致依赖缺失的情况
 * 5、通过将源代码进行逐字分析，避免了注释中存在object.add('window', 'sys'...)导致的jsdoc注释错误
 * 6、部分支持var A = this.A = new Class(function(){})，this.A = this.B的句式的jsdoc生成
 * 7、支持this.prop = a ? property() : property()的句式的jsdoc生成
 * 8、增加了在模块中var A = new Class(function(){})的句式的jsdoc生成
 * 9、增加了self.instanceMember的识别与归属判断
 * 10、增加了在全局、闭包中创建的类的jsdoc生成与归属判断
 * 11、增加sys模块的说明，使得引用了sys的模块能够参考sys的使用规则
 * 12、去除uiold的namespace定义，就不会生成xxx.html#makeOption类型的注释文件了
 * 13、遵循commonJS规范，模块的注释统一按照a/b/c的格式，而不是a.b.c
 * 14、增加function和object两种Class定义方式的jsdoc生成，例如A = new Class(function(){this.a=1;})和A = new Class({a:1});
 * 15、增加mixin、extend时对XN.a，XN.b，XN.c缩短为XN的处理
 * 16、将object的各个成员的jsdoc注释集合到一起
 * 17、自动生成Class的一些静态方法的文档（需要在var Class = this.Class时添加@namespace Class的jsdoc注释）
 * 18、在@see添加时，也需要考虑see的内容出现在@see之后时，会导致@see不成功的情况
 *
 * 难点（还需要完善的）：
 * 1、BUG：Object(Class)与object(namespace)不能同时存在，@class Object和@namespace object会导致两者注释内容相同
 * 2、BUG：三级继承的类，A->B->C，在C中可以显示B的内容，但是无法显示A的内容
 * 3、BUG：两个相同的成员声明将会产生两个注释，导致继承时父类和子类的同名变量重复出现（instancemethod/classmethod/staticmethod等scope的内容不会重复出现）
 * 4、间接引用的无法自动识别生成注释，需要手动写注释说明
 *
 * 另外，在完善此plugin的过程中，积累了比较多的测试（在jsdoc/for_object目录下），以供进一步完善使用
 */

var Token = Packages.org.mozilla.javascript.Token;

/** 自动添加一个sys模块，因为很多模块都引用了sys，但是并没有真正的sys模块，导致文档中的sys引用不可点击 */
var sysAdded = false;
/** 出现过的模块，都在这里注册一下，包括短名称到长名称的映射 */
var globalModules = {};
/** 在能够获取requires的时候，Doclet还没有创建，因此先用全局变量保存 */
var globalRequires = {};
/** 在添加@see时，如果@see的内容出现的晚一些，也需要保存起来，在@see的内容出现后再还原依赖信息 */
var globalSees = {};
/** 在每次Doclet生成完以后，保存名称，以供augments设置的时候查阅，避免引用不存在的问题*/
var globalDocletNameMap = {};
/** 保存短名称与长名称(longname)之间的映射，方便查询*/
var shortToLongNameMap = {};
/** 模块A还未出现时，如果模块B继承模块A的内容，会出错，因此存储依赖关系，等模块A出现时，再在B中添加继承关系 */
var delayedParent = {};
/** 与delayedParent类似，只不过这里是mixin */
var delayedMixin = {};
/** 自动添加注释时，只添加节点名称和此后缀 */
var autoJsDocSuffix = ' [AUTO-GENERATED]';
/** 代码中是否有objectjs模块定义的内容，如果没有则不需要额外操作，提高效率 */
var containsObject = false;

/**
 * 分析源码，在object.add/object.define前面加入@exports moduleName标签
 */
exports.beforeParse = function(e) {
	var source = e.source;
	// 如果有object.add或object.define，则需要特殊处理一下
	if (/object.(add|define)/.test(source)) {
		containsObject = true;
		// 有的模块引用了sys（这里粗略判断sys），这里加入sys模块的声明（确保在同一行）
		if (!sysAdded && source.indexOf('sys') != -1) {
			source = "object.add('sys', function(exports){/** modules属性用于利用名称动态获取模块，例如：var dom = sys.modules['dom']; */this.modules = ''});" + source;
			// 避免重复添加sys
			sysAdded = true;
		}
		// 删除object.add与(之间的空格，为后面的代码分析做准备	
		source = source.replace(/object\.add\s*\(/, 'object.add(');
		source = source.replace(/object\.define\s*\(/, 'object.define(');
		e.source = addAtExportsInComment(source);
		// 如果在@method之后添加了别名，则此别名将会成为global的，因此去掉别名（@class使用不考虑）
		e.source = e.source.replace(/(@(?:method|function|member|event|external))\s+[\w\_\.]+/g, '$1');
	} else {
		// object目录下的不忽略
		if (e.filename.indexOf('/objectjs.org/object/') != -1) {
			containsObject = true;
		}
	}
};

/**
 * 文件处理结束后给个提示
 */
exports.fileComplete = function(e) {
	containsObject = false;
	print('[Complete] ' + e.filename);
}

/**
 * symbolFound会在一些情况下触发，详见 src/parser.js
 *
 * SCRIPT 触发jsdocCommentFound
 * ASSIGN/VAR/LET/CONST/FUNCTION/NAMEDFUNCTIONTATEMENT 触发symbolFound
 *
 * symbolFound之后，Doclet还没有生成，此时可以对代码内容进行一些需要的调整
 */
exports.symbolFound = function(e) {
	if (!containsObject) {
		return;
	}
	var node = e.astnode;
	var jsdocComment = node.jsDoc;
	
	var moduleName = null;
	// 从node的jsDoc中找出模块名
	if (jsdocComment && jsdocComment.indexOf('@exports') != -1) {
		moduleName = getModuleNameFromJsDoc(jsdocComment);
	}
	
	// 如果有模块名，并且是object.add或object.define，则分析模块依赖关系
	if (moduleName && node.parent && node.parent.type == Token.CALL) {
		var ptSrc = node.parent.target.toSource();
		if(ptSrc == 'object.add' || ptSrc == 'object.define') {
			// 把模块的依赖关系存起来
			storeModuleDependencies.call(this, node);
		}
	}

	// 如果没有写注释，则不会出现在doc中，因此这里自动为模块或类的内容添加doc
	autoGenerateJsDoc.call(this, e);
};

/**
 * 每次symbolFound/jsdocCommentFound后都会触发newDoclet，详见 src/handlers.js
 *
 * jsdocCommentFound/symbolFound触发newDoclet
 *
 * 生成Doclet
 */
exports.newDoclet = function(e) {
	if (!containsObject) {
		return;
	}
	var doclet = e.doclet;
	var code = doclet.meta.code;

	// 获取操作方法，例如this.A = classmethod(function(){})的classmethod
	var targetName = getTargetName(code);
	
	if (code.node && code.node.parent) {
		// 处理类似于this.a = this.b = xxx的连续赋值
		handleContinuousAssignment.call(this, targetName, code, doclet);
	}

	// 找到当前doclet的所有者
	var owner = findOwner.call(this, doclet);

	if (owner) {
		// 把此doclet设置为所有者的成员
		doclet.setMemberof(owner.longname);
	}

	if (doclet.longname.indexOf('module:') == 0) {
		// 如果是模块下的内容，则需要存起来，以便通过简短的名称查找doclet
		// globalModules[doclet.name] = doclet;
		globalModules[doclet.longname] = doclet;
	}

	if (doclet.kind == 'module') {
		// 回复模块的依赖关系注释
		recoverModuleDependencies.call(this, doclet);

	} else if (['NEW', 'CALL'].indexOf(code.type) != -1 && targetName == 'Class') {
		// 处理类，处理继承关系
		makeClass.call(this, doclet);
		// 处理Class.mixin类型的mixin
		makeMixinsByClassMixin.call(this, doclet);

	} else if (doclet.name == '__mixins__' && owner && owner.kind == 'class') {
		// 处理__mixins__类型的mixin
		makeMixins.call(this, doclet, owner);

	} else if ((code.type == 'LP' || code.type == 'CALL' || code.type == 'HOOK') 
			&& targetName == 'property' && owner && owner.kind == 'class') {
		makeProperty.call(this, doclet, owner);

	} else if (code.type == 'CALL' && targetName == 'staticmethod' && owner && owner.kind == 'class') {
		makeStaticMethod.call(this, doclet, owner);

	} else if (code.type == 'CALL' && targetName == 'classmethod' && owner && owner.kind == 'class') {
		makeClassMethod.call(this, doclet, owner);

	} else if (code.type == 'FUNCTION' && owner && owner.kind == 'class') {
		makeInstanceMethod.call(this, doclet, owner);

	} else if (owner && owner.kind == 'class') {
		// makeProperty/makeClassMethod/makeStaticMethod/makeInstanceMethod等都已经调用了setAccess
		setAccess(doclet);
		// doclet.scope = doclet.scope + '-' + doclet.kind;
	}

	var longname = doclet.longname;
	var replacedName = doclet.longname.replace('#', '.');
	var replacedName2 = replacedName.replace('module:', '');

	// 将名称与Doclet的匹配关系存起来，以备通过名称查询到Doclet
	storeNameDocletMap.call(this, longname, replacedName, doclet);
	// 恢复继承关系
	recoverExtendRelation.call(this, longname, replacedName, replacedName2, doclet);
	// 恢复mixin关系
	recoverMixinRelation.call(this, longname, replacedName, replacedName2, doclet);
	// 恢复see关系
	recoverSeeRelation.call(this, longname, replacedName, replacedName2, doclet);

	// 特殊处理object/Class两个namespace
	handleSpecialNamespace.call(this, code, doclet);
};

/**
 * 处理特殊的namespace，比如object/Class
 */
function handleSpecialNamespace(code, doclet) {
	if (code.node && code.node.parent) {
		var ppSrc = code.node.parent.toSource();
		// 是object的成员
		if (/^object\.\w+\s*=/.test(ppSrc)) {
			doclet.memberof = 'object';
		} 
		// 是Class的成员
		else if (/^Class\.\w+\s*=/.test(ppSrc)) {
			doclet.memberof = 'Class';
		}
	}
}

/**
 * 一个Doclet创建了以后，看一下其他Doclet是不是mix了这个Doclet
 */
function recoverMixinRelation(longname, replacedName, replacedName2, doclet) {
	delayed = delayedMixin[longname] || delayedMixin[replacedName] || delayedMixin[replacedName2];
	// 处理在模块A声明之前在B中mixin(A)的情况
	if (delayed) {
		for (var i=0, l=delayed.length; i<l; i++) {
			delayed[i].mix(longname);
		}
		//清空
		delayedMixin[longname] = null;
		delayedMixin[replacedName] = null;
		delayedMixin[replacedName2] = null;
	}
}

function recoverSeeRelation(longname, replacedName, replacedName2, doclet) {
	var okName = longname;
	var see = globalSees[longname];
	if (!see) {
		see = globalSees[replacedName];
		okName = replacedName;
	}
	if (!see) {
		see = globalSees[replacedName2];
		okName = replacedName2;	
	}
	if (see) {
		for (var i=0, l=see.length; i<l; i++) {
			modifyDocletSeeInfo(see[i], doclet, okName);
		}
		//清空
		globalSees[longname] = null;
		globalSees[replacedName] = null;
		globalSees[replacedName2] = null;
	}
}

/**
 * 一个Doclet创建了以后，看一下其他Doclet是否继承了这个Doclet
 */
function recoverExtendRelation(longname, replacedName, replacedName2, doclet) {
	var delayed = delayedParent[longname] || delayedParent[replacedName] || delayedParent[replacedName2];
	// 处理模块A声明之前，在B中继承A的情况
	if (delayed) {
		for (var i=0, l=delayed.length; i<l; i++) {
			delayed[i].addTag('augments', longname);
		}
		//清空
		delayedParent[longname] = null;
		delayedParent[replacedName] = null;
		delayedParent[replacedName2] = null;
	}
}

/**
 * 把名称和doclet的对应关系保存起来，以便通过名称找到doclet
 */
function storeNameDocletMap(longname, replacedName, doclet) {
	// 由于继承时需要确保名称一定正确，这里保存两个，一个是原始名称，一个是替换#后名称
	// 如果原始名称不对，再用替换后的名称来获取原始名称进行操作
	globalDocletNameMap[longname] = true;
	
	if (globalDocletNameMap[replacedName] !== true) {
		globalDocletNameMap[replacedName] = longname;
	}

	// 记录短名称到长名称之间的映射，短名称包括很多种，用于查询
	// dom.dd.DragDrop
	// --> DragDrop, domm.dd.DragDrop
	//
	// dom.dd#initialize
	// --> initialize, dom.dd#initialize, dom.dd.initialize
	shortToLongNameMap[doclet.name] = longname;
	shortToLongNameMap[longname] = longname;
	shortToLongNameMap[longname.replace('module:', '')] = longname;
	shortToLongNameMap[longname.replace('module:', '').replace('#', '.')] = longname;
}

/**
 * 在symbolFound时，Doclet还没有生成，因此需要把模块依赖关系存起来，等Doclet生成之后再把依赖关系加进去
 * 将模块依赖关系存在globalRequires中
 */
function storeModuleDependencies(node) {
	node = node.parent;
	var moduleName = String(node.arguments.get(0).value);
	var requires, factory;
	// 分析参数
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
	// 需要将模块名按照CommonJS规范调整下
	moduleName = transModuleName(moduleName);
	// 此时Doclet还没有生成，因此需要把模块依赖关系存起来，等Doclet生成之后再把依赖关系加进去
	globalRequires[moduleName] = requires;
}

/**
 * 还原Doclet的require关系
 */
function recoverModuleDependencies(doclet) {
	// 创建的一个module doclet，查看一下是否有requires关系
	var requires = globalRequires[doclet.name];
	if (requires) {
		doclet.requires = [];
		// 将依赖关系加进去
		requires.forEach(function(one) {
			doclet.requires.push('module:' + transModuleName(one));
		});
	}
}

/**
 * 处理特殊的赋值语句
 * 目前处理的包括： 
 * 		var A = this.A = new Class
 *      this.A = this.B
 */
function handleContinuousAssignment(targetName, code, doclet) {
	//处理利用var A = this.A = new Class的句式
	if (targetName == 'Class') {
		var parentDoclet = this.refs['astnode' + code.node.parent.hashCode()];
		// 如果已经有了，则说明曾利用var Action = this.Action = new Class的方式定义过类
		if (parentDoclet) {
			// 将longname属性替换，这样类中的成员就可以找到这个的类了
			parentDoclet.longname = parentDoclet.longname.replace('~', '#');
			// 添加@see，添加@see的事情交给下面的判断
			// parentDoclet.addTag('see', doclet.longname);
		}
	} else {
		// this.A = this.B; 
		// var A = this.A = function() {}
		// this.A = this.B = function() {}
		// 时，需要在this.A的注释中添加@see B的内容
		var ppSrc = code.node.parent.toSource().split('\n')[0];
		if (m = /^(?:this\.|exports\.|(?:var\s+)?)([\w_]+)\s*=\s*(?:this|exports)\.([\w_]+)\s*(?:$|=)/.exec(ppSrc)) {
			modifyOrStoreDocletSee(doclet, '#', m);
		} 
		// this.A = A的情况
 		// 由于this.A = A，A可以是function，function可以出现在this.A = A赋值的后面，要取到A的注释信息，就必须保存当前依赖，在function A出现后再处理
 		// 由于function X的情况会很多，全部保存备用不现实
		// 暂时不做这样的处理，这里简单处理一下
		// this.A = A的情况，例如：this.__detectUAExtra = detectUAExtra
		else if (m = /^(?:this\.|exports\.)([\w_]+)\s*=\s*([\w_]+)\s*(?:$|=)/.exec(ppSrc)){
			modifyOrStoreDocletSee(doclet, '~', m);
		}
	}
}

/**
 * 根据依赖的Doclet，调整Doclet的内容，添加@see，修改描述等信息
 * 如果被see的Doclet还没有出现，则将see信息存储在全局变量上
 */
function modifyOrStoreDocletSee(doclet, seperator, m) {
	// 不处理mixin
	if (m[1] == '__mixins__') {
		return;
	}
	var comment = doclet.comment.replace(/@see\s+/g, '@see ');
	var targetSeeName = doclet.memberof + seperator + m[2];
	var parentDoclet = globalModules[targetSeeName];
	if (parentDoclet) {
		modifyDocletSeeInfo(doclet, parentDoclet, targetSeeName);
	} else {
		if (!globalSees[targetSeeName]) {
			globalSees[targetSeeName] = [];
		}
		globalSees[targetSeeName].push(doclet);
	}
}

/**
 * 修改一个Doclet的@see及其相关描述信息
 *
 * @param doclet 需要修改的doclet
 * @param parentDoclet 用来参考，被see的doclet
 * @param targetSeeName @see后面的字符串（实际上等于parentDoclet.longname）
 */
function modifyDocletSeeInfo(doclet, parentDoclet, targetSeeName) {
	if (doclet.comment.indexOf('@see ' + targetSeeName) == -1) {
		doclet.addTag('see', targetSeeName);
	}
	// 避免创建一大堆相同的类
	if (parentDoclet.kind != 'class') {
		doclet.kind = parentDoclet.kind;
		doclet.access = parentDoclet.access;
		// scope [global, static, instance, inner, class(added)]
		if (doclet.scope == 'instance' && (parentDoclet.scope == 'static' || parentDoclet.scope == 'class')) {
			doclet.scope = parentDoclet.scope;
		}
	}
	// 原有的描述，如果不是自动生成的，就不覆盖了
	if (!doclet.description || doclet.description.indexOf(autoJsDocSuffix) != -1) {
		if (!parentDoclet.description) {
			doclet.description = doclet.longname + '与' + parentDoclet.longname + '关联，但是' + 
				parentDoclet.longname + '没有jsdoc注释，请手动添加！';
		} else {
			// 如果目标注释也是自动生成的，没用，不拷贝
			if (parentDoclet.description.indexOf(autoJsDocSuffix) == -1) {
				doclet.description = parentDoclet.description;
			}
		}
	}
}

/**
 * 获取targetName，即等号右边的调用者
 * 例如：this.a = classmethod(function(){});中targetName就是classmethod
 *
 * 还需要分析当前code是不是特殊的property语法
 * 例如：this.prop = a ? property() : property()
 *       this.prop = nativeproperty()
 */
function getTargetName(code) {
	var targetName = (code.node && code.node.target)? code.node.target.toSource() : null;
	// 处理 this.prop = a ? property() : property()的句式
	if (code.type == 'LP' || code.type == 'HOOK') {
		var src = code.node.toSource().replace('\n', '');
		if (src.indexOf('\?') != -1) {
			var splited = src.split('\\\?')[1].split(':');
			if (/property\s*\(/.test(splited[0]) || /property\s*\(/.test(splited[1])) {
				targetName = 'property';
			}
		}
	} 
	// 处理 this.prop = nativeproperty()的句式
	else if (code.type == 'CALL' && code.node.toSource().indexOf('nativeproperty') != -1){
		targetName = 'property';
	}
	return targetName;
}


/**
 * 设置访问权限
 * 由于private的在doc里不显示，因此将private改为private~
 */
function setAccess(doclet) {
	if (doclet.name.indexOf('__') == 0) {
		// 默认情况下，private的内容不会显示出来，在运行jar时添加 -p 参数，就会显示了
		doclet.access = 'private';
	} else if (doclet.name.indexOf('_') == 0) {
		doclet.access = 'protect';
	} else {
		doclet.access = 'public';
	}
}

/**
 * 处理Class.mixin(this, module.Class)的情况
 */
function makeMixinsByClassMixin(doclet) {
	var node = doclet.meta.code.node;
	var src = String(node.toSource().toString());
	// 去掉注释
	src = removeComments(src);
	// 逐行分析
	var splited = src.split('\n');
	for(var i=0, l=splited.length, current; i<l; i++) {
		current = splited[i];
		// 如果有mixin
		if (current.indexOf('Class.mixin') != -1) {
			var m = /Class\.mixin\(\w+,\s*([\w\.\_]+)\)/.exec(current);
			var moduleName = m[1];
			// 替换exports
			if (doclet.memberof) {
				moduleName = moduleName.replace(/^(exports|this)/g, 
					doclet.memberof.split('#')[0].replace('module:', ''));
			}
			// 添加mixin，或者将mixin关系存入全局
			addOrStoreMixinRelation(doclet, node, moduleName);
		}
	}
}

/**
 * 添加mixin，或者将mixin关系存入全局变量
 *
 * @param doclet：需要添加mixin关系的doclet
 * @param node  ：代码节点，用于向上查找一直找到object.add(....)的代码，进而分析模块来源
 * @param targetName ：mixin时使用的模块名称，比如Class.mixin(this, dd.DragDrop)，targetName为dd.DragDrop
 *
 * @return 正确的模块名，比如dom.dd.DragDrop
 */
function addOrStoreMixinRelation(doclet, node, targetName) {
	if (shortToLongNameMap[targetName]) {
		doclet.mix(shortToLongNameMap[targetName]);
	} else {
		// 如果是object.add('dom', 'dom/dd', function(exports, dd) {
		// 		Class.mixin(this, dd.DragDrop)的情况
		// }
		// 需要从dd找到dom/dd，进而找dom.dd.DragDrop对应的真实模块名称
		var finded = findFullNameAccordingToRequire(node, targetName);
		if (finded) {
			if (shortToLongNameMap[finded]) {
				doclet.mix(shortToLongNameMap[finded]);
			} else {
				if (!delayedMixin[finded]) {
					delayedMixin[finded] = [];
				}
				delayedMixin[finded].push(doclet);
			}
			// 如果还没有找到，说明模块尚未出现，则进行记录，一旦模块出现，则mixin
			// 走到这里，说明在新建此doclet时，mixin的类或模块并没有得到创建
		} else {
			if (!delayedMixin[targetName]) {
				delayedMixin[targetName] = [];
			}
			delayedMixin[targetName].push(doclet);
		}
	}
}

/**
 * 从node开始一直往上找，找到object.add，解析出模块全路径
 *
 * @node {astnode} astnode节点
 * @targetName 操作(mixin或继承)的目标类，比如dd.DragDrop
 */
function findFullNameAccordingToRequire(node, targetName) {
	var parent = node.parent;
	// 找到模块定义的节点
	while(parent) {
		if (parent && parent.type == Token.CALL && (
			parent.target.toSource() == 'object.add' || parent.target.toSource() == 'object.define')) {
			break;
		}
		parent = parent.parent;
	}
	if (parent == null) {
		return null;
	}
	node = parent;
	var moduleName = String(node.arguments.get(0).value);
	var requires, factory;
	if (node.arguments.size() < 3) {
		// TODO get module info from require
	} else {
		// 分析引用模块时的写法
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
		// 先看targetName能否正常匹配，例如：XN.d.A去寻找XN.d
		// object.add('a', 'XN.d', function(exports, XN) {
		//     Class.mixin(this, XN.d.A)的情况
		// });
		var targetModule = targetName.replace('/', '.').split('.');
		var className = targetModule.pop();
		targetModule = targetModule.join('.');
		for(var i=0, l=requires.length; i<l; i++) {
			var translated = requires[i].replace('/', '.');
			if (translated == targetModule) {
				return transModuleName(requires[i]) + '.' + className;
			}
		}
		// 如果是：
		// object.add('dom', 'dom/dd', function(exports, dd) {
		// 		Class.mixin(this, dd.DragDrop)的情况
		// });
		var moduleName = targetName.replace('/', '.').split('.')[0];
		for(var i=0, l=requires.length; i<l; i++) {
			var splited = requires[i].replace('/', '.').split('.');
			if (splited[splited.length - 1] == moduleName) {
				// 拼出结果
				splited.pop();
				splited.push(targetName);
				return splited.join('/');
			}
		}
	}
}

/**
 * 利用__mixins__属性，给classDoclet加上mixin信息
 */
function makeMixins(doclet, classDoclet) {
	var node = doclet.meta.code.node;
	// __mixins__属性只能是列表
	if (node.type == Token.ARRAYLIT) {
		var elements = node.getElements();
		for (var i = 0, name; i < elements.size(); i++) {
			name = String(elements.get(i).toSource());
			if (doclet.memberof) {
				name = name.replace(/^(exports)/g, doclet.memberof.split('#')[0].replace('module:', ''));
			}
			addOrStoreMixinRelation(classDoclet, node, name);
		}
	}
	setAccess(doclet);
}

/**
 * 设置class的相关信息
 */
function makeClass(doclet) {
	var node = doclet.meta.code.node;
	var parent, factory, arguments = node.arguments;
	if (arguments.size() < 2) {
		parent = null;
		factory = arguments.get(0);
	} else {
		parent = String(arguments.get(0).toSource());
		factory = arguments.get(1);
	}

	if (parent && doclet.memberof && !doclet.undocumented) {
		parent = parent.replace(/^(this|exports)/g, doclet.memberof);
		if (parent.indexOf('.') != -1 && parent.indexOf('module:') == -1) {
			parent = 'module:' + parent;
		}
		// 继承关系
		if (globalDocletNameMap[parent] === true) {
			doclet.addTag('augments', parent);
		} else if (globalDocletNameMap[parent]){
			doclet.addTag('augments', globalDocletNameMap[parent]);
		} else {
			// 走到这里，说明在新建此doclet时，继承的类并没有得到创建
			if (!delayedParent[parent]) {
				delayedParent[parent] = [];
			}
			delayedParent[parent].push(doclet);
		}
	}
	doclet.kind = 'class';
	// 如果Class在匿名function中被创建（例如Loader），那么就把它放在全局上
	if(doclet.memberof == "<anonymous>") {
		doclet.memberof = undefined;
	}
}

/**
 * 设置property创建的属性
 */
function makeProperty(doclet, classDoclet) {
	var node = doclet.meta.code.node;
	doclet.scope = 'property';
	setAccess(doclet);
	if (!classDoclet.properties) {
		classDoclet.properties = [];
	}
	classDoclet.properties.push({
		name: doclet.name,
		description: doclet.description
	});
	// 因为可能是a?f1:f2的句式，因此可能没有arguments
	// 没有第二个setter参数，则属性只读
	// 为0有可能是nativeproperty()之类的
	if (node.arguments && node.arguments.size() == 1) {
		doclet.readonly = true;
	}
}

/**
 * 设置staticmethod创建的属性
 */
function makeStaticMethod(doclet, classDoclet) {
	doclet.kind = 'function';
	doclet.scope = 'static';
	setAccess(doclet);
}

/**
 * 设置classmethod创建的属性
 */
function makeClassMethod(doclet, classDoclet) {
	doclet.kind = 'function';
	doclet.scope = 'class';
	setAccess(doclet);
	// 删掉cls参数 (modify : 把 != 改为 ==)
	if (doclet.params && doclet.params[0].name == 'cls') {
		doclet.params.shift();
	}
}

/**
 * 设置instancemethod创建的属性
 */
function makeInstanceMethod(doclet, classDoclet) {
	doclet.scope = 'instance';
	setAccess(doclet);
	// 删掉self参数
	if (doclet.params && doclet.params[0].name == 'self') {
		doclet.params.shift();
	}
}

/**
 * 找到doclet的归属doclet
 */
function findOwner(doclet) {
	var node = doclet.meta.code.node;
	var parentNode;
	// 可以通过var A = new Class(function() {});的方式定义类
	// 也可以通过var A = new Class({param:1});的方式定义类
	if (node && node.enclosingFunction && node.enclosingFunction.parent) parentNode = node.enclosingFunction.parent;
	if (parentNode && [Token.NEW, Token.CALL].indexOf(parentNode.type) !== -1) {
		var parentSource = parentNode.target.toSource();
	    if (parentSource == 'Class') {
			return this.refs['astnode' + parentNode.hashCode()];
		} else if (parentSource == 'object.add' || parentSource == 'object.define') {
			if(node.parent.type == Token.COLON) {
				// 到这里，说明是包含a:b语法的语句导致的doclet
				parent = node.parent;
				// 此时，一直往上找，直到找到Class
				while(parent != null) {
					var ref = this.refs['astnode' + parent.hashCode()];
					// 找到父Class
					if (ref != null && parent.target && parent.target.toSource() == 'Class') {
						return this.refs['astnode' + parent.hashCode()];
					}
					parent = parent.parent;
				}
			} else {
				// 到这里，说明是模块内不包含a:b语法的普通成员，直接认为是模块内的内容
				// 找到对应的jsdoc
				var jsdocComment = node.enclosingFunction.jsDoc;
				if (jsdocComment) {
					var moduleName = getModuleNameFromJsDoc(jsdocComment);
					if (moduleName) {
						if (moduleName.indexOf('module:') == -1) {
							moduleName = 'module:' + moduleName;
						}
						return globalModules[moduleName];
					}
				}
			}
		} else if (parentSource == 'classmethod') {
			// 从classmethod中识别出类属性
			var parentSrc = node.parent.toSource();
			// 这些识别的变量必须要有jsdoc注释，否则无效！
			if(node.parent.jsDoc != null && /cls\.\w+\s*=\s*\w+/.test(parentSrc)) {
				var parent = parentNode.parent;
				while(parent != null) {
					var ref = this.refs['astnode' + parent.hashCode()];
					if (ref != null && parent.target && parent.target.toSource() == 'Class') {
						doclet.scope = 'class';
						return this.refs['astnode' + parent.hashCode()];
					}
					parent = parent.parent;
				}
			}
		} else {
		}
	} else {
		if (!node) {
		} else if (node.enclosingFunction) {
			// instancemethod不是CALL或NEW，所以就会走到这里
			var parentSrc = node.parent.toSource();
			// 这些识别的变量必须要有jsdoc注释，否则无效
			// 避免局部变量太多，提升效率
			// 避免同一个变量被jsdoc多次
			// 避免生成不必要的jsdoc
			if(node.parent.jsDoc != null && /self\.[\_\w]+\s*=/.test(parentSrc)) {
				var parent = node.parent;
				while(parent != null) {
					var ref = this.refs['astnode' + parent.hashCode()];
					if (ref != null && parent.target && parent.target.toSource() == 'Class') {
						doclet.scope = 'instance';
						return ref;
					}
					parent = parent.parent;
				}
			} else if (node.parent) {
				// 一个简单闭包中的节点，归属于global
				doclet.memberof = '<global>';
			}
		} else {
		}
	}
	return null;
}

// ---------------------- [util] -----------------------
/**
 * 为了避免由于没有写注释导致类以及类的成员不出现在doc中的情况，这里强行要求模块、类、类成员必须有jsdoc
 * 如果没有，自动生成一条提示jsdoc
 */
function autoGenerateJsDoc(e) {
	// 木有jsdoc注释
	if (e.comment == '@undocumented') {
		var code = e.code;
		var name = e.code.name;
		// var A = this.A = function(){}的情况，如果不处理，那么只有A有注释，this.A没有注释
		if (e.astnode.parent && e.astnode.parent.parent) {
			var pp = e.astnode.parent.parent;
			// 注意：只要第一行
			var ppSrc = e.astnode.parent.parent.toSource().split('\n')[0];
			if (/var\s*[\w_]+\s*=\s*[\w_\.]+\s*=/.test(ppSrc)) {
				// 把父节点的注释放在当前节点上，如果父节点没有注释，则自动生成一个
				e.comment = pp.jsDoc ? String(pp.jsDoc) : name.replace(/^(exports|this|self)\./g, '') + autoJsDocSuffix;
				return;
			}
		}
		if (code.node && code.node.parent) {
			var ppSrc = code.node.parent.toSource();
			if (/^object\.\w+\s*=/.test(ppSrc)) {
				e.comment = name + autoJsDocSuffix;
			} else if (/^Class\.\w+\s*=/.test(ppSrc)) {
				e.comment = name + autoJsDocSuffix;
			}
		}
		if(/^(exports|this|self)\./.test(name)) {
			// 如果__mixins__没有手动写注释，也不自动添加
			if (name.indexOf('__mixins__') == -1 && name.indexOf('[') == -1) {
				e.comment = name.replace(/^(exports|this|self)\./g, '') + autoJsDocSuffix;
			}
		} else {
			// 另外，如果是通过var A = new Class(function(){})创建的类，也需要生成jsdoc
			var node = e.astnode;
			// node源码中第一行包含new Class(，说明是新建一个类
			if(node.toSource().split('\n')[0].indexOf('new Class(') != -1) {
				if (node.target) {
					var src = node.target.toSource();
					if(/^[a-z]/.test(src)) {
						// 如果以小写字母开头的类，不自动生成jsdoc，例如oop.js中的cls
						if (src != 'cls') {
							// print('[INFO] ' + src + ' is ignored by jsdoc autogenerator');
						}
						return;
					}
				} else {
					var src = node.parent.toSource();
					if(/^[a-z]/.test(src)) {
						if (src.indexOf('sub.type') == -1) {
							// print('[INFO] something is ignored : ' + node.parent.toSource());
						}
						return;
					}
				}
				e.comment = name + autoJsDocSuffix;
			} else {
				// 为通过var A = new Class({a:1});定义的类，自动生成成员的注释
				if (node.type == Token.COLON) {
					if (node.parent && node.parent.parent) {
						var pp = node.parent.parent;
						if ((pp.type == Token.NEW || pp.type == Token.CALL) && pp.target.toSource() == 'Class') {
							e.comment = name + autoJsDocSuffix;
						}
					}
				}
			}
		}
	}
}

/**
 * 利用jsdoc的内容，获取模块名
 * 以@exports为基准，找模块名，模块名必须在@exports的同一行，否则获取不到，jsDoc本身也处理不了
 */
function getModuleNameFromJsDoc(jsdocComment) {
	var moduleNames = /@exports\s+([\w\._\/\\]+)/.exec(jsdocComment);
	if (!moduleNames) {
		print('[ERROR] can not get module name from : ' + jsdocComment);
	} else {
		return transModuleName(moduleNames[1]);
	}
}

/**
 * 去除代码中的注释
 * @see seajs removeComments
 */
function removeComments(code) {
	return code
        .replace(/(?:^|\n|\r)\s*\/\*[\s\S]*?\*\/\s*(?:\r|\n|$)/g, '\n')
        .replace(/(?:^|\n|\r)\s*\/\/.*(?:\r|\n|$)/g, '\n');
}

/**
 * 将模块名中的.替换成/，如：a.b.c -> a/b/c
 */
function transModuleName(str) {
	while(str.indexOf('.') != -1) {
		str = str.replace('.', '/');
	}
	return str;
}

/**
 * 为object.add和object.define的模块添加@exports moduleName注释
 *
 * 注意：添加注释时不要添加\n，否则将会导致文档中的行号显示不正确
 */
function addAtExportsInComment(str) {
	var target = '';
	var commentCollector = '';	//收集注释，主要用于分析是否已经有@exports
	var commentStart = false;
	var handledIndex = -1;		//处理索引，用于与i进行比较
	var OBJ_ADD = 'object.add(';
	var OBJ_DEFINE = 'object.define(';
	for(var i=0, current, l=str.length; i<l; i++) {
		// 分析源码，避免给注释中的object.add或object.define加上了
		current = str.charAt(i);
		if(current == '/' && str.charAt(i+1) == '*') {
			commentStart = true;
			commentCollector = '';
		} else if(current  == '*' && str.charAt(i+1) == '/') {
			commentStart = false;
			commentCollector += str.charAt(i + 1);
			var objectIndex = str.indexOf(OBJ_ADD, i);
			var shouldAdd = OBJ_ADD;
			if (objectIndex == -1) {
				shouldAdd = OBJ_DEFINE;
				objectIndex = str.indexOf(OBJ_DEFINE, i);
			} else {
				var defineIndex = str.indexOf(OBJ_DEFINE, i);
				if (defineIndex != -1 && defineIndex < objectIndex) {
					shouldAdd = OBJ_DEFINE;
					objectIndex = defineIndex;
				}
			}
			var emptyStr = str.substring(i+2, objectIndex);
			// 确保块注释与object.add之间没有其他文本内容，否则认为此块注释不是写给object.add|define的
			if(!/\S/.test(emptyStr)) {
				// 标记一下当前处理到哪一个object.add或object.define了
				handledIndex = objectIndex + shouldAdd.length;
				if (commentCollector.indexOf('@exports') == -1) {
					var moduleNames = /object.(?:add|define)\(['"](.+?)['"]/.exec(str.substring(objectIndex));
					if (moduleNames) {
						// 为object.add前的块注释添加@exports，不添加\n，否则将导致行号不对
						// 不允许通过/** @namespace xxx */的方式为一个模块添加注释，而应该写成：
						// /**
						//  * @namespace xxx
						//  */
						target += '* @exports ' + transModuleName(moduleNames[1]) + ' ';
					}            
				}
				target += str.substring(i, objectIndex);
				target += shouldAdd;
				i = objectIndex + shouldAdd.length - 1; // -1 是因为循环中有i++
				continue;
			}
		}
		if(commentStart) {
			commentCollector += current;
			target += current;
		} else {
			// 如果不是注释中，则每一个o都有可能是object.add或者object.define的开始
			if (current == 'o' && str.charAt(i+1) == 'b') {
				if (str.substring(i, i + OBJ_ADD.length) == OBJ_ADD 
						|| str.substring(i, i + OBJ_DEFINE.length) == OBJ_DEFINE) {
					// 新发现的object.add或object.define
					if (i > handledIndex) {
						// 如果这个还没处理过，则加上
						var moduleNames = /object.(?:add|define)\(['"](.+?)['"]/.exec(str.substring(i));
						if (moduleNames) {
							// 此时object.add或object.define前面没有块注释，因此要新建一个块注释
							target += '/** @exports ' + transModuleName(moduleNames[1]) + ' */';
						}
					}
				}
			}
			target += current;
			commentCollector = '';
		}    
	}
	return target;
}

/**
 * 从Token代码到Token名称转换，用于开发和debug
 */
var tokenMap = {};
for(var prop in Token) {
	tokenMap[Token[prop]] = prop;
}

/**
 * 对原来的print方法进行包装，使其支持打印多个参数
 */
var oldPrint = print;
print = function() {
	var args = arguments;
	var str = args[0];
	for (var i=1, l=args.length; i<l; i++) {
		str += ', ' + args[i];
	}
	oldPrint(str);
}

/**
 * 打印一个对象的所有属性，用于开发和debug
 */
function dump(obj) {
	for(var prop in obj) {
		try {
			print('DUMP : [' + prop + '] = ' + obj[prop]);
		} catch (e) {
			print('DUMP : [' + prop + '] ERROR ');
		}
	}
}

