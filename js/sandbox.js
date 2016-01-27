// see https://developer.chrome.com/extensions/sandboxingEval#load_file
// the client code is in js/common/templating.js

var cachedObjs = {}

window.addEventListener("message", function(event) {
  //console.log("Received Message in sandbox.js", event.data);
  if (event.data.method === "Sandbox_EvalCode") {
    evalCode(event.data);
  } else if (event.data.method === "Sandbox_EvalObject") {
    evalObject(event.data);
  }
}, false);

function evalCode(data) {
  try {
    var result = eval(data.code);
    sendResponse(data, result);
  } catch (ex) {
    sendResponse(data, null, ex.message);
  }
}

function evalObject(data) {
  if (data.objName && data.obj) {
    cachedObjs[data.objName] = data.obj;
  }
  
  if (data.objName && data.attr) {
    try {
      var result = eval("cachedObjs['" + data.objName +"']" + data.attr);
      sendResponse(data, result);
    } catch (ex) {
      sendResponse(data, null, ex.message);
    }
  }
}

function sendResponse(data, result, error) {
  window.top.postMessage({method:"Sandbox_Response", cid:data.cid, result:result, error:error}, "*");
}