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

function codesnippet_getOnBootCode(tabid, url, infoStr) {
	var context = {tabid:tabid, url:url, infoStr:infoStr};    
  return compile_template(codesnippet_onBootCode, context);
}