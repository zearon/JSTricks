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
*/

// Create some checkbox items.
function checkboxOnClick(info, tab) {
  console.log(JSON.stringify(info));
  console.log("checkbox item " + info.menuItemId +
              " was clicked, state is now: " + info.checked +
              "(previous state was " + info.wasChecked + ")");

}

var scriptGroups = {};
var scriptMenuDict = {};
function scriptMenuClick(info, tab) {
	var menuID = info.menuItemId;
	var file = scriptMenuDict[menuID];
	file = file.replace(/^\$cs\-/, "");
	console.log(`Menu ${menuID} clicked: load file ${file}`);
	
	/*
	var text = localStorage[file];
	var script = JSON.parse(text)["script"];
	*/
	console.log(info);
	
	chrome.tabs.executeScript(tab.id, {code:"var contextInfo = JSON.parse(decodeURIComponent('"+encodeURIComponent(JSON.stringify(info))+"'));"});
	chrome.runtime.sendMessage({tabid: tab.id, method: "ExecuteContentScript", data: file});
	
	// chrome.tabs.executeScript(tab.id, {code:script});
}

function reloadBackroundPage(info, tab) {
	window.location.reload();
}


        chrome.extension.onRequest.addListener(function(request, sender) {
            if (request.method == "UpdateContextMenu") {
            	scriptGroups = request.data;
            	console.log("Update Context Menu");
            	console.log(scriptGroups);
            	updateScriptConextMenu();
            }                  
        });
        
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
        	
        	createDefaultMenus();
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
        
        
/*
function InjectJQueryAndCall(func) {
	chrome.tabs.executeScript(null, {file: "usrlib/injectjQuery.js"});
}*/

// ------------- Functions ----------------
function createDefaultMenus() {
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
	
	chrome.contextMenus.create({"type": "separator"});
	var preferences = chrome.contextMenus.create({"title": "Preferences"});
	
	var menuReloadBackground = chrome.contextMenus.create(
	  {"title": "Reload Background Page", "parentId": preferences, "type": "normal", "onclick":reloadBackroundPage});
	var menuRefresh = chrome.contextMenus.create(
	  {"title": "Update Context-Menu", "parentId": preferences, "type": "normal", "onclick":initScriptConextMenu});
	var checkbox1 = chrome.contextMenus.create(
	  {"title": "Enable Custom URL", "parentId": preferences, "type": "checkbox", "onclick":checkboxOnClick, "checked":true});
	// console.log("checkbox1:" + checkbox1 + " checkbox2:" + checkbox2);
}

initScriptConextMenu();
