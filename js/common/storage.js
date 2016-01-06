(function(global) {
	/*********************************************
	 *             Public Interfaces             *
	 *********************************************/
	 
	/**
	 * Get a setting value
	 *   key: setting name
	 *   asobj: get setting value as object.
	 */
	global.getSetting = function (key, asobj) {
		return getSettingFromLocalStorage.apply(global, arguments);
	}	
	
	/**
	 * Iterate over all settings.
	 *   iter: iteration callback: iter(name, val)
	 *   oncomplete: complete callback: oncomplete()
	 *   asobj: get setting value as object.
	 */
	global.iterateSettings = function (iter, oncomplete, asobj) {
		return iterateSettingsFromLocalStorage.apply(global, arguments);
	}
	
	/**
	 * Set a setting with a value
	 *   key: setting name
	 *   value: setting value
	 *   asobj: get setting value as object.
	 */
	global.setSetting = function(key, value, asobj) {
		return setSettingFromLocalStorage.apply(global, arguments);
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
	global.getAllScripts = function (type, callback, filter, onerr) {
		return getAllScriptsFromLocalStorage.apply(global, arguments);
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
	global.findScript = function (id, type, onok, onerr) {
		return findScriptFromLocalStorage.apply(global, arguments);
	}

	/**
	 * Save a script into storage:
	 *   id: domain of site-script, name of content-script
	 *   type: 'ss' for site-script, 'cs' for content-script, 'meta' for mata data
	 */
	global.saveScript = function (id, type, autoscript, include, script, css, hint, others) {
		return saveScriptToLocalStorage.apply(global, arguments);
	}
	
	/**
	 * Update the auto start status of a site script.
	 */
	global.updateSiteScriptAutostart = function (id, options) {
		//if (options.autostart)
	}
	
	/**
	 * Get a regular expression string to test whether should load script for a url
	 */
	global.getActiveSitePattern = function () {
	}
	
	global.getExtEnabledPattern = function() {
		var enabled = getSetting("enabled", true);
		if (enabled)
			// every URL matches this pattern
			return ".*";
		else
			// none URL matches this pattern
			return "^zzz:\/\/$";
	}
	
	global.getExtDisabledPattern = function() {
		var enabled = getSetting("enabled", true);
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
	}
	 
	 
	/*********************************************
	 *        Internal Implementations           *
	 *                                           *
	 *          with LocalStorage API            *
	 *********************************************/	 
	
	function getSettingFromLocalStorage(key, asobj) {
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
	
	function iterateSettingsFromLocalStorage(iter, oncomplete, asobj) {
		for (var key in localStorage) {
			if (getScriptTypeByKey(key) != "setting")
				continue;
			
			var name = getScriptNameByKey(key);
			var val = getSettingFromLocalStorage(name, asobj);
			
			iter(name, val);
		}
		
		oncomplete();
	}
	
	function setSettingFromLocalStorage(key, value, asobj) {
		localStorage["$setting." + key] = asobj ? JSON.stringify(value) : value;
	}
	
	// callback(scriptArray)
	// filter(iterCallback(id, type, obj) {...} 
	function getAllScriptsFromLocalStorage(types, callback, filter, onerr) {
		var allscripts = [];
		for (var key in localStorage) {
			if (!isScriptName(key))
				continue;
			
			var script = loadScriptFromLocalStorage(key, types);
			if (!script)
				continue;
				
			if (filter && filter(script.id, script.type, script))
				allscripts.push(script);
		}
		
		callback(allscripts);
	}
	
	// onok(iterCallback(id, type, obj) {...} 
	function findScriptFromLocalStorage(id, type, onok, onerr) {
		//var key = (type == "ss" || type == "dss") ? 
	}
	
	function loadScriptFromLocalStorage(key, types, onok, onerr) {
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
		
		var id = getScriptNameByKey(key);
		obj.id = id;
		obj.type = getScriptTypeByKey(key);
		
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
	
	function saveScriptToLocalStorage(id, type, autoscript, include, script, css, hint, others) {
	}
	
	function getAllSiteScriptNames() {
	}
	
	
	/*********************************************
	 *     LOCALSTORAGE API ONLY                 *
	 *********************************************/
	 
	function getScriptTypeByKey(v) {
		if (v.startsWith("$setting."))
			return "setting";
		else if (v == "meta")
			return "meta";
		else if (isContentScriptName(v))
			return "cs";
		else if (v == "Default" || v == "Main")
			return "dss";
		else if (isSiteScriptName(v))
			return "ss";
		else
			return "other";
	}
	
	function getScriptNameByKey(v) {
		if (v.startsWith("$setting."))
			return v.replace("$setting.", "");
		else if (v == "meta")
			return "meta";
		else if (isContentScriptName(v))
			return v.replace("$cs-", "");
		else if (v == "Default" || v == "Main")
			return v;
		else if (isSiteScriptName(v))
			return v;
		else
			return undefined;
	}
	
	function isScriptName(v) {
		if (v == "Default" || v == "Main" || isSiteScriptName(v) || isContentScriptName(v))
			return true;
		else
			return false;
	}
	
	function isSiteScriptName(v) {
		if(v!='Default' && v!='Main' && v!='cacheCss' && v!='cacheScript' && v!='info' && v!='meta' && v!='$setting' 
				&& !(/^\$setting\./.test(v))   && !(/^\$cs-/.test(v))  ) /**/ {
			
			return true;
		}
		
		return false;
	}
	
	function isContentScriptName(v) {
		return v.startsWith("$cs-");
	}

}) (this);