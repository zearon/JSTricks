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
  // declare global: JSHINT
  if (typeof JSHINT === "undefined") 
    console.log("No JSHINT symbol defined. Please import jshint.js");

  var bogus = [ "Dangerous comment" ];

  var warnings = [ [ "Expected '{'",
                     "Statement body should be inside '{ }' braces." ] ];

  var errors = [ "Missing semicolon", "Extra comma", "Missing property name",
                 "Unmatched ", " and instead saw", " is not defined",
                 "Unclosed string", "Stopping, unable to continue" ];

  function validator(text, options) {
    JSHINT(text, options, options.globals);
    var data = JSHINT.data();
    var errors = data.errors, result = [];
    if (errors) parseErrors(errors.filter(function(err) {
				if (err == null) {
					return false;
				} else if (err.raw === "Expected a conditional expression and instead saw an assignment.") {
					return false;
				} else if (err.raw === "Use '{a}' to compare with '{b}'.") {
					warnings.push(err);
					return false;
				}
				
				return true;
			 }), result);
	if (data.implieds) {
		for (var i = 0; i < data.implieds.length; ++ i) {
			var variable = data.implieds[i];
			for (var j = 0; j < variable.line.length; ++ j) {
				//warnings.push( {line:variable.line[j], reason: `${variable.name} is undefined and thus considered as a global variable.`} );
          		result.push({message: `${variable.name} is undefined and thus considered as a global variable.`,
                       severity: "warning",
                       from: CodeMirror.Pos(variable.line[j] - 1, 0),
                       to: CodeMirror.Pos(variable.line[j] - 1, 0)});
			}
		}
	}
	if (data.functions) {
		for (i = 0; i < data.functions.length; ++ i) {
			var fn = data.functions[i];
			var fnName = fn.name.replace("(empty)", "(anonymous)");
			var params = fn.param ? fn.param.join(", ") : "";
			fn.desc = "function " + fnName + "(" + params + ") \n  from line " + fn.line + " to " + fn.last;
			result.push({message: fn.desc, severity: "function",
				   from: CodeMirror.Pos(fn.line - 1, 0),
				   to: CodeMirror.Pos(fn.line - 1, 0),
				   name: fnName
				  });
		}
	}
    
    return result;
  }

  CodeMirror.registerHelper("lint", "javascript", validator);

  function cleanup(error) {
    // All problems are warnings by default
    fixWith(error, warnings, "warning", true);
    fixWith(error, errors, "error");

    return isBogus(error) ? null : error;
  }

  function fixWith(error, fixes, severity, force) {
    var description, fix, find, replace, found;

    description = error.description;

    for ( var i = 0; i < fixes.length; i++) {
      fix = fixes[i];
      find = (typeof fix === "string" ? fix : fix[0]);
      replace = (typeof fix === "string" ? null : fix[1]);
      found = description.indexOf(find) !== -1;

      if (force || found) {
        error.severity = severity;
      }
      if (found && replace) {
        error.description = replace;
      }
    }
  }

  function isBogus(error) {
    var description = error.description;
    for ( var i = 0; i < bogus.length; i++) {
      if (description.indexOf(bogus[i]) !== -1) {
        return true;
      }
    }
    return false;
  }

  function parseErrors(errors, output) {
    for ( var i = 0; i < errors.length; i++) {
      var error = errors[i];
      if (error) {
        var linetabpositions, index;

        linetabpositions = [];

        // This next block is to fix a problem in jshint. Jshint
        // replaces
        // all tabs with spaces then performs some checks. The error
        // positions (character/space) are then reported incorrectly,
        // not taking the replacement step into account. Here we look
        // at the evidence line and try to adjust the character position
        // to the correct value.
        if (error.evidence) {
          // Tab positions are computed once per line and cached
          var tabpositions = linetabpositions[error.line];
          if (!tabpositions) {
            var evidence = error.evidence;
            tabpositions = [];
            // ugggh phantomjs does not like this
            // forEachChar(evidence, function(item, index) {
            Array.prototype.forEach.call(evidence, function(item,
                                                            index) {
              if (item === '\t') {
                // First col is 1 (not 0) to match error
                // positions
                tabpositions.push(index + 1);
              }
            });
            linetabpositions[error.line] = tabpositions;
          }
          if (tabpositions.length > 0) {
            var pos = error.character;
            tabpositions.forEach(function(tabposition) {
              if (pos > tabposition) pos -= 1;
            });
            error.character = pos;
          }
        }

        var start = error.character - 1, end = start + 1;
        if (error.evidence) {
          index = error.evidence.substring(start).search(/.\b/);
          if (index > -1) {
            end += index;
          }
        }

        // Convert to format expected by validation service
        error.description = error.reason;// + "(jshint)";
        error.start = error.character;
        error.end = end;
        error = cleanup(error);

        if (error)
          output.push({message: error.description,
                       severity: error.severity,
                       from: CodeMirror.Pos(error.line - 1, start),
                       to: CodeMirror.Pos(error.line - 1, end)});
      }
    }
  }
});
