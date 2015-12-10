(function() {

  function guid() {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
          var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
          return v.toString(16);
      });
  }
  
  
/***************************************************
 *                 Sea.js Plugins                  *
 ***************************************************/
  window.run = function(dependencys, callback) {
  	seajs.use(dependencys, callback);
  }
  
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
  });
  
  
  // Define load plugin for local storage shchema
  seajs.on("load", function(data) {
    //console.log("Loading module: " + data);
  });
  
  // Define request plugin for local storage shchema
  seajs.on("request", function(data) {
    //console.log("Requesting module: " + data.uri);
    //console.log(data);
    
    if (! data.requestUri)
      return;
    
    
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
      requestURI(data.requestUri, data.onRequest);
      
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
  
  function requestURI(uri, onload) {    
    function onXHRload(event) {
      var xhr = event.srcElement;
      if (xhr.readyState == 4 && xhr.status == 200) {
        var srcCode = xhr.responseText;
        // console.log(xhr);
        
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