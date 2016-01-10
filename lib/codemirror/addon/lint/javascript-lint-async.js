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
  
  window.lintCallbacks = {};
  window.worker = new Worker('/lib/codemirror/addon/lint/javascript-lint-async-worker.js');
  var optionsUnset = true;
  var lastResult;
  
  function validator(text, updateLinting, options, cm) {
    // var text = cm.getValue() + "\n";
    var id = parseInt(Math.random()*10000000);
    console.log("validating: " + id);
    window.lintCallbacks[id] = {};
    window.lintCallbacks[id].editor = cm;
    window.lintCallbacks[id].callback = updateLinting;
    window.lintCallbacks[id].start = Date.now();
    var message = { id: id, code: text };
    if (optionsUnset) {
      message.options = options;
      optionsUnset = false;
    }
    window.worker.postMessage(message);
  }

  CodeMirror.registerHelper("lint", "javascript", validator);
  
  function empty() {}
  
  worker.onmessage = function(message) {
    var callInfo = window.lintCallbacks[message.data.id],
        _time = (Date.now() - callInfo.start) / 1000;
    
    // console.log("done validating: " + message.data.id +' in ' + _time + ' sec. The result is', message.data);
    callInfo.callback(callInfo.editor, message.data.errors);
    delete window.lintCallbacks[message.data.id];
  };
});
