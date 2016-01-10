//if (!Object.prototype.clear)	
//	Object.prototype.clear = function() { for (var key in this) { delete this[key]; } };

(function() {
  
	/* Persistent states */
	var scriptMenuDict = storage.getSetting("temp-contextMenu-scriptMenuDict", true);	
	var optionMenuDict = storage.getSetting("temp-contextMenu-optionMenuDict", true);	
	var optionMenuDictReverse = storage.getSetting("temp-contextMenu-optionMenuDictReverse", true);
	
	var scriptMenuIndex = storage.getSetting("contextMenu-index", true);
	
	/* Register events */
	// initContextMenu invoked in bj.js initExtension which is also registed with chrome.runtime.onInstalled
	//chrome.runtime.onInstalled.addListener(initContextMenuOnInstalled); 
	chrome.runtime.onMessage.addListener(onMessageReceived);
	chrome.contextMenus.onClicked.addListener(onContextMenuItemClicked);

	/* Event listeners */
	function initContextMenuOnInstalled() {
	  scriptMenuIndex = storage.getSetting("contextMenu-index", true);
		initContextMenu();
	}
	 window.initContextMenuOnInstalled = initContextMenuOnInstalled;
	
	function onMessageReceived(request, sender) {
		if (request.method == "UpdateSettings") {
			onOptionValueChanged();
		} else if (request.method == "UpdateContextMenu") {
			/*var scriptGroups = request.data;
			console.log("Update Context Menu");
			console.log(scriptGroups);
			updateConextMenu(scriptGroups);*/
			
			scriptMenuIndex = storage.getSetting("contextMenu-index", true);
			initContextMenu();
		} 
	}
	
	function onContextMenuItemClicked(info, tab) {
		var menuID = info.menuItemId;
		// IDs of script menu items start from 1000
		if (menuID >= 1000) {
			onScriptMenuItemClick(info, tab);
		}
		
		// IDs of option menu items start from 100
		else if (menuID >= 100) {
			onOptionMenuItemClick(info, tab);
		}
	}
	/* End of event listeners */
	
	

	/* Event listener for onInstalled */
	function initContextMenu() {		
	  var index = 0, noScriptIndex = scriptMenuIndex === undefined;
		if (noScriptIndex) {
		  scriptMenuIndex = {};
		  console.info("No context menu index. Initialize it with the default sequence.");
		}

		var i, groups = {}, keys = [], key;
		var contentScripts = storage.loadIndexObj().contentScripts;
		var scriptList = objectToArray(contentScripts, "keyinvalue:name")
		    .filter(function(s) {
		      var index = scriptMenuIndex[s.name];
		      if (index !== undefined) s.index = index;
		      return s;
		    }).sort(sortContentScriptByGroup);
		  
    for ( var i = 0; i < scriptList.length; ++ i ) {
      var script = scriptList[i];
      // Reset index with continuous numbers from 1
      scriptMenuIndex[script.name] = ++index;
      //console.log(index, script.group + "/" + script.name);
  
      var group = script.group;
      if (!groups[group]) {
        groups[group] = [];
      }
      groups[group].push(script);
    }

    updateConextMenu(groups);
    
    // Remove indexes for redundant scripts (perhaps deleted by data store operations)
    for (var key in scriptMenuIndex) {
      if (!contentScripts[key])
        delete scriptMenuIndex[key];
    }
    
    //console.log(scriptMenuIndex);
    storage.setSetting("contextMenu-index", scriptMenuIndex, true);
	}
	
  window.initContextMenu = function() {
    scriptMenuIndex = storage.getSetting("contextMenu-index", true);
    initContextMenu();
  };
	
  function sortContentScriptByGroup(a, b) {
    a.index = scriptMenuIndex[a.name]; b.index = scriptMenuIndex[b.name];
    var groupDiff = a.group.localeCompare(b.group);
    var indexDiff = (a.index === undefined && b.index === undefined) ? 0 : 
      (a.index === undefined ? 1 : 
      (b.index === undefined ? -1 : a.index - b.index ));
    var nameDiff  = a.name.localeCompare(b.name);
    return groupDiff !== 0 ? groupDiff :
            (indexDiff !== 0 ? indexDiff :
            nameDiff);
  }
	

	function updateConextMenu(scriptGroups) {
		// remove old menues
		chrome.contextMenus.removeAll();
		
		scriptMenuDict = {}; 
		var menuID = 1000;
	
		// Create menus
		for ( groupName in scriptGroups ) {
			var group = scriptGroups[groupName];
			var groupMenuID;
			if (groupName == "") {
			} else {			
				groupMenuID = "" + menuID;
				chrome.contextMenus.create({"id":"" + menuID++,"title": `Scripts [${groupName}]`, "contexts":["all"]});
			}
		
			for ( var index = 0; index < group.length; ++ index ) {
				var script = group[index];
				menuID = chrome.contextMenus.create({"id":"" + menuID, "title": `${script.title}`, "contexts":["all"],
									 "parentId": groupMenuID});
			
				scriptMenuDict[menuID++] = script.name;
			}
		}
	
		// Create a separator
		chrome.contextMenus.create({"id":"0", "type": "separator", "contexts":["all"]});
		chrome.contextMenus.create({"id":"1", "title": "Preferences", "contexts":["all"]});
	
		// Create default menus
		createDefaultMenus();		

		storage.setSetting("temp-contextMenu-scriptMenuDict", scriptMenuDict, true);
	}

	function createDefaultMenus() {
	// 	var menuReloadBackground = chrome.contextMenus.create(
	// 	  {"title": "Reload BG Page", "type": "normal", "contexts":["all"], "onclick":reloadBackroundPage});
		
		var menuID = 100;
		optionMenuDict = {}; 
		optionMenuDictReverse = {}; 

		createOptionMenu("" + menuID++, "Debug Mode", "DEBUG");
		createOptionMenu("" + menuID++, "Run Code Mode", "DEBUG_runbuttoncode", "1");
		createOptionMenu("" + menuID++, "Disable Run-Code Buttons", "popupwindow_disableRunCodeButton", "1");
		
		storage.setSetting("temp-contextMenu-optionMenuDict", optionMenuDict, true);
		storage.setSetting("temp-contextMenu-optionMenuDictReverse", optionMenuDictReverse, true);
	}

	function createOptionMenu(id, title, keyInLocalStorage, parentID) {
		var options = {"id":id, "title": title, "type": "checkbox", "contexts":["all"], 
			 "checked":("false" != storage.getSetting(keyInLocalStorage)) };
	
		if (parentID)
			options["parentId"] = parentID;
		
		chrome.contextMenus.create(options);
		
		optionMenuDict[id] = keyInLocalStorage;
		optionMenuDictReverse[keyInLocalStorage] = id;
	}	
	
	
	
	/* Event listener for onMessage with method "UpdateSettings" */
	function onOptionValueChanged() {
		console.log("Option value changed");
		for (key in optionMenuDictReverse) {
			var menuID = optionMenuDictReverse[key];
			var value = storage.getSetting(key) != "false";
			chrome.contextMenus.update(menuID, {checked:value});		
		}
	}
	


	/* Event listener for onClicked of context menues */
	function onScriptMenuItemClick(info, tab) {
		var menuID = info.menuItemId;
		var file = scriptMenuDict[menuID];
		file = file.replace(/^\$cs\-/, "");
		debug_log(`Menu ${menuID} clicked: load file ${file}`, "Context menu item info:", info);
	
		function execScriptInTab(tabid) {
		  var initCode = 'delete INFO.contextMenuInfo; INFO.contextMenuInfo = JSON.parse(decodeURIComponent("'+encodeURIComponent(JSON.stringify(info))+'")); if (INFO.debug) { console.debug(INFO); }';
			chrome.runtime.sendMessage({tabid: tabid, method: "ExecuteContentScript", data: {name:file, initCode:initCode} });
		}
	
		if (tab.id >= 0) {
			execScriptInTab(tab.id);
		} else {		
			chrome.tabs.query({active:true, windowId:chrome.windows.WINDOW_ID_CURRENT}, function(tabs) {
				if (chrome.runtime.lastError) {
					// cannot get current selected tab.
				} else {
					execScriptInTab(tabs[0].id);
				}
			});
		}
	}
	
	function onOptionMenuItemClick(info, tab) {
		var menuID = info.menuItemId;
		var optionKey = optionMenuDict[menuID];
	
		var optionValue = storage.getSetting(optionKey) != "false";
		// make it the opposite and then save.
		storage.setSetting(optionKey, optionValue ? "false" : "true");
		chrome.contextMenus.update(menuID, {checked:!optionValue});
	
		// call update settings defined in bg.js
		window.updateSettings();
	}

// 	function reloadBackroundPage(info, tab) {
// 	}


}) ();