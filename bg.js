var DEBUG = false;
updateSettings();
function updateSettings() {
	DEBUG = localStorage["$setting.DEBUG"] == "true";
}

function log() {
	if (DEBUG) {
		var arglen = arguments.length;
		for (var i = 0; i < arglen; ++ i)
			console.log(arguments[i]);
	}
}

function guid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
        return v.toString(16);
    });
}

(function(global) {

/* Several ways to inject a script into a web page:
1. Insert a <script type="text/javascript" src="path/to/script/file/in/extension/dir.js"></script> node.
2. Insert a <script type="text/javascript" src="data:text/javascript;charset=utf-8,encodeURIComponent(SCRIPT_CONTENT)"></script> node.
3. chrome.tabs.executeScript()
*/
		// Fix a chrome bug which mess up tab id for prerendered page
		chrome.tabs.onReplaced.addListener(function(addedTabId, removedTabId) {
			console.log(`TAB-REPLACEMENT: Tab ${removedTabId} is replaced by tab ${addedTabId}`);
			
			processTab(addedTabId, "JSTinjectScript");
		});

		
        //chrome.extension.onRequest.addListener(function(request, sender) {
        chrome.runtime.onMessage.addListener(function(request, sender) {
        	if (request.tabid) {
				processTab(request.tabid, request.method, request.data);
        	} else {
				chrome.tabs.query({active:true}, function(tabs) {
					// console.log(`Current active tab is ${tabs[0].id}, title: ${tabs[0].title}, url:${tabs[0].url}`);
					
					var tabid = (sender && sender.tab) ? sender.tab.id : undefined;
					processTab(sender.tab.id, request.method, request.data);
				});
			}
        });
        
        function processTab(tabid, requestMethod, requestData) {
			chrome.tabs.get(tabid, function(tab) {
				if (tab) {
					// console.log(`[JScript Tricks] processing tab ${tab.id} title:${tab.title}, url:${tab.url}`);
					processRequest(tab.id, tab.url, requestMethod, requestData);
				} else {
					console.log(`Tab ${tabid} does not exist`);
				}
			});
        }
        
        function processRequest(tabid, url, requestMethod, requestData) {
			var d = url.match(/^[\w-]+:\/*\[?([\w\.:-]+)\]?(?::\d+)?/); 
			var key = d[1];
					
			//chrome.browserAction.setIcon({path:"icon24_auto.png"});
			
        	// Load _Main script as the entry-point of requireJS
        	if (requestMethod == "LoadMainScript") {        		
            	console.log("[JScript Tricks] Load _Main script as the entry-point of requireJS");
        	}
        	
        	// Inject site-specific scripts on website loaded.
            else if (requestMethod == "JSTinjectScript") {
            	if (localStorage["$setting.enabled"] === undefined)
            		localStorage["$setting.enabled"] = "true";
            		
            	if (localStorage["$setting.enabled"] != "true") {
            		chrome.browserAction.setIcon({path: "icon24_disabled.png"});
            		return;
            	} else {
            		chrome.browserAction.setIcon({path: "icon24.png"});
            	}
            	
				var autoloadFileList = [];
				if( !localStorage[key] ) {
					addNecessaryScriptsToHead(autoloadFileList, tabid, url);				
					loadIncludeFiles(tabid, null, autoloadFileList, 0);
					
					return;
				}
            
            	// console.log("[JScript Tricks] loading scripts for tab " + tabid + " " + url);
				
				// Inject injected.js file by inserting a <script> tag in document.
				chrome.tabs.executeScript(tabid, {"code": `
					//(function() {
					function InjectCodeToOriginalSpace(tagName, src) {
						var s = document.createElement('script');
						s.setAttribute('src', src);
						s.setAttribute('type', 'text/javascript');
						(document.head||document.documentElement).appendChild(s);
					}
					//InjectCodeToOriginalSpace("head", "chrome-extension://" + chrome.runtime.id + "/js/require.custom.js");
					InjectCodeToOriginalSpace("head", "chrome-extension://" + chrome.runtime.id + "/injected.js");
					//})();
				`});
				
				var autoloadFiles = {}; var fileCount = 0;
				autoloadFileList = [];
				try {
					var metadata = JSON.parse(localStorage["meta"]);
					var include = metadata["include"];
					// autoloadFiles["length"] = include.length;
					for ( var i = 0; i < include.length; ++i) {
						var fileName = "$cs-" + include[i];
						var text = localStorage[fileName];
						var data = JSON.parse(text);
						autoloadFiles[data["index"]] = {"name":include[i], "code":data["script"], "type":"js"};
						fileCount ++;
					}
					for (index in autoloadFiles) {
						autoloadFileList.push(autoloadFiles[index]);
					}
					autoloadFileList.unshift(/*
						{name:"boot/jquery", file:"js/jquery.sea.js", type:"js"}, 
						{name:"boot/jquery-ui", file:"js/jquery-ui.js", type:"js"},  
						{name:"boot/jquery-init", code:"jQuery.noConflict();", type:"js"}, 
						{name:"boot/msgbox", file:"js/msgbox.js", type:"js"}*/
					);
					addNecessaryScriptsToHead(autoloadFileList, tabid, url);
					
					
					// console.log("autoloadFiles:");
					// console.log(autoloadFileList);
				} catch(exception) {
				}
				
				loadDefaultScript(tabid, key, autoloadFileList);
            }
            
            // Invoked when content menues are clicked.
            else if (requestMethod == "ExecuteContentScript") {
            	var csName = requestData;
				var autoloadFileList = [];
				addAContentScriptToLoadList(autoloadFileList, csName);
				var lastScript = autoloadFileList[autoloadFileList.length - 1];
				lastScript.name = lastScript.name + "-" + guid();
				
				// Load all included files in chain.
				loadIncludeFiles(tabid, null, autoloadFileList, 0);
            }
            
            // Invoked by RUN script or RUN selected script in popup window
            else if (requestMethod == "ExecuteSiteScript") {
            	var data = JSON.parse(requestData);
            	//console.log(data);
            	var name = data.name;
            	var includes = data.includes;
            	var script = data.script;
            	
				var autoloadFileList = [];
				addContentScriptsToLoadList(autoloadFileList, includes);
				autoloadFileList.push( {"name":name+"-"+guid(), "code":script, "type":"js"} );
				
				loadIncludeFiles(tabid, null, autoloadFileList, 0);
            }
            
            // Invoked when sea.js request a module saved in local storage with a URI such as localstorage://Novel.
            // or the source code of a external script file.
            else if (requestMethod == "InjectModule") {
            	var data = JSON.parse(requestData);
            	var csName = data.name;
            	var srcCode = data.code;
            	var callbackID = data.callback;
            	
				var autoloadFileList = [];
				if (srcCode !== undefined) {
					autoloadFileList.push({"name":csName, "code":srcCode, "type":"js"});
				} else {
					addAContentScriptToLoadList(autoloadFileList, csName);
				}
				
				if (autoloadFileList.length < 1) {
					// error in loading script.
					chrome.tabs.sendMessage(tabid, {method: "InjectModuleResponse", error: "true", callback: callbackID});
				} else {					
					// Load all included files in chain.
					loadIncludeFiles(tabid, function() {
						// script is loaded
						chrome.tabs.sendMessage(tabid, {method: "InjectModuleResponse", callback: callbackID});
					}, 
					autoloadFileList, 0);
				}				
            }
            
            // Invoked by clicking show popup page in dialog button in popup window
            else if (requestMethod == "InjectPopupPage") {
				var code = compile_template(codesnippit_showPopupInWebpage, requestData);
				//console.log(code);
				chrome.tabs.executeScript(tabid, {"code": code});
            }
            
            // 
            else if (requestMethod == "ReInjectScript") {
				var execs = requestData;
				for (var i = 0; i < execs.length; ++ i) {
					console.log("Reinjecting file: ", execs[i]);
					chrome.tabs.executeScript(tabid, execs[i]);
				}
            }
            
            else if (requestMethod == "UpdateSettings") {
				updateSettings();
            }
            
            else if (requestMethod == "ReloadBackroundPage") {
				location.reload();
            }
        }
        
        function addNecessaryScriptsToHead(autoloadFileList, tabid, url) {
			autoloadFileList.unshift(
				{name:"boot/setMetaData", code:`
							var INFO = new Object(); 
							INFO.debug = ${localStorage["$setting.DEBUG"]};
							INFO.tabid = ${tabid};
							INFO.taburl = "${url}";
							var meta_data = JSON.parse(decodeURIComponent("${encodeURIComponent(localStorage['meta'])}"));
							var meta_data = JSON.parse(decodeURIComponent("${encodeURIComponent(localStorage['meta'])}"));
						`, type:"js"},
				{name:"boot/boot.js", file:"js/seajs_boot.js", type:"js"}, 
				{name:"boot/nodeSelector", file:"js/nodeSelector.js", type:"js"}
			);
			if (localStorage["Main"]) {
				try {
					var mlsd = JSON.parse(localStorage["Main"]);
					if (mlsd.script)
						autoloadFileList.unshift({name:"boot/Main", code:mlsd.script, type:"js"});
				} catch (exception) {
					chrome.tabs.executeScript(tabid, {code: 'showMessage("Error occurs during loading Main script");'});
					console.log(exception);
				}
			}
        }
        
		function loadDefaultScript(tabid, key, autoloadFileList) {
			// console.log("Loading default script.");
				
			try {
				var dlsd = JSON.parse(localStorage["Default"]);
				
				if(dlsd.autostart) {
					addContentScriptsToLoadList(autoloadFileList, dlsd.sfile);
					var code = "console.info('[Javascript Tricks] Default script is executing');";
					code += dlsd.script;
					autoloadFileList.push( {"name":"Site Script Default", "code":code, "type":"js"} );
					
					chrome.tabs.insertCSS(tabid, {code:dlsd.css, runAt:"document_start"});
				} 
				
				loadSiteScript(tabid, key, autoloadFileList);
			} catch (exception) {			
				chrome.tabs.executeScript(tabid, {code: 'showMessage("Error occurs during loading Default script");'});
				console.log(exception);
				//loadSiteScript(tabid, key);
			}
		}
		
		function loadSiteScript(tabid, key, autoloadFileList) {
			if( localStorage[key] )
			{
				var lsd = JSON.parse(localStorage[key]);
				if(lsd.autostart) {
					chrome.browserAction.setIcon({path: "icon24_auto.png"});
					
					if(lsd.sfile != "") {					
						addContentScriptsToLoadList(autoloadFileList, lsd.sfile);
					}
					autoloadFileList.push( {"name":"Site Script " + key, "code":lsd.script, "type":"js"} );
						
					chrome.tabs.insertCSS(tabid,{code:lsd.css, runAt:"document_start"});
					// Load all included files in chain.
					loadIncludeFiles(tabid, null, autoloadFileList, 0);
				}
			}
		}
		
		function emptyFunc() {};
        
        function loadIncludeFiles(tabid, callback, autoloadFileList, index) {
			if (!callback)
				callback = emptyFunc;
				
			var file = autoloadFileList[index];
			if (!file) {
				callback();
				return;
			}
			
			console.log("Tab " + tabid + ": Injecting Content script " + file.name + " ...");
			var execDetail = {};
			if (file["code"])
				execDetail["code"] = file.code;
			else if (file["file"])
				execDetail["file"] = file.file;
			
			var callNextInChain = function(result) {
				//console.log("result of executing content script:");
				//console.log(result);
				if (index <autoloadFileList.length - 1)
					loadIncludeFiles(tabid, callback, autoloadFileList, index + 1);
				else
					callback();
			};
			
			var loadFunc = emptyFunc;
			if (file["type"] == "js")
				loadFunc = chrome.tabs.executeScript;
			if (file["type"] == "css")
				loadFunc = chrome.tabs.insertCSS;

			// console.log(execDetail);
			loadFunc(tabid, execDetail, callNextInChain);
			
			// Reduce memory leak
			delete callNextInChain;
        }
        
        function insertScriptNodeAsDataUri() {
        }
		
		function addContentScriptsToLoadList(loadList, csNames) {
			if(csNames) {
				var includeFiles = csNames.trim().split(/\s*,\s*/).filter(function(str) {return str != ""; });
				for ( var i = 0; i < includeFiles.length; ++i) {
					addAContentScriptToLoadList(loadList, includeFiles[i]);
				}
			}
		}
		
		function addAContentScriptToLoadList(loadList, csName) {
			try {
				if ( (csName.startsWith("http://") || csName.startsWith("https://")) 
					&& !isContentScriptInLoadList(loadList, csName)) {	
						
					loadList.push( {"name":csName, "link":csName, "type":"js"} );
				} else {
					var fileName = "$cs-" + csName;
					var text = localStorage[fileName];
					var data = JSON.parse(text);
					
					if (data["sfile"]) {
						var includeFiles = data.sfile.trim().split(/\s*,\s*/)
							.filter(function(str) {return str != ""; });
						
						for (var i = 0; i < includeFiles.length; ++ i) {
							var includeFile = includeFiles[i];
							if (!isContentScriptInLoadList(loadList, includeFile)) {
								addAContentScriptToLoadList(loadList, includeFile);
							}
						}
					}
					
					if (!isContentScriptInLoadList(loadList, csName)) {
						loadList.push( {"name":csName, "code":data["script"], "type":"js"} );
					}
				}
			} catch(exception) {}
		}
		
		function isContentScriptInLoadList(loadList, csName) {
			for (var j = 0; j < loadList.length; ++ j) {
				if (loadList[j].name == csName) {
					return true;
				}
			}
			
			return false;
		}
		
        chrome.tabs.onActiveChanged.addListener(function(tabId) {
            chrome.tabs.get(tabId, function(tab){				
                changeIcon(tab)
            })

        });
        
        chrome.tabs.onCreated.addListener(setTabID);
        chrome.tabs.onUpdated.addListener(setTabID);
        function setTabID(tabid) {
        	chrome.tabs.executeScript(tabid, {"code":`
        		window.tabid = ${tabid};
        		if (${DEBUG}) {
        			console.info("Chome Tab ID is: "+"${tabid}");
        		}
        	`} );
        }

        function  changeIcon(tab)
        {
        	if (localStorage["$setting.enabled"] == "true") {
				var matches= tab.url.match(/^[\w-]+:\/*\[?([\w\.:-]+)\]?(?::\d+)?/);
					
				if( matches[1] && localStorage[matches[1]] )
				{
					var lsd = JSON.parse(localStorage[matches[1]]);
					if(lsd.autostart)
					{
						chrome.browserAction.setIcon({path:"icon24_auto.png"});    
						return;
					}
				}
				chrome.browserAction.setIcon({path:"icon24.png"});    
            } else {
            	chrome.browserAction.setIcon({path:"icon24_disabled.png"});    
            }
        }
		
		chrome.manifest = (function() {
			var manifestObject = false;
			var xhr = new XMLHttpRequest();

			xhr.onreadystatechange = function() {
				if (xhr.readyState == 4) {
					manifestObject = JSON.parse(xhr.responseText);
				}
			};
			xhr.open("GET", chrome.extension.getURL('/manifest.json'), false);

			try {
				xhr.send();
			} catch(e) {
				console.log('Couldn\'t load manifest.json');
			}

			return manifestObject;

		})();
		if( localStorage["info"] == undefined || localStorage["info"] != chrome.manifest.version)
		{		
			localStorage["info"] = chrome.manifest.version;
			loadDefaultSettings();
			alert("JS TRICKS IMPORTANT CHANGE: script and css are now injected before DOM creation. Use $(function(){ ... }) to start script on DOMReady.");
		}

		function loadDefaultSettings() {
			var manifestObject = false;
			var xhr = new XMLHttpRequest();

			xhr.onreadystatechange = function() {
				if (xhr.readyState == 4) {
					var initSettings = JSON.parse(xhr.responseText);
					for (key in initSettings) {
						localStorage[key] = initSettings[key];
					}
				}
			};
			if (chrome.extension) {
				xhr.open("GET", chrome.extension.getURL('/init_settings.json'), false);
			}
			try {
				xhr.send();
			} catch(e) {
				console.log('Couldn\'t load init_settings.json');
			}
		}
		
		
}) (this);