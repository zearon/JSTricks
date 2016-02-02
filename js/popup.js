
// Redirect chrome extension api invocations which are not accessible in content script
// to background page.
var inExtensionPage = typeof(chrome.tabs) !== "undefined";
var tabID = 0;
var tabUrl = "";
var tabSite = "";
var API_CALLBACKS = {};
var port = null;

var DEBUG = false;
if (inExtensionPage && storage.getSetting("DEBUG") === "true")
  DEBUG = true;
var RUN_BUTTON_CODE = storage.getSetting("DEBUG_runbuttoncode") === "true";
var DISABLE_RUN_BUTTON_CODE = storage.getSetting("popupwindow_disableRunCodeButton") !== "false";
var ENABLED = storage.getSetting("enabled") !== 'false';
  
var mac_os = navigator.userAgent.indexOf("Mac OS") > -1;

// iframe.contentWindow.postMessage({ type: "RestoreEditDialogContextResponse", tabid:NS_tabid, context:NS_editDialogContext }, "*");
// iframe.contentWindow.postMessage({type:"NS-NodeSelected", tabid:tabid, controlid:NS_controlId, context:NS_editDialogContext}, "*");
window.addEventListener("message", function(event) {
  // console.debug("Receive message posted:", event.data);
  // We only accept messages from ourselves
  //if (event.data.tabid != tabID)
  //  return;
  
  if (event.data.type == "RestoreEditDialogContextResponse") {
    //console.log(event.data.context);
    restoreEditDialogContext(event.data.context);
  } else if (event.data.type == "NS-NodeSelected") {
    onNodeSelected(event.data.controlid, event.data.value);
  } else if (event.data.method === "Messages") {
    onContentPageMessage(event.data);
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
  
  connectToContentPage(tabID);
});


// function callback(response)
function API_SendRequest(method, arg, callback) {
  var id = UTIL.guid();
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
//     chrome.tabs.query({active:true, windowId:chrome.windows.WINDOW_ID_CURRENT}, function(tabs) {
//       callback(tabs[0]);
//     });
    
    chrome.windows.getCurrent(undefined, function(win) {
      var winid = win.id;
      chrome.tabs.query({active:true, windowId:winid}, function(tabs) {
      if (chrome.runtime.lastError) {
        // tab is not fetched successfully
        console.error("Cannot get selected tab.");
      } else {
        callback(tabs[0]);
      }
      });      
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


// function API_SetIcon(arg) {
//   if (inExtensionPage) {
//     chrome.browserAction.setIcon(arg);   
//   } else {
//     API_SendRequest("SetIcon", arg);
//   }
// }

function API_SendMessageToTab(tabid, msg, callback) {
  if (inExtensionPage) {
    chrome.tabs.sendMessage(tabid, msg, callback);
  } else {
    API_SendRequest("SendMessageToTab", msg, callback);
  }
}

function API_OpenWindow(url, name) {
  if (inExtensionPage) {
    window.open(url, name);
  } else {
    API_SendRequest("OpenWindow", {url:url, name:name});
  }
}

function API_ConsoleLog() {
  API_SendRequest("ConsoleLog", arguments);
}

function log() {
  console.log.apply(console, arguments);
  
  if (DEBUG) {
    API_SendRequest("ConsoleLog", arguments);
  }
}

/***************************************************************************
 *                     Communication with content page                     *
 *                                                                         *
 ***************************************************************************/
function connectToContentPage(tabID) {
  if (inExtensionPage) {
    // messaging with chrome.runtime.Port.sendMessage and chrome.runtime.Port.onMessage
    port = chrome.tabs.connect(tabID, {name:"popup window"});
    port.onMessage.addListener(onContentPageMessage);
  } else {
    // messaging with window.postMessage and window.addEventListner("message", function )
    port = {
      postMessage: function(msg) {
        window.top.postMessage(msg, "*");
      }
    };
    // onMessage is in function window.addEventListener at about line 21
  }
  
  port.postMessage({method:"GetAllMessages"});
}

function onContentPageMessage(msg) {
  if (msg.method === "Messages") {
    msg.data.forEach(function(message) {
      if (message.type === "plugin") {
        var title = `${message.code ? "Extra Code: " + message.code + "<br/>" : ""}
                     Condition Met: ${JSON.stringify(message.conditionMet)}<br/><br/>
                     Double click to edit this content script in options page`;
        var item = $(`<tr><td title='${title}'>
              [${message.script}]</td><td>${message.msg}</td></tr>`).appendTo("#loadedPlugins");
              
        item.find("td:nth-child(1)").dblclick(function() { 
          // Edit content script in options page
          var url = "chrome-extension://"+chrome.runtime.id+"/options.html?tab=1&item="+message.script;
          API_OpenWindow(url, "OptionPage");
        });
      } 
      
      else if(message.type === "log") {
        var script = message.script, scriptName = script;
        var stacktrace = message.stacktrace.replace(chrome.runtime.getURL("/"), "/");
        var match = stacktrace.match(/(\/dynamic\/.*):(\d+):(\d+)/);

        if (match) {
          console.log(source);
          var source = match[1], line = parseInt(match[2]), col = parseInt(match[3]);
          var type = null, file = null, tab = 1;
          source = source.replace(/\.js$/, "");
          if (source.startsWith("/dynamic/ss/")) {
            type = "ss";
            file = source.replace("/dynamic/ss/", "");
            scriptName = scriptName ? scriptName : "SiteScript";
            script = script ? script : file;
            // due to header lines defined in function loadSiteScript in file js/bg.js 
            line -= 1; 
            tab = 0;
          } else if (source.startsWith("/dynamic/cs/")) {
            type = "cs";
            file = source.replace("/dynamic/cs/", "");
            scriptName = scriptName ? scriptName : file;
            script = script ? script : file;
            // due to header lines defined in variable codesnippet_csWrapper and codesnippet_csWrapper_noDuplicate in file js/common/codesnippet.js 
            line -= 7; 
            tab = 1;
          } else if (source.startsWith("/dynamic/plugin/")) {
            type = "cs";
            file = source.replace("/dynamic/plugin/", "").replace(/\.plugin$/, "");
            scriptName = scriptName ? scriptName : file;
            script = script ? script : file;
            tab = 1;
          }
        }
        
        var title = `Stacktrace:<br/><span style='font-size:11px;'>${stacktrace}</span><br/><br/>
                     Double click to edit this script in options page`;
        var item = $(`<tr><td title="${title}">[${scriptName}]</td><td>${message.msg}</td></tr>`)
                   .appendTo("#logMessages");
              
        item.find("td:nth-child(1)").dblclick(function() { 
          // Edit script in options page
          var url = "chrome-extension://"+chrome.runtime.id+"/options.html?tab="+tab+"&item="+script+"&line="+line+"&col="+col;
          API_OpenWindow(url, "OptionPage");
        });
      }
    });
  }
}

    function toggleExtension() {
      if (!inExtensionPage)
        return;
        
      ENABLED = storage.getSetting("enabled") == "true";
      
      if (ENABLED) {
        // Disable
        storage.setSetting("enabled", "false");
        $(".for-disabled").show();
        //API_SetIcon({path:"icon/icon24_disabled.png"});
      } else {
        // Enable
        chrome.runtime.sendMessage({tabid:tabID, method: "JSTinjectScript"});
        storage.setSetting("enabled", "true");
        $(".for-disabled").hide();
        //API_SetIcon({path:"icon/icon24.png"});
      }
      ENABLED = !ENABLED;
      
      chrome.runtime.sendMessage({tabid:tabID, method: "EnableDisableExt", data: (ENABLED ? "true" : "false") });
      setEnableDisableBtnImage();
    }
    
    function setEnableDisableBtnImage() {
      if (storage.getSetting("enabled") === "true") {
        $("#enableDisableBtn").addClass("disable");
        $("#enableDisableBtn").removeClass("enable");
      } else {
        $("#enableDisableBtn").addClass("enable");
        $("#enableDisableBtn").removeClass("disable");
      }
    }

    // remove current site-specific script
    function remove() {
      if (!inExtensionPage && !confirm("Do you really want to remove this script?"))
        return;
        
      API_GetTabURL(function(url) {
        var domain = url.match(/^[\w-]+:\/*\[?([\w\.:-]+)\]?(?::\d+)?/)[1];
        storage.deleteScript(["ss", domain], function() {
          chrome.runtime.sendMessage({method:"UpdateIconForDomain", data: domain });
        });
        
        
        $("#jstcb").removeAttr("checked");
        $("#jstcb").button("refresh");
      
        // Update status to let user know options were saved.
        var status = document.getElementById("title");
        status.innerHTML = "Options deleted. <br/>Please refresh the page.";
        setTimeout(function() {
          status.innerHTML = "";
        }, 2750);
      });
    }
    // Saves options event handler for UI event.    
    function save_options_() {
      save_options();
    }
    // Saves options to script storage area.
    function save_options(options) {
      API_GetTabURL(function(url) {
        var domain = url.match(/^[\w-]+:\/*\[?([\w\.:-]+)\]?(?::\d+)?/)[1];
        saveBody(domain, options);
      });
    }
    function saveBody(url/*, options*/)
    {
      var tmpp = {script:"",autostart:false};
//       if(localStorage[url])
//       {
//          tmpp = JSON.parse(localStorage[url]);
//       }        
      tmpp.type = "ss";
      tmpp.name = url;
      tmpp.script = editor.getValue();
      tmpp.css = editorCss.getValue();
      tmpp.autostart = document.getElementById("jstcb").checked;
      tmpp.sfile  = $("#jsincludefile").val();
      
      storage.saveScript(tmpp, function() {
        chrome.runtime.sendMessage({method:"UpdateIconForDomain", data: url });
      });
      
      // Update status to let user know options were saved.
      var status = document.getElementById("title");
      status.innerHTML = "Options Saved.";
      setTimeout(function() {
        status.innerHTML = "";
      }, 750);
      
      var noErrorFound = checkScriptSyntax(editor);
      
      //Inject CSS immediately
      API_InsertCssInTab(tmpp.css);
    }
    // Restores select box state to saved value from script storage area.
    function restore_options(callback) {
      API_GetTabURL(function(url) {
        var domain = url.match(/^[\w-]+:\/*\[?([\w\.:-]+)\]?(?::\d+)?/)[1];
        restoreBody(domain, callback);
      });      
    }
    function restoreBody(domain, callback) {
      storage.getScript(domain, "ss", function(script) {
        var ta = document.getElementById("scriptText");
        var taCss = document.getElementById("scriptTextCss");
        var cb = document.getElementById("jstcb");
        
        if (!script) {
          // No site script is found, so load the default code template
          ta.value = compile_template(template_site_script, {url:domain});
        } else {
          // Update the View 
          ta.value = script.script;
          taCss.value = script.css;
          if(script.autostart)
            cb.checked = true;
          $("#jsincludefile").val(script.sfile);
          $("#jstcb").button("refresh");
        }
        
        if(callback)
          callback();
      });
    }
    function execute(name, script, css) {
      if(css != "") {
        API_InsertCssInTab(css);//chrome.tabs.insertCSS(null,{code:css});
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
      var url = "chrome-extension://"+chrome.runtime.id+"/options.html?tab=0&item="+tabSite;
      API_OpenWindow(url, "OptionPage");
    }
    
    
    function checkScriptSyntax(cmEditor) {
      // utilizing check result of CodeMirror Lint addon
      return !cmEditor.performLintErrorFound();
      /*
      var source = cmEditor.getValue();
      return JSHINT(source, {"esversion":6, "expr":true, "indent":2}, 
        {"console":false, "chrome":false, "run":false, "seajs":false, "define":false, 
        "INFO":false, "window":false, "document":false, "alert":false, "confirm":false, 
        "prompt":false, "setTimeout":false, "setInterval":false, "location":false});*/
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
    var editorDemo=null;
    var editors = [];
    $(function(){//on popup load
      // hide the cover for disabled mode
      if (ENABLED) {
        $(".for-disabled").hide();
      } else {
        $(".for-disabled").show();
      }
      
      $("#runBtn").click(run);
      $("#runSelectedBtn").click(runSelected);
      $("#saveOptBtn").click(save_options_);
      $("#laodCacheBtn").click(load_cache_all);
      $("#editInOptionPageBtn").click(editInOptionPage);
      $("#deleteBtn").click(remove);
      $("#showInDialogBtn").click(showInDialog);
      //$("#forjstcb").click(changeAutostart);
      $("#enableDisableBtn").click(toggleExtension);
      $("#optionsBtn").click(function() { window.open(chrome.runtime.getURL("options.html"), "OptionPage"); });
      
      $(".toolbar button").button();
      
      $("#jstcb").button({icons: {
            primary: "ui-icon-close"
          }
        }).click(changeAutostart);
        
      if (!inExtensionPage) {
        $("#img-icon").hide();
        $("#title").addClass("indialog");
        $(".onlyInExtensionPage").hide();
        
        API_GetSelectedTab(function(tab) {
          API_SendMessageToTab(tab.id, { method: "RestoreEditDialogContextRequest"});
        });
        
      } else {
        $("body").addClass("inExtensionPage");
        //$("body").height("570px");
      }
      tabs();
      setEnableDisableBtnImage();
      setupKeyEventHandler();
       
      createCustomizeUI();
    
      restore_options(function(){
        //run();
        editor = generateEditor("scriptText", "text/javascript", {
          onChange: function() {  cacheScript();  }
        });
        editorCss = generateEditor("scriptTextCss", "text/css", {
          onChange: function() {  cacheCss();  }
        });
        editorDemo = generateEditor("demo-code", "text/javascript", {
          readOnly:true
        });
        editors = [editor, editorCss, editorDemo];
        
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
        editor.clearHistory();
        
        if (storage.getSetting("popupwindow_displayRequiresField") !== "false") {
          $("#jsincludefile-wrapper").show();
        }
      
        // Height adjusting 
        $(".CodeMirror").each(function(index, ele) {
          var node = $(ele);
          node.css("height", "100%").find(".CodeMirror-gutters, .CodeMirror-scroll")
              .css("height", "100%");
        });
        
        if (RUN_BUTTON_CODE) {
          $("#tabs-1 .CodeMirror").css("background-color", "#ffeeee");
          $("#js-editor-hint").show();
        }
      });
      
      // Adjust editor height when switching among different module tabs
      $("#editor-script-gen-ui-title > ul:first > li").click(adjustSiteEditorWrapperHeight); 
      adjustSiteEditorWrapperHeight();
      
      function adjustSiteEditorWrapperHeight() {
        var editorTop = $("#siteScriptEditorWrapper").offset().top - 32;
        $("#siteScriptEditorWrapper").css("height", "calc( 100% - " + editorTop + "px)");
        $("#siteScriptEditorWrapper .CodeMirror").css("height", "100%")
              .find(".CodeMirror-gutters, .CodeMirror-scroll")
              .css("height", "100%");
      }
      
      function getWindowHeight() {
        if (inExtensionPage) {
          return $("body").height();
        } else {
        }
      }
      
      $(document).tooltip({
        content: function() {
          return $(this).attr('title');
        }
      });
    });//;
    
    function generateEditor(textareaID, mode, extraOptions) {
      var commentKey = mac_os ? "Cmd-Alt-C" : "Ctrl-Alt-C";
      var options = {
        mode: mode,        
        indentWithTabs: false,
        tabSize: 2,
        lineNumbers:true,
        styleActiveLine: true,
        matchBrackets :true,
        theme: getCodeMirrorTheme(), //_yellow
        foldGutter: true,
        lint: {"esversion":6, "expr":true, "indent":2, "globals":
            {"console":false, "chrome":false, "run":false, "seajs":false, "define":false, 
            "ready":false, "msgbox":false, "INFO":false, "UTIL":false,
            "window":false, "navigator":false, "document":false, "alert":false, "confirm":false, 
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
      options.extraKeys[commentKey] = "toggleComment";
      
      if (extraOptions) {
        for (var key in extraOptions) {
          options[key] = extraOptions[key];
        }
      }
      
      var editor = CodeMirror.fromTextArea(document.getElementById(textareaID), options); 
      editors.push(editor);
      return editor;
    }
    
    function setupKeyEventHandler() {
      var mac_os = navigator.userAgent.indexOf("Mac OS") > -1;
      if (mac_os) {
        $('body').addClass("osx");
      }
      
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
      //$("#jstcb").button("refresh");
      var autostart = document.getElementById("jstcb").checked;
      
      var lineCount = editor.lineCount();
      
      save_options();
      
      
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
        //     $(main);    ->      main();
        //  })(jQuery);    ->    })(jQuery);
        //
        var srccode = editor.getValue();
        var srccode = srccode.replace(/\$\s*\(\s*main\s*\)\s*;(\s*\}\s*\)\s*\(\s*jQuery\s*\)\s*;\s*)$/, "main();$1");
        editor.setValue(srccode);
      } else {
        // change from not autostart to autostart
        //
        //     main();    ->      $(main);
        //  })(jQuery);    ->    })(jQuery);
        //
        var srccode = editor.getValue();
        var srccode = srccode.replace(/main\s*\(\s*\)\s*;(\s*\}\s*\)\s*\(\s*jQuery\s*\)\s*;\s*)$/, "$(main);$1");
        editor.setValue(srccode);
      }*/
    }
    
    function updateBgRules(mode, site, autostart) {
      chrome.runtime.sendMessage({method:"UpdateActiveSites", data: {mode:mode, site:site, autostart:autostart} })
    }
    
    function showInDialog() {
      showPageInDialog(false);
    }
    
    function showPageInDialog(hideDialog) {
      if (!inExtensionPage)
        return;
        
      saveEditDialogContext();

      chrome.runtime.sendMessage({tabid: tabID, method:"InjectPopupPage", data:{hideDialog}});
      
      window.close();
    }
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    var metadataSettingStr, metadataSetting, metadataTimestamp;
    var sections = null, plugins = null;
    function createCustomizeUI() {
      metadataSettingStr = storage.getMetadata(false);
      metadataSetting = JSON.parse(metadataSettingStr);
      metadataTimestamp = storage.getSetting("meta_timestamp");
      if (!metadataSetting)
        return;
      
      createModulesTab(metadataSetting);
      createPluginsTab(metadataSetting);
    }
    
    function createModulesTab(metadataSetting) {
      sections = metadataSetting["modules"];
      for (var i=0; i < sections.length; ++ i) {
        var section = sections[i];
        var addRequires = section.addRequires;
        var divID = "genUITab-" + section.moduleName.replace("#", "");  
        var title = "Click button to add module dependency. Other buttons cannot work properly without adding module dependency.";      
        $("#editor-script-gen-ui-title ul").append(`<li class="tab-title tab-level tab-path-0-${i}" tab-path="tab-path-0-${i}" module="${section.moduleName}" target="${divID}">${section.title}</li>`);
        $("#editor-script-gen-ui").append('<div id="'+divID+'" class="tab-pane"></div>');
        var sectionDiv = $('#' + divID);
        //sectionDiv.append('<div><h3 class="section-title" data="'+section.objName+' = Object.create">'+section.title+'<input type="text" value="'+section.title+'" style="display:none" /></h3></div>');
        sectionDiv.append(`<div style="display:inline; margin-right:5px;"><button class="add-script-btn init-script-btn" type="button" title="${title}" data-module="${section.moduleName}" data-obj="${section.objName}" data-addRequires="${addRequires}" data-code="" >Init</button></div>`);
        for (var j=0; j < section.commands.length; ++ j) {
          var command = section.commands[j];
          var statementType = command.statement ? command.statement : "common";
          // The default first command Init and the actual first command in meta data are shown in "display:inline"
          // Besides, commands taking none argument are also shown in "display:inline". 
          // Other commands are shown in "display:block0."
          var display = (j<1) || !command["args"] || (command.args.length<1) ? 'inline':'block';
          var displayClass = display === "block" ? "line" : "";
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
            var element = `<div style="display:inline" class="${displayClass}"><button class="add-script-btn${runClass} init-script-btn" type="button" title="${title}" data-module="${moduleName}" data-obj="${objName}" data-addRequires="${addRequires}" data-code="" >${command.title}</button></div>`
            sectionDiv.append(element);
          } else if (code) {
            var element = `<div style="display:inline" class="${displayClass}"><button class="add-script-btn${runClass}" type="button" title="${title}" data-module="${moduleName}" data-obj="${objName}" data-code="${command.code}" >${command.title}</button></div>`
            sectionDiv.append(element);
          } else {
            var src = `<div style="display:${display}" class="${displayClass}"><button class="add-script-btn${runClass}" type="button" title="${title}" data-module="${moduleName}" data-obj="${objName}" data-statement="${statementType}" data-func="${section.objName}.${command.funcname}" >${command.title}</button></div>`;
            var commandDiv = $(src).appendTo(sectionDiv);
            for (var k=0; k < command.args.length; ++ k) {
              var arg = command.args[k];
              var inputID = "code-arg-" + i + "-" + j + "-" + k;
              var type = arg.type ? arg.type : "text";
              if (type == "select") {
                var element = '<span>' + arg.name + '</span>:<select id="' + inputID + '" class="code-arg-value">';
                for (var m=0; m < arg.options.length; ++ m) {
                  var option = arg.options[m];
                  element += '<option>' + option + '</option>';
                }
                element += "</select>";
                commandDiv.append(element);

              } else {
                var size = arg.len ? arg.len : 10;
                var unitWidth = 350 / 47;
                var width = Math.floor(size * unitWidth) + "px";
                var element = '<span>' + arg.name + '</span>:<input id="' + inputID + '" type="text" class="code-arg-value" value="' + arg.defaultValue + '" data-type="' + type + '" style="width:' + width + ';" />';
                commandDiv.append(element);
              }
              
              if (type == "domnode") {
                element = '<input type="button" class="select-domnode-btn" title="Click to choose a dom node.<br/>Click the argument name to highlight the matching dom node." style="float:none; display:inline;"/> ';
                commandDiv.append(element);
              } else if (type == "url") {
                API_GetTabURL((function(inputIDStr) { return (function(url) {
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
        .css("max-height", ""+storage.getSetting("popupwindow_genUIPanelMaxHeight")+"px")
        .append('<div id="genUITab-____Clear______" class="tab-pane"></div>');
      
      $(".add-script-btn").click(addScript);
        
      $(".init-script-btn").click(addRequireFile);
      $(".select-domnode-btn").click(startSelectingDomNode)
          .prev().prev().attr("title", "Click to highlight the node.").click(hightlightSelectorNode);
      $("#editor-script-gen-ui input:button, #editor-script-gen-ui button").button();
      
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
    
    function createPluginsTab(metadataSetting) {
      plugins = metadataSetting["plugins"];
      var pluginsCopy = plugins.concat();
      var i = 0;
      for (i = 0; i < pluginsCopy.length; ++ i) {
        var plugin = pluginsCopy[i];
        plugin.pos = i;
      }
      
      pluginsCopy.sort(function(a, b) {
        var enableda = a.enabled ? 0 : 1, enabledb = b.enabled ? 0 : 1;
        var indexa = a.index ? a.index : 0, indexb = b.index ? b.index : 0;
        var posa = a.pos, posb = b.pos;
        return Math.sign( (Math.sign(enableda - enabledb) << 2) + 
                          (Math.sign(indexa-indexb) << 1) + (Math.sign(posa - posb)) );
      });
      
      var container = $("#allplugins");
      for (i = 0; i < pluginsCopy.length; ++ i) {
        var plugin = pluginsCopy[i];
        var enabled = plugin.enabled, info = plugin.info;
        var clazz = enabled ? "enabled" : "disabled";
        var item = $(`<tr class="${clazz}" pos="${plugin.pos}" display-index="${plugin.index}">
                        <td><div class="pluginIcon" title="Click to toggle plugin"></div></td>
                        <td class="pluinInfo">${i + 1} - ${info}</td>
                      </tr>`)
                    .appendTo(container)
                    .find(".pluginIcon").click(togglePlugin);
                    
        delete plugin.pos;
      }
    }
    
    function togglePlugin() {
      var metadataTimestampNow = storage.getSetting("meta_timestamp");
      if (metadataTimestamp !== metadataTimestampNow) {
        if (confirm("The meta data has been modified. Reload this page now?")) {
          location.reload();
        }
        return;
      }
    
      var trnode = $(this).closest("tr");
      var index = parseInt(trnode.attr("pos"));
      if (trnode.hasClass("enabled")) {
        // disable plugin
        trnode.removeClass("enabled");
        trnode.addClass("disabled");
        setPluginEnabled(index, false);
      } else {
        // enable plugin
        trnode.removeClass("disabled");
        trnode.addClass("enabled");
        setPluginEnabled(index, true);
      }
      
      function setPluginEnabled(index, enabled) {
        //plugins[index].enabled = enabled;
        var newMeta = JsonAnalyzer.setProperty(metadataSettingStr, 
                                  ".plugins["+index+"].enabled", enabled);
        storage.setMetadata(newMeta);
        metadataTimestamp = storage.getSetting("meta_timestamp");
        chrome.runtime.sendMessage({method:"UpdateSettings"});
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
      var selector = $(this).next().val();
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
      
      //log("Restore popup window context:", context/*, "at", new Error().stack*/);
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
      storage.setSetting("temp-popupWindowContext", contextStr);
      // log("Remember popup window context", contextStr/*, "at", new Error().stack*/);
    }
    
    function loadRememberedStatus() {
      var context = storage.getSetting("temp-popupWindowContext");
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
      var addRequires = node.attr("data-addRequires") === "true";
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
    
    
      // Set require filed 
      if (addRequires) {
        var requireInput = $("#jsincludefile");
        var requireFilesText = requireInput.val();
        var requireFiles = requireFilesText.split(/\s*,\s*/);

        if (!requireFiles.contains(className))
          requireFiles.push(className);
        else
          requireFiles = requireFiles.filter(function(str) {return str != className; });
      
        requireFilesText = requireFiles.filter(function(str) {return str != ""; }).join(", ");
        requireInput.val(requireFilesText);
      }
    }
    
    function runCodeOnRunButtonClicked(codesnippet, moduleName, objName) {
      //var header = editor.getValue().match(/\s*(run[\s\S]*?function\s*\(.*\)\s*\{)/)[1];    // The first line of the script in edit
      //var wrappedCode = header + "\n" + codesnippet + "\n});";
      var wrappedCode = `run(["${moduleName}"], function(${objName}) {\n${codesnippet}\n});`;
      
      console.log(wrappedCode);
      execute("Selected site script", wrappedCode, editorCss.getSelection());
    }