var DEBUG = storage.getSetting("DEBUG") == "true";
var INFO;

function log() {
  if (DEBUG) {
    console.log.apply(console, arguments);
  }
}

function debug_log() {
  if (DEBUG) {
    var stacktrace = new Error().stack.replace(/[\s\S]*?debug_log.*\n/, "").replace(/\n[\s\S]*/, "");
    console.log.apply(console, argsToArr(arguments, [stacktrace]));
    //console.log(new Error("stack trace"));
  }
}

function updateSettings(extraAttribute) {
  DEBUG = storage.getSetting("DEBUG") === "true";
  var enabled = storage.getSetting("enabled") !== "false";
  var setting = {};
  storage.iterateSettings(function(name, val) {
    // iteration
    if (name.startsWith("cloud-") || name.startsWith("temp-"))
      return;
      
    setting[name] = val;
  }, function() {
    // on complete
    INFO = { enabled:enabled, loaded:{}, settings: setting, debug: DEBUG, meta_data: storage.getMetadata(true) };
        
    // Save the meta object into chrome.storage.local so that autoload.js can create the 
    // global variable INFO before any scripts are injected.
    chrome.storage.local.set({"INFO": INFO});
    chrome.storage.local.set({"enabled": enabled});

    console.log("Settings are updated, and new INFO is", INFO);
  });
}

// Reload settings from local storage after the background page is automatically closed 
// because of idle for a period of time.
// localStorage["info"] should store version number, so this code checkes if this extension is newly installed
if (localStorage["info"])
  updateSettings();
    
(function(global) {

  chrome.runtime.onInstalled.addListener(initExtension);



/* Several ways to inject a script into a web page:
1. Insert a <script type="text/javascript" src="path/to/script/file/in/extension/dir.js"></script> node.
2. Insert a <script type="text/javascript" src="data:text/javascript;charset=utf-8,encodeURIComponent(SCRIPT_CONTENT)"></script> node.
3. chrome.tabs.executeScript()
*/
    // Fix a chrome bug which mess up tab id for prerendered page
    chrome.webNavigation.onTabReplaced.addListener(function(detail) {
      console.log(`TAB-REPLACEMENT: Tab ${detail.replacedTabId} is replaced by tab ${detail.tabId}`);
      
      processTab(detail.tabId, "JSTinjectScript");
    });
      
    
    //chrome.extension.onRequest.addListener(function(request, sender) {
    chrome.runtime.onMessage.addListener(function(request, sender) {
      if (request.tabid) {
        processTab(request.tabid, request.method, request.data);
      } else if (request.windowid) {
        //chrome.tabs.query({active:true, windowId:chrome.windows.WINDOW_ID_CURRENT}, function(tabs) {
        //  if (chrome.runtime.lastError) {
        //    // tab is not fetched successfully
        //    console.error("Cannot get selected tab.");
        //  } else {
        //    // debug_log(`Current active tab is ${tabs[0].id}, title: ${tabs[0].title}, url:${tabs[0].url}`);
            
            var tabid = (sender && sender.tab) ? sender.tab.id : undefined;
            processTab(tabid, request.method, request.data);
        //  }
        //});
      } else {
        var tabid = (sender && sender.tab) ? sender.tab.id : undefined;
        processTab(tabid, request.method, request.data);
      }
    });
    
    function processTab(tabid, requestMethod, requestData) {
      // if tabid is undefined
      if (!tabid) {
        processRequest(undefined, undefined, requestMethod, requestData);
      } else {
        chrome.tabs.get(tabid, function(tab) {
          if (chrome.runtime.lastError) {
            // tab is not fetched successfully
            // May be it is a prefetch (prerendering) tab
            console.log(`--- [Invisible Tab] ${tabid} does not exist`);
          } else {
            // debug_log(`[JScript Tricks] processing tab ${tab.id} title:${tab.title}, url:${tab.url}`);
            processRequest(tab.id, tab.url, requestMethod, requestData);
          }
        });
      }
    }
    
    function processRequest(tabid, url, requestMethod, requestData) {  
      var domain = getDomainFromUrl(url);
      //if (INFO.debug)
        console.log("Tab", tabid, "Processing", requestMethod, "request", "for domain", domain/*, "with data", requestData*/);
      
      // Load _Main script as the entry-point of requireJS
      if (requestMethod == "EnableDisableExt") {
        var enabled = requestData === "true";
        chrome.storage.local.set({"enabled": enabled});
        
        resetDeclarativeRules(function() {
          setIconSet(tabid, domain, enabled ? "enabled" : "disabled");
          debug_log("Set enabled status to " + enabled);
        });
        
      }
      
      // Set icon. Message sent from autoload.js
      if (requestMethod == "SetIcon") {
        var iconStatus = requestData;
        setIconSet(tabid, domain, iconStatus);
        
        debug_log("Set icon status to " + iconStatus);
      }
      
      // Set icon. Message sent from popup and option page
      if (requestMethod == "UpdateIconForDomain") {
        var domain = requestData;
        updateIconForDomain(domain);
      }
      
      // Inject site-specific scripts on website loaded.
      else if (requestMethod == "JSTinjectScript") {        
        var autoloadFileList = [];
        var loadProperty = {domain:domain, necessaryAdded: false, autostartLibAdded: false, 
          defaultAdded: false, siteAdded: false, index: storage.loadIndexObj()};
        
        initAndAddMain(tabid, url, autoloadFileList, loadProperty);  
        injectAndAutoIncludeScript(tabid, url, autoloadFileList, loadProperty);
               
        loadDefaultScript(tabid, domain, autoloadFileList, loadProperty);
      }
      
      // Load _Main script as the entry-point of requireJS
      else if (requestMethod == "LoadMainScript") {            
        debug_log("[JScript Tricks] Load _Main script as the entry-point of requireJS");
      }
      
      // Invoked when content menues are clicked.
      else if (requestMethod == "ExecuteContentScript") {
        var csName = requestData.name;
        var initCode = requestData.initCode;
        var extraCode = requestData.extraCode;
        var autoloadFileList = [];
        var loadProperty = {domain:domain, necessaryAdded: false, testURL: true, 
            index: storage.loadIndexObj()};
        
        initAndAddMain(tabid, url, autoloadFileList, loadProperty);
        injectAndAutoIncludeScript(tabid, url, autoloadFileList, loadProperty);
        
        if (initCode) {
          autoloadFileList.push({"name":"contextMenuInit", "code":initCode, "type":"js"});
        }
        addAContentScriptToLoadList(autoloadFileList, csName, loadProperty);
        if (extraCode) {
          autoloadFileList.push({"name":"contextMenuInit", "code":extraCode, "type":"js"});
        }
        
        var lastScript = autoloadFileList[autoloadFileList.length - 1];
        lastScript.name = lastScript.name + "-" + guid();
        
        // Load all included files in chain.
        loadAndInjectScripts(tabid, autoloadFileList);
      }
      
      // Invoked by RUN script or RUN selected script in popup window
      else if (requestMethod == "ExecuteSiteScript") {
        var data = JSON.parse(requestData);
        //debug_log(data);
        var name = data.name;
        var includes = data.includes;
        var script = data.script;
        
        var autoloadFileList = [];
        var loadProperty = {domain:domain, necessaryAdded: false, testURL: true,
            index: storage.loadIndexObj() };
            
        initAndAddMain(tabid, url, autoloadFileList, loadProperty);
        injectAndAutoIncludeScript(tabid, url, autoloadFileList, loadProperty);
        
        addContentScriptsToLoadList(autoloadFileList, includes, loadProperty);
        autoloadFileList.push( {"name":name+"-"+guid(), "code":script, "type":"js"} );
        
        loadAndInjectScripts(tabid, autoloadFileList);
      }
      
      // Load _Main script as the entry-point of requireJS
      if (requestMethod == "LoadMainScript") {            
        debug_log("[JScript Tricks] Load _Main script as the entry-point of requireJS");
      }
      
      // Invoked when sea.js request a module saved in local storage with a URI such as localstorage://Novel.
      // or the source code of a external script file.
      else if (requestMethod == "InjectModule") {
        var data = JSON.parse(requestData);
        var csName = data.name;
        var srcCode = data.code;
        var callbackID = data.callback;
        
        var autoloadFileList = [];
        if (srcCode !== undefined) {
          autoloadFileList.push({"name":csName, "code":srcCode, "type":"js"});
        } else {
          var loadProperty = { domain:domain, index: storage.loadIndexObj() };
          addAContentScriptToLoadList(autoloadFileList, csName, loadProperty);
        }
        
        if (autoloadFileList.length < 1) {
          // error in loading script.
          chrome.tabs.sendMessage(tabid, {method: "InjectModuleResponse", error: "true", callback: callbackID});
        } else {
          // Load all included files in chain.
          loadAndInjectScripts(tabid, autoloadFileList, function() {
            // script is loaded
            chrome.tabs.sendMessage(tabid, {method: "InjectModuleResponse", callback: callbackID});
          });
        }        
      }
      
      // Invoked by request from content scripts to inject other content script as 
      // a script node in DOM tree with Data URI. In this way, the injected script is
      // executed in the top frame, instead of the extension frame. The window objects
      // in the two frames are different, but share a same DOM tree. For example (in content script):
      // chrome.runtime.sendMessage({tabid: INFO.tabid, method:"ExecuteJsCodeOrFile", data:"Test"}); // Test is the name of a content script.
      else if (requestMethod == "InjectContentScriptAsScriptNode"){
        var args = JSON.parse(requestData);
        var csName = args.name;
        var code = args.code;
        var callbackID = args.callback ? args.callback : "";
        
        if (code) {
          injectScriptNode(tabid, csName, callbackID, code);
        } else {
          storage.getScript(csName, "cs", function(scriptObj) {
            injectScriptNode(tabid, csName, callbackID, scriptObj.script);            
          });
        }
        
      }
      
      // When settings are changed in options page (options.js), this message is sent to inform background page.
      else if (requestMethod == "UpdateSettings") {
        updateSettings();
      }
      
      // Invoked when "Load Default Settings" buttons in options.html is clicked
      else if (requestMethod == "LoadDefaultSettings") {
        loadDefaultSettings(true);
      }
      
      // Invoked by DEBUG content script. Other script can send this message as well. For example:
      // chrome.runtime.sendMessage( {tabid: INFO.tabid, method:"ExecuteJsCodeOrFile", data:[
      //   { code: ` InjectCodeToOriginalSpace("${src}");`} ]
      // } );
      // data is a list of object, which has a code or file attribute that will be forwarded to chrome.tabs.executeScript function.
      else if (requestMethod == "ExecuteJsCodeOrFile") {
        var execs = requestData;
        for (var i = 0; i < execs.length; ++ i) {
          debug_log("Execute JS code or file: ", execs[i]);
          chrome.tabs.executeScript(tabid, execs[i]);
        }
      }
      
      // Invoked by popup window when pin it.
      else if (requestMethod == "InjectPopupPage") {
        var code = compile_template(codesnippit_showPopupInWebpage, requestData);
        //debug_log(code);
        chrome.tabs.executeScript(tabid, {"code": code});
      }
      
      // Invoked by DEBUG content script.
      else if (requestMethod == "ReloadBackroundPage") {
        location.reload();
      }
    }
    
    function injectScriptNode(tabid, csName, callbackID, script) {
      var dataUri = "data:text/javascript;charset=UTF-8," + encodeURIComponent(script);
      chrome.tabs.executeScript(tabid, { code:`
        InjectCodeToOriginalSpace("${dataUri}", function() {
          // On script node loaded:
          //console.log("Script ${csName} loaded.");
          //console.log("__JSTricks_Messenger_OnScriptLoaded is", window["__JSTricks_Messenger_OnScriptLoaded"]);
          window["__JSTricks_Messenger"].onScriptLoaded("${callbackID}");
        });
      `} );
    }
    
    function setIconSet(tabid, domain, status) {
      if (status === undefined || status === "enabled") {
        // one of "default+active", "default", "active", "inactive", "none"
        status = getSiteStatus(domain);
      }
      
      console.log("Set icon status to", status);
      
      var iconPath = null;
      switch (status) {
      case "disabled":
        iconPath = {"19":"icon/ICON19_disabled.png", "38":"icon/ICON38_disabled.png"};
        break;
      case "inactive":
        iconPath = {"19":"icon/ICON19_inactive.png", "38":"icon/ICON38_inactive.png"};
        break;
      case "active":
        iconPath = {"19":"icon/ICON19_active.png", "38":"icon/ICON38_active.png"};
        break;
      case "default":
        iconPath = {"19":"icon/ICON19_dft.png", "38":"icon/ICON38_dft.png"};
        break;
      case "default+active":
        iconPath = {"19":"icon/ICON19_dft_active.png", "38":"icon/ICON38_dft_active.png"};
        break;
      default:
        iconPath = {"19":"icon/ICON19.png", "38":"icon/ICON38.png"};
        break;
      }
      
      chrome.pageAction.setIcon( {tabId: tabid, path: iconPath} );
    }
    
    function updateIconForDomain(domain) {
      var siteStatus = getSiteStatus(domain);
      
      chrome.tabs.query({url:"*://"+domain+"/*"}, function(tabs) {
        if(!tabs)
          return;
        
        for ( var i = 0; i < tabs.length; ++ i) {
          setIconSet(tabs[i].id, domain, siteStatus);
        }
      });
    }
    
    function initAndAddMain(tabid, url, autoloadFileList, loadProperty) {
      if (loadProperty.necessaryAdded)
        return;
        
      // Test if this site is is a target for an active site script.
      // Only "ExecuteContentScript" and "ExecuteSiteScript" message will set this flag
      // The "JSTinjectScript" message sent by autoload.js does not set this flag.
      if (loadProperty.testURL) {
        var isSiteActive = loadProperty.index.siteScripts[loadProperty.domain];
        if (isSiteActive)
          return;
      }
        
      loadProperty.necessaryAdded = true;
        
      var setTabInfoCode = codesnippet_getOnBootCode(tabid, url);
      // console.log(setMetaDataCode);
      autoloadFileList.unshift(
        {name:"boot/setMetaData", code:setTabInfoCode, type:"js"}/*,
         // confiture seajs_boot.js injection manifest.json
        {name:"boot/seajs_boot", file:"injected/seajs_boot.js", type:"js"}, 
        {name:"boot/nodeSelector", file:"injected/nodeSelector.js", type:"js"}*/
      );      
      
      var mainScript = loadProperty.index.siteScripts["Main"];
      if (mainScript && mainScript.active) {
        addContentScriptsToLoadList(autoloadFileList, loadProperty.index.cachedDeps["Main"], loadProperty);
        autoloadFileList.unshift({name:"boot/Main", tobeloaded:["dss", "Main"], code:"", type:"js"});
      }
    }
    
    function loadDefaultScript(tabid, domain, autoloadFileList, loadProperty) {    
      // debug_log("Loading default script.");
      var defaultScrit = loadProperty.index.siteScripts["Default"];
      if (defaultScrit && defaultScrit.active) {
        loadProperty.defaultAdded = true;
        
        // add dependency      
        addContentScriptsToLoadList(autoloadFileList, loadProperty.index.cachedDeps["Default"], loadProperty);
        // add default script
        autoloadFileList.push({name:"Site Script Default", 
            tobeloaded:["dss", "Default"], type:"js", 
            code:"console.info('[Javascript Tricks] Default script is executing'); \n"});
      }
      
      loadSiteScript(tabid, domain, autoloadFileList, loadProperty);
    }
    
    function loadSiteScript(tabid, domain, autoloadFileList, loadProperty) {
      var siteScript = loadProperty.index.siteScripts[domain];
      if (siteScript && siteScript.active) {
        loadProperty.siteAdded = true;
        
        // add dependency
        addContentScriptsToLoadList(autoloadFileList, loadProperty.index.cachedDeps[key], loadProperty);
        // add site script
        autoloadFileList.push({name:"Site Script " + loadProperty.domain, 
            tobeloaded:["ss", loadProperty.domain], type:"js", 
            code:"console.info('[Javascript Tricks] Site script is executing'); \n"});
      }
      
      // Load all included files in chain.
      loadAndInjectScripts(tabid, autoloadFileList);
    }
    
    function injectAndAutoIncludeScript(tabid, url, autoloadFileList, loadProperty) {  
      if (loadProperty.autostartLibAdded)
        return;
        
      loadProperty.autostartLibAdded = true;
        
      // Inject injected/injected.js file by inserting a <script> tag in document.
      chrome.tabs.executeScript(tabid, {"code": `
        if (!INFO.loaded["$sys/injected/injected.js"]) {
          INFO.loaded["$sys/injected/injected.js"] = true;
          InjectCodeToOriginalSpace("chrome-extension://" + chrome.runtime.id + "/injected/injected.js");
        }
      `});
      
      // Inject content scripts in include section of meta data.
      addContentScriptsToLoadList(autoloadFileList, INFO.meta_data.include, loadProperty);
    }
    
    function emptyFunc() {};
    
    function addContentScriptsToLoadList(loadList, csNames, loadProperty) {
      if(csNames) {
        var includeFiles = csNames;
        if (typeof csNames === "string") 
          includeFiles = csNames.trim().split(/\s*,\s*/).filter(function(str) {return str != ""; });
        
        for ( var i = 0; i < includeFiles.length; ++i) {
          addAContentScriptToLoadList(loadList, includeFiles[i], loadProperty);
        }
      }
    }
    
    function addAContentScriptToLoadList(loadList, csName, loadProperty) {
      if ( (csName.startsWith("http://") || csName.startsWith("https://")) 
        && !isContentScriptInLoadList(loadList, csName)) {  
          
        loadList.push( {"name":csName, "link":csName, "type":"js"} );
      } else {
        csName = csName.replace(/^#/, "");
        var contentScript = loadProperty.index.contentScripts[csName];

        // If the content script itself has dependencies, add them to the load list.
        addContentScriptsToLoadList(loadList, loadProperty.index.cachedDeps[csName], loadProperty);
        
        // push it into load list if it is not in the list yet.
        if (!isContentScriptInLoadList(loadList, csName)) {
          // add the contentScript itself
          loadList.push({name:csName, tobeloaded:["cs", csName], type:"js", 
              // code here is a callback function that accept a code string and returns another wrapped code string.
              code:wrapScriptForImportOnce(contentScript.importOnce, {csName:csName}) });
        }
      }
    }
    
    function wrapScriptForImportOnce(importOnce, args) {
      return function(code) {
        return codesnippet_getContentScriptWrapper(code, importOnce, args);
      };
    }
    
    function isContentScriptInLoadList(loadList, csName) {
      for (var j = 0; j < loadList.length; ++ j) {
        if (loadList[j].name == csName) {
          return true;
        }
      }
      
      return false;
    }
    
    function loadAndInjectScripts(tabid, autoloadFileList, callback) {
      // Get the indexes of all scripts to be loaded
      var keyIndexMap = {}, loadedScriptCount = 0, startTime = Date.now(), duration = 0, 
          fileList = "", error = INFO.debug ? new Error() : null;
      var indexes = autoloadFileList.reduce(function(result, ele, idx, arr) {
            if (ele.tobeloaded) {
              result.push(ele.tobeloaded);
              keyIndexMap[ele.tobeloaded[0] + ele.tobeloaded[1]] = idx;
            }
            return result;
          }, []);
      
      // Load the scripts from data store
      storage.findScripts(false, indexes, function(scripts) {
        loadedScriptCount = scripts.length;
        duration = Date.now() - startTime;
        
        // Complete loadList with source code loaded from load items with tobeloaded attributes
        for (var i = 0; i < scripts.length; ++ i) {
          var script = scripts[i];
          var index = keyIndexMap[script.type + script.name];
          var code = script.script;
          var css  = script.css;
          fileList += ", " + script.id;
          
          // Assembly code for load item
          var loadItem = autoloadFileList[index];
          if (isFunction(loadItem.code))
            // the code attribute is a code wrapper function
            loadItem.code = loadItem.code(code);
          else
            // the code attribute is a piece of code (before the loaded script code)
            loadItem.code += code;
            
          // Inject CSS style
          if (css) {
            // This way, the css can override the styles built in the injected webpage        
            chrome.tabs.executeScript(tabid, {"code": `
              AppendStyleNodeToDom_____(decodeURIComponent("${encodeURIComponent(lsd.css)}"));
            `}); 
          }
        }
      
        console.log("Loading", loadedScriptCount, "scripts from data store in", duration, "ms");
        if (INFO.debug)
          console.log("       ", fileList.substr(2), "by", error.stack);
        else
          console.log("       ", fileList.substr(2));
        
        // Inject the scripts corresponding to the load list one by one into the content page.
        injectScriptsInList(tabid, callback, autoloadFileList, 0);
      })
    }
    
    function injectScriptsInList(tabid, callback, autoloadFileList, index) {
      if (!callback)
        callback = emptyFunc;
        
      var file = autoloadFileList[index];
      if (!file) {
        callback();
        return;
      }
      
      if (index == 0)
        debug_log("------------------");
        
      debug_log("Tab " + tabid + ": Injecting Content script " + file.name + " ...");
      var execDetail = {};
      if (file["code"])
        execDetail["code"] = file.code;
      else if (file["file"])
        execDetail["file"] = file.file;
      
      var callNextInChain = function(result) {
        //debug_log("result of executing content script:");
        //debug_log(result);
        if (chrome.runtime.lastError) {
          console.error("Error occurs when executing", execDetail, chrome.runtime.lastError);
        }
        
        if (index <autoloadFileList.length - 1)
          injectScriptsInList(tabid, callback, autoloadFileList, index + 1);
        else
          callback();
      };
      
      var loadFunc = emptyFunc;
      if (file["type"] == "js")
        loadFunc = chrome.tabs.executeScript;
      if (file["type"] == "css")
        loadFunc = chrome.tabs.insertCSS;

      // debug_log(execDetail);
      loadFunc(tabid, execDetail, callNextInChain);
      
      // Reduce memory leak
      delete callNextInChain;
    }
        
    function getSiteStatus(domain) {
      var allScripts = storage.loadIndexObj().siteScripts;
      var siteOption = allScripts[domain];
      var defaultEnabled = allScripts["Default"].active;
  
      if (!siteOption) {
        siteStatus = "none";
      } else if (defaultEnabled) {
        if (siteOption.active) {
          siteStatus = "default+active";
        } else {
          siteStatus = "default";
        }
      } else {
        if (siteOption.active) {
          siteStatus = "active";
        } else {
          siteStatus = "inactive";
        }
      }
      
      return siteStatus;
    }

  function getCurrentTab(callback) {
    chrome.windows.getCurrent(undefined, function(win) {
      var winid = win.id;
      chrome.tabs.query({active:true, windowId:winid}, function(tabs) {
      if (chrome.runtime.lastError) {
        // tab is not fetched successfully
        console.error("Cannot get selected tab.");
      } else {
        //console.log("Current active tab id is:", tabs);
        var tab = tabs[0];
        callback(tab.id, tab.url, tab);
      }
      });      
    });
  }
  
  function getDomainFromUrl(url) {
    var domain_ = url ? url.match(/^[\w-]+:\/*\[?([\w\.:-]+)\]?(?::\d+)?/) : "";
    var domain = domain_ ? domain_[1] : undefined;
    return domain;
  }
    
  
  function initExtension() {
    chrome.manifest = (function() {
      var manifestObject = false;
      var xhr = new XMLHttpRequest();

      xhr.onreadystatechange = function() {
        if (xhr.readyState == 4) {
          manifestObject = JSON.parse(xhr.responseText);
        }
      };
      xhr.open("GET", chrome.runtime.getURL('/manifest.json'), false);

      try {
        xhr.send();
      } catch(e) {
        debug_log('Couldn\'t load manifest.json');
      }

      return manifestObject;

    })();
    
    // version unchanged
    if (localStorage["info"] === chrome.manifest.version) {
      updateIndex();
    } else {
      // New installation
      if( localStorage["info"] === undefined) {
        loadDefaultSettings(false, updateIndex);
        alert("JS TRICKS IMPORTANT CHANGE: script and css are now injected before DOM creation. Use $(function(){ ... }) to start script on DOMReady.");
      }
      
      // New version
      else {
        if (!confirm("New version installed! Do you want to override current configuration with the one in the new version?"))
          return;
  
        if (UTIL.compareVersion(localStorage["info"], "2.0.0") < 0) {        
          storage.transferScripts(storage.lsst, storage.dbst, function() {
            console.info("Transfer scripts in LocalStorage to IndexedDB");
          });
        }
      
        loadDefaultSettings(false, updateIndex);
      }
    }
    
    
    function updateIndex() {
      localStorage["info"] = chrome.manifest.version;
      storage.setSetting("enabled", "true");
    
      storage.rebuildScriptIndexes(function() {
        // defined in bg_contextMenu.js
        initContextMenuOnInstalled();
        updateSettings();  
      });
    }
  }

  function loadDefaultSettings(alertAfterComplete, callback) {
    var manifestObject = false;
    var xhr = new XMLHttpRequest();

    xhr.onreadystatechange = function() {
      if (xhr.readyState == 4) {
        var initSettings = JSON.parse(xhr.responseText);
        storage.restore(initSettings, function() {
          if (alertAfterComplete)
            alert("Default settings are loaded.");
          
          if (callback)
            callback();
        });
      
      }
    };
    if (chrome.runtime) {
      xhr.open("GET", chrome.runtime.getURL('/init_settings.json'), false);
    }
    try {
      xhr.send();
    } catch(e) {
      debug_log('Couldn\'t load init_settings.json');
    }
  }
    
}) (this);