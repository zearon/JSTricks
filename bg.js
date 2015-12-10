function guid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
        return v.toString(16);
    });
}


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
        	if( !localStorage[key] ) 
        		return;
					
			//chrome.browserAction.setIcon({path:"icon24_auto.png"});
			
        	// Load _Main script as the entry-point of requireJS
        	if (requestMethod == "LoadMainScript") {        		
            	console.log("[JScript Tricks] Load _Main script as the entry-point of requireJS");
        	}
        	
        	// Inject site-specific scripts on website loaded.
            else if (requestMethod == "JSTinjectScript")
            {
            	if (localStorage["$setting.enabled"] === undefined)
            		localStorage["$setting.enabled"] = "true";
            		
            	if (localStorage["$setting.enabled"] != "true") {
            		chrome.browserAction.setIcon({path: "icon24_disabled.png"});
            		return;
            	} else {
            		chrome.browserAction.setIcon({path: "icon24.png"});
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
				var autoloadFileList = [];
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
					autoloadFileList.unshift(
						{name:"boot/jquery", file:"js/jquery.sea.js", type:"js"},
						{name:"boot/jquery-ui", file:"js/jquery-ui.js", type:"js"},  /*
						{name:"boot/jquery-init", code:"jQuery.noConflict();", type:"js"}, */
						{name:"boot/msgbox", file:"usrlib/msgbox.js", type:"js"}, 
						{name:"boot/nodeSelector", file:"usrlib/nodeSelector.js", type:"js"}
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
					
					
					// console.log("autoloadFiles:");
					// console.log(autoloadFileList);
				} catch(exception) {
				}
				
				loadDefaultScript(tabid, key, autoloadFileList);
            }
            
            // Invoked when sea.js request a module saved in local storage with a URI such as localstorage://Novel.
            else if (requestMethod == "InjectModule") {
            	var data = JSON.parse(requestData);
            	var csName = data.name;
            	var callbackID = data.callback;
            	
				var autoloadFileList = [];
				addAContentScriptToLoadList(autoloadFileList, csName);
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
        }
        
		function loadDefaultScript(tabid, key, autoloadFileList) {
			// console.log("Loading default script.");
				
			try {
				var dlsd = JSON.parse(localStorage["Default"]);
				
				if(dlsd.autostart) {
					addContentScriptsToLoadList(autoloadFileList, dlsd.sfile);
					autoloadFileList.push( {"name":"Site Script Default", "code":dlsd.script, "type":"js"} );
					
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
        	chrome.tabs.executeScript(tabid, {"code":`window.tabid = ${tabid}; console.log("Chome Tab ID is: "+"${tabid}");`} );
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
			localStorage['$cs-OpenLinks'] = decodeURIComponent("%7B%22index%22%3A%220%22%2C%22group%22%3A%22%22%2C%22title%22%3A%22Open%20Selected%20Links%22%2C%22sfile%22%3A%22%22%2C%22script%22%3A%22%2F%2Fconsole.log(contextInfo)%3B%5Cn%2F%2Fwindow.open(contextInfo.linkUrl)%3B%5Cn%2F%2Fconsole.log(document.getSelection())%3B%5Cn%5Cn(function()%20%7B%5Cn%5Ctvar%20h%3B%5Cn%5Cth%20%3D%20%5B%2F%5Emailto%5C%5C%3A%2Fi%2C%20%2F%5Ejavascript%2Fi%5D%3B%5Cn%5Ctvar%20j%20%3D%20window%2C%5Cn%5Ctf%20%3D%20function(b%2C%20a)%20%7B%5Cn%5Ct%5Ctthis.html%20%3D%20b%3B%5Cn%5Ct%5Ctthis.selection%20%3D%20a%3B%5Cn%5Ct%5Ctthis.links%20%3D%20%7B%7D%5Cn%5Ct%7D%3B%5Cn%5Ctf.fromSelection%20%3D%20function(b)%20%7B%5Cn%5Ct%5Ctvar%20a%2C%5Cn%5Ct%5Ctc%2C%5Cn%5Ct%5Cte%2C%5Cn%5Ct%5Ctd%2C%5Cn%5Ct%5Ctg%3B%5Cn%5Ct%5Cta%20%3D%20function(a%2C%20b%2C%20c)%20%7B%5Cn%5Ct%5Ct%5Ctreturn%20a.appendChild(b.getRangeAt(c).cloneContents())%5Cn%5Ct%5Ct%7D%3B%5Cn%5Ct%5Ctc%20%3D%20document.createElement(%5C%22div%5C%22)%3B%5Cn%5Ct%5Cte%20%3D%20d%20%3D%200%3B%5Cn%5Ct%5Ctfor%20(g%20%3D%20b.rangeCount%3B%200%20%3C%3D%20g%20%3F%20d%20%3C%20g%3A%20d%20%3E%20g%3B%20e%20%3D%200%20%3C%3D%20g%20%3F%20%2B%2Bd%3A%20--d)%20a(c%2C%20b%2C%20e)%3B%5Cn%5Ct%5Ctreturn%20new%20f(c%2C%20b.toString())%5Cn%5Ct%7D%3B%5Cn%5Ctf.fromHTMLString%20%3D%20function(b)%20%7B%5Cn%5Ct%5Ctvar%20a%3B%5Cn%5Ct%5Cta%20%3D%20document.createElement(%5C%22div%5C%22)%3B%5Cn%5Ct%5Cta.innerHTML%20%3D%20b%3B%5Cn%5Ct%5Ctreturn%20new%20f(a%2C%20a.innerText)%5Cn%5Ct%7D%3B%5Cn%5Ctf.prototype.allLinks%20%3D%20function()%20%7B%5Cn%5Ct%5Ctthis.gatherHTMLLinks()%3B%5Cn%5Ct%5Ctthis.gatherPlainLinks()%3B%5Cn%5Ct%5Ctreturn%20this.createLinkList()%5Cn%5Ct%7D%3B%5Cn%5Ctf.prototype.gatherHTMLLinks%20%3D%20function()%20%7B%5Cn%5Ct%5Ctvar%20b%2C%5Cn%5Ct%5Cta%2C%5Cn%5Ct%5Ctc%2C%5Cn%5Ct%5Cte%2C%5Cn%5Ct%5Ctd%3B%5Cn%5Ct%5Ctb%20%3D%20this.html.getElementsByTagName(%5C%22a%5C%22)%3B%5Cn%5Ct%5Ctd%20%3D%20%5B%5D%3B%5Cn%5Ct%5Ctc%20%3D%200%3B%5Cn%5Ct%5Ctfor%20(e%20%3D%20b.length%3B%20c%20%3C%20e%3B%20c%2B%2B)%20a%20%3D%20b%5Bc%5D%2C%5Cn%5Ct%5Cta.href%20%26%26%20!this.onBlackList(a.href)%20%26%26%20d.push(this.links%5Ba.href%5D%20%3D%20!0)%3B%5Cn%5Ct%5Ctreturn%20d%5Cn%5Ct%7D%3B%5Cn%5Ctf.prototype.onBlackList%20%3D%20function(b)%20%7B%5Cn%5Ct%5Ctvar%20a%2C%5Cn%5Ct%5Ctc%2C%5Cn%5Ct%5Cte%3B%5Cn%5Ct%5Ctc%20%3D%200%3B%5Cn%5Ct%5Ctfor%20(e%20%3D%20h.length%3B%20c%20%3C%20e%3B%20c%2B%2B)%20if%20(a%20%3D%20h%5Bc%5D%2C%20b.match(a))%20return%20!%200%3B%5Cn%5Ct%5Ctreturn%20!%201%5Cn%5Ct%7D%3B%5Cn%5Ctf.prototype.gatherPlainLinks%20%3D%20function()%20%7B%5Cn%5Ct%5Ctvar%20b%2C%5Cn%5Ct%5Cta%2C%5Cn%5Ct%5Ctc%2C%5Cn%5Ct%5Cte%2C%5Cn%5Ct%5Ctd%3B%5Cn%5Ct%5Ctif%20(a%20%3D%20this.selection.match(%2F(%5C%5Cb(https%3F%7Cftp%7Cfile)%3A%5C%5C%2F%5C%5C%2F%5B-A-Z0-9%2B%26%40%23%5C%5C%2F%25%3F%3D~_%7C!%3A%2C.%3B%5D*%5B-A-Z0-9%2B%26%40%23%5C%5C%2F%25%3D~_%7C%5D)%2Fig))%20%7B%5Cn%5Ct%5Ct%5Ctd%20%3D%20%5Cn%5Ct%5Ct%5Ct%5B%5D%3B%5Cn%5Ct%5Ct%5Ctc%20%3D%200%3B%5Cn%5Ct%5Ct%5Ctfor%20(e%20%3D%20a.length%3B%20c%20%3C%20e%3B%20c%2B%2B)%20b%20%3D%20a%5Bc%5D%2C%5Cn%5Ct%5Ct%5Ctd.push(this.links%5Bb%5D%20%3D%20!0)%3B%5Cn%5Ct%5Ct%5Ctreturn%20d%5Cn%5Ct%5Ct%7D%5Cn%5Ct%7D%3B%5Cn%5Ctf.prototype.createLinkList%20%3D%20function()%20%7B%5Cn%5Ct%5Ctvar%20b%2C%5Cn%5Ct%5Cta%3B%5Cn%5Ct%5Cta%20%3D%20%5B%5D%3B%5Cn%5Ct%5Ctfor%20(b%20in%20this.links)%20a.push(b)%3B%5Cn%5Ct%5Ctreturn%20a%5Cn%5Ct%7D%3B%5Cn%5Ctj.LinkGrabber%20%3D%20f%3B%5Cn%20%20%5Cn%20%20%5Cn%20%20%20%20var%20allLinks%20%3D%20LinkGrabber.fromSelection(window.getSelection()).allLinks()%3B%5Cn%20%20%20%20if(confirm(%5C%22Open%20%5C%22%20%2B%20allLinks.length%20%2B%20%5C%22%20in%20new%20tabs%3F%5C%22))%20%7B%5Cn%20%20%20%20%20%20for%20(var%20i%20%3D%200%3B%20i%20%3C%20allLinks.length%3B%20%2B%2Bi)%20%7B%5Cn%20%20%20%20%20%20%20%20window.open(allLinks%5Bi%5D)%3B%5Cn%20%20%20%20%20%20%7D%5Cn%20%20%20%20%7D%20%5Cn%7D).call(this)%3B%5Cn%5Cn%22%7D") ;
			localStorage['$cs-QRCodeEncode'] = decodeURIComponent("%7B%22index%22%3A%221%22%2C%22group%22%3A%22%22%2C%22title%22%3A%22Encode%20QRCode%22%2C%22script%22%3A%22(function()%20%7B%5Cn%5Ctfunction%20getSelected()%20%7B%5Cn%5Ct%5Ctif%20(window.getSelection)%20%7B%5Cn%5Ct%5Ct%5Ctreturn%20window.getSelection()%3B%5Cn%5Ct%5Ct%7D%20else%20if%20(document.getSelection)%20%7B%5Cn%5Ct%5Ct%5Ctreturn%20document.getSelection()%3B%5Cn%5Ct%5Ct%7D%20else%20if%20(document.selection)%20%7B%5Cn%5Ct%5Ct%5Ctreturn%20document.selection.createRange().text%3B%5Cn%5Ct%5Ct%7D%5Cn%5Ct%5Ctreturn%20false%3B%5Cn%5Ct%7D%5Cn%5Ctvar%20selection%20%3D%20getSelected()%3B%5Cn%5Ctif%20(!selection%20%7C%7C%20selection%20%3D%3D%20'')%20selection%20%3D%20window.location.href%3B%5Cn%5Ctelse%20selection%20%3D%20encodeURIComponent(selection)%3B%5Cn%5Ctwindow.open('http%3A%2F%2Fqr.liantu.com%2Fapi.php%3Ftext%3D'%20%2B%20selection)%3B%5Cn%7D)()%3B%22%7D") ;
			localStorage['$cs-QRCodeDecode'] = decodeURIComponent("%7B%22index%22%3A%222%22%2C%22group%22%3A%22%22%2C%22title%22%3A%22Decode%20QRCode%22%2C%22sfile%22%3A%22%22%2C%22script%22%3A%22(function()%20%7B%5Cn%20%20console.log(contextInfo)%3B%5Cn%20%20if%20(%2Fhttp%3A%5C%5C%2F%5C%5C%2F%2F.test(location.href))%20%7B%5Cn%20%20%20%20if%20(contextInfo.mediaType%20%3D%3D%20%5C%22image%5C%22)%20%7B%5Cn%20%20%20%20%20%20alert(%5C%22Decoding%20QR%20code%20image%20%5C%5Cn%5C%22%20%2B%20contextInfo.srcUrl)%3B%5Cn%20%20%20%20%5Cn%20%20%20%20%20%20%24.post(%5Cn%20%20%20%20%20%20%20%20%5C%22http%3A%2F%2Fcli.im%2FApi%2FBrowser%2Fdeqr%5C%22%2C%20%5Cn%20%20%20%20%20%20%20%20%7B%5C%22data%5C%22%3AcontextInfo.srcUrl%7D%2C%20%5Cn%20%20%20%20%20%20%20%20function%20(response)%20%7B%5Cn%20%20%20%20%20%20%20%20%20%20console.log(response)%3B%5Cn%20%20%20%20%20%20%20%20%20%20if%20(response.status%20%3D%3D%201)%5Cn%20%20%20%20%20%20%20%20%20%20%20%20alert(response.data.ScanResult)%3B%5Cn%20%20%20%20%20%20%20%20%20%20else%5Cn%20%20%20%20%20%20%20%20%20%20%20%20alert(response.data)%3B%5Cn%20%20%20%20%20%20%7D)%3B%5Cn%20%20%20%20%7D%20else%20%7B%5Cn%20%20%20%20%20%20alert(%5C%22No%20image%20selected.%20%5C%5CnPlease%20right%20click%20on%20a%20QRCode%20image.%5C%22)%3B%5Cn%20%20%20%20%7D%5Cn%20%20%7D%20else%20if%20(%2Fhttps%3A%5C%5C%2F%5C%5C%2F%2F.test(location.href))%20%7B%5Cn%20%20%20%20var%20win%3Dwindow.open('http%3A%2F%2Fcli.im%2Fdeqr%2F'%2C%20'qrcode-window')%3B%5Cn%20%20%20%20%5Cn%20%20%20%20win.document.onload%20%3D%20function()%20%7B%5Cn%20%20%20%20%20%20alert(%5C%22LOAD%5C%22)%3B%5Cn%20%20%20%20%7D%5Cn%20%20%20%20%5Cn%20%20%7D%20else%20%7B%5Cn%20%20%20%20alert(%5C%22Can%20only%20decode%20images%20in%20http%3A%2F%2F%20or%20https%3A%2F%2F%20schema.%5C%22)%3B%5Cn%20%20%7D%5Cn%7D()%3B%22%7D") ;
			
			if(!localStorage['meta']) {
			localStorage['meta'] = decodeURIComponent("%7B%0A%20%20%22include%22%3A%5B%22Messenger%22%5D%2C%0A%20%20%0A%20%20%22sections%22%3A%5B%0A%20%20%20%20%7B%22objName%22%3A%20%22novel%22%2C%20%22title%22%3A%20%22Novel%22%2C%20%22commands%22%3A%5B%0A%20%20%20%20%20%20%7B%22title%22%3A%20%22Default%22%2C%20%0A%20%20%20%20%20%20%20%22code%22%3A%20%22novel.prefetch('a%3Acontains(%5C%5C'%E4%B8%8B%E4%B8%80%5C%5C')%3Aeq(0)')%3B%5Cn%20novel.prefetch('a%3Acontains(%5C%5C'%E7%9B%AE%E5%BD%95%5C%5C')%3Aeq(0)')%3B%5Cn%20novel.adjustHeightForEyesProtectExt()%3B%5Cn%22%0A%20%20%20%20%20%20%7D%2C%0A%20%20%20%20%20%20%7B%22title%22%3A%20%22Replace%20Double%20%3Cbr%3E%22%2C%20%0A%20%20%20%20%20%20%20%22code%22%3A%20%22%20%20novel.replaceText('%23contents'%2C%20%2F%3Cbr%3E%5C%5Cs*%3Cbr%3E%2Fg%2C%20'%3Cbr%3E')%3B%5Cn%22%0A%20%20%20%20%20%20%7D%2C%0A%20%20%20%20%20%20%7B%22funcname%22%3A%20%22adjustHeightForEyesProtectExt%22%2C%20%22title%22%3A%20%22Adjust%20height%22%2C%20%22args%22%3A%20%5B%0A%20%20%20%20%20%20%5D%7D%2C%0A%20%20%20%20%20%20%7B%22funcname%22%3A%20%22enableRightClick%22%2C%20%22title%22%3A%20%22Enable%20Rightclick%22%2C%20%22args%22%3A%20%5B%0A%20%20%20%20%20%20%5D%7D%2C%0A%20%20%20%20%20%20%7B%22funcname%22%3A%20%22urlMatches%22%2C%20%22title%22%3A%20%22URL%20Matches%22%2C%20%22statement%22%3A%22if%22%2C%20%22args%22%3A%20%5B%0A%20%20%20%20%20%20%20%20%7B%22name%22%3A%20%22Pattern%22%2C%20%22len%22%3A52%2C%20%22type%22%3A%22url%22%7D%2C%0A%20%20%20%20%20%20%20%20%7B%22name%22%3A%20%22type%22%2C%20%22type%22%3A%22select%22%2C%20%22options%22%3A%5B%22Wildcard%22%2C%20%22Regexp%22%2C%20%22Raw%20Regexp%22%5D%7D%0A%20%20%20%20%20%20%5D%7D%2C%0A%20%20%20%20%20%20%7B%22funcname%22%3A%20%22replaceText%22%2C%20%22title%22%3A%20%22Replace%20Text%22%2C%20%22args%22%3A%20%5B%0A%20%20%20%20%20%20%20%20%7B%22name%22%3A%20%22Target%22%2C%20%22len%22%3A18%2C%20%22defaultValue%22%3A%22%23contents%22%2C%20%22type%22%3A%22domnode%22%7D%2C%0A%20%20%20%20%20%20%20%20%7B%22name%22%3A%20%22Regex%22%2C%20%22len%22%3A10%2C%20%22defaultValue%22%3A%22%2Fregex%2Fg%22%2C%20%22type%22%3A%22raw%22%7D%2C%0A%20%20%20%20%20%20%20%20%7B%22name%22%3A%20%22Replacement%22%2C%20%22len%22%3A8%2C%20%22defaultValue%22%3A%22%22%7D%2C%0A%20%20%20%20%20%20%20%20%7B%22name%22%3A%20%22Method%22%2C%20%22len%22%3A1%2C%20%22defaultValue%22%3A%221%22%2C%20%22type%22%3A%22raw%22%7D%0A%20%20%20%20%20%20%5D%7D%2C%0A%20%20%20%20%20%20%7B%22funcname%22%3A%20%22addThousands%22%2C%20%22title%22%3A%20%22Add%20Thousand%20seperators%22%2C%20%22args%22%3A%20%5B%0A%20%20%20%20%20%20%20%20%7B%22name%22%3A%20%22Target%22%2C%20%22len%22%3A40%2C%20%22defaultValue%22%3A%22td%22%2C%20%22type%22%3A%22domnode%22%7D%0A%20%20%20%20%20%20%5D%7D%2C%0A%20%20%20%20%20%20%7B%22funcname%22%3A%20%22unbindEvent%22%2C%20%22title%22%3A%20%22Unbind%20Event%22%2C%20%22args%22%3A%20%5B%0A%20%20%20%20%20%20%20%20%7B%22name%22%3A%20%22Target%22%2C%20%22len%22%3A40%2C%20%22defaultValue%22%3A%22%23contents%22%2C%20%22type%22%3A%22domnode%22%7D%2C%0A%20%20%20%20%20%20%20%20%7B%22name%22%3A%20%22Event%22%2C%20%22len%22%3A10%2C%20%22defaultValue%22%3A%22click%22%7D%0A%20%20%20%20%20%20%5D%7D%2C%0A%20%20%20%20%20%20%7B%22funcname%22%3A%20%22markTableColumn%22%2C%20%22title%22%3A%20%22Mark%20table%20columns%22%2C%20%22args%22%3A%20%5B%0A%20%20%20%20%20%20%20%20%7B%22name%22%3A%20%22Table%22%2C%20%22len%22%3A30%2C%20%22defaultValue%22%3A%22table%22%2C%20%22type%22%3A%22domnode%22%7D%2C%0A%20%20%20%20%20%20%20%20%7B%22name%22%3A%20%22columns%20from%20index%22%2C%20%22len%22%3A4%2C%20%22defaultValue%22%3A%220%22%2C%20%22type%22%3A%22raw%22%7D%2C%0A%20%20%20%20%20%20%20%20%7B%22name%22%3A%20%22to%22%2C%20%22len%22%3A4%2C%20%22defaultValue%22%3A%220%22%2C%20%22raw%22%3Atrue%7D%2C%0A%20%20%20%20%20%20%20%20%7B%22name%22%3A%20%22class%20name%22%2C%20%22len%22%3A16%2C%20%22defaultValue%22%3A%22%22%7D%0A%20%20%20%20%20%20%5D%7D%0A%20%20%20%20%5D%7D%2C%0A%20%20%20%20%0A%20%20%20%20%0A%20%20%20%20%7B%22objName%22%3A%20%22novel2%22%2C%20%22title%22%3A%20%22Novel2%22%2C%20%22commands%22%3A%5B%5D%7D%0A%20%20%5D%0A%20%7D") ;
			localStorage['Default'] = decodeURIComponent("%7B%22script%22%3A%22jQuery.noConflict()%3B%22%2C%22autostart%22%3Atrue%2C%22sfile%22%3A%22Novel%22%2C%22css%22%3A%22%22%7D") ;
			localStorage['$cs-LibBase'] = decodeURIComponent("%7B%22index%22%3A%223%22%2C%22group%22%3A%22lib%22%2C%22title%22%3A%22LibBase%22%2C%22script%22%3A%22%2F%2F%20This%20is%20the%20base%20class%20for%20all%20classes%20in%20lib%20group%20such%20as%20Novel.%5Cn%2F%2F%20Thus%2C%20this%20script%20%5C%22LibBase%5C%22%20should%20be%20contained%20in%20%5C%22include%5C%22%20array%20in%20meta%20data.%5Cnfunction%20LibBase()%20%7B%5Cn%7D%5Cn%5CnLibBase.prototype.getConfig%20%3D%20function(name)%20%7B%5Cn%20%20var%20storageName%20%3D%20%5C%22%24setting.libconfig-%5C%22%20%2B%20name%3B%5Cn%20%20if%20(!localStorage%5BstorageName%5D)%20%7B%5Cn%20%20%20%20localStorage%5BstorageName%5D%20%3D%20%7B%7D%3B%5Cn%20%20%7D%5Cn%20%20%5Cn%20%20return%20localStorage%5BstorageName%5D%3B%5Cn%7D%22%7D") ;
			localStorage['$cs-Novel'] = decodeURIComponent("%7B%22index%22%3A%224%22%2C%22group%22%3A%22lib%22%2C%22title%22%3A%22Novel%22%2C%22sfile%22%3A%22LibBase%22%2C%22script%22%3A%22function%20Novel()%20%7B%5Cn%20%20this.config%20%3D%20this.getConfig(%5C%22Novel%5C%22)%3B%5Cn%7D%5CnNovel.prototype%20%3D%20new%20LibBase()%3B%5Cn%5Cn(function(%24)%20%7B%5Cn%20%20%5Cn%20%20%2F%2F%20Prototypes%20for%20Novel%5Cn%20%20Novel.prototype.prefetch%20%3D%20function%20(target)%20%7B%5Cn%20%20%20%20%2F%2Fnext%20%3D%20%24('a%3Acontains(%5C%22%E4%B8%8B%E4%B8%80%5C%22)%3Aeq(0)')%5B0%5D%3B%5Cn%20%20%20%20next%20%3D%20%24(target)%5B0%5D%3B%5Cn%20%20%20%20if%20(next)%20%7B%5Cn%20%20%20%20%20%20link%20%3D%20next.href%3B%5Cn%20%20%20%20%20%20href%20%3D%20%24(next).attr('href')%3B%5Cn%20%20%20%20%20%20prefetch1%20%3D%20'%3Clink%20rel%3D%5C%22prefetch%5C%22%20href%3D%5C%22'%20%2B%20link%20%2B%20'%5C%22%20%2F%3E'%3B%20%2F%2F%20For%20Firefox%20browser%5Cn%20%20%20%20%20%20prefetch2%20%3D%20'%3Clink%20rel%3D%5C%22prerender%5C%22%20href%3D%5C%22'%20%2B%20link%20%2B%20'%5C%22%20%2F%3E'%3B%20%2F%2F%20For%20Google%20Chrome%20browser%5Cn%20%20%20%20%20%20%24('body').append(prefetch1)%3B%5Cn%20%20%20%20%20%20%24('body').append(prefetch2)%3B%5Cn%20%20%20%20%20%20%24(%5C%22a%5Bhref%3D'%5C%22%2Bhref%2B%5C%22'%5D%5C%22).css(%7B'background-color'%3A%20'yellow'%2C%20'color'%3A%20'blue'%2C%20'font-weight'%3A%20'bold'%7D)%3B%5Cn%20%20%20%20%20%20log(%5C%22%5BNovel%5D%20Prefetch%20nodes%20for%20%5C%22%20%2B%20target%20%2B%20%5C%22%20have%20been%20inserted.%5C%22)%3B%5Cn%20%20%20%20%7D%20else%20%7B%5Cn%20%20%20%20%20%20log(%5C%22%5BNovel%5D%20Target%20'%5C%22%20%2B%20target%20%2B%20%5C%22'%20does%20not%20matche%20any%20node.%5C%22)%3B%5Cn%20%20%20%20%7D%5Cn%20%20%7D%3B%5Cn%20%20%5Cn%20%20Novel.prototype.defaultPrefetch%20%3D%20function(target1%2C%20target2)%20%7B%5Cn%20%20%20%20this.prefetch(target1)%3B%5Cn%20%20%20%20this.prefetch(target2)%3B%5Cn%20%20%7D%3B%5Cn%20%20%5Cn%20%20Novel.prototype.urlMatches%20%3D%20function(url%2C%20type)%20%7B%5Cn%20%20%20%20var%20urlPatternStr%20%3D%20url%3B%5Cn%20%20%20%20if%20(type%20%3D%3D%20%5C%22Wildcard%5C%22)%20%7B%5Cn%20%20%20%20%20%20urlPatternStr%20%3D%20urlPatternStr.replace(%2F%5C%5C.%2Fg%2C%20%5C%22%5C%5C%5C%5C.%5C%22).replace(%2F%5C%5C%3F%2Fg%2C%20%5C%22%5C%5C%5C%5C%3F%5C%22).replace(%2F%5C%5C%2B%2Fg%2C%20%5C%22%5C%5C%5C%5C%2B%5C%22).replace(%2F%5C%5C%3D%2Fg%2C%20%5C%22%5C%5C%5C%5C%3D%5C%22).replace(%2F%5C%5C%26%2Fg%2C%20%5C%22%5C%5C%5C%5C%26%5C%22).replace(%2F%5C%5C*%2Fg%2C%20%5C%22.*%5C%22)%3B%5Cn%20%20%20%20%7D%20else%20if%20(type%20%3D%3D%20%5C%22Regexp%5C%22)%20%7B%5Cn%20%20%20%20%20%20urlPatternStr%20%3D%20urlPatternStr.replace(%2F%5C%5C.%2Fg%2C%20%5C%22%5C%5C%5C%5C.%5C%22).replace(%2F%5C%5C%3D%2Fg%2C%20%5C%22%5C%5C%5C%5C%3D%5C%22).replace(%2F%5C%5C%26%2Fg%2C%20%5C%22%5C%5C%5C%5C%26%5C%22)%3B%5Cn%20%20%20%20%7D%20else%20if%20(type%20%3D%3D%20%5C%22Raw%20Regexp%5C%22)%20%7B%5Cn%20%20%20%20%7D%20%20%20%20%5Cn%20%20%20%20var%20urlPattern%20%3D%20new%20RegExp(urlPatternStr)%3B%5Cn%20%20%20%20var%20result%20%3D%20urlPattern.test(location.href)%3B%5Cn%20%20%20%20var%20status%20%3D%20result%20%3F%20%5C%22%3Cfont%20color%3D'red'%3EPASSED%3C%2Ffont%3E%5C%22%20%3A%20%5C%22FAILED%5C%22%3B%5Cn%20%20%20%20log(%60%5BNovel%5D%20%24%7Btype%7D%20test%20%24%7Bstatus%7D%20for%20'%24%7BurlPatternStr%7D'%60)%3B%5Cn%20%20%20%20return%20result%3B%5Cn%20%20%7D%3B%5Cn%20%20%5Cn%20%20Novel.prototype.replaceText%20%3D%20function%20(target%2C%20pattern%2C%20replacement%2C%20method)%20%7B%5Cn%20%20%20%20node%20%3D%20%24(target)%3B%5Cn%20%20%20%20text%20%3D%20node.html()%3B%5Cn%20%20%20%20text%20%3D%20text.replace(pattern%2C%20replacement)%3B%5Cn%20%20%20%20%5Cn%20%20%20%20if%20(!method%20%7C%7C%20method%20%3D%3D%201)%20%7B%5Cn%20%20%20%20%20%20node.html(text)%3B%5Cn%20%20%20%20%7D%20else%20if%20(method%20%3D%3D%202)%20%7B%5Cn%20%20%20%20%20%20var%20parentNode%20%3D%20node.parent()%3B%5Cn%20%20%20%20%20%20%2F%2Fnode.replaceWith(%5C%22%3Cdiv%3E%5C%22%20%2B%20text%20%2B%20%5C%22%3C%2Fdiv%3E%5C%22)%3B%5Cn%20%20%20%20%20%20node.detach()%3B%5Cn%20%20%20%20%20%20%24(%5C%22%3Cdiv%3E%5C%22%20%2B%20text%20%2B%20%5C%22%3C%2Fdiv%3E%5C%22).appendTo(parentNode)%3B%5Cn%20%20%20%20%7D%5Cn%20%20%20%20var%20msg%20%3D%20%5C%22%5BNovel%5D%20Text%20replacement%20for%20%5C%22%20%2B%20target%20%2B%20%5C%22%20%5B%5C%22%2Bpattern%2B%5C%22%20--%3E%20%5C%22%2Breplacement%2B%5C%22%5D%20is%20done.%5C%22%3B%5Cn%20%20%20%20log(msg%2C%20true)%3B%5Cn%20%20%7D%3B%5Cn%20%20%5Cn%20%20Novel.prototype.addThousands%20%3D%20function%20(selector)%20%7B%5Cn%20%20%20%20pattern%20%3D%20%2F(%5C%5Cd%2B)(%5C%5Cd%7B3%7D)(%5C%5CD%7C%24)%2Fg%3B%5Cn%20%20%20%20replacement%20%3D%20function(str%2C%20sub1%2C%20sub2%2C%20sub3%2C%20n)%20%7B%5Cn%20%20%20%20%20%20pattern%20%3D%20%2F(%5C%5Cd%2B)(%5C%5Cd%7B3%7D)(%5C%5CD%7C%24)%2Fg%3B%5Cn%20%20%20%20%20%20return%20sub1.replace(pattern%2C%20replacement)%20%2B%20'%2C'%20%2B%20sub2%20%2B%20sub3%3B%5Cn%20%20%20%20%7D%5Cn%20%20%20%20replaceNum%20%3D%20function(index%2C%20ele)%20%7B%5Cn%20%20%20%20%20%20var%20text%20%3D%20ele.innerText%3B%5Cn%20%20%20%20%20%20ele.innerText%20%3D%20text.replace(pattern%2C%20replacement)%3B%5Cn%20%20%20%20%7D%3B%5Cn%20%20%20%20%5Cn%20%20%20%20%24(selector).each(replaceNum)%3B%5Cn%20%20%20%20%5Cn%20%20%20%20log(%5C%22%5BJScript%20Tricks%20-%20Novel%5D%20Thousands%20seperators%20for%20%5C%22%20%2B%20selector%20%2B%20%5C%22%20have%20been%20added.%5C%22)%3B%5Cn%20%20%7D%3B%5Cn%20%20%5Cn%20%20Novel.prototype.adjustHeightForEyesProtectExt%20%3D%20function()%20%7B%5Cn%20%20%20%20window.__funcAdjustHeight__%20%3D%20function()%20%7B%5Cn%20%20%20%20%20%20var%20height%20%3D%20%24('body').height()%3B%5Cn%20%20%20%20%20%20%24('%23cye-workaround-body').height(height)%3B%5Cn%20%20%20%20%20%20%24('%23cye-workaround-body-image').height(height)%3B%5Cn%20%20%20%20%20%20%5Cn%20%20%20%20%20%20log(%5C%22%5BNovel%5D%20Height%20is%20adjusted%20for%20Eye-protection%20extension.%5C%22)%3B%20%20%20%20%20%20%5Cn%20%20%20%20%7D%3B%5Cn%20%20%20%20setTimeout('__funcAdjustHeight__()'%2C%20500)%3B%5Cn%20%20%7D%3B%5Cn%20%20%5Cn%20%20Novel.prototype.markTableColumn%20%3D%20function(table%2C%20%5Cn%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20columnIndexStart%2C%20columnIndexTo%2C%20className)%20%7B%5Cn%20%20%20%20var%20index1%20%3D%20columnIndexStart%20-%201%3B%5Cn%20%20%20%20var%20index2%20%3D%20columnIndexTo%20%2B%201%3B%5Cn%20%20%20%20%24(table%20%2B%20%5C%22%20tr%5C%22).find(%60td%3Aeq(%24%7BcolumnIndexStart%7D)%60).addClass(className)%3B%5Cn%20%20%20%20%24(table%20%2B%20%5C%22%20tr%5C%22).find(%60td%3Alt(%24%7Bindex2%7D)%3Agt(%24%7Bindex1%7D)%60).addClass(className)%3B%5Cn%20%20%20%20%5Cn%20%20%20%20log(%60%5BNovel%5D%20Mark%20columns%20%5B%24%7BcolumnIndexStart%7D-%24%7BcolumnIndexTo%7D%5D%20as%20%5C%22%24%7BclassName%7D%5C%22%20for%20table%20%24%7Btable%7D.%20%60)%3B%5Cn%20%20%7D%3B%5Cn%20%20%5Cn%20%20Novel.prototype.unbindEvent%20%3D%20function%20(target%2C%20e)%20%7B%5Cn%20%20%20%20%20%20%24(target).unbind(e)%3B%5Cn%20%20%7D%3B%5Cn%20%20%5Cn%20%20Novel.prototype.enableRightClick%20%3D%20function()%20%7B%5Cn%20%20%20%20%2F%2F%20call%20__JSTricks_Injected_%20method%20defined%20in%20injected.js%5Cn%20%20%20%20window.postMessage(%7B%20type%3A%20%5C%22JST-callMethod%5C%22%2C%20text%3A%20%5C%22enableRightClick%5C%22%20%7D%2C%20%5C%22*%5C%22)%3B%5Cn%20%20%20%20%5Cn%20%20%20%20log(%60%5BNovel%5D%20Rightclick%20is%20enabled.%60)%3B%5Cn%20%20%7D%3B%5Cn%20%20%2F%2F%20end%20of%20Novel%20prototypes%5Cn%20%20%5Cn%7D)(jQuery)%3B%5Cn%22%7D") ;
			localStorage['www.biquge.tw'] = decodeURIComponent("%7B%22script%22%3A%22%24(function()%20%7B%5Cn%20%20var%20novel%20%3D%20new%20Novel()%3B%5Cn%20%20novel.prefetch('a%3Acontains(%5C%5C'%E4%B8%8B%E4%B8%80%5C%5C')%3Aeq(0)')%3B%5Cn%20%20novel.prefetch('a%3Acontains(%5C%5C'%E7%9B%AE%E5%BD%95%5C%5C')%3Aeq(0)')%3B%5Cn%20%20novel.adjustHeightForEyesProtectExt()%3B%5Cn%20%20novel.replaceText(%5C%22%23content%5C%22%2C%20%2F%3Cbr%3E%5C%5Cs*%3Cbr%3E%2Fg%2C%20%5C%22%3Cbr%3E%5C%22)%3B%5Cn%7D)%3B%22%2C%22autostart%22%3Atrue%2C%22css%22%3A%22%22%2C%22sfile%22%3A%22%2C%20Novel%22%7D") ;
			}
		}