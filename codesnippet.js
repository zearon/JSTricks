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



//var context = {tabid: tabid, url:url, debug:localStorage["$setting.DEBUG"], 
//        		msgboxOpacity:localStorage["$setting.misc_msgboxOpacity"],
//        		metaDataURIComponent: encodeURIComponent(localStorage['meta']) };
var codesnippet_onBootCode = 
`
	var INFO = new Object(); 
	INFO.debug = {{debug}};
	INFO.tabid = {{tabid}};
	INFO.taburl = "{{url}}";
	INFO.msgboxOpacity = {{msgboxOpacity}};
	INFO.meta_data = JSON.parse(decodeURIComponent("{{metaDataURIComponent}}"));
	if (INFO.debug) {
		console.info("Tab id is {{tabid}} and INFO object is ", INFO);
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
	  "jquery": "[AMD]jquery.js",  //"[AMD]jquery.sea.js", "[CommonJS]jquery.sea.js"
	  "jquery-ui": "[AMD]jquery-ui.js",
	  "selectbox": "selectionBox"
	}
	});
`