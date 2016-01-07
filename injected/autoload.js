/* global window:false, chrome:false */
// autoload.js

// Content script autoload.js is an entry point for websites that has active site script.
// It is configured in /js/bg_declaration.js with a Rule registed on 
// chrome.declarativeContent.onPageChanged event as following.
// {
//   id: "loadScript",
//   priority: 103,
//   conditions: [
//     new chrome.declarativeContent.PageStateMatcher({
//       pageUrl: { urlMatches: getSetting("temp-activesites-pattern") },
//     })
//   ],
// 
//   // And shows the extension's page action.
//   actions: [  new chrome.declarativeContent.RequestContentScript({
//     "js": [ "injected/sea-debug.js", "injected/seajs_boot.js", "injected/autoload.js"],
//     "allFrames": false,
//     "matchAboutBlank": false}) ]
// }		
// According to this rule, every time a page changed event is fired in the browser, chrome 
// tests the condition represented by a regular expression saved as "temp-activesites-pattern"
// in settings with the current page url. If the condition is met, chrome loads a bunch of 
// scripts represented in the RequestContentScript object.
// 
// Every time the autostart status of a site script or the Default site script changed, 
// the setting item "temp-activesites-pattern" is regenerated accordingly and saved, and 
// this rule is re-registered to update the pattern. In this way a lot of computing resource
// is saved because only websites that are configureed to load some user scripts do the 
// loading work.

(function() {
  if (window.autoload)
    return;

  var autoload = new Autoload();

  function Autoload() {
    this.storage = null;
    this.onInitedListeners = [];
  
    // Start initialization
  }

  Autoload.prototype.addOnInitedListener = function(listener) {      
    this.onInitedListeners.push(listener);
    if (this.storage) {
      listener(storage);
      listener.called = true;
    }
  }

  Autoload.prototype.init = function() {
    var instance = this;
    
    chrome.storage.local.get(["INFO"], function(storage) { 
      if (chrome.runtime.lastError)
        chrome.error("Cannot get object from chrome local storage.");
    
      console.log("Object in storage", storage);
  
      if (!window.INFO) { window.INFO = storage.INFO; }
      debug = storage.INFO.debug;
      settings = storage.INFO.settings;
      
      this.storage = storage; 
      prepare.call(instance, storage);
    });
  }
  
  function prepare(storage) { 
    this.setIcon();
    startLoading.call(this);
    
    callListeners.call(this, storage);
  }
  
  function callListeners(storage) {
    for (var i = 0; i < this.onInitedListeners.length; ++ i) {
      var listener = this.onInitedListeners[i];
      if (!listener.called)
        listener(storage);
    }
  }

  function startLoading () {
    console.log("autoload.js starts loading scripts.");
    chrome.runtime.sendMessage({method: "JSTinjectScript"});
  }

  Autoload.prototype.setIcon = function (iconStatus) {
    if (!iconStatus) { iconStatus = getIconStatus.call(this); }
    
    console.log("autoload.js set icon to", iconStatus);
    if (iconStatus === "unchanged")
      return;
    
    //chrome.runtime.sendMessage({method:"SetIcon", data:iconStatus});
  };
  
  function getIconStatus() {
  
    return "unchanged";
  }
  
  
  window.autoload = autoload;
  autoload.init();
  //window.Autoload = Autoload;
}) ();