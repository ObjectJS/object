REM rmdir /S /Q d:\works\renren\static\object\trunk\doc
set JSDOC=d:/works/jsdoc-toolkit
java -jar %JSDOC%/jsrun.jar %JSDOC%/app/run.js -a -r=10 -t=%JSDOC%/templates/codeview -d=d:/works/renren/static/object/trunk/doc/ d:/works/renren/static/object/trunk/src/
