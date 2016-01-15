/* global navigator, window, UTIL, chrome, location, alert, localStorage, indexedDB, self, IDBKeyRange */

(function(global, Storage) {     
  /*********************************************
   *        Create object and export it        *
   *            as global variable.            *
   *                                           *
   *********************************************/  
  global.Storage = Storage;
  global.storage = new Storage();
  // DEBUG
  // global.storage.dbst.test();
}) (this, 
(function(global) {
  /*********************************************
   *             Module definitions            *
   *                                           *
   *                including:                 *
   *     Storage, LocalStorage, DBStorage      *
   *                                           *
   *            only return Storage            *
   *********************************************/
  var storageInst;

  function Storage() {
    if (storageInst)
      return storageInst;
    
    storageInst = this;
    this.global = global;
    this.lsst = new LocalStorage();
    this.dbst = new DBStorage();
    // Script storage
    //this.sst = this.lsst;
    this.sst = this.dbst;
  }
  Storage.fn = Storage.prototype;
  /*********************************************
   *             Public Interfaces             *
   *********************************************/
  Storage.genScriptID = function(type, name) {
    return type + "-" + name;
  };
  Storage.parseID = function(scriptID) {
    var match = scriptID.match(/^(.*?)-(.*)$/);
    return match ? {type:match[1], name:match[2]} : undefined;
  };
  
  Storage.reportUsageAndQuota = function() {
    navigator.webkitTemporaryStorage.queryUsageAndQuota ( 
      function(usedBytes, grantedBytes) {
        usedBytes = ("" + usedBytes).addThousands();
        grantedBytes = ("" + grantedBytes).addThousands();
        var msg = 'We are using ' + usedBytes + ' of ' + grantedBytes + ' bytes';
        console.log(msg); alert(msg);
          console.log('we are using ', usedBytes, ' of ', grantedBytes, 'bytes');
      }, 
      function(e) { console.log('Error', e); alert("Error" + e.toString()); }
    );
  };
  
  /**
   * Get a regular expression string to test whether should load script for a url
   */
  Storage.fn.getActiveSitePattern = function () {
  };
  
  Storage.fn.getExtEnabledPattern = function() {
    var enabled = this.getSetting("enabled", true);
    if (enabled)
      // every URL matches this pattern
      return ".*";
    else
      // none URL matches this pattern
      return "^zzz:\/\/$";
  };
  
  Storage.fn.getExtDisabledPattern = function() {
    var enabled = this.getSetting("enabled", true);
    if (enabled)
      // none URL matches this pattern
      return "^zzz:\/\/$";
    else
      // every URL matches this pattern
      return ".*";
  };
     
  /**
   * Get a JSON object representing the backup.
   *   callback: a function invoked with the backup object when complete. function callback(backupObj)
   *   options (optional):  a string tag or an array of string tags.
   *                        or an object of options, which can can none, some or all of the the object 
   *                          {tags:<tag array>, meta:<TRUE/false>, temp:<FALSE/true>, cloud:<FALSE/true>, onlyCloudSettings:<FALSE/true>
   *                           settings:<TRUE/false>, scripts:<TRUE/false>, scriptContent:<TRUE/false>}
   *                        , in which the first value in <true/false> pair is the default value.
   * var manifest = { 
   *    "timestamp": "20160101-121501000", 
   *    "tags": ["tag1", "tag2"],
   *    "metadata": <meta data object>,
   *    "props": {
   *      "key1": "value1",
   *      "key2":  "value2"
   *    }, 
   *    "assets": {
   *      "file1": "20160101-0810000",
   *      "file2": "20160101-0815213"
   *    },
   *    "assetStorage": {
   *      "file1": <JSON DATA of file1>
   *      "file2": <JSON DATA of file2>
   *    }
   *  }   
   */
  Storage.fn.backup = function (callback, options) {
    var timestamp  = UTIL.timestamp();
    var useOptions = {callback:callback, tags:[], meta:true, temp:false, cloud:false, onlyCloudSettings:false,
                      settings:true, scripts:true, scriptContent:true, onlyInitScripts:false}, key;    
    var backup = { timestamp:timestamp };
    
    if (UTIL.isObject(options)) {
      for (key in options) {
        useOptions[key] = options[key];
      }
      if (useOptions.onlyInitScripts) {
        useOptions.builtinLibs = this.getMetadata(true).builtinLibs;
        if (!useOptions.builtinLibs) useOptions.builtinLibs = [];
      }
    } else {
      // options is an string tag or an array of string tags
      if (UTIL.isArray(options)) useOptions.tags = options; else useOptions.tags = options ? [ options ] : [];
    }
    
    var steps = [], stepIndex = 0;
    
    if (useOptions.meta) {
      backupMetadata.call(this, backup, useOptions, steps, stepIndex++);
    }
    
    if (useOptions.settings) {
      backupSettings.call(this, backup, useOptions, steps, stepIndex++);
    }
    
    if (useOptions.onlyInitScripts) {
      backupInitScripts.call(this, backup, useOptions, steps, stepIndex++);
    } else {
      if (useOptions.scriptContent) {
        backupScripts.call(this, backup, useOptions, steps, stepIndex++);
      } else if (useOptions.scripts){
        backupScriptList.call(this, backup, useOptions, steps, stepIndex++);
      }
    }
    
    // Execute the step chain
    if (steps[0])
      steps[0]();
  };
  
  function backupMetadata(backup, options, steps, stepIndex) {
    var self = this;
    steps.push(function() {
      if (!backup.metadata)
        backup.metadata = self.getMetadata(false);
      
      // On complete, call next save step
      executeNextStepInBackup(backup, options, steps, stepIndex);
    });
  }
  
  function backupSettings(backup, options, steps, stepIndex) {
    var self = this;
    steps.push(function() {
      if (!backup.props) backup.props = {};
      
      self.iterateSettings(function(name, val) {
        // On iterating over each setting
          
        if (options.onlyCloudSettings) {
          if (!name.startsWith("cloud-") || name.startsWith("cloud-lastsave"))
            return;
        } else {      
          if (!options.temp && name.startsWith("temp-"))
            return;
        
          if (!options.cloud && name.startsWith("cloud-"))
            return;
        }
        
        backup.props[name] = val;
      }, function() {
        // On complete, call next save step
        executeNextStepInBackup(backup, options, steps, stepIndex);
      }, false);
    });
  }
  
  function backupScriptList(backup, options, steps, stepIndex) {
    var self = this;
    steps.push(function() {      
      if (!backup.assets) backup.assets = {};
      
      // Load script list from index in cache
      var id, key, indexObj = self.loadIndexObj();
      // load content script list
      for (key in indexObj.contentScripts) {
        id = Storage.genScriptID("cs", key);
        backup.assets[id] = indexObj.contentScripts[key].timestamp; 
      }
      // load site script list
      for (key in indexObj.siteScripts) {
        var type = key === "Main" || key === "Default" ? "dss" : "ss";
        id = Storage.genScriptID(type, key);
        backup.assets[id] = indexObj.siteScripts[key].timestamp; 
      }
      
      // On complete, call next save step
      executeNextStepInBackup(backup, options, steps, stepIndex);
    });
  }
  
  function backupScripts(backup, options, steps, stepIndex) {
    var self = this;
    steps.push(function() {   
      if (!backup.assets) backup.assets = {};   
      if (!backup.assetStorage) backup.assetStorage = {};
      
      self.getAllScripts(["dss", "ss", "cs"], function(scripts) {
        // On complete, call next save step
        executeNextStepInBackup(backup, options, steps, stepIndex);
      }, function(name, type, script){
        // On iterate over each script
        var id = script.id;
        backup.assets[id] = script.timestamp;
        backup.assetStorage[id] = script;
      });
    });
  }
  
  function backupInitScripts(backup, options, steps, stepIndex) {
    var self = this;
    steps.push(function() {   
      if (!backup.assets) backup.assets = {};   
      if (!backup.assetStorage) backup.assetStorage = {};
      
      self.getAllScripts(["dss", "ss", "cs"], function(scripts) {
        // On complete, call next save step
        executeNextStepInBackup(backup, options, steps, stepIndex);
      }, function(name, type, script){
        // On iterate over each script, only backup Main site script and content scripts in biultinLibs array
        if ( (type === "dss" && name === "Main") || 
           (type === "cs" && options.builtinLibs.contains(name)) ) {
          var id = script.id;
          backup.assets[id] = script.timestamp;
          backup.assetStorage[id] = script;
        }
      });
    });
  }
  
  function executeNextStepInBackup(backup, options, steps, stepIndex) {
    var nextStep = steps[stepIndex + 1];
    if (nextStep) nextStep();
    else if (options.callback) options.callback(backup);
  }
     
  /**
   * Restore every thing from a backup JSON object.
   *   backup: the JSON backup object
   *   callback: the callback function when restoration completes.
   *   options: an options object.
   *      {cloudSettings:<FALSE/true>, incremental:<FALSE/true>}
   */
  Storage.fn.restore = function (backup, callback, options) {
    var self = this, key, useOptions = {cloudSettings:false}, steps = [], stepIndex = 0;
    UTIL.extendObj(useOptions, options);
    useOptions.callback = callback;
    
    if (backup.props) {
      restoreSettings.call(this, backup, useOptions, steps, stepIndex++);
    }
    
    // If the restore is limited to cloudSettings, do not restore meta data and any scripts.
    if (!useOptions.cloudSettings) {
      // must be in front of restoreScripts, because the scripts list stored in chrome.storage.local
      // is generate from the meta data, and be used in resotreScripts when adding/deleting content scripts.
      if (backup.metadata) {
        restoreMetadata.call(this, backup, useOptions, steps, stepIndex++);
      }  
      
      if (backup.assetStorage) {
        restoreScripts.call(this, backup, useOptions, steps, stepIndex++);
      }
    }
    
    steps.push(function () {
      // Call initContextMenuOnInstalled in background page (bg_contextMenu.js) to 
      // update settings and context menus.
      if (window.initContextMenuOnInstalled) {
        // In background page
        initContextMenuOnInstalled();
        updateSettings();
        if (callback) callback();
      } else {
        // In pages other than background page of the extension;
        chrome.runtime.getBackgroundPage(function(win) {
          win.initContextMenuOnInstalled();
          updateSettings();
          if (callback) callback();
        });
      }
    });
    
    // Execute the step chain
    if (steps[0])
      steps[0]();
  };
  
  function restoreMetadata(backup, options, steps, stepIndex) {
    var self = this;
    steps.push(function() {
      self.setMetadata(backup.metadata, false);
      try {
        var meta = JSON.parse(backup.metadata);
      } catch(ex) { throw new Error("Invalid meta data! It is not a valid JSON object representation."); }
      
      // Set content script list that should stored in chrome.storage.local
      var includes = meta.include ? meta.include : [];
      var plugins = meta.plugins ? meta.plugins : [];      
      var activePluginCSNames = plugins.filter(function(plg) { 
        try {
          // the first expression ensures plg.action.script exists
          // and the second expression is the returned value.
          return plg.action.script, plg.action.topFrame;
        } catch (ex) { return false; }
      }).map(function(plg) { return plg.action.script; } );
      
      var allCslCSNames = includes.addAllIfNotIn(activePluginCSNames);
      
      console.log("In meta data, names of scripts in include and topFrame plugins are:", allCslCSNames);
      // Remove all information in CSL, chrome.storage.local, and let following steps to rebuild them
      chrome.storage.local.clear(function() {
        cslSaveScriptList(allCslCSNames, function() {
          // On complete, call next step
          executeNextStepInRestore(backup, options, steps, stepIndex);
        });
      });
      
    });
  }
  
  function restoreSettings(backup, options, steps, stepIndex) {
    var self = this;
    steps.push(function() {
      // delete all old settings if it is not restoring only cloud settings
      if (!options.cloudSettings) {
        for (var key in localStorage) {
          if (key.startsWith("$setting.cloud-"))
            continue;
        
          if (key.startsWith("$setting."))
            delete localStorage[key];
        }
      }
      
      // reset with new settings
      for (var name in backup.props) {
        // directly save as string
        if (options.cloudSettings && !name.startsWith("cloud-"))
          continue;
        
        self.setSetting(name, backup.props[name], false);        
      }
      
      // On complete, call next step
      executeNextStepInRestore(backup, options, steps, stepIndex);
    });
  }
  
  function restoreScripts(backup, options, steps, stepIndex) {
    var self = this;
    steps.push(function() {
      // convert the object into a value array.
      var allScripts = UTIL.toArray(backup.assetStorage, false);
      // save the script array
      self.saveScript(allScripts, function() {        
        // On complete, call next step
        executeNextStepInRestore(backup, options, steps, stepIndex);
      });
    });
  }
  
  function executeNextStepInRestore(backup, options, steps, stepIndex) {
    var nextStep = steps[stepIndex + 1];
    if (nextStep) nextStep();
    else if (options.callback) options.callback();
  }
  
  /**
   * Get a setting value
   *   key: setting name
   *   asobj: get setting value as object.
   *   defaultValue: default value if the setting is not found. The default value will be automatically saved.
   */
  Storage.fn.getSetting = function (key, asobj, defaultValue) {
    return this.lsst.getSetting.apply(this.lsst, arguments);
  };
  
  /**
   * Iterate over all settings.
   *   iter: iteration callback: iter(name, val)
   *   oncomplete: complete callback: oncomplete()
   *   asobj: get setting value as object.
   */
  Storage.fn.iterateSettings = function (iter, oncomplete, asobj) {
    return this.lsst.iterateSettings.apply(this.lsst, arguments);
  };
  
  /**
   * Set a setting with a value
   *   key: setting name
   *   value: setting value
   *   asobj: get setting value as object.
   */
  Storage.fn.setSetting = function(key, value, asobj) {
    return this.lsst.setSetting.apply(this.lsst, arguments);
  };
    
  Storage.fn.informBGPageUpdate = function() {
    // Inform background page to reload settings
    chrome.runtime.sendMessage({method:"UpdateSettings"});
    // Inform background page to update context menus      
    chrome.runtime.sendMessage({method: "UpdateContextMenu"});
  };
  
  Storage.fn.getMetadata = function(asobj) {
    var val = localStorage["meta"];
    if (asobj) {
      try {
        return JSON.parse(val);
      } catch (ex) {
        console.error("Cannot parse metadata string as an object.");
        //throw ex;
      }
    } else {
      return val;
    }
  };
  
  Storage.fn.setMetadata = function(metadata, asobj) {
    if (asobj || typeof metadata !== "string") {
      metadata = JSON.stringify(metadata);
    }
    
    localStorage["meta"] = metadata;
  };

  /**
   * Iterate all scripts with given type from storage with a iteration callback, 
   * and optionally an on error callback.
   * type: type of scripts, which can be "cs", "ss", "dss", …. It can be a string or an array of string.
   * callback: a function get invoked after all scripts are fetched. function ( array of scripts ) {…}
   * filter (optional): a filter callback determines if the script being iterated should be in the result set. It should be like:
   *   filter(name, type, obj) {... return true/false.} 
   * in which
   *   name: domain of site-script, name of content-script
   *   type: 'ss' for site-script, 'cs' for content-script
   *   return value: determines if the obj should be in the result set.
   * The optional onerr callback should be like: onerr(err) {...}
   */
  Storage.fn.getAllScripts = function (type, callback, filter, onerr) {
    return this.sst.getAllScripts.apply(this.sst, arguments);
  };

  /**
   * Find all scripts with given type and name from storage with a iteration callback, 
   * and optionally an on error callback.
   * writeAccess: need write to data store. If you don't need to write, set it to false.
   * indexName: name of index defined in indexedDB. can be "name"/"type,name"/"type"
   * indexValueArr: An array of values that are keys of records you are searching for.
   *     E.g. if indexName is "type,name", then indexValueArr should be an array of 
   *     [type, name] index identifying the scripts.
   * callback (optional): a function get invoked after all scripts are fetched. function ( array of scripts ) {…}
   * onfound (optional): a function get invoked when each matching record is found. function (name,type,script) { … return {action, value}; }
   *     This function should return an object {action, value} if further modification on that item is required to perform.
   *     {action:"update", value:<newValue>}: Modify current record with newValue. 
   *     {action:"delete"} : Delete current record.
   *     undefined or null or other: Nothing to do.
   *     Note: If your want to update or delete found record, the writeAccess argument must be set to TRUE!
   * onerr (optional): callback should be like: onerr(err) {...}
   */
  Storage.fn.findScripts = function (writeAccess, indexName, indexValueArr, callback, onfound, onerr) {
    var self = this, indexUpdate = [], indexObj = this.loadIndexObj(), updatedCSs = [], deletedCSNames = [];
    // wrapper functions to update indexes in cache.
    function onFoundInternal(name, type, script) {
      var command = undefined;
      if (onfound) {
        var oldID = Storage.genScriptID(type, name);
        command = onfound(name, type, script);
        if (command && command.action === "update") {
          var newValue = command.value;
          if (newValue === undefined)
            throw new Error("onfound callback for storage.prototype.findScripts returns a update command, but no value is given.");
          
          var newID = Storage.genScriptID(newValue.type, newValue.name);
          newValue.id = newID;
          if (newID !== oldID) {
            indexUpdate.push([indexObj, "delete", newValue.name, newValue.type]);
            indexUpdate.push([indexObj, "add", newValue.name, newValue.type, getScriptOptForIndex(newValue)] );
            if (type === "cs") deletedCSNames.push(name);
            if (newValue.type === "cs") updatedCSs.push(newValue);
          } else {
            indexUpdate.push([indexObj, "update", newValue.name, newValue.type, getScriptOptForIndex(newValue)] );
            if (newValue.type === "cs") updatedCSs.push(newValue);
          }
        } else if (command && command.action === "delete") {
          indexUpdate.push([indexObj, "delete", name, type]);
          if (type === "cs") deletedCSNames.push(name);
        }
      }
      
      return command;
    }
    function onCompleteInternal(scripts) {
      // update indexes
      indexUpdate.forEach(function(ele) {
        updateScriptIndex_internal.apply(this, ele);
      });
      
      // Update indexes and context menues
      self.saveIndexObj(indexObj);
      self.updateContextMenuAndBGSettings(function() {
        // update chrome.storage.local if these scripts are configured to be auto-loaded from meta data
        self.updateExistingTopFrameScripts(updatedCSs, function() {
          // delete scripts frome chrome.storage.local
          self.deleteExistingTopFrameScripts(deletedCSNames, function() {
            // call the callback
            if (callback) callback(scripts);
          });        
        });
        

      });
    }
    
    // If no modification is made to the database, there's no need to use wrappers to update the indexes in cache.
    var args = writeAccess ? 
                  [writeAccess, indexName, indexValueArr, onCompleteInternal, onFoundInternal, onerr] :
                  [writeAccess, indexName, indexValueArr, callback, onfound, onerr];
    
    // Call implementation
    return this.sst.findScripts.apply(this.sst, args);
  };
  
  /**
   * Find a script with a given id and a given type.
   * type: type of scripts, which can be "cs", "ss", "dss", …
   * The onok callback should be like:
   *   onok(obj, id, type) {...} 
   * in which
   *   id: domain of site-script, name of content-script
   *   type: 'ss' for site-script, 'cs' for content-script
   * The optional onerr callback should be like: onerr(err) {...}
   */
  Storage.fn.getScript = function (name, type, onok, onerr) {
    return this.sst.getScript.apply(this.sst, arguments);
  };

  /**
   * Save a script into storage:
   * script: a script object or an array of script objets. The script object should have 
   *   name and type properties.
   * The onsaved callback should be like:
   *   onsaved(err) {...} 
   * in which
   *   err: undefined if succeed and the Error object if error occurs.
   * The optional onerr callback should be like: onerr(err) {...}
   */
  Storage.fn.saveScript = function (script, onsaved) {
    var scripts, self = this;
    if (!UTIL.isArray(script)) {
      scripts = [script];
    } else {
      scripts = script;
    }
    
    function onComplete() {
      /* Update script indexes in cache */ 
      var indexObj = self.loadIndexObj();
      for (var i = 0; i < scripts.length; ++ i) {
        var script_ = scripts[i];
        var id = Storage.genScriptID(script_.type, script_.name);
      
        // update index
        updateScriptIndex_internal(indexObj, "add", script_.name, script_.type, 
            getScriptOptForIndex(script_));
      }
      self.saveIndexObj(indexObj);
      // update context menu and invoke callback
      self.updateContextMenuAndBGSettings(function() {      
        // update chrome.storage.local if these scripts are configured to be auto-loaded from meta data
        self.updateExistingTopFrameScripts(scripts, onsaved);
      });
    }
    
    var result = this.sst.saveScript.call(this.sst, script, onComplete);


    return result;
  };
  
  /**
   * Delete a script or several scripts according to type and names.
   * deleteScript(typeNamePair, onok)     typeNamePair is like [type, name], where type can be "dss", "ss", or "cs"
   * deleteScript(typeNamePairs, onok)    typeNamePair is like [[type1, name1], [type2, name2], …]
   * If your want to decide whether deleting a script based on its content, please refer to findScripts() function.
   */
  Storage.fn.deleteScript = function (typeNamePair, onok, onerr) {
    var self = this, typeNamePairs;
    if (!isArray(typeNamePair))
      throw new Error("The first parameter must be a [type, name] array or an array of it.");
    if (isArray(typeNamePair[0]))
      typeNamePairs = typeNamePair;
    else
      typeNamePairs = [typeNamePair];
    
    function onComplete() {
      // Update indexes
      var indexObj = self.loadIndexObj();
      typeNamePairs.forEach(function(typeNamePair) {
        updateScriptIndex_internal(indexObj, "delete", typeNamePair[1], typeNamePair[0]);
      });
      self.saveIndexObj(indexObj);
      // Update context menus and invoke callback
      self.updateContextMenuAndBGSettings(function() {  
        // delete scripts frome chrome.storage.local
        var csNameDeleted = typeNamePairs.filter(function(tnp) { return tnp[0] === "cs"; })
            .map(function(tnp) { return tnp[1]; });
        self.deleteExistingTopFrameScripts(csNameDeleted, onok);
      });
    }
    
    var result = this.sst.deleteScript.call(this.sst, typeNamePair, onComplete, onerr);
    
    return result;
  };
  
  /**
   * Delete all scripts.
   * onok: domain of site-script, name of content-script
   * type: 'ss' for site-script, 'cs' for content-script
   */
  Storage.fn.clearScripts = function (onok) {
    var result = this.sst.clearScripts.apply(this.sst, arguments);
    
    var indexObj = this.loadIndexObj("empty");
    this.saveIndexObj(indexObj);
    
    return result;
  };
  
  /**
   * Transfer all scripts from a storage area to another.
   */
  Storage.fn.transferScripts = function(src, dest, oncomplete) {
    var self = this;
    src.getAllScripts(["dss", "ss", "cs"], function(scripts) {
      // On complete
      console.log("Transfer", scripts.length, "scripts from", src, "to", dest);
      
      dest.saveScript(scripts);
      self.rebuildScriptIndexes(oncomplete);
    }, function(name, type, script) {
      // For UPGRADE
      script.timestamp = UTIL.timestamp();
      if (type == "cs") {
        if (script.index !== undefined)
          delete script["index"];
        if (script.importOnce === undefined)
          script.importOnce = false;
      }
      return true;
    });
  };
  
  /**
   * Transfer all scripts from a storage area to another.
   */
  Storage.fn.rebuildScriptIndexes = function(onok, onerr) {
    var self = this, indexObj = this.loadIndexObj("empty"), meta = this.getMetadata(true);
    
    this.getAllScripts(["dss", "ss", "cs"], function() {
      // on complete
      self.saveIndexObj(indexObj);      
    
      if (onok)
        onok();      
    }, function(name, type, obj) {
      // when iterate over each script
      updateScriptIndex_internal(indexObj, "add", name, type, getScriptOptForIndex(obj));      
    }, onerr);
  }; 

  /**
   * Load a object representing script indexes.
   * the returned object is like: {siteScripts, contentScripts, cachedDeps}
   */
  Storage.fn.loadIndexObj = function(option) {
    if (option === "empty")
      return { cachedDeps:{}, siteScripts:{}, contentScripts:{} };
      
    if (option === "ss")
      return { cachedDeps:{}, siteScripts:this.getSetting("temp-index-script-site", true), contentScripts:{} };
      
    if (option === "cs")
      return { cachedDeps:{}, siteScripts:{}, contentScripts:this.getSetting("temp-index-script-content", true) };
      
    // Load the index from cache
    var siteScript = this.getSetting("temp-index-script-site", true);
    var contentScripts = this.getSetting("temp-index-script-content", true);
    var cachedDeps =  this.getSetting("temp-index-script-deps", true);
    return { 
        siteScripts: (siteScript ? siteScript : {}),
        contentScripts: (contentScripts ? contentScripts : {}),
        cachedDeps: (cachedDeps ? cachedDeps : {})
      }; 
  };

  /**
   * Save the object representing script indexes.
   * indexObj: the object is like: {siteScripts, contentScripts, cachedDeps}
   */
  Storage.fn.saveIndexObj = function (indexObj) {
    if (indexObj.siteScripts) {
      this.setSetting("temp-index-script-site", indexObj.siteScripts, true);    
      // Save index into chrome.storage.local as well for access in content scripts.
      saveToChromeStorage({"siteIndex": indexObj.siteScripts});  
    }    
    if (indexObj.contentScripts)
      this.setSetting("temp-index-script-content", indexObj.contentScripts, true);
    if (indexObj.cachedDeps) {
      this.setSetting("temp-index-script-deps", indexObj.cachedDeps, true);
      chrome.storage.local.set({cacehdDeps:indexObj.cachedDeps});
    }
  };
  
  
  /**
   * Update index of scripts in cache
   * action: add/delete/update
   *    in delete action, the 4th argument opts is unnecessary
   * name: name of script
   * type: type of script: one of "dss", "ss" and "cs"
   * opts: options of the script. If there is no options provided, an empty one is created.
   */
  /*Storage.fn.updateScriptIndex = function (action, name, type, opts) {
    var indexedScripts = null, siteScripts, contentScripts, scriptOpts, cachedDeps;    
    // Load the index from cache
    cachedDeps = this.getSetting("temp-index-script-deps", true);
    if (type == "cs")
      indexedScripts = contentScripts = this.getSetting("temp-index-script-content", true);
    else
      indexedScripts = siteScripts = this.getSetting("temp-index-script-site", true);
    
    
    updateScriptIndex_internal({siteScripts:siteScripts, contentScripts:contentScripts, cachedDeps:cachedDeps}, 
      action, name, type, opts);
    
    // Save the index in cache
    if (type == "cs") {
      this.setSetting("temp-index-script-content", indexedScripts, true);
    } else {
      this.setSetting("temp-index-script-site", indexedScripts, true);  
      
      // Save index into chrome.storage.local as well for access in content scripts.
      saveToChromeStorage({"siteIndex": siteScripts});
    }
  };*/
  
  // Operate in an array but not do load and save operations
  function updateScriptIndex_internal(indexObj, action, name, type, opts) {
    var indexedScripts = null, scriptOpts, import_, deps;
    
    if (type == "cs")
      indexedScripts = indexObj.contentScripts;
    else
      indexedScripts = indexObj.siteScripts;   
       
    if (!opts)
      opts = {};
      
    switch(action) {
      case "delete":
        delete indexedScripts[name];
        break;
      case "add":
        indexedScripts[name] = opts;  // jshint ignore:line
        //no break;
      case "update":
        scriptOpts = indexedScripts[name];
        if (scriptOpts) {
          // Update scriptOpts with opts
          indexObj.cachedDeps[name] = []; // default value
          
          for (var key in opts) {
            if (key === "import") {
              if ((import_ = opts[key])) {
                // update dependencies.
                deps = import_.split(/\s*,\s*/).filter(function(str) { return str.trim() !== "";} );
                indexObj.cachedDeps[name] = deps;
              }
              delete opts["import"];
            } else {
              // update other options
              scriptOpts[key] = opts[key];
            }
          }
        }
        break;
    }
  }
  
  function getScriptOptForIndex(script) {
    if (script.type === "cs")
      return {"group":script.group, "title":script.title, "import":script.sfile, "importOnce":script.importOnce, "timestamp":UTIL.timestamp()};
    else
      return {"active":script.autostart, "import":script.sfile, "timestamp":UTIL.timestamp()};
  }
  
  function saveToChromeStorage(obj) {
    if (chrome.storage) {
      chrome.storage.local.set(obj);
    } else {
      console.debug("Current page does not support chrome.storage", location.href);
      chrome.runtime.sendMessgae( {MsgType:"chrome-ext-api", id:undefined, method:"SaveToStrage", arg:JSON.stringify(obj)} );
    }
  }
  
  /**
   * Update context menus and settings in background page
   * updateContextMenuAndBGSettings(callback, cbArg1, cbArg2, …)
   */
  Storage.fn.updateContextMenuAndBGSettings = function(callback) {
    var cbArgs = argsToArr(arguments).slice(1);
    // Update indexes and context menues
    if (window.initContextMenuOnInstalled) {
      initContextMenuOnInstalled();
      if (callback) callback.apply(this, cbArgs);
    } else {
      chrome.runtime.getBackgroundPage(function(win) {
        // defined in bg_contextMenu.js
        win.initContextMenuOnInstalled();
      
        // call the callback
        if (callback) callback.apply(this, cbArgs);
      });   
    }
  }
  
  /**
   * Get the script dependencies in the cached index.
   */
  Storage.fn.cachedScriptDeps = function() {
    return this.getSetting("temp-index-script-deps", true);
  };
  
  /**
   * Get an name list of scripts on which given script is dependent.
   * This value is fetched from cached index stored in localStorage, and 
   * thus is synchronous.
   * The third parameter is optional. If omitted, the value is loaded from the cache.
   */
  Storage.fn.getScriptDependencies = function(scriptName, type, cachedDeps) {
    var nameArr, result = [];
    if (UTIL.isArray(scriptName)) {
      nameArr = scriptName;
    } else {
      nameArr = [ scriptName ];
    }  
    
    if (!cachedDeps) cachedDeps = this.getSetting("temp-index-script-deps", true);
    getDepInternal(nameArr, type, cachedDeps, result);
    
    return result;
  };
  
  function getDepInternal(names, type, cachedDeps, result) {
    var i, id, deps;
    if (!names)
      return;
    
    for (i = 0; i < names.length; ++ i) {
      var name = names[i];
      // name is an external URL
      if (/^[\w-]+:\/\//.test(name))
        continue;
        
      id = Storage.genScriptID(type, names[i]);
      deps = cachedDeps[id];
      
      if (!deps)
        continue;
      
      // Only content scripts can be dependencies
      getDepInternal(deps, "cs", cachedDeps, result);
      
      result.addAllIfNotIn(deps);
    }
  }
  
  /**
   * Update the dependencies of a script in the cached index.
   */
  Storage.fn.updateScriptDependencies = function(scriptName, type, deps) {
    var cachedDeps = this.getSetting("temp-index-script-deps", true);
    var depsArr;
    if (UTIL.isArray(deps)) {
      depsArr = deps;
    } else {
      depsArr = deps.split(/\s*,\s*/).filter(function(str) { return str.trim() !== "";} );
    }
    var id = Storage.genScriptID(type, scriptName);
    cachedDeps[id] = depsArr;
    this.setSetting("temp-index-script-deps", cachedDeps, true);
  };
  
  

  /*********************************************
   *    CSL Storage (chrome.storage.local)     *
   *********************************************/  
   
  Storage.fn.rebuildCSLStorage = function(scripts) {
  }
   
   
  /**
   * Update the top frame scripts, which can be fetched and injected directly 
   * in the content page, according to plugins section of metadata.
   * The scripts will be loaded from database and cached in chrome.storage.local
   * callback(errmsg, notFoundScriptNameList)  if no error, errmsg = undefined
   */
  Storage.fn.updateTopFrameScriptList = function(newScriptList, callback) {
    if (newScriptList == undefined) { // or undefined
      newScriptList = [];
    }
    
    if (!isArray(newScriptList)) {
      throw new Error("updateTopFrameScripts(newScriptList, callback): newScriptList must be an array.");
    }
    
    var self = this;
    cslGetScriptList(function(scriptList) {
      var tobeDeletedNames = scriptList.notin(newScriptList);
      var tobeAddedNames = newScriptList.notin(scriptList);
      var tobeAddedIndexes = tobeAddedNames.map(function(name) { return ["cs", name]; });  
      console.log("Updating scripts in chrome.storage.local: Adding", tobeAddedNames, "and removing", tobeDeletedNames);    
      
      cslRemoveScripts(tobeDeletedNames);
      cslSaveScriptList(newScriptList, function() {
        // after new script list is saved, save each script to be added into chrome.storage.local      
        self.findScripts(false, "type,name", tobeAddedIndexes, function(scriptsObjLoaded) {
          // All scripts in newScriptList are loaded        
          var tobeSaved = {}, addedNames = [];
          scriptsObjLoaded.forEach(function(scriptObj) { 
            tobeSaved[scriptObj.id] = scriptObj;
            addedNames.push(scriptObj.name);
          });
          
        
          // Save these scripts to chrome.storage.local, and invoke callback when completes.
          chrome.storage.local.set(tobeSaved, function() {
            if (tobeAddedNames.length > addedNames.length) {
              var notFoundScripts = tobeAddedNames.notin(addedNames);
              // Save script list
              newScriptList = newScriptList.notin(notFoundScripts);
              cslSaveScriptList(newScriptList, function() {
                var errmsg = "Following scripts configured in meta data can not be found: " + notFoundScripts.join(", ");
                console.error(errmsg);
                callback(errmsg, notFoundScripts);
              });
            } else {
              callback();
            }
          });
        });
      });
    });
  }
  
  /**
   * Update scripts already stored in chrome.storage.local, and call the callback.
   * If the scripts is not in the storage area yet, then nothing extra is done, and the callback is invoked.
   */
  Storage.fn.updateExistingTopFrameScripts = function(scriptObjList, callback) {
    cslGetScriptList(function(scriptList) {
      var tobeSaved = {}, empty = true;
      scriptObjList.forEach(function(scriptObj) { 
        var shouldAdd = scriptObj.type === "cs" && scriptList.contains(scriptObj.name);
        if (shouldAdd) {
          empty = false;
          tobeSaved[scriptObj.id] = scriptObj; 
        }
      });
      
      if (!empty)
        // save new scripts already existing in the script list.
        chrome.storage.local.set(tobeSaved, callback);
      else if (callback)
        callback();
    });
  }
  
  /**
   * Delete scripts already stored in chrome.storage.local, and call the callback.
   * If the scripts is not in the storage area yet, then nothing extra is done, and the callback is invoked.
   */
  Storage.fn.deleteExistingTopFrameScripts = function(deletedCSNames, callback) {
    cslDeleteScript(deletedCSNames);
    
    cslGetScriptList(function(scriptList) {
      var newScriptList = scriptList.notin(deletedCSNames);
      // None in the list is deleted
      if (newScriptList.length === scriptList.length) {
        if (callback) callback();
      } 
      // Some scripts in the list is deleted
      else {
        // save new scripts list and call the callback
        cslSaveScriptList(newScriptList, callback);
      }
    });
  }
  
  // if scriptNameList is null or undefined, all existing top frame scripts are removed
  function cslRemoveScripts(scriptNameList, callback) {
    scriptNameList.forEach(cslDeleteScript);
  }

  // csl is short for chrome.storage.local
  // callback(scriptNameList)
  function cslGetScriptList(callback) {
    chrome.storage.local.get(["topScripts"], function(obj) {
      if (obj.topScripts) {
        callback( obj.topScripts );
      } else {
        var emptyList = [];
        callback(emptyList);
      }
    });
  }
  
  function cslSaveScriptList(list, callback) {
    chrome.storage.local.set({topScripts:list}, callback);
  }
  
  function cslDeleteScript(name) {
    var id = Storage.genScriptID("cs", name); 
    chrome.storage.local.remove(id);
  }
  
  /**
   * Update the auto start status of a site script.
   */
//   Storage.fn.updateSiteScriptAutostart = function (id, options) {
//     //if (options.autostart)
//   }

  /*********************************************
   *        Event Registration                 *
   *********************************************/
//   if (chrome.runtime.onInstalled)
//     chrome.runtime.onInstalled.addListener(initStorage);
  
  /**
   * Initialize the storage.
   */
//   function initStorage() {
//     console.log("Init storage.");
//   }
   
   
  /*********************************************
   *        Internal Implementations           *
   *                                           *
   *          with LocalStorage API            *
   *            (may be outdated)              *
   *********************************************/
   
  function LocalStorage() {
    this.global = global;
  }
  LocalStorage.fn = LocalStorage.prototype;
  
  LocalStorage.fn.init = function() {};
  
  LocalStorage.fn.getSetting = function(key, asobj, defaultValue) {
    var valtext = localStorage["$setting." + key];
    // If the setting is not found and a default value is given, save the default value with the key.
    if (valtext === undefined && defaultValue !== undefined) {
      this.setSetting(key, defaultValue, asobj);
    }
    
    if (asobj) {
      try {
        return valtext === undefined ? defaultValue : JSON.parse(valtext);
      } catch(ex) {
        throw new Error("Invalid JSON object: " + valtext);
      }
    } else {
      return valtext === undefined ? defaultValue : valtext;
    }
  };
  
  LocalStorage.fn.iterateSettings = function(iter, oncomplete, asobj) {
    for (var key in localStorage) {
      if (this.getScriptTypeByKey(key) != "setting")
        continue;
      
      var name = this.getScriptNameByKey(key);
      var val = this.getSetting(name, asobj);
      
      iter(name, val);
    }
    
    oncomplete();
  };
  
  LocalStorage.fn.setSetting = function(key, value, asobj) {
    localStorage["$setting." + key] = asobj ? JSON.stringify(value) : value;
  };
  
  // callback(scriptArray)
  // filter(iterCallback(id, type, obj) {...} 
  LocalStorage.fn.getAllScripts = function(types, callback, filter, onerr) {
    var allscripts = [];
    for (var key in localStorage) {
      if (!this.isScriptName(key))
        continue;
      
      var script = this.loadScript(key, types);
      if (!script)
        continue;
      
      script.name = this.getScriptNameByKey(key);
      script.type = this.getScriptTypeByKey(key);
      
      if (!filter || filter(script.name, script.type, script))
        allscripts.push(script);
    }
    
    callback(allscripts);
  };
  
  // onok(obj, id, type) {...} 
  LocalStorage.fn.getScript = function(id, type, onok, onerr) {
    var key = (type == "ss" || type == "dss") ? id : "$cs-" + id;
    var script = this.loadScript(key, type);
    onok(script, id, type);
  };
  
  // onok()
  LocalStorage.fn.saveScript = function(script, onok) {
    var scripts = script;
    if (!UTIL.isArray(script))
      scripts = [script];
    
    for (var i = 0; i < scripts.length; ++ i) {
      var key = this.getScriptKey(script.name, script.type);
      localStorage[key] = JSON.stringify(script);
    }
    onok();
  };
  
  // only support delete one script.
  // onok()
  LocalStorage.fn.deleteScript = function (id, type, onok) {
    var key = this.getScriptKey(id, type);
    delete localStorage[key];
    
    if (onok)
      onok();
  };
  
  /**
   * Delete all scripts.
   * onok: domain of site-script, name of content-script
   * type: 'ss' for site-script, 'cs' for content-script
   */
  LocalStorage.fn.clearScripts = function (onok) {
    for (var key in localStorage) {
      if (!this.isScriptName(key))
        continue;
      
      delete localStorage[key];
    }
    
    if (onok)
      onok();
  };
  
  LocalStorage.fn.loadScript = function(key, types, onok, onerr) {
    var str = localStorage[key], obj;
    try {
      obj = JSON.parse(str);
    } catch (ex) { 
      var typesDesc = types.map(function(str) { return str == "cs" ? "content script" : "site script"; }).join(", ");
      ex.messgage = "Invalid script format for [" + typesDesc + "] " + 
        id + ". \n" + ex.message;
      if (onerr)
        onerr(ex);
      else
        console.error(key, "=", str, ex);
        
      return undefined;
    }
    
    var id = this.getScriptNameByKey(key);
    obj.id = id;
    obj.type = this.getScriptTypeByKey(key);
    
    if (UTIL.isArray(types)) {
      if ( !types.contains(obj.type) ) {
        return undefined;
      }
    } else if (types != obj.type) {
      return undefined;
    }
    
    if (onok)
      onok(obj.id, obj.type, obj);
      
    return obj;
  };
  
  
  /*********************************************
   *     LOCALSTORAGE API ONLY                 *
   *********************************************/
   
  LocalStorage.fn.getScriptTypeByKey = function(v) {
    if (v.startsWith("$setting."))
      return "setting";
    else if (v === "meta")
      return "meta";
    else if (this.isContentScriptName(v))
      return "cs";
    else if (v === "Default" || v === "Main")
      return "dss";
    else if (this.isSiteScriptName(v))
      return "ss";
    else
      return "other";
  };
  
  LocalStorage.fn.getScriptNameByKey = function(v) {
    if (v.startsWith("$setting."))
      return v.replace("$setting.", "");
    else if (v === "meta")
      return "meta";
    else if (this.isContentScriptName(v))
      return v.replace("$cs-", "");
    else if (v === "Default" || v === "Main")
      return v;
    else if (this.isSiteScriptName(v))
      return v;
    else
      return undefined;
  };
  
  LocalStorage.fn.isScriptName = function(v) {
    if (v === "Default" || v === "Main" || this.isSiteScriptName(v) || this.isContentScriptName(v))
      return true;
    else
      return false;
  };
  
  LocalStorage.fn.isSiteScriptName = function(v) {
    if(v!='Default' && v!=='Main' && v!=='cacheCss' && v!=='cacheScript' && v!=='info' && v!=='meta' && v!=='$setting' 
        && !(/^\$setting\./.test(v))   && !(/^\$cs-/.test(v))  ) /**/ {
      
      return true;
    }
    
    return false;
  };
  
  LocalStorage.fn.isContentScriptName = function(v) {
    return v.startsWith("$cs-");
  };
  
  LocalStorage.fn.getScriptKey= function(id, type) {
    if (type === "cs")
      return "$cs-" + id;
    else
      return type;
  };
  
  
   
   
  /*********************************************
   *        Internal Implementations           *
   *                                           *
   *           with IndexedDB API              *
   *********************************************/
  
  function DBStorage() {
    this.global = global;
    this.dbname = "JavascriptTricks";
    this.dbver = 2;    
    this.db = null;
    
    this.scriptStoreName = "Scripts";
    this.scriptStore = null;
    
    this.onDbOpened = [];

    
    initIndexedDB.call(this);
  }
  DBStorage.fn = DBStorage.prototype;
  
  function initIndexedDB() {
    this.createDB();
  }
  
  DBStorage.fn.createDB = function() {
    console.log("Opening database");
    var self = this;
    var dbreq = indexedDB.open(this.dbname, this.dbver);
    dbreq.onerr = function(e) {
      console.error("Database error:", e.target.errorCode, e);
      // 12 is VER_ERR: desired version is lower than the found one
      if (e.target.errorCode === 12) {
        //
      }
    };
    dbreq.onsuccess = function(evt) {
      console.log("Database is opened");
      self.db = evt.target.result;
      
      for (var i = 0; i < self.onDbOpened.length; ++ i) {
        var listener = self.onDbOpened[i];
        listener.call(self);
      }
    };
    dbreq.onupgradeneeded = function(evt) {
      console.log("Creating object store", evt);
      self.upgradeObjectStore.call(self, evt);
    };
  };
  
  DBStorage.fn.upgradeObjectStore = function(evt) {
    var db = self.db = evt.target.result;
    
    if (db.objectStoreNames.contains(this.scriptStoreName)) {  
        db.deleteObjectStore(this.scriptStoreName);
    }
    
    var scriptStore = this.scriptStore = db.createObjectStore(this.scriptStoreName,
       {keyPath:"id", autoIncrement: true});    
    
    // create indexes
    this.scriptStore.createIndex("name", "name", { unique: false });
    this.scriptStore.createIndex("type", "type", { unique: false });
    this.scriptStore.createIndex("type,name", ["type", "name"], { unique: true });
    this.scriptStore.createIndex("type,group", ["type", "group"], { unique: false });
    
    // Create Main and Default script
    var mainScript =  {"id":Storage.genScriptID("dss", "Main"), "name":"Main", "type":"dss", "script": "", "autostart": false, "sfile": "", "css": ""};
    var defaultScript =  {"id":Storage.genScriptID("dss", "Default"), "name":"Default", "type":"dss", "script": "", "autostart": false, "sfile": "", "css": ""};
    scriptStore.add(mainScript);
    scriptStore.add(defaultScript);
  };
  
  /**
   * Iterate all scripts with given type from storage with a iteration callback, 
   * and optionally an on error callback.
   * type: type of scripts, which can be "cs", "ss", "dss", …. It can be a string or an array of string.
   * callback: a function get invoked after all scripts are fetched. function ( array of scripts ) {…}
   * filter (optional): a filter callback determines if the script being iterated should be in the result set. It should be like:
   *   filter(name, type, obj) {... return true/false.} 
   * in which
   *   name: domain of site-script, name of content-script
   *   type: 'ss' for site-script, 'cs' for content-script, 'meta' for mata data
   *   return value: determines if the obj should be in the result set.
   * The optional onerr callback should be like: onerr(err) {...}
   */
  DBStorage.fn.getAllScripts = function (type, callback, filter, onerr) {
    var types = null, result = [];
    if (UTIL.isArray(type))
      types = type;
    else
      types = [ type ];
    
    //var startTime = Date.now();
      
    function oncomplete() {
      //var endTime = Date.now();
      //console.log("getAllScripts takes", endTime - startTime, "ms");
      
      if (callback) 
        callback(result);
    }
      
    this.transaction(false, function(objStore) {
      var index = objStore.index("type");
      // open a cursor and iterate over all records with it
      index.openCursor().onsuccess = function(event) {
        var cursor = event.target.result;  
              
        if (cursor) {
            var key = cursor.key; 
            var obj = cursor.value;
            
            var typeMatches = types.contains(key);
            if (typeMatches) {
              var filterMatches = !filter || filter(obj.name, obj.type, obj); 
              if (filterMatches ) {
                result.push(obj);
              }
            }
            
            cursor.continue();  
        }  
      };
      
    }, onerr, oncomplete);
  };

  /**
   * Find all scripts with given type and name from storage with a iteration callback, 
   * and optionally an on error callback.
   * writeAccess: need write to data store. If you don't need to write, set it to false.
   * indexName: name of index defined in indexedDB. can be "name"/"type,name"/"type"
   * indexValueArr: An array of values that are keys of records you are searching for.
   *     E.g. if indexName is "type,name", then indexValueArr should be an array of 
   *     [type, name] index identifying the scripts.
   * callback (optional): a function get invoked after all scripts are fetched. function ( array of scripts ) {…}
   * onfound (optional): a function get invoked when each matching record is found. function (name,type,script) { … return {action, value}; }
   *     This function should return an object {action, value} if further modification on that item is required to perform.
   *     {action:"update", value:<newValue>}: Modify current record with newValue. 
   *     {action:"delete"} : Delete current record.
   *     undefined or null or other: Nothing to do.
   * onerr (optional): callback should be like: onerr(err) {...}
   */
  DBStorage.fn.findScripts = function (writeAccess, indexName, indexValueArr, callback, onfound, onerr) {
    var result = [], needResult = callback !== undefined;
    var modifiedObj;
    //var startTime = Date.now();
      
    function oncomplete() {
      //var endTime = Date.now();
      //console.log("getAllScripts takes", endTime - startTime, "ms");
      //console.log(result);
      
      if (callback) 
        callback(result);
    }
      
    this.transaction(writeAccess, function(objStore) {
      var key, index = objStore.index(indexName); // e.g. indexName = "type,name"
      
      for (var i =  0; i < indexValueArr.length; ++ i) {
        key = indexValueArr[i];
        index.openCursor(IDBKeyRange.only(key)).onsuccess = onsuccess;
      }
      
      function onsuccess(e) {
          var cursor = e.target.result;
          if (cursor) {
            var value = cursor.value;
            if (onfound) {
              var command = onfound(value.name, value.type, value, cursor);
              if (command) {
                if (command.action === "update" && command.value !== undefined) {
                  //console.log("Update object", command.value, e);
                  var newValue = command.value;
                  // id has been updated in Storage.fn.findScripts
                  objStore.put(newValue);
                } else if (command.action === "delete") {
                  cursor.delete();
                }
              }
            }
              
            if (needResult)
              result.push(value);
            cursor.continue();
          }
      }
      
    }, onerr, oncomplete);
  };
    
  /**
   * Find a script with a given name and a given type.
   * type: type of scripts, which can be "cs", "ss", "dss", …
   * The onok callback should be like:
   *   onok(obj, name, type) {...} 
   * in which
   *   name: domain of site-script, name of content-script
   *   type: 'ss' for site-script, 'cs' for content-script, 'meta' for mata data
   * The optional onerr callback should be like: onerr(err) {...}
   */
  DBStorage.fn.getScript = function (name, type, onok, onerr) {
    var types = type;
    if (!UTIL.isArray(type)) {
      types = [type];
    }
    
    function onCompleted() {
      //
    }
    
    this.transaction(false, function(objStore) {
      var indexGet;
      for (var i = 0; i < types.length; ++ i) {
        indexGet = objStore.index("type,name").get([types[i], name]);
        indexGet.onsuccess = onsuccess;
      }
      
      function onsuccess(e) {
        var obj = e.target.result;
      
        if (onok) {
          onok(obj, name, types[i]);
        }
      }
    }, onerr, onCompleted);
  };

  /**
   * Save a script into storage:
   * script: a script object or an array of script objets. The script object should have 
   *   name and type properties.
   * The onsaved callback should be like:
   *   onsaved(err) {...} 
   * in which
   *   err: undefined if succeed and the Error object if error occurs.
   * The optional onerr callback should be like: onerr(err) {...}
   */
  DBStorage.fn.saveScript = function (script, onsaved) {
    var scripts;
    if (!UTIL.isArray(script)) {
      scripts = [script];
    } else {
      scripts = script;
    }
    
    this.transaction(true, function(objStore) {
      for (var i = 0; i < scripts.length; ++ i) {
        var script = scripts[i];
        script.id = Storage.genScriptID(script.type, script.name);
        //console.log("Saving script", script.id, script.name, script.type);
        objStore.put(script);
      }
      
      if (onsaved)
        onsaved();
    });
  };
  
  /**
   * Delete a script or several scripts according to type and names.
   * deleteScript(typeNamePair, onok)     typeNamePair is like [type, name], where type can be "dss", "ss", or "cs"
   * deleteScript(typeNamePairs, onok)    typeNamePair is like [[type1, name1], [type2, name2], …]
   * If your want to decide whether deleting a script based on its content, please refer to findScripts() function.
   */
  DBStorage.fn.deleteScript = function (typeNamePair, onok, onerr) {
    var self = this, typeNamePairs;
    if (!isArray(typeNamePair))
      throw new Error("The first parameter must be a [type, name] array or an array of it.");
    if (isArray(typeNamePair[0]))
      typeNamePairs = typeNamePair;
    else
      typeNamePairs = [typeNamePair];
    
    this.transaction(true, function(objStore) {
      typeNamePairs.forEach(function(typeNamePair) {
        var genID = Storage.genScriptID(typeNamePair[0], typeNamePair[1]);
        // open a cursor
        var cursorReq = objStore.openCursor(IDBKeyRange.only(genID));        
        // iterate over all records with the cursor
        cursorReq.onsuccess = onRecordFound;
      });     
    }, onerr, onok);
    
    function onRecordFound(event) {
      var cursor = event.target.result; 
      if (cursor) {
        var req = cursor.delete();
//         req.onsuccess = function(event) {
//           console.log("Record deleted event=", event);
//         }
        
        cursor.continue();
      }
    }
  };
  
  function defaultScriptFilter(id, type) {
    return function(id_, type_, obj_) {
      return id_ === id && type_ === type;
    };
  }
  
  /**
   * Clear all scripts.
   */
  DBStorage.fn.clearScripts = function (onok) {    
    /*this.transaction(true, function(objStore) {
      var req = objStore.clear();
      if (onok) {
        req.onsuccess = function(event) {
          onok();
        }
      }
    });*/
    var req = indexedDB.deleteDatabase(this.dbname);
    req.onerror = function(event) { console.error("Error occurs when deleting the database", event); };    
    if (onok)
      req.onsuccess = onok;
    
    this.db = null;
  };
  
  /**
   * Open a transaction and so some work in the ontransaction callback.
   * type: transaction type, which is one of "readonly", "readwrite", "verionchange"
   * function ontransaction(objStore) {...}
   */
  DBStorage.fn.transaction = function (writeAccess, ontransaction, onerr, oncomplete) {
    var self = this;
    function openTransaction() {
      var transaction = self.db.transaction([ self.scriptStoreName ], 
        writeAccess ? "readwrite" : "readonly");
      transaction.onerror = onError;
      transaction.oncomplete = onComplete;
      function onError(event) {
        console.log("Database error", event);
        if (onerr) {
          // Database error
          onerr(event.target.errorCode);
        }
      }
      function onComplete(event) {
        //console.log("Database transaction completes.");
        if (oncomplete) {
          oncomplete();
        }
      }
      var objStore = transaction.objectStore(self.scriptStoreName);
      
      ontransaction(objStore);
    }
    
    if (this.db) {
      openTransaction();
    } else {
      this.onDbOpened.push(openTransaction);
    }
  };
  
  DBStorage.fn.test = function (storename, obj, onsaved) {
    console.log('test indexedDB');
    
    this.saveScript([
      {name:"Default", type:"dss", autostart:false, script:"default code", css:"", sfile:""},
      {name:"baike.baidu.com", type:"ss", autostart:true, script:"js", css:"css", sfile:""},
      {name:"LibBase", type:"cs", autostart:false, group:"", script:"js", sfile:""},
      {name:"Common", type:"cs", autostart:false, group:"lib", script:"js", sfile:""}
    ]);
    
    this.getScript("LibBase", "cs", obj=>console.log("Found record in DB", obj));
    
    this.getAllScripts(["cs", "ss", "dss"], scripts => console.log("All record in DB:", scripts), 
      (id, type, script) => true );
    
    //this.deleteScript( (id,type,obj)=>type==="cs", ()=>console.log("Removed a record"));
    //this.clearScript(()=>console.log("All records are removed."));
  };
  
  return Storage;
}) (this)
);