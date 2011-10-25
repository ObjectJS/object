每一个目录下（以object目录为例）都有
	index.html 		用于运行某一个特定部分的JS实例，引入index.js即可
	index.js		用于将目录下所有的单元测试集合在一起，并且负责本目录下JS的执行
						外部访问直接访问index.js即可
	object-basic.js		一些最基本的测试，包括非空，类型判断等
	object-add.js
	object-use.js
	object-execute.js
	object-extend.js	这些JS是具体的测试js，通过index.js的配置项可以获取

	引入LAB.js控制顺序
