// CodeMirror, copyright (c) by Marijn Haverbeke and others
// Distributed under an MIT license: http://codemirror.net/LICENSE

(function(mod) {
  if (typeof exports == "object" && typeof module == "object") // CommonJS
    mod(require("../../lib/codemirror"))
  else if (typeof define == "function" && define.amd) // AMD
    define(["../../lib/codemirror"], mod)
  else // Plain browser env
    mod(CodeMirror)
})(function(CodeMirror) {
  "use strict"
  
  CodeMirror.defineOption("outline", false, function(cm, val, old) {
    if (old && old != CodeMirror.Init) {
      setColumnLayout_partof(cm);
    }
    
    if (val)
      initOutline(cm, val);
  });
  
  function initOutline(cm, val) { 
    if (!cm.state.outline) cm.state.outline = {};
    
    try {
      cm.state.outline.panel = cm.rightColumn_get();
    } catch (ex) {
      throw new Error("The addon/display/rightcolumn.js should be imported and the rightColumn should be enabled.");
    }
    
    var impl_setoption = cm.getHelper(CodeMirror.Pos(0, 0), "outline/setoption");
    if (impl_setoption)
      impl_setoption(cm, val);
  }
  
});
