// Redirect chrome extension api invocations which are not accessible in content script
// to background page.
var inExtensionPage = typeof(chrome.tabs) !== "undefined";
var tabID = 0;
var tabUrl = "";
var tabSite = "";
var API_CALLBACKS = {};

var DEBUG = false;
if (inExtensionPage && localStorage["$setting.DEBUG"] == "true")
	DEBUG = true;
var RUN_BUTTON_CODE = localStorage["$setting.DEBUG_runbuttoncode"] == "true";
var DISABLE_RUN_BUTTON_CODE = localStorage["$setting.popupwindow_disableRunCodeButton"] != "false";
	

// iframe.contentWindow.postMessage({ type: "RestoreEditDialogContextResponse", tabid:NS_tabid, context:NS_editDialogContext }, "*");
// iframe.contentWindow.postMessage({type:"NS-NodeSelected", tabid:tabid, controlid:NS_controlId, context:NS_editDialogContext}, "*");
window.addEventListener("message", function(event) {
	//console.debug("Receive message posted:", event.data);
	// We only accept messages from ourselves
	if (event.data.tabid != tabID)
		return;
	
	if (event.data.type == "RestoreEditDialogContextResponse") {
		//console.log(event.data.context);
		restoreEditDialogContext(event.data.context);
	} else if (event.data.type == "NS-NodeSelected") {
		onNodeSelected(event.data.controlid, event.data.value);
	}
}, false);
		
		
API_GetSelectedTab(function(tab) {
	try {
		tabID = tab.id;
		//console.info("Tab.id is tab", tabID);
	} catch (ex) {
		console.error("Cannot get tab.id from tab", tab);
	}
	tabUrl = tab.url;
	tabSite = tabUrl.match(/^[\w-]+:\/*\[?([\w\.:-]+)\]?(?::\d+)?/)[1];
});


function guid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
        return v.toString(16);
    });
}


// function callback(response)
function API_SendRequest(method, arg, callback) {
	var id = guid();
	var msg = {MsgType:"chrome-ext-api", id:id, method:method, arg:JSON.stringify(arg)};
	//console.log("Send message to background page:");
	//console.log(msg);
	
	if (callback)
		API_CALLBACKS[id] = callback;
		
	chrome.runtime.sendMessage(msg, callback);
}
chrome.runtime.onMessage.addListener(function(msg) {
	if (msg && msg.MsgType == "chrome-ext-api-response") {
		//console.log("chrome-ext-api-response for", msg.method, msg);
		
		API_CALLBACKS[msg.id](JSON.parse(msg.arg));
		delete API_CALLBACKS[msg.id];
	}
});

// function callback(tab) {...}
function API_GetSelectedTab(callback) {
	if (inExtensionPage) {
		chrome.tabs.query({active:true, windowId:chrome.windows.WINDOW_ID_CURRENT}, function(tabs) {
			callback(tabs[0]);
		});
	} else {
		API_SendRequest("GetSelectedTab", null, callback);
	}
}

// function callback(url) {...}
function API_GetTabURL(callback) {
	if (inExtensionPage) {
		chrome.tabs.query({active:true, windowId:chrome.windows.WINDOW_ID_CURRENT}, function(tabs) {
			callback(tabs[0].url);
		});
	} else {
		API_SendRequest("GetTabURL", null, callback);
	}
}

// function callback() {...}
function API_ExecuteScriptInTab(name, script, includes, callback) {
	var data = {name:name, includes:includes, script:script};
	var msg = {tabid:tabID, method:"ExecuteSiteScript", data:JSON.stringify(data)};
	//console.log(msg);
	chrome.runtime.sendMessage(msg, callback);
}

function API_InsertCssInTab(css) {
	var data = [{code:`AppendStyleNodeToDom_____(decodeURIComponent("${encodeURIComponent(css)}"));`}];
	var msg = {tabid:tabID, method:"ExecuteJsCodeOrFile", data:data};
	chrome.runtime.sendMessage(msg);
}

function API_SetIcon(arg) {
	if (inExtensionPage) {
		chrome.browserAction.setIcon(arg);   
	} else {
		API_SendRequest("SetIcon", arg);
	}
}

function API_SendMessageToTab(tabid, msg, callback) {
	if (inExtensionPage) {
		chrome.tabs.sendMessage(tabid, msg, callback);
	} else {
		API_SendRequest("SendMessageToTab", msg, callback);
	}
}

function log() {
	console.log.apply(console, arguments);
	
	if (DEBUG) {
		API_SendRequest("ConsoleLog", arguments);
	}
}



		function toggleExtension() {
			if (!inExtensionPage)
				return;
				
			var enabled = localStorage["$setting.enabled"] == "true";
			
			if (enabled) {
				// Disable
				localStorage["$setting.enabled"] = "false";
				API_SetIcon({path:"icon24_disabled.png"});
			} else {
				// Enable
				chrome.runtime.sendMessage({tabid:tabID, method: "JSTinjectScript"});
				localStorage["$setting.enabled"] = "true";
				API_SetIcon({path:"icon24.png"});
			}
			setEnableDisableBtnImage();
		}
		
		function setEnableDisableBtnImage() {
			if (localStorage["$setting.enabled"] == "true") {
				$("#enableDisableBtn").css("background", "url('img/disable.png') no-repeat center, -webkit-gradient(linear, left top, left bottom, color-stop(0%,#fcf1b4), color-stop(50%,#fce448), color-stop(51%,#f4d300), color-stop(100%,#fbec8b))");
			} else {
				$("#enableDisableBtn").css("background", "url('img/enable.png') no-repeat center, -webkit-gradient(linear, left top, left bottom, color-stop(0%,#fcf1b4), color-stop(50%,#fce448), color-stop(51%,#f4d300), color-stop(100%,#fbec8b))");
			}
		}

		// remove current site-specific script
		function remove() {
			if (!inExtensionPage && !confirm("Do you really want to remove this script?"))
				return;
				
			API_GetTabURL(function(url) {
				var domain = url.match(/^[\w-]+:\/*\[?([\w\.:-]+)\]?(?::\d+)?/)[1];
				delete localStorage[domain];
				  
            	API_SetIcon({path:"icon24.png"});
            
				// Update status to let user know options were saved.
				var status = document.getElementById("title");
				status.innerHTML = "Options deleted. <br/>Please refresh the page.";
				setTimeout(function() {
					status.innerHTML = "";
				}, 2750);
			});
		}
	// Saves options to localStorage.
		function save_options() {
			API_GetTabURL(function(url) {
				var domain = url.match(/^[\w-]+:\/*\[?([\w\.:-]+)\]?(?::\d+)?/)[1];
				saveBody(domain);
			});
		}
		function saveBody(url)
		{
            var tmpp = {script:"",autostart:false};
    		if(localStorage[url])
            {
				 tmpp = JSON.parse(localStorage[url]);
			}	
            
            tmpp.script = editor.getValue();
			tmpp.css = editorCss.getValue();
            tmpp.autostart = document.getElementById("jstcb").checked;
			tmpp.sfile  = $("#jsincludefile").val();
			
			if (tmpp.autostart)
				API_SetIcon({path:"icon24_auto.png"});
			else
				API_SetIcon({path:"icon24.png"});
			
            localStorage[url] = JSON.stringify(tmpp);
            
			// Update status to let user know options were saved.
			var status = document.getElementById("title");
			status.innerHTML = "Options Saved.";
			setTimeout(function() {
				status.innerHTML = "";
			}, 750);
			
			editor.clearSyntaxCheckHightlight();
			var noErrorFound = checkScriptSyntax(tmpp.script);
			showJSSyntaxCheckReport(editor, JSHINT.data());
			console.log(JSHINT.data());	
			
			//Inject CSS immediately
			API_InsertCssInTab(tmpp.css);
		}
		// Restores select box state to saved value from localStorage.
		function restore_options(callback) {
			API_GetTabURL(function(url) {
				var domain = url.match(/^[\w-]+:\/*\[?([\w\.:-]+)\]?(?::\d+)?/)[1];
				restoreBody(domain);
				if(callback)
					callback();
			});			
		}
		function restoreBody(url) {
			var ta = document.getElementById("scriptText");
			if(!localStorage[url])
			{
				ta.value = compile_template(template_site_script, {url});
				return "";
			}
			var lsd = JSON.parse(localStorage[url]);
			var taCss = document.getElementById("scriptTextCss");
			var cb = document.getElementById("jstcb");
			ta.value = lsd.script;
			taCss.value = lsd.css;
			if(lsd.autostart)
				cb.checked = true;
			$("#jsincludefile").val(lsd.sfile);
			$("#jstcb").button("refresh");
		}
		function execute(name, script, css) {
			if(css != "") {
				chrome.tabs.insertCSS(null,{code:css});
			}
			
			if(script != "") {
				var includes = $("#jsincludefile").val();
				API_ExecuteScriptInTab(name, script, includes, function() {					
					var status = document.getElementById("title");
					status.innerHTML = "Script applied.";
					setTimeout(function() {
						status.innerHTML = "";
					}, 750);
				
				});
			}
		}
		function run(){
			
			execute("Site script", editor.getValue(), editorCss.getValue());
		}
		function runCodeSnippet(codesnippet) {
			var header = editor.getValue().match(/\s*(run[\s\S]*?function\s*\(.*\)\s*\{)/)[1];
			var wrappedCode = header + "\n" + codesnippet + "\n});";
			
			console.log(wrappedCode);
			execute("Selected site script", wrappedCode, editorCss.getSelection());
		}
		function runSelected(){
			runCodeSnippet(editor.getSelection());
		}
		function cacheScript()
		{
			if(editor)
				localStorage['cacheScript'] =  editor.getValue();
		}
		function cacheCss()
		{
			if(editorCss)
				localStorage['cacheCss'] =  editorCss.getValue();
		}
		function load_cache_all()
		{
			if($("#tabs > ul li:first").hasClass("selected"))
				load_cache_script();
			else
				load_cache_css();
		}
		function load_cache_script()
		{
			if( localStorage['cacheScript'] && confirm("Load last cached script?"))
				editor.setValue(localStorage['cacheScript']);
		}
		function load_cache_css()
		{
			if(localStorage['cacheCss'] && confirm("Load last cached CSS?"))
				editorCss.setValue( localStorage['cacheCss'] );
		}
		function editInOptionPage() {
			window.open("chrome-extension://"+chrome.runtime.id+"/options.html?tab=0&item="+tabSite, "OptionPage");
		}
		
		
		function checkScriptSyntax(source) {
			return JSHINT(source, {"esversion":6, "expr":true, "indent":2}, 
				{"console":false, "chrome":false, "run":false, "seajs":false, "define":false, 
				"INFO":false, "window":false, "document":false, "alert":false, "confirm":false, 
				"prompt":false, "setTimeout":false, "setInterval":false, "location":false});
		}
		
		function showJSSyntaxCheckReport(editor, data) {
			var warnings = [];
			var errors = data.errors ? data.errors.filter(function(err) {
				if (err == null) {
					return false;
				} else if (err.raw === "Expected a conditional expression and instead saw an assignment.") {
					return false;
				} else if (err.raw === "Use '{a}' to compare with '{b}'.") {
					warnings.push(err);
					return false;
				}
				
				return true;
			 })
			 : [];
			
			
			if (data.implieds) {
				for (var i = 0; i < data.implieds.length; ++ i) {
					var variable = data.implieds[i];
					for (var j = 0; j < variable.line.length; ++ j) {
						warnings.push( {line:variable.line[j], reason: `${variable.name} is undefined and thus considered as a global variable.`} );
					}
				}
			}
			
			var functions = data.functions ? data.functions.map(function(fn) {
				var fnName = fn.name.replace("(empty)", "(anonymous)");
				var params = fn.param ? fn.param.join(", ") : "";
				fn.reason = "function " + fnName + "(" + params + ") <br/>from line " + fn.line + " to " + fn.last;
				return fn;
			}) 
			: [];
			
			editor.setFunctionLines(functions);
			editor.setWarningLines(warnings);
			editor.setErrorLines(errors);
		}
		
		
		var editor=null;
		var editorCss=null;
		$(function(){//on popup load
			
			$("#runBtn").click(run);
			$("#runSelectedBtn").click(runSelected);
			$("#saveOptBtn").click(save_options);
			$("#laodCacheBtn").click(load_cache_all);
			$("#editInOptionPageBtn").click(editInOptionPage);
			$("#deleteBtn").click(remove);
			$("#showInDialogBtn").click(showInDialog);
			$("#forjstcb").click(changeAutostart);
			$("#enableDisableBtn").click(toggleExtension);
			$("#optionsBtn").click(function() { window.open(chrome.runtime.getURL("options.html"), "OptionPage"); });
			
			$("#jstcb").button({icons: {
						primary: "ui-icon-locked"
					}
				}).click(save_options);
				
			if (!inExtensionPage) {
				$("#img-icon").hide();
				$("#title").addClass("indialog");
				$(".inExtensionPage").hide();
				
				API_GetSelectedTab(function(tab) {
					API_SendMessageToTab(tab.id, { method: "RestoreEditDialogContextRequest"});
				});
			}
			tabs();
			setEnableDisableBtnImage();
			setupKeyEventHandler();
			 
			createCustomizeUI();
		
			restore_options(function(){
				//run();
				editor = CodeMirror.fromTextArea(document.getElementById("scriptText"), {
					tabindex: 2,
					mode: 'text/javascript',
					tabMode: 'indent',
					lineNumbers:true,
					matchBrackets :true,
					/*extraKeys:{
						"Ctrl-S":function(event){
							save_options();
							console.log(event);
						}			
					},*/
					onChange  : function(){
						cacheScript();
					}
				}); 
				editorCss = CodeMirror.fromTextArea(document.getElementById("scriptTextCss"), {
					mode: 'text/css',
					tabMode: 'indent',
					lineNumbers:true,
					matchBrackets :true,
					/*extraKeys:{
						"Ctrl-S":function(){
							save_options();
						}			
					},*/
					onChange  : function(){
						cacheCss();
					}
				});	
				editorDemo = CodeMirror.fromTextArea(document.getElementById("demo-code"), {
					mode: 'text/javascript',
					tabMode: 'indent',
					lineNumbers:true,
					matchBrackets :true,
					readOnly:true,
					/*extraKeys:{
						"Ctrl-S":function(){
							save_options();
						}			
					}*/
				}); 
				
				// Select <SELECTION_START><SELECTION_END> region
				function setSelectionInEditor(editor, setFocus) {
					var startTag = "<SELECTION_START>", endTag = "<SELECTION_END>";
					var text = editor.getValue();
					var startIndex = text.indexOf(startTag), endIndex = text.indexOf(endTag) - startTag.length;
					text = text.replace(startTag, "").replace(endTag, "");
					var startPos = editor.posFromIndex(startIndex), endPos = editor.posFromIndex(endIndex);
					
					editor.setValue(text);
					editor.setSelection(startPos, endPos);
					
					if (setFocus) {
						editor.focus();
						// In popup page, focus is set to the first control on page load automatically, so a timeout is used.
						setTimeout(function() { editor.focus(); }, 200);
					}
				}
				setSelectionInEditor(editor, true);
				
				if (localStorage["$setting.popupwindow_displayRequiresField"] != "false") {
					$("#jsincludefile-wrapper").show();
				}
			
				// Height adjusting 
				//if (inExtensionPage) {
					var windowHeight = $("body").height();
					// tabHeight = 500
					var tabHeight = windowHeight - $("#editor-script-gen-ui-title").offset().top - 2;
					$(".topeditorwrap").css("height", tabHeight);
					$(".CodeMirror-scroll, .CodeMirror-gutter").css("height", tabHeight);
					
					var editor1Height = windowHeight - $("#tabs-1 .CodeMirror-scroll").offset().top - 1;
					$("#tabs-1 .CodeMirror-scroll").css("height", editor1Height);
				//}
				
				if (RUN_BUTTON_CODE) {
					$("#tabs-1 .CodeMirror").css("background-color", "#ffeeee");
					$("#js-editor-hint").show();
				}
			});
			
			$("#editor-script-gen-ui-title > ul:first > li").click(function() {
				var editor1Height = $("body").height() - $("#tabs-1 .CodeMirror-scroll").offset().top - 1;
				$("#tabs-1 .CodeMirror-scroll").css("height", editor1Height);
			});
			
			$(document).tooltip({
				content: function() {
					return $(this).attr('title');
				}
			});
		});//;
		
		function setupKeyEventHandler() {
			var mac_os = navigator.userAgent.indexOf("Mac OS") > -1;
			
			$('body').on('keydown',function (event){
				var key = event.which;
				var modifier = event.ctrlKey;
				if (mac_os) 
					modifier = event.metaKey;
				
				if(modifier && String.fromCharCode( key ).toLowerCase() == 's') {
					save_options();
					event.preventDefault();
				}
			});
		}
		
		function tabs()
		{
			$("#tabs > ul li").each(function(ind,el){
			
				$(el).click(function(){
					
					var target = $(this).data("tabName");
					$("#tabs > ul li").removeClass("selected");
					$(this).addClass("selected");
					
					$("#tabs > div").each(function(ind,el){
						$(el).css({"z-index":100});
						if(el.id == target)
							$(el).css({"z-index":200}).animate({"margin-left":0});
						else
							$(el).animate({"margin-left":-$("#tabs").width()});
							
					});
				})
				$(el).data("tabName",$(el).children("a").attr("href").replace("#",""));
				$(this).text($(this).children("a").text()).children("a").remove();
				
			});
			
			$("#tabs > div").css({"z-index:":200}).not("#tabs-1").css({"margin-left":-$("#tabs").width(),'z-index':100});
			$("#tabs > ul li:first").addClass("selected");
			
		}
		
		function changeAutostart() {
			var autostart = document.getElementById("jstcb").checked;
			var lineCount = editor.lineCount();
			//console.log("linecount=" + lineCount);
			/*if (autostart) {
				// change from autostart to not autostart
				editor.removeLine(lineCount - 1);
				// remove the last \n
				var indexN = editor.indexFromPos({line:(lineCount-1), ch:0});
				editor.replaceRange("", editor.posFromIndex(indexN-1),editor.posFromIndex(indexN));
				editor.removeLine(0);
			} else {
				// change from not autostart to autostart
				editor.setLine(0, "jQuery(function($) {\n" + editor.getLine(0));
				editor.setLine(lineCount, editor.getLine(lineCount) + "\n});");
			}*/
			
			/*
			if (autostart) {
				// change from autostart to not autostart
				//
				// 	  $(main);		->		  main();
				//	})(jQuery);		->		})(jQuery);
				//
				var srccode = editor.getValue();
				var srccode = srccode.replace(/\$\s*\(\s*main\s*\)\s*;(\s*\}\s*\)\s*\(\s*jQuery\s*\)\s*;\s*)$/, "main();$1");
				editor.setValue(srccode);
			} else {
				// change from not autostart to autostart
				//
				// 	  main();		->		  $(main);
				//	})(jQuery);		->		})(jQuery);
				//
				var srccode = editor.getValue();
				var srccode = srccode.replace(/main\s*\(\s*\)\s*;(\s*\}\s*\)\s*\(\s*jQuery\s*\)\s*;\s*)$/, "$(main);$1");
				editor.setValue(srccode);
			}*/
		}
		
		function showInDialog() {
			showPageInDialog(false);
		}
		
		function showPageInDialog(hideDialog) {
			if (!inExtensionPage)
				return;
				
			saveEditDialogContext();
			
/* 
			chrome.tabs.query({"active":true}, function(tab) {
				if (!tab[0])
					return;
					
				var tabid = tab[0].id;
				var code = compile_template(codesnippit_showPopupInWebpage, {hideDialog});
				console.log(code);
				chrome.tabs.executeScript(tabid, {"code": code});
			});
 */
			chrome.runtime.sendMessage({tabid: tabID, method:"InjectPopupPage", data:{hideDialog}});
			
			window.close();
		}
		
		
		
		
		
		
		
		
		
		
		
		
		
		
		
		var metadataSettingStr;
		var sections = null;
		function createCustomizeUI() {
			var metadataSetting = JSON.parse(localStorage["meta"]);
			if (!metadataSetting)
				return;
			sections = metadataSetting["modules"];
			for (var i=0; i < sections.length; ++ i) {
				var section = sections[i];
				var divID = "genUITab-" + section.moduleName.replace("#", "");	
				var title = "Click button to add module dependency. Other buttons cannot work properly without adding module dependency.";			
				$("#editor-script-gen-ui-title ul").append(`<li class="tab-title tab-level tab-path-0-${i}" tab-path="tab-path-0-${i}" module="${section.moduleName}" target="${divID}">${section.title}</li>`);
				$("#editor-script-gen-ui").append('<div id="'+divID+'" class="tab-pane"></div>');
				var sectionDiv = $('#' + divID);
				//sectionDiv.append('<div><h3 class="section-title" data="'+section.objName+' = Object.create">'+section.title+'<input type="text" value="'+section.title+'" style="display:none" /></h3></div>');
				sectionDiv.append(`<div style="display:inline; margin-right:5px;"><input class="add-script-btn init-script-btn" type="button" value="Init" title="${title}" data-module="${section.moduleName}" data-obj="${section.objName}" data-code="" /></div>`);
				for (var j=0; j < section.commands.length; ++ j) {
					var command = section.commands[j];
					var statementType = command.statement ? command.statement : "common";
					// The default first command Init and the actual first command in meta data are shown in "display:inline"
					// Besides, commands taking none argument are also shown in "display:inline". 
					// Other commands are shown in "display:block0."
					var display = (j<1) || !command["args"] || (command.args.length<1) ? 'inline':'block';
					//console.log(display);
					
					// If run is set to true, then the generated code will get run instead of inserted 
					// into the script in editor.
					var runClass = command["run"] == "true" ? " run-script-btn" : "";
					var tooltip = command.tooltip ? command.tooltip + "<br/>" : "";
					title = command["run"] == "true" ? 
						( DISABLE_RUN_BUTTON_CODE ?
							"Click button to <b style='color:red;'>insert</b> generated code.<br/>WARNING: <b>Disable Run Code Button</b> switch in options is turned on. Turn it off to <b>run</b> generated code on clicking this button."
							: "Click button to <b>run</b> generated code.<br/>It is unnecessary to click Init button."
						) :
						"Click button to add generated code in editor at current cursor place." ;
					title = tooltip + title;
					
					var code = command.code;
					var moduleName = command.moduleName ? command.moduleName : section.moduleName;
					var objName = command.objName ? command.objName : section.objName;
					if (command.loadModule == "true") {
						var element = `<div style="display:inline"><input class="add-script-btn${runClass} init-script-btn" type="button" value="${command.title}" title="${title}" data-module="${moduleName}" data-obj="${objName}" data-code="" /></div>`
						sectionDiv.append(element);
					} else if (code) {
						var element = `<div style="display:inline"><input class="add-script-btn${runClass}" type="button" value="${command.title}" title="${title}" data-module="${moduleName}" data-obj="${objName}" data-code="${command.code}" /></div>`
						sectionDiv.append(element);
					} else {
						var src = `<div style="display:${display}"><input class="add-script-btn${runClass}" type="button" value="${command.title}" title="${title}" data-module="${moduleName}" data-obj="${objName}" data-statement="${statementType}" data-func="${section.objName}.${command.funcname}" /></div>`;
						var commandDiv = $(src).appendTo(sectionDiv);
						for (var k=0; k < command.args.length; ++ k) {
							var arg = command.args[k];
							var inputID = "code-arg-" + i + "-" + j + "-" + k;
							var type = arg.type ? arg.type : "text";
							if (type == "select") {
								var element = arg.name + ':<select id="' + inputID + '" class="code-arg-value">';
								for (var m=0; m < arg.options.length; ++ m) {
									var option = arg.options[m];
									element += '<option>' + option + '</option>';
								}
								element += "</select>";
								commandDiv.append(element);

							} else {
								var element = arg.name + ':<input id="' + inputID + '" type="text" class="code-arg-value" value="' + arg.defaultValue + '" size="' + arg.len + '" data-type="' + type + '" />';
								commandDiv.append(element);
							}
							
							if (type == "domnode") {
								element = '<input type="button" class="select-domnode-btn" title="Click to choose dom node." style="float:none; display:inline; background-image:url(img/target.jpg); background-size:contain"/> ';
								commandDiv.append(element);
							} else if (type == "url") {
								API_GetTabURL((function(inputIDStr) { return (function(url) {									
										//console.log(tabs);
										//var url = tabs[0].url;
										//console.log($(inputIDStr));
										$(inputIDStr).val(url);
									}); 
									})("#" + inputID)
								);
							}
						}
					}
				}
			}
			$("#editor-script-gen-ui-title ul").append('<li class="tab-title" target="genUITab-____Clear______">Clear</li>');
			$("#editor-script-gen-ui")
				.css("max-height", ""+localStorage["$setting.popupwindow_genUIPanelMaxHeight"]+"px")
				.append('<div id="genUITab-____Clear______" class="tab-pane"></div>');
			
			$(".add-script-btn").click(addScript);
				
			$(".init-script-btn").click(addRequireFile);
			$(".select-domnode-btn").click(startSelectingDomNode).mouseenter(hightlightSelectorNode);
			
			//console.log("active module is", `#genUITab-${metadataSetting.active_module}`);
			//$(`li.tab-title[module='${metadataSetting.active_module}']`).addClass("selected");
			//$(`.tab-pane`).hide();
			//$(`#genUITab-${metadataSetting.active_module}`).show();
			
			initScriptsUITabs(metadataSetting.active_module);
		}	
				
		function initScriptsUITabs(activeModule) {
			$('.tabs').each(function(ind, el) {
				var nav = $(el);
				nav.find('.tab-pane:gt(0)').hide();
				//nav.find('#genUITab-' + activeModule).show();
				nav.find('.tab-title').click(function() {
					nav.find('.tab-title').removeClass('selected');
					$(this).addClass('selected');
					var target = $(this).attr('target');
					nav.find('.tab-pane').hide()
					$('#'+target).show()
				});
			});
			
			$(".tab-level").click(rememberSelectedTabs);
			
			if (activeModule) {
				$(`li.tab-title[module='${activeModule}']`).click();
			} else {
				loadRememberedStatus();
			}
		}
		
		// window.postMessage({type:"NS-NodeSelected", tabid:1157, controlid:"code-arg-0-5-0", value:"DIV.b_caption"}, "*");
		function onNodeSelected(controlId, value) {
			var node = $("#"+controlId);
			node.val(value);
			blinkNode(node, 3, 
				{"background-color":"white"},
				{"background-color":"yellow"},
				200, 500);
		}
		
		function startSelectingDomNode() {
			if (inExtensionPage) {
				showPageInDialog(true);
			}
			
			NS_node = $(this).prev();
			var tabid = tabID;
			var msg = {method: "NS-StartSelectingNode", tabid:tabID, controlid:NS_node.attr("id")};
			API_SendMessageToTab(tabid, msg);
		}
		
		function hightlightSelectorNode() {
			var selector = $(this).prev().val();
			var tabid = tabID;
			var msg = {method: "NS-HightlightSelectorNode", tabid:tabID, selector:selector};
			API_SendMessageToTab(tabid, msg);
		}
		
		function saveEditDialogContext() {
			var tabid = tabID; //tab.id;
			var context = JSON.stringify(getEditDialogContext());
			var msg = {method: "SaveEditDialogContextRequest", context:context };
			API_SendMessageToTab(tabid, msg);
		}
		
		function getEditDialogContext() {
			var context = {selectedTabs:[], controls:{}};
			
			$(".code-arg-value").each(function(index, ele) {
				var node = $(this);
				var id = this.id;
				var value = node.val();
				context.controls[id] = value;
			});
			
			$("li.selected.tab-level").each(function(index, ele) {
				context.selectedTabs.push($(ele).attr("tab-path"));
			});
			
			return context;
		}
		
		function restoreEditDialogContext(data) {
			var context = data;
			if (typeof data === "string")
				context = JSON.parse(data);
			
			log("Restore popup window context:", context/*, "at", new Error().stack*/);
			var controls = context.controls;
			for ( key in controls) {
				$("#"+key).val(controls[key]);
			}
			
			var selectedTabs = context.selectedTabs;
			if (selectedTabs)
				for (var i = 0; i < selectedTabs.length; ++ i) {
					$("li.tab-level." + selectedTabs[i]).click();
				}
		}
		
		function rememberSelectedTabs() {
			var context = getEditDialogContext();
			context.controls = {};
			var contextStr = JSON.stringify(context);
			localStorage["$setting.temp-popupWindowContext"] = contextStr;
			log("Remember popup window context", contextStr/*, "at", new Error().stack*/);
		}
		
		function loadRememberedStatus() {
			var context = localStorage["$setting.temp-popupWindowContext"];
			var contextLoaded = false;
			try {
				restoreEditDialogContext(JSON.parse(context));
				contextLoaded = true;
			} catch (ex) {
				log("Invalid context JSON:", context);
			}
			
			if (!contextLoaded) {
				$(`li.tab-title:eq(0)`).click();
			}
		}

		
		// DEBUG: Move
		// blinkNode("#code-arg-0-5-0", 3, {"background-color":"white"}, {"background-color":"yellow"}, 200, 500);
		function blinkNode(node, blinkTimes, css1, css2, fadeInTime, fadeOutTime) {
			if (typeof(node) == "string")
				node = $(node);
			
			var actions = [];
			for (var i = 0; i < blinkTimes; ++ i) {
				actions.push({"css":css2, "time":fadeInTime});
				actions.push({"css":css1, "time":fadeOutTime});
			}
			
			function execAction(actions, index) {
				var action = actions[index];
				if (!action)
					return;
					
				var callback = function() { execAction(actions,  index + 1); };
				node.animate(action["css"], action["time"], callback);
			}
			
			execAction(actions, 0);
		}
		
		function getIndentLevel() {			
			/************* Syntax analysis to get indentation level **************/
			var editorCursorPos = editor.getCursor();
			var editorCursorIndex = editor.indexFromPos(editorCursorPos);
			var textInEditor = editor.getValue();
			var textAfterCursor = textInEditor.substr(editorCursorIndex);
			//console.log(textAfterCursor);
			var indentLevel = 0;
			var chars = []; curchar = null, strchar = null, strChars = ["'", '"', "`"], strCharCount = strChars.length;
			var escapeChar = false, inregex = false, inLineComment = false, inBlockComment = false;
			
			for (var i = 0; i < textAfterCursor.length; ++ i) {
				curchar = textAfterCursor[i];
				chars.unshift(curchar);
				
				if (escapeChar) {
					escapeChar = false;
				} else {
					if (strchar != null) {
						// current character is within a string literal.
						if (curchar == strchar) {
							// terminate current string literal.
							strchar = null;
						}							
					} else if (inregex) {
						// current character is within a regular expression literal.
						if (curchar == "/") {
							// terminate current regular expression  literal.
							inregex = false;
						} else if (chars[1] == "/" && chars[0] == "/") {
							// not a regular expression but a line comment.
							inregex = false;
							inLineComment = true;
						} else if (chars[1] == "/" && chars[0] == "*") {
							// not a regular expression but a block comment.
							inregex = false;
							inBlockComment = true;
						}
					} else if (inLineComment) {
						// current character is within a line comment.
						if (curchar == "\n") {
							// terminate current regular expression literal.
							inLineComment = false;
						}
					} else if (inBlockComment) {
						// current character is within a line comment.
						if (chars[1] == "*" && chars[0] == "/") {
							// terminate current regular expression literal.
							inBlockComment = false;
						}
					} else {
						// current character is not within a string literal.
						if (curchar == "\\") {
							escapechar = true;
						} else if (curchar == "/") {
							inregex = true;
						} else if (curchar == "}") {
							++ indentLevel;
						} else if (curchar == "{") {
							-- indentLevel;
						} else {
							// test if current character is ' "" or ` which are starting characters for string literals.
							for (var strcharIndex = 0; strcharIndex < strCharCount; ++ strcharIndex) {
								if (curchar == strChars[strcharIndex]) {
									strchar = curchar;
									break;
								}
							}
						}
					}
				}
				
				if (i>3)
					chars.pop();
			}
			/************* End of syntax analysis **************/
			
			return indentLevel;
		}
		
		function getIndent(level) {
			var indent = "", unit = "  ";
			while(level > 0) {
				indent += unit;
				--level;
			}
			return indent;
		}
		
		function addScript() {	
			var btn = $(this);
			var linePos = editor.getCursor()["line"];
			if (btn.hasClass("init-script-btn")) {
				if (linePos == 0)
					editor.setCursor({line:2, ch:0});
			} else if (linePos < 2) {
				editor.setCursor({line:2, ch:0});
			}
			
			var indentLevel = getIndentLevel();
			var actualIndentLevel = indentLevel > 1 ? indentLevel : 1;
			var indent = getIndent(actualIndentLevel);
			console.log("indent level is " + indentLevel + ", and actual indent level is " + actualIndentLevel);
			
			var stmtType = btn.attr('data-statement');
			stmtType = stmtType ? stmtType : "common";
			var stmt = null;
			stmt = btn.attr('data-code');
			if (stmt) {
				stmt = stmt.replace(/^\s*/mg, indent).replace(/\n\s*$/, "\n");
			} else if ( (stmt = btn.attr('data-func')) ) {				
				stmt += "(";
				btn.parent().find('input:text, select').each(function (idx, elm) { 
					if (idx != 0)
						stmt += ", ";
					var type = $(elm).attr('data-type');
					if (type == "raw") {
						stmt += elm.value; 
					} else {
						stmt += '"' + elm.value.replace(/\"/g, '\\"').replace(/\\/g, "\\\\") + '"'; 
					}
				});
				stmt += ")";
				
				if (stmtType == "if") {
					stmt = indent + "if(" + stmt + ") {\n" + indent + "}\n";
				} else if (stmtType == "if-else") {
					stmt = indent + "if(" + stmt + ") {\n" + indent + "} else {\n" + indent + "}\n";
				} else if (stmtType == "while") {
					stmt = indent + "while(" + stmt + ") {\n" + indent + "}\n";
				} else if (stmtType == "do-while") {
					stmt = indent + "do {\n" + indent + "} while(" + stmt + ");\n";
				} else if (stmtType == "common") {
					stmt = stmt.replace(/^\s*/mg, indent) + ";\n";
				}
			}
			
			if (stmt) {
				var runCode = !DISABLE_RUN_BUTTON_CODE && btn.hasClass("run-script-btn");
				if (RUN_BUTTON_CODE || runCode) {
					console.log("run button code.");
					var module = btn.attr("data-module");
					var obj = btn.attr("data-obj");
					runCodeOnRunButtonClicked(stmt, module, obj);
				} else {
					var code = editor.getValue();
					code += stmt;
					editor.setCursor({line:editor.getCursor()["line"], ch:0});
					editor.replaceSelection(stmt);
					
					var cursor = editor.getCursor();
					editor.setCursor(cursor);
				}
			}
		}
		
		function addRequireFile() {
			var node = $(this);
			var className = node.attr("data-module");
			var objName = node.attr("data-obj");
			
			var code = editor.getValue();
			//var pattern = /(\s*run[\s\S]*?)(\],\s*function\s*\(.*)(\)\s*\{[\s\S]*)/;
			var pattern = /(\s*run[\s\S]*?)(\],\s*function\s*\(.*)(\)\s*\{[\s\S]*)/;
			var match = code.match(pattern);
			
			if (match[1] && match[1].indexOf('"'+className+'"') > -1) {
				// Remove dependency
				match[1] = match[1].replace(new RegExp(',\\s*\\"'+className+'\\"'), '');
				match[2] = match[2].replace(new RegExp(',\\s*'+objName.replace("$", "\\$")), '');
				code = match[1] + match[2] + match[3];
			} else {
				// Add dependency
				code = `${match[1]}, "${className}"${match[2]}, ${objName}${match[3]}`;
			}
			//code = code.replace(pattern, '$1, "#'+className+'"$2'+', '+objName+'$3');
			editor.setValue(code);
		
		
//		 Require filed is not needed with sea.js
//		
//			var url = $(this).attr("data-require");
//			var requireInput = $("#jsincludefile");
//			var requireFilesText = requireInput.val();
//			var requireFiles = requireFilesText.split(/\s*,\s*/);
//			var contains = false;
//			for ( var i = 0; i < requireFiles.length; ++i ) {
//				if (requireFiles[i] == url) {
//					contains = true;
//					break;
//				}
//			}
//			if (!contains)
//				requireFiles.push(url);
//				
//			requireFilesText = requireFiles.filter(function(str) {return str != ""; }).join(", ");
//			requireInput.val(requireFilesText);
//		
		
		}
		
		function runCodeOnRunButtonClicked(codesnippet, moduleName, objName) {
			//var header = editor.getValue().match(/\s*(run[\s\S]*?function\s*\(.*\)\s*\{)/)[1];    // The first line of the script in edit
			//var wrappedCode = header + "\n" + codesnippet + "\n});";
			var wrappedCode = `run(["${moduleName}"], function(${objName}) {\n${codesnippet}\n});`;
			
			console.log(wrappedCode);
			execute("Selected site script", wrappedCode, editorCss.getSelection());
		}