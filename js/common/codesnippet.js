var codesnippit_showPopupInWebpage = 
`run(["jquery", "jquery-ui", "nodeSelector"], function($) {	
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

// Invoked by addNecessaryScriptsToHead() in bg.js
var codesnippet_onBootCode = 
`
(function() {
	INFO.desc = "Javascript Tricks";
	INFO.tabid = {{tabid}};
	INFO.taburl = "{{url}}";
	if (INFO.debug) {
		console.info("Tab id is {{tabid}} and INFO object is ", INFO);
	}
}) ();
`

function codesnippet_getOnBootCode(tabid, url) {
	var context = {tabid:tabid, url:url};    
  return compile_template(codesnippet_onBootCode, context);
}

var codesnippet_csWrapper_noDuplicate = 
`// Avoid multiple times of loading
if (!INFO.loaded["{{csName}}"]) {
  if (INFO.debug) {
    console.info("Loading Content script {{csName}}...");
  }

// START OF CONTENT SCRIPT

{{csCode}}

// END OF CONTENT SCRIPT
}

// Helper object INFO.loaded is set in autoload.js, and injected by bg.js in updateSettings function
INFO.loaded["{{csName}}"] = true;
`;

var codesnippet_csWrapper=
`if (INFO.debug) {
  console.info("Loading Content script {{csName}}...");
}
  
{{csCode}}

// Helper object INFO.loaded is set in autoload.js, and injected by bg.js in updateSettings function
INFO.loaded["{{csName}}"] = true;
if (INFO.debug) {
  console.info("Content script {{csName}} is loaded");
}
`;

function codesnippet_getContentScriptWrapper(csCode, importOnce, args) {
  args.csCode = csCode;
  if (importOnce === true) {
    return compile_template(codesnippet_csWrapper_noDuplicate, args);
  } else {
    return compile_template(codesnippet_csWrapper, args);
  }
}