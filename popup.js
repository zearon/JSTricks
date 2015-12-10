// Redirect chrome extension api invocations which are not accessible in content script
// to background page.
var inExtensionPage = typeof(chrome.tabs) !== "undefined";
var activeTabId = [];
var tabUrl = "";
var tabSite = "";
var API_CALLBACKS = {};

var DEBUG = false;
if (inExtensionPage && localStorage["$setting.DEBUG"] == "true")
	DEBUG = true;
	
API_GetSelectedTab(function(tab) {
	//console.log(tab);
	activeTabId[0] = tab.id;
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
		//console.log("chrome-ext-api-response for " + msg.method);
		//console.log(msg);
		
		API_CALLBACKS[msg.id](JSON.parse(msg.arg));
		delete API_CALLBACKS[msg.id];
	}
});

// function callback(tab) {...}
function API_GetSelectedTab(callback) {
	if (inExtensionPage) {
		chrome.tabs.query({active:true}, function(tabs) {
			callback(tabs[0]);
		});
	} else {
		API_SendRequest("GetSelectedTab", null, callback);
	}
}

// function callback(url) {...}
function API_GetTabURL(callback) {
	if (inExtensionPage) {
		chrome.tabs.query({active:true}, function(tabs) {
			callback(tabs[0].url);
		});
	} else {
		API_SendRequest("GetTabURL", null, callback);
	}
}

// function callback() {...}
function API_ExecuteScriptInTab(name, script, includes, callback) {
	var data = {name:name, includes:includes, script:script};
	var msg = {tabid:activeTabId[0], method:"ExecuteSiteScript", data:JSON.stringify(data)};
	//console.log(msg);
	chrome.runtime.sendMessage(msg, callback);
}

function API_InsertCssInTab() {
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

function log(arg) {
	console.log(arg);
	if (DEBUG) {
		API_SendRequest("ConsoleLog", arg);
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
				chrome.runtime.sendMessage({tabid:activeTabId[0], method: "JSTinjectScript"});
				localStorage["$setting.enabled"] = "true";
				API_SetIcon({path:"icon24.png"});
			}
			setEnableDisableBtnImage();
		}
		
		function setEnableDisableBtnImage() {
			if (localStorage["$setting.enabled"] == "true") {
				$("#enableDisableBtn").css("background", "url('icons/disable.png') no-repeat center, -webkit-gradient(linear, left top, left bottom, color-stop(0%,#fcf1b4), color-stop(50%,#fce448), color-stop(51%,#f4d300), color-stop(100%,#fbec8b))");
			} else {
				$("#enableDisableBtn").css("background", "url('icons/enable.png') no-repeat center, -webkit-gradient(linear, left top, left bottom, color-stop(0%,#fcf1b4), color-stop(50%,#fce448), color-stop(51%,#f4d300), color-stop(100%,#fbec8b))");
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
				status.innerHTML = "Options deleted. Please refresh the page.";
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
				ta.value = 
`run(["jquery"], function($) {
  function main() {

  }
  
  $(main);
});
`;
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
			if(css != "")
				chrome.tabs.insertCSS(null,{code:css});
			
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
		function runSelected(){
			var code = editor.getSelection();
			var header = editor.getValue().match(/\s*(run[\s\S]*?function\s*\(.*\)\s*\{)/)[1];
			var wrappedCode = header + "\n" + code + "\n});";
			
			log(wrappedCode);
			execute("Selected site script", wrappedCode, editorCss.getSelection());
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
			window.open("chrome-extension://"+chrome.runtime.id+"/options.html?page=sitescripts&site="+tabSite, "editOptionPage");
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
			
			$("#jstcb").button({icons: {
						primary: "ui-icon-locked"
					}
				}).click(save_options);
				
			if (!inExtensionPage) {
				$("#img-icon").hide();
				$(".inExtensionPage").hide();
				
				API_GetSelectedTab(function(tab) {
					API_SendMessageToTab(tab.id, { method: "RestoreEditDialogContextRequest"});
				});
			}
			tabs();
			setEnableDisableBtnImage();
			 
			createCustomizeUI();
		
			restore_options(function(){
				//run();
				editor = CodeMirror.fromTextArea(document.getElementById("scriptText"), {
					mode: 'text/javascript',
					tabMode: 'indent',
					lineNumbers:true,
					matchBrackets :true,
					extraKeys:{
						"Ctrl-S":function(){
							save_options();
						}			
					},
					onChange  : function(){
						cacheScript();
					}
				}); 	
				editorCss = CodeMirror.fromTextArea(document.getElementById("scriptTextCss"), {
					mode: 'text/css',
					tabMode: 'indent',
					lineNumbers:true,
					matchBrackets :true,
					extraKeys:{
						"Ctrl-S":function(){
							save_options();
						}			
					},
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
					extraKeys:{
						"Ctrl-S":function(){
							save_options();
						}			
					}
				}); 	
			
				// Height adjusting 
				//if (inExtensionPage) {
					var windowHeight = $("body").height();
					// tabHeight = 500
					var tabHeight = windowHeight - $("#editor-script-gen-ui-title").offset().top - 2;
					$(".topeditorwrap").css("height", tabHeight);
					$(".CodeMirror-scroll").css("height", tabHeight);
					
					var editor1Height = windowHeight - $("#tabs-1 .CodeMirror-scroll").offset().top - 1;
					$("#tabs-1 .CodeMirror-scroll").css("height", editor1Height);
				//}
			});
			
			$("#editor-script-gen-ui-title > ul:first > li").click(function() {
				var editor1Height = $("body").height() - $("#tabs-1 .CodeMirror-scroll").offset().top - 1;
				$("#tabs-1 .CodeMirror-scroll").css("height", editor1Height);
			});
		});//;
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
			
			chrome.tabs.query({"active":true}, function(tab) {
				if (!tab[0])
					return;
					
				var tabid = tab[0].id;
				chrome.tabs.executeScript(tabid, {"code": `
					run(["jquery", "jquery-ui"], function($) {
					
						$("#JST-POPUP-PINNED").parent(".ui-dialog").remove();
						$("#JST-POPUP-PINNED").remove();
						$("<iframe id='JST-POPUP-PINNED' src='chrome-extension://"+chrome.runtime.id+"/popup.html' style='width:600px;height:571px;' />")
						.appendTo("body")
						.dialog({"title":"JavaScript Tricks (Double click to toggle)", "width":"630", "height":"600"});
						$("#JST-POPUP-PINNED").css("width", "calc(100% - 28px)");	
						
						$(".ui-dialog-titlebar").dblclick(function() {
							$(this).attr("title", "Double click to toggle (collapse or extend) dialog box.");
							$(this).next().toggle();
						});
						
						if (${hideDialog})
							$("#JST-POPUP-PINNED").parent().hide();
						
					});
				`});
			});
			
			window.close();
		}
		
		
		
		
		
		
		
		
		
		
		
		
		
		
		
		var metadataSettingStr;
		var sections = null;
		function createCustomizeUI() {
			var metadataSetting = JSON.parse(localStorage["meta"]);
			if (!metadataSetting)
				return;
			sections = metadataSetting["sections"];
			for (var i=0; i < sections.length; ++ i) {
				var section = sections[i];
				var divID = "genUITab-" + section.title;				
				$("#editor-script-gen-ui-title ul").append('<li class="tab-title" target="' + divID + '">' + section.title + '</li>');
				$("#editor-script-gen-ui").append('<div id="'+divID+'" class="tab-pane"></div>');
				var sectionDiv = $('#' + divID);
				//sectionDiv.append('<div><h3 class="section-title" data="'+section.objName+' = Object.create">'+section.title+'<input type="text" value="'+section.title+'" style="display:none" /></h3></div>');
				sectionDiv.append('<div style="display:inline; margin-right:5px;"><input class="add-script-btn init-script-btn" type="button" value="Init" data-require="'+section.title+'" data-code="var '+section.objName+' = new '+section.title+'();\n" /></div>');
				for (var j=0; j < section.commands.length; ++ j) {
					var command = section.commands[j];
					var statementType = command.statement ? command.statement : "common";
					// The default first command Init and the actual first command in meta data are shown in "display:inline"
					// Besides, commands taking none argument are also shown in "display:inline". 
					// Other commands are shown in "display:block0."
					var display = (j<1) || !command["args"] || (command.args.length<1) ? 'inline':'block';
					//console.log(display);
					
					var code = command.code;
					if (code) {
						var element = `<div style="display:inline"><input class="add-script-btn" type="button" value="${command.title}" data-code="${command.code}" /></div>`
						sectionDiv.append(element);
					} else {
						var src = '<div style="display:'+display+'"><input class="add-script-btn" type="button" value="' + command.title + '" data-statement="' + statementType + '" data-func="'+section.objName+'.'+command.funcname+'" /></div>';
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
								element = '<input type="button" class="select-domnode-btn" style="float:none; display:inline; background-image:url(icons/target.jpg); background-size:contain"/> ';
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
			$(".select-domnode-btn").click(startSelectingDomNode);
			
			initScriptsUITabs();
		}	
				
		function initScriptsUITabs() {
			$('.tabs').each(function(ind, el) {
				var nav = $(el);
				nav.find('.tab-pane:gt(0)').hide();
				nav.find('.tab-title').click(function() {
					nav.find('.tab-title').removeClass('selected');
					$(this).addClass('selected');
					var target = $(this).attr('target');
					nav.find('.tab-pane').hide()
					$('#'+target).show()
				});
			});
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
			var tabid = activeTabId[0];
			var msg = {method: "NS-StartSelectingNode", tabid:activeTabId[0], controlid:NS_node.attr("id")};
			API_SendMessageToTab(tabid, msg);
		}
		
		function saveEditDialogContext() {
			var tabid = activeTabId[0]; //tab.id;
			var context = JSON.stringify(getEditDialogContext());
			var msg = {method: "SaveEditDialogContextRequest", context:context };
			API_SendMessageToTab(tabid, msg);
		}
		
		function getEditDialogContext() {
			var context = {};
			$(".code-arg-value").each(function(index, ele) {
				var node = $(this);
				var id = this.id;
				var value = node.val();
				context[id] = value;
			});
			return context;
		}
		
		function restoreEditDialogContext(data) {
			var context = JSON.parse(data);
			//console.log(context);
			for ( key in context) {
				$("#"+key).val(context[key]);
			}
		}

		// iframe.contentWindow.postMessage({ type: "RestoreEditDialogContextResponse", tabid:NS_tabid, context:NS_editDialogContext }, "*");
		// iframe.contentWindow.postMessage({type:"NS-NodeSelected", tabid:tabid, controlid:NS_controlId, context:NS_editDialogContext}, "*");
		window.addEventListener("message", function(event) {
			//console.log("Receive message posted:");
			//console.log(event.data);
			// We only accept messages from ourselves
			if (event.data.tabid != activeTabId[0])
				return;
			
			if (event.data.type == "RestoreEditDialogContextResponse") {
				//console.log(event.data.context);
				restoreEditDialogContext(event.data.context);
			} else if (event.data.type == "NS-NodeSelected") {
				onNodeSelected(event.data.controlid, event.data.value);
			}
		}, false);

		
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
			var curchar = null, strchar = null, strChars = ["'", '"', "`"], strCharCount = strChars.length;
			var escapeChar = false, inregex = false;
			
			for (var i = 0; i < textAfterCursor.length; ++ i) {
				curchar = textAfterCursor[i];
				
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
			if (btn.hasClass("init-script-btn")) {
				if (editor.getCursor()["line"] == 0)
					editor.setCursor({line:2, ch:0});
			}
			
			var indentLevel = getIndentLevel();
			var actualIndentLevel = indentLevel > 1 ? indentLevel : 1;
			var indent = getIndent(actualIndentLevel);
			// console.log("indent level is " + indentLevel + ", and actual indent level is " + actualIndentLevel);
			
			var stmtType = btn.attr('data-statement');
			stmtType = stmtType ? stmtType : "common";
			var stmt = null;
			stmt = btn.attr('data-code');
			if (stmt) {
				stmt = stmt.replace(/^\s*/mg, indent).replace(/\n\s*$/, "\n");
			} else {				
				stmt = btn.attr('data-func') + "(";
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
			
			var code = editor.getValue();
			code += stmt;
			editor.setCursor({line:editor.getCursor()["line"], ch:0});
			editor.replaceSelection(stmt);
			
			var cursor = editor.getCursor();
			editor.setCursor(cursor);
		}
		
		function addRequireFile() {
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