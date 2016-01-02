
(function(mod) {
  if (typeof exports == "object" && typeof module == "object") // CommonJS
    mod(require("../../lib/codemirror"));
  else if (typeof define == "function" && define.amd) // AMD
    define(["../../lib/codemirror"], mod);
  else // Plain browser env
    mod(CodeMirror);
})(function(CodeMirror) {
  "use strict";

/* The syntaxCheck option is the option for the syntax checker, e.g. the javascript syntax checker.
 * A sample option for javascript syntax checker JSONLINT.js:
 * {option: {"esversion":6, "expr":true, "indent":2}, 
 *				global:{"console":false, "chrome":false, "run":false, "seajs":false, "define":false, 
 *				"INFO":false, "window":false, "document":false, "alert":false, "confirm":false, 
 *				"prompt":false, "setTimeout":false, "setInterval":false, "location":false} }; 
 */
  CodeMirror.defineOption("syntaxCheck", null, function(cm, val, old) {
    if (old && old != CodeMirror.Init) {
      cm.clearGutter(cm.state.foldGutter.options.gutter);
      cm.state.syntaxCheck = false;
    }
    if (val) {
      cm.state.syntaxCheck = new State(cm, parseOptions(val));
      updateView(cm);
    }
  });

  function State(cm, options) {
    this.options = options;
    
    this.mode = cm.getMode().name;
  }

  function parseOptions(opts) {
    if (opts === true) opts = {};
    if (opts.gutter == null) opts.gutter = "CodeMirror-syntaxcheckgutter";
    return opts;
  }
  
  CodeMirror.defineExtension("checkSyntax", function() {
    updateView(this);
  });
  
  function updateView(cm) {
  	console.log(cm);
  }
  
});














/*
 * Requires jQuery
 */

CodeMirror.wrapSyntaxCheckHightlight = function(instance) {
	var wrapper = instance.getWrapperElement();
	var gutterWrapper = $(wrapper).find(".CodeMirror-gutter-text");
	var linesWrapper = $(wrapper).find(".CodeMirror-lines div:last");
	
	instance.clearSyntaxCheckHightlight = function() {
		linesWrapper.children("pre").removeClass("CodeMirror-line-error").removeClass("CodeMirror-line-warning").removeClass("CodeMirror-line-function");
		gutterWrapper.children().removeClass("CodeMirror-line-error").removeClass("CodeMirror-line-warning").removeClass("CodeMirror-line-function").attr("title", "");
	};
	
	// Errors is an array of objects which have .line and .reason attributes
	instance.setErrorLines = function(errors) {/*
		var lines = linesWrapper.children("pre");
		var count = errors.length;
		for (var i = 0; i < count; ++ i) {
			var error = errors[i];
			linesWrapper.find(`pre:eq(${error.line-1})`).addClass("CodeMirror-line-error");
			gutterWrapper.find(`:eq(${error.line-1})`).addClass("CodeMirror-line-error").attr("title", error.reason);
		}
		*/
		setClassesOnLines(errors, "CodeMirror-line-error");
	};	
	
	// Errors is an array of objects which have .line and .reason attributes
	instance.setWarningLines = function(errors) {/*
		var lines = linesWrapper.children("pre");
		var count = errors.length;
		for (var i = 0; i < count; ++ i) {
			var error = errors[i];
			linesWrapper.find(`pre:eq(${error.line-1})`).addClass("CodeMirror-line-warning");
			gutterWrapper.find(`:eq(${error.line-1})`).addClass("CodeMirror-line-warning").attr("title", error.reason);
		}*/
		setClassesOnLines(errors, "CodeMirror-line-warning");		
	};
	
	instance.setFunctionLines = function(options) {
		setClassesOnLines(options, "CodeMirror-line-function");	
	}
	
	instance.getAllLineElements = function() {
		return linesWrapper.children("pre");
	}
	
	instance.hightlightLinesAtIndex = function(indexes) {
		var options = [];
		for (var i = 0; i < indexes.length; ++ i) {
			var index = indexes[i];
			var pos = instance.posFromIndex(index);
			options.push( {line:(pos.line+1)} ); // convert 0-base indexed to 1-base indexed
		}
		
		linesWrapper.children("pre").removeClass("CodeMirror-line-highlighted");
		setClassesOnLines(options, "CodeMirror-line-highlighted");
		return options;
	}
	
	function setClassesOnLines(options, className) {
		var lines = linesWrapper.children("pre");
		var count = options.length;
		for (var i = 0; i < count; ++ i) {
			var option = options[i];
			linesWrapper.find(`pre:eq(${option.line-1})`).addClass(className);
			var line = gutterWrapper.find(`:eq(${option.line-1})`).addClass(className);
			if (option.reason) {
				var title = line.attr("title");
				title = title ? title + "<br/>" + option.reason : option.reason;
				line.attr("title", title);
			}
		}
	}
	
	return instance;
}

CodeMirror._fromTextArea = CodeMirror.fromTextArea;
CodeMirror.fromTextArea = function(textarea, options) {
	var editor = CodeMirror._fromTextArea(textarea, options);
	return CodeMirror.wrapSyntaxCheckHightlight(editor);
}