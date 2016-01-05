//autoload.js

var loaded = false;

function autoload() {
	console.log("autoload.js is loaded.");
	
	if (loaded) {}
	else {
		console.log("Start to load content scripts.");
		chrome.runtime.sendMessage({method: "JSTinjectScript"});
	}
}
autoload();

function injectCode(code) {
	$("head").append("<script type='text/javascript'>" + code + "</script>");
}