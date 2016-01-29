var codesnippit_showPopupInWebpage = 
`run(["jquery", "jquery-ui", "nodeSelector"], function($) {	
	$("#JST-POPUP-PINNED").parent(".ui-dialog").remove();
	$("#JST-POPUP-PINNED").remove();
	
	var dialogTitleHeight = 20;
	var dialogTitleBoxHeight = 20 + 12;  // 12 is the sum of margin and padding on top and bottom
	var dialogBottomMargin = 20;
	var height = "{{height}}";
	if (height === "100%") {
	  height = document.documentElement.clientHeight - dialogBottomMargin;
	}
	
	$("<iframe id='JST-POPUP-PINNED' src='chrome-extension://"+chrome.runtime.id+"/popup.html' " +
	  "style='width:600px; " + 
	  "height:calc(100% - " + dialogTitleBoxHeight + "px - " + dialogBottomMargin + "px);" + 
	  "padding:0 0 0 0; border: 0 0 0 0;' />")
	.appendTo("body")
	.dialog({
		"title":"JavaScript Tricks (Double click to toggle)", 
		"width":"602", "height": height
		/*,
		"position": {"my": "right top", "at": "right top", "of": window}*/
	});
	$("#JST-POPUP-PINNED").css("width", "calc(100% - 2px)");
	
	
	$(".ui-dialog-titlebar").dblclick(function() {
		$(this).attr("title", "Double click to toggle (collapse or extend) dialog box.");
		var dialog = $(this).closest(".ui-dialog");
		var maxHeight= dialog.css("max-height");
		if (maxHeight === "none") {
		  dialog.css("max-height", dialogTitleBoxHeight + "px"); 
		  $(this).next().hide();
		} else {
		  dialog.css("max-height", "none");
		  $(this).next().show();
		}
	});
	
	var dialog = $("#JST-POPUP-PINNED").closest(".ui-dialog");
	dialog.parent().addClass("jstricks");
	dialog.children(".ui-dialog-titlebar")
	      .css({
	          "font-size": "12px",
	          "height": dialogTitleHeight + "px);"
	        });
	dialog.css({
	          "z-index": "2147483645", 
	          "position": "fixed", 
	          "left": "initial", 
	          "right": "0", 
	          "top": "0"
	        })
	      .children(".ui-dialog-content")
	      .css({
	          "height": "calc(100% - " + dialogTitleBoxHeight + "px);"
	        });
	
	$("body").addClass("theme-light");
	
	if ({{hideDialog}})
		$("#JST-POPUP-PINNED").parent().hide();
	});
	
//# sourceURL=injectPopupWindow.js
`

// Invoked by addNecessaryScriptsToHead() in bg.js
var codesnippet_onBootCode = 
`
(function() {
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