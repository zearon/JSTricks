/* global chrome:false, location:false, document:false */

// Load plugin content scripts defined in Meta data like:
// {
//   ...
//   "plugins": [
//     {"conditions": [ {"url":["^regexp$"]} ], "action":{"script":"dfdf", "code":""} },
//     {"conditions": [ {"selector":"#css_selector", "delay": 1000} ], "action":{"script":"efef", "code":""} }
//   ],
//   ...
// }

(function() {
  var debug, settings;
  chrome.storage.local.get(["INFO"], function(obj) { 
    if (chrome.runtime.lastError)
      chrome.error("Cannot get object from chrome local storage.");
    
    //console.log("INFO obj in storage", obj.INFO);
  
    debug = obj.INFO.debug;
    settings = obj.INFO.settings;
  
    loadPlugins(obj.INFO.meta_data.plugins);
  });

  function loadPlugins(plugins) {
    //console.log("plugins obj in storage", plugins);
  
    for (var i = 0; i < plugins.length; ++ i) {
      var plugin = plugins[i];
      loadPlugin(plugin);
    }
  }

  function loadPlugin(plugin) {
    var conditions = plugin.conditions;
    var action = plugin.action;
    action.notdone = true;
  
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
      return testCssSelectorCondition(condition.selector, condition.delay, action);
    }
    
    console.error("Unknown condition:", condition, "\nCondition should has a property 'url' or 'selector'. ");
  }
  
  function testUrlCondition(url) {
    var regexp = new RegExp(url, "i");
    return regexp.test(location.href);
  }
  
  function testCssSelectorCondition(selector, delay, action) {
    delay = delay ? delay : 0;
    
    if (delay === 0) {
      if (hasCssSelectorElement(selector)) {
        doAction(action);
        return true;
      }
    }
    
    else {
      setTimeout(function() {
        if (action.notdone && hasCssSelectorElement(selector)) {
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
    var script = action.script, code = action.code; var msgData = {name:script};
    console.log("[Plugin Loader] Loading content script", action.script, "with code:", code);
    
    if (!!code) { msgData.extraCode = code; }
    
    chrome.runtime.sendMessage( {method:"ExecuteContentScript", data:msgData } );
  }
}) ();
