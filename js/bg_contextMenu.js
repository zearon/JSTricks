//if (!Object.prototype.clear)  
//  Object.prototype.clear = function() { for (var key in this) { delete this[key]; } };

(function() {
  
  /* Persistent states */
  var scriptMenuDict = storage.getSetting("temp-contextMenu-scriptMenuDict", true);  
  var optionMenuDict = storage.getSetting("temp-contextMenu-optionMenuDict", true);  
  var optionMenuDictReverse = storage.getSetting("temp-contextMenu-optionMenuDictReverse", true);
  
  var scriptMenuIndex = storage.getSetting("contextMenu-index", true, {});
  var csGroupUIprops  = storage.getSetting("csgroup-ui", true, {});
  
  var MENUID_REBUILD_INDEX = "10";
  var MENUID_RELOAD = "11";
  
  /* Register events */
  // initContextMenu invoked in bj.js initExtension which is also registed with chrome.runtime.onInstalled
  //chrome.runtime.onInstalled.addListener(initContextMenuOnInstalled); 
  chrome.runtime.onMessage.addListener(onMessageReceived);
  chrome.contextMenus.onClicked.addListener(onContextMenuItemClicked);

  /* Event listeners */
  function initContextMenuOnInstalled() {
    scriptMenuIndex = storage.getSetting("contextMenu-index", true, {});
    csGroupUIprops  = storage.getSetting("csgroup-ui", true, {});
    initContextMenu();
  }
  window.initContextMenuOnInstalled = initContextMenuOnInstalled;
  
  function onMessageReceived(request, sender) {
    if (request.method == "UpdateSettings") {
      onOptionValueChanged();
    } else if (request.method == "UpdateContextMenu") {
      // update properties relating to script UI
      initContextMenuOnInstalled();
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
    
    else if (menuID >= 10) {
      if (menuID === MENUID_RELOAD) {
        console.info("Reload extension");
        chrome.runtime.reload();
      } else if (menuID === MENUID_REBUILD_INDEX) {
        console.info("Rebuild index");
        storage.rebuildScriptIndexes(function() {
          // defined in bg_contextMenu.js
          initContextMenuOnInstalled();
          updateSettings();
        });        
      }
    }
  }
  /* End of event listeners */
  
  

  /* Event listener for onInstalled */
  function initContextMenu() {    
    var noScriptIndex = scriptMenuIndex === undefined;
    if (noScriptIndex) {
      scriptMenuIndex = {};
      console.info("No context menu index. Initialize it with the default sequence.");
    }

    // load the script list from index stored in cache
    var i = 0, index = 0, groupNames = [], keys = [], key;
    var contentScripts = storage.loadIndexObj().contentScripts;
    function groupEquals(x, y) {return x.name === y.name}
    var scriptList = objectToArray(contentScripts, "keyinvalue:name")
        .filter(function(s) {
          if (s.group === undefined) s.group = "";
          var groupName = s.group;
          if (!groupNames.contains({name:groupName}, groupEquals )) {
            groupNames.push( {name:groupName, group:groupName} );
          }
          
          // add script into the list
          var index = scriptMenuIndex[s.name];
          if (index !== undefined) s.index = index;
          return s;
        })
    
    // Initialize UI properties of content script group if needed.
    groupNames = groupNames.sort(sortContentScriptByGroup), index = 0;
    //groupNames.forEach(s=>console.log(s.name));
    for (i = 0; i < groupNames.length; ++ i) {
      var group =groupNames[i];
      var groupProps = csGroupUIprops[group.name];
      if (groupProps === undefined) 
        csGroupUIprops[group.name] = {index:++index, closed:group.name !== ""};
      else
        groupProps.index = ++index;
    }
    // Remove UI properties of redundant scripts (perhaps deleted by data store operations)
    for (key in csGroupUIprops) {
      if (!groupNames.contains({name:key}, groupEquals ))
        delete csGroupUIprops[key];
    }
    storage.setSetting("csgroup-ui", csGroupUIprops, true);
    
    // Sort the script list by group index and script index
    scriptList = scriptList.sort(sortContentScriptByGroup);
    
    var groups = {}, index = 0;
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
    for (key in scriptMenuIndex) {
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
    a.gindex = csGroupUIprops[a.group], a.gindex = a.gindex ? a.gindex.index : undefined;
    b.gindex = csGroupUIprops[b.group], b.gindex = b.gindex ? b.gindex.index : undefined;
    var groupDiff = compareNumberWithUndef(a.gindex, b.gindex);
    var indexDiff = compareNumberWithUndef(a.index, b.index);
    var nameDiff  = a.name.localeCompare(b.name);
    return groupDiff !== 0 ? groupDiff :
            (indexDiff !== 0 ? indexDiff :
            nameDiff);
  
    function compareNumberWithUndef(a, b) {
      return (a === undefined && b === undefined) ? 0 : 
        (a === undefined ? 1 : 
          (b === undefined ? -1 : a - b ));
    }
    
    function compareStrWithUndef(a, b) {
      return (a === undefined && b === undefined) ? 0 : 
        (a === undefined ? 1 : 
          (b === undefined ? -1 : a.localeCompare(b) ));
    }
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
        groupMenuID = undefined;
      } else {      
        groupMenuID = "" + menuID;
        chrome.contextMenus.create({"id":"" + menuID++,"title": `Scripts [${groupName}]`, "contexts":["all"]});
      }
    
      for ( var index = 0; index < group.length; ++ index ) {
        var script = group[index];
        var info = {"id":"" + menuID, "title": `${script.title}`, "contexts":["all"],
                   "parentId": groupMenuID};
//         if (groupMenuID) info.parentID = groupMenuID;
        menuID = chrome.contextMenus.create(info);
      
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
  //   var menuReloadBackground = chrome.contextMenus.create(
  //     {"title": "Reload BG Page", "type": "normal", "contexts":["all"], "onclick":reloadBackroundPage});
    
    var menuID = 100;
    optionMenuDict = {}; 
    optionMenuDictReverse = {}; 

    createOptionMenu("" + menuID++, "msgbox.log Shows Stacktrace", "builtin_msgboxShowStacktrace");
    createOptionMenu("" + menuID++, "Debug Mode", "DEBUG");
    createOptionMenu("" + menuID++, "Run Code Mode", "DEBUG_runbuttoncode", "1");
    createOptionMenu("" + menuID++, "Disable Run-Code Buttons", "popupwindow_disableRunCodeButton", "1");
    chrome.contextMenus.create({"id":"2", "type": "separator", "contexts":["all"], "parentId":"1"});
    chrome.contextMenus.create({"id":MENUID_REBUILD_INDEX, "title":"Rebuild Index", "contexts":["all"], "parentId":"1"});
    chrome.contextMenus.create({"id":MENUID_RELOAD, "title":"Reload Extension", "contexts":["all"], "parentId":"1"});
    
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

//   function reloadBackroundPage(info, tab) {
//   }


}) ();