		// 对Date的扩展，将 Date 转化为指定格式的String 
		// 月(M)、日(d)、小时(h)、分(m)、秒(s)、季度(q) 可以用 1-2 个占位符， 
		// 年(y)可以用 1-4 个占位符，毫秒(S)只能用 1 个占位符(是 1-3 位的数字) 
		// 例子： 
		// (new Date()).Format("yyyy-MM-dd hh:mm:ss.S") ==> 2006-07-02 08:09:04.423 
		// (new Date()).Format("yyyy-M-d h:m:s.S")      ==> 2006-7-2 8:9:4.18 
		Date.prototype.Format = function(fmt) 
		{ //author: meizz 
		  var o = { 
			"M+" : this.getMonth()+1,                 //月份 
			"d+" : this.getDate(),                    //日 
			"h+" : this.getHours(),                   //小时 
			"m+" : this.getMinutes(),                 //分 
			"s+" : this.getSeconds(),                 //秒 
			"q+" : Math.floor((this.getMonth()+3)/3), //季度 
			"S"  : this.getMilliseconds()             //毫秒 
		  }; 
		  if(/(y+)/.test(fmt)) 
			fmt=fmt.replace(RegExp.$1, (this.getFullYear()+"").substr(4 - RegExp.$1.length)); 
		  for(var k in o) 
			if(new RegExp("("+ k +")").test(fmt)) 
		  fmt = fmt.replace(RegExp.$1, (RegExp.$1.length==1) ? (o[k]) : (("00"+ o[k]).substr((""+ o[k]).length))); 
		  return fmt; 
		}

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

		
		var mapSiteScriptFunc = dummyMapSiteScriptFunc;

		var selectedTitle = "";
		
		var scripts = ["jquery.js"];
		
		CodeMirror.commands.autocomplete = function(cm) {
			CodeMirror.simpleHint(cm, CodeMirror.javascriptHint);
		}
		
		chrome.manifest = (function() {
			var manifestObject = false;
			var xhr = new XMLHttpRequest();

			xhr.onreadystatechange = function() {
				if (xhr.readyState == 4) {
					manifestObject = JSON.parse(xhr.responseText);
				}
			};
			if (chrome.extension) {
				xhr.open("GET", chrome.extension.getURL('/manifest.json'), false);
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
			if (mapSiteScriptFunc == mapPreviewReplacedSiteScript) {
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
			
			showMessage("Script and CSS tricks saved!");
			
			run("save");
		}
		
		function saveMetadata() {			
			try {
				var meta = editorMeta.getValue();
				JSON.parse(meta);
				localStorage["meta"] = meta;
				currentSavedStateMeta = editorMeta.getValue();
			} catch (exception) {
				alert("Cannot save metadata. It is not valid JSON data.");
				console.log(exception);
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
		function loadSiteScripts(contentFilter, contentType, nameFilter) {			
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
				keys.unshift("Main", "Default");
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
						var addContentFlag = false;
						if (!contentFilter) {
							addContentFlag = true;
						} else if (contentType) {
							var content = "";
								
							if (contentType == "js") {
								content = lsd.script;
							} else if (contentType == "css") {
								content = lsd.css;
							} else if (contentType == "js+css") {
								content = lsd.script + "\n" + lsd.css;
							}
							
							if (contentFilter instanceof RegExp)
								addContentFlag = content.match(contentFilter);
							else if (typeof(contentFilter) === "string")
								addContentFlag = content.indexOf(contentFilter) > -1;
						}
						
						if (addContentFlag)
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
				var $imgLink = $("<img class='goto' border=0 src='url_icon.gif'>");
				if(lsd.hidden == 'checked')
				{
					$imgLink.click(function(){
						chrome.windows.create({"url":"http://"+v, "incognito": true});
					});
					$imgLink.attr("src","url_icon_i.png");
				}
				else
				{
					$imgLink.click(function(){
						chrome.tabs.create({"url":"http://"+v});
					});
				}
				$divbox.append($imgLink);
				
				
				/*var $editLink = $("<img class='goto edit' border=0 src='edit_icon.png'>").click(function(){
					editTitle($(this).parent());
					return false;
				});
				$divbox.append($editLink);*/
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
			lsd = mapSiteScriptFunc(lsd);
			
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
			currentSavedStateMeta = editorMeta.getValue();
			
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
			var mode = $("#contentfiltermode").val();
			var filter = content;
			if (mode){
				filter = new RegExp(content);
			}
			loadSiteScripts(filter, "js");
		}
		function filterSiteScriptByCSSContent() {
			var content = $("#jscontentfiltertext").val();
			var mode = $("#contentfiltermode").val();
			var filter = content;
			if (mode){
				filter = new RegExp(content);
			}
			loadSiteScripts(filter, "css");
		}
		function filterSiteScriptShowAll() {
			loadSiteScripts();
		}
		
		var editorJs = null;
		var editorCss = null;
		var editorMeta = null;
		var editDynScript = null;
		var editorJsonFile = null;
		var editorJsonObjectValue = null;
		var hlLineJs = null;
		var hlLineCss = null;
		
		$(function(){//on load
			$("#testtest").click(cloudStorageGenCode);
		
			$("#jscontentfilterbtn").click(filterSiteScriptByJSContent);
			$("#csscontentfilterbtn").click(filterSiteScriptByCSSContent);
			$("#clearcontentfilterbtn").click(filterSiteScriptShowAll);
			
			$("#forjscb").click(changeAutostart);
			$("#jssave").click(saveSiteScript);
			$("#jsdelete").click(deleteRecord);	
			$("#exportbtn").click(exportSettings);
			$("#findReplaceDialogBtn").click(showFindReplaceDialog);
			$("input:button.textSizeUpBtn").click(function(){textSize(1)});
			$("input:button.textSizeDownBtn").click(function(){textSize(-1)});	
			$("#findDialog-previewBtn").click(findReplaceDialog_preview);
			$("#findDialog-cancelBtn").click(findReplaceDialog_cancel);
			$("#findDialog-doBtn").click(findReplaceDiailog_do);
					
			$('#backupbtn').click(backup);
			$('#restorebtn').click(restore);
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
			
			$("#dcssave").click(save);
			$("#dcsadd").click(addContentScript);
			$("#dcsrename").click(renameContentScript);
			$("#dcsdelete").click(deleteContentScript);
			$("#dcssort").click(sortContentScript);
			$("#dcsindexup").click(moveUpContentScript);
			$("#dcsindexdown").click(moveDownContentScript);
			$("#dcsreindex").click(reindexContentScript);
			$("#dcsupdatemenu").click(updateContentScriptForContextMenu);
			
			loadAllContentScripts();
			
			$('#jsonFileLoad').click(loadJsonFile);
			$('#jsonObjExtract').click(extractJsonObject);
			
			initControlsRelatingToLocalStorage();
			
			$(".hide").hide();
			$(".click-to-toggle-next-node").click(function() { $(this).next().toggle(); });
			
			if (!localStorage["$setting.cloud-url"])
				$(".cloudsave-setting").show();
			
			$("#settings-release-notes-btn.empty").click(function() {
				$("#settings-release-notes").load("releasenotes.html");
				$(this).removeClass("empty");
			});
			$("#settings-release-notes-btn").click(function() {
				$("#settings-release-notes").toggle();
			});
			
			$("#logo").css({"width":128}).delay(10).animate({"width":48},function(){
				$(this).attr("src","icon48.png");
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
			editorJs = CodeMirror.fromTextArea(document.getElementById("taedit"), {
					mode: 'text/javascript',					
					tabMode: 'indent',
					lineNumbers:true,
					matchBrackets :true,
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
					},
					onCursorActivity: function() {
						if(hlLineJs!=null)
							editorJs.setLineClass(hlLineJs, null, null);    
							
						hlLineJs = editorJs.getCursor().line;						
						editorJs.setLineClass(hlLineJs, "activeline", "activeline");  
						
					}
				}); 
				
				
			
			editorCss = CodeMirror.fromTextArea(document.getElementById("taeditcss"), {
					mode: 'text/css',					
					tabMode: 'indent',
					lineNumbers:true,
					matchBrackets :true,
					extraKeys: {						
						"Esc": function() {
						  var scroller = editorCss.getScrollerElement();
						  if (scroller.className.search(/\bCodeMirror-fullscreen\b/) !== -1) {
							scroller.className = scroller.className.replace(" CodeMirror-fullscreen", "");
							scroller.style.height = '';
							scroller.style.width = '';
							editorCss.refresh();
						  }
						},
						"Ctrl-Space": "autocomplete"
					},
					onCursorActivity: function() {    
						if(hlLineCss!=null)
							editorCss.setLineClass(hlLineCss, null, null);    
							
						hlLineCss = editorCss.getCursor().line;						
						editorCss.setLineClass(hlLineCss, "activeline", "activeline");  
					}
				}); 
			
			editorMeta = generateJSEditor("taeditmeta"); 				
			editDynScript = generateJSEditor("dyscriptedit"); 
			editorJsonFile = generateJSEditor("json-file"); 
			editorJsonObjectValue = generateJSEditor("json-file-obj"); 
			
			//line highlight
			//hlLineJs = editorJs.setLineClass(0, "activeline");
			//hlLineCss = editorCss.setLineClass(0, "activeline");
			
			//hide some menu
			$(document).keydown(function(event){
				if(event.altKey && event.ctrlKey && String.fromCharCode( event.which ).toLowerCase() == 'h')
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
				if(event.ctrlKey && String.fromCharCode( event.which ).toLowerCase() == 's')
				{
					save();
					return false;
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
						primary: "ui-icon-locked"
					}
				});
			$('#json-viewer-tabs').tabs();
			
			loadMetaData();
			
			// Jump to tab if page=sitescripts is specified.
			if (optionPageParams["page"]) {
				switch (optionPageParams["page"]) {
					case "sitescripts":
						$("#toptabs > ul >li:nth(0)").click();
						// jump to site if site=cn.bing.com is specified
						if (optionPageParams["site"])
							$(`div.jstbox[data-site='${optionPageParams["site"]}']`).click();
						break;
					case "contentscripts":
						$("#toptabs > ul >li:nth(1)").click();
						// jump to script if name=Novel is specified
						if (optionPageParams["name"])
							$(`div.jstbox.contentScriptKey[name='${optionPageParams["name"]}']`).click();
						break;
					case "settings":
						$("#toptabs > ul >li:nth(2)").click();
						// jump to section if section=Novel is specified
						if (optionPageParams["section"])
							$(`#settings-list .jstbox:nth(${optionPageParams["section"]})`).click();
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
		});//;
		
		function loadMetaData() {
			var metadata = localStorage["meta"];			
			if (metadata)
				editorMeta.setValue(metadata);
			else
				editorMeta.setValue("");
		}
		
		function generateJSEditor(textareaID) {
			return CodeMirror.fromTextArea(document.getElementById(textareaID), {
					mode: 'text/javascript',					
					tabMode: 'indent',
					lineNumbers:true,
					matchBrackets :true,
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
					},
					onCursorActivity: function() {
						if(hlLineJs!=null)
							editorJs.setLineClass(hlLineJs, null, null);    
							
						hlLineJs = editorJs.getCursor().line;						
						editorJs.setLineClass(hlLineJs, "activeline", "activeline");  
						
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
			
			$opt.empty().append("<img class='loadingimg' src='loading.gif?seed' alt=''/>").dialog('open');
			
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
			var autostart = document.getElementById("jscb").checked;
			if (selectedTitle == "Default")
				return;
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
		
		function backup() {
			var data = JSON.stringify(localStorage);
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
				
		
		// *******************************************************
		// **               Find and Replace                    **
		// *******************************************************
		var findReplaceDialog_replaceKey = null;
		function dummyMapSiteScriptFunc(s) {
			return s;
		}
		
		function mapPreviewReplacedSiteScript(s) {
			var targetType	= findReplaceDialog_replaceKey["targetType"];
			var pattern 	= findReplaceDialog_replaceKey["pattern"];
			var replacement = findReplaceDialog_replaceKey["replacement"];
			
			var replaceScript = targetType.indexOf("js") > -1;
			var replaceCss = targetType.indexOf("css") > -1;
			
			if (replaceScript)
				s.script = s.script.replace(pattern, replacement);
			
			if (replaceCss)
				s.css = s.css.replace(pattern, replacement);
			
			return s;
		}
		
		function showFindReplaceDialog() {
			$("#findReplaceDialog").css("top","0px")
				.dialog({
					title: "Find and Replace (Double click to toggle)",
					width: 340,
					
					close: findReplaceDialog_cancel
				});
		}
		
		function findReplaceDialog_updateReplaceKey() {
			findReplaceDialog_replaceKey = {};
			
			var mode = $("#findDialog-searchfor").val();
			var targetType = "js";
			if (mode == "CSS") 
				targetType = "css";
			else if (mode == "Both") 
				targetType = "js+css";
						
			var pattern = $("#findDialog-findstring").val();
			var method  = $("#findDialog-searchmethod").val();
			if (method == "Regexp") {			
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
				
				pattern = new RegExp(pattern, flags);
				console.log(pattern);
			}	
			
			findReplaceDialog_replaceKey["targetType"] 	= targetType;
			findReplaceDialog_replaceKey["pattern"]	 	= pattern;
			findReplaceDialog_replaceKey["replacement"] = $("#findDialog-replacement").val();
		}
		
		function findReplaceDialog_preview() {
			findReplaceDialog_updateReplaceKey();
			
			mapSiteScriptFunc = mapPreviewReplacedSiteScript;
			
			// Refresh views
			$("#tabs-sss .CodeMirror").css("background-color", "#ffeeee");
			var site = selectedTitle;
			loadSiteScripts(findReplaceDialog_replaceKey["pattern"], 
				findReplaceDialog_replaceKey["targetType"], isSiteScriptName);
			$(`#site-list .jstbox[data-site='${site}']`).click();
		}
		
		function findReplaceDialog_cancel() {		
			findReplaceDialog_replaceKey = null;
			mapSiteScriptFunc = dummyMapSiteScriptFunc;
						
			// Refresh views
			$("#tabs-sss .CodeMirror").css("background-color", "");
			var site = selectedTitle;
			loadSiteScripts();
			$(`#site-list .jstbox[data-site='${site}']`).click();
		}
		
		function findReplaceDiailog_do() {
			findReplaceDialog_replaceKey = null;
			mapSiteScriptFunc = dummyMapSiteScriptFunc;
			
			// Do the replace work on every site script.			
			findReplaceDialog_updateReplaceKey();
			var targetType	= findReplaceDialog_replaceKey["targetType"];
			var pattern 	= findReplaceDialog_replaceKey["pattern"];
			var replacement = findReplaceDialog_replaceKey["replacement"];
			
			for(v in localStorage) {	
				try {
					if (!isSiteScriptName(v))
						continue;
					
					var lsd = JSON.parse(localStorage[v]);
					
					var flag = false;
					var content = "";
						
					if (targetType == "js") {
						content = lsd.script;
					} else if (targetType == "css") {
						content = lsd.css;
					} else if (targetType == "js+css") {
						content = lsd.script + "\n" + lsd.css;
					}
					
					if (pattern instanceof RegExp)
						flag = content.match(pattern);
					else if (typeof(pattern) === "string")
						flag = content.indexOf(pattern) > -1;
					
					if (flag) {			
						var replaceScript = targetType.indexOf("js") > -1;
						var replaceCss = targetType.indexOf("css") > -1;
						
						if (replaceScript)
							lsd.script = lsd.script.replace(pattern, replacement);
						
						if (replaceCss)
							lsd.css = lsd.css.replace(pattern, replacement);
						
						localStorage[v] = JSON.stringify(lsd);
						console.log("Replace script " + v);
					}
				} catch(e) {
					console.log(`Invalid! localStorage[${v}]=${localStorage[v]}`);
				}
			}
							
			// Refresh views			
			$("#tabs-sss .CodeMirror").css("background-color", "");
			var site = selectedTitle;
			loadSiteScripts();
			$(`#site-list .jstbox[data-site='${site}']`).click();
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
		
		function cloudStorageGenKey() {
			chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFYHIJKLMNOPQRSTUVWXYZ~!@#$%^&*()_+{}|[]:;<>,.?/';
			length = chars.length;
			key = '';
			for (var i = 0; i < 16; ++ i) {
				var index = Math.round((Math.random() * 1000000)) % 88;
				key += chars[index];
			}
			
			$("#cloudsave-key").val(key);
			$(this).next().text(key);
			alert("Copy the following key value and change the $PRIVATEKEY variable in cloudsave.php.\n" + key);
		}
		
		function cloudStorageGenCode(text, passphrase, keyiv) {			
			var key_hash = CryptoJS.MD5(passphrase); 
			var key = CryptoJS.enc.Utf8.parse(key_hash); 			
			var iv  = CryptoJS.enc.Utf8.parse(keyiv); 
			// var iv  = CryptoJS.enc.Utf8.parse('1234567812345678'); 
			var encrypted = CryptoJS.AES.encrypt(text, key, { iv: iv,mode:CryptoJS.mode.CBC, padding:CryptoJS.pad.ZeroPadding}); 
			var encryptedText = "" + encrypted;
			//console.log(text)
			//console.log(keyiv)
			//console.log(encryptedText);
			return encryptedText;
		}
		
		function cloudStoragePost(data, callback) {
			var url = localStorage["$setting.cloud-url"];
			var path = localStorage["$setting.cloud-path"];
			var passphrase = localStorage["$setting.cloud-passphrase"];
			var keyiv = localStorage["$setting.cloud-keyiv"];
			
			if (!url || !passphrase || !keyiv) {
				alert("Cannot backup. Cloud storage is not set yet.");
				return;
			}
			
			var timestr = (new Date()).Format("yyyyMMddhhmmssS");
			data["path"] = path;			
			data["time"] = timestr;
			// function defined in aes.js, md5.js, pad-zeropadding.js in js/cryptojs
			data["token"] = cloudStorageGenCode(timestr, passphrase, keyiv);
			
			$.post(url, data)
			.done(callback)
			.fail(function(data) { alert("Error occurred when visiting:\n" + url + "\n" + data.status + "\n" + data.statusText); console.log(data); });
		}
		
		function cloudBackup() {
			showMessage("Start backing configuration up in cloud.");	
			var data = JSON.stringify(localStorage);
			var filename = (new Date()).Format("yyyyMMdd-hhmmss");
			// cloudsave.php?method=save&path=chrome-ext&key=file2&value=hello2323
			cloudStoragePost({"method":"save", "key":filename, "value":data}, 
			function(data) {
				if (data.code == 0) {
					localStorage["$setting.cloud-lastsave"] = filename;
					$("#cloudrestore-key").val(filename);
					showMessage("Configurations are backup up in cloud.");
				} else {
					alert("Failed to save configuration. \n" + data.message);
				}
				
			});
		}
		
		function cloudRestore() {
			var key = $("#cloudrestore-key").val();
			if (!confirm("All current settings and scripts will be erased. \nAre you sure you want to restore with configuration named " + key + "?"))
				return;
				
			showMessage("Start backing configuration up in cloud.");	
			//cloudsave.php?method=load&path=chrome-ext&key=20151101-185152
			cloudStoragePost({"method":"load", "key":key} , 
			function(data) {
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
			// cloudsave.php?method=list&path=chrome-ext&key=file2
			cloudStoragePost({"method":"list"} , 
			function(data) {
				if (data.code == 0) {
					cloudStorageAddKeysToUI(data.result);					
					showMessage("Configurations are listed out of cloud.");
				} else {
					alert("Failed to list configurations. \n" + data.message);
				}
			});
		}
		
		function cloudStorageView() {
			var key = $("#cloudrestore-key").val();
				
			//cloudsave.php?method=load&path=chrome-ext&key=20151101-185152
			cloudStoragePost({"method":"load", "key":key} , 
			function(data) {
				$("#settings-list .jstbox:eq(2)").click();
				showConfiguration(data);
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
		
		function cloudStorageLeaveLast10() {
			// cloudsave.php?method=removeExceptLast10&path=chrome-ext
			cloudStoragePost({"method":"removeExceptLast10"} , 
			function(data) {
				if (data.code == 0) {
					cloudStorageAddKeysToUI(data.result);
					showMessage(data.message);
				} else {
					alert("Failed to remove configurations. \n" + data.message);
				}
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
			
			$("input.localstorage_itemvalue").each(function(ind, ele) {
				var node = $(this);
				var key = $(this).attr("target");
				var defaultValue = $(this).attr("defaultvalue");
				if (localStorage[key])
					node.val(localStorage[key]);
					
				node.parents(".localstorage_item").first().find(".localstorage_saveitem").click(function() {
					localStorage[key] = node.val();
					showMessage("The setting is saved.");
				});
				node.parents(".localstorage_item").first().find(".localstorage_resetitem").click(function() {
					if (!confirm("Do you really want to set to default value: " + defaultValue + "?"))
						return;
					node.val(defaultValue);
					localStorage[key] = defaultValue;
					showMessage("The setting is set to default.");
				});
			});
			
			$(".localstorage_saveall").click(function() {
				$(this).parents(".localstorage_block").find(".localstorage_itemvalue").each(function(index, ele) {
					var node = $(ele);
					var target = node.attr('target');
					var value = node.val();
					localStorage[target] = value;
				});
				showMessage("All settings are saved.");
			});
			$(".localstorage_resetall").click(function() {
				if (!confirm("Do you really want to set all settings to default values?"))
					return;
				$(this).parents(".localstorage_block").find(".localstorage_itemvalue").each(function(index, ele) {
					var node = $(ele);
					var target = node.attr('target');
					var value = node.attr('defaultvalue');
					node.val(value);
					localStorage[target] = value;
				});
				showMessage("All settings are set to default.");
			});
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
		
		function cloudStorageDeleteItem(key) {				
			//cloudsave.php?method=delete&path=chrome-ext&key=20151101-181410
			cloudStoragePost({"method":"delete", "key":key} , 
			function(data) {
				if (data.code == 0) {
					$(`#cloudrestore-keys div.key[name='${key}']`).remove();
					showMessage("Selected onfiguration is deleted.");
				} else {
					alert("Failed to delete the configuration. \n" + data.message);
				}
			});
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
			name = name.replace(/^\s*/, "").replace(/\s*$/, "");
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
			
			addContentScriptMenu(name, index);
			
			currentSavedStateDCS = "";
			editDynScript.setValue("");
			
			saveContentScript();
			
			updateContentScriptForContextMenu();
		}
		
		function saveContentScript() {
			console.log("Save the content script.");
			
			if(selectedContentScript == "")
				return;
			
			var key = "$cs-" + selectedContentScript;
			var dcstitle = editDynScript.getValue() ;
			var group = $("#dcsgroup").val();
			var title = $("#dcstitle").val();
			var sfile = $("#dcsinclude").val();
			var index = $("#dcsindex").val();
			
            var tmp =  {"index":index, "group":group, "title":title, "sfile":sfile, "script": dcstitle};

			localStorage[key] = JSON.stringify(tmp);
			$(`#contentscript-menu > .jstbox[name='${selectedContentScript}']`).attr("index", index)
				.find(".index").text(index);
				
			$(`#contentscript-menu > .jstbox[name='${selectedContentScript}'] .group`).text(group);
			
			currentSavedStateDCS = editDynScript.getValue();
			
			showMessage("Content script saved!");
			
			updateContentScriptForContextMenu();
		}
		
		function renameContentScript() {
			console.log('renameContentScript');
			
			if(selectedContentScript == "")
				return;
			
			if (!contentScriptSaved())
				return;
			
			var newName = "";
			
			do {
				newName = prompt("New name:", selectedContentScript);			
				if (!newName)
					return;	
						
				name = name.replace(/^\s*/, "").replace(/\s*$/, "");
				if (checkDuplicateContentScript(newName)) {
					alert("A script with the given name already exists. Please change a name.");
				} else {
					break;
				};
			} while (true);
				
			var key = "$cs-" + selectedContentScript;
			var data = localStorage[key];
			localStorage["$cs-"+newName] = data;
			delete localStorage[key];
			
			$(`#contentscript-menu > .jstbox[name='${selectedContentScript}'] .jsttitle .name`).text(newName);
			
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
			
			chrome.extension.sendRequest({method: "UpdateContextMenu", data:groups});
		}
		
		function addContentScriptMenu(name, index) {
			// console.log('addContentScriptMenu: ' + name);
			var group = "";
			try {
				group = JSON.parse(localStorage["$cs-"+name]).group;
			} catch(exception) {}
			var container = $("#contentscript-menu");
			container.find("> .jstbox").removeClass("selected");
			$(`<div class="jstbox contentScriptKey selected" name="${name}" index="${index}">
					<div class="jsttitle" style="display:inline;font-variant:normal;position:relative;">
						<span class="index">${index}</span>
						<span>-</span>
						<span class="name">${name}</span>
						<div class="group">${group}/</div>
					</div>
				</div>
			`).appendTo(container).click(loadContentScript);
			container.scrollTop(99999);  //container.height();
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
			var data = JSON.parse(value);
			
			editDynScript.setValue(data.script);
			$("#dcsgroup").val(data.group);
			$("#dcstitle").val(data.title);
			$("#dcsinclude").val(data.sfile);	
			$("#dcsindex").val(data.index);
			
			currentSavedStateDCS = data.script;
			
			showMessage("Loaded content script: '" + name + "'!");
		}
		
		function loadAllContentScripts() {
			loadAllContentScripts_internal(true);
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
				if (addMenu)
					addContentScriptMenu(item.name, item["index"]);
				
				delete item['name'];
				if (procItem)
					procItem(key, name, item);
			}
			
			$("#contentscript-menu").find("> .jstbox").removeClass("selected");
		}
		
		function sortContentScriptByDefault(a, b) {
			return a.group.localeCompare(b.group) * 100 + Math.sign(a.index - b.index);
		}
		
		function getNextContentScriptIndex() {
			console.log("getContentScriptCount: " + name);
			return ++__index_cs;
		}
		
		function contentScriptSaved() {			
			//if(currentSavedStateDCS!=null) {
				if(currentSavedStateDCS != editDynScript.getValue() ) {
					return confirm("Content script changed! Discard?");
				}
			//}
			
			return true;
		}