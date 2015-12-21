function __JSTricks_Injected_removeEvent(a) {
	var ona = "on" + a;
	if (window.addEventListener) window.addEventListener(a, 
	function(e) {
		for (var n = (e.originalTarget) ? e.originalTarget: e.target; n; n = n.parentNode) {
			n[ona] = null;
		}
		/*console.log("event: " + ona); console.log(e.target);*/
		
	},
	true);
	window[ona] = null;
	document[ona] = null;
	if (document.body) document.body[ona] = null;
}

function __JSTricks_Injected_enableRightClick() {	
	var R = __JSTricks_Injected_removeEvent;
	R("contextmenu");
	R("click");
	R("mousedown");
	R("mouseup");
	R("dragstart");
	R("selectstart");
	R("select");
	R("copy");
	R("beforecopy");
	R("focus");
	R("blur");
}

(function() {
var domainMatch = location.href.match(/^[\w-]+:\/*\[?([\w\.:-]+)\]?(?::\d+)?/); 
__JSTricks_Injected_domain_name____ = domainMatch ? domainMatch[0] : "";
delete domainMatch;

// process received message sent in content script by
// window.postMessage({ type: "JST-callMethod", func: "enableRightClick" }, "*");
window.addEventListener("message", function(event) {
  //console.log("Message received from", event.origin, "in injected.js: ", event, ". Current domain is", __JSTricks_Injected_domain_name____);

  // We only accept JST-callMethod messages from current page.
  if (event.data && event.data.type == "JST-injected-callMethod" && event.origin == __JSTricks_Injected_domain_name____) {
	
	var argArray = [], args = null;
	try {
		args = JSON.parse(event.data.args);
	} catch (ex) {
		args = {};
	}
	for (k in args) {
		argArray[k] = args[k];
	}
		
	// call method __JSTricks_Injected_{method name}
	var prefix = "__JSTricks_Injected_", funcName = event.data.func;
	if (!funcName.startsWith(prefix)) {
		funcName = prefix + funcName;
	}
	var func = window[funcName];
	//console.log("Function name is", funcName, ", arguments are", argArray, "\nThe whole event is", event);
	var returnValue = func.apply(this, argArray);
	delete func;
	
	var returnValueStr = JSON.stringify(returnValue);
	
	var responseMsg = { type:"JST-injected-callMethodResponse", func:event.data.func, callback:event.data.callback, returnValue:returnValueStr};
	window.postMessage(responseMsg, __JSTricks_Injected_domain_name____);
  } else {
  	console.log("Message received", event, " The data is", event.data);
  }
}, false);

}) ();