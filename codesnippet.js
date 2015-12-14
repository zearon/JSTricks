var codesnippit_showPopupInWebpage = 
`run(["jquery", "jquery-ui"], function($) {	
	$("#JST-POPUP-PINNED").parent(".ui-dialog").remove();
	$("#JST-POPUP-PINNED").remove();
	$("<iframe id='JST-POPUP-PINNED' src='chrome-extension://"+chrome.runtime.id+"/popup.html' style='width:600px;height:571px;' />")
	.appendTo("body")
	.dialog({
		"title":"JavaScript Tricks (Double click to toggle)", 
		"width":"630", "height":"600",
		"position": {"my": "right top", "at": "right top", "of": window}
	});
	$("#JST-POPUP-PINNED").css("width", "calc(100% - 28px)");	
	
	$(".ui-dialog-titlebar").dblclick(function() {
		$(this).attr("title", "Double click to toggle (collapse or extend) dialog box.");
		$(this).next().toggle();
	});
	
	if ({{hideDialog}})
		$("#JST-POPUP-PINNED").parent().hide();
	});
`

// Invoked by addNecessaryScriptsToHead() in bg.js
var codesnippet_onBootCode = 
`
	var INFO = JSON.parse(decodeURIComponent("{{infoStr}}"));
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
	
	// Add some default settings
	seajs.config({
	"base": ("chrome-extension://" + chrome.runtime.id + "/js/"),
	"paths": {
	},
	"alias": {
	  "ready": "[AMD]domReady.js",
	  "jquery": "[AMD]jquery.js",  //"[AMD]jquery.sea.js", "[CommonJS]jquery.sea.js"
	  "jquery-ui": "[AMD]jquery-ui.js",
	  "selectbox": "selectionBox"
	}
	});
`

function codesnippet_getOnBootCode(tabid, url, infoStr) {
	var context = {tabid:tabid, url:url, infoStr:infoStr};
    
    return compile_template(codesnippet_onBootCode, context);
}