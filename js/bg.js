var DEBUG = getSetting("DEBUG") == "true";
var infoStr = getSetting("temp-infostr");

function log() {
	if (DEBUG) {
		console.log.apply(console, arguments);
	}
}

function debug_log() {
	if (DEBUG) {
		console.log.apply(console, arguments);
		//console.log(new Error("stack trace"));
	}
}

function updateSettings() {
	DEBUG = getSetting("DEBUG") == "true";
	var setting = {};
	iterateSettings(function(name, val) {
		// iteration
		if (name.startsWith("cloud-") || name.startsWith("temp-"))
			return;
			
		setting[name] = val;
	}, function() {
		// on complete
		var INFO = { settings: setting, debug: DEBUG,
			meta_data: getMetadata() };
	
		infoStr = encodeURIComponent(JSON.stringify(INFO));
		setSetting("temp-infostr", infoStr);		
				
		// Save the meta object into chrome.storage.local
		chrome.storage.local.set({"INFO": INFO});


		console.log("Settings are updated, and new INFO is", INFO);
	});
}

		
(function(global) {

	chrome.runtime.onInstalled.addListener(initExtension);





/* Several ways to inject a script into a web page:
1. Insert a <script type="text/javascript" src="path/to/script/file/in/extension/dir.js"></script> node.
2. Insert a <script type="text/javascript" src="data:text/javascript;charset=utf-8,encodeURIComponent(SCRIPT_CONTENT)"></script> node.
3. chrome.tabs.executeScript()
*/
		// Fix a chrome bug which mess up tab id for prerendered page
		// webNavigation.onTabReplaced
		//chrome.tabs.onReplaced.addListener(function(newTabId, oldTabId) {
		chrome.webNavigation.onTabReplaced.addListener(function(oldTabId, newTabId) {
			console.log(`TAB-REPLACEMENT: Tab ${oldTabId} is replaced by tab ${newTabId}`);
			
			processTab(newTabId, "JSTinjectScript");
		});

		
		//chrome.extension.onRequest.addListener(function(request, sender) {
		chrome.runtime.onMessage.addListener(function(request, sender) {
			if (request.tabid) {
				processTab(request.tabid, request.method, request.data);
			} else {
				//chrome.tabs.query({active:true, windowId:chrome.windows.WINDOW_ID_CURRENT}, function(tabs) {
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
		  var domain_ = url ? url.match(/^[\w-]+:\/*\[?([\w\.:-]+)\]?(?::\d+)?/) : "";
		  var domain = domain_ ? domain_[1] : undefined;
		  
			// Load _Main script as the entry-point of requireJS
			if (requestMethod == "EnableDisableExt") {
				var enabled = requestData == "true";
				// call resetDeclarativeRules() in bg_declaration.js
				resetDeclarativeRules();
				debug_log("Set enabled status to " + enabled);
			}
			
			// Inject site-specific scripts on website loaded.
			else if (requestMethod == "JSTinjectScript") {				
				var autoloadFileList = [];
				var loadProperty = {necessaryAdded: false, autostartLibAdded: false, defaultAdded: false, siteAdded: false};
				
				addNecessaryScriptsForAllSiteToHead(tabid, url, autoloadFileList, loadProperty);
				
				loadDefaultScript(tabid, domain, autoloadFileList, loadProperty);
				
				delete autoloadFileList;
				delete loadProperty;
			}
			
			// Load _Main script as the entry-point of requireJS
			else if (requestMethod == "LoadMainScript") {        		
				debug_log("[JScript Tricks] Load _Main script as the entry-point of requireJS");
			}
			
			// Invoked when content menues are clicked.
			else if (requestMethod == "ExecuteContentScript") {
				var csName = requestData.name;
				var initCode = requestData.initCode;
				var extraCode = requestData.extraCode;
				var autoloadFileList = [];
				var loadProperty = {necessaryAdded: false, testURL: true, domain:domain};
				
				addNecessaryScriptsForAllSiteToHead(tabid, url, autoloadFileList, loadProperty);
				addScriptsForAutostartSite(tabid, url, autoloadFileList, loadProperty);
				if (initCode) {
				  autoloadFileList.push({"name":"contextMenuInit", "code":initCode, "type":"js"});
				}
				addAContentScriptToLoadList(autoloadFileList, csName);
				if (extraCode) {
				  autoloadFileList.push({"name":"contextMenuInit", "code":extraCode, "type":"js"});
				}
				
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
				var loadProperty = {necessaryAdded: false, testURL: true, domain:domain};
				addNecessaryScriptsForAllSiteToHead(tabid, url, autoloadFileList, loadProperty);
				addScriptsForAutostartSite(tabid, url, autoloadFileList, loadProperty);
				addContentScriptsToLoadList(autoloadFileList, includes);
				autoloadFileList.push( {"name":name+"-"+guid(), "code":script, "type":"js"} );
				
				loadIncludeFiles(tabid, null, autoloadFileList, 0);
			}
			
		  // Load _Main script as the entry-point of requireJS
			if (requestMethod == "LoadMainScript") {        		
				debug_log("[JScript Tricks] Load _Main script as the entry-point of requireJS");
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
				var code = args.code;
				var callbackID = args.callback ? args.callback : "";
				
				var script = null, text = localStorage["$cs-" + csName];
				if (code) {
					script = code;
				} else {
					try {
						script = JSON.parse(text).script;
					} catch (ex) { return; }
				}
				
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
			
			// Invoked when "Load Default Settings" buttons in options.html is clicked
			else if (requestMethod == "LoadDefaultSettings") {
				loadDefaultSettings(true);
			}
			
			// Invoked by options page and popup page when site scripts are saved.
			else if (requestMethod == "UpdateActiveSites") {
				var site = requestData.site;
				var autostart = requestData.autostart
				updateActiveSites(site, autostart);
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
				
			// Test if this site is is a target for an active site script.
			// Only "ExecuteContentScript" and "ExecuteSiteScript" message will set this flag
			// The "JSTinjectScript" message sent by autoload.js does not set this flag.
			if (loadProperty.testURL) {
			  var activeSitesPattern = getSetting("temp-activesites-pattern");
			  var isSiteActive = loadProperty.domain.match(activeSitesPattern);
			  if (isSiteActive)
			    return;
			}
				
			loadProperty.necessaryAdded = true;
			
      // Inject a function to add <script> tag in document.
      // This code is moved to injected/dom.js as static injection
      // chrome.tabs.executeScript(tabid, {"code": codesnippet_addScriptNodeToDOM});
				
			var setMetaDataCode = codesnippet_getOnBootCode(tabid, url, infoStr);
			// console.log(setMetaDataCode);
			autoloadFileList.unshift(
				{name:"boot/setMetaData", code:setMetaDataCode, type:"js"},/*
				 // confiture seajs_boot.js injection manifest.json
				{name:"boot/seajs_boot", file:"injected/seajs_boot.js", type:"js"}, */
				{name:"boot/nodeSelector", file:"injected/nodeSelector.js", type:"js"}
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
					
					if(lsd.sfile != "") {					
						addContentScriptsToLoadList(autoloadFileList, lsd.sfile);
					}
					
					var code = "console.info('[Javascript Tricks] Site script is executing');";
					code += lsd.script;
					autoloadFileList.push( {"name":"Site Script " + key, "code":code, "type":"js"} );
				}
			
				if (lsd.css) {
					//chrome.tabs.insertCSS(tabid,{code:lsd.css, runAt:"document_idle"});	
					// This way, the css can override the styles built in the injected webpage				
					chrome.tabs.executeScript(tabid, {"code": `
						AppendStyleNodeToDom_____(decodeURIComponent("${encodeURIComponent(lsd.css)}"));
					`});
				}
			}
			
			// Load all included files in chain.
			loadIncludeFiles(tabid, null, autoloadFileList, 0);
		}
		
		function addScriptsForAutostartSite(tabid, url, autoloadFileList, loadProperty) {	
			if (loadProperty.autostartLibAdded)
				return;
				
			loadProperty.autostartLibAdded = true;
				
			// Inject injected/injected.js file by inserting a <script> tag in document.
			chrome.tabs.executeScript(tabid, {"code": `
				InjectCodeToOriginalSpace("chrome-extension://" + chrome.runtime.id + "/injected/injected.js");
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
				if (chrome.runtime.lastError) {
				  console.error("Error occurs when executing", execDetail);
				}
				
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
				  var execDetail = {name:csName, type:"js"};
				  
				  // If the script is a user-defined content script
				  //if (csName.startsWith("#")) {
				    var fileName = "$cs-" + csName.replace(/^#/, "");
            var text = localStorage[fileName];
            var data = JSON.parse(text);
            execDetail.code = data["script"];
          
            // If the content script itself has dependencies, add them to the load list.
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
// 				  }
				  
				  // Else the script is considered as a lib content script in injected/ folder.
// 				  else {
// 				    if (!csName.endsWith(".js"))
// 				      csName += ".js";
//             execDetail.file = "injected/" + csName;
// 				  }
					
					if (!isContentScriptInLoadList(loadList, csName)) {
						loadList.push( execDetail );
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
		
		function updateActiveSites(site, autostart) {
			var activeSites; 
			var defaultActive = {}; defaultActive.value = getSetting("temp-activesites-defaultenabled", true);
			
			// Initialize the active sites
			if (arguments.length < 1) {
				debug_log("Initialize the active sites list.");
				activeSites = [], defaultActive.value = false;
				getAllScripts(["ss", "dss"], function(allscripts) {
					// On complete
					updateStatus(activeSites, defaultActive.value);
				}, function(id, type, obj) {
					// On iterate
					if (type == "dss" && id == "Default" && obj.autostart)
						defaultActive.value = true;
					else if (type == "ss" && obj.autostart)
						activeSites.push(obj.id);
				});
			} 
			
			// Update the active sites according to site status given by the arguments
			else {
				debug_log("Update the active sites list. site=", site, "autostart=", autostart);
				activeSites = getSetting("temp-activesites", true);
				
				if (site == "Default") {
					defaultActive.value = autostart;
				} else {
					if (autostart && !(site in activeSites))
						activeSites.push(site);
					else if (!autostart)
						activeSites = activeSites.filter(function(ele) { return ele != site; } );
				}
				
				updateStatus(activeSites, defaultActive.value);
			}
			
			function updateStatus(activeSites, defaultActive) {
				debug_log("All active sites:", activeSites, "default is", defaultActive ? "active" : "inactive");
				
				var activeSitesPattern;
				
				// Default script is autostarted, so the pattern should match any site url.
				if (defaultActive) {
					activeSitesPattern = ".*";
				} 
				
				else {
					activeSitesPattern = activeSites.map(function(site0) {
						 var sitepattern = "(" + ('://' + site0 + "/").getTextRegexpPattern() + ".*" + ")";
						 return sitepattern;
					}).join("|");
					activeSitesPattern = "(" + activeSitesPattern + ")";
				}
			
				// Save status
				setSetting("temp-activesites", activeSites, true);
				setSetting("temp-activesites-defaultenabled", defaultActive, true);
				setSetting("temp-activesites-pattern", activeSitesPattern);
				debug_log("activeSitesPattern=", activeSitesPattern);
			
				// call resetDeclarativeRules() in bg_declaration.js
				resetDeclarativeRules();
			}
		}
		
		/*
		chrome.tabs.onActiveChanged.addListener(function(tabId) {
			chrome.tabs.get(tabId, function(tab){				
				changeIcon(tab)
			})

		});*/
		
		//chrome.tabs.onCreated.addListener(setTabID);
		//chrome.tabs.onUpdated.addListener(setTabID);
// 				function setTabID(arg) {
// 					if (chrome.runtime.lastError) {
// 						// tabid is not fetched successfully
// 						console.error("Cannot get tabid on the created/updated tab.");
// 					} else {
// 						// in onCreated arg is Tab object, and in onUpdated arg is tabid
// 						var tabid = arg.id ? arg.id : arg;
// 						chrome.tabs.executeScript(tabid, {"code":`
// 							window.tabid = ${tabid};
// 							if (${DEBUG}) {
// 								console.info("Chome Tab ID is: "+"${tabid}");
// 							}
// 						`}, function() {
// 							if (chrome.runtime.lastError) {
// 								console.error("Failed to inject INFO obj to tab due to", chrome.runtime.lastError.message);
// 							}
// 						} );
// 					}
// 				}
// 
//         function  changeIcon(tab) {
// 					if (localStorage["$setting.enabled"] == "true") {
// 						var matches= tab.url.match(/^[\w-]+:\/*\[?([\w\.:-]+)\]?(?::\d+)?/);
// 
// 						if( matches[1] && localStorage[matches[1]] ) {
// 							var lsd = JSON.parse(localStorage[matches[1]]);
// 							if(lsd.autostart) {
// 								chrome.browserAction.setIcon({path:"icon/icon24_auto.png"});    
// 								return;
// 							}
// 						}
// 						chrome.browserAction.setIcon({path:"icon/icon24.png"});    
// 					} else {
// 						chrome.browserAction.setIcon({path:"icon/icon24_disabled.png"});    
// 					}
//         }
	
	
	function initExtension() {
		chrome.manifest = (function() {
			var manifestObject = false;
			var xhr = new XMLHttpRequest();

			xhr.onreadystatechange = function() {
				if (xhr.readyState == 4) {
					manifestObject = JSON.parse(xhr.responseText);
				}
			};
			xhr.open("GET", chrome.runtime.getURL('/manifest.json'), false);

			try {
				xhr.send();
			} catch(e) {
				debug_log('Couldn\'t load manifest.json');
			}

			return manifestObject;

		})();
		
		setSetting("enabled", "true");
		localStorage["info"] = chrome.manifest.version;
		
		if( localStorage["info"] == undefined) {		
			loadDefaultSettings();
			alert("JS TRICKS IMPORTANT CHANGE: script and css are now injected before DOM creation. Use $(function(){ ... }) to start script on DOMReady.");
		}
		
		if (localStorage["info"] && localStorage["info"] != chrome.manifest.version) {
			if (!confirm("New version installed! Do you want to override current configuration with the one in the new version?"))
				return;
				
			loadDefaultSettings();
		}
		
		updateActiveSites();
		updateSettings();	
	}

	function loadDefaultSettings(alertAfterComplete) {
		var manifestObject = false;
		var xhr = new XMLHttpRequest();

		xhr.onreadystatechange = function() {
			if (xhr.readyState == 4) {
				var initSettings = JSON.parse(xhr.responseText);
				for (key in initSettings) {
					localStorage[key] = initSettings[key];
				}
			
				if (alertAfterComplete)
					alert("Default settings are loaded.");
			}
		};
		if (chrome.runtime) {
			xhr.open("GET", chrome.runtime.getURL('/init_settings.json'), false);
		}
		try {
			xhr.send();
		} catch(e) {
			debug_log('Couldn\'t load init_settings.json');
		}
	}
		
}) (this);