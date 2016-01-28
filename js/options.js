
  // jQuery UI Dialog: Double click dialog title bar to toggle dialog content
  $(function() {
    $("body").on("dblclick", ".ui-dialog-titlebar", function(event) {
      $(event.target).parents(".ui-dialog").find(".ui-dialog-content").toggle();
    });
  });

    
    var mapSiteScriptFunc = dummyMapFunc;
    var mapContentScriptFunc = dummyMapFunc;
    
    var metadata;

    var editorJs = null;
    var editorCss = null;
    var editorMeta = null;
    var editorDynScript = null;
    var editorJsonFile = null;
    var editorJsonObjectValue = null;
    var editors = [];
    var hlLineJs = null;
    var hlLineCss = null;

    var currentSavedState=null;
    var currentSavedStateCss=null;
    var currentSavedStateMeta=null;

    var focusNotOnMenuList = true;
    var focusedMenuItem = null;
    var hiddenOpt = true;
    
    var dialog;
    
    var jsonFileAnchor = 0;
    var selectedContentScript = "";
    var groupOfSelectedCS = null;
    var selectedCSGroup = null;
    var currentSavedStateDCS = "";
    var selectedCSGroupBtnTitle;
    var csPosInMetaData = {}; // a dictionary shows in appearances of a script in the meta data (include and plugins section)
    
    var contentScriptGroups = {};
    var csGroupUIprops = storage.getSetting("csgroup-ui", true, {});


    var optionPageParams = {};
    function parsePageParams() {
      var paramStr = location.href.match(/\?(.*)/);
      if (paramStr)  
        paramStr = paramStr[1]; 
      else 
        return;
        
      var params = paramStr.split(/&/).filter(function(str) { return str !== ""; });
      for (var i = 0; i < params.length; ++ i) {
        var parts = params[i].split(/=/);
        var name = parts[0];
        var value = parts[1];
        if (value)
          optionPageParams[name] = decodeURIComponent(value);
      }
    }
    parsePageParams();


    var selectedTitle = "";    
    var scripts = ["lib/jquery.js"];
    
    var defaultSettings = {};
    
    chrome.manifest = (function() {
      var manifestObject = false;
      var xhr = new XMLHttpRequest();

      xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
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
    var saveFunc = emptyFunc, findReplaceFunc = emptyFunc;
    function save() {
      saveFunc();
    }
    function emptyFunc() {}
    function saveDisabledForPreviewFunc() {
      alert("Save is disabled in preview mode.");
    }
    function saveSiteScript()
    {
      if (mapSiteScriptFunc === findReplaceDialog_mapReplacedScript) {
        saveDisabledForPreviewFunc();
        return;
      }
      
      console.log("Save the site script.");
      if(selectedTitle === "")
        return;
      
      var key = selectedTitle;
      var val = editorJs.getValue() ;
      var cssval = editorCss.getValue();
      var autos = $("#jscb")[0].checked;
      var hid = $("#jshid").attr('checked');
      var sf = $("#jsincludefile").val();
      var type = (key === "Default" || key === "Main") ? "dss" : "ss";
      
      var menuitem = $(`#menu .jstbox[data-site='${key}']`);
      if (autos)
        menuitem.addClass("autostart");
      else
        menuitem.removeClass("autostart");
      
      
      var tmp =  {"name":key, "type":type, "script": val, "autostart": autos, "hidden": hid , "sfile": sf, "css": cssval};
      storage.saveScript(tmp);
      chrome.runtime.sendMessage({method:"UpdateIconForDomain", data: key });
      
      currentSavedState = editorJs.getValue();
      currentSavedStateCss = editorCss.getValue();
      
      var noErrorFound = checkScriptSyntax(editorJs);  
      if (!noErrorFound) {
        showMessage("Error found in current site script!");
        return;
      } else {
        showMessage("Script and CSS tricks saved!");
      }
      
      run("save");
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
    /*
    function showJSSyntaxCheckReport(editor, data) {
      var warnings = [];
      var errors = data.errors ? data.errors.filter(function(err) {
        if (err === null) {
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
        var metadata = jsonlint.parse(meta);
        storage.setMetadata(meta);
        currentSavedStateMeta = editorMeta.getValue();
        
        updateMetaData(meta);
        
        // update meta data into chrome.storage.local
        updateSettings();
      } catch (ex) {
        console.log(ex);
        
        showMessage("!!! Cannot save Metadata due to syntax error!");
        return;
      }
      
      showMessage("Metadata saved!");
    }
    
    
    function deleteRecord()
    {
      if(selectedTitle === "")
        return;
      if(selectedTitle === "Default" || selectedTitle === "Main")
      {
        showMessage("You can't delete '" + selectedTitle + "' trick, sorry...");
        return;
      }
      var key = selectedTitle;      
      var $message = $("#jstmessage");
      
      if(confirm("Do you realy want to delete that trick?"))
      {
        storage.deleteScript(["ss", key]);
        chrome.runtime.sendMessage({method:"UpdateIconForDomain", data: key });
        
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
          } )},1750);
      
    }
    function run(invoker){      
      if (invoker && invoker === "save") {}
      else {
        loadSiteScripts();
      }
    }
    function isSiteScriptName(v) {
      if(v!=='Default' && v!=='Main' && v!=='cacheCss' && v!=='cacheScript' && v!=='info' && v!=='meta' && v!=='$setting' 
          && !(/^\$setting\./.test(v))   && !(/^\$cs-/.test(v))  ) /**/ {
        
        return true;
      }
      
      return false;
    }
    function isContentScriptName(v) {
      return v.startsWith("$cs-");
    }
    
    // Compare domain names
    function compareDomainName(domain1, domain2) {
      function extractSLD(domain) {
        // extract second-level domain as an two-element-array
        if (domain == undefined) domain = "";
        var match = domain.match(/([^\.]+)/g);
        var domainParts = match.map(function(str) { return str ? str : ""; });
        if (domainParts.length < 2) domainParts.push("");
        var tld = domainParts.pop();
        var sld = domainParts.pop();
        domainParts.push(tld);
        domainParts.push(sld);
      
        return domainParts;
      }
      function compareDomainParts(domainParts1, domainParts2) {
        var i = 0, sum = 0, num = 0, len1 = domainParts1.length, len2 = domainParts2.length, 
            len = len1;
        if (len1 > len2) {
          var offset = len1 - len2;          
          len = len1;
          while (offset -- > 0) { domainParts2.unshift(""); }
        } else if (len1 < len2) {
          var offset = len2 - len1;
          len = len2;
          while (offset -- > 0) { domainParts1.unshift(""); }
        }
        for (i = 0; i < len; ++ i) {
          num = domainParts1[i].localeCompare(domainParts2[i]); // num is -1, 0, or 1
          num = num << i;
          sum += num;
        }
        return Math.sign(sum);
      }
      
      var parts1 = extractSLD(domain1), parts2 = extractSLD(domain2);
      return compareDomainParts(parts1, parts2);
    }
    // Compare scripts by their domain names
    function compareSiteScriptsBySLD(s1, s2) {      
      return compareDomainName(s1.name, s2.name);
    }
    function loadSiteScripts(filterOptions, contentType, nameFilter, callback) {      
      $("#menu").empty();

      var values = null, siteScripts = storage.loadIndexObj("ss").siteScripts;
      var keys = objectToArray(siteScripts, true);
      var inited = keys.length > 0;
      keys = keys.filter(function(site) { return site !== "Main" && site !== "Default"; });
      keys.sort(compareDomainName);
      keys.unshift("Main", "Default");
      //console.log(keys);
      
      // Do not need to filter scripts by its content
      if (!filterOptions || filterOptions.targetType === "name") {
        // only autostart property is used (in addMenuBox function), so there is no need
        // to load all scripts. Just creating a list of object that has the autostart property
        // is OK.
        values = keys.map(function(site) {
          return {site:site, autostart:siteScripts[site].active}; 
        }).reduce(function(result, ele, inx, arr) {
          //console.log(result, ele, inx);
          result[ele.site] = ele;
          return result;
        }, {});
        //console.log(values);
        
        // Filter site scripts and add them to script menu list.
        filterSiteScript(keys, values, filterOptions, contentType, nameFilter, callback);
      } 
      
      // Filter scripts by its content
      else {
        values = {};
        // Load all default scripts and site scripts, and add them into values object
        // in a filter (the third parameter)
        storage.getAllScripts(["dss", "ss"], function(scripts) {
          // on complete
          //console.log(values);
          
          // Filter site scripts and add them to script menu list.
          filterSiteScript(keys, values, filterOptions, contentType, nameFilter, callback);
        }, function(name, type, script) {
          // in filter
          values[name] = script;
          
          // values are already added to values object, so there is no need to add the item to a result set again.
          return false;
        }, function(err) {
          // on err
          console.log("Cannot load site scripts due to", err);
          showMessage("Cannot load site scripts due to " + err);
        });
      }      
    }
    
    function filterSiteScript(keys, values, filterOptions, contentType, nameFilter, callback) {
    
      for(var i = 0; i < keys.length; ++ i) {
        try {
          v = keys[i];       
          if (nameFilter) {
            if (!nameFilter(v))
              continue;
          }
          
          var lsd = values[v];
          var addFlag = false, contentFlag = false, autostartFlag = true;
          if (!filterOptions) {
            addFlag = true;
          } else {
            var textPattern = filterOptions["pattern"];
            var andorAutostart = filterOptions["andorAutostart"]; // and, or
            var autostartValue = filterOptions["autostart"]; // true, false, any
            var name = filterOptions["name"];
            
            if (name) {
              if (name !== v)
                continue;
              else
                addFlag = true;      
            } else {
              if (contentType) {
                var content = "";
                  
                if (contentType === "js") {
                  content = lsd.script;
                } else if (contentType === "css") {
                  content = lsd.css;
                } else if (contentType === "js+css") {
                  content = lsd.script + "\n" + lsd.css;
                } else if (contentType === "name") {
                  content = v;
                }
                
                contentFlag = content.match(textPattern);
              }
              
              if (autostartValue === "any")
                autostartFlag = true;
              else
                autostartFlag = lsd.autostart ? autostartValue === "true" : autostartValue === "false";
              
              if (andorAutostart === "and")
                addFlag = contentFlag && autostartFlag;
              else
                addFlag = contentFlag || autostartFlag;
            }
          }
          
          if (addFlag)
            addMenuBox(v,lsd);
          
        } catch(e) {
          console.error("Error:", e);
        }
      }      

      // Hide the Main script if set so in options
      if (storage.getSetting("sitescripts_showMainScript") !== "true") {
        $(".siteScriptKey[data-site='Main']").hide();
      }
      
      if (callback)
        callback();
    }
    
    function addMenuBox(v,lsd)
    {
      var autostartclass = lsd.autostart ? " autostart" : "";
      var autostartStatus = lsd.autostart ? "active" : "inactive";
      var $divbox = $(`<div class='jstbox siteScriptKey${autostartclass}' title='Site script for ${v} is ${autostartStatus}' data-site='${v}' style='position:relative;'><nobr></nobr></div>`);
      var $divcontainer = $divbox.find("nobr:first");
          
      $divbox.click(function(){ 
        selectSite(this);
      });
      $divcontainer.append($("<div class='jsttitle' >").text(v));  
      
      if(v!=="Default" && v!== "Main") {
        var $imgLink = $("<img class='goto' border=0 src='css/theme/img/url_icon.gif'>");
//         if(lsd.hidden === 'checked')
//         {
//           $imgLink.click(function(){
//             chrome.windows.create({"url":"http://"+v, "incognito": true});
//           });
//           $imgLink.attr("src","css/theme/img/url_icon_i.png");
//         }
//         else
//         {
          $imgLink.click(function(){
            chrome.tabs.create({"url":"http://"+v});
          });
//         }
        $divcontainer.append($imgLink);
      }
      
//       if(lsd.hidden === 'checked')
//       {
//         if(hiddenOpt)
//           $divbox.hide();
//         $divbox.addClass('hiddenFlag');
//       }
      
      if(selectedTitle === v)
        $divbox.addClass("selected");
        
      $("#menu").append($divbox);
    }
    
    
    function selectSite(obj)
    {
      if( changed() )
        return;
      
      if( $("#editorJs").css("visibility") === "hidden")
        $("#editorJs").hide().css({"visibility":""}).fadeIn();
      
      var v = $(obj).text();
      
      var flag = {index:1, len:2, found:false}
      
      storage.getScript(v, ["dss", "ss"], function(script, name, type) {
        // On loaded
        if (!script) {
          if (!flag.found && flag.index++ == flag.len) {
            console.log("Cannot find site script", v);
          }
          return;
        }
        flag.found = true;
        
        selectSiteOnScriptLoaded(obj, script);
      }, function(err) {
        // On err
        console.error("Cannot load script due to", err);
        showMessage("Cannot load script due to " + err.message);
      });
    }
    
    function selectSiteOnScriptLoaded(obj, lsd) {
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
        
        
      selectedTitle = lsd.name;
      console.log("selectedTitle is", selectedTitle);
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
        if($(el).val() === lsd.sfile)
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
      
      showMessage("Loaded '"+lsd.name+"' site's trick!");
    }
          
    // Click on the script selected before. If none is selected, select the first script.
    // Used as call back (last argument) for loadSiteScripts
    function clickOnSelectedSite() {
      var site = selectedTitle;
      var selectedSiteMenu = $(`#site-list .jstbox[data-site='${site}']`).click();
      if (selectedSiteMenu.length < 1)
        $("#site-list .jstbox:first").click();
    }
      
    function editTitle($box)
    {
      $(".jsttitle", box);
    }
    function changed()
    {
      if(currentSavedState!==null)
      {
        if(currentSavedState !== editorJs.getValue() )
        {
          return !confirm("Script changed! Discard?");
        }
      }
      if(currentSavedStateCss!==null)
      {
        if(currentSavedStateCss !== editorCss.getValue() )
        {
          return !confirm("Css changed! Discard?");
        }
      }
      return false;
    }
//     function filterSiteScriptByJSContent() {
//       var content = $("#jscontentfiltertext").val();
//       var mode = $("#contentfiltermode")[0].selectedIndex;
//       var filter = content;
//       if (mode){
//         filter = new RegExp(content);
//       }
//       loadSiteScripts(filter, "js");
//     }
//     function filterSiteScriptByCSSContent() {
//       var content = $("#jscontentfiltertext").val();
//       var mode = $("#contentfiltermode")[0].selectedIndex;
//       var filter = content;
//       if (mode){
//         filter = new RegExp(content);
//       }
//       loadSiteScripts(filter, "css");
//     }
//     function filterSiteScriptShowAll() {
//       loadSiteScripts();
//     }
    
     
        
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
    
    
    $(function(){//on load
      $("#theme").change(function() {
        var theme = $(this).val();
        setTheme(theme);
      });
      
      sandbox_init();
//       $("#testtest").click(cloudStorageGenCode);
    
//       $("#jscontentfilterbtn").click(filterSiteScriptByJSContent);
//       $("#csscontentfilterbtn").click(filterSiteScriptByCSSContent);
//       $("#clearcontentfilterbtn").click(filterSiteScriptShowAll);
      
      //$("#forjscb").click(changeAutostart);
      $("#jscb").change(changeAutostart);
      $("#jssave").click(saveSiteScript);
      $("#jsdelete").click(deleteRecord);  
      $(".findReplaceDialogBtn").click(showFindReplaceDialog);
      $("input:button.textSizeUpBtn").click(function(){textSize(1);});
      $("input:button.textSizeDownBtn").click(function(){textSize(-1);});        
      $("#findDialog-findBtn").click(findReplaceDialog_find);
      $("#findDialog-previewBtn").click(findReplaceDialog_preview);
      $("#findDialog-cancelBtn").click(findReplaceDialog_cancel);
      $("#findDialog-doBtn").click(findReplaceDiailog_do);
          
      $('#backupbtn').click(backup);
      $('#restorebtn').click(restore);
      $('#loadDftSettingsBtn').click(loadDefaultSettings);
      $('#rebuildScriptIndexesBtn').click(rebuildScriptIndexes);
      $('#genInitSettingbtn').click(backupInitialSettings);
      $("#cloudsave-savesettings").click(cloudStorageSaveSettings);
      $("#cloudsave-backuptokens").click(cloudStorageBackupTokens);
      $("#cloudsave-restoretokens").click(cloudStorageRestoreTokens);
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
      $("#rebuildScriptIndexesBtn").click(rebuildScriptIndexes);
      $("#loadScriptsLStoDBBtn").click(upgradeDataStorage);
      $("#loadScriptsDBtoLSBtn").click(downgradeDataStorage);
      $("#reportStorageUsageDbBtn").click(reportStorageUsage);
      $("#clearDbBtn").click(clearDatabase);      
      
      $("#removeTempSettingsBtn").click(removeTempSettings);
      
      $("#dcssave").click(save);
      $("#dcsadd").click(addContentScript);
      $("#dcsdelete-allselected").click(deleteAllSelectedContentScripts);
      $("#dcsregroup").click(regroupAllSelectedContentScripts);
      $("#dcsrename").click(renameContentScript);
      $("#dcsgencodebytemplate").change(generateContentScript);
      $("#dcsdelete").click(deleteContentScript);
      $("#dcssort").click(sortContentScript);
      $("#dcsindexup").click(moveUpContentScript);
      $("#dcsindexdown").click(moveDownContentScript);
      $("#dcsreindex").click(reindexContentScript);      
      $("#importOnce").change(saveContentScript);
      $("#dcsupdatemenu").click(updateContentScriptForContextMenu);
      $("#dcsshownameortitle").click(toggleConentScriptNameDisplay);
      
      // Use jQuery UI buttons
      $("input:button, button").button();
      $("#dcsmultiselect").button({icons: { primary: "ui-icon-circle-check" }, text:false });
      $("#dcsadd").button({icons: { primary: "ui-icon-plusthick" }, text:false });
      $("#dcsdelete-allselected").button({icons: { primary: "ui-icon-minusthick" }, text:false });
      $("#dcsindexup").button({icons: { primary: "ui-icon-circle-arrow-n" }, text:false });
      $("#dcsindexdown").button({icons: { primary: "ui-icon-circle-arrow-s" }, text:false });
      $("#dcsrename").button({icons: { primary: "ui-icon-pencil" }, text:false });
      $("#dcsreindex").button({icons: { primary: "ui-icon-arrowthick-2-n-s" }, text:false });
      $("#dcsregroup").button({icons: { primary: "ui-icon-folder-collapsed" }, text:false });
      $("#dcsshownameortitle").button();
      $("#dcsgroupselected").button().click(function(e) {e.preventDefault();});
      selectedCSGroupBtnTitle = $("#dcsgroupselected").next().attr("title");
      
        
        
      $("#jscb, #jshid, #importOnce").button({icons: {
            primary: "ui-icon-close"
          }
        });
      
      //$(".colorpicker").colorpicker();
      
      loadContentScriptTemplate();
      loadAllContentScripts();
      $(".navbar > *").scrollTop(0);
      
      $('#jsonFileLoad').click(loadJsonFile);
      $('#jsonFileUpdate').click(updateJsonObject);
      $('#jsonObjExtract').click(extractJsonObject);
      
      initControlsRelatingToLocalStorage();
      
      setupKeyEventHandler();
      
      $("#dcsmultiselect").click(function() {
        setMultiSelectionEnabled(this); 
      });
      
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
      
      if (!storage.getSetting("cloud-url"))
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
        if(ev.keyCode===112)
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
          
        if(event.altKey && modifier && String.fromCharCode( event.which ).toLowerCase() === 'h')
        {
          $(".jstbox.hiddenFlag").each(function(ind,el){$(el).delay(ind*100).slideToggle();});
          $("#jshid, label[for=jshid]").fadeToggle();
          
          if(hiddenOpt === true)
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
            if (item) {
              var menuitem = $(`div.jstbox.contentScriptKey[name='${item}']`);
              // expand the group to which this script belongs
              var group = menuitem.attr("group");
              var groupmenuitem = $(`div.jstbox.contentScriptGroup[group='${group}']`);
              if (groupmenuitem.hasClass("closed"))
                groupmenuitem.click();
                
              // Load the content script              
              menuitem.click();
            }
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
          var startuptab = storage.getSetting("startuptab");
          $(`.tabs:first li:eq(${startuptab})`).click();
          //$('.settingNav .settingKey:eq(2)').click();
        } catch (exception) {}
      }
      
      $(document).tooltip({
        tooltipClass: "tooltip",
        content: function() {
          return $(this).attr('title');
        }
//         ,show: { delay: 1000 }
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
      var jsLintOption = {
          async: true,
          /* This option need hack on /lib/codemirror/addon/lint/lint.js */
          lineCountDelay: [{lines:5000, delay:1000}, {lines:10000, delay:2000}],
          options: {"esversion":6, "expr":true, "indent":2, "globals":
            {"console":false, "chrome":false, "run":false, "seajs":false, "define":false, "ready":false, 
            "INFO":false, "window":false, "navigator":false, "document":false, "alert":false, "confirm":false, 
            "prompt":false, "setTimeout":false, "setInterval":false, "location":false,
            "localStorage":false, "FileReader":false} }
        };
      var lintOption = mode.indexOf("javascript") > 0 ? jsLintOption : {};
      var options = {
        mode: mode,          
        indentWithTabs: false,
        tabSize: 2,
        lineNumbers:true,
        styleActiveLine: true,
        matchBrackets :true,
        styleSelectedText: true,
        theme: getCodeMirrorTheme(), //_yellow, abcdef, default
        foldGutter: true,
        lint: lintOption,
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
      var metadata = storage.getMetadata();
      if (metadata) {
        editorMeta.setValue(metadata);
        updateMetaData(metadata);
      } else {
        editorMeta.setValue("");
      }
      editorMeta.clearHistory();
    }
    
    function updateMetaData(metadatastr) {      
      try {
        metadata = JSON.parse(metadatastr);
        updateUIbyMetaData(metadata);
      } catch (ex) { console.error(ex);}
    }
    
    function updateUIbyMetaData(meta) {
      var includes = meta.include;
      var plugins = meta.plugins;
      var newScriptListsInCSL = []; // CSL is short for chrome.storage.local
      csPosInMetaData = {};
      
      var menuItem = $('.contentScriptKey.jstbox');
      menuItem.removeClass("include").removeClass("plugin");
      var i;
      
      if (includes)
        for (i = 0; i < includes.length; ++i) {
          var include = includes[i];
          menuItem = $(`.contentScriptKey.jstbox[name='${include}']`);
          menuItem.addClass("include");
          
          newScriptListsInCSL.addIfNotIn(include);
          if (!csPosInMetaData[include] )
            csPosInMetaData[include] = [];
          csPosInMetaData[include].push("include[" + i + "]");
        }
        
      if (plugins)
        for (i = 0; i < plugins.length; ++i) {
          var plugin = plugins[i];
          var action = plugin.action;
          var pluginScript = action.script;
          var topFrame = action.topFrame;
          
          if (pluginScript) {
            menuItem = $(`.contentScriptKey.jstbox[name='${pluginScript}']`);
            menuItem.addClass("plugin");
            if (topFrame) {
              menuItem.addClass("top");
            } else {
              menuItem.removeClass("top");
            }

            newScriptListsInCSL.addIfNotIn(pluginScript);
            if (!csPosInMetaData[pluginScript] )
              csPosInMetaData[pluginScript] = [];              
            csPosInMetaData[pluginScript].push("plugins[" + i + "]");
          }
        }
        
      // update script stored in chrome.storage.local
      //console.log(csPosInMetaData);
      storage.updateTopFrameScriptList(newScriptListsInCSL, function(errmsg, notFound) {
        if (errmsg) {
          var notFoundPos = notFound.map(function(name) { 
            return name + ": " + csPosInMetaData[name].join(", ");
          }).join("\n");
          
          alert(errmsg + ".\nTheir positions in meta data are:\n" + notFoundPos);
        }
      });
    }
    
    function setupKeyEventHandler() {
      var mac_os = navigator.userAgent.indexOf("Mac OS") > -1;
      if (mac_os) {
        $('body').addClass("osx");
        $(":button[value='Save [Ctrl+S]']").val("Save [⌘S]");
      }

      $("*").focus(function(event) {
        focusNotOnMenuList = true;
      });
      $(".navbar *").click(function(event) {
        focusNotOnMenuList = false;
        var node = $(event.target).closest(".jstbox");
        if (!node.hasClass("folder"))
          focusedMenuItem = node;
        //console.log(focusedMenuItem);
      });
      
      $('body').on('keydown',function (event){
        var key = event.which;
        var modifier = event.ctrlKey;
        if (mac_os) {
          modifier = event.metaKey;
        }
        // console.log(event.which);// 打印出具体是按的哪个按键。
        
        if(modifier) {
          var keyDown = String.fromCharCode( key ).toLowerCase();
          if (keyDown === 's') {
            save();
            event.preventDefault();
            return;
          } else if (keyDown === 'f') {
            findReplaceFunc();
            event.preventDefault();
            return;
          }
        }
        
        // Up and down keys
        if (key === 38 || key === 40) {
          
          if (focusNotOnMenuList)
            return;
          
          event.preventDefault();          
          // 22 is the height of .jstbox
          var node = focusedMenuItem, menuItemHeight = 22, yCodMoved = 0;
          
          if(event.which === 38) {
            do {
              node = node.prev();
              yCodMoved += menuItemHeight;
            } while (node.length > 0 && !node.hasClass("siteScriptKey") && !(node.hasClass("file") && node.hasClass("opened") ));
          } else if (event.which === 40) {
            do {
              node = node.next();
              yCodMoved += menuItemHeight;
            } while (node.length > 0 && !node.hasClass("siteScriptKey") && !(node.hasClass("file") && node.hasClass("opened") ));
          }
          console.log("--", node.attr("name"));
          
          if (node.length < 1)
            return;
            
          node.click();            
          // Scroll the scrollbar if needed
          var container = node.parent();
          var containerHeight = container.height();
          var pos = node.position();
          var pos_y = pos.top; // 32 is the height of the menu item.
          console.log(`Container height is ${containerHeight} and y position is ${pos_y}`);
          
          if (pos_y + yCodMoved > containerHeight) {
            container[0].scrollTop += yCodMoved;
          } else if (pos_y < 0) {
            container[0].scrollTop -= yCodMoved;
          }
          console.log(container[0].scrollTop);
        }
      });
    }
    
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
              if(el.id === target)
                $(el).css({"z-index":200}).animate({"margin-left":0});
              else
                $(el).animate({"margin-left":-$("body").width() });
                
            });
          });
          $(el).data("tabName",$(el).children("a").attr("href").replace("#",""));
          $(this).text($(this).children("a").text()).children("a").remove();
          
        });
        
        $(tabs).find("> div").css({"z-index:":200}).not(":first").css({"margin-left":-$(tabs).width(),'z-index':100});
        $(tabs).find("> ul li:first").addClass("selected");
      });
      
      $("#toptabs > ul li:eq(0)").click(function () { 
        saveFunc = saveSiteScript; 
        findReplaceFunc = function() { showFindReplaceDialog(null, "Site Scripts"); };
      });
      $("#toptabs > ul li:eq(1)").add("#toptabs > .tab:eq(1) .tabs > ul li").click(function () { 
        if ($("#tabs-metadata").hasClass("selected")) {
          saveFunc = saveMetadata;
          console.log("saveFunc = saveMetadata");
        } else {
          saveFunc = saveContentScript; 
          console.log("saveFunc = saveContentScript");
        }
        
        findReplaceFunc =  function() { showFindReplaceDialog(null, "Content Scripts"); };
      });
      $("#toptabs > ul li:gt(1)").click(function () { saveFunc = emptyFunc; findReplaceFunc = emptyFunc;});
      
      $("#toptabs > ul li").each(function(ind, el) {
        $(el).click(function() {
          storage.setSetting("startuptab", ind, true);
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
          nav.find('.settingPanel').hide();
          $('#'+target).show();
        });
      });
    }
    
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
        if($opt.text() === "")
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
          if(href[0] === "/" || !href.match(/^http/))
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
            });
          
          });
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
      
      if (selectedTitle !== "Default") {          
        /*      
        if (autostart) {
          // change from autostart to not autostart
          //
          //     $(main);    ->      main();
          //  })(jQuery);    ->    })(jQuery);
          //
          var srccode = editorJs.getValue();
          var srccode = srccode.replace(/\$\s*\(\s*main\s*\)\s*;(\s*\}\s*\)\s*\(\s*jQuery\s*\)\s*;\s*)$/, "main();$1");
          editorJs.setValue(srccode);
        } else {
          // change from not autostart to autostart
          //
          //     main();    ->      $(main);
          //  })(jQuery);    ->    })(jQuery);
          //
          var srccode = editorJs.getValue();
          var srccode = srccode.replace(/main\s*\(\s*\)\s*;(\s*\}\s*\)\s*\(\s*jQuery\s*\)\s*;\s*)$/, "$(main);$1");
          editorJs.setValue(srccode);
        }  */  
      }  
      
      var autos = $("#jscb")[0].checked;
      chrome.runtime.sendMessage({method:"UpdateActiveSites", data: {mode:"active", site:selectedTitle, autostart:autos} });
      
      saveSiteScript();
    }
    
    function backup() {
      // Create a backup object
      storage.backup(function(backupObj) {
        // Stringify the backup object
        var data = JSON.stringify(backupObj);
        if (storage.getSetting("backup-readable", true, false))
          data = formatter.formatJson(data, "  ");
        var link = $('#__UI_dialog__link');
        link.attr('download', "backup-"+(new Date()).Format("yyMMdd-hms")+".json" );
        link.attr('href', "data:text/plain;charset=UTF-8,"+encodeURIComponent(data));
        link.attr('data-downloadurl', "text/plain:backup.json:"+"http://html5-demos.appspot.com/static/a.download.html");
        link.innerHtml = "Download";
        link.show();
      
        //var bb = new Blob([data], {type: 'text/plain'});
        //var href = URL.createObjectURL(bb);        
      }, {cloud:true});

    }
    
    function restore() {
      var file = $('#__LocalStorageFP__')[0].files[0];
      if (typeof file === 'undefined') {
        alert("Please select a backup file first.");
      } else {
        var reader = new FileReader();
        reader.onload = function() {
          try {
            text = this.result;
            var backupObj = JSON.parse(text);
            storage.restore(backupObj, function() {
              // On complete
              alert("All configurations and scripts are successfully restored.");
              location.reload();
            }, {cloudSettings:false});
          } catch(ex) {
            alert("Restoration failed due to invalid backup file, which can not be parsed as an JSON object.");
          }
        };
        reader.readAsText(file);
      }
      
      // REMEMBER TO CALL storage.rebuildScriptIndexes
    }
    
    function backupInitialSettings() {
      var settings = {"$setting.DEBUG":"false", "$setting.enabled":"true", "$setting.startuptab":"0"};
      UTIL.extendObj(settings, defaultSettings);
      
      // Create a backup object that does not include any settings and only contains Main 
      // site script and content scripts whose name is in metadata.builtinLib array
      storage.backup(function(backupObj) {
        settings = UTIL.toArray(settings, "pair").filter(function(pair) { return pair.key.startsWith("$setting."); })
                       .reduce(function(result, ele, idx, arr) { 
                          result[ele.key.replace(/^\$setting\./, "")] = ele.value;
                          return result;
                       }, {});
        backupObj.props = settings;
        console.log("Init backup obj", backupObj);
        
        var data = JSON.stringify(backupObj), oldData = data;
        if (storage.getSetting("backup-readable", true, false))
          data = formatter.formatJson(data, "  ");
        var link = $('#__UI_dialog__link_init_setting');
        link.attr('href', "data:text/plain;charset=UTF-8,"+encodeURIComponent(data));
        link.attr('data-downloadurl', "text/plain:backup.json:"+"http://html5-demos.appspot.com/static/a.download.html");
        link.show();
      
        //console.log(data);
        link.off("click");
        link.click(function() {
          $("#settings-list .jstbox:eq(1)").click();
          showConfiguration(oldData);
        });        
      }, {settings:false, onlyInitScripts:true});
    }
    
    function loadDefaultSettings() {
      chrome.runtime.sendMessage({method:"LoadDefaultSettings"});
    }
    
    function rebuildScriptIndexes() {
      storage.rebuildScriptIndexes(onok);
    }
    
    function updateSettings() {
      chrome.runtime.sendMessage({method:"UpdateSettings"});
    }
    
    function upgradeDataStorage() {
      storage.transferScripts(storage.lsst, storage.dbst, function() {
        updateContentScriptForContextMenu();
        
        showMessage("Loading completes");
        location.reload();
      });
    }
    
    function downgradeDataStorage() {
      storage.transferScripts(storage.dbst, storage.lsst, function() {
        showMessage("Loading completes");
        location.reload();
      });
    }
      
    function rebuildScriptIndexes() {
      storage.rebuildScriptIndexes(function() {
        // on completed
        updateContentScriptForContextMenu();
        location.reload();
      });
    }
    
    function reportStorageUsage() {
      Storage.reportUsageAndQuota();
    }
    
    function clearDatabase() {
      if (!confirm("WARNING!!! Do you really want to clear the database to erase all scripts?")) 
        return; 
      storage.clearScripts();
      setTimeout(refresh, 1000);
      
      function refresh() {
        console.log("database removed. Recreate the database now.");
        storage.dbst.createDB();
        
        chrome.runtime.getBackgroundPage(function(win) {          
          win.location.reload();
          storage.rebuildScriptIndexes(function() {          
            win.initContextMenu();
            location.reload();
          }, errEvent=>console.log(errEvent));
        });      
      }
    }
    
    function removeTempSettings() {
      for (var key in localStorage) {
        if (key.startsWith("$setting.temp-"))
          delete localStorage[key];
      }
    }
    
    function initControlsRelatingToLocalStorage() {      
      // Data loading and saving behavior are defined in initControlsRelatingToLocalStorage functions
      // with specific class pattern on html elements.
      /*
      if (storage.getSetting("cloud-url"))
        $("#cloudsave-url").val(storage.getSetting("cloud-url"));
      if (storage.getSetting("cloud-path"))
        $("#cloudsave-path").val(storage.getSetting("cloud-path"));
      if (storage.getSetting("cloud-key"))
        $("#cloudsave-key").val(storage.getSetting("cloud-key"));
      if (storage.getSetting("cloud-lastsave"))
        $("#cloudrestore-key").val(storage.getSetting("cloud-lastsave"));
      */
      function setUIValue(node, value) {
        if (node.is("span")) {
          var target = node.attr("target");
          $(`input:radio[name='${target}'][value='${value}']`)[0].checked = true; //.attr("checked", true);
        } else if (node.is("datalist")) {
          var list = JSON.parse(value);
          var values = $.makeArray(node.find("option")).map(function(ele) { return ele.value; });
          list.forEach(function(val) {
            if (!values.contains(val))
              $("<option value=''></option>").val(val).appendTo(node);
          });
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
      function addOptionToDataList(node, key, val) {
        var values = $.makeArray(node.find("option")).map(function(ele) { return ele.value; });
        if (values.contains(val)) {
          values = values.removeElement(val);
          values.unshift(val);
          
          val = val.replace(/([ #;&,.+*~\':"!^$[\]()=>|\/@])/g,'\\$1');
          node.find('option[value="' + val + '"]').detach().prependTo(node);
        } else {          
          $("<option value=''></option>").val(val).prependTo(node);
          values.unshift(val);
          while (values.length > 20) {
            var removedVal = values.pop().replace(/([ #;&,.+*~\':"!^$[\]()=>|\/@])/g,'\\$1');
            node.find('option[value="' + removedVal + '"]').remove();
          }
        }
        localStorage[key] = JSON.stringify(values);
      }
      var refreshOnSaveAnOption = storage.getSetting("misc_refreshOnSaveAnOption") === "true";
      var refreshOnSaveAllOptions = storage.getSetting("misc_refreshOnSaveAllOptions") === "true";
      
      $(".localstorage_itemvalue").each(function(ind, ele) {
        var node = $(this);
        var key = $(this).attr("target");
        var defaultValue = $(this).attr("defaultvalue");
        if (defaultValue !== undefined) {
          // console.log("Default setting ", key, "=", defaultValue);
          defaultSettings[key] = defaultValue;
        }
        
        if (localStorage[key])
          setUIValue(node, localStorage[key]);
          
        if (node.is("datalist")) {
          $("input[list='" + this.id + "']").blur(function() {
            var val = $(this).val();
            addOptionToDataList(node, key, val);
          });
        } 
          
        node.parents(".localstorage_item").first().find(".localstorage_saveitem").button().click(function() {
          localStorage[key] =  getUIValue(node);
          showMessage("The setting is saved.");
          updateSettings();
          if (refreshOnSaveAnOption)
            location.reload();
        });
        node.parents(".localstorage_item").first().find(".localstorage_resetitem").button().click(function() {
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
      
      $(".localstorage_saveall").button().click(function() {
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
      $(".localstorage_resetall").button().click(function() {
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
    
    function showFindReplaceDialog(event, target) {
      // If a find and search dialog is already opened, close it before open a new one.      
      var dialogDiv = $("#findReplaceDialog");
      if (findReplaceDialog_opened) {
        findReplaceDialog_cancel();
        dialogDiv.dialog("close");
      }
      
      if (!target)
        target = $(this).attr("target");
      
      switch(target) {
      case "Site Scripts":
        target = "Site Scripts";
        findReplaceDialog_target = 0;
        $(".findDialog-for-site-script").show();
        $(".findDialog-for-content-script").hide();
        break;
      case "Content Scripts":
        target = "Content Scripts";
        findReplaceDialog_target = 1;
        $(".findDialog-for-site-script").hide();
        $(".findDialog-for-content-script").show();
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
       /* $("#findDialog-findstring").change(function(event) {
          var findstr = $("#findDialog-findstring").val() ;
                  // + String.fromCharCode(event.which);
          
          if ($("#findDialog-replacement").val() === "")
            $("#findDialog-replacement").val(findstr);
        });*/
      }
      findReplaceDialog_opened = true;
    }
    
    function findReplaceDialog_updateReplaceKey() {
      findReplaceDialog_replaceKey = {};
      
      var mode = $("#findDialog-searchfor").val();
      var targetType = "js";
      if (mode === "CSS") 
        targetType = "css";
      else if (mode === "Both") 
        targetType = "js+css";
      else if (mode === "Name")
        targetType = "name";
      else if (mode === "Title")
        targetType = "title";
            
      var pattern = $("#findDialog-findstring").val();
      var method  = $("#findDialog-searchmethod")[0].selectedIndex;
      if (method === 0) {
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
      
      findReplaceDialog_replaceKey["targetType"]   = targetType;
      findReplaceDialog_replaceKey["pattern"]     = pattern;
      findReplaceDialog_replaceKey["replacement"] = replacement;
      findReplaceDialog_replaceKey["replacementPattern"] = replacementPattern;
      findReplaceDialog_replaceKey["andorAutostart"] = $("#findDialog-andor-autostart").val(); // and, or
      findReplaceDialog_replaceKey["autostart"] = $("#findDialog-filter-autostart").val(); // true, false, any
      findReplaceDialog_replaceKey["containsDefaultScript"] = $("#findDialog-contains-default-script").val() === "true";
      findReplaceDialog_replaceKey["setAutostart"] = $("#findDialog-set-autostart").val(); // true, false, unchanged
      
      
      switch(findReplaceDialog_target) {
      case 0:
        // Site scripts.
        if (searchRange === "current") { findReplaceDialog_replaceKey["name"] = selectedTitle; }
        break;
      case 1:
        // Content scripts
        if (searchRange === "current") { findReplaceDialog_replaceKey["name"] = selectedContentScript; }
        findReplaceDialog_replaceKey["targetType"]   = "js";
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
              var nameMatches = true; // Now content script and other settings don't come here
              if (findReplaceDialog_replaceKey["containsDefaultScript"]) {
                return nameMatches || name === "Default" || name === "Main"; 
              } else {
                return nameMatches; 
              }
            }, 
            clickOnSelectedSite);
        } else {
          loadSiteScripts(undefined, undefined, undefined, clickOnSelectedSite);
        }
      
      // Switch editor to JS/CSS according to search target
      if (options.switcheditor) {
        if (findReplaceDialog_replaceKey["targetType"] === "js") {
          $("#tabs-sss .tabs > ul li:eq(0)").click();
        } else if (findReplaceDialog_replaceKey["targetType"] === "css") {
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
          loadAllContentScripts(findReplaceDialog_replaceKey, clickOnSelectedContentScript);
        } else {
          loadAllContentScripts(undefined, clickOnSelectedContentScript);
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
      var i, pos = [];
      
      // remove markers
      if (cmeditor.searchMarkers) {
        for (i = 0; i < cmeditor.searchMarkers.length; ++ i) {
          cmeditor.searchMarkers[i].clear();
        }
      }
      cmeditor.searchMarkers = [];
      
      // highlight matches
      for (i = 0; i < indexes.length; ++ i) {
        var from = cmeditor.posFromIndex(indexes[i].from);
        var to = cmeditor.posFromIndex(indexes[i].to);
        pos.push({from:from, to:to});
        var marker = cmeditor.markText(from, to, {className: "highlighted-background"});
        cmeditor.searchMarkers.push(marker);
      }
      
      // set markers for highlights on scroll bar
      if (cmeditor.annsclbar) {
        try {  cmeditor.annsclbar.clear(); } catch(ex) {}
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
//       if (!options || options.command !== "HightlightMatchedText")
//         return [];
        
      return getIndexesOfMatching(text, pattern, replacement);      
    }
    
    // Invoked by loadContentScript and selectSite
    function findReplaceDialog_mapFoundScript(s, options) {
      var targetType  = findReplaceDialog_replaceKey["targetType"];
      var pattern   = findReplaceDialog_replaceKey["pattern"];
      
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
    
    // Invoked by loadContentScript and selectSite with ASSIGNMENT to mapSiteScriptFunc in form of 
    //     findReplaceDialog_mapReplacedScript(s, options)
    // Also invoked by findReplaceDialog_replaceContentScripts and findReplaceDialog_replaceSiteScripts inform of 
    //     findReplaceDialog_mapReplacedScript(s, options, replaceKeys)
    // the index array of matching is stored in options.indexes and options.indexes2 (optional, for CSS)
    function findReplaceDialog_mapReplacedScript(s, options, replaceKeys) {
      if (!replaceKeys)
        replaceKeys = findReplaceDialog_replaceKey;
      
      var targetType  = replaceKeys["targetType"];
      var pattern   = replaceKeys["pattern"];
      var replacement = replaceKeys["replacement"];
      var replacementPattern = replaceKeys
      var setAutostart = replaceKeys
      
      var replaceScript = targetType.indexOf("js") > -1;
      var replaceCss = targetType.indexOf("css") > -1;
      var oldtext;
      
      if (replaceScript) {
        oldtext = s.script;
        s.script = s.script.replace(pattern, "$1" + replacement);
        if (options)
          options.indexes = getHighlightMatchingLinesInEditor(options, options.editor, oldtext, pattern, replacement);
      }
      
      if (replaceCss) {
        oldtext = s.css;
        s.css = s.css.replace(pattern, "$1" + replacement);
        if (options)
          options.indexes2 = getHighlightMatchingLinesInEditor(options, options.editor2, oldtext, pattern, replacement);
      }
        
      if (setAutostart !== "unchanged")
        setAutostart === "true" ? s.autostart = true : s.autostart = false;
        
      if (options && options.command === "HightlightMatchedText") {
        var editor = options.editor, editor2 = options.editor2;
      }
      
      return s;
    }
    
    function findReplaceDialog_replaceSiteScripts() {    
      findReplaceDialog_updateReplaceKey();
      var nameKey = findReplaceDialog_replaceKey["name"];
      var frdReplaceKey = findReplaceDialog_replaceKey;
      var fileUpdated = 0;
      
      storage.findScripts(true, "type", ["dss", "ss"], function() {
        // On complete of transaction
        // Do nothing.
        showMessage("Replacement is done for " + fileUpdated + " scripts.");
        clickOnSelectedSite();
      }, function(name, type, script) {
        // On every "dss" and "ss" scripts found
        if (nameKey && nameKey !== name)
          return;
          
        var nameMatches = true;  // 
        if (frdReplaceKey["containsDefaultScript"]) {
          isSiteScript = nameMatches || type === "dss"; 
        } else {
          isSiteScript = nameMatches; 
        }
        if (!isSiteScript)
          return;
        
        var options = {}; // the result will be stored in options
        findReplaceDialog_mapReplacedScript(script, options, frdReplaceKey);
        var isReplaced1 = options.indexes && options.indexes.length > 0;   // JS
        var isReplaced2 = options.indexes2 && options.indexes2.length > 0; // CSS
        var scriptReplaced = isReplaced1 || isReplaced2;
        
        // save new script back
        if (scriptReplaced) {
          console.log("Mathing found in", name, ". Update it in storage now.");
          ++ fileUpdated;
          return {action:"update", value:script};
        }
      });
    }
    
    function findReplaceDialog_replaceContentScripts() {  
      findReplaceDialog_updateReplaceKey();
      var nameKey = findReplaceDialog_replaceKey["name"];
      var frdReplaceKey = findReplaceDialog_replaceKey;
      var fileUpdated = 0;
      
      storage.findScripts(true, "type", ["cs"], function() {
        // On complete of transaction
        // Do nothing.
        showMessage("Replacement is done for " + fileUpdated + " scripts.");
        clickOnSelectedContentScript();
      }, function(name, type, script) {
        // On every "cs" scripts found
        // If the replacement is limited to a single script
        if (nameKey && nameKey !== name)
          return;
          
        var options = {}; // the result will be stored in options
        findReplaceDialog_mapReplacedScript(script, options, frdReplaceKey);
        var scriptReplaced = options.indexes && options.indexes.length > 0;
        
        // save new script back
        if (scriptReplaced) {
          console.log("Mathing found in", name, ". Update it in storage now.");
          ++ fileUpdated;
          return {action:"update", value:script};
        }
      }); 
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
    
    function cloudGetHandler() {
      var url = storage.getSetting("cloud-url");
      var path = storage.getSetting("cloud-path");
      var passphrase = storage.getSetting("cloud-passphrase");
      var keyiv = storage.getSetting("cloud-keyiv");
      
      return new CloudSave(url, path, passphrase, keyiv);
    }
    
    function cloudStorageGenKey() {
      var key = cloudGetHandler().genKeyIV();
      
      $("#cloudsave-key").val(key);
      $(this).next().text(key);
      alert("Copy the following key value and change the $PRIVATEKEY variable in cloudsave.php.\n" + key);
    }
    
    function cloudBackup() {
      showMessage("Start backing configuration up in cloud.");  
      
      // Create a backup object which does not contain cloud storage tokens
      storage.backup(function(backupObj) {
        // Stringify the backup object
        var data = JSON.stringify(backupObj);
        if (storage.getSetting("backup-readable", true, false))
          data = formatter.formatJson(data, "  ");
        var filename = (new Date()).Format("yyyyMMdd-hhmmss");
      
        cloudGetHandler().backupSingleFile(filename, data, function(data) {
          // on ok
            storage.setSetting("cloud-lastsave", filename);
            $("#cloudrestore-key").val(filename);
            showMessage("Configurations are backup up in cloud.");
        
        },   function(err) {
          // on err
            alert("Failed to list configurations. \n" + err.message);
        }); 
        // end of cloudGetHandler().backupSingleFile
        
      }, {cloud:false}); // end of  storage.backup
    }
    
    function cloudRestore() {
      var key = $("#cloudrestore-key").val();
      if (!key) {
        alert("No setting is specified as backup to restore. \nPlease goto the Backup and Restore tab, list all backups and choose one as the backup to restore.");
        return;
      }
      
      if (!confirm("All current settings and scripts will be erased. \nAre you sure you want to restore with configuration named " + key + "?"))
        return;
        
      showMessage("Start restoring configuration from the cloud.");  
      
      cloudGetHandler().restoreFromSingleFile(key, function(data) {
        // on ok
        console.log(data);
        var backupObj = JSON.parse(data);        
        storage.restore(backupObj, function() {
          // On complete
          storage.setSetting("cloud-lastsave", key);
          alert("All configurations and scripts are successfully restored.");
          location.reload();
        }, {cloudSettings:false});        
      }, function(err) {
        // On Error
        alert(err.message);
      });
    }
    
    function cloudStorageList() {
      cloudGetHandler().list(function(data) {
        // on ok
        cloudStorageAddKeysToUI(data.result);          
        showMessage("Configurations are listed out of cloud.");
        
      },   function(err) {
        // on err
          alert("Failed to list configurations. \n" + err.message);
      });
    }
    
    function cloudStorageView() {
      var key = $("#cloudrestore-key").val();
      
      cloudGetHandler().view(key, function(data) {
        // on ok
        $("#settings-list .jstbox:eq(1)").click();
        showConfiguration(data);
        
      },   function(err) {
        // on err
          alert("Failed to view configurations. \n" + err.message);
      });
    }
    
    function cloudStorageDelete() {
      var selectmode = $("#cloudtoggleselect").attr("data-selectmode");
      if (selectmode === "radio") {
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
      cloudGetHandler().remove(key, function(data) {
        // on ok
          $(`#cloudrestore-keys div.key[name='${key}']`).remove();
          showMessage("Selected onfiguration is deleted.");
        
      },   function(err) {
        // on err
          alert("Failed to delete the configuration. \n" + data.message);
      });
    }
    
    function cloudStorageLeaveLast10() {
      cloudGetHandler().leaveLast10(function(data) {
        // on ok
          $(`#cloudrestore-keys div.key[name='${key}']`).remove();
          showMessage("Selected onfiguration is deleted.");
        
      },   function(err) {
        // on err
          alert("Failed to delete the configuration. \n" + data.message);
      });
    }
    
    function cloudToggleSelect() {
      var button = $("#cloudtoggleselect");
      var type = button.attr("data-selectmode");
      if (type === "checkbox") {
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
      // storage.setSetting("cloud-url", $("#cloudsave-url").val());
      // storage.setSetting("cloud-path", $("#cloudsave-path").val());
      // storage.setSetting("cloud-key", $("#cloudsave-key").val());
      
      // Data loading and saving behavior are defined in initControlsRelatingToLocalStorage functions
      // with specific class pattern on html elements.
      
      var keyiv = $("#cloudsave-keyiv").val();
      if (keyiv.length !== 16)
        alert("Invalid key-iv length. The key has to be a text with 16 characters.");
      else
        showMessage("Cloud storage settings saved");
    }
    
    function cloudStorageBackupTokens() {
      // Create a backup object
      storage.backup(function(backupObj) {
        // Stringify the backup object
        var data = JSON.stringify(backupObj);
        data = formatter.formatJson(data, "  ");
        var link = $('#__UI_dialog__link_cloud_setting');
        link.attr('href', "data:text/plain;charset=UTF-8,"+encodeURIComponent(data));
        link.attr('data-downloadurl', "text/plain:backup.json:"+"http://html5-demos.appspot.com/static/a.download.html");
        link.innerHtml = "Download";
        link.show();
      
        //var bb = new Blob([data], {type: 'text/plain'});
        //var href = URL.createObjectURL(bb);        
      }, {onlyCloudSettings:true, meta:false, scripts:false, scriptContent:false});
    }
    
    function cloudStorageRestoreTokens() {
      var file = $('#__LocalStorageFP_cloudtokens')[0].files[0];
      if (typeof file === 'undefined') {
        alert("Please select a backup file first.");
      } else {
        var reader = new FileReader();
        reader.onload = function() {
          text = this.result;
          console.log(text);
          try {
            var backupObj = JSON.parse(text);
            storage.restore(backupObj, function() {
              // On complete
              alert("Cloud tokens are successfully restored.");
              location.reload();
            }, {cloudSettings:true});
          } catch(ex) {
            alert("Restoration failed due to invalid backup file, which can not be parsed as an JSON object.");
          }
        };
        reader.readAsText(file);
      }      
    }
    
    function cloudStorageAddKeysToUI(keys) {
      var selectmode = $("#cloudtoggleselect").attr("data-selectmode");
      $("#cloudrestore-keys").children("*").remove();
      for ( var i=0; i<keys.length; ++i) {
        var key = keys[i];
        var inputType = selectmode === "radio" ? "radio" : "checkbox";
        // console.log(key);
        // <div name="Key1" class="key"><input type="radio" name="cloudrestore-keychosen"><span>20151012-121003</span></div>
        $("#cloudrestore-keys").append(
          `<div name="${key}" class="key" name="${key}"><input type="${inputType}" name="cloudrestore-keychosen" value="${key}"><span>${key}</span></div>`
        );
        $("#cloudrestore-keys span").click(onclick);
        $("#cloudrestore-keys input:radio").click(cloudStorageKeyClicked);
      }
      
      function onclick() {
       $(this).prev().click(); 
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
      var newText = formatter.formatJson(text, "  ");
      editorJsonFile.setValue(newText);
      jsonFileAnchor = newText.length;
      window.__JScriptTricks_JsonViewer = {};
      var obj = JSON.parse(text);
      window.__JScriptTricks_JsonViewer.obj = obj;
      console.log(obj);
      // set in the sandbox for further evaluation
      sandbox_setObject("JsonViewerObj", obj);
      
      var container = $("#json-viewer-site-list");
      container.text("");
      for (var v in obj) {
        container.append(`<input type="button" value="${v}" name="${v}" class="json-viewer-property"/>`);
      }
      var assetStorage = obj.assetStorage;
      if (assetStorage) {
        container.append("<hr/>Scripts:<br/>");
        for (v in assetStorage) {
          container.append(`<input type="button" value="${v}" name="${v}" class="json-viewer-site"/>`);
        }
      }
      
      $("input:button.json-viewer-site").click(showSiteScript);
      $("input:button.json-viewer-property").click(showJsonProperty);
    }
    
    function loadJsonFile() {
      loadFile("#jsonFilePath", showConfiguration);
    }
    
    function updateJsonObject() {
      showConfiguration(editorJsonFile.getValue());
    }
    
    function showJsonProperty() {
      var obj = window.__JScriptTricks_JsonViewer.obj;
      var data = obj[this.name];
      var str;
      if (UTIL.isArray(data) || UTIL.isObject(data)) {
        str = JSON.stringify(data);
        str = formatter.formatJson(str, "  ");
      } else {
        str = "" + data;
      }
      
      $('#json-viewer-tabs > ul > li:eq(1) a').click();
      editorJsonObjectValue.setValue(str);
    }
    
    function showSiteScript() {
      var obj = window.__JScriptTricks_JsonViewer.obj;
      var data = obj.assetStorage[this.name];
      var script = data['script'];
      
      // Scroll to the line that shows this script.
      var pattern = new RegExp('^\\s*"' + this.name + '":\\s*\\{', "m");
      var match = pattern.exec(editorJsonFile.getValue());
      var index = match.index, pos = editorJsonFile.posFromIndex(index);
      editorJsonFile.setSelection(pos);
      
      if (script) {
        $('#json-viewer-tabs > ul > li:eq(1) a').click();
        editorJsonObjectValue.setValue(script);
      }
    }
    
    function extractAttributeInJson(objName, attr, callback) {
      if (!attr)
        return;
      
      if (!attr.startsWith("[") && !attr.startsWith("."))
        attr = "." + attr;      
      
      // Evaluate the attribute in the sandbox
      sandbox_evaluateObjectAttr(objName, attr, callback);  
        
      /*
      // ".props[0].a".replace(/\.([\w$_]+)/g, '["$1"]')
      var propstr = attr.replace(/\.([\w$_]+)/g, '[$1]');
      var props = propstr.split(/\[|\]/).filter(function(str) { return str; });
      
      var val = obj, key = "obj";
      for (var i = 0; i < props.length; ++ i) {
        if (val == undefined)
          throw new Error("Cannot access obj");
          
        var prop = props[i];
        val = val[prop];
        key += '["' + prop + '"]';
      }
      
      console.log(val);
      return val;*/
    }
    
    function extractJsonObject() {
      var obj = window.__JScriptTricks_JsonViewer.obj;
      var key = $('#jsonObjPath').val();
      extractAttributeInJson("JsonViewerObj", key, function(result, error) {
        if (error) {
          alert("Error:\n" + error);
          return;
        }
                
        $('#json-viewer-tabs > ul > li:eq(1) a').click();
        var text;
        if (UTIL.isArray(result) || UTIL.isObject(result))
          text = formatter.formatJson(JSON.stringify(result), "  ");
        else
          text = "" + result;
          
        editorJsonObjectValue.setValue(text);
      });       
    }
    
    // *******************************************************
    // **              Dynamic Content Scripts              **
    // *******************************************************
    
    function toggleConentScriptNameDisplay() {
      var showTitle = this.checked;
      if (showTitle) 
        $("#contentscript-menu").addClass("showTitle");
      else
        $("#contentscript-menu").removeClass("showTitle");
    }
    
    function addContentScript() {      
      if (!contentScriptSaved())
        return;
        
      var cs, name = prompt("Script name:");
      if (!name)
        return;
      name = name.trim();
      if (! /^[0-9a-zA-Z_]+$/.test(name)) {
        alert("Invalid name!\nName should be a non-empty string consists of only 26 letters, 10 digits and underscore.");
        return;
      }
        
      if ((cs = checkDuplicateContentScript(name)) ) {
        alert("A script with the given name already exists in group /" + cs.group + ". Please change a name.");
        return;
      }  

      selectedContentScript = name;
      var index = getNextContentScriptIndex();
      $("#dcsgroup").val("");
      $("#dcsindex").val(index);
      $("#dcstitle").val(name);
      $("#dcsinclude").val("");
      document.getElementById("importOnce").checked = false;
      $("#importOnce").button("refresh");
      
      //addContentScriptMenu(name, index, "");
      
      currentSavedStateDCS = "";
      editorDynScript.setValue("");
      
      saveContentScript();
      
      loadAllContentScripts();      
      
      updateContentScriptForContextMenu();
    }
          
    function loadContentScriptTemplate() {
      var selectNode = $("#dcsgencodebytemplate");
      for (var key in template_content_script_all) {
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
        if (storage.getSetting("contentcripts_generateComments") !== "false") {
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
      
      if(selectedContentScript === "")
        return;
        
      if (mapContentScriptFunc === findReplaceDialog_mapReplacedScript) {
        saveDisabledForPreviewFunc();
        return;
      }
      
      var script = editorDynScript.getValue() ;
      var group = $("#dcsgroup").val();
      var title = $("#dcstitle").val();
      var sfile = $("#dcsinclude").val();
      var index = $("#dcsindex").val();
      var importOnce = document.getElementById("importOnce").checked;
      
      var tmp =  {"name":selectedContentScript, "type":"cs", "index":index, 
        "group":group, "title":title, "sfile":sfile, "script": script, "importOnce":importOnce};
        
      var noErrorsFound = checkScriptSyntax(editorDynScript);
      if (!noErrorsFound) {
        showMessage("Error found in current content script!");
        if (!confirm("There are possible error in this file. Do you really want to save?"))
          return;
      }
      
      var menuNode = $(`#contentscript-menu > .jstbox[name='${selectedContentScript}']`);
      menuNode.attr("index", index).find(".index").text(index);
      menuNode.find(".group").text(group + "/");
      menuNode.find(".title").text(title);
      
      setCsScriptIndexInMenu(selectedContentScript, index);
      currentSavedStateDCS = editorDynScript.getValue();
      
      storage.saveScript(tmp, function() {
        
        // If group is changed, reload the content script list
        if (group !== groupOfSelectedCS) {
         /* // This is a new group
          if (!csGroupUIprops[group]) {
            alert("New group");
            chrome.runtime.getBackgroundPage(function(win) {
              win.initContextMenuOnInstalled();
              loadAllContentScripts();
            });
          } 
          // This is an existing group
          else {
            loadAllContentScripts();
          }*/
          loadAllContentScripts();
        }
      
        showMessage("Content script saved!");
      
      });
    }
    
    function renameContentScript() {
      console.log('renameContentScript');
      
      if(selectedContentScript === "")
        return;
      
      if (!contentScriptSaved(true))
        if (confirm("Script is modified. Do you want to save first?"))
          saveContentScript();
        else
          return;
      
      var cs, newName = "";
      
      do {
        newName = prompt("New name:", selectedContentScript);      
        if (!newName)
          return;  
            
        newName = newName.trim();
        if ((cs = checkDuplicateContentScript(newName)) ) {
          alert("A script with the given name already exists in group /" + cs.group + ". Please change a name.");
        } else {
          break;
        }
      } while (true);
        
      var script = editorDynScript.getValue();
      var name = selectedContentScript;
      storage.deleteScript(["ss", name]);
      deleteCsScriptIndexInMenu(name);
      
      //var commentRegExp = "(\\/\\*([\\s\\S]*?)\\*\\/|([^:]|^)\\/\\/(.*)$)";
      script = script.replace(new RegExp("(define\\s*\\(\\s*['`\"]#)"+name+"(['`\"])"), '$1'+newName+'$2');
      script = script.replace(new RegExp("((\\brun\\s*\\(\\s*\\[[^\\]]*)['`\"]#)"+name+"(['`\"][^\\]]*\\]\\s*,)", "g"), '$1'+newName+'$3');
      
      editorDynScript.setValue(script);
      
      
      $(`#contentscript-menu > .jstbox[name='${selectedContentScript}']`).attr("name", newName)
        .find(".jsttitle .name").text(newName);
      selectedContentScript = newName;
      
      saveContentScript();
      
      updateContentScriptForContextMenu();
    }
    
    function deleteContentScript() {
      console.log('deleteContentScript');
      if (selectedContentScript === "")
        return;
      
      if (confirm(`Do you realy want to delete content script ${selectedContentScript}?`)) {
        storage.deleteScript(["cs", selectedContentScript]);
        deleteCsScriptIndexInMenu(selectedContentScript);
        $(`#contentscript-menu > .jstbox[name='${selectedContentScript}']`).remove();

        $("#dcsgroup").val("");  
        $("#dcstitle").val("");
        $("#dcsinclude").val("");            
        $("#dcsindex").val("");
        editorDynScript.setValue("");
        document.getElementById("importOnce").checked = false;
        $("#importOnce").button("refresh");
        currentSavedStateDCS = editorDynScript.getValue();
      }
      
      updateContentScriptForContextMenu();
    }
    
    function getAllSelectedContentScripts(node) {
      var container = $(node).closest(".navbar");
      if (!container.hasClass("multi-select"))
        return undefined;
      
      var result = [];
      container.find(".file:checkbox:checked").each(function(idx, ele) {
        var elenode = $(ele);
        result.push(["cs", elenode.attr("name")]);
      });
      
      return result;
    }
    
    function deleteAllSelectedContentScripts() {
      var typeNamePairs = getAllSelectedContentScripts(this);
      if (!typeNamePairs) {
        alert("Your are not in multi-selection mode. Switch to that mode first.");
        return;
      }
      
      if (typeNamePairs.length < 1) {
        alert("No script is selected.");
        return;
      } else if (!confirm("WARNING!!! Are your sure you want to delete all selected scripts?")) {
        return;
      }
      var global = this;
      
      storage.deleteScript(typeNamePairs, function() {
        // On complete, disable multi-selectin mode, reload menu list and update context menues
        setMultiSelectionEnabled.call(global, undefined, false);
        loadAllContentScripts();
        updateContentScriptForContextMenu();
      });        
    }
    
    function regroupAllSelectedContentScripts() {
      var typeNamePairs = getAllSelectedContentScripts(this);
      if (!typeNamePairs) {
        alert("Your are not in multi-selection mode. Switch to that mode first.");
        return;
      }
      
      if (typeNamePairs.length < 1) {
        alert("No script is selected.");
        return;
      }
        
      var newGroupName = prompt("Please type in a new group name:");
      var global = this;
      console.log(newGroupName);
      
      storage.findScripts(true, "type,name", typeNamePairs, function(scripts) {
        // On complete, disable multi-selectin mode, reload menu list and update context menues
        setMultiSelectionEnabled.call(global, undefined, false);
        loadAllContentScripts();  
        updateContentScriptForContextMenu();  
      }, function(name, type, script) {
        // On each script found, update the script with the new group name
        script.group = newGroupName;        
        return {action:"update", value:script};
      });
    }
    
    function setMultiSelectionEnabled(node, enabled) {    
      var container = node ? $(node).closest(".navbar") : $("#script-list.navbar");
      var multiSelectMode = enabled === undefined ? container.hasClass("multi-select") : !enabled;
      if (multiSelectMode)
        container.removeClass("multi-select");
      else
        container.addClass("multi-select");             
    }
    
    function sortContentScript() {
      console.log('sortContentScript');
      $("#contentscript-menu > .jstbox").remove();
      loadAllContentScripts();
      
      updateContentScriptForContextMenu();
    }
    
    function moveUpContentScript() {
      if (selectedContentScript === "" && selectedCSGroup === null)
        return;
      
      if (selectedCSGroup !== null)
        swapTwoContentScriptGroup(true);
      else
        swapTwoContentScriptPos(true);
    }
    
    function moveDownContentScript() {
      if (selectedContentScript === "" && selectedCSGroup === null)
        return;
      
      if (selectedCSGroup !== null)
        swapTwoContentScriptGroup(false);
      else
        swapTwoContentScriptPos(false);
    }
    
    function swapTwoContentScriptPos(moveForward) {
      var node = $(`#contentscript-menu > .jstbox[name='${selectedContentScript}']`);
      var targetNode = moveForward ? node.prev() : node.next();
      var target = targetNode[0];
      var group = node.attr("group");
      if (!target || targetNode.hasClass("contentScriptGroup")) {
        var posStr = moveForward ? "first" : "last";
        alert("This is already the " + posStr + " script in the group.");
        return;
      }      
      
      var scriptMenuIndex = loadCsScriptMenuIndex();
      var nodeName = node.attr("name");
      var targetName = $(target).attr("name");
      var nodeIndex = scriptMenuIndex[nodeName];
      var targetIndex = scriptMenuIndex[targetName];
      
      $("#dcsindex").val(targetIndex);
      targetNode.attr("index", nodeIndex)
        .find(".index").text(nodeIndex);
      if (moveForward)
        node.detach().insertBefore(`#contentscript-menu > .jstbox.contentScriptKey[name='${targetName}']`)
      else  
        node.detach().insertAfter(`#contentscript-menu > .jstbox.contentScriptKey[name='${targetName}']`)
      
      node.click(loadContentScript)
        .attr("index", targetIndex)
        .find(".index").text(targetIndex);
        
      scriptMenuIndex[nodeName] = targetIndex;
      scriptMenuIndex[targetName] = nodeIndex;
      saveCsScriptMenuIndex(scriptMenuIndex);            
      updateContentScriptForContextMenu();
    }

    function swapTwoContentScriptGroup(moveForward) {
      console.log("Move group:", selectedCSGroup, moveForward ? "up" : "down");
        
      var groupNode = $(`#contentscript-menu > .jstbox.folder[group='${selectedCSGroup}']`);
      var groupName = groupNode.attr("group");
      var targetGroupNode = moveForward ? groupNode.prevAll(".jstbox.folder:first") : groupNode.nextAll(".jstbox.folder:first");
      var targetGroupName = targetGroupNode.attr("group");
      var targetAnchorNode = moveForward ? targetGroupNode : groupNode.parentsUntil(".navbar").find(`.jstbox.file[group='${targetGroupName}']:last`);
      
      console.log("Move group. anchor node is", targetAnchorNode[0]);
      
      if (targetAnchorNode.length < 1) {
        alert("This is already the " + (moveForward ? "first" : "last") + " group among all groups.");
        return;
      }      
      
      // Swap index attribute on two group nodes
      var tempIndex;
      var groupIndex = csGroupUIprops[groupName].index;
      var targetGroupIndex = csGroupUIprops[targetGroupName].index;
      tempIndex = csGroupUIprops[groupName].index;
      csGroupUIprops[groupName].index = targetGroupIndex;
      csGroupUIprops[targetGroupName].index = tempIndex;
      storage.setSetting("csgroup-ui", csGroupUIprops, true);
      
      // Move UI Nodes
      groupNode.attr("groupindex", targetGroupIndex);
      targetGroupNode.attr("groupindex", groupIndex);
      var allGroupNodes = $(`#contentscript-menu .jstbox[group='${groupName}']`).detach();
      if (moveForward)
        allGroupNodes.insertBefore(targetAnchorNode);
      else
        allGroupNodes.insertAfter(targetAnchorNode);  
      
      // Update the context menues      
      updateContentScriptForContextMenu();
    }

    function reindexContentScript() {
      console.log('reindexContentScript');
      $("#contentscript-menu > .jstbox").remove();
      
      var scriptMenuIndex = loadCsScriptMenuIndex();
      var scriptIndex = storage.loadIndexObj().contentScripts;
      console.log("script menu index:", scriptMenuIndex, "script index:", scriptIndex);
      var sorted = objectToArray(scriptMenuIndex, "pair")
          .map(function(pair) { return {name:pair.key, index:pair.value, group:scriptIndex[pair.key].group}; })
          .sort(getCSSorter(scriptMenuIndex));
      for (var i = 0; i < sorted.length; ++ i) {
        var item = sorted[i];
        console.log(item);
        scriptMenuIndex[item.name] = i + 1;
      }
      console.log(scriptMenuIndex);
      
      saveCsScriptMenuIndex(scriptMenuIndex);
      loadAllContentScripts(undefined, clickOnSelectedContentScript);
    }
    
    function updateContentScriptForContextMenu() {
      console.log('updateContentScriptForContextMenu');
      
      chrome.runtime.sendMessage({method: "UpdateContextMenu"});
    }
    
    function addContentScriptMenu(name, title, index, group) {
      // console.log('addContentScriptMenu: ' + name);
      if (!group)
        group = "";
        
      var extraClass = [];
      if (metadata) {
        if (isArray(metadata.include) && metadata.include.contains(name))
          extraClass.push("include");
          
        if (isArray(metadata.plugins)) {
          for (i = 0; i < metadata.plugins.length; ++i) {
            var plugin = metadata.plugins[i];
            var action = plugin.action;
            var pluginScript = action.script;
            var topFrame = action.topFrame;
        
            if (pluginScript === name) {
              extraClass.push("plugin");
              if (topFrame)
                extraClass.push("top");
            }
          }
        }
      }
      var container = $("#contentscript-menu");
      var groupItem = container.find(".contentScriptGroup[group='${group}']");
      var groupStatus = contentScriptGroups[group];
      if (!groupStatus) {
        groupStatus = contentScriptGroups[group] = {};
        // load from setting
        var props = csGroupUIprops[group];
        groupStatus.className = (props && props.closed) ? "closed" : "opened";
        groupStatus.index = props.index;
        //console.log("Adding item", name, group, props, groupStatus);
        var groupItem = $(`
          <div class="jstbox contentScriptGroup folder ${groupStatus.className}" group="${group}" groupindex="${groupStatus.index}" title="Group ${group === '' ? ['default'] : group}">
            <div class="jsttitle" style="display:inline;font-variant:normal;position:relative;">
              <span class="group">/${group}</span>
              <div class="select" group="${group}"><input class="folder" group="${group}" type="checkbox" /></div>
            </div>
          </div>
        `).appendTo(container).click(toggleConentScriptGroup);
        
        
        // Add event handler for checkbox on group menu item in content script tab
        groupItem.find("input:input").click(function(e) {
          var node = $(this);
          var checked = node[0].checked;
          var group = node.attr("group");
          var groupNodes = node.parentsUntil(".navbar").find(`input.file:checkbox[group='${group}']`);
          console.log( "-------"  );
          groupNodes.each(function(idx, ele) { ele.checked = checked; });
        });
      }
      
      var extraClassStr = extraClass.join(" ");
      container.find(" .jstbox").removeClass("selected");
      var node = $(`<div class="jstbox contentScriptKey file selected ${groupStatus.className} ${extraClassStr}" name="${name}" title="name:${name}<br/>title:${title}" index="${index}" group="${group}">
          <div class="jsttitle" style="display:inline;font-variant:normal;position:relative;">
            <nobr>
            <span class="index">${index}</span>
            <span>-</span>
            <span class="name">${name}</span>
            <span class="title">${title}</span>
            </nobr>
            <div class="group">${group}/</div>
            <div class="select"><input class="file" group="${group}" name="${name}" type="checkbox" /></div>
          </div>
          <div class="iconset">
            <div class="icon plugin-icon" data-csname="${name}" data-title="This script will be loaded as a plugin as configured in the plugins section of the meta data."></div>
            <div class="icon include-icon" data-csname="${name}" data-title="This script will be automatically loaded in every website as configured in the include section of the meta data."></div>
          </div>
        </div>
      `).appendTo(container).click(loadContentScript);
      
      container.find("input").click(function(event) { event.stopPropagation(); } );
      // Set tooltip of icons
      container.find(".icon").on("mouseenter", function() {
        var node = $(this), name = node.attr("data-csname"), title = node.attr("data-title");
        title += "<br/>The appearances of this script in the meta data:<br/>" + 
                  csPosInMetaData[name].join(", ");
        $(this).attr("title", title); 
      });
      //container[0].scrollTop += 22;  //container.height();
    }
    
    function toggleConentScriptGroup() {
      console.log(this);
      var groupBar = $(this), group = groupBar.attr("group");
      var groupItems = $(`#contentscript-menu .contentScriptKey[group='${group}']`);
      var closed = groupBar.hasClass("closed");
      setSelectedCSGroup(group);
      if (closed) {
        groupItems.show();
        groupItems.removeClass("closed").addClass("opened");
        groupBar.removeClass("closed").addClass("opened");
      } else {
        groupItems.hide();
        groupItems.removeClass("opened").addClass("closed");
        groupBar.removeClass("opened").addClass("closed");
      }
      
      // Remember the status
      closed = !closed;
      csGroupUIprops = storage.getSetting("csgroup-ui", true, {});
      var props = csGroupUIprops[group];
      if (props) props.closed = closed;
      else props = {closed:closed};
      csGroupUIprops[group] = props;
      storage.setSetting("csgroup-ui", csGroupUIprops, true);
    }
    
    function setSelectedCSGroup(group) {
      selectedCSGroup = group;
      
      // Update UI
      var groupStr = "No group is selected. <br/>Click on the bar for a group in the navigator will choose it.<br\>";
      var groupSelectBtn = $("#dcsgroupselected"), selectedVal = false;
      if (typeof group === "string") {
        groupStr = "Group " + (group === "" ? "[default]" : group) + " is selected.<br\>";
        selectedVal = true;
      }
      
      groupSelectBtn[0].checked = selectedVal;
      groupSelectBtn.button("refresh");
      groupSelectBtn.next().attr("title", groupStr + selectedCSGroupBtnTitle)
    }
    
    function checkDuplicateContentScript(name) {
      return storage.loadIndexObj().contentScripts[name];
    }
    
    function loadContentScript() {
      var name = $(this).attr('name');
      console.log("loadContentScript: " + name);
      setSelectedCSGroup(null);
      
      if (!contentScriptSaved())
        return;
      
      $("#contentscript-menu > .jstbox").removeClass("selected");
      $(this).addClass("selected");
      
      selectedContentScript = name;
      
      storage.getScript(name, "cs", function(script, name, type) {
        // On loaded
        if (!script) {
          console.error("Cannot find content script with name", name);
          showMessage("Cannot find content script with name " + name);
          return;
        }
      
        loadContentScript_OnScriptLoaded(script);
      }, function(err) {
        // On error
        console.error("Cannot load content script", name, "due to", err);
        showMessage("Cannot load content script " + name + " due to " + err);
      });
    }
    
    function loadContentScript_OnScriptLoaded(script) {      
      var mapOptions = {command:"HightlightMatchedText", editor:editorDynScript};
      script = mapContentScriptFunc(script, mapOptions);
      
      $("#dcsgroup").val(script.group);
      $("#dcstitle").val(script.title);
      $("#dcsinclude").val(script.sfile);  
      $("#dcsindex").val(getCsScriptIndexInMenu(script.name));
      $("#dcsgencodebytemplate")[0].selectedIndex = 0;
      editorDynScript.setValue(script.script);
      document.getElementById("importOnce").checked = script.importOnce;
      $("#importOnce").button("refresh");
      
      groupOfSelectedCS = script.group;
      
      currentSavedStateDCS = script.script;
      editorDynScript.clearHistory();
      
      if (mapOptions.indexes) {
        highlightMatchesInEditor(mapOptions.editor, mapOptions.indexes);
      }
      
      // Switch from Meta data editor to script editor.
      $("#tabs-dcs .tabs > ul li:eq(0)").click();
      
      showMessage("Loaded content script: '" + script.name + "'!");
    }
    
    // Select the script selected before. If none is selected, select the first script.
    // Used as callback for loadContentScript after performing find/replace action.
    function clickOnSelectedContentScript() {
      if (selectedContentScript)
        $(`#contentscript-menu .jstbox[name='${selectedContentScript}']`).click();
      else
         $(`#contentscript-menu .jstbox:first`).click();
    }
    
    function loadAllContentScripts(filter, callback) {
      $("#contentscript-menu").empty();
      
      var noContentLoadNeeded = filter === undefined || 
          filter.targetType === "name" || filter.targetType === "title";
          
      loadAllContentScripts_internal(function(s) {
        // If filter is not given, load all content scripts.
        if (!filter)
          return true;
          
        if (filter.name)
          return s.name === filter.name;
        
        // otherwise, only load content scripts whose script text matches the content filter.
        var contentFilter = filter.pattern;        
        var content = null;
        switch(filter.targetType) {
        case "name":
          content = s.name;
          break;
        case "title":
          content = s.title;
          break;
        default:
          content = s.script;
          break;
        }
        
        // If searched text is /msg/g then /([\s\S]*?)msg/g should be used for searching
        var match = content.match(contentFilter);
        return match !== null;
      }, !noContentLoadNeeded, callback);
    }
    
    // addMenuFilter: a true/false value or a function accepting a script object and
    // returns true/false value. 
    // loadScriptContent: true/false value indicate if it is required to load the
    // whole script content from storage. If it is set to false, then the value for 
    // the addMenuFilter parameter is only like {name, group}, but no detail content.
    function loadAllContentScripts_internal(addMenuFilter, loadScriptContent, callback) {
      if (!loadScriptContent) {
        // load script list from index stored in cache
        var scriptsIndex = storage.loadIndexObj().contentScripts;
        var scripts = objectToArray(scriptsIndex, "pair").map(function(ele) {
          ele.value.name = ele.key;
          return ele.value;
        })
        
        loadAllContentScripts_onScriptLoaded(scripts, addMenuFilter, callback);
      } else {
        // load script list with detailed script content from data storage.
        storage.getAllScripts("cs", function(scripts) {
          loadAllContentScripts_onScriptLoaded(scripts, addMenuFilter, callback);
        });
      }
    }
    
    function loadAllContentScripts_onScriptLoaded(scripts, addMenuFilter, callback) {
      var scriptMenuIndex = loadCsScriptMenuIndex();
      scripts.sort(getCSSorter(scriptMenuIndex));
      contentScriptGroups = [];
      csGroupUIprops = storage.getSetting("csgroup-ui", true, {});
      
      for ( var i = 0; i < scripts.length; ++ i ) {
        var script = scripts[i];
        var index = scriptMenuIndex[script.name];
        if (addMenuFilter) {
          var flag = addMenuFilter;
          if (isFunction(addMenuFilter))
            flag = addMenuFilter(script);
            
          if (flag)
            addContentScriptMenu(script.name, script.title, index, script.group);
        }
      }
      
      $("#contentscript-menu").find("> .jstbox").removeClass("selected");
      if (selectedContentScript)
        $(`#contentscript-menu > .jstbox[name='${selectedContentScript}']`).addClass("selected");
    
      if (callback)
        callback();
    }
    
    // script comparison function for sorting
    function getCSSorter(scriptMenuIndex) {
      if (!scriptMenuIndex) scriptMenuIndex = loadCsScriptMenuIndex();
      
      return function(a, b) {
        a.index = scriptMenuIndex[a.name]; b.index = scriptMenuIndex[b.name];
        a.gindex = csGroupUIprops[a.group], a.gindex = a.gindex ? a.gindex.index : undefined;
        b.gindex = csGroupUIprops[b.group], b.gindex = b.gindex ? b.gindex.index : undefined;
        var groupDiff = compareNumberWithUndef(a.gindex, b.gindex);
        var indexDiff = compareNumberWithUndef(a.index, b.index);
        var nameDiff  = a.name.localeCompare(b.name);
        return groupDiff !== 0 ? groupDiff :
                (indexDiff !== 0 ? indexDiff :
                nameDiff);
  
        function compareNumberWithUndef(a, b) {
          return (a === undefined && b === undefined) ? 0 : 
            (a === undefined ? 1 : 
              (b === undefined ? -1 : a - b ));
        }
    
        function compareStrWithUndef(a, b) {
          return (a === undefined && b === undefined) ? 0 : 
            (a === undefined ? 1 : 
              (b === undefined ? -1 : a.localeCompare(b) ));
        }
      }
    }
    
    function loadCsScriptMenuIndex() {
      if (!window._CSMenuIndex) {
        window._CSMenuIndex = storage.getSetting("contextMenu-index", true);
      }
      return window._CSMenuIndex;
    }
    
    function saveCsScriptMenuIndex(scriptMenuIndex) {      
      storage.setSetting("contextMenu-index", scriptMenuIndex, true);
      window._CSMenuIndex = scriptMenuIndex;
    }
    
    function getCsScriptIndexInMenu(csName) {
      var scriptMenuIndex = loadCsScriptMenuIndex();
      return scriptMenuIndex[csName];
    }
    
    function setCsScriptIndexInMenu(csName, index) {
      var scriptMenuIndex = loadCsScriptMenuIndex();
      scriptMenuIndex[csName] = index;
      saveCsScriptMenuIndex(scriptMenuIndex);
    }
    
    function deleteCsScriptIndexInMenu(csName) {
      var scriptMenuIndex = loadCsScriptMenuIndex();
      //console.log("before delete:", csName, scriptMenuIndex);
      delete scriptMenuIndex[csName];
      //console.log("after delete:", csName, scriptMenuIndex);
      saveCsScriptMenuIndex(scriptMenuIndex);
    }
    
    function getNextContentScriptIndex() {
      var index = 1 + objectToArray(loadCsScriptMenuIndex(), false)
        .reduce(function(result, ele, idx, arr) {
          return ele > result ? ele : result;
        }, 0);
      
      return index;
    }
    
    function contentScriptSaved(noConfirm) {
      //if(currentSavedStateDCS!==null) {
        if(currentSavedStateDCS !== editorDynScript.getValue() ) {
          if (noConfirm)
            return false;
          else
            return confirm("Content script changed! Discard?");
        }
      //}
      
      return true;
    }