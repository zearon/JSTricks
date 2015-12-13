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
// window.postMessage({ type: "JST-callMethod", text: "enableRightClick" }, "*");
window.addEventListener("message", function(event) {
	console.log("Message received in injected.js: ");
	console.log(event);
  // We only accept messages from ourselves
  if (event.source != window)
	return;

  if (event.data.type && (event.data.type == "JST-callMethod")) {
	console.log("Invocation request received from Content script: " + event.data.text);
	// call method __JSTricks_Injected_{method name}
	window["__JSTricks_Injected_" + event.data.text]();
  }
}, false);