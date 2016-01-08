(function(global) {
  var instance;

  function Storage() {
    if (instance)
      return instance;
    
    instance = this;
    this.global = global;
    this.ls = new LocalStorage();
//     this.db = new DBStorage();
    // Script storage
    this.sst = this.ls;
    // this.sst = this.db;
  }
  Storage.fn = Storage.prototype;
  global.Storage = Storage;
  global.storage = new Storage();
	/*********************************************
	 *             Public Interfaces             *
	 *********************************************/
	 
	/**
	 * Get a setting value
	 *   key: setting name
	 *   asobj: get setting value as object.
	 */
	Storage.fn.getSetting = function (key, asobj) {
		return this.ls.getSetting.apply(this.ls, arguments);
	}	
	
	/**
	 * Iterate over all settings.
	 *   iter: iteration callback: iter(name, val)
	 *   oncomplete: complete callback: oncomplete()
	 *   asobj: get setting value as object.
	 */
	Storage.fn.iterateSettings = function (iter, oncomplete, asobj) {
		return this.ls.iterateSettings.apply(this.ls, arguments);
	}
	
	/**
	 * Set a setting with a value
	 *   key: setting name
	 *   value: setting value
	 *   asobj: get setting value as object.
	 */
	Storage.fn.setSetting = function(key, value, asobj) {
		return this.ls.setSetting.apply(this.ls, arguments);
	}
	
	Storage.fn.getMetadata = function() {
	  var val = localStorage["meta"];
	  try {
	    return JSON.parse(val);
	  } catch (ex) {
	    console.error("Cannot parse metadata string as an object.");
	    throw ex;
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
	 *   filter(id, type, obj) {... return true/false.} 
	 * in which
	 *   id: domain of site-script, name of content-script
	 *   type: 'ss' for site-script, 'cs' for content-script, 'meta' for mata data
	 *   return value: determines if the obj should be in the result set.
	 * The optional onerr callback should be like: onerr(err) {...}
	 */
	Storage.fn.getAllScripts = function (type, callback, filter, onerr) {
		return this.ls.getAllScripts.apply(this.ls, arguments);
	}
	
	/**
	 * Find a script with a given id and a given type.
	 * type: type of scripts, which can be "cs", "ss", "dss", …
	 * The onok callback should be like:
	 *   iterCallback(id, type, obj) {...} 
	 * in which
	 *   id: domain of site-script, name of content-script
	 *   type: 'ss' for site-script, 'cs' for content-script, 'meta' for mata data
	 * The optional onerr callback should be like: onerr(err) {...}
	 */
	Storage.fn.getScript = function (id, type, onok, onerr) {
		return this.ls.getScript.apply(this.ls, arguments);
	}

	/**
	 * Save a script into storage:
	 *   id: domain of site-script, name of content-script
	 *   type: 'ss' for site-script, 'cs' for content-script, 'meta' for mata data
	 */
	Storage.fn.saveScript = function (id, type, autoscript, include, script, css, hint, others) {
		return this.ls.saveScript.apply(this.ls, arguments);
	}
	
	/**
	 * Update the auto start status of a site script.
	 */
	Storage.fn.updateSiteScriptAutostart = function (id, options) {
		//if (options.autostart)
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

	/*********************************************
	 *        Event Registration                 *
	 *********************************************/
	if (chrome.runtime.onInstalled)
		chrome.runtime.onInstalled.addListener(initStorage);
	
	/**
	 * Initialize the storage.
	 */
	function initStorage() {
	  console.log("Init storage.");
	}
	 
	 
	/*********************************************
	 *        Internal Implementations           *
	 *                                           *
	 *          with LocalStorage API            *
	 *********************************************/
	 
	function LocalStorage() {
	  this.global = global;
	}
	LocalStorage.fn = LocalStorage.prototype;
	
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
				
			if (filter && filter(script.id, script.type, script))
				allscripts.push(script);
		}
		
		callback(allscripts);
	}
	
	// onok(iterCallback(id, type, obj) {...} 
	LocalStorage.fn.getScript = function(id, type, onok, onerr) {
		var key = (type == "ss" || type == "dss") ? id : "$cs-" + id;
		var script = this.loadScript(key, type);
		onok(script);
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
	
	LocalStorage.fn.saveScript = function(id, type, autoscript, include, script, css, hint, others) {
	}
	
	LocalStorage.fn.getAllSiteScriptNames = function() {
	}
	
	
	/*********************************************
	 *     LOCALSTORAGE API ONLY                 *
	 *********************************************/
	 
	LocalStorage.fn.getScriptTypeByKey = function(v) {
		if (v.startsWith("$setting."))
			return "setting";
		else if (v == "meta")
			return "meta";
		else if (this.isContentScriptName(v))
			return "cs";
		else if (v == "Default" || v == "Main")
			return "dss";
		else if (this.isSiteScriptName(v))
			return "ss";
		else
			return "other";
	}
	
	LocalStorage.fn.getScriptNameByKey = function(v) {
		if (v.startsWith("$setting."))
			return v.replace("$setting.", "");
		else if (v == "meta")
			return "meta";
		else if (this.isContentScriptName(v))
			return v.replace("$cs-", "");
		else if (v == "Default" || v == "Main")
			return v;
		else if (this.isSiteScriptName(v))
			return v;
		else
			return undefined;
	}
	
	LocalStorage.fn.isScriptName = function(v) {
		if (v == "Default" || v == "Main" || this.isSiteScriptName(v) || this.isContentScriptName(v))
			return true;
		else
			return false;
	}
	
	LocalStorage.fn.isSiteScriptName = function(v) {
		if(v!='Default' && v!='Main' && v!='cacheCss' && v!='cacheScript' && v!='info' && v!='meta' && v!='$setting' 
				&& !(/^\$setting\./.test(v))   && !(/^\$cs-/.test(v))  ) /**/ {
			
			return true;
		}
		
		return false;
	}
	
	LocalStorage.fn.isContentScriptName = function(v) {
		return v.startsWith("$cs-");
	}

}) (this);