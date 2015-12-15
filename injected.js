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

// process received message sent in content script by
// window.postMessage({ type: "JST-callMethod", func: "enableRightClick" }, "*");
window.addEventListener("message", function(event) {
  // console.log("Message received in injected.js: ", event);
  // We only accept messages from ourselves
  if (event.source != window)
	return;

  if (event.data.type && (event.data.type == "JST-callMethod")) {
	
	var argArray = [], args = JSON.parse(event.data.args);
	for (k in args) {
		argArray[k] = args[k];
	}
		
	// call method __JSTricks_Injected_{method name}
	var prefix = "__JSTricks_Injected_", funcName = event.data.func;
	if (!funcName.startsWith(prefix)) {
		funcName = prefix + funcName;
	}
	var func = window[funcName];
	console.log("Function name is", funcName, ", arguments are", argArray, "\nThe whole event is", event);
	var returnValue = func.apply(this, argArray);
	delete func;
	
	var returnValueStr = JSON.stringify(returnValue);
	
	var responseMsg = { type:"JST-callMethodResponse", func:event.data.func, callback:event.data.callback, returnValue:returnValueStr};
	var domain = "*";
	window.postMessage(responseMsg, domain);
  }
}, false);