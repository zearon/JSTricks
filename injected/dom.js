(function() {
  if (window.InjectCodeToOriginalSpace)
    return;
  
	window.InjectCodeToOriginalSpace = function (src, onload, scriptName) {
		var s = document.createElement('script');
		s.setAttribute('src', src);
		s.setAttribute('type', 'text/javascript');
		s.onload = function() {
			if (scriptName !== null) {
			  var sname = !scriptName ? src : scriptName;
			  console.log("Script is loaded: " + sname);
			}
			if (onload) { onload.apply(this, arguments); }
		};
		(document.head||document.documentElement).appendChild(s);
	};
	
	window.InjectLinkElementToDom_____ = function (rel, href) {
		var s = document.createElement('link');
		s.setAttribute('rel', rel);
		s.setAttribute('href', href);
		/*if (onload) { s.onload = onload; }*/
		(document.head||document.documentElement).appendChild(s);
	};
	
	window.DecorateStyleItems_____ = function (style) {
		return style.replace(/(\S)(\s*)(\/\*[\s\S]*?\*\/)?(\s*\})/g, function(s, g1, g2, g3, g4) {
						if (g1==";")
							return s;
						else
							return g1+";"+g2+(g3?g3:"")+g4;
					})
					.replace(/;/g, " !important;");
	};
	
	window.AppendStyleNodeToDom_____ = function (styles) {
		var id = 'javascript-tricks';
		var os = document.getElementById(id);
		if (os) {
			os.parentNode.removeChild(os);
		}
		
		var s = document.createElement('style');
		s.setAttribute('type', 'text/css');
		s.setAttribute('id', id);
		s.innerHTML = DecorateStyleItems_____(styles);
		//(document.body||document.documentElement).appendChild(s);
		//document.documentElement.insertBefore(s, document.documentElement.childNodes[1]);
		document.documentElement.appendChild(s);
	};
	
	if (chrome.extension) {
	  InjectCodeToOriginalSpace(chrome.runtime.getURL("/js/common/commonext.js"), null, null);
	  InjectCodeToOriginalSpace(chrome.runtime.getURL("/injected/injected.js"), null, null);
	  InjectCodeToOriginalSpace(chrome.runtime.getURL("/injected/ready.js"), null, null);
	  InjectCodeToOriginalSpace(chrome.runtime.getURL("/injected/msgbox.js"), null, null);
	} 

}) ()