chrome.runtime.onMessage.addListener(function(request, sender) {
	if (request.method == "UpdateSettings") {
		optionValueChanged();
	} else if (request.method == "UpdateContextMenu") {
		scriptGroups = request.data;
		console.log("Update Context Menu");
		console.log(scriptGroups);
		updateScriptConextMenu();
	} 
});
        
var preferencesMenuID;

var scriptGroups = {};
var scriptMenuDict = {};
function scriptMenuClick(info, tab) {
	var menuID = info.menuItemId;
	var file = scriptMenuDict[menuID];
	file = file.replace(/^\$cs\-/, "");
	debug_log(`Menu ${menuID} clicked: load file ${file}`, "Context menu item info:", info);
	
	/*
	var text = localStorage[file];
	var script = JSON.parse(text)["script"];
	*/
	
	chrome.tabs.executeScript(tab.id, {code:"delete INFO.contextMenuInfo; INFO.contextMenuInfo = JSON.parse(decodeURIComponent('"+encodeURIComponent(JSON.stringify(info))+"')); if (INFO.debug) { console.debug(INFO); }"});
	chrome.runtime.sendMessage({tabid: tab.id, method: "ExecuteContentScript", data: file});
	
	// chrome.tabs.executeScript(tab.id, {code:script});
}

var optionMenuDict = {};
var optionMenuDictReverse = {};
function optionMenuClick(info, tab) {
	var menuID = info.menuItemId;
	var optionKey = optionMenuDict[menuID];
	
	var optionValue = localStorage[optionKey] != "false";
	// make it the opposite and then save.
	localStorage[optionKey] = optionValue ? "false" : "true";
	chrome.contextMenus.update(menuID, {checked:!optionValue});
	
	// call update settings defined in bg.js
	updateSettings();
}

function optionValueChanged() {
	console.log("Option value changed");
	for (key in optionMenuDictReverse) {
		var menuID = optionMenuDictReverse[key];
		var value = localStorage[key] != "false";
		chrome.contextMenus.update(menuID, {checked:value});		
	}
}

function reloadBackroundPage(info, tab) {
	window.location.reload();
}


function updateScriptConextMenu() {
	// remove old menues
	chrome.contextMenus.removeAll();
	scriptMenuDict = {};
	
	// Create menus
	for ( groupName in scriptGroups ) {
		var group = scriptGroups[groupName];
		var groupMenuID = null;
		if (groupName == "") {
		} else {
			groupMenuID = chrome.contextMenus.create({"title": `Scripts [${groupName}]`, "contexts":["all"]});
		}
		
		var menuID = null;
		for ( index in group ) {
			var menu = group[index];
			menuID = chrome.contextMenus.create({"title": `${menu.title}`, "contexts":["all"],
							   "parentId": groupMenuID, "onclick": scriptMenuClick});
			
			scriptMenuDict[menuID] = menu.file;
		}
	}
	
	// Create a separator
	chrome.contextMenus.create({"type": "separator", "contexts":["all"]});
	preferencesMenuID = chrome.contextMenus.create({"title": "Preferences", "contexts":["all"]});
	
	// Create default menus
	createDefaultMenus();
}

function createDefaultMenus() {
	var menuReloadBackground = chrome.contextMenus.create(
	  {"title": "Reload BG Page", "type": "normal", "contexts":["all"], "onclick":reloadBackroundPage});
	  
	createOptionMenu("Debug Mode", "$setting.DEBUG");
	createOptionMenu("Run Code Mode", "$setting.DEBUG_runbuttoncode", preferencesMenuID);
	createOptionMenu("Disable Run-Code Buttons", "$setting.popupwindow_disableRunCodeButton", preferencesMenuID);
}

function createOptionMenu(title, keyInLocalStorage, parentID) {
	var options = {"title": title, "type": "checkbox", "contexts":["all"], "onclick":optionMenuClick, 
	   "checked":("false" != localStorage[keyInLocalStorage]) };
	
	if (parentID)
		options["parentId"] = parentID;
		
	var menuID = chrome.contextMenus.create(options);
	  
	optionMenuDict[menuID] = keyInLocalStorage;
	optionMenuDictReverse[keyInLocalStorage] = menuID;
}
        
function initScriptConextMenu() {
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
	
	scriptGroups = groups;
	
	updateScriptConextMenu();
}

initScriptConextMenu();











// A generic onclick callback function.
function genericOnClick(info, tab) {
  console.log("item " + info.menuItemId + " was clicked");
  console.log("info: " + JSON.stringify(info));
  console.log("tab: " + JSON.stringify(tab));
}

// Create some radio items.
/*
function radioOnClick(info, tab) {
  console.log("radio item " + info.menuItemId +
              " was clicked (previous checked state was "  +
              info.wasChecked + ")");
}
var radio1 = chrome.contextMenus.create({"title": "Radio 1", "type": "radio",
                                         "onclick":radioOnClick});
var radio2 = chrome.contextMenus.create({"title": "Radio 2", "type": "radio",
                                         "onclick":radioOnClick});
console.log("radio1:" + radio1 + " radio2:" + radio2);

// Create some checkbox items.
function checkboxOnClick(info, tab) {
  console.log(JSON.stringify(info));
  console.log("checkbox item " + info.menuItemId +
              " was clicked, state is now: " + info.checked +
              "(previous state was " + info.wasChecked + ")");

}
*/

/*
var functions = chrome.contextMenus.create({"title": "Local storage backup and restore", "contexts":["page"],
									   "onclick": genericOnClick});

// Dynamic loaded scripts
var preferences = chrome.contextMenus.create({"title": "Dynamic loaded scripts"});
*/
/*
// Test menus
// Create one test item for each context type.
var testMenu = chrome.contextMenus.create({"title": "Test menus"});
var contexts = ["page","selection","link","editable"];
			   // ,"image","video","audio"];
for (var i = 0; i < contexts.length; i++) {
  var context = contexts[i];
  var title = "Test '" + context + "' menu item";
  var id = chrome.contextMenus.create({"title": title, "parentId": testMenu, "contexts":[context],
									   "onclick": genericOnClick});
  // console.log("'" + context + "' item:" + id);
}
*/

//var menuRefresh = chrome.contextMenus.create(
//  {"title": "Update Context-Menu", "parentId": preferencesMenuID, "type": "normal", "onclick":initScriptConextMenu});
// console.log("checkbox1:" + checkbox1 + " checkbox2:" + checkbox2);
