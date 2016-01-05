
	// jQuery UI Dialog: Double click dialog title bar to toggle dialog content
	$(function() {
		$("body").on("dblclick", ".ui-dialog-titlebar", function(event) {
			$(event.target).parents(".ui-dialog").find(".ui-dialog-content").toggle();
		});
	});





		var optionPageParams = {};
		parsePageParams();
		function parsePageParams() {
			var paramStr = location.href.match(/\?(.*)/);
			if (paramStr)	
				paramStr = paramStr[1]; 
			else 
				return;
				
			var params = paramStr.split(/&/).filter(function(str) { return str != ""; });
			for (var i = 0; i < params.length; ++ i) {
				var parts = params[i].split(/=/);
				var name = parts[0];
				var value = parts[1];
				if (value)
					optionPageParams[name] = decodeURIComponent(value);
			}
		}

		
		var mapSiteScriptFunc = dummyMapFunc;
		var mapContentScriptFunc = dummyMapFunc;

		var selectedTitle = "";		
		var scripts = ["lib/jquery.js"];
		
		var defaultSettings = {};
		
		chrome.manifest = (function() {
			var manifestObject = false;
			var xhr = new XMLHttpRequest();

			xhr.onreadystatechange = function() {
				if (xhr.readyState == 4) {
					manifestObject = JSON.parse(xhr.responseText);
				}
			};
			if (chrome.runtime) {
				xhr.open("GET", chrome.runtime.getURL('/manifest.json'), false);
			}
			try {
				xhr.send();
			} catch(e) {
				console.log('Couldn\'t load manifest.json');
			}

			return manifestObject;

		})();
		
		//-bg
		
		// assigned in tab()
		var saveFunc = dummySaveFunc;
		function save() {
			saveFunc();
		}
		function dummySaveFunc() {}
		function saveDisabledForPreviewFunc() {
			alert("Save is disabled in preview mode.")
		}
		function saveSiteScript()
		{
			if (mapSiteScriptFunc == findReplaceDialog_mapReplacedScript) {
				saveDisabledForPreviewFunc();
				return;
			}
			
			console.log("Save the site script.");
			if(selectedTitle == "")
				return;
			
			var key = selectedTitle;
			var val = editorJs.getValue() ;
			var cssval = editorCss.getValue();
      var autos = $("#jscb")[0].checked;
			var hid = $("#jshid").attr('checked');
			var sf = $("#jsincludefile").val();
			
			
      var tmp =  {"script": val, "autostart": autos, "hidden": hid , "sfile": sf, "css": cssval};
			localStorage[key] = JSON.stringify(tmp);
			currentSavedState = editorJs.getValue();
			currentSavedStateCss = editorCss.getValue();
			
			var noErrorFound = checkScriptSyntax(val);
			console.log(JSHINT.data());		
			if (!noErrorFound) {
				showMessage("Error found in current site script!");
			} else {
				showMessage("Script and CSS tricks saved!");
			}
			
			run("save");
		}
		
		function checkScriptSyntax(source) {
			return JSHINT(source, {"esversion":6, "expr":true, "indent":2}, 
				{"console":false, "chrome":false, "run":false, "seajs":false, "define":false, 
				"INFO":false, "window":false, "document":false, "alert":false, "confirm":false, 
				"prompt":false, "setTimeout":false, "setInterval":false, "location":false});
		}
		/*
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
		}*/

		function saveMetadata() {
			try {
				var meta = editorMeta.getValue();
				JSON.parse(meta);
				jsonlint.parse(meta);
				localStorage["meta"] = meta;
				currentSavedStateMeta = editorMeta.getValue();
			} catch (ex) {
				console.log(ex);
				
				showMessage("!!! Cannot save Metadata due to syntax error!");
				return;
			}
			
			showMessage("Metadata saved!");
		}
		
		
		function deleteRecord()
		{
			if(selectedTitle == "")
				return;
			if(selectedTitle == "Default")
			{
				showMessage("You can't delete 'Default' trick, sorry...");
				return;
			}
			var key = selectedTitle;			
			var $message = $("#jstmessage");
			
			if(confirm("Do you realy want to delete that trick?"))
			{
				delete localStorage[key];
				showMessage("'"+key+"' site's trick deleted!");
				$('.jstbox:contains('+key+')').slideUp(1000);
				editorJs.setValue("");				
				editorCss.setValue("");				
				currentSavedState = "";
				currentSavedStateCss = "";
				selectedTitle ="";
			}
		}
		var messageTimer=null;
		function showMessage(text)
		{
			var $message = $("#jstmessage");
			clearTimeout(messageTimer);
			$message.stop().animate({top:"0px"});
			$message.text(text);
			messageTimer = setTimeout(function(){
					$("#jstmessage").animate({top:"-50px"},
						function(){
							$message.text("");
					})},1750);
			
		}
		function run(invoker){
			
			if(! localStorage["Default"] )
			{
				selectedTitle="Default";
				saveSiteScript();
				selectedTitle="";
			}
			if(! localStorage["Main"] )
			{
				selectedTitle="Main";
				saveSiteScript();
				selectedTitle="";
			}
			
			if (invoker && invoker == "save") {}
			else {
				loadSiteScripts();
			}
		}
		function isSiteScriptName(v) {
			if(v!='Default' && v!='Main' && v!='cacheCss' && v!='cacheScript' && v!='info' && v!='meta' && v!='$setting' 
					&& !(/^\$setting\./.test(v))   && !(/^\$cs-/.test(v))  ) /**/ {
				
				return true;
			}
			
			return false;
		}
		function isContentScriptName(v) {
			return v.startsWith("$cs-");
		}
		function loadSiteScripts(filterOptions, contentType, nameFilter) {			
			$("#menu").empty();
			if(localStorage && localStorage.length != 0)
			{
				var keys = new Array();
				for(v in localStorage)
				{
					if(isSiteScriptName(v) ) /**/ {
						
						keys.push(v);
					}
				}
				keys.sort();
				keys.unshift("Default");
				if (localStorage["$setting.sitescripts_showMainScript"] == "true")
					keys.unshift("Main");
				//console.log(keys);
					
				
				for(k in keys) {	
					try {
						var v = keys[k]; 			
						if (nameFilter) {
							if (!nameFilter(v))
								continue;
						}
						
						var lsd = JSON.parse(localStorage[v]);
						//console.log(lsd);
						var addFlag = false, contentFlag = false, autostartFlag = true;
						if (!filterOptions) {
							addFlag = true;
						} else {
							var textPattern = filterOptions["pattern"];
							var andorAutostart = filterOptions["andorAutostart"]; // and, or
							var autostartValue = filterOptions["autostart"]; // true, false, any
							var name = filterOptions["name"];
							
							if (name) {
								if (name != v)
									continue;
								else
									addFlag = true;			
							} else {
								if (contentType) {
									var content = "";
										
									if (contentType == "js") {
										content = lsd.script;
									} else if (contentType == "css") {
										content = lsd.css;
									} else if (contentType == "js+css") {
										content = lsd.script + "\n" + lsd.css;
									}
									
									contentFlag = content.match(textPattern);
								}
								
								if (autostartValue == "any")
									autostartFlag = true;
								else
									autostartFlag = lsd.autostart ? autostartValue == "true" : autostartValue == "false";
								
								if (andorAutostart == "and")
									addFlag = contentFlag && autostartFlag;
								else
									addFlag = contentFlag || autostartFlag;
							}
						}
						
						if (addFlag)
							addMenuBox(v,lsd);
						
					} catch(e) {
						console.log(`Invalid! localStorage[${v}]=${localStorage[v]}`);
					}
				}
			}
			else
			{
				$("#menu").text("Nothing saved...");
			}
		}
		function addMenuBox(v,lsd)
		{
			var $divbox = $(`<div class='jstbox' data-site='${v}'></div>`);
			$divbox.append($("<div class='jsttitle'>").text(v));	
					
			$divbox.click(function(){ 
				selectSite(this);
			});
			
			if(v!="Default" && v!= "Main")
			{
				var $imgLink = $("<img class='goto' border=0 src='css/theme/img/url_icon.gif'>");
				if(lsd.hidden == 'checked')
				{
					$imgLink.click(function(){
						chrome.windows.create({"url":"http://"+v, "incognito": true});
					});
					$imgLink.attr("src","css/theme/img/url_icon_i.png");
				}
				else
				{
					$imgLink.click(function(){
						chrome.tabs.create({"url":"http://"+v});
					});
				}
				$divbox.append($imgLink);
			}
			
			if(lsd.hidden == 'checked')
			{
				if(hiddenOpt)
					$divbox.hide();
				$divbox.addClass('hiddenFlag');
			}
			
			if(selectedTitle == v)
				$divbox.addClass("selected");
				
			$("#menu").append($divbox);
		}
		
		
		var currentSavedState=null;
		var currentSavedStateCss=null;
		var currentSavedStateMeta=null;
		function selectSite(obj)
		{
			if( changed() )
				return;
			
			if( $("#editorJs").css("visibility") == "hidden")
				$("#editorJs").hide().css({"visibility":""}).fadeIn();
			
			var v = $(obj).text();
			var lsd = JSON.parse(localStorage[v]);
			var mapOptions = {command:"HightlightMatchedText", editor:editorJs, editor2:editorCss};
			mapSiteScriptFunc(lsd, mapOptions);
			
			if(lsd.script)
				editorJs.setValue(lsd.script);
			else
				editorJs.setValue("");
			if(lsd.css)
				editorCss.setValue(lsd.css);
			else
				editorCss.setValue("");	
			if(lsd.sfile)
				$("#jsincludefile").val(lsd.sfile);
			else
				$("#jsincludefile").val("");	
			
			
			if (mapOptions.indexes) {
				highlightMatchesInEditor(mapOptions.editor, mapOptions.indexes);
			}
			if (mapOptions.indexes2) {
				highlightMatchesInEditor(mapOptions.editor2, mapOptions.indexes2);
			}
				
				
			selectedTitle = v;
			if(lsd.autostart)
				$("#jscb")[0].checked = true;
			else
				$("#jscb")[0].checked = false;
			$("#jscb").button("refresh");
			
			if(lsd.hidden)
				$("#jshid")[0].checked = true;
			else
				$("#jshid")[0].checked = false;
			$("#jshis").button("refresh");
				
			set=false;
			$("#jsscriptfile option").each(function(ind,el){
				if($(el).val() == lsd.sfile)
				{
					$(el).attr("selected",true);
					set=true;
				}
				else
					$(el).attr("selected","");
			});
			if(!set)
				$("#jsscriptfile option")[0].selected = true;
			
			$(".jstbox").removeClass("selected");
			
			$(obj).addClass("selected");
			
			currentSavedState = editorJs.getValue();
			currentSavedStateCss = editorCss.getValue();
			editorJs.clearHistory();
			editorCss.clearHistory();
			
			showMessage("Loaded '"+v+"' site's trick!");
		}
		function editTitle($box)
		{
			$(".jsttitle", box)
		}
		function changed()
		{
			if(currentSavedState!=null)
			{
				if(currentSavedState != editorJs.getValue() )
				{
					return !confirm("Script changed! Discard?");
				}
			}
			if(currentSavedStateCss!=null)
			{
				if(currentSavedStateCss != editorCss.getValue() )
				{
					return !confirm("Css changed! Discard?");
				}
			}
			return false;
		}
		function filterSiteScriptByJSContent() {
			var content = $("#jscontentfiltertext").val();
			var mode = $("#contentfiltermode")[0].selectedIndex;
			var filter = content;
			if (mode){
				filter = new RegExp(content);
			}
			loadSiteScripts(filter, "js");
		}
		function filterSiteScriptByCSSContent() {
			var content = $("#jscontentfiltertext").val();
			var mode = $("#contentfiltermode")[0].selectedIndex;
			var filter = content;
			if (mode){
				filter = new RegExp(content);
			}
			loadSiteScripts(filter, "css");
		}
		function filterSiteScriptShowAll() {
			loadSiteScripts();
		}
		
		 
				
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
				setTimeout(function() {
					editor.focus();
					console.log("Set editor focus");
				}, 100);
			}
		}
		
		var editorJs = null;
		var editorCss = null;
		var editorMeta = null;
		var editorDynScript = null;
		var editorJsonFile = null;
		var editorJsonObjectValue = null;
		var editors = [];
		var hlLineJs = null;
		var hlLineCss = null;
		
		$(function(){//on load
			$("#theme").change(function() {
				var theme = $(this).val();
				setTheme(theme);
			});
// 			$("#testtest").click(cloudStorageGenCode);
		
			$("#jscontentfilterbtn").click(filterSiteScriptByJSContent);
			$("#csscontentfilterbtn").click(filterSiteScriptByCSSContent);
			$("#clearcontentfilterbtn").click(filterSiteScriptShowAll);
			
			//$("#forjscb").click(changeAutostart);
			$("#jscb").change(changeAutostart);
			$("#jssave").click(saveSiteScript);
			$("#jsdelete").click(deleteRecord);	
			$("#exportbtn").click(exportSettings);
			$(".findReplaceDialogBtn").click(showFindReplaceDialog);
			$("input:button.textSizeUpBtn").click(function(){textSize(1)});
			$("input:button.textSizeDownBtn").click(function(){textSize(-1)});				
			$("#findDialog-findBtn").click(findReplaceDialog_find);
			$("#findDialog-previewBtn").click(findReplaceDialog_preview);
			$("#findDialog-cancelBtn").click(findReplaceDialog_cancel);
			$("#findDialog-doBtn").click(findReplaceDiailog_do);
					
			$('#backupbtn').click(backup);
			$('#restorebtn').click(restore);
			$('#genInitSettingbtn').click(backupInitialSettings);
			$("#cloudsave-savesettings").click(cloudStorageSaveSettings);
			$('input:button.cloudbackup').click(cloudBackup);
			$('input:button.cloudrestore').click(cloudRestore);
			$('#cloudlist').click(cloudStorageList);
			$('#cloudview').click(cloudStorageView);
			$('#clouddelete').click(cloudStorageDelete);
			$('#cloudtoggleselect').click(cloudToggleSelect);			
			$('#cloudleavelast10').click(cloudStorageLeaveLast10);
			$(".cloudsave-showkey").click(cloudStorageShowKey);
			$("#cloudsave-genkey").click(cloudStorageGenKey);
			$("#show-cloudsave-src").click(showCloudStorageSrc);
			
			$("#removeTempSettingsBtn").click(removeTempSettings);
			
			$("#dcssave").click(save);
			$("#dcsadd").click(addContentScript);
			$("#dcsrename").click(renameContentScript);
			$("#dcsgencodebytemplate").change(generateContentScript);
			$("#dcsdelete").click(deleteContentScript);
			$("#dcssort").click(sortContentScript);
			$("#dcsindexup").click(moveUpContentScript);
			$("#dcsindexdown").click(moveDownContentScript);
			$("#dcsreindex").click(reindexContentScript);
			$("#dcsupdatemenu").click(updateContentScriptForContextMenu);
			
			//$(".colorpicker").colorpicker();
			
			loadContentScriptTemplate();
			loadAllContentScripts();
			$(".navbar > *").scrollTop(0);
			
			$('#jsonFileLoad').click(loadJsonFile);
			$('#jsonObjExtract').click(extractJsonObject);
			
			initControlsRelatingToLocalStorage();
			
			setupKeyEventHandler();
			
			// Find all nodes with class "togglePanel" , and add an event handler to toggle 
			// those nodes with css selector matching the .togglePanel node's target attribute value.
			$(".hide").hide();
			$(".togglePanel").attr("title", "Click to toggle display.").click(function(event) {
				var target = $(this).attr("target");
				if (target) {
					$(target).toggle();
				}				
			});
			
			// Load the user manual page
			$("#manual-content").load("userManual.html", function() {			
				// jQuery UI accordion (like sections that can be collapsed and expanded.)
				// The underlying HTML markup is a series of headers (H3 tags) and content divs so the content is usable without JavaScript.
				$(".accordion").accordion({
					collapsible: true,
				  	heightStyle: "content" /*auto, fill, content*/
				});
							
				// DEBUG
				if (optionPageParams["item2"])
					$(`#manual-content h3:eq(${optionPageParams["item2"]})`).click();
			});
			
			if (!localStorage["$setting.cloud-url"])
				$(".cloudsave-setting").show();
			
			//$("#settings-release-notes-btn.empty").click(function() {
				$("#settings-release-notes").load("releasenotes.html");
				$(this).removeClass("empty");
			//});
			
			$("#logo").css({"width":128}).delay(10).animate({"width":48},function(){
				$(this).attr("src","icon/icon48.png");
				$("#backupToolbar").fadeIn();
			});
			
			$(window).resize(function(){
				//console.log($(window).height());
				
				//$("#toptabcontainer,").stop(true,false).delay(600).animate({"height":$(window).height() - 70});
				
				//$("#toptabcontainer,").stop(true,false).delay(600).animate({"height":$(window).height() - 70});
				//$(".navwrap").stop(true,false).delay(600).animate({"height":$(window).height() - 100});
				//$(".editwrap").stop(true,false).delay(600).animate({"height":$(window).height() - 110});
			});
			$(window).resize();
			
			$(document).keydown(function(ev){
				if(ev.keyCode==112)
					return false;
			});
			editorJs = generateEditor("taedit", "text/javascript"); 
			editorCss = generateEditor("taeditcss", "text/css"); 		
			editorDynScript = generateEditor("dyscriptedit", "text/javascript"); 
			editorMeta = generateEditor("taeditmeta", "application/json"); 		
			editorJsonFile = generateEditor("json-file", "application/json"); 
			editorJsonObjectValue = generateEditor("json-file-obj", "text/javascript"); 
			
			//line highlight
			//hlLineJs = editorJs.setLineClass(0, "activeline");
			//hlLineCss = editorCss.setLineClass(0, "activeline");
			
			//hide some menu
			$(document).keydown(function(event){
					
				if(event.altKey && modifier && String.fromCharCode( event.which ).toLowerCase() == 'h')
				{
					$(".jstbox.hiddenFlag").each(function(ind,el){$(el).delay(ind*100).slideToggle()});
					$("#jshid, label[for=jshid]").fadeToggle();
					
					if(hiddenOpt == true)
					{
						showMessage("WOOOOH! Hidden options!");
						hiddenOpt = false;
					}
					else
					{
						hiddenOpt = true;
					}
				}
			});
			// setting panel initialization
			initSettingPanel();
			
			//scripts
			$("#jsscriptfile").append($("<option value=''>No script</option>"));
			for(var i=0;i<scripts.length;i++)
			{
				$("#jsscriptfile").append($("<option>"+scripts[i]+"</option>"));
			}
			///
			run(); //menu etc.
			
			//version
			$("#version").append(chrome.manifest.version);
			//
			tabs();
			//dialog
			dialog = $("#floatingWindow").dialog({"autoOpen":false, height:500,"width":600});
			//buttons
			$("#jscb, #jshid").button({icons: {
						primary: "ui-icon-close"
					}
				});
			$('#json-viewer-tabs').tabs();
			
			loadMetaData();
			
			// Jump to tab if page=sitescripts is specified.
			var tab = optionPageParams["tab"], item = optionPageParams["item"];
			if (tab) {
				$(`#toptabs > ul >li:eq(${tab})`).click();
				switch (tab) {
					case "0":
						// jump to site if item=cn.bing.com is specified
						if (item)
							$(`div.jstbox[data-site='${item}']`).click();
						break;
					case "1":
						// jump to script if item=Novel is specified
						if (item)
							$(`div.jstbox.contentScriptKey[name='${item}']`).click();
						break;
					case "3":
						// jump to section if item=settings-manual is specified
						if (item)
							$(`.jstbox.settingKey[target='${item}']`).click();
						break;
				}
			} else {
				
				// Jump to last visited tab
				try {
					var startuptab = localStorage["$setting.startuptab"];
					$(`.tabs:first li:eq(${startuptab})`).click();
					//$('.settingNav .settingKey:eq(2)').click();
				} catch (exception) {}
			}
			
			$(document).tooltip({
				tooltipClass: "tooltip",
				content: function() {
					return $(this).attr('title');
				}
			});
		});//;
		/*
		function generateEditor(node, options) {
			options["onFocus"] = function() {
				focusNotOnMenuList = true;
			}
			options["theme"] = "abcdef";
			options["foldGutter"] = true;
			options["syntaxCheck"] = {"esversion":6, "expr":true, "indent":2, "globals":
			 	{"console":false, "chrome":false, "run":false, "seajs":false, "define":false, 
				"INFO":false, "window":false, "document":false, "alert":false, "confirm":false, 
				"prompt":false, "setTimeout":false, "setInterval":false, "location":false} };
    		options["gutters"] = ["CodeMirror-lint-markers", "CodeMirror-linenumbers", "CodeMirror-foldgutter"]
    
			return CodeMirror.fromTextArea(node, options);
		}*/
		
		function generateEditor(textareaID, mode, extraOptions) {
			var options = {
				mode: mode,					
				tabMode: 'indent',
				lineNumbers:true,
				styleActiveLine: true,
				matchBrackets :true,
				styleSelectedText: true,
				theme: getCodeMirrorTheme(), //_yellow, abcdef, default
				foldGutter: true,
				lint: {"esversion":6, "expr":true, "indent":2, "globals":
						{"console":false, "chrome":false, "run":false, "seajs":false, "define":false, 
						"INFO":false, "window":false, "navigator":false, "document":false, "alert":false, "confirm":false, 
						"prompt":false, "setTimeout":false, "setInterval":false, "location":false,
						"localStorage":false, "FileReader":false} },
				gutters: ["CodeMirror-lint-markers", "CodeMirror-linenumbers", "CodeMirror-foldgutter"],
				extraKeys: {						
					"Esc": function() {
					  var scroller = editorJs.getScrollerElement();
					  if (scroller.className.search(/\bCodeMirror-fullscreen\b/) !== -1) {
						scroller.className = scroller.className.replace(" CodeMirror-fullscreen", "");
						scroller.style.height = '';
						scroller.style.width = '';
						editorJs.refresh();
					  }
					},
					"F1":function(){
						openJQueryHelp();
					},
					"Ctrl-Space": "autocomplete"
				}
			};
			if (extraOptions) {
				for (var key in extraOptions) {
					options[key] = extraOptions[key];
				}
			}
			
			var editor = CodeMirror.fromTextArea(document.getElementById(textareaID), options); 
			editor.on("focus", function() {
					focusNotOnMenuList = true;				
				});
			editors.push(editor);
			return editor;
		}
		
		function loadMetaData() {
			var metadata = localStorage["meta"];			
			if (metadata)
				editorMeta.setValue(metadata);
			else
				editorMeta.setValue("");
		}
		
		var focusNotOnMenuList = true;
		var focusedMenuItem = null;
		function setupKeyEventHandler() {
			var mac_os = navigator.userAgent.indexOf("Mac OS") > -1;
			if (mac_os)
				$(":button[value='Save [Ctrl+S]']").val("Save [⌘S]");

			$("*").focus(function(event) {
				focusNotOnMenuList = true;
			});
			$(".navbar *").click(function(event) {
				focusNotOnMenuList = false;
				focusedMenuItem = $(event.target).closest(".jstbox");
				//console.log(focusedMenuItem);
			});
			
			$('body').on('keydown',function (event){
				var key = event.which;
				var modifier = event.ctrlKey;
				if (mac_os) {
					modifier = event.metaKey;
				}
				// console.log(event.which);// 打印出具体是按的哪个按键。
				
				if(modifier && String.fromCharCode( key ).toLowerCase() == 's')
				{
					save();
					event.preventDefault();
					return;
				}
				
				// Up and down keys
				if (key == 38 || key == 40) {
					
					if (focusNotOnMenuList)
						return;
					
					event.preventDefault();
					var node = null;
					
					if(event.which == 38) {
						node = focusedMenuItem.prev();
					} else if (event.which == 40) {
						node = focusedMenuItem.next();
					}
					
					if (node.length < 1)
						return;
					
					node.click();
					var container = node.parent();
					var containerHeight = container.height();
					var pos = node.position();
					var pos_y = pos.top; // 32 is the height of the menu item.
					console.log(`Container height is ${containerHeight} and y position is ${pos_y}`);
					
					// 32 is the height of .jstbox
					if (pos_y + 32 > containerHeight) {
						container[0].scrollTop += 32;
					} else if (pos_y < 0) {
						container[0].scrollTop -= 32;
					}
					console.log(container[0].scrollTop);
				}
			});
		}
		
		var hiddenOpt = true;
		function tabs()
		{
			$("div.tabs").each(function(ind, tabs) {
				$(tabs).find("> ul li").each(function(ind,el){
				
					$(el).click(function(){
						
						var target = $(this).data("tabName");
						$(tabs).find("> ul li").removeClass("selected");
						$(this).addClass("selected");
						
						$(tabs).find("> div").each(function(ind,el){
							$(el).css({"z-index":100});
							if(el.id == target)
								$(el).css({"z-index":200}).animate({"margin-left":0});
							else
								$(el).animate({"margin-left":-$(tabs).width()});
								
						});
					});
					$(el).data("tabName",$(el).children("a").attr("href").replace("#",""));
					$(this).text($(this).children("a").text()).children("a").remove();
					
				});
				
				$(tabs).find("> div").css({"z-index:":200}).not(":first").css({"margin-left":-$(tabs).width(),'z-index':100});
				$(tabs).find("> ul li:first").addClass("selected");
			});
			
			$("#toptabs > ul li:eq(0)").click(function () { saveFunc = saveSiteScript; });
			$("#toptabs > ul li:eq(1)").add("#toptabs > .tab:eq(1) .tabs > ul li").click(function () { 
				if ($("#tabs-metadata").hasClass("selected")) {
					saveFunc = saveMetadata;
					console.log("saveFunc = saveMetadata");
				} else {
					saveFunc = saveContentScript; 
					console.log("saveFunc = saveContentScript");
				}
			});
			$("#toptabs > ul li:gt(1)").click(function () { saveFunc = dummySaveFunc; });
			
			$("#toptabs > ul li").each(function(ind, el) {
				$(el).click(function() {
					localStorage["$setting.startuptab"] = ind;
				});
			});
			
			//$("#tabs > div").css({"z-index:":200}).not("#tabs-1").css({"margin-left":-$("#tabs").width(),'z-index':100});
			//$("#tabs > ul li:first").addClass("selected");
			
			//DEBUG test find and replace dialog
			//$("#findReplaceDialogBtn").click();
		}
		
		function initSettingPanel() {
			$('.settingNav').each(function(ind, el) {
				var nav = $(el);
				nav.find('.settingPanel:gt(0)').hide();
				nav.find('.settingKey').click(function() {
					nav.find('.settingKey').removeClass('selected');
					$(this).addClass('selected');
					var target = $(this).attr('target');
					nav.find('.settingPanel').hide()
					$('#'+target).show()
				});
			});
		}
		
		var dialog;
		function openJQueryHelp()
		{
			var pos = editorJs.getCursor();
			var token = editorJs.getTokenAt(pos);
			var word = token.string;
			
			if(word.match(/^[\:a-z0-9]+$/i))
			{
			}
			else if(editorJs.somethingSelected())
			{
				word = editorJs.getSelection();
			}
			var $opt = $("#floatingWindow");
			var p = editorJs.cursorCoords(false,'page');
			
			$opt.dialog("option",{"position":[p.x,p.y+10],"title":"Loading..."});
			
			loadJqueryDoc(word);
				
		}
		function loadJqueryDoc(word)
		{
			var $opt = $("#floatingWindow");
			
			$opt.empty().append("<img class='loadingimg' src='css/theme/img/loading.gif?seed' alt=''/>").dialog('open');
			
			$opt.load("http://api.jquery.com/"+word+"/ #content",function(){
				if($opt.text() == "")
				{
					searchJqueryDoc(word);
					return;
				}
				reformatJqueryDoc();
			}).error(function(){
				searchJqueryDoc(word);
			});
		}
		function reformatJqueryDoc(){
		
			var $opt = $("#floatingWindow");
			
			$opt.html($opt.html().replace(/src=\"/g,"src=\"http://api.jquery.com/"));
			$opt.dialog("option",{"title":$opt.find("h1:first").text()});
			$opt.find("h1, .jq-box.roundBottom:last").remove();
			
			$opt.find("a").each(function(ind,el){
				
				var href = $(el).attr("href");
				if(href.match(/^#/) ) //menu
				{
					$(el).click(function(){
						$("#accord").accordion( "activate" , $(this).attr("href") );
						return false;
					});
				}
				else
				{
					if(href[0] == "/" || !href.match(/^http/))
					{
						href = "http://api.jquery.com"+href;
					}
					
					$(el).click(function(){
						var w = $(this).attr("href").replace(/^http\:\/\/api\.jquery\.com\//g,"");//.replace(/\//g,"");
						loadJqueryDoc( w );
						return false;
					});
				}
			});
			
			if($opt.find(".entry").length > 1)
			{
				var $ac = $("<div id='accord'>");
				$opt.find(".entry").each(function(ind,el){
					$ac.append("<h3 id='"+el.id+"'><a href=#>"+$("h2 .name", el).text()+"</a></h3>");
					$ac.append(el);
				});
				$opt.append($ac);
				$("#accord").accordion({
					autoHeight: false,
					collapsible:true,
					"navigation": true,
					animated: false
				});
			}
		
		}
		function searchJqueryDoc(word){
			var $opt = $("#floatingWindow");
			
			$opt.dialog("option",{"title":"Searching '"+word+"'..."});
			
			$opt.load("http://api.jquery.com/?ns0=1&s="+word+" #content",function(){
				
				var $opt = $("#floatingWindow");
				if($opt.find("h1").length)
				{
					$opt.dialog("option",{"title":$opt.find("h1").text()});
					$opt.find("h1").remove();
					
					$opt.find("a.title-link").each(function(ind,el){
						$(el).data("href",el.href);
						$(el).attr("href","#");
						$(el).click(function(){
							loadJqueryDoc($(this).data("href").match(/\/[^\/]+\/$/g,"")[0].replace(/\//g,""));
						})
					
					})
				}
				else //search box
				{
					$opt.dialog("option",{"title": "'"+$("#s-no-results").val()+"' not found."});
					$("#searchform-no-results").submit(function(){
						searchJqueryDoc($("#s-no-results").val());
						return false;
					});
				}
			
			});
		}
		function exportSettings()
		{
			var w = window.open();
			w.document.write("<pre>");
			if(localStorage && localStorage.length != 0)
			{
				for(v in localStorage)
				{
					w.document.write("exported['"+v+"'] = \"" + localStorage[v].replace(/\"/g,"\\\"") + "\" \n");
				}
			}
			w.document.write("</pre>");
		}		
		function textSize(val)
		{
			var v = parseInt($(".CodeMirror").css("font-size")) + val;
			
			if(v > 4)
				$(".CodeMirror").css({"font-size":v+"px"});
				
			$("span.textsizeval").text(v + "px");
		}
		
		
		//
		function changeAutostart() {
			//var autostart = document.getElementById("jscb").checked;
			//console.log(autostart);
			
			if (selectedTitle != "Default") {					
				/*			
				if (autostart) {
					// change from autostart to not autostart
					//
					// 	  $(main);		->		  main();
					//	})(jQuery);		->		})(jQuery);
					//
					var srccode = editorJs.getValue();
					var srccode = srccode.replace(/\$\s*\(\s*main\s*\)\s*;(\s*\}\s*\)\s*\(\s*jQuery\s*\)\s*;\s*)$/, "main();$1");
					editorJs.setValue(srccode);
				} else {
					// change from not autostart to autostart
					//
					// 	  main();		->		  $(main);
					//	})(jQuery);		->		})(jQuery);
					//
					var srccode = editorJs.getValue();
					var srccode = srccode.replace(/main\s*\(\s*\)\s*;(\s*\}\s*\)\s*\(\s*jQuery\s*\)\s*;\s*)$/, "$(main);$1");
					editorJs.setValue(srccode);
				}	*/	
			}	
			
			saveSiteScript();
		}
		
		function backup() {
			var data = JSON.stringify(localStorage);
			data = formatter.formatJson(data);
			var link = $('#__UI_dialog__link');
			link.attr('href', "data:text/plain;charset=UTF-8,"+encodeURIComponent(data));
			link.attr('data-downloadurl', "text/plain:backup.json:"+"http://html5-demos.appspot.com/static/a.download.html");
			link.innerHtml = "Download";
			link.show();
			link.click();
			
			//var bb = new Blob([data], {type: 'text/plain'});
			//var href = URL.createObjectURL(bb);
		}
		
		function restore() {
			var file = $('#__LocalStorageFP__')[0].files[0];
			if (typeof file === 'undefined') {
				alert("Please select a backup file first.");
			} else {
				var reader = new FileReader();
				reader.onload = function() {
					text = this.result;
					console.log(text);
					var values = JSON.parse(text);
					for (v in localStorage) {
						delete localStorage[v];
					}
					for (v in values) {
						localStorage[v] = values[v];
						/*console.log(v+"="+values[v]);*/
					}
					alert("Config loaded");
					location.reload();
				};
				reader.readAsText(file);
			}
		}
		
		function backupInitialSettings() {
			var settings = {};
			settings["$setting.DEBUG"] = "false";
			settings["$setting.enabled"] = "true";
			settings["$setting.startuptab"] = "0";
			$.extend(settings, defaultSettings);
			for ( key in localStorage) {
				if (isSiteScriptName(key) || key == "Default" || key == "info") // info is the version
					continue;
					
				if (key.startsWith("$cs-") && false)
					continue;
				
				if (key.startsWith("$setting")) 
					continue;
				
				settings[key] = localStorage[key];
			}
			settings["cacheCss"] = "";
			settings["cacheScript"] = "";
			
			var data = JSON.stringify(settings), oldData = data;
			data = formatter.formatJson(data);
			var link = $('#__UI_dialog__link_init_setting');
			link.attr('href', "data:text/plain;charset=UTF-8,"+encodeURIComponent(data));
			link.attr('data-downloadurl', "text/plain:backup.json:"+"http://html5-demos.appspot.com/static/a.download.html");
			link.show();
			
			console.log(data);
			link.off("click");
			link.click(function() {
				$("#settings-list .jstbox:eq(1)").click();
				showConfiguration(oldData);
			});
		}
		
		
		function updateSettings() {
			chrome.runtime.sendMessage({method:"UpdateSettings"});
		}
		
		function removeTempSettings() {
			for (key in localStorage) {
				if (key.startsWith("$setting.temp-"))
					delete localStorage[key];
			}
		}
		
		function initControlsRelatingToLocalStorage() {			
			// Data loading and saving behavior are defined in initControlsRelatingToLocalStorage functions
			// with specific class pattern on html elements.
			/*
			if (localStorage["$setting.cloud-url"])
				$("#cloudsave-url").val(localStorage["$setting.cloud-url"]);
			if (localStorage["$setting.cloud-path"])
				$("#cloudsave-path").val(localStorage["$setting.cloud-path"]);
			if (localStorage["$setting.cloud-key"])
				$("#cloudsave-key").val(localStorage["$setting.cloud-key"]);
			if (localStorage["$setting.cloud-lastsave"])
				$("#cloudrestore-key").val(localStorage["$setting.cloud-lastsave"]);
			*/
			function setUIValue(node, value) {
				if (node.is("span")) {
					var target = node.attr("target");
					$(`input:radio[name='${target}'][value='${value}']`)[0].checked = true; //.attr("checked", true);
				} else {
					node.val(value);
				}
				if (node.hasClass("color")) {
					// update background color for the color picker
					node[0].focus();
					setTimeout(function() {node[0].blur();}, 10);
				}
			}
			function getUIValue(node) {
				if (node.is("span")) {
					var target = node.attr("target");
					return $(`input:radio[name='${target}']:checked`).val();
				} else {
					return node.val();
				}
			}
			var refreshOnSaveAnOption = localStorage["$setting.misc_refreshOnSaveAnOption"] == "true";
			var refreshOnSaveAllOptions = localStorage["$setting.misc_refreshOnSaveAllOptions"] == "true";
			
			$(".localstorage_itemvalue").each(function(ind, ele) {
				var node = $(this);
				var key = $(this).attr("target");
				var defaultValue = $(this).attr("defaultvalue");
				if (!(defaultValue == undefined))
					defaultSettings[key] = defaultValue;
				
				if (localStorage[key])
					setUIValue(node, localStorage[key]);
					
				node.parents(".localstorage_item").first().find(".localstorage_saveitem").click(function() {
					localStorage[key] =  getUIValue(node);
					showMessage("The setting is saved.");
					updateSettings();
					if (refreshOnSaveAnOption)
						location.reload();
				});
				node.parents(".localstorage_item").first().find(".localstorage_resetitem").click(function() {
					if (!confirm("Do you really want to set to default value: " + defaultValue + "?"))
						return;
					setUIValue(node, defaultValue);
					localStorage[key] = defaultValue;
					showMessage("The setting is set to default.");
					updateSettings();
					if (refreshOnSaveAnOption)
						location.reload();
				});
			});
			
			$("select.localstorage_itemvalue").change(function() {
				var node = $(this);
				var value = node.val();
				var key = node.attr("target");
				localStorage[key] = value;
			});
			
			$(".localstorage_saveall").click(function() {
				$(this).parents(".localstorage_block").find(".localstorage_itemvalue").each(function(index, ele) {
					var node = $(ele);
					var target = node.attr('target');
					var value =  getUIValue(node);
					localStorage[target] = value;
				});
				showMessage("All settings are saved.");
				updateSettings();
				if (refreshOnSaveAllOptions)
					location.reload();
			});
			$(".localstorage_resetall").click(function() {
				if (!confirm("Do you really want to set all settings to default values?"))
					return;
				$(this).parents(".localstorage_block").find(".localstorage_itemvalue").each(function(index, ele) {
					var node = $(ele);
					var target = node.attr('target');
					var value = node.attr('defaultvalue');
					setUIValue(node, value);
					localStorage[target] = value;
				});
				showMessage("All settings are set to default.");
				updateSettings();
				if (refreshOnSaveAllOptions)
					location.reload();
			});
		}
				
		
		// *******************************************************
		// **               Find and Replace                    **
		// *******************************************************
		var findReplaceDialog_target = 0;
		var findReplaceDialog_replaceKey = null;
		var findReplaceDialog_opened = false;
		var findReplaceDialog_inited = false;
		function dummyMapFunc(s) {
			return s;
		}
		
		function findReplaceDialog_setMapFunc(func) {
			switch(findReplaceDialog_target) {
			case 0:
				// Site scripts.
				mapSiteScriptFunc = func;
				break;
			case 1:
				// Content scripts.
				mapContentScriptFunc = func;
				break;
			}
		}
		
		function findReplaceDialog_getReplaceFunc() {
			switch(findReplaceDialog_target) {
			case 0:
				// Site scripts.
				return mapSiteScriptFunc = findReplaceDialog_mapReplacedScript;
			case 1:
				// Content scripts.
				return mapContentScriptFunc = findReplaceDialog_mapReplacedScript;
			}
		}
		
		function showFindReplaceDialog() {
			// If a find and search dialog is already opened, close it before open a new one.			
			var dialogDiv = $("#findReplaceDialog");
			if (findReplaceDialog_opened) {
				findReplaceDialog_cancel();
				dialogDiv.dialog("close");
			}
			
			var target = $(this).attr("target");
			switch(target) {
			case "Site Scripts":
				target = "Site Scripts";
				findReplaceDialog_target = 0;
				$(".findDialog-for-site-script").show();
				break;
			case "Content Scripts":
				target = "Content Scripts";
				findReplaceDialog_target = 1;
				$(".findDialog-for-site-script").hide();
				break;
			}
			$("#findDialog-target").text(target);
			
			if (findReplaceDialog_inited) {
				dialogDiv.dialog("open");
			} else {
				findReplaceDialog_inited = true;
				dialogDiv.css("top","0px").dialog({
						title: "Find and Replace (Double click to toggle)",
						width: 340,
						
						close: findReplaceDialog_cancel
					});
				$("#findDialog-findstring").change(function(event) {
					var findstr = $("#findDialog-findstring").val() ;
									// + String.fromCharCode(event.which);
					
					if ($("#findDialog-replacement").val() == "")
						$("#findDialog-replacement").val(findstr);
				});
			}
			findReplaceDialog_opened = true;
		}
		
		function findReplaceDialog_updateReplaceKey() {
			findReplaceDialog_replaceKey = {};
			
			var mode = $("#findDialog-searchfor")[0].selectedIndex;
			var targetType = "js";
			if (mode == 1) 
				targetType = "css";
			else if (mode == 2) 
				targetType = "js+css";
						
			var pattern = $("#findDialog-findstring").val();
			var method  = $("#findDialog-searchmethod")[0].selectedIndex;
			if (method == 0) {
				// Search for strings
				pattern = pattern.replace(/([\(\)\[\]\{\}\^\$\+\-\*\?\.\"\'\|\/\\])/g, "\\$1");
			} else {
			}
			
			var regexp_i = $("#findDialog-regex-i")[0].checked;
			var regexp_g = $("#findDialog-regex-g")[0].checked;
			var regexp_m = $("#findDialog-regex-m")[0].checked;
			var flags = "";
			if (regexp_i)
				flags += "i";
			if (regexp_g)
				flags += "g";
			if (regexp_m)
				flags += "m";
			
			pattern = new RegExp("([\\s\\S]*?)" + pattern, flags);
			
			var replacement = $("#findDialog-replacement").val();
			var replacementPattern = new RegExp("([\\s\\S]*?)" + 
				replacement.replace(/([\(\)\[\]\{\}\^\$\+\-\*\?\.\"\'\|\/\\])/g, "\\$1"), flags);
				
			console.log(pattern);
			
			var searchRange = $("#findDialog-find-range").val();
			
			findReplaceDialog_replaceKey["targetType"] 	= targetType;
			findReplaceDialog_replaceKey["pattern"]	 	= pattern;
			findReplaceDialog_replaceKey["replacement"] = replacement;
			findReplaceDialog_replaceKey["replacementPattern"] = replacementPattern;
			findReplaceDialog_replaceKey["andorAutostart"] = $("#findDialog-andor-autostart").val(); // and, or
			findReplaceDialog_replaceKey["autostart"] = $("#findDialog-filter-autostart").val(); // true, false, any
			findReplaceDialog_replaceKey["containsDefaultScript"] = $("#findDialog-contains-default-script").val() == "true";
			findReplaceDialog_replaceKey["setAutostart"] = $("#findDialog-set-autostart").val(); // true, false, unchanged
			
			
			switch(findReplaceDialog_target) {
			case 0:
				// Site scripts.
				if (searchRange == "current") { findReplaceDialog_replaceKey["name"] = selectedTitle };
				break;
			case 1:
				// Content scripts
				if (searchRange == "current") { findReplaceDialog_replaceKey["name"] = selectedContentScript };
				findReplaceDialog_replaceKey["targetType"] 	= "js";
				findReplaceDialog_replaceKey["setAutostart"] = "unchanged";
				break;
			}
		}
		
		function findReplaceDialog_refreshView(options) {
			switch(findReplaceDialog_target) {
			case 0:
				// Site scripts.
				findReplaceDialog_updateSiteScriptsView(options);
				break;
			case 1:
				// Content scripts
				findReplaceDialog_updateContentScriptsView(options);
				break;
			}
		}
		
		function findReplaceDialog_performReplace() {
			switch(findReplaceDialog_target) {
			case 0:
				// Site scripts.
				findReplaceDialog_replaceSiteScripts();
				break;
			case 1:
				// Content scripts
				findReplaceDialog_replaceContentScripts();
				break;
			}		
		}
		
		function findReplaceDialog_find() {
			findReplaceDialog_updateReplaceKey();
			
			findReplaceDialog_setMapFunc(findReplaceDialog_mapFoundScript);
			
			// Refresh views
			findReplaceDialog_refreshView({reloadlist:true, filter:true, switcheditor:true, alerteditor:false});
		}
		
		function findReplaceDialog_preview() {
			findReplaceDialog_updateReplaceKey();
			
			findReplaceDialog_setMapFunc(findReplaceDialog_getReplaceFunc());
			
			// Refresh views
			findReplaceDialog_refreshView({reloadlist:true, filter:true, switcheditor:true, alerteditor:true});
		}
		
		function findReplaceDialog_cancel() {	
			findReplaceDialog_opened = false;
			
			// Reset replacement stuff	
			findReplaceDialog_replaceKey = null;
			findReplaceDialog_setMapFunc(dummyMapFunc);
						
			// Refresh views
			findReplaceDialog_refreshView({reloadlist:true, filter:false, switcheditor:false, alerteditor:false});
		}
		
		function findReplaceDiailog_do() {
			findReplaceDialog_updateReplaceKey();
			
			// Do the replace work on every script.
			findReplaceDialog_setMapFunc(dummyMapFunc);
			findReplaceDialog_performReplace();
							
			// Refresh views			
			findReplaceDialog_refreshView({reloadlist:false, filter:false, switcheditor:false, alerteditor:false});
			
			// Reset replacement stuff
			findReplaceDialog_replaceKey = null;
		}
				
		function findReplaceDialog_updateSiteScriptsView(options) {		
			// Clear search markers
			highlightMatchesInEditor(editorJs, []);
			highlightMatchesInEditor(editorCss, []);
				
			// Reload site script list: only matching scripts or all scripts.
			if (options.reloadlist)
				if (options.filter) {
					loadSiteScripts(findReplaceDialog_replaceKey, findReplaceDialog_replaceKey["targetType"],
					  function(name) {
					  	if (findReplaceDialog_replaceKey["containsDefaultScript"]) {
							return isSiteScriptName(name) || name == "Default"; 
					  	} else {
							return isSiteScriptName(name); 
					  	}
					  } );
				} else {
					loadSiteScripts();
				}
			
			// Select the script selected before. If none is selected, select the first script.
			var site = selectedTitle;
			var selectedSiteMenu = $(`#site-list .jstbox[data-site='${site}']`).click();
			if (selectedSiteMenu.length < 1)
				$("#site-list .jstbox:first").click();
			
			// Switch editor to JS/CSS according to search target
			if (options.switcheditor) {
				if (findReplaceDialog_replaceKey["targetType"] == "js") {
					$("#tabs-sss .tabs > ul li:eq(0)").click();
				} else if (findReplaceDialog_replaceKey["targetType"] == "css") {
					$("#tabs-sss .tabs > ul li:eq(1)").click();
				}
			}
			
			// Update some UI according to button pressed in find and replace dialog
			if (options.alerteditor) {
				$("#tabs-sss .CodeMirror").addClass("findReplacePreview");//.css("background-color", "#ffeeee");
			} else {
				$("#tabs-sss .CodeMirror").removeClass("findReplacePreview");//.css("background-color", "");
			}
			
			//
		}
		
		function findReplaceDialog_updateContentScriptsView(options) {			
			// Clear search markers
			highlightMatchesInEditor(editorDynScript, []);
			
			// Reload content script list: only matching scripts or all scripts.
			if (options.reloadlist)
				if (options.filter) {
					//var filter = {content:findReplaceDialog_replaceKey["pattern"]};
					//if (findReplaceDialog_replaceKey["name"] ) { filter.name = findReplaceDialog_replaceKey["name"]; }
					//loadAllContentScripts(filter);
					loadAllContentScripts(findReplaceDialog_replaceKey);
				} else {
					loadAllContentScripts();
				}
			
			// Select the script selected before. If none is selected, select the first script.
			var name = selectedContentScript;
			var selectedSiteMenu = $(`#contentscript-menu .jstbox[name='${name}']`).click();
			if (selectedSiteMenu.length < 1)
				$("#contentscript-menu .jstbox:first").click();
			
			// Update some UI according to button pressed in find and replace dialog
			if (options.alerteditor) {
				$("#tabs-dcs .CodeMirror").addClass("findReplacePreview");//.css("background-color", "#ffeeee");
			} else {
				$("#tabs-dcs .CodeMirror").removeClass("findReplacePreview");//.css("background-color", "");
			}
		}
		
		// Highlight matches in CodeMirror editor.
		// cm is editor, and indexes is an array of {from, to}
		function highlightMatchesInEditor(cmeditor, indexes) {
			var pos = [];
			
			// remove markers
			if (cmeditor.searchMarkers) {
				for (var i = 0; i < cmeditor.searchMarkers.length; ++ i) {
					cmeditor.searchMarkers[i].clear();
				}
			}
			cmeditor.searchMarkers = [];
			
			// highlight matches
			for (var i = 0; i < indexes.length; ++ i) {
				var from = cmeditor.posFromIndex(indexes[i].from);
				var to = cmeditor.posFromIndex(indexes[i].to);
				pos.push({from:from, to:to});
				var marker = cmeditor.markText(from, to, {className: "highlighted-background"});
				cmeditor.searchMarkers.push(marker);
			}
			
			// set markers for highlights on scroll bar
			if (cmeditor.annsclbar) {
				try {	cmeditor.annsclbar.clear(); } catch(ex) {}
				cmeditor.annsclbar = null;
			}
			cmeditor.annsclbar = cmeditor.annotateScrollbar("highlighted-scrollbar");
			cmeditor.annsclbar.update(pos);
		}
		
		// Pattern is assigned in findReplaceDialog_updateReplaceKey
		// and should be like /([\s\S]*?)msg/g in which msg is the content to be searched.
		// The third parameter can be omitted.
		function getIndexesOfMatching(text, pattern, replacement) {	
			// Find the first occurence
			var matches = [], index = 0, repllen = replacement !== undefined ? replacement.length : 0;
			text.replace(pattern, function(str, group1) {
				var len = str.length, g1len = group1 ? group1.length : 0;
				var matchlen = len - g1len;
				var offset = replacement !== undefined ? repllen - matchlen : 0;
				var from = index + g1len, to = from + matchlen + offset;
				index += len + offset;
				matches.push({from:from, to:to});
			});
			
			if (pattern.global)
				return matches;
			else
				return matches.slice(0, 1);
		}
		
		function getHighlightMatchingLinesInEditor(options, editor, text, pattern, replacement) {
			if (!options || options.command !== "HightlightMatchedText")
				return [];
				
			return getIndexesOfMatching(text, pattern, replacement);			
		}
		
		// Invoked by loadContentScript and selectSite
		function findReplaceDialog_mapFoundScript(s, options) {
			var targetType	= findReplaceDialog_replaceKey["targetType"];
			var pattern 	= findReplaceDialog_replaceKey["pattern"];
			
			var replaceScript = targetType.indexOf("js") > -1;
			var replaceCss = targetType.indexOf("css") > -1;
			
			if (replaceScript) {
				options.indexes = getHighlightMatchingLinesInEditor(options, options.editor, s.script, pattern);
			}
			
			if (replaceCss) {
				options.indexes2 = getHighlightMatchingLinesInEditor(options, options.editor2, s.css, pattern);
			}
							
			return s;	
		}
		
		// Invoked by loadContentScript and selectSite
		// Also invoked by findReplaceDialog_replaceContentScripts and findReplaceDialog_replaceSiteScripts
		function findReplaceDialog_mapReplacedScript(s, options) {
			var targetType	= findReplaceDialog_replaceKey["targetType"];
			var pattern 	= findReplaceDialog_replaceKey["pattern"];
			var replacement = findReplaceDialog_replaceKey["replacement"];
			var replacementPattern = findReplaceDialog_replaceKey["replacementPattern"];
			var setAutostart = findReplaceDialog_replaceKey["setAutostart"]; // true, false, unchanged
			
			var replaceScript = targetType.indexOf("js") > -1;
			var replaceCss = targetType.indexOf("css") > -1;
			
			if (replaceScript) {
				var oldtext = s.script;
				s.script = s.script.replace(pattern, "$1" + replacement);
				options.indexes = getHighlightMatchingLinesInEditor(options, options.editor, oldtext, pattern, replacement);
			}
			
			if (replaceCss) {
				var oldtext = s.css
				s.css = s.css.replace(pattern, "$1" + replacement);
				options.indexes2 = getHighlightMatchingLinesInEditor(options, options.editor2, oldtext, pattern, replacement);
			}
				
			if (setAutostart != "unchanged")
				setAutostart == "true" ? s.autostart = true : s.autostart = false;
				
			if (options && options.command == "HightlightMatchedText") {
				var editor = options.editor, editor2 = options.editor2;
			}
			
			return s;
		}
		
		function findReplaceDialog_replaceSiteScripts() {		
			findReplaceDialog_updateReplaceKey();
			var name = findReplaceDialog_replaceKey["name"];
			
			for(v in localStorage) {	
				if (name && name != v)
					continue;
					
				try {
					var isSiteScript = false;		
					if (findReplaceDialog_replaceKey["containsDefaultScript"]) {
						isSiteScript = isSiteScriptName(v) || v == "Default"; 
					} else {
						isSiteScript = isSiteScriptName(v); 
					}
					if (!isSiteScript)
						continue;
					
					var lsd = JSON.parse(localStorage[v]);
					findReplaceDialog_mapReplacedScript(lsd);
						
					localStorage[v] = JSON.stringify(lsd);
				} catch(e) {
					console.log(`Invalid! localStorage[${v}]=${localStorage[v]}`);
				}
			}
		}
		
		function findReplaceDialog_replaceContentScripts() {	
			findReplaceDialog_updateReplaceKey();
			var name = findReplaceDialog_replaceKey["name"];
			
			for(v in localStorage) {
				if (name && ("$cs-"+name) != v)
					continue;
					
				try {
					if (!isContentScriptName(v))
						continue;
					
					var lsd = JSON.parse(localStorage[v]);
					findReplaceDialog_mapReplacedScript(lsd);
						
					localStorage[v] = JSON.stringify(lsd);
				} catch(e) {
					console.log(`Invalid! localStorage[${v}]=${localStorage[v]}`);
				}
			}
		}
				
		
		// *******************************************************
		// **                Cloud Storage                      **
		// *******************************************************
		
		function showCloudStorageSrc() {
			window.open("cloudsave.php", "cloudsavesource");
		}
		
		function cloudStorageShowKey() {
			alert($(this).prev().val());
		}
		
		function cloudGetSaveObj() {
			var url = localStorage["$setting.cloud-url"];
			var path = localStorage["$setting.cloud-path"];
			var passphrase = localStorage["$setting.cloud-passphrase"];
			var keyiv = localStorage["$setting.cloud-keyiv"];
			
			return new CloudSave(url, path, passphrase, keyiv);
		}
		
		function cloudStorageGenKey() {
			var key = cloudGetSaveObj().genKeyIV();
			
			$("#cloudsave-key").val(key);
			$(this).next().text(key);
			alert("Copy the following key value and change the $PRIVATEKEY variable in cloudsave.php.\n" + key);
		}
		
		function cloudBackup() {
			showMessage("Start backing configuration up in cloud.");	
			var data = JSON.stringify(localStorage);
			data = formatter.formatJson(data)
			var filename = (new Date()).Format("yyyyMMdd-hhmmss");
			
			cloudGetSaveObj().backupSingleFile(filename, data, function(data) {
				// on ok
					localStorage["$setting.cloud-lastsave"] = filename;
					$("#cloudrestore-key").val(filename);
					showMessage("Configurations are backup up in cloud.");
				
			}, 	function(err) {
				// on err
					alert("Failed to list configurations. \n" + err.message);
			});
		}
		
		function cloudRestore() {
			var key = $("#cloudrestore-key").val();
			if (!confirm("All current settings and scripts will be erased. \nAre you sure you want to restore with configuration named " + key + "?"))
				return;
				
			showMessage("Start backing configuration up in cloud.");	
			
			cloudGetSaveObj().restoreFromSingleFile(key, function(data) {
				// on ok
				console.log(data);
				var values = JSON.parse(data);
				for (v in localStorage) {
					delete localStorage[v];
				}
				for (v in values) {
					localStorage[v] = values[v];
					/*console.log(v+"="+values[v]);*/
				}
				alert("Selected configuration is restored.");
				location.reload();
				
			});
		}
		
		function cloudStorageList() {
			cloudGetSaveObj().list(function(data) {
				// on ok
				cloudStorageAddKeysToUI(data.result);					
				showMessage("Configurations are listed out of cloud.");
				
			}, 	function(err) {
				// on err
					alert("Failed to list configurations. \n" + err.message);
			});
		}
		
		function cloudStorageView() {
			var key = $("#cloudrestore-key").val();
			
			cloudGetSaveObj().view(key, function(data) {
				// on ok
				$("#settings-list .jstbox:eq(1)").click();
				showConfiguration(data);
				
			}, 	function(err) {
				// on err
					alert("Failed to view configurations. \n" + err.message);
			});
		}
		
		function cloudStorageDelete() {
			var selectmode = $("#cloudtoggleselect").attr("data-selectmode");
			if (selectmode == "radio") {
				var key = $("#cloudrestore-key").val();
				if (!confirm("Are you sure you want to delete configuration named " + key + "?"))
					return;
					
				cloudStorageDeleteItem(key);
			} else {
				var selectedKeys = [];
				$("#cloudrestore-keys input:checkbox:checked").each(function(index, ele) {selectedKeys.push($(ele).val()); });
				//console.log(selectedKeys);
				
				if (selectedKeys.length < 1) {
					alert("No configuration is selected");
					return;
				}
				
				if (!confirm(`Are you sure you want to delete ${selectedKeys.length} configurations named \n${selectedKeys.join("\n")}?`))
					return;
				
				for (var i = 0; i < selectedKeys.length; ++ i) {
					cloudStorageDeleteItem(selectedKeys[i]);
				}
			}
		}
		
		function cloudStorageDeleteItem(key) {	
			cloudGetSaveObj().remove(key, function(data) {
				// on ok
					$(`#cloudrestore-keys div.key[name='${key}']`).remove();
					showMessage("Selected onfiguration is deleted.");
				
			}, 	function(err) {
				// on err
					alert("Failed to delete the configuration. \n" + data.message);
			});
		}
		
		function cloudStorageLeaveLast10() {
			cloudGetSaveObj().leaveLast10(function(data) {
				// on ok
					$(`#cloudrestore-keys div.key[name='${key}']`).remove();
					showMessage("Selected onfiguration is deleted.");
				
			}, 	function(err) {
				// on err
					alert("Failed to delete the configuration. \n" + data.message);
			});
		}
		
		function cloudToggleSelect() {
			var button = $("#cloudtoggleselect");
			var type = button.attr("data-selectmode");
			if (type == "checkbox") {
				$("#cloudrestore-keys input:checkbox").attr("type", "radio");
				button.attr("data-selectmode", "radio");
				button.val("Multiple Select");
			} else {
				$("#cloudrestore-keys input:radio").attr("type", "checkbox");
				button.attr("data-selectmode", "checkbox");
				button.val("Single Select");
			}
		}
		
		function cloudStorageSaveSettings() {
			// localStorage["$setting.cloud-url"] = $("#cloudsave-url").val();
			// localStorage["$setting.cloud-path"] = $("#cloudsave-path").val();
			// localStorage["$setting.cloud-key"] = $("#cloudsave-key").val();
			
			// Data loading and saving behavior are defined in initControlsRelatingToLocalStorage functions
			// with specific class pattern on html elements.
			
			var keyiv = $("#cloudsave-keyiv").val();
			if (keyiv.length != 16)
				alert("Invalid key-iv length. The key has to be a text with 16 characters.");
			else
				showMessage("Cloud storage settings saved");
		}
		
		function cloudStorageAddKeysToUI(keys) {
			var selectmode = $("#cloudtoggleselect").attr("data-selectmode");
			$("#cloudrestore-keys").children("*").remove();
			for ( var i=0; i<keys.length; ++i) {
				var key = keys[i];
				var inputType = selectmode == "radio" ? "radio" : "checkbox";
				// console.log(key);
				// <div name="Key1" class="key"><input type="radio" name="cloudrestore-keychosen"><span>20151012-121003</span></div>
				$("#cloudrestore-keys").append(
					`<div name="${key}" class="key" name="${key}"><input type="${inputType}" name="cloudrestore-keychosen" value="${key}"><span>${key}</span></div>`
				);
				$("#cloudrestore-keys span").click(function() { $(this).prev().click(); });
				$("#cloudrestore-keys input:radio").click(cloudStorageKeyClicked);
			}
		}
		
		function cloudStorageKeyClicked() {
			$("#cloudrestore-key").val($(this).val());
		}
		
		
		
		// *******************************************************
		// **                 JSON Viewer                       **
		// *******************************************************
		
		
		function loadFile(fileIinputSelector, textFunc) {			
			var file = $(fileIinputSelector)[0].files[0];
			if (typeof file === 'undefined') {
				alert("Please select a file first.");
			} else {
				var reader = new FileReader();
				reader.onload = function() {
					text = this.result;
					textFunc(text);
				};
				reader.readAsText(file);
			}
		}
		
		function showConfiguration(text) {
			var newText = formatter.formatJson(text) +"\n\n\nValue with current key is:\n";
			editorJsonFile.setValue(newText);
			jsonFileAnchor = newText.length;
			window.__JScriptTricks_JsonViewer = {};
			var obj = JSON.parse(text);
			window.__JScriptTricks_JsonViewer.obj = obj;
			console.log(obj);
			
			var container = $("#json-viewer-site-list");
			container.text("");
			for (v in obj) {
				container.append(`<input type="button" value="${v}" name="${v}" class="json-viewer-site"/>`);
			}
			$("input:button.json-viewer-site").click(showSiteScript);
		}
		
		var jsonFileAnchor = 0;
		function loadJsonFile() {
			loadFile("#jsonFilePath", showConfiguration);
		}
		
		function showSiteScript() {
			var obj = window.__JScriptTricks_JsonViewer.obj;
			var value = obj[this.name];
			var lastPos = editorJsonFile.getValue().length;
			var text = value + "\n\nJavascript assignment statement for this key (as shown in local storage viewer in Chrome) is:\n			";
			text += `localStorage['${this.name}'] = decodeURIComponent("${encodeURIComponent(value)}") ;` + "\n";
			editorJsonFile.replaceRange(text, editorJsonFile.posFromIndex(jsonFileAnchor), editorJsonFile.posFromIndex(lastPos));
			
			try {
				var data = JSON.parse(value);
				var script = data['script'];
				if (script) {
					$('#json-viewer-tabs > ul > li:eq(1) a').click();
					editorJsonObjectValue.setValue(script);
				}
			} catch (exception) {}
		}
		
		function extractJsonObject() {
			var obj = window.__JScriptTricks_JsonViewer.obj;
			var key = $('#jsonObjPath').val();
			var data = JSON.parse(obj[key]);
			var script = data['script']
			editorJsonObjectValue.setValue(script);
		}
		
		// *******************************************************
		// **              Dynamic Content Scripts              **
		// *******************************************************
		var __index_cs = 1;
		var selectedContentScript = "";
		var currentSavedStateDCS = "";
		
		function addContentScript() {			
			if (!contentScriptSaved())
				return;
				
			var name = prompt("Script name:");
			if (!name)
				return;
			name = name.trim();
			if (! /^[0-9a-zA-Z_]+$/.test(name)) {
				alert("Invalid name!\nName should be a non-empty string consists of only 26 letters, 10 digits and underscore.");
				return;
			}
				
			if (checkDuplicateContentScript(name)) {
				alert("A script with the given name already exists. Please change a name.");
				return;
			}	

			selectedContentScript = name;
			var index = getNextContentScriptIndex();
			$("#dcsgroup").val("");
			$("#dcsindex").val(index);
			$("#dcstitle").val(name);
			$("#dcsinclude").val("");
			
			addContentScriptMenu(name, index, "");
			
			currentSavedStateDCS = "";
			editorDynScript.setValue("");
			
			saveContentScript();
			
			updateContentScriptForContextMenu();
			
		}
					
		function loadContentScriptTemplate() {
			var selectNode = $("#dcsgencodebytemplate");
			for (key in template_content_script_all) {
				selectNode.append(`<option value="${key}">${key}</option>`);
			}
			
			
		}
		
		function generateContentScript() {
			if (this.selectedIndex > 0 && editorDynScript.getValue() &&
				!confirm("WARNING!!!\nThis operation will remove your existing code!\nDo you really want to proceed?") )
				return;
			
			var tmplName = this.value;
			var tmpl = template_content_script_all[tmplName];
			if (tmpl) {
				var context = {name: selectedContentScript, comments: {define: "", run: ""}};
				if (localStorage["$setting.contentcripts_generateComments"] != "false") {
					context.comments.define = template_content_script_comment_define;
					context.comments.run = template_content_script_comment_run;
				}
				var code = compile_template(tmpl, context);
				editorDynScript.setValue(code);
				setSelectionInEditor(editorDynScript, true);
			}
		}
		
		function saveContentScript() {
			console.log("Save the content script.");
			
			if(selectedContentScript == "")
				return;
				
			if (mapContentScriptFunc == findReplaceDialog_mapReplacedScript) {
				saveDisabledForPreviewFunc();
				return;
			}
			
			var key = "$cs-" + selectedContentScript;
			var dcstitle = editorDynScript.getValue() ;
			var group = $("#dcsgroup").val();
			var title = $("#dcstitle").val();
			var sfile = $("#dcsinclude").val();
			var index = $("#dcsindex").val();
			
            var tmp =  {"index":index, "group":group, "title":title, "sfile":sfile, "script": dcstitle};

			localStorage[key] = JSON.stringify(tmp);
			$(`#contentscript-menu > .jstbox[name='${selectedContentScript}']`).attr("index", index)
				.find(".index").text(index);
				
			$(`#contentscript-menu > .jstbox[name='${selectedContentScript}'] .group`).text(group + "/");
			
			currentSavedStateDCS = editorDynScript.getValue();
			
			updateContentScriptForContextMenu();
			
			var noErrorsFound = checkScriptSyntax(dcstitle);
			showMessage("Error found in current content script!");
			if (!noErrorsFound) {
				console.log(JSHINT.data());
			} else {			
				showMessage("Content script saved!");
			}
		}
		
		function renameContentScript() {
			console.log('renameContentScript');
			
			if(selectedContentScript == "")
				return;
			
			if (!contentScriptSaved(true))
				if (confirm("Script is modified. Do you want to save first?"))
					saveContentScript();
				else
					return;
			
			var newName = "";
			
			do {
				newName = prompt("New name:", selectedContentScript);			
				if (!newName)
					return;	
						
				newName = newName.trim();
				if (checkDuplicateContentScript(newName)) {
					alert("A script with the given name already exists. Please change a name.");
				} else {
					break;
				};
			} while (true);
				
			var key = "$cs-" + selectedContentScript;
			var data = localStorage[key];
			var lsd = JSON.parse(data);
			var script = lsd.script;
			var name = selectedContentScript;
			
			//var commentRegExp = "(\\/\\*([\\s\\S]*?)\\*\\/|([^:]|^)\\/\\/(.*)$)";
			script = script.replace(new RegExp("(define\\s*\\(\\s*['`\"]#)"+name+"(['`\"])"), '$1'+newName+'$2');
			script = script.replace(new RegExp("((\\brun\\s*\\(\\s*\\[[^\\]]*)['`\"]#)"+name+"(['`\"][^\\]]*\\]\\s*,)", "g"), '$1'+newName+'$3')
			
			lsd.script = script;
			editorDynScript.setValue(script);
			
			localStorage["$cs-"+newName] = JSON.stringify(lsd);
			delete localStorage[key];
			
			$(`#contentscript-menu > .jstbox[name='${selectedContentScript}']`).attr("name", newName)
				.find(".jsttitle .name").text(newName);
			selectedContentScript = newName;
			
			saveContentScript();
			
			updateContentScriptForContextMenu();
		}
		
		function deleteContentScript() {
			console.log('deleteContentScript');
			if (selectedContentScript == "")
				return;
			
			if (confirm(`Do you realy want to delete content script ${selectedContentScript}?`)) {
				delete localStorage["$cs-"+selectedContentScript];
				$(`#contentscript-menu > .jstbox[name='${selectedContentScript}']`).remove();

				$("#dcsgroup").val("");	
				$("#dcstitle").val("");
				$("#dcsinclude").val("");						
				$("#dcsindex").val("");
				editorDynScript.setValue("");
				currentSavedStateDCS = editorDynScript.getValue();
			}
			
			updateContentScriptForContextMenu();
		}
		
		function sortContentScript() {
			console.log('sortContentScript');
			$("#contentscript-menu > .jstbox").remove();
			loadAllContentScripts();
			
			updateContentScriptForContextMenu();
		}
		
		function moveUpContentScript() {
			console.log('moveUpContentScript');
			if (selectedContentScript == "")
				return;
			
			var node = $(`#contentscript-menu > .jstbox[name='${selectedContentScript}']`);
			var targetNode = node.prev();
			var target = targetNode[0];
			if (!target) {
				alert("This is already the first script.");
				return;
			}
			
			var targetName = $(target).attr("name");
			var targetKey = "$cs-"+targetName;
			var nodeKey = "$cs-"+selectedContentScript;
			var targetData = JSON.parse(localStorage[targetKey]);
			var targetIndex = targetData["index"];
			var nodeData = JSON.parse(localStorage[nodeKey]);
			var nodeIndex = nodeData["index"];
			var temp = nodeIndex;
			nodeData["index"] = targetIndex;
			targetData["index"] = temp;
			localStorage[targetKey] = JSON.stringify(targetData);
			localStorage[nodeKey] = JSON.stringify(nodeData);
			
			$("#dcsindex").val(targetIndex);
			targetNode.attr("index", targetData["index"])
				.find(".index").text(targetData["index"]);
			node.detach().insertBefore(`#contentscript-menu > .jstbox[name='${targetName}']`)
				.click(loadContentScript).attr("index", nodeData["index"])
				.find(".index").text(nodeData["index"]);
						
			updateContentScriptForContextMenu();
		}
		
		function moveDownContentScript() {
			console.log('moveDownContentScript');
			if (selectedContentScript == "")
				return;
			
			var node = $(`#contentscript-menu > .jstbox[name='${selectedContentScript}']`);
			var targetNode = node.next();
			var target = targetNode[0];
			if (!target) {
				alert("This is already the last script.");
				return;
			}			
			
			var targetName = $(target).attr("name");
			var targetKey = "$cs-"+targetName;
			var nodeKey = "$cs-"+selectedContentScript;
			var targetData = JSON.parse(localStorage[targetKey]);
			var targetIndex = targetData["index"];
			var nodeData = JSON.parse(localStorage[nodeKey]);
			var nodeIndex = nodeData["index"];
			var temp = nodeIndex;
			nodeData["index"] = targetIndex;
			targetData["index"] = temp;
			localStorage[targetKey] = JSON.stringify(targetData);
			localStorage[nodeKey] = JSON.stringify(nodeData);
			
			$("#dcsindex").val(targetIndex);
			targetNode.attr("index", targetData["index"])
				.find(".index").text(targetData["index"]);
			node.remove().insertAfter(`#contentscript-menu > .jstbox[name='${targetName}']`)
				.click(loadContentScript).attr("index", nodeData["index"])
				.find(".index").text(nodeData["index"]);
			
			updateContentScriptForContextMenu();
		}
		
		function reindexContentScript() {
			console.log('reindexContentScript');
			$("#contentscript-menu > .jstbox").remove();
			var index = 0;
			loadAllContentScripts_internal(true, function(key, name, item) {
				//console.log(name + " @ " + index + " = " + JSON.stringify(item));
				item.index = index + "";
				localStorage[key] = JSON.stringify(item);
				$(`#contentscript-menu > .jstbox[name='${name}']`).attr("index", index)
					.find(".index").text(index);
				index++;
			});
		}
		
		function updateContentScriptForContextMenu() {
			console.log('updateContentScriptForContextMenu');
			
			var groups = {};
			loadAllContentScripts_internal(false, function(key, name, item) {
				var group = item["group"];
				if (!groups[group]) {
					groups[group] = [];
				}
				groups[group].push({"title":item.title, "file":key});
			});
			
			//console.log(groups);
			
			chrome.runtime.sendMessage({method: "UpdateContextMenu", data:groups});
		}
		
		function addContentScriptMenu(name, index, group) {
			// console.log('addContentScriptMenu: ' + name);
			if (!group)
				group = "";

			var container = $("#contentscript-menu");
			container.find("> .jstbox").removeClass("selected");
			var node = $(`<div class="jstbox contentScriptKey selected" name="${name}" title="${name}" index="${index}">
					<div class="jsttitle" style="display:inline;font-variant:normal;position:relative;">
						<nobr>
						<span class="index">${index}</span>
						<span>-</span>
						<span class="name">${name}</span>
						</nobr>
						<div class="group">${group}/</div>
					</div>
				</div>
			`).appendTo(container).click(loadContentScript);
			container[0].scrollTop += 32;  //container.height();
		}
		
		function checkDuplicateContentScript(name) {
			return localStorage["$cs-" + name];
		}
		
		function loadContentScript() {
			var name = $(this).attr('name');
			console.log("loadContentScript: " + name);
			
			if (!contentScriptSaved())
				return;
			
			$("#contentscript-menu > .jstbox").removeClass("selected");
			$(this).addClass("selected");
			
			selectedContentScript = name;
			var value = localStorage["$cs-"+name];
			try {
				var data = JSON.parse(value);
			} catch (exception) {
				console.error(value);
				return;
			}
			
			var mapOptions = {command:"HightlightMatchedText", editor:editorDynScript};
			data = mapContentScriptFunc(data, mapOptions);
			
			$("#dcsgroup").val(data.group);
			$("#dcstitle").val(data.title);
			$("#dcsinclude").val(data.sfile);	
			$("#dcsindex").val(data.index);
			$("#dcsgencodebytemplate")[0].selectedIndex = 0;	
			editorDynScript.setValue(data.script);
			
			currentSavedStateDCS = data.script;
			editorDynScript.clearHistory();
			
			if (mapOptions.indexes) {
				highlightMatchesInEditor(mapOptions.editor, mapOptions.indexes);
			}
			
			// Switch from Meat data editor to script editor.
			$("#tabs-dcs .tabs > ul li:eq(0)").click();
			
			showMessage("Loaded content script: '" + name + "'!");
		}
		
		function loadAllContentScripts(filter, options) {
			$("#contentscript-menu").empty();
			
			loadAllContentScripts_internal(function(s) {
				// If filter is not given, load all content scripts.
				if (!filter)
					return true;
					
				if (filter.name)
					return s.name == filter.name;
				
				// otherwise, only load content scripts whose script text matches the content filter.
				var contentFilter = filter.pattern;
				
				// If searched text is /msg/g then /([\s\S]*?)msg/g should be used for searching
				var match = s.script.match(contentFilter);
				return match != null;
			});
		}
		
		function loadAllContentScripts_internal(addMenu, procItem) {
			var keys = new Array();
			for ( key in localStorage ) {
				if (/^\$cs-/.test(key)) {
					var name = key.replace(/^\$cs-/, "");				
					var value = localStorage["$cs-"+name];
					var data = JSON.parse(value);					
					data['name'] = name;
					
					__index_cs = (__index_cs >= data['index']) ? __index_cs : parseInt(data['index']);
					
					keys.push(data);					
				}
			}
			keys.sort(sortContentScriptByDefault);
			for ( i in keys ) {
				var item = keys[i];
				var name = item['name'];
				var key = "$cs-" + name;
				if (addMenu) {
					var flag = addMenu;
					if (isFunction(addMenu))
						flag = addMenu(item);
						
					if (flag)
						addContentScriptMenu(item.name, item["index"], item['group']);
				}
				
				delete item['name'];
				if (procItem)
					procItem(key, name, item);
			}
			
			$("#contentscript-menu").find("> .jstbox").removeClass("selected");
			if (selectedContentScript)
				$(`#contentscript-menu > .jstbox[name='${selectedContentScript}']`).addClass("selected");
		}
		
		function sortContentScriptByDefault(a, b) {
			return a.group.localeCompare(b.group) * 100 + Math.sign(a.index - b.index);
		}
		
		function getNextContentScriptIndex() {
			console.log("getContentScriptCount: " + name);
			return ++__index_cs;
		}
		
		function contentScriptSaved(noConfirm) {
			//if(currentSavedStateDCS!=null) {
				if(currentSavedStateDCS != editorDynScript.getValue() ) {
					if (noConfirm)
						return false;
					else
						return confirm("Content script changed! Discard?");
				}
			//}
			
			return true;
		}