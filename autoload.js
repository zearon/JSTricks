//autoload.js


function autoload()
{	
	//window.___JSTRICKS_AUTOLOAD_TIME___ = Date.parse( new Date()) - window.___JSTRICKS_LOAD_TIME___;
	//console.log("[JScript Tricks] Start loading autoload.js " + window.___JSTRICKS_AUTOLOAD_TIME___ + " ms after first.js was loaded.");
	
	this.name =  Math.random() ;
	
	
	//$(function() {
		// console.log("autoload.js send JSTinjectScript request.");
		//chrome.extension.sendRequest({method: "JSTinjectScript", key: location.href, wname: window.name});
		chrome.runtime.sendMessage({method: "JSTinjectScript"});
	//});
}
autoload();

function injectCode(code) {
	$("head").append("<script type='text/javascript'>" + code + "</script>");
}