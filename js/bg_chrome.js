(function() {

function guid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
        return v.toString(16);
    });
}

var invocationID = 0;
var handlers = {};
chrome.runtime.onMessage.addListener(function(msg, sender) {
	//console.log("Message received:");
	//console.log(msg);
	if (msg["MsgType"] && msg["MsgType"] == "chrome-ext-api") {
		var tabid = (sender.tab) ? sender.tab.id : null;
		var method = msg["method"];
		var id = msg["id"];
		var arg = JSON.parse(msg["arg"]);
		
		// call method such as GetTabURL, GetSelectedTab, etc
		handlers[method](tabid, method, id, arg);
	}
});

function API_SendResponse(tabid, method, id, arg) {
	var msg = {MsgType:"chrome-ext-api-response", method:method, id:id, arg:JSON.stringify(arg)};
	//console.log("Send response for request with id="+id);
	//console.log(msg);
	if (tabid != null)
		chrome.tabs.sendMessage(tabid, msg);
	else
		chrome.runtime.sendMessage({MsgType:"chrome-ext-api-response", method:method, id:id, arg:arg});
}

handlers.GetTabURL = function (tabid, method, id, arg) {
	chrome.tabs.query({active:true, windowId:chrome.windows.WINDOW_ID_CURRENT}, function(tabs) {
		var url = tabs[0].url;
		API_SendResponse(tabid, method, id, url);
	});
};

handlers.GetSelectedTab = function (tabid, method, id, arg) {
	chrome.tabs.query({active:true, windowId:chrome.windows.WINDOW_ID_CURRENT}, function(tabs) {
		var tab = tabs[0];
		//console.log(tab);
		API_SendResponse(tabid, method, id, tab);
	});
};

var a = 0;
handlers.SetIcon = function (tabid, method, id, arg) {
	console.log("setIcon");
	chrome.browserAction.setIcon(arg);
	
	if (a++ % 2) {
		chrome.browserAction.setIcon({path: "icon/icon24.png"});
		console.log('chrome.browserAction.setIcon({path: "icon/icon24.png"});');
	} else {
		chrome.browserAction.setIcon({path: "icon/icon24_auto.png"});
		console.log('chrome.browserAction.setIcon({path: "icon/icon24_auto.png"});');
	}
};

handlers.SendMessageToTab = function (tabid, method, id, arg) {
	chrome.tabs.sendMessage(tabid, arg, function(response) {
		API_SendResponse(tabid, method, id, tab);
	});
};

handlers.OpenWindow = function (tabid, method, id, arg) {
	window.open(arg.url, arg.name);
};

handlers.ConsoleLog = function (tabid, method, id, arg) {
	var argArray = [];
	for (k in arg) {
		argArray[k] = arg[k];
	}
	console.log.apply(console, argArray);
	delete argArray;
};

  
function cloudGetHandler() {
  var url = storage.getSetting("cloud-url");
  var path = storage.getSetting("cloud-path");
  var passphrase = storage.getSetting("cloud-passphrase");
  var keyiv = storage.getSetting("cloud-keyiv");
  
  return new CloudSave(url, path, passphrase, keyiv);
}

handlers.CloudBackup = function (tabid, method, id, arg) {      
  // Create a backup object which does not contain cloud storage tokens
  storage.backup(function(backupObj) {
    // Stringify the backup object
    var data = JSON.stringify(backupObj);
    if (storage.getSetting("backup-readable", true, false))
      data = formatter.formatJson(data, "  ");
    var filename = (new Date()).Format("yyyyMMdd-hhmmss");
  
    cloudGetHandler().backupSingleFile(filename, data, function(data) {
      // on ok
        storage.setSetting("cloud-lastsave", filename);
        $("#cloudrestore-key").val(filename);
		    API_SendResponse(tabid, method, id, {"code":"ok"});
    },   function(err) {
      // on err
      if (err.code == "error-init") {
        API_SendResponse(tabid, method, id, {"code":"notset", "msg":err.message});
      } else {
		    API_SendResponse(tabid, method, id, {"code":"err", "msg":"Failed to save configurations. <br/>" + err.message});
      }
    }); 
    // end of cloudGetHandler().backupSingleFile
    
  }, {cloud:false}); // end of  storage.backup
}

handlers.CloudCheck = function (tabid, method, id, arg) {
  cloudGetHandler().list(function(data) {
    // on ok
    if (data.result.length > 0) {
      var newestVer = data.result[0];
      var localVer = storage.getSetting("cloud-lastsave");
      if (!localVer || newestVer > localVer) {
        API_SendResponse(tabid, method, id, {"code":"newversion", "ver":newestVer});
        handlers.CloudRestore(tabid, method, id, {"ver":newestVer});
      } else {
        API_SendResponse(tabid, method, id, {"code":"unchanged"});
      }
    } else {
      API_SendResponse(tabid, method, id, {"code":"unchanged"});
    } 
  },   function(err) {
    // on err
    if (err.code == "error-init") {
      API_SendResponse(tabid, method, id, {"code":"notset", "msg":err.message});
    } else {
      API_SendResponse(tabid, method, id, {"code":"err", "msg":"Failed to list configurations. <br/>" + err.message});
    }
  });
}

handlers.CloudRestore = function (tabid, method, id, arg) {
  var key = arg.ver;
  
  cloudGetHandler().restoreFromSingleFile(key, function(data) {
    // on ok
    console.log(data);
    var backupObj = JSON.parse(data);        
    storage.restore(backupObj, function() {
      // On complete
      storage.setSetting("cloud-lastsave", key);
      API_SendResponse(tabid, method, id, {"code":"ok"});
    }, {cloudSettings:false});        
  }, function(err) {
    // On Error
    API_SendResponse(tabid, method, id, {"code":"err", "msg":"Failed to load configurations. <br/>" + err.message});
  });
}





// invoked by storage.js in content page
handlers.SaveToStrage = function (tabid, method, id, arg) {
  chrome.storage.local.set(arg);
}

})();