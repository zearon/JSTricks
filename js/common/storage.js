(function(global) {
	/*********************************************
	 *             Public Interfaces             *
	 *********************************************/
	 
	/**
	 * Get a setting value
	 */
	global.getSetting = function (key, asobj) {
		return getSettingFromLocalStorage.apply(global, arguments);
	}
	
	/**
	 * Set a setting with a value
	 */
	global.setSetting = function(key, value, asobj) {
		return setSettingFromLocalStorage.apply(global, arguments);
	}

	/**
	 * Iterate all scripts with given type from storage with a iteration callback, 
	 * and optionally an on error callback.
	 * type: type of scripts, which can be "cs", "ss", "dss", …
	 * The iteration callback should be like:
	 *   iterCallback(id, type, obj) {...} 
	 * in which
	 *   id: domain of site-script, name of content-script
	 *   type: 'ss' for site-script, 'cs' for content-script, 'meta' for mata data
	 * The optional onerr callback should be like: onerr(err) {...}
	 */
	global.getAllScripts = function (type, iterCallback, onerr) {
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

	/*********************************************
	 *        Event Registration                 *
	 *********************************************/		
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
				return JSON.parse(valtext);
			} catch(ex) {
				throw new Error("Invalid JSON object: " + valtext);
			}
		} else {
			return valtext;
		}
	}
	
	function setSettingFromLocalStorage(key, value, asobj) {
		localStorage["$setting." + key] = asobj ? JSON.stringify(value) : value;
	}
	
	// iterCallback(iterCallback(id, type, obj) {...} 
	function getAllScriptsFromLocalStorage(type, iterCallback, onerr) {
		for (var key in localStorage) {
			if (!isScriptName(key))
				continue;
			
			loadScriptFromLocalStorage(key, type, iterCallback, onerr);
		}
	}
	
	// onok(iterCallback(id, type, obj) {...} 
	function findScriptFromLocalStorage(id, type, onok, onerr) {
		//var key = (type == "ss" || type == "dss") ? 
	}
	
	function loadScriptFromLocalStorage(key, type, onok, onerr) {
		var str = localStorage[key], obj;
		try {
			obj = JSON.parse(str);
		} catch (ex) { 
			ex.messgage = "Invalid script format for " + (type == "cs" ? "content" : "site" ) +
				" script " + id + ". \n" + ex.message;
			if (onerr)
				onerr(ex);
			else
				console.err(ex);
		}
		
		var id = getScriptNameByKey(key);	
		
		onok(id, type, obj);
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