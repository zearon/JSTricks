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
    
    initPanel(cm, cm.state.outline);
  }
  
  function initPanel(cm, state) {
    var title = document.createElement("div");
    title.innerHTML = "<div style='cursor:normal'>Functions</div>" +
                      "<div style='position:absolute; top:0; right:0'>" +
                      "  <button title='Collapse all functions' style='padding:0 0 0 0; border:0px; width:16px; height:16px; background-color:rgba(0,0,0,0);'>" +
                      "     <img src='/css/theme/img/collapse.gif' /></button>" +
                      "  <button title='Expand all functions' style='padding:0 0 0 0; border:0px; width:16px; height:16px; background-color:rgba(0,0,0,0);'>" +
                      "     <img src='/css/theme/img/expand.gif' /></button>" +
                      "</div>";
    title.children[1].children[0].onclick = getOnCollapseAllFunc(cm);
    title.children[1].children[1].onclick = getOnExpandAllFunc(cm);
    if (!CodeMirror.commands.fold) {
      title.children[1].style.display = "none";
    }
    
    var functionlist = document.createElement("div");
    functionlist.style.marginTop = "10px";
    
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
      if (state.anonymousFunction || struct.name !== "(anonymous)") {
        addFunction(cm, state, struct);
        state.structure.push(struct);
        
        struct.foldPos = struct.from;
        if (!isFoldLine(cm, struct.foldPos.line)) {
          struct.foldPos = {line:struct.from.line + 1, ch:struct.from.ch};
          while (!isFoldLine(cm, struct.foldPos.line) && struct.foldPos.line <= struct.to.line) {
            struct.foldPos.line += 1;
          }
        }
      }
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
    var item = document.createElement("span");
    item.setAttribute("title",struct.message)
    item.innerHTML = struct.name;
    item.className = "cm-def";
    item.style.display = "block";
    item.style.cursor = "pointer";
    item.style.marginTop = "2px";
    item.style.marginBottom = "2px";
    
    var onclick = getOnClick(cm, struct);
    state.eventListeners.push(onclick);
    item.addEventListener("click", onclick);
    
    state.listPanel.appendChild(item);
    
    return onclick;
  }
  
  function getOnClick(cm, struct) {
    return (function onclick(e) {
      var line = struct.from.line;
      var pos = {line:line, ch:0};
      cm.setSelection(pos, pos, {scroll:false});
      cm.execCommand("unfold");
      cm.scrollIntoView({from:{line:line, ch:0}, to:{line:line+5, ch:0}});
      
      var last = cm.state.outline.lastSelectedItem;
      if (last)
        last.className = last.className.replace(/\s*highlighted-background\s*/g, "");
      cm.state.outline.lastSelectedItem = e.target;
      e.target.className += " highlighted-background";
    });
  }
  
  function getOnCollapseAllFunc(cm) {    
    return (function (e) {
      collpseAllFunc(cm);
    });
  }
  
  function getOnExpandAllFunc(cm) {  
    return (function (e) {
      expandAllFunc(cm);
    });
  }
  
  function collpseAllFunc(cm) {
    if (!cm.state.outline || !cm.state.outline.structure)
      return;
    
    for (var i = 0, e = cm.state.outline.structure.length; i < e; ++ i) {
      var struct = cm.state.outline.structure[i];
      cm.foldCode(struct.foldPos, null, "fold");
    }
  }
  
  function expandAllFunc(cm) {
    if (!cm.state.outline || !cm.state.outline.structure)
      return;
    
    for (var i = 0, e = cm.state.outline.structure.length; i < e; ++ i) {
      var struct = cm.state.outline.structure[i];
      cm.foldCode(struct.foldPos, null, "unfold");
    }
  }
  
  function foldAllFunc(cm, action) {
    if (action == "unfold") {
      expandAllFunc(cm);
    } else if (action == undefined || action == "fold") {
      collpseAllFunc(cm);
    }
  }

  CodeMirror.registerHelper("outline/setoption", "javascript", setOption);
  CodeMirror.registerHelper("outline/update", "javascript", update);
  

  CodeMirror.defineExtension("foldAllFunctions", function(action, performOnNextUpdate) {
    var cm = this;
    function doAction() {
      foldAllFunc(cm);
    }
    
    if (performOnNextUpdate) {
      cm.state.outline.onNextUpdated = doAction;
    } else {
      doAction();
    }
  });
  
  //
});
