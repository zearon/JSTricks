(function() {
	
	chrome.runtime.onMessage.addListener(function(request, sender) {
		handleExtensionMessages(request, sender);
	});
	
	var NS_editDialogContext = "{}";
	function handleExtensionMessages(request, sender) {
		//console.log("INFO.tabid", INFO.tabid);
		if (request.method == "SaveEditDialogContextRequest") {
			NS_editDialogContext = request.context;
			//console.log("Save edit dialog context:");
			//console.log(NS_editDialogContext);
		} else if (request.method == "RestoreEditDialogContextRequest") {
			var iframe = $("#JST-POPUP-PINNED")[0];
			iframe.contentWindow.postMessage({type:"RestoreEditDialogContextResponse", tabid:INFO.tabid, context:NS_editDialogContext}, "*");
		} else if (request.method.startsWith("NS-")) {
			lazyInit_HandleMessages(request, sender);
		}
	}
	
	/* If no Node selector related messages, which starts with NS-, do not load nodeSelector 
	 * module which requires jquery indirectly. So for most websites that do not need any JS tricks,
	 * the memory and CPU resources for one jquery script is saved.
	 */
	var handler = null;
	function lazyInit_HandleMessages(request, sender) {
		if (handler) {
			console.info("Cached node selector handler.");
			handler.handleMessages(request, sender);
		} else {
			console.info("Init node selector handler.");
			run(["nodeSelector"], function(nodeSelector) {
				nodeSelector.handleMessages(request, sender);
				handler = nodeSelector;
			});
		}
	}

}) (this);


define("nodeSelector", ["jquery", "selectbox", "msgbox"], function(require, exports, module) {
	var $ = require("jquery");
	var SelectionBox = require("selectbox");
	var msgbox = require("msgbox");
	
	// window.tabid is injected in bg.js on tab created and updated
	var tabid = INFO.tabid;
	var edgeSize = typeof INFO !== "undefined" ? INFO.settings.builtin_selectionboxEdgeSize : undefined;
	var edgeColor = typeof INFO !== "undefined" ? INFO.settings.builtin_selectionboxEdgeColor : undefined;
	var selectionBox = new SelectionBox(edgeSize, edgeColor);
	var autoScrollToSelectedNode = true;
	
	var NS_switch = false;
	var NS_styleName = "NS_SELECTED_NODE_2312356451321356453";
	var NS_titleNode = "NS_nodeSelector";
	
	var timer = null;
	var currentSelector = null;
	var lastSelectedNodes = null;	
	
	// Export handleMessages function
	exports.handleMessages = function(request, sender) {
		if (request.method == "NS-StartSelectingNode") {
			NS_startSelectingNode(request);
		} else if (request.method == "NS-HightlightSelectorNode") {
			NS_hightlightNode(request.selector);
		}	
	}
	
	$(NS_init_selection_box);
	
	
	
	
	function NS_init_selection_box() {		
		$(`
		<style>
			.${NS_styleName} {
				//background-color: rgba(0,0,255,0.2);
				border: ${edgeSize}px ${edgeColor} solid;
			}
			
		</style>
		`).appendTo("body");
		
		borderdiv = $(`
			<span id='${NS_titleNode}' style='display:none; background-color: rgba(255,255,255,1); position:absolute; z-index:99999; font-size:10px' ></span>
		`).appendTo("body");
	}

	function NS_hightlightNode(selector) {
		if (timer)
			clearTimeout(timer);
			
		if (lastSelectedNodes) {
			lastSelectedNodes.removeClass(NS_styleName);
			selectionBox.hide();
		}
		
		var nodes = $(selector);
		if (nodes.length) {			
			msgbox("" + nodes.length + " nodes are selected.");
			console.log("Selected " + nodes.length + " nodes are: ", nodes);
			
			nodes.addClass(NS_styleName);
			
			var firstNode = nodes[0];
			selectionBox.highlight(firstNode);
			
			if (autoScrollToSelectedNode) {
				var top = $(firstNode).offset().top;
				var windowHeight = $(window).height();
				var scrollerPos = document.body.scrollTop;
				console.log("top", top, "height", windowHeight);
				if (top > windowHeight + scrollerPos) {
					document.body.scrollTop = top - 100;
				} else if (top < scrollerPos) {
					document.body.scrollTop = top - 100;
				}
			}
			
			timer = setTimeout(function() { 
				nodes.removeClass(NS_styleName);
				selectionBox.hide(); 
			}, 5000);
			
			lastSelectedNodes = nodes;
		} else {
			lastSelectedNodes = null;
			msgbox("The selector does not match any node.");
		}
	}
	
	function NS_startSelectingNode(request) {
		console.log("start selecting node");
		console.log(request);
		
		
		//NS_switch = true;
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
		
		//NS_switch = false;
		var nodestr = currentSelector.full; //$("#" + NS_titleNode).text();
		setTimeout(function() { selectionBox.hide(); }, 5000);
		
		var iframe = $("#JST-POPUP-PINNED")[0];
		iframe.contentWindow.postMessage({type:"NS-NodeSelected", tabid:tabid, controlid:NS_controlId, value:nodestr}, "*");
	
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