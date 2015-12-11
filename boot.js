(function() {

  function guid() {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
          var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
          return v.toString(16);
      });
  }
  
  
/***************************************************
 *                 Sea.js Settings                 *
 ***************************************************/
  window.require = seajs.require;
  window.run = 
  seajs.run = function(dependencys, callback) {
  	if (!callback)
  		callback = function() {
  			var arglen = arguments.length;
  			for (var i = 0; i < arglen; ++ i) 
  				console.log(arguments[i]);
  		};
  	
  	seajs.use(dependencys, callback);
  }
  /*
  window.clearCache = 
  seajs.clearCache = function(ids) {
  	var idlist = ids;
  	if (typeof ids === "string")
  		idlist = [ids];
  	
  	for (var i = 0; i < idlist.length; ++ i) {
  		var mod = seajs.Module.get(seajs.Module.resolve(idlist[i]));
  		mod.status = 0;
  	}
  }*/
  
  // Add some settings in meta data
  //console.log(meta_data);
  var config;
  if (meta_data && (config = meta_data["seajs.config"])) {
  	seajs.config(config);
  }
  
  // Add some default settings
  seajs.config({
    "alias": {
      "jquery": "[AMD]jquery.js",  //"[AMD]jquery.sea.js"
      "jquery-ui": "jquery-ui.js"
    }
  });
  
  
  
  
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
    else if (data.id == "ready") {
      data.uri = "ready://document";
    }
    
    else {
    	data.uri = seajs.resolve(data.id);
    	if (data.uri.match(/\[AMD\]/i))
    		data.uri = "amd://" + data.uri.replace("[AMD]", "");
    	else if (data.uri.match(/\[CommonJS\]/i))
    		data.uri = "commonjs://" + data.uri.replace("[CommonJS]", "");
    }
    
    //console.log(data);
  });
  
  
/***************************************************
 *               Sea.js Load Plugin                *
 ***************************************************/  
  // Define load plugin for local storage shchema
  seajs.on("load", function(data) {
    //console.log("Loading module: " + data);
  });
  
  
/***************************************************
 *            Sea.js Resolve Plugin                *
 ***************************************************/  
  // Define request plugin for local storage shchema
  seajs.on("request", function(data) {
    //console.log("Requesting module: " + data.uri);
    //console.log(data);
    
    if (! data.requestUri)
      return;
      
    var moduleSpec = "";
    if (data.requestUri.startsWith("amd://")) {
    	data.requestUri = data.requestUri.replace("amd://", "");
    	moduleSpec = "AMD";
    } else if (data.requestUri.startsWith("commonjs://")) {
    	data.requestUri = data.requestUri.replace("commonjs://", "");
    	moduleSpec = "CommonJS";
    }
    
    
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
  
  function requestURI(uri, onload, moduleSpec) {    
    function onXHRload(event) {
      var xhr = event.srcElement;
      if (xhr.readyState == 4 && xhr.status == 200) {
        var srcCode = xhr.responseText;
        // console.log(xhr);
        
        var debugstr = "";
        debugstr = DEBUG.on ? "console.log('Injected " + moduleSpec + " Module: " + uri + "');" : "";
        
        switch (moduleSpec) {
        case "AMD":
        	srcCode = 
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
	}
	
	// Pretend to be an AMD environment.
	define.amd = {};

	// Start of AMD module definition
	
${srcCode};
	
	// End of AMD module definition
}) (this);
`;
        	break;
        case "CommonJS":
        	srcCode = 
`${debugstr}
define (function(require, exports, module) {
	// A CommonJS module definition wrapper which provides exports and module symbols.
	
${srcCode};
	
	// End of CommonJS module definition wrapper
});
`;
        	break;
        }
        
        // send code to background page to run
        var callbackID = name + ":" + guid();
        callbacks[callbackID] = onload;
    
        chrome.runtime.sendMessage({method:"InjectModule", 
                                    data:JSON.stringify({name: uri, code: srcCode, callback: callbackID})});
      }
    }
    
    function onTimeout(event) {
      onload(true);
    }
    
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = onXHRload;
    xhr.ontimeout = onTimeout;
    xhr.open("GET", uri, true);
    xhr.send();
  }
  
  
  chrome.runtime.onMessage.addListener(function(request, sender) {
      if (request.method == "InjectModuleResponse") {
        var error = !!(request.error);
        var callbackID = request.callback;
        var callback = callbacks[callbackID];
        delete callbacks[callbackID];
        
        callback(error);
      }
  });

}) ();