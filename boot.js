function injectJSFile(src, main, defer) {
	var s = document.createElement('script');
	s.setAttribute('src', src);
	s.setAttribute('type', 'text/javascript');
	if (main)
		s.setAttribute('data-main', main);
	if (defer) {
		s.setAttribute('defer', '');
		s.setAttribute('async', 'true');
	}
	(document.head||document.documentElement).appendChild(s);
}

// Load requireJS at the very beginning.
//injectJSFile("chrome-extension://"+chrome.runtime.id+"/js/require.custom.js", 
//	"chrome-extension://"+chrome.runtime.id+"/js/main.js");
//injectJSFile("chrome-extension://"+chrome.runtime.id+"/js/local.js", "", true);

// Load _Main script as the entry-point of requireJS
//chrome.runtime.sendMessage({method: "LoadMainScript"});