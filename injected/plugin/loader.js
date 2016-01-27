/* global chrome:false, location:false, document:false, window:false, autoload:false */

// Load plugin content scripts defined in Meta data like:
// {
//   ...
//   "plugins": [
//     {"enabled":false, "index":0, "info":"Sample plugin for *.baidu.com",
//     		"conditions": [ {"url":["\\.baidu\\.com"]} ], 
//      		"action":{"script":"efef", "topFrame":true, "code":""} 
//     },
//     {"enabled":false, "index":1, "info":"Sample plugin for css selector",
//      		"conditions": [ {"selector":"body.wiki-lemma.normal", "delay": 500} ], 
//      		"action":{"script":"Plugins", "topFrame":false, "code":"plugins.test();"} 
//     },
//     {"enabled":true, "index":2, "info":"Adjust Height for Care-Your-Eyes extension",
//      		"conditions": [ {"selector":"#cye-workaround-body", "delay": 500} ], 
//      		"action":{"script":"Plugins", "topFrame":true, "code":"plugins.adjustHeightForEyesProtectExt(0);"} 
//     }
//  	],
//   ...
// }

(function() {
  var debug, settings, pluginLoaded = false;
  autoload.addOnInitedListener(function(obj) {
    loadPlugins(obj.INFO.meta_data.plugins);
  });

  function loadPlugins(plugins) {
    //console.log("plugins obj in storage", plugins);
    var pluginLoaded = false;
    
    plugins.sort(function(p1, p2) {
      var index1 = p1.index ? p1.index : 0;
      var index2 = p2.index ? p2.index : 0;
      return index1 - index2;
    });
  
    for (var i = 0; i < plugins.length; ++ i) {
      var plugin = plugins[i];
      var enabled = plugin.enabled !== false;
      if (!enabled)
        continue;
      
      loadPlugin(plugin);
    }
  }

  function loadPlugin(plugin) {
    var info = plugin.info;
    var conditions = plugin.conditions;
    var action = plugin.action;
    action.notdone = true;
    action.info = info;
  
    for (var i = 0; i < conditions.length; ++i) {
      if (testCondition(conditions[i], action)) {
        action.notdone = false;
        return;
      }
    }
  }

  function testCondition(condition, action) {
    if (!condition)
      return false;
    
    var met = false;
    
    if (condition.url) {  
      // the url is a string    
      if (typeof condition.url === "string") {
        met = testUrlCondition(condition.url);
        if (met) {
          action.conditionMet = condition;
          doAction(action);
          return true;
        } else {
          return false;
        }
      } 
      
      // the url is an array of strings
      else {
        for (var i = 0; i < condition.url.length; ++ i) {
          var url = condition.url[i];
          met = testUrlCondition(url);
          if (met) { 
            doAction(action);
            return true; 
          }
        }
        return false;
      }
    }
    
    if (condition.selector) {
      window.onload = function() {
        testCssSelectorCondition(condition, action);
      }
      return false;
    }
    
    console.error("Unknown condition:", condition, "\nCondition should has a property 'url' or 'selector'. ");
  }
  
  function testUrlCondition(url) {
    var regexp = new RegExp(url, "i");
    return regexp.test(location.href);
  }
  
  function testCssSelectorCondition(condition, action) {
    var delay = condition.delay ? condition.delay : 0;
    
    if (delay === 0) {
      if (hasCssSelectorElement(condition.selector)) {
        action.conditionMet = condition;
        doAction(action);
        return true;
      }
      return false;
    }
    
    else {
      setTimeout(function() {
        if (action.notdone && hasCssSelectorElement(condition.selector)) {
          action.conditionMet = condition;
          doAction(action);
        }
      }, delay);
      
      // pass this condition now because the result is unknown yet.
      return false;
    }
  }
  
  function hasCssSelectorElement(selector) {
    var ele = document.querySelector(selector);
    return ele !== null;
  }

  function doAction(action) {
    var script = action.script, code = action.code;     
    if (!pluginLoaded) {
      pluginLoaded = true;
      autoload.pluginStatus = true;
      autoload.setIcon();
    }
    if (action.info) {
      console.log("[Plugin Loader] " + action.info);
      autoload.notifyMessage({type:"plugin", msg:action.info, script:script, 
          code:code, conditionMet:action.conditionMet});
    }
    if (debug)
      console.log("[Plugin Loader] Loading content script", action.script, "with code:", code);
      
    if (action.topFrame) {
      addScriptNodeWithDataURI(script, code);
    } else {
      sendContentScriptLoadingRequest(script, code);
    }
  }
  
  function sendContentScriptLoadingRequest(scriptName, extraCode) {
    var msgData = {name:scriptName};
    if (!!extraCode) { msgData.extraCode = extraCode; }    
    chrome.runtime.sendMessage( {method:"ExecuteContentScript", data:msgData } );
  }
  
  function addScriptNodeWithDataURI(scriptName, extraCode) {
    var scriptKeyName = "cs-" + scriptName;
    chrome.storage.local.get([scriptKeyName], function(obj) {
      var scriptObj = obj[scriptKeyName];
      if (!scriptObj) {
        console.error("Script", scriptName, "can not be found in cache (chrome.storage.local)");
      } else {
        var scriptCode = scriptObj.script;
        scriptCode += "\n\n//Extra code:\n" + extraCode;
        var dataUri = "data:text/javascript;charset=UTF-8," + encodeURIComponent(scriptCode);
        
        // add this script node. InjectCodeToOriginalSpace is defined in dom.js, which is already injected
        // as content script.
        InjectCodeToOriginalSpace(dataUri);
      }
    });
  }
}) ();
