// A tiny templating engine without eval() which is limited by chrome security policy.

function compile_template(template, context) {
	if (!context) {	
		return template;
	}
	
	var dict = {};
	expandObjectToDict(dict, context);
	
	var result = template;
	for (key in dict) {
		result = result.replace(new RegExp('{{' + key + '}}', 'g'), dict[key]);
	}
	
	//console.log(dict);
	//console.log(result);
	
	return result;
}

function expandObjectToDict(dict, obj, prefix) {
	if (prefix == undefined)
		prefix = "";
	
	for (key in obj) {
		if (key == "__proto__")
			continue;
		
		var value = obj[key], newKey = key;
		if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
			if (isNaN(parseInt(key))) {
				if (prefix) {
					dict[prefix + '.' + key] = value;
				} else {
					dict[key] = value;
				}
			} else {
				if (prefix) {
					//dict[prefix + '.' + key] = value;
					dict[prefix + '[' + key + ']'] = value;
				} else {
					dict[key] = value;
				}
			}
		} else {
			expandObjectToDict(dict, value, 
				prefix ? prefix + "." + key : key);
		}
	}
}


var sandbox_callbacks = {};
var sandbox_iframe_win = null;
window.addEventListener("message", function(event) {
  if (event.data.method !== "Sandbox_Response")
    return;
    
  var cid = event.data.cid;
  sandbox_callbacks[cid](event.data.result, event.data.error);  
  delete sandbox_callbacks[cid];
  
}, false);

function sandbox_init() {
  var iframe = document.createElement("iframe");
  iframe.setAttribute("src", "/sandbox.html");
  iframe.setAttribute("id", "sandbox_page");
  iframe.setAttribute("style", "display:none;");
  document.body.appendChild(iframe);
  sandbox_iframe_win = iframe.contentWindow;
}

// function callback(result, error)
function sandbox_evaluateCode(code, callback) {
  var cid = UTIL.guid();
  sandbox_callbacks[cid] = callback;
  sandbox_iframe_win.postMessage({method:"Sandbox_EvalCode", cid:cid, code:code}, "*");
}

// function callback(result, error)
function sandbox_setObject(objName, obj, callback) {
  var cid = UTIL.guid();
  sandbox_callbacks[cid] = callback;
  sandbox_iframe_win.postMessage({method:"Sandbox_EvalObject", cid:cid, objName:objName, obj:obj}, "*");
}

// function callback(result, error)
function sandbox_evaluateObjectAttr(objName, attr, callback) {
  var cid = UTIL.guid();
  sandbox_callbacks[cid] = callback;
  sandbox_iframe_win.postMessage({method:"Sandbox_EvalObject", cid:cid, objName:objName, attr:attr}, "*");
}