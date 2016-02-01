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
    
    initPanel(cm.state.outline);
  }
  
  function initPanel(state) {
    var title = document.createElement("div");
    title.innerHTML = "Functions";    
    title.style.cursor = "normal";
    var functionlist = document.createElement("div");
    functionlist.style.marginTop = "10px";
    
    state.panel.style.boxSizing = "border-box";
    state.panel.style.paddingLeft = "5px";
    state.panel.appendChild(title);
    state.panel.appendChild(functionlist);
    
    state.listPanel = functionlist;
  }
  
  function update(cm, structure) {
    if (!cm.state.outline)
      return;
    
    console.log("update outline", structure);
    var state = cm.state.outline;
    
    clearPanel(state);
    for (var i = 0; i < structure.length; ++ i) {
      var struct = structure[i];
      if (state.anonymousFunction || struct.name !== "(anonymous)")
        addFunction(cm, state, struct);
    }
  }
  
  function clearPanel(state) {
    // remove event listeners
    
    state.listPanel.innerHTML = "";
  }
  
  function addFunction(cm, state, struct) {
    console.log(struct);
    
    var item = document.createElement("div");
    item.setAttribute("title",struct.message)
    item.innerHTML = struct.name;
    item.style.cursor = "pointer";
    item.style.marginTop = "2px";
    item.style.marginBottom = "2px";
    
    item.addEventListener("click", function(e) {
      var line = struct.from.line;
      var pos = {line:line, ch:0};
      cm.setSelection(pos, pos, {scroll:false});
      cm.scrollIntoView({from:{line:line, ch:0}, to:{line:line+5, ch:0}});
    });
    
    state.listPanel.appendChild(item);
  }

  CodeMirror.registerHelper("outline/setoption", "javascript", setOption);
  CodeMirror.registerHelper("outline/update", "javascript", update);
  
  //
});
