//if (!Object.prototype.clear)	
//	Object.prototype.clear = function() { for (var key in this) { delete this[key]; } };

(function() {
	
	/* Register events */
	chrome.runtime.onInstalled.addListener(onExtensionInstalled);
	chrome.runtime.onMessage.addListener(onMessageReceived);
	chrome.contextMenus.onClicked.addListener(onContextMenuItemClicked);

	/* Event listeners */
	function onExtensionInstalled(details) {
		initConextMenu();
	}
	
	function onMessageReceived(request, sender) {
		if (request.method == "UpdateSettings") {
			onOptionValueChanged();
		} else if (request.method == "UpdateContextMenu") {
			var scriptGroups = request.data;
			console.log("Update Context Menu");
			console.log(scriptGroups);
			updateConextMenu(scriptGroups);
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
	
	
	/* Persistent states */
	var scriptMenuDict = storage.getSetting("temp-contextMenu-scriptMenuDict", true);	
	var optionMenuDict = storage.getSetting("temp-contextMenu-optionMenuDict", true);	
	var optionMenuDictReverse = storage.getSetting("temp-contextMenu-optionMenuDictReverse", true);
	
// 	if (!scriptMenuDict) { scriptMenuDict = {}; storage.setSetting("temp-contextMenu-scriptMenuDict", {}, true); }
// 	if (!optionMenuDict) { optionMenuDict = {}; storage.setSetting("temp-contextMenu-optionMenuDict", {}, true); }
// 	if (!optionMenuDictReverse) { scriptMenuDict = {}; storage.setSetting("temp-contextMenu-optionMenuDictReverse", {}, true); }
	

	/* Event listener for onInstalled */
	function initConextMenu() {
		function sortContentScriptByDefault(a, b) {
			return a.group.localeCompare(b.group) * 100 + Math.sign(a.index - b.index);
		};

		var groups = {};
		var keys = new Array();
		for ( key in localStorage ) {
			if (/^\$cs-/.test(key)) {
				var name = key.replace(/^\$cs-/, "");				
				var value = localStorage["$cs-"+name];
				var data = JSON.parse(value);					
				data['name'] = name;
			
				keys.push(data);					
			}
		}
	
		keys.sort(sortContentScriptByDefault);
		for ( var i = 0; i < keys.length; ++ i ) {
			var item = keys[i];
			var name = item['name'];
			var key = "$cs-" + name;
		
			var group = item["group"];
			if (!groups[group]) {
				groups[group] = [];
			}
			groups[group].push({"title":item.title, "file":key});
		}
		delete keys;
	
		updateConextMenu(groups);
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
				var menu = group[index];
				menuID = chrome.contextMenus.create({"id":"" + menuID, "title": `${menu.title}`, "contexts":["all"],
									 "parentId": groupMenuID});
			
				scriptMenuDict[menuID++] = menu.file;
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
		updateSettings();
	}

// 	function reloadBackroundPage(info, tab) {
// 	}


}) ();