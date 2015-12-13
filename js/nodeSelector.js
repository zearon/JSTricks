seajs.use(["jquery", "selectbox"], function($, SelectionBox) {

	var NS_switch = false;
	var NS_styleName = "NS_SELECTED_NODE_2312356451321356453";
	var NS_titleNode = "NS_nodeSelector";
	var NS_editDialogContext = "{}";
	var currentSelector = null;
	var selectionBox = new SelectionBox();
	var timer = null;
	
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
		} else if (request.method == "HightlightSelectorNode") {
			NS_hightlightNode(request.selector);
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
				//background-color: rgba(0,0,255,0.2);
				border: 2px #3bff3b solid;
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
	
	function NS_hightlightNode(selector) {
		if (timer)
			clearTimeout(timer);
		
		var nodes = $(selector);
		if (nodes.length) {
			console.log("Selected " + nodes.length + " nodes are: ", nodes);
			selectionBox.highlight(nodes[0]);
			
			timer = setTimeout(function() { selectionBox.hide(); }, 5000);
		} else {
			console.log("The elector does not match any node.");
		}
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
	}
	
	function NS_MouseOut() {
		//console.log("Leaving node");
		
		var node = $(this).parent();
		NS_processNode(node);	
	}
	
	function NS_MouseClick(event) {
		//console.log("Node selected");
		
		event.preventDefault();
		
		NS_switch = false;
		var nodestr = currentSelector.full; //$("#" + NS_titleNode).text();
		setTimeout(function() { selectionBox.hide(); }, 5000);
		
		var iframe = $("#JST-POPUP-PINNED")[0];
		iframe.contentWindow.postMessage({type:"NS-NodeSelected", tabid:window.tabid, controlid:NS_controlId, value:nodestr}, "*");
	
		$("#JST-POPUP-PINNED").closest(".ui-dialog").css("z-index", "2147483645");
		$("#JST-POPUP-PINNED").parent().show();
		
		$("*").removeClass(NS_styleName);
		$("#" + NS_titleNode).text("");
		
		$("*").unbind("mouseenter", NS_MouseIn);
		$("*").unbind("mouseleave", NS_MouseOut);
		$("*").unbind("click", NS_MouseClick);
	}
	
	function NS_processNode(node) {
		//$("*").removeClass(NS_styleName);
		//node.addClass(NS_styleName);
		
		selectionBox.highlight(node[0]);
		
		var nodeName = getNodeSelectorStr(node);
		
		$("#" + NS_titleNode).offset(node.offset());
		$("#" + NS_titleNode).text(nodeName);
	}
	
	// node is a jquery node
	function getNodeSelectorStr(node) {		
		var args = {selectors: []};
		maxLevel = 5;
		
		_getSelector(node, args, maxLevel);
		var selector = args.selectors.join(" > ");
		
		currentSelector = {full:selector, simple:(args.selectors.slice(-1)[0])};
		
		return currentSelector.simple;
	}
	
	function _getSelector(node, args, level) {
		if (level <= 0 || node.length < 1)
			return;
			
		var nodeName = "";
		var tagName = node.prop("nodeName").toLowerCase();
		var nodeID = node.attr("id");
		var nodeClass = node.attr("class");
		nodeClass = nodeClass ? $.trim( nodeClass.replace(NS_styleName, '') ) : "";
		if (nodeID) {
			nodeName = "#" + nodeID;
			args.selectors.unshift(nodeName);
			
			return;
		} 
		
		nodeName = tagName;		
		if (nodeClass) {
			var classNames = nodeClass.split(/\s+/)
				.filter(function(str) { return str != ""; })
				.map(function(str) { return "." + str; });
			nodeName = tagName + classNames.join("");
		}
		
		var parentNode = node.parent();
		nodeName += getIndexSelector(node, parentNode);
		
		args.selectors.unshift(nodeName);
		_getSelector(parentNode, args, level-1);
	}
	
	function getIndexSelector(node, parentNode) {
		var siblings = parentNode.children();
		for (var i = 0; i < siblings.length; ++i) {
			var _node = node[0], sibling = siblings[i];
			var isNode = _node === sibling;
			//console.log("check index at ", i, ",", isNode);
			if (isNode) {
				// :nth-child is CSS selector and is 1-based indexed
				return ":nth-child(" + (i+1) + ")";
			}
		}
		
		return "";
	}

});