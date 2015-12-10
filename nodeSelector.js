(function($) {
	var NS_switch = false;
	var NS_styleName = "NS_SELECTED_NODE_2312356451321356453";
	var NS_titleNode = "NS_nodeSelector";
	var NS_editDialogContext = "{}";
	// window.tabid is injected in bg.js on tab created and updated
	/* 
	var maxHeight = 0;
	var maxWidth = 0;
	var elementBorderCss = [];
	var bordercss = "rgba(255,0,0,0.05)";
	 */
	
	chrome.runtime.onMessage.addListener(function(request, sender) {
		if (request.method == "NS-StartSelectingNode") {
			NS_startSelectingNode(request);
		} else if (request.method == "SaveEditDialogContextRequest") {
			NS_editDialogContext = request.context;
			//console.log("Save edit dialog context:");
			//console.log(NS_editDialogContext);
		} else if (request.method == "RestoreEditDialogContextRequest") {
			var iframe = $("#JST-POPUP-PINNED")[0];
			iframe.contentWindow.postMessage({type:"RestoreEditDialogContextResponse", tabid:tabid, context:NS_editDialogContext}, "*");
		}
	});
	
	$(NS_init);
	
	
	
	
	function NS_init() {
		//console.log('initing node selector');
		
	/* 
		elementBorderCss.push($("body").css("background-color"));
		maxWidth = $("body").width();
		maxHeight = $("body").height();
	 */
		
		$(`
		<style>
			.${NS_styleName} {
				background-color: rgba(0,0,255,0.2);
			}
			
		</style>
		`).appendTo("body");
		
		// border:2px solid rgb(255,0,0); 
		borderdiv = $(`
			<span id='${NS_titleNode}' style='display:none; background-color: rgba(255,255,255,1); position:absolute; z-index:99999; font-size:10px' ></span>
		`).appendTo("body");
		
		// DEBUG
		// NS_startSelectingNode();
	}
	
	function NS_startSelectingNode(request) {
		console.log("start selecting node");
		console.log(request);
		
		
		NS_switch = true;
		NS_controlId = request.controlid;
		$("#" + NS_titleNode).show();
		$("#JST-POPUP-PINNED").parent().hide();
		
		$("*").bind("mouseenter", NS_MouseIn);
		$("*").bind("mouseleave", NS_MouseOut);
		$("*").bind("click", NS_MouseClick);
	}
	
	function NS_MouseIn() {
		//console.log("Entering node");
		
		var node = $(this);
		NS_processNode(node);
	/* 
		var css = node.css("background-color");
		node.css("background-color", bordercss);
		console.log(elementBorderCss.slice(-1)[0]);
		node.parent().css("background-color", elementBorderCss.slice(-1)[0]);
		elementBorderCss.push(css);
		
		var position = node.offset();	
		borderdiv.offset(position);
		borderdiv.width(node.width());
		borderdiv.height(node.height());
	 */
	
	
	}
	
	function NS_MouseOut() {
		//console.log("Leaving node");
		
		var node = $(this).parent();
		NS_processNode(node);
	/* 
		node.css("background-color", elementBorderCss.pop());
		node.parent().css("background-color", bordercss);
		
		var position = node.offset();	
		borderdiv.offset(position);
		borderdiv.width(node.width());
		borderdiv.height(node.height());
	 */
	
	}
	
	function NS_MouseClick(event) {
		//console.log("Node selected");
		
		event.preventDefault();
		
		NS_switch = false;
		var nodestr = $("#" + NS_titleNode).text();
		
		var iframe = $("#JST-POPUP-PINNED")[0];
		iframe.contentWindow.postMessage({type:"NS-NodeSelected", tabid:window.tabid, controlid:NS_controlId, value:nodestr}, "*");
		$("#JST-POPUP-PINNED").parent().show();
		
		$("*").removeClass(NS_styleName);
		$("#" + NS_titleNode).text("");
		
		$("*").unbind("mouseenter", NS_MouseIn);
		$("*").unbind("mouseleave", NS_MouseOut);
		$("*").unbind("click", NS_MouseClick);
	}
	
	function NS_processNode(node) {
		$("*").removeClass(NS_styleName);
		node.addClass(NS_styleName);
		
		
		var nodeName = node[0].nodeName;
		var nodeObj = $(node);
		var nodeID = nodeObj.attr("id");
		var nodeClass = nodeObj.attr("class");
		if (nodeID) {
			nodeName = "#" + nodeID;
		} else if (nodeClass) {
			nodeClass = nodeClass.replace(NS_styleName, '').replace(/^\s+/, '').replace(/\s+$/, '');
			if (nodeClass) {
				var classNames = nodeClass.split(/\s+/)
					.filter(function(str) { return str != ""; })
					.map(function(str) { return "." + str; });
				nodeName += classNames.join("");
			}
		}
		$("#" + NS_titleNode).offset(node.offset());
		$("#" + NS_titleNode).text(nodeName);
	}

})(jQuery);