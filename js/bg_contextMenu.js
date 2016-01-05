if (!Object.prototype.clear)	
	Object.prototype.clear = function() { for (var key in this) { delete this[key]; } };

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
	var scriptMenuDict = localStorage["$setting.temp-contextMenu-scriptMenuDict"];
	if (!scriptMenuDict) localStorage["$setting.temp-contextMenu-scriptMenuDict"] = {};
	var optionMenuDict = localStorage["$setting.temp-contextMenu-optionMenuDict"];
	if (!optionMenuDict) localStorage["$setting.temp-contextMenu-optionMenuDict"] = {};
	var optionMenuDictReverse = localStorage["$setting.temp-contextMenu-optionMenuDictReverse"];
	if (!optionMenuDictReverse) localStorage["$setting.temp-contextMenu-optionMenuDictReverse"] = {};
	
	// Use .clear() method to clear the three object above. Do not assign new value to them.
	

	/* Event listener for onInstalled */
	function initConextMenu() {
		sortContentScriptByDefault = function(a, b) {
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
		for ( i in keys ) {
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
		scriptMenuDict.clear();
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
		
			for ( index in group ) {
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
	}

	function createDefaultMenus() {
	// 	var menuReloadBackground = chrome.contextMenus.create(
	// 	  {"title": "Reload BG Page", "type": "normal", "contexts":["all"], "onclick":reloadBackroundPage});
		
		var menuID = 100;
		createOptionMenu("" + menuID++, "Debug Mode", "$setting.DEBUG");
		createOptionMenu("" + menuID++, "Run Code Mode", "$setting.DEBUG_runbuttoncode", "1");
		createOptionMenu("" + menuID++, "Disable Run-Code Buttons", "$setting.popupwindow_disableRunCodeButton", "1");
	}

	function createOptionMenu(id, title, keyInLocalStorage, parentID) {
		var options = {"id":id, "title": title, "type": "checkbox", "contexts":["all"], 
			 "checked":("false" != localStorage[keyInLocalStorage]) };
	
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
			var value = localStorage[key] != "false";
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
			chrome.tabs.executeScript(tabid, {code:'delete INFO.contextMenuInfo; INFO.contextMenuInfo = JSON.parse(decodeURIComponent("'+encodeURIComponent(JSON.stringify(info))+'")); if (INFO.debug) { console.debug(INFO); }'});
			chrome.runtime.sendMessage({tabid: tabid, method: "ExecuteContentScript", data: file});
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
	
		var optionValue = localStorage[optionKey] != "false";
		// make it the opposite and then save.
		localStorage[optionKey] = optionValue ? "false" : "true";
		chrome.contextMenus.update(menuID, {checked:!optionValue});
	
		// call update settings defined in bg.js
		updateSettings();
	}

// 	function reloadBackroundPage(info, tab) {
// 	}


}) ();