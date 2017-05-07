// CodeMirror, copyright (c) by Marijn Haverbeke and others
// Distributed under an MIT license: http://codemirror.net/LICENSE

console.log("Loading async javascript lint addon for CodeMirror.");

(function(mod) {
  if (typeof exports == "object" && typeof module == "object") // CommonJS
    mod(require("../../lib/codemirror"));
  else if (typeof define == "function" && define.amd) // AMD
    define(["../../lib/codemirror"], mod);
  else // Plain browser env
    mod(CodeMirror);
})(function(CodeMirror) {
  "use strict";
  // declare global: 
  
  function setOption(cm, option) {
    //console.log("set option", option, "state", cm.state.outline);
    if (option.anonymousFunction != undefined)
      cm.state.outline.anonymousFunction = option.anonymousFunction;
    else
      cm.state.outline.anonymousFunction = true;
      
    cm.state.outline.collapseDepth = option.collapseDepth != null ? collapseDepth : 0;
    
    initPanel(cm, cm.state.outline);
  }
  
  function initPanel(cm, state) {
    var title = document.createElement("div");
    title.innerHTML = "<div style='cursor:normal; font-weight:bold; font-size:14px; height:15px; margin-top:2px;'>Outline</div>" +
                      "<div style='position:absolute; top:0; right:0'>" +
                      "  <button title='Show/Hide Anonymous Functions' style='padding:0 0 0 0; border:0px; width:16px; height:16px; vertical-align:top; background-color:rgba(0,0,0,0);'><span class='cm-def' style='font-weight:bold; font-style:italic;'>A" +
                      "</span></button><button title='Collapse all functions' style='padding:0 0 0 0; border:0px; width:16px; height:16px; background-color:rgba(0,0,0,0);'>" +
                      "     <img src='/css/theme/img/collapse.gif' />" +
                      "  </button><button title='Expand all functions' style='padding:0 0 0 0; border:0px; width:16px; height:16px; background-color:rgba(0,0,0,0);'>" +
                      "     <img src='/css/theme/img/expand.gif' />" +
                      "  </button><button title='Collapse all functions to a depth.' style='padding:0 0 0 0; border:0px; width:16px; height:16px; background-color:rgba(0,0,0,0);'>" +
                      "     <img src='/css/theme/img/collapse.gif' />" +
                      "</div>";
    title.children[1].children[0].onclick = getOnToggleAnonymousFunc(cm);
    title.children[1].children[1].onclick = getOnCollapseAllFunc(cm);
    title.children[1].children[2].onclick = getOnExpandAllFunc(cm);
    title.children[1].children[3].onclick = getOnCollapseAllFuncToDepth(cm);
    if (!CodeMirror.commands.fold) {
      title.children[1].style.display = "none";
    }
    
    var functionlist = document.createElement("div");
    functionlist.style.marginTop = "10px";
    functionlist.style.height = "calc(100% - 10px - 15px)";
    functionlist.style.overflowX = "hidden";
    functionlist.style.overflowY = "auto";
    
    state.panel.style.overflow = "hidden";
    state.panel.style.boxSizing = "border-box";
    state.panel.style.paddingLeft = "5px";
    state.panel.appendChild(title);
    state.panel.appendChild(functionlist);
    
    state.listPanel = functionlist;
    state.eventListeners = [];
  }
  
  function update(cm, structure) {
    if (!cm.state.outline)
      return;
    
    var state = cm.state.outline;
    if (state.structure)
      state.structure.splice(0, state.structure.length);
    else
      state.structure = [];
    
    clearPanel(state);
    for (var i = 0; i < structure.length; ++ i) {
      var struct = structure[i];
      //if (state.anonymousFunction || struct.name !== "(anonymous)") {
        addFunction(cm, state, struct);
        state.structure.push(struct);
        
        struct.foldPos = struct.from;
        if (struct.severity == "function" && !isFoldLine(cm, struct.foldPos.line)) {
          struct.foldPos = {line:struct.from.line + 1, ch:struct.from.ch};
          while (!isFoldLine(cm, struct.foldPos.line) && struct.foldPos.line <= struct.to.line) {
            struct.foldPos.line += 1;
          }
        }
      //}
    }
    
    if (cm.state.outline.onNextUpdated) {
      cm.state.outline.onNextUpdated();
      delete cm.state.outline.onNextUpdated;
    }
  }
    
  function isFoldLine(cm, line) {
    var lineText = cm.getLine(line);
    return lineText.indexOf("{") >= 0;
  }
  
  function clearPanel(state) {
    // remove event listeners
    var allItems = state.listPanel.children;
    for (var i = 0; i < allItems.length; ++ i) {
      allItems[i].removeEventListener("click", state.eventListeners[i]);
    }
    state.eventListeners = [];
    
    state.listPanel.innerHTML = "";
  }
  
  function addFunction(cm, state, struct) {
    var item = document.createElement("nobr");
    if (struct.severity == "region") {
      item.innerHTML = "<span class='cm-def'>" + struct.name + "</span>";
      item.style.display = "block";
      //item.style.marginTop = "10px";
      item.style.fontWeight = "bold";
      item.style.marginLeft = struct.level * 8 + "px";     
    } else if (struct.severity == "function") {
      if (struct.level > 0)
        item.innerHTML = "<span style='color:lightgray; font-family:monospace;'>" + new Array(struct.level).join("│") + "├</span><span class='cm-variable'>" + struct.name + "</span>";
      else
        item.innerHTML = "<span class='cm-variable'>" + struct.name + "</span>";
      item.className += "outlineview-function";
      item.style.display = "block";
      if (struct.name == "(anonymous)") {
        item.className += " anonymousFunction";
        if (state.anonymousFunction)
          item.style.display = "block";
        else
          item.style.display = "none";
      }
      //item.style.marginTop = "2px";
      //item.style.marginLeft = (struct.level - 1) * 8 + "px";
    }
    //item.style.marginBottom = "2px";
    item.setAttribute("title",struct.message.replace(/\n/g, "<br/>&nbsp;&nbsp;"));
    item.style.cursor = "pointer";
    
    var onclick = getOnClick(cm, struct);
    state.eventListeners.push(onclick);
    item.addEventListener("click", onclick);
    
    state.listPanel.appendChild(item);
    
    return onclick;
  }
  
  function getOnClick(cm, struct) {
    return (function onclick(e) {
      var line = struct.foldPos.line;
      var pos = {line:line, ch:0};
      cm.setSelection(pos, pos, {scroll:false});
      cm.execCommand("unfold");
      cm.scrollIntoView({from:{line:line, ch:0}, to:{line:line+5, ch:0}});
      cm.setCursor(pos);
      
      var last = cm.state.outline.lastSelectedItem;
      if (last)
        last.className = last.className.replace(/\s*highlighted-background\s*/g, "");
      cm.state.outline.lastSelectedItem = e.target;
      e.target.className += " highlighted-background";
    });
  }
  
  function getOnToggleAnonymousFunc(cm) {
    return (function (e) {
      var state = cm.state.outline;
      state.anonymousFunction = !  state.anonymousFunction;
      var items = state.listPanel.querySelectorAll(".anonymousFunction");
      for (var i = 0, l = items.length; i < l; ++ i) {
        if ( state.anonymousFunction)
          items[i].style.display = "block";
        else
          items[i].style.display = "none";
      }
      
    });
  }
  
  function getOnCollapseAllFunc(cm) {    
    return (function (e) {
      foldAllFunc(cm, "fold");
    });
  }
  
  function getOnExpandAllFunc(cm) {  
    return (function (e) {
      foldAllFunc(cm, "unfold");
    });
  }
  
  function getOnCollapseAllFuncToDepth(cm) {
    return (function (e) {
      cm.state.outline.collapseDepth = parseInt(prompt("Collapse to which level? -1 for none, 0 for top level, and so on.", cm.state.outline.collapseDepth));
      cm.execCommand("unfoldAll");
      foldAllFunc(cm, "fold", {functionDepth:cm.state.outline.collapseDepth, regionDepth:-1});
    });
  }
  
  function foldAllFunc(cm, action, options) {
    if (!cm.state.outline || !cm.state.outline.structure)
      return;
    
    for (var i = 0, e = cm.state.outline.structure.length; i < e; ++ i) {
      var struct = cm.state.outline.structure[i];
      var predicate = true;
      if (options && struct.severity == "function") {
        predicate = ( options.functionDepth >= 0 ) && (struct.level >= options.functionDepth);
      } else if (options && struct.severity == "region") {
        predicate = ( options.regionDepth >= 0 ) && (struct.level >= options.regionDepth);
      }
      if (predicate)
        cm.foldCode(struct.foldPos, null, action); // action is "fold" or "unfold"
    }
  }

  CodeMirror.registerHelper("outline/setoption", "javascript", setOption);
  CodeMirror.registerHelper("outline/update", "javascript", update);
  

  CodeMirror.defineExtension("foldAllFunctions", function(action, performOnNextUpdate, options) {
    var cm = this;
    function doAction() {
      foldAllFunc(cm, action, options);
    }
    
    if (performOnNextUpdate) {
      cm.state.outline.onNextUpdated = doAction;
    } else {
      doAction();
    }
  });
  
  //
});
