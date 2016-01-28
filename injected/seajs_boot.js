(function() {

  if (seajs.mod_boot)
    return;

  function guid() {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
          var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
          return v.toString(16);
      });
  }
  
  var debug = false;
  
  seajs.mod_boot = {version:"v0.1"};
  seajs.mod_boot.setDebug = function(isDebug) {
  	debug = isDebug;
  }
  
  function log() {
	  if (debug) {
	  	var args = Array.prototype.slice.call(arguments);
	  	args.unshift("[Sea.js]");
	  	console.debug.apply(console, args);  
	  	delete args;
	  }
  }
  
/***************************************************
 *               Sea.js Config Plugin              *
 ***************************************************/  
  // Define define plugin for local storage shchema
  seajs.on("config", function(data) {
	  log("0. Configuring Sea.js", data, "New config is", seajs.data);
  });    
  
  
/***************************************************
 *                 Sea.js Settings                 *
 ***************************************************/
/*
  // Add some settings in meta data
  //console.log(meta_data);
  var config;
  if (INFO.meta_data && (config = INFO.meta_data["seajs.config"])) {
  	seajs.config(config);
  }
  
  // Add some default settings
  seajs.config({
  	"base": ("chrome-extension://" + chrome.runtime.id + "/js/"),
  	"paths": {
  	},
    "alias": {
      "jquery": "[AMD]jquery.js",  //"[AMD]jquery.sea.js", "[CommonJS]jquery.sea.js"
      "jquery-ui": "[AMD]jquery-ui.js",
      "selectbox": "selectionBox"
    }
  });
*/ 

  function callback_log() {
    var args = UTIL.argsToArray(arguments);
    args.unshift("Exported symbols in these modules:");
    console.log.apply(console, args);
  }
  
  // Export as global symbols
  seajs.run = function(dependencies, callback) {
  	if (!callback)
  		callback = callback_log;
  	
  	seajs.use(dependencies, callback);
  }
  
  seajs.clearCache = function(ids, rerun) {
  	var idlist = ids;
  	if (typeof ids === "string")
  		idlist = [ids];
  	
  	for (var i = 0; i < idlist.length; ++ i) {
  	  var uri = seajs.Module.resolve(idlist[i]);
  	  if (rerun) {
        var mod = seajs.Module.get(uri);
        mod.status = 0;
  	  } else {
  	    delete seajs.cache[uri];
  	  }
  	}
  }
  
  seajs.runtest = function(dependencies, callback) {
    seajs.clearCache(dependencies);    
    seajs.run(dependencies, callback);
  }
  
  if (chrome.extension) {
    window.require = seajs.require;
    window.run = seajs.run;
    window.runtest = seajs.runtest;
  }
  
  
  
  
  
/***************************************************
 *            Sea.js Resolve Plugin                *
 ***************************************************/
  
  // Define resolve plugin for local storage shchema
  seajs.on("resolve", function(data) {    
    if (! data.id)
      return;
    
    if (data.id.startsWith("#")) {
      data.uri = "localstorage://" + data.id.slice(1);
    }
    
    else {
    	data.uri = seajs.resolve(data.id);
    	if (data.uri.match(/\[AMD\]/i))
    		data.uri = "amd://" + data.uri.replace("[AMD]", "");
    	else if (data.uri.match(/\[CommonJS\]/i))
    		data.uri = "commonjs://" + data.uri.replace("[CommonJS]", "");
    	else if (data.uri.match(/\[Raw\]/i))
    		data.uri = "raw://" + data.uri.replace("[Raw]", "");
    }
    
    if (data.uri)
    	log("1. Resolving module id", data.id, "to uri", data.uri);
  });

  
/***************************************************
 *               Sea.js Load Plugin                *
 ***************************************************/  
  // Define load plugin for local storage shchema
  seajs.on("load", function(data) {
    log("2. Loading module:", data.length > 0 ? data.join("\n") : "[empty]");
  });

  
/***************************************************
 *               Sea.js Fetch Plugin               *
 ***************************************************/  
  // Define load plugin for local storage shchema
  seajs.on("fetch", function(data) {
    log("3. Fetching module:", data);
  });
  
  
/***************************************************
 *            Sea.js Request Plugin                *
 ***************************************************/  
  // Define request plugin for local storage shchema
  seajs.on("request", function(data) {
    
    if (! data.requestUri)
      return;
      
    var moduleSpec = "";
    if (data.requestUri.startsWith("amd://")) {
    	data.requestUri = data.requestUri.replace("amd://", "");
    	moduleSpec = "AMD";
    } else if (data.requestUri.startsWith("commonjs://")) {
    	data.requestUri = data.requestUri.replace("commonjs://", "");
    	moduleSpec = "CommonJS";
    } else if (data.requestUri.startsWith("raw://")) {
    	data.requestUri = data.requestUri.replace("raw://", "");
    	moduleSpec = "Raw";
    }
    
   	log("4. Requesting module: ", data.uri, "The requeste data is:", data);
    
    if (data.requestUri.startsWith("localstorage://")) {
      var name = data.requestUri.replace("localstorage://", "");
      //console.log("Request local storage for module: " + name);
      
      requestScriptInLocalStorage(name, data.onRequest);
      
      data.requested = true;
    }
    
    else if (data.requestUri.startsWith("ready://")) {
      //console.log("Request dom ready");
      
      //var domReady = seajs.require("domReady");
      //domReady(function() { data.onRequest(); });
      
      //data.requested = true;
    }
    
    else {
      // handle regular http:// https:// and chrome-extension:// request
      
      requestURI(data.requestUri, data.onRequest, moduleSpec);
      
      data.requested = true;
    }
    
  });   
  
  
  callbacks = {};
  function requestScriptInLocalStorage(name, onload) {
    var callbackID = name + ":" + guid();
    callbacks[callbackID] = onload;
    
    chrome.runtime.sendMessage({method:"InjectModule", 
                                data:JSON.stringify({name: name, callback: callbackID})});
  }
  
  function onScriptInjected(request) {
    var error = !!(request.error);
    var callbackID = request.callback;
    var callback = callbacks[callbackID];
    delete callbacks[callbackID];
    
    callback(error);
  }
  
  chrome.runtime.onMessage.addListener(function(request, sender) {
    if (request.method == "InjectModuleResponse") {
      onScriptInjected(request);
    }
  });
  
  function requestURI(uri, onload, moduleSpec) {
    function onXHRload(event) {
      var xhr = event.srcElement;
      if (xhr.readyState == 4 && xhr.status == 200) {
      	var url = xhr.responseURL;
        var srcCode = xhr.responseText;
        log("4# Module at ", url, "finished loading:", xhr);
        
        if (!moduleSpec)
        	moduleSpec = "CMD"
        var debugstr = "";
        debugstr = (typeof INFO !== "undefined" && INFO.debug) ? "console.log('Injected " + moduleSpec + " Module: " + uri + "');" : "";
        
//        var defineWrapper =
/*****************************************************************************
 *     CMD define function wrapper injecting uri as ID of anonymous module   *
 *****************************************************************************/ 
//``;        
        
        switch (moduleSpec) {
        case "AMD":
        	srcCode = 
/***************************************************
 *            AMD module wrapper              *
 ***************************************************/ 
`${debugstr}
(function(global) {
	var commentRegExp = /(\\/\\*([\\s\\S]*?)\\*\\/|([^:]|^)\\/\\/(.*)$)/mg;
	function isFunction(it) { return Object.prototype.toString.call(it) === '[object Function]'; }
	function isArray(it) { return Object.prototype.toString.call(it) === '[object Array]'; }
	
	// Replace define function of Sea.js with a AMD definition adapter which adapts AMD define function to 
	// Sea.js define function so that the AMD module defined below can be defined in Sea.js specification properly.
	var define = function (name, deps, callback) {
		//Allow for anonymous modules
		if (typeof name !== 'string') {
				//Adjust args appropriately
				callback = deps;
				deps = name;
				name = undefined;
		}
	
		//This module may not have dependencies
		if (!isArray(deps)) {
				callback = deps;
				deps = undefined;
		}
		
		if (name == undefined) {
			name = "amd://${url}";
		}
		
		// CMD module factory
		var cmd_module_factory = null;
		if (!isFunction(callback)) {
			// The callback is not a function and it provides the defined module itself.
			cmd_module_factory = callback;
		} 
		else {
			// The callback is a factory function to produce the defined module.
			cmd_module_factory = function(require, exports, module) {
				var args = [];
				if (deps) {
					for (var i = 0; i < deps.length; ++i) {
						var depMod = require(deps[i]);
						args.push(depMod);
					}
				}
				
				// call the factory function to produce the module.
				return callback.apply(global, args);
			}
		}
			
		// Call the Sea.js define function.
		global.define(name, deps, cmd_module_factory);
		
		delete define;
	}
	
	// Pretend to be an AMD environment.
	define.amd = {};

	// Start of AMD module definition
	
${srcCode};
	
	// End of AMD module definition
}) (window);
`;
        	break;
        case "CommonJS":
        	srcCode = 
/***************************************************
 *            CommonJS module wrapper              *
 ***************************************************/ 
`${debugstr}
define ("commonjs://${url}", function(require, exports, module) {
	// A CommonJS module definition wrapper which provides exports and module symbols.
	
${srcCode};
	
	// End of CommonJS module definition wrapper
});
`;
        	break;
        case "CMD":
        	srcCode = 
/***************************************************
 *               CMD module wrapper                *
 ***************************************************/ 
`${debugstr}
(function(global) {
	// Provide a wrapper for define function to inject uri for anonymous modules.
	var _define = typeof global !== "undefined" ? global.define : window.define;
	function isFunction(it) { return Object.prototype.toString.call(it) === '[object Function]'; }
	function isArray(it) { return Object.prototype.toString.call(it) === '[object Array]'; }
	var define = function (id, deps, factory) {
	  var argsLen = arguments.length;
	
	  // define(factory)
	  if (argsLen === 1) {
		factory = id;
		id = undefined;
	  }
	  else if (argsLen === 2) {
		factory = deps;
	
		// define(deps, factory)
		if (isArray(id)) {
		  deps = id;
		  id = undefined;
		}
		// define(id, factory)
		else {
		  deps = undefined;
		}
	  }
	  
	  if (id == undefined) {
		id = "${url}";
	  }
	  
	  _define(id, deps, factory);
	}

// Start of CMD module definition wrapper		
${srcCode};		
// End of CMD module definition wrapper

	delete define;
	delete _define;
}) (window);
`;
        	break;
        case "Raw":
        	srcCode = 
/***************************************************
 *               Raw module wrapper                *
 ***************************************************/ 
`${debugstr}
// A Raw module definition wrapper which provides exports and module symbols.
	
${srcCode};
	
// End of Raw module definition wrapper
`;
        	break;
        }
        
        // Add annotation comment so that this dynamic script will be given a name in 
        // Chrome Dev Tools, so that break points can be set on this script.
        var prefix = "chrome-extension://" + chrome.runtime.id + "/dynamic/";
        var scriptName = uri.replace(new RegExp("^(.*?:\\/\\/)?("+chrome.runtime.id+"\\/)?"), prefix);
        //console.log(scriptName);
        srcCode += "\n\n//# sourceURL=" + scriptName;
        
        // If it is in a content script, then send the code to background page to run
        if (chrome.extension) {
          var callbackID = name + ":" + guid();
          callbacks[callbackID] = onload;
  
          chrome.runtime.sendMessage({method:"InjectModule", 
                        data:JSON.stringify({name: uri, code: srcCode, callback: callbackID})});
        } 
        
        // Otherwise, it is in a top frame script, so eval the code directly.
        else {
          eval(srcCode);
          onload(false);
        }
      }
    } // end of onXHRload
    
    function onTimeout(event) {
      onload(true);
    }
    
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = onXHRload;
    xhr.ontimeout = onTimeout;
    xhr.open("GET", uri, true);
    xhr.send();
  }
  
  
/***************************************************
 *               Sea.js Define Plugin              *
 ***************************************************/  
  // Define define plugin for local storage shchema
  seajs.on("define", function(data) {
	  log("5. Defining module", data.id, " module. uri=", data.uri, "deps = ", data.deps, data.factory ? "" : ", factory is [empty]" );
  });  
  
  
/***************************************************
 *               Sea.js Exec Plugin                *
 ***************************************************/  
  // Define define plugin for local storage shchema
  seajs.on("exec", function(data) {
	  log("6. Excuting module", data.id, data );
  });     
  
  
/***************************************************
 *               Sea.js Error Plugin               *
 ***************************************************/  
  // Define define plugin for local storage shchema
  seajs.on("error", function(data) {
	  log("#. ERROR:", data);
  });  
  
  seajs.mod_boot.getDefaultConfig = function () {
    return {
      "base": ("chrome-extension://" + chrome.runtime.id + "/injected/"),
      "paths": {
        "lib": "chrome-extension://" + chrome.runtime.id + "/lib",
        "mootools": "https://ajax.googleapis.com/ajax/libs/mootools/1.6.0"
      },
      "alias": {
        "jquery": "lib/jquery[AMD]",  //"[AMD]jquery.sea.js", "[CommonJS]jquery.sea.js"
        "jquery-ui": "lib/jquery-ui[AMD]",
        "ready": "ready[AMD]",
        "msgbox": "msgbox",
        "selectbox": "selectionBox",
        "mootools": "mootools/mootools[Raw]"
      }
    };
  };
  
  // Add some default settings
	seajs.config(seajs.mod_boot.getDefaultConfig());

}) ();