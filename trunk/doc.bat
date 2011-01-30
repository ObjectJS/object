rmdir /S /Q d:\works\renren\static\object\trunk\doc
set JSDOC=d:/works/jsdoc-toolkit
java -jar %JSDOC%/jsrun.jar %JSDOC%/app/run.js -a -p -t=%JSDOC%/templates/jsdoc -d=d:/works/renren/static/object/trunk/doc/ d:/works/renren/static/object/trunk/src/
