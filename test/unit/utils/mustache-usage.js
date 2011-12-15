module('mustache-usage');

test('use mustache', function() {

	var template = '{{#empty}} <p>The list is empty.</p> {{/empty}}';
	var data = {empty: true};
	var result = Mustache.to_html(template, data);
	equal(result, ' <p>The list is empty.</p> ', 'mustache works');
});

test('demo from mustache website', function() {
	var template = 
		'<h1>{{header}}</h1>' + 
		'{{#bug}} {{/bug}} ' + 
		'{{#items}} ' + 
			'{{#first}} ' + 
				'<li><strong>{{name}}</strong></li> ' + 
			'{{/first}} ' + 
			'{{#link}} ' + 
				'<li><a href="{{url}}">{{name}}</a></li> ' + 
			'{{/link}} ' + 
		'{{/items}} ' + 
		'{{#empty}} <p>The list is empty.</p> {{/empty}}';
	var data = {
	 	"header": "Colors",
	  	"items": [
		  	{"name": "red", "first": true, "url": "#Red"},
		  	{"name": "green", "link": true, "url": "#Green"},
		  	{"name": "blue", "link": true, "url": "#Blue"}
	  	],
	  	"empty": false
	}
	var result = Mustache.to_html(template, data);
	ok(result, 'demo from mustache runs well');
});
