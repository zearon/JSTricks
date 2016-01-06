var codesnippit_showPopupInWebpage = 
`run(["jquery", "jquery-ui"], function($) {	
	$("#JST-POPUP-PINNED").parent(".ui-dialog").remove();
	$("#JST-POPUP-PINNED").remove();
	$("<iframe id='JST-POPUP-PINNED' src='chrome-extension://"+chrome.runtime.id+"/popup.html' style='width:600px;height:571px;' />")
	.appendTo("body")
	.dialog({
		"title":"JavaScript Tricks (Double click to toggle)", 
		"width":"602", "height":"653",
		"position": {"my": "right center", "at": "right center", "of": window}
	});
	$("#JST-POPUP-PINNED").css("width", "calc(100% - 2px)");	
	
	$(".ui-dialog-titlebar").dblclick(function() {
		$(this).attr("title", "Double click to toggle (collapse or extend) dialog box.");
		$(this).next().toggle();
	});
	
	$("#JST-POPUP-PINNED").closest(".ui-dialog").css("z-index", "2147483645")
		.children("iframe").css("padding", "0 0 0 0").css("border", "0 0 0 0");
	
	$("body").addClass("theme-light");
	
	if ({{hideDialog}})
		$("#JST-POPUP-PINNED").parent().hide();
	});
`

// Invoked in bg.js. THIS CODE IS MOVED TO injected/dom.js as static injection.
// var codesnippet_addScriptNodeToDOM = 
// `    
// 	function InjectCodeToOriginalSpace(src, onload) {
// 		var s = document.createElement('script');
// 		s.setAttribute('src', src);
// 		s.setAttribute('type', 'text/javascript');
// 		s.onload = function() {
// 			console.log("Script is loaded: " + src);
// 			if (onload) { onload.apply(this, arguments); }
// 		};
// 		(document.head||document.documentElement).appendChild(s);
// 	}
// 	function InjectLinkElementToDom_____(rel, href) {
// 		var s = document.createElement('link');
// 		s.setAttribute('rel', rel);
// 		s.setAttribute('href', href);
// 		/*if (onload) { s.onload = onload; }*/
// 		(document.head||document.documentElement).appendChild(s);
// 	}
// 	function DecorateStyleItems_____(style) {
// 		return style.replace(/(\\S)(\\s*)(\\/\\*[\\s\\S]*?\\*\\/)?(\\s*\\})/g, function(s, g1, g2, g3, g4) {
// 						if (g1==";")
// 							return s;
// 						else
// 							return g1+";"+g2+(g3?g3:"")+g4;
// 					})
// 					.replace(/;/g, " !important;");
// 	}
// 	function AppendStyleNodeToDom_____(styles) {
// 		var id = 'javascript-tricks';
// 		var os = document.getElementById(id);
// 		if (os) {
// 			os.parentNode.removeChild(os);
// 		}
// 		
// 		var s = document.createElement('style');
// 		s.setAttribute('type', 'text/css');
// 		s.setAttribute('id', id);
// 		s.innerHTML = DecorateStyleItems_____(styles);
// 		//(document.body||document.documentElement).appendChild(s);
// 		//document.documentElement.insertBefore(s, document.documentElement.childNodes[1]);
// 		document.documentElement.appendChild(s);
// 	}
// `;

// Invoked by addNecessaryScriptsToHead() in bg.js
var codesnippet_onBootCode = 
`
(function() {
  if (window.INFO)
    return;
  
	window.INFO = JSON.parse(decodeURIComponent("{{infoStr}}"));
	INFO.desc = "Javascript Tricks";
	INFO.tabid = {{tabid}};
	INFO.taburl = "{{url}}";
	if (INFO.debug) {
		console.info("Tab id is {{tabid}} and INFO object is ", INFO);
		setSeajsBootDebug(true);
	}
	
	// Add some settings in meta data
	//console.log(meta_data);
	var config;
	if (INFO.meta_data && (config = INFO.meta_data["seajs.config"])) {
		seajs.config(config);
	}
	
	// Recover some default settings defined in seajs_boot.js
	seajs.config({
	"base": ("chrome-extension://" + chrome.runtime.id + "/injected/"),
	"paths": {
		"lib": "chrome-extension://" + chrome.runtime.id + "/lib"
	},
	"alias": {
	  "jquery": "lib/jquery[AMD]",  //"[AMD]jquery.sea.js", "[CommonJS]jquery.sea.js"
	  "jquery-ui": "lib/jquery-ui[AMD]",
	  "ready": "ready[AMD]",
	  "msgbox": "msgbox",
	  "selectbox": "selectionBox"
	}
	});
}) ();
`

function codesnippet_getOnBootCode(tabid, url, infoStr) {
	var context = {tabid:tabid, url:url, infoStr:infoStr};
    
    return compile_template(codesnippet_onBootCode, context);
}