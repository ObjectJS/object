目前将所有的测试用例分为两类，一类是可以独立运行，一类是需要借助于辅助资源（比如http服务器、iframe等）运行的
	独立运行的测试用例通过 test-runner.html 运行
	借助辅助资源的测试用例通过 test-runner-special.html 运行
	
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
		
	测试目录结构设置：
	project
	   |--- src
	   |--- test
	          |--- speed
			  |--- function
			  |--- unit
					|--- test-runner.html
					|--- index.js
			        |--- lib
					      |--- jsUnitMockTimeout.js
						  |--- jquery-latest.js
						  |--- qunit.js
						  |--- qunit.css
						  |--- QUnitAdapter.js
						  |--- config.js
					|--- module1_test
						  |--- index.html
						  |--- index.js
						  |--- module1-basic.js
						  |--- module1-usage.js
					|--- module2_test
						  |--- index.html
						  |--- index.js
						  |--- module2-basic.js
						  |--- module2-usage.js
					|--- ...
					|--- moduleN_test


