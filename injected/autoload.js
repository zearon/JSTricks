/* global window:false, chrome:false, location:false */
// autoload.js
    
// Start initialization
if (!window.autoload) {
  var autoload = createAutoload();
  autoload.run();
}


function createAutoload() {

  function Autoload() {
    this.loaded = false;
    this.storage = null;
    this.INFO = null;
    this.debug = null;
    this.onInitedListeners = [];
    
    var url = location.href;
    var domain_ = url ? url.match(/^[\w-]+:\/*\[?([\w\.:-]+)\]?(?::\d+)?/) : "";
		this.domain = domain_ ? domain_[1] : undefined;
		this.siteStatus = null;
		this.siteStatusCode = 0;
		this.pluginStatus = false;
  }

  Autoload.prototype.addOnInitedListener = function(listener) { 
    var self = this;
         
    self.onInitedListeners.push(listener);
    if (self.storage) {
      callListner(self, listener);
    }
  };

  Autoload.prototype.run = function() {
    var self = this;    
    if (self.loaded)
      return;
      
    self.loaded = true;
    
    chrome.storage.local.get(["enabled", "INFO", "siteIndex"], function(storage) { 
      if (chrome.runtime.lastError)
        chrome.error("Cannot get object from chrome local storage.");
      
      self.storage = storage;
      self.enabled = storage.enabled;
      self.INFO = storage.INFO;
      self.debug = storage.INFO.debug;
      
      if (!self.enabled) {
        return;
      }
  
      if (!window.INFO) { 
        window.INFO = storage.INFO; 
      }
    
      if (self.debug) {
        console.log("Object in storage", storage);
      }
      
      // Apply theme for injected UI components.
      // Corresponding CSS should be injected as configured in manifest.json, like
      //     "css": ["css/jquery-ui.structure.css", "css/theme/jqueryui/jquery-ui.theme-light.css"], 
      window.onload = function() {
        setTheme("light");
      }
      
      // Prepare loading scripts 
      prepare(self, storage);
    });
  };

  Autoload.prototype.setIcon = function (iconStatus) {
    var self = this;
    
    if (!iconStatus) { iconStatus = getIconStatus(self); }
    
    if (self.debug) {
      console.log("autoload.js set icon to", iconStatus);
    }
    
    if (iconStatus === "unchanged")
      return;
    
    sendMessage({method:"SetIcon", data:iconStatus});
  };
  
  function prepare(self, storage) { 
    self.setIcon();
    
    setupSeajs(self);
    startLoading(self);
    
    callListeners(self, storage);
  }
  
  function setupSeajs(self) {    
    var seajs = window.seajs;
    var INFO = self.INFO;
    if (!INFO || !seajs) {
      console.error("Sea.js is not injected or INFO obj is not set. INFO=", INFO, "seajs=", seajs);
      return;
    }
      
    var debug = INFO.debug;
    var settings = INFO.settings;
      
    // Setup seajs environment
    if (seajs.mod_boot) {
      seajs.mod_boot.setDebug(INFO.debug);
      
      // Add some settings in meta data
      var meta_config;
      if (INFO.meta_data && (meta_config = INFO.meta_data["seajs.config"])) {
        seajs.config(meta_config);
  
        // Override the setting with default settings defined in seajs_boot.js
        // and only leave settings different with the ones in the default settings.
        seajs.config(seajs.mod_boot.getDefaultConfig());
      }
    }
  }
  
  function callListeners(self, storage) {    
    if (!self.enabled) {
      return;
    }
    for (var i = 0; i < self.onInitedListeners.length; ++ i) {
      var listener = self.onInitedListeners[i];
      callListner(self, listener);
    }
  }

  function callListner(self, listener) {
    if (!listener.called) {
      listener(self.storage);
      listener.called = true;
    }
  }
  
  function startLoading (self) {
    getSiteStatus(self);
    if (self.debug) {
      console.log("Site status code is", self.siteStatusCode);
    }
    
    if (!self.storage.enabled) {
      console.log("[Javascript Tricks is disabled.]");
    }
    else if (self.siteStatusCode >= 2) {
      console.log("autoload.js starts loading scripts.");
      sendMessage({method: "JSTinjectScript"});
    }
  }
  
  function getSiteStatus(self) {
    if (self.siteStatus)
      return self.siteStatus;
    
    var allScripts = self.storage.siteIndex;
    var siteOption = allScripts[self.domain];
    var defaultEnabled = allScripts["Default"].active;
   // console.log(allScripts, siteOption, defaultEnabled);
  
    if (!self.storage.enabled) {
      self.siteStatus = "disabled";
      self.siteStatusCode = 0;
    } else if (!siteOption) {
      if (defaultEnabled) {
        self.siteStatus = "default";
        self.siteStatusCode = 2;
      } else {
        self.siteStatus = "none";
        self.siteStatusCode = 1;
      }
    } else if (!siteOption.active) {
      if (defaultEnabled) {
        self.siteStatus = "default+inactive";
        self.siteStatusCode = 4;
      } else {
        self.siteStatus = "inactive";
        self.siteStatusCode = 3;
      }
    } else {
      if (defaultEnabled) {
        self.siteStatus = "default+active";
        self.siteStatusCode = 6;
      } else {
        self.siteStatus = "active";
        self.siteStatusCode = 5;
      }
    }
      
    return self.siteStatus;
  }
  
  function getIconStatus(self) {
    var siteStatus = getSiteStatus(self);
    var pluginStatus = self.pluginStatus ? "+plugin" : "";
    
    if (!self.pluginStatus && (!self.storage.enabled || siteStatus == "none") )  
      return "unchanged";
    else
      return siteStatus + pluginStatus;
  }
  
  function sendMessage(msg) {
    chrome.runtime.sendMessage(msg);
  }
  
  function arrayContains(arr, ele) {    
		return arr.some(function(element) { return ele === element; });
  }
  
  return new Autoload();
}