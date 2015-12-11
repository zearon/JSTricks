var codesnippit_showPopupInWebpage = 
`run(["jquery", "jquery-ui"], function($) {	
	$("#JST-POPUP-PINNED").parent(".ui-dialog").remove();
	$("#JST-POPUP-PINNED").remove();
	$("<iframe id='JST-POPUP-PINNED' src='chrome-extension://"+chrome.runtime.id+"/popup.html' style='width:600px;height:571px;' />")
	.appendTo("body")
	.dialog({"title":"JavaScript Tricks (Double click to toggle)", "width":"630", "height":"600"});
	$("#JST-POPUP-PINNED").css("width", "calc(100% - 28px)");	
	
	$(".ui-dialog-titlebar").dblclick(function() {
		$(this).attr("title", "Double click to toggle (collapse or extend) dialog box.");
		$(this).next().toggle();
	});
	
	if ({{hideDialog}})
		$("#JST-POPUP-PINNED").parent().hide();
	
	});
`