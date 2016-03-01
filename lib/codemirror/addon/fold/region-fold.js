// CodeMirror, copyright (c) by Marijn Haverbeke and others
// Distributed under an MIT license: http://codemirror.net/LICENSE

(function(mod) {
  if (typeof exports == "object" && typeof module == "object") // CommonJS
    mod(require("../../lib/codemirror"));
  else if (typeof define == "function" && define.amd) // AMD
    define(["../../lib/codemirror"], mod);
  else // Plain browser env
    mod(CodeMirror);
})(function(CodeMirror) {
"use strict";

CodeMirror.registerGlobalHelper("fold", "comment", function(mode) {
  return mode.blockCommentStart && mode.blockCommentEnd;
}, function(cm, start) {
  if (cm.performLintRegions) {
    var regions = cm.performLintRegions();
    
    if (regions) {
      for (var i = 0, e = regions.length; i < e; ++ i) {
        var region = regions[i];
        if (region.from.line == start.line) {
          return {from:region.from, to:region.to};
        }
      }
    }
//     return {from: CodeMirror.Pos(line, startCh),
//           to: CodeMirror.Pos(end, endCh)};
  }
});

});
