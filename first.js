function beforeAutoload()
{	
	window.___JSTRICKS_LOAD_TIME___ = Date.parse( new Date());
	
	console.log("[JScript Tricks] Start loading first content script @" + window.___JSTRICKS_LOAD_TIME___);
}
beforeAutoload();