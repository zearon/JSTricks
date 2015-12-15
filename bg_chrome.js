(function() {

function guid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
        return v.toString(16);
    });
}

var invocationID = 0;
chrome.runtime.onMessage.addListener(function(msg, sender) {
	//console.log("Message received:");
	//console.log(msg);
	if (msg["MsgType"] && msg["MsgType"] == "chrome-ext-api") {
		var tabid = (sender.tab) ? sender.tab.id : null;
		var method = msg["method"];
		var id = msg["id"];
		var arg = JSON.parse(msg["arg"]);
		
		// call method such as GetTabURL, GetSelectedTab, etc
		//scope[method](tabid, method, id, arg);
		
		if (method == "GetTabURL") {
			GetTabURL(tabid, method, id, arg);
		} else if (method == "GetSelectedTab") {
			GetSelectedTab(tabid, method, id, arg);
		} else if (method == "SetIcon") {
			SetIcon(tabid, method, id, arg);
		} else if (method == "SendMessageToTab") {
			SendMessageToTab(tabid, method, id, arg);
		} else if (method == "ConsoleLog") {
			ConsoleLog(tabid, method, id, arg);
		}
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

function GetTabURL(tabid, method, id, arg) {
	chrome.tabs.query({active:true}, function(tabs) {
		var url = tabs[0].url;
		API_SendResponse(tabid, method, id, url);
	});
}

function GetSelectedTab(tabid, method, id, arg) {
	chrome.tabs.query({active:true}, function(tabs) {
		var tab = tabs[0];
		//console.log(tab);
		API_SendResponse(tabid, method, id, tab);
	});
}

var a = 0;
function SetIcon(tabid, method, id, arg) {
	console.log("setIcon");
	chrome.browserAction.setIcon(arg);
	
	if (a++ % 2) {
		chrome.browserAction.setIcon({path: "icon24.png"});
		console.log('chrome.browserAction.setIcon({path: "icon24.png"});');
	} else {
		chrome.browserAction.setIcon({path: "icon24_auto.png"});
		console.log('chrome.browserAction.setIcon({path: "icon24_auto.png"});');
	}
}

function SendMessageToTab(tabid, method, id, arg) {
	chrome.tabs.sendMessage(tabid, arg, function(response) {
		API_SendResponse(tabid, method, id, tab);
	});
}

function ConsoleLog(tabid, method, id, arg) {
	var argArray = [];
	for (k in arg) {
		argArray[k] = arg[k];
	}
	console.log.apply(console, argArray);
	delete argArray;
}

})();