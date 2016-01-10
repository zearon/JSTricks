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
    return "$" + type + "-" + name;
  }
  
  Storage.reportUsageAndQuota = function() {
    navigator.webkitTemporaryStorage.queryUsageAndQuota ( 
      function(usedBytes, grantedBytes) {
        usedBytes = ("" + usedBytes).addThousands();
        grantedBytes = ("" + grantedBytes).addThousands();
        var msg = 'We are using ' + usedBytes + ' of ' + grantedBytes + ' bytes';
        console.log(msg); alert(msg);
          console.log('we are using ', usedBytes, ' of ', grantedBytes, 'bytes');
      }, 
      function(e) { console.log('Error', e); alert(error + e.toString()); }
    );
  }
	
	/**
	 * Get a regular expression string to test whether should load script for a url
	 */
	Storage.fn.getActiveSitePattern = function () {
	}
	
	Storage.fn.getExtEnabledPattern = function() {
		var enabled = this.getSetting("enabled", true);
		if (enabled)
			// every URL matches this pattern
			return ".*";
		else
			// none URL matches this pattern
			return "^zzz:\/\/$";
	}
	
	Storage.fn.getExtDisabledPattern = function() {
		var enabled = this.getSetting("enabled", true);
		if (enabled)
			// none URL matches this pattern
			return "^zzz:\/\/$";
		else
			// every URL matches this pattern
			return ".*";
	}
  	 
	/**
	 * Get a setting value
	 *   key: setting name
	 *   asobj: get setting value as object.
	 */
	Storage.fn.getSetting = function (key, asobj) {
		return this.lsst.getSetting.apply(this.lsst, arguments);
	}	
	
	/**
	 * Iterate over all settings.
	 *   iter: iteration callback: iter(name, val)
	 *   oncomplete: complete callback: oncomplete()
	 *   asobj: get setting value as object.
	 */
	Storage.fn.iterateSettings = function (iter, oncomplete, asobj) {
		return this.lsst.iterateSettings.apply(this.lsst, arguments);
	}
	
	/**
	 * Set a setting with a value
	 *   key: setting name
	 *   value: setting value
	 *   asobj: get setting value as object.
	 */
	Storage.fn.setSetting = function(key, value, asobj) {
		return this.lsst.setSetting.apply(this.lsst, arguments);
	}
	
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
	}
	
	Storage.fn.setMetadata = function(metadata, asobj) {
	  if (asobj || typeof metadata !== "string") {
	    metadata = JSON.stringify(metadata);
	  }
	  
	  localStorage["meta"] = metadata;
	}

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
	}
	
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
	}

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
	  var scripts;
	  if (!isArray(script)) {
	    scripts = [script];
	  } else {
	    scripts = script;
	  }
	  
	  var result = this.sst.saveScript.apply(this.sst, arguments);

    /* Update script indexes in cache */ 
	  var indexObj = this.loadIndexObj();
    for (var i = 0; i < scripts.length; ++ i) {
      var script = scripts[i];
      var id = Storage.genScriptID(script.type, script.name);
      
      // update index
      updateScriptIndex_internal(indexObj, "add", script.name, script.type, 
          getScriptOptForIndex(script));
    }
    this.saveIndexObj(indexObj);
    
    console.log("Indexes after saving script:", indexObj);

		return indexObj;
	}
	
	/**
	 * Delete a script or several scripts.
	 * deleteScript(name, type, onok)
	 * deleteScript(filterFunc, onok), in which filterFunc(name, type, obj)
	 */
	Storage.fn.deleteScript = function (name, type, onok, onerr) {
	  var self = this, nameIsFilter = false, filter = name, indexObj;
	  
	  function wrappedFilter() {
	    return function(name, type, script) {
	      var result = filter(name, type, script);	      
	      if (result) {
          // The record (name, type, script) is to be deleted, so update script index
          updateScriptIndex_internal(indexObj, "delete", name, type);
	      }
	      
	      return result;
	    }
	  }
	  
	  function wrappedOnok() {
	    self.saveIndexObj(indexObj);
	    
	    if (onok)
	      onok();
	  }
	  
	  if (isFunction(name)) {
	    indexObj = this.loadIndexObj(); 
	    nameIsFilter = true;     
	    arguments[0] = wrappedFilter();
	    arguments[2] = wrappedOnok;
	  }
	  
		var result = this.sst.deleteScript.apply(this.sst, arguments);
		
		if (!nameIsFilter) {
		  // only delete one record
		  this.updateScriptIndex("delete", name, type);
    
      console.log("Indexes after deleteing script:", this.loadIndexObj(), "script is", name);
		}
		
		return result;
	}
	
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
	}
	
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
	    if (type == "cs") {
	      if (script.index !== undefined)
	        delete script["index"];
	      if (script.importOnce === undefined)
	        script.importOnce = false;
	    }
	    return true;
	  });
	}
	
	/**
	 * Transfer all scripts from a storage area to another.
	 */
	Storage.fn.rebuildScriptIndexes = function(onok, onerr) {
	  var self = this, indexObj = this.loadIndexObj("empty");
	  
	  this.getAllScripts(["dss", "ss", "cs"], function() {
	    // on complete
      self.saveIndexObj(indexObj);
	  
      if (onok)
        onok();	    
	  }, function(name, type, obj) {	 
	    // when iterate over each script   
	    updateScriptIndex_internal(indexObj, "add", name, type, getScriptOptForIndex(obj));	    
	  }, onerr);
	}	

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
	  return { 
        siteScripts: this.getSetting("temp-index-script-site", true),
        contentScripts: this.getSetting("temp-index-script-content", true),
        cachedDeps: this.getSetting("temp-index-script-deps", true)
      }; 
	}

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
	  if (indexObj.cachedDeps)
      this.setSetting("temp-index-script-deps", indexObj.cachedDeps, true);
	}
	
	
	/**
	 * Update index of scripts in cache
	 * action: add/delete/update
	 *    in delete action, the 4th argument opts is unnecessary
	 * name: name of script
	 * type: type of script: one of "dss", "ss" and "cs"
	 * opts: options of the script. If there is no options provided, an empty one is created.
	 */
	Storage.fn.updateScriptIndex = function (action, name, type, opts) {
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
	}
	
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
        indexedScripts[name] = opts;
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
	    return {"import":script.sfile, "group":script.group, "title":script.title};
	  else
	    return {"active":script.autostart, "import":script.sfile};
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
	 * Get the script dependencies in the cached index.
	 */
	Storage.fn.cachedScriptDeps = function() {
	  return this.getSetting("temp-index-script-deps", true);
	}
	
	/**
	 * Get an name list of scripts on which given script is dependent.
	 * This value is fetched from cached index stored in localStorage, and 
	 * thus is synchronous.
	 * The third parameter is optional. If omitted, the value is loaded from the cache.
	 */
	Storage.fn.getScriptDependencies = function(scriptName, type, cachedDeps) {
	  var nameArr, result = [];
	  if (isArray(scriptName)) {
	    nameArr = scriptName;
	  } else {
	    nameArr = [ scriptName ];
	  }	
	  
	  if (!cachedDeps) cachedDeps = this.getSetting("temp-index-script-deps", true);
	  getDepInternal(nameArr, type, cachedDeps, result);
	  
	  return result;
	}
	
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
	  if (isArray(deps)) {
	    depsArr = deps;
	  } else {
	    depsArr = deps.split(/\s*,\s*/).filter(function(str) { return str.trim() !== "";} );
	  }
	  var id = Storage.genScriptID(type, scriptName);
	  cachedDeps[id] = depsArr;
	  this.setSetting("temp-index-script-deps", cachedDeps, true);
	}
	
	/**
	 * Update the auto start status of a site script.
	 */
// 	Storage.fn.updateSiteScriptAutostart = function (id, options) {
// 		//if (options.autostart)
// 	}

	/*********************************************
	 *        Event Registration                 *
	 *********************************************/
// 	if (chrome.runtime.onInstalled)
// 		chrome.runtime.onInstalled.addListener(initStorage);
	
	/**
	 * Initialize the storage.
	 */
// 	function initStorage() {
// 	  console.log("Init storage.");
// 	}
	 
	 
	/*********************************************
	 *        Internal Implementations           *
	 *                                           *
	 *          with LocalStorage API            *
	 *********************************************/
	 
	function LocalStorage() {
	  this.global = global;
	}
	LocalStorage.fn = LocalStorage.prototype;
	
	LocalStorage.fn.init = function() {}
	
	LocalStorage.fn.getSetting = function(key, asobj) {
		var valtext = localStorage["$setting." + key];
		if (asobj) {
			try {
				if (!valtext)
					return undefined;
				return JSON.parse(valtext);
			} catch(ex) {
				throw new Error("Invalid JSON object: " + valtext);
			}
		} else {
			return valtext;
		}
	}
	
	LocalStorage.fn.iterateSettings = function(iter, oncomplete, asobj) {
		for (var key in localStorage) {
			if (this.getScriptTypeByKey(key) != "setting")
				continue;
			
			var name = this.getScriptNameByKey(key);
			var val = this.getSetting(name, asobj);
			
			iter(name, val);
		}
		
		oncomplete();
	}
	
	LocalStorage.fn.setSetting = function(key, value, asobj) {
		localStorage["$setting." + key] = asobj ? JSON.stringify(value) : value;
	}
	
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
	}
	
	// onok(obj, id, type) {...} 
	LocalStorage.fn.getScript = function(id, type, onok, onerr) {
		var key = (type == "ss" || type == "dss") ? id : "$cs-" + id;
		var script = this.loadScript(key, type);
		onok(script, id, type);
	}
	
	// onok()
	LocalStorage.fn.saveScript = function(script, onok) {
	  var scripts = script;
	  if (!isArray(script))
	    scripts = [script];
	  
	  for (var i = 0; i < scripts.length; ++ i) {
      var key = this.getScriptKey(script.name, script.type);
      localStorage[key] = JSON.stringify(script);
	  }
	  onok();
	}
	
	// only support delete one script.
	// onok()
	LocalStorage.fn.deleteScript = function (id, type, onok) {
	  var key = this.getScriptKey(id, type);
	  delete localStorage[key];
	  
	  if (onok)
	    onok();
	}
	
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
	}
	
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
		
		if (isArray(types)) {
			if ( !types.contains(obj.type) ) {
				return undefined;
			}
		} else if (types != obj.type) {
			return undefined;
		}
		
		if (onok)
			onok(id, type, obj);
			
		return obj
	}
	
	
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
	}
	
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
	}
	
	LocalStorage.fn.isScriptName = function(v) {
		if (v === "Default" || v === "Main" || this.isSiteScriptName(v) || this.isContentScriptName(v))
			return true;
		else
			return false;
	}
	
	LocalStorage.fn.isSiteScriptName = function(v) {
		if(v!='Default' && v!=='Main' && v!=='cacheCss' && v!=='cacheScript' && v!=='info' && v!=='meta' && v!=='$setting' 
				&& !(/^\$setting\./.test(v))   && !(/^\$cs-/.test(v))  ) /**/ {
			
			return true;
		}
		
		return false;
	}
	
	LocalStorage.fn.isContentScriptName = function(v) {
		return v.startsWith("$cs-");
	}
	
	LocalStorage.fn.getScriptKey= function(id, type) {
	  if (type === "cs")
	    return "$cs-" + id;
	  else
	    return type;
	}
	
	
	 
	 
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
    console.log("initing DBStorage");
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
      self.db = evt.target.result;
      
      for (var i = 0; i < self.onDbOpened.length; ++ i) {
        var listener = self.onDbOpened[i];
        listener.call(self);
      }
    };
    dbreq.onupgradeneeded = function(evt) {
      self.upgradeObjectStore.call(self, evt);
    };
  }
  
  DBStorage.fn.upgradeObjectStore = function(evt) {
    console.log("Creating object store", evt);
    var db = self.db = evt.target.result;
    
    if (db.objectStoreNames.contains(this.scriptStoreName)) {  
        db.deleteObjectStore(this.scriptStoreName)  
    }
    
    var scriptStore = this.scriptStore = db.createObjectStore(this.scriptStoreName,
       {keyPath:"id", autoIncrement: true});    
    
    // create indexes
    this.scriptStore.createIndex("name", "name", { unique: false });
    this.scriptStore.createIndex("type", "type", { unique: false });
    this.scriptStore.createIndex("type,name", ["type", "name"], { unique: true });
    this.scriptStore.createIndex("type,group", ["type", "group"], { unique: false });
  }
  
	/**
	 * Iterate all scripts with given type from storage with a iteration callback, 
	 * and optionally an on error callback.
	 * type: type of scripts, which can be "cs", "ss", "dss", …. It can be a string or an array of string.
	 * callback: a function get invoked after all scripts are fetched. function ( array of scripts ) {…}
	 * filter (optional): a filter callback determines if the script being iterated should be in the result set. It should be like:
	 *   filter(id, type, obj) {... return true/false.} 
	 * in which
	 *   id: domain of site-script, name of content-script
	 *   type: 'ss' for site-script, 'cs' for content-script, 'meta' for mata data
	 *   return value: determines if the obj should be in the result set.
	 * The optional onerr callback should be like: onerr(err) {...}
	 */
	DBStorage.fn.getAllScripts = function (type, callback, filter, onerr) {
	  var types = null, result = [];
	  if (isArray(type))
	    types = type;
	  else
	    types = [ type ];
	    
	  function oncomplete() {
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
            var filterMatches = !filter || filter(obj.name, obj.type, obj) ;
            //console.log("Iterating obj:", obj.name, obj, typeMatches, filterMatches);  
            
            if (typeMatches && filterMatches ) {
              result.push(obj);
            }
            
            cursor.continue();  
        }  
      };
      
    }, onerr, oncomplete);
	}
	
	/**
	 * Find a script with a given id and a given type.
	 * type: type of scripts, which can be "cs", "ss", "dss", …
	 * The onok callback should be like:
	 *   onok(obj, id, type) {...} 
	 * in which
	 *   id: domain of site-script, name of content-script
	 *   type: 'ss' for site-script, 'cs' for content-script, 'meta' for mata data
	 * The optional onerr callback should be like: onerr(err) {...}
	 */
	DBStorage.fn.getScript = function (id, type, onok, onerr) {
	  var types = type;
	  if (!isArray(type)) {
	    types = [type];
	  }
	  
		this.transaction(false, function(objStore) {
		  var indexGet;
      for (var i = 0; i < types.length; ++ i) {
        indexGet = objStore.index("type,name").get([types[i], id]);
        indexGet.onsuccess = function(e) {
          var obj = e.target.result;
        
          if (onok) {
            onok(obj, id, types[i]);
          }
        };
      }
		}, onerr);
	}

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
	  if (!isArray(script)) {
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
	}
	
	/**
	 * Delete a script or several scripts.
	 * deleteScript(id, type, onok)
	 * deleteScript(filterFunc, onok), in which filterFunc(id, type, obj)
	 */
	DBStorage.fn.deleteScript = function (id, type, onok, onerr) {
	  var filter = null, genID = Storage.genScriptID(type, id);
	  if (isFunction(id)) {
	    filter = id;
	    onok = type;
	  }
	  
		this.transaction(true, function(objStore) {
		  var index = objStore.index("type");
		  var cursorReq;
		  // open a cursor
		  if (filter) {
		    cursorReq = objStore.index("type").openCursor();
		  } else {
		    console.log(objStore);
		    cursorReq = objStore.openCursor(IDBKeyRange.only(genID));
		  }
      // iterate over all records with the cursor
      cursorReq.onsuccess = function(event) {
        var cursor = event.target.result;  
              
        if (cursor) {
          if (filter) {
            var key = cursor.key; 
            var obj = cursor.value;
            
            if (filter(obj.name, obj.type, obj)) {
              objStore.delete(obj.id);
            } 
          } 
          
          else {
            objStore.delete(cursor.primaryKey);
          }
            
          cursor.continue();
        }  
      };
		}, onerr, onok);
	}
	
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
	}
	
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
      if (onerr) {
        transaction.onerror = function(event) {
          // Database error
          onerr(event.target.errorCode);
        };
      }
      if (oncomplete) {
        transaction.oncomplete = function(event) {
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
  }
	
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
	}
	
  return Storage;
}) (this)
);