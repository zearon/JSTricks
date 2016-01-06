// autoload.js
// Content script autoload.js is an entry point for websites that has active site script.
// It is configured in /js/bg_declaration.js with a Rule registed on 
// chrome.declarativeContent.onPageChanged event as following.
// {
//   id: "loadScript",
//   priority: 103,
//   conditions: [
//     new chrome.declarativeContent.PageStateMatcher({
//       pageUrl: { urlMatches: getSetting("temp-activesites-pattern") },
//     })
//   ],
// 
//   // And shows the extension's page action.
//   actions: [  new chrome.declarativeContent.RequestContentScript({
//     "js": [ "injected/sea-debug.js", "injected/seajs_boot.js", "injected/autoload.js"],
//     "allFrames": false,
//     "matchAboutBlank": false}) ]
// }		
// According to this rule, every time a page changed event is fired in the browser, chrome 
// tests the condition represented by a regular expression saved as "temp-activesites-pattern"
// in settings with the current page url. If the condition is met, chrome loads a bunch of 
// scripts represented in the RequestContentScript object.
// 
// Every time the autostart status of a site script or the Default site script changed, 
// the setting item "temp-activesites-pattern" is regenerated accordingly and saved, and 
// this rule is re-registered to update the pattern. In this way a lot of computing resource
// is saved because only websites that are configureed to load some user scripts do the 
// loading work.

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