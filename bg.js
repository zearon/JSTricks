var DEBUG = false;
var infoStr = "";

function log() {
	if (DEBUG) {
		console.log.apply(console, arguments);
	}
}

function debug_log() {
	if (DEBUG) {
		console.log.apply(console, arguments);
	}
}

function guid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
        return v.toString(16);
    });
}

function updateSettings() {
	DEBUG = localStorage["$setting.DEBUG"] == "true";
	var setting = {};
	for ( key in localStorage) {
		if (!key.startsWith("$setting.") || key.startsWith("$setting.cloud-") || key.startsWith("$settings.temp-") ) 
			continue;
		
		var shortKey = key.replace("$setting.", "");
		
		setting[shortKey] = localStorage[key];
	}
	
	var INFO = { settings: setting, debug: DEBUG,
		meta_data: JSON.parse(localStorage['meta']) };
	
	infoStr = encodeURIComponent(JSON.stringify(INFO));
	
	//if (DEBUG)
		console.log("Settings are updated, and new INFO is", INFO);
	//console.log("InfoStr is", infoStr);
}
		
(function(global) {

/* Several ways to inject a script into a web page:
1. Insert a <script type="text/javascript" src="path/to/script/file/in/extension/dir.js"></script> node.
2. Insert a <script type="text/javascript" src="data:text/javascript;charset=utf-8,encodeURIComponent(SCRIPT_CONTENT)"></script> node.
3. chrome.tabs.executeScript()
*/
		// Fix a chrome bug which mess up tab id for prerendered page
		chrome.tabs.onReplaced.addListener(function(addedTabId, removedTabId) {
			debug_log(`TAB-REPLACEMENT: Tab ${removedTabId} is replaced by tab ${addedTabId}`);
			
			processTab(addedTabId, "JSTinjectScript");
		});

		
        //chrome.extension.onRequest.addListener(function(request, sender) {
        chrome.runtime.onMessage.addListener(function(request, sender) {
        	if (request.tabid) {
				processTab(request.tabid, request.method, request.data);
        	} else {
				//chrome.tabs.query({active:true}, function(tabs) {
				//	if (chrome.runtime.lastError) {
				//		// tab is not fetched successfully
				//		console.error("Cannot get selected tab.");
				//	} else {
				//		// debug_log(`Current active tab is ${tabs[0].id}, title: ${tabs[0].title}, url:${tabs[0].url}`);
						
						var tabid = (sender && sender.tab) ? sender.tab.id : undefined;
						processTab(tabid, request.method, request.data);
				//	}
				//});
			}
        });
        
        function processTab(tabid, requestMethod, requestData) {
        	// if tabid is undefined
        	if (!tabid) {
        		processRequest(undefined, undefined, requestMethod, requestData);
        	} else {
				chrome.tabs.get(tabid, function(tab) {
					if (chrome.runtime.lastError) {
						// tab is not fetched successfully
						console.error(`Tab ${tabid} does not exist`);
					} else {
						// debug_log(`[JScript Tricks] processing tab ${tab.id} title:${tab.title}, url:${tab.url}`);
						processRequest(tab.id, tab.url, requestMethod, requestData);
					}
				});
			}
        }
        
        function processRequest(tabid, url, requestMethod, requestData) {					
			//chrome.browserAction.setIcon({path:"icon24_auto.png"});
			
        	// Load _Main script as the entry-point of requireJS
        	if (requestMethod == "LoadMainScript") {        		
            	debug_log("[JScript Tricks] Load _Main script as the entry-point of requireJS");
        	}
        	
        	// Inject site-specific scripts on website loaded.
            else if (requestMethod == "JSTinjectScript") {
				var d = url.match(/^[\w-]+:\/*\[?([\w\.:-]+)\]?(?::\d+)?/); 
				var key = d[1];
				
            	if (localStorage["$setting.enabled"] === undefined)
            		localStorage["$setting.enabled"] = "true";
            		
            	if (localStorage["$setting.enabled"] != "true") {
            		chrome.browserAction.setIcon({path: "icon24_disabled.png"});
            		return;
            	} else {
            		chrome.browserAction.setIcon({path: "icon24.png"});
            	}
				
				// Inject a function to add <script> tag in document.
				chrome.tabs.executeScript(tabid, {"code": codesnippet_addScriptNodeToDOM});
            	
				var autoloadFileList = [];
				var loadProperty = {necessaryAdded: false, autostartLibAdded: false, defaultAdded: false, siteAdded: false};
				
				addNecessaryScriptsForAllSiteToHead(tabid, url, autoloadFileList, loadProperty);
				
				loadDefaultScript(tabid, key, autoloadFileList, loadProperty);
				
				delete autoloadFileList;
				delete loadProperty;
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
            	//debug_log(data);
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
            
            // Invoked by request from content scripts to inject other content script as 
            // a script node in DOM tree with Data URI. In this way, the injected script is
            // executed in the top frame, instead of the extension frame. The window objects
            // in the two frames are different, but share a same DOM tree. For example (in content script):
            // chrome.runtime.sendMessage({tabid: INFO.tabid, method:"ExecuteJsCodeOrFile", data:"Test"}); // Test is the name of a content script.
            else if (requestMethod == "InjectContentScriptAsScriptNode"){
				var args = JSON.parse(requestData);
				var csName = args.name;
				var callbackID = args.callback ? args.callback : "";
				
				var script = null, text = localStorage["$cs-" + csName];
				try {
					script = JSON.parse(text).script;
				} catch (ex) { return; }
				
				var dataUri = "data:text/javascript;charset=UTF-8," + encodeURIComponent(script);
				chrome.tabs.executeScript(tabid, { code:`
					InjectCodeToOriginalSpace("${dataUri}", function() {
						//console.log("Script ${csName} loaded.");
						//console.log("__JSTricks_Messenger_OnScriptLoaded is", window["__JSTricks_Messenger_OnScriptLoaded"]);
						window["__JSTricks_Messenger"].onScriptLoaded("${callbackID}");
					});
				`} );
            }
            
            // When settings are changed in options page (options.js), this message is sent to inform background page.
            else if (requestMethod == "UpdateSettings") {
				updateSettings();
            }
            
            // Invoked by DEBUG content script. Other script can send this message as well. For example:
			// chrome.runtime.sendMessage( {tabid: INFO.tabid, method:"ExecuteJsCodeOrFile", data:[
			//   { code: ` InjectCodeToOriginalSpace("${src}");`} ]
			// } );
			// data is a list of object, which has a code or file attribute that will be forwarded to chrome.tabs.executeScript function.
            else if (requestMethod == "ExecuteJsCodeOrFile") {
				var execs = requestData;
				for (var i = 0; i < execs.length; ++ i) {
					debug_log("Execute JS code or file: ", execs[i]);
					chrome.tabs.executeScript(tabid, execs[i]);
				}
            }
            
            // Invoked by DEBUG content script.
            else if (requestMethod == "InjectPopupPage") {
				var code = compile_template(codesnippit_showPopupInWebpage, requestData);
				//debug_log(code);
				chrome.tabs.executeScript(tabid, {"code": code});
            }
            
            // Invoked by DEBUG content script.
            else if (requestMethod == "ReloadBackroundPage") {
				location.reload();
            }
        }
        
        function addNecessaryScriptsForAllSiteToHead(tabid, url, autoloadFileList, loadProperty) {
        	if (loadProperty.necessaryAdded)
        		return;
        		
        	loadProperty.necessaryAdded = true;
        		
			var setMetaDataCode = codesnippet_getOnBootCode(tabid, url, infoStr);
			// console.log(setMetaDataCode);
			autoloadFileList.unshift(
				{name:"boot/setMetaData", code:setMetaDataCode, type:"js"},/*
				 // confiture seajs_boot.js injection manifest.json
				{name:"boot/seajs_boot", file:"js/seajs_boot.js", type:"js"}, */
				{name:"boot/nodeSelector", file:"js/nodeSelector.js", type:"js"}
			);
			if (localStorage["Main"]) {
				try {
					var mlsd = JSON.parse(localStorage["Main"]);
					if (mlsd.script)
						autoloadFileList.unshift({name:"boot/Main", code:mlsd.script, type:"js"});
				} catch (exception) {
					chrome.tabs.executeScript(tabid, {code: 'console.error("Error occurs during loading Main script");'});
					debug_log(exception);
				}
			}
        }
        
		function loadDefaultScript(tabid, key, autoloadFileList, loadProperty) {		
			// debug_log("Loading default script.");
			try {
				var dlsd = JSON.parse(localStorage["Default"]);
				
				if(dlsd.autostart) {
					loadProperty.defaultAdded = true;					
					addScriptsForAutostartSite(tabid, key, autoloadFileList, loadProperty);
					
					addContentScriptsToLoadList(autoloadFileList, dlsd.sfile);
					var code = "console.info('[Javascript Tricks] Default script is executing');";
					code += dlsd.script;
					autoloadFileList.push( {"name":"Site Script Default", "code":code, "type":"js"} );
					
					chrome.tabs.insertCSS(tabid, {code:dlsd.css, runAt:"document_start"});
				} 
				
				loadSiteScript(tabid, key, autoloadFileList, loadProperty);
			} catch (ex) {			
				chrome.tabs.executeScript(tabid, {code: "console.error('Error occurs during loading Default script:', `" + ex.stack + "`);"});
				debug_log(ex);
				//loadSiteScript(tabid, key);
			}
		}
		
		function loadSiteScript(tabid, key, autoloadFileList, loadProperty) {
			if( localStorage[key] ) {
				var lsd = JSON.parse(localStorage[key]);
				if(lsd.autostart) {
					loadProperty.siteAdded = true;					
					addScriptsForAutostartSite(tabid, key, autoloadFileList, loadProperty);
					
					chrome.browserAction.setIcon({path: "icon24_auto.png"});
					
					if(lsd.sfile != "") {					
						addContentScriptsToLoadList(autoloadFileList, lsd.sfile);
					}
					
					var code = "console.info('[Javascript Tricks] Site script is executing');";
					code += lsd.script;
					autoloadFileList.push( {"name":"Site Script " + key, "code":code, "type":"js"} );
				}
			
				if (lsd.css)
					chrome.tabs.insertCSS(tabid,{code:lsd.css, runAt:"document_start"});
			}
			
			// Load all included files in chain.
			loadIncludeFiles(tabid, null, autoloadFileList, 0);
		}
        
        function addScriptsForAutostartSite(tabid, url, autoloadFileList, loadProperty) {	
        	if (loadProperty.autostartLibAdded)
        		return;
        		
        	loadProperty.autostartLibAdded = true;
        		
			// Inject injected.js file by inserting a <script> tag in document.
			chrome.tabs.executeScript(tabid, {"code": `
				InjectCodeToOriginalSpace("chrome-extension://" + chrome.runtime.id + "/injected.js");
			`});
			
			// Inject content scripts in include section of meta data.
			var autoloadFiles = {}; var fileCount = 0;
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
				
				// debug_log("autoloadFiles:");
				// debug_log(autoloadFileList);
			} catch(exception) {
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
			
			if (index == 0)
				debug_log("------------------");
				
			debug_log("Tab " + tabid + ": Injecting Content script " + file.name + " ...");
			var execDetail = {};
			if (file["code"])
				execDetail["code"] = file.code;
			else if (file["file"])
				execDetail["file"] = file.file;
			
			var callNextInChain = function(result) {
				//debug_log("result of executing content script:");
				//debug_log(result);
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

			// debug_log(execDetail);
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
        
        //chrome.tabs.onCreated.addListener(setTabID);
        //chrome.tabs.onUpdated.addListener(setTabID);
        function setTabID(arg) {
			if (chrome.runtime.lastError) {
				// tabid is not fetched successfully
				console.error("Cannot get tabid on the created/updated tab.");
			} else {
				// in onCreated arg is Tab object, and in onUpdated arg is tabid
				var tabid = arg.id ? arg.id : arg;
				chrome.tabs.executeScript(tabid, {"code":`
					window.tabid = ${tabid};
					if (${DEBUG}) {
						console.info("Chome Tab ID is: "+"${tabid}");
					}
				`}, function() {
					if (chrome.runtime.lastError) {
						console.error("Failed to inject INFO obj to tab due to", chrome.runtime.lastError.message);
					}
				} );
        	}
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
				debug_log('Couldn\'t load manifest.json');
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
				debug_log('Couldn\'t load init_settings.json');
			}
		}
		
		
		updateSettings();	
		
}) (this);