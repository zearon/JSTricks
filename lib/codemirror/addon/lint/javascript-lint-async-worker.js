importScripts('/lib/jshint/jshint.js');

(function() {
  "use strict";
  // declare global: JSHINT

  var bogus = [ "Dangerous comment" ];

  var warnings = [ [ "Expected '{'",
                     "Statement body should be inside '{ }' braces." ] ];

  var errors = [ "Missing semicolon", "Extra comma", "Missing property name",
                 "Unmatched ", " and instead saw", " is not defined",
                 "Unclosed string", "Stopping, unable to continue" ];
                 
  var options = [];
  var lastResult, functions;
                 
  self.onmessage = function(message) {
    if (message.data.options)
      options = message.data.options;
    
    if (message.data.skip) {
      self.postMessage({ id: message.data.id, errors: "skip" });
      return;
    }
    
    if (message.data.code) {
      lastResult = validator(message.data.code, options);
      self.postMessage({ id: message.data.id, errors: lastResult });
    }
  };
  
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
                         from: Pos(variable.line[j] - 1, 0),
                         to: Pos(variable.line[j] - 1, 0)});
        }
      }
    }
    if (data.functions) {	  
      for (i = 0; i < data.functions.length; ++ i) {
        var fn = data.functions[i];
        var fnName = fn.name.replace("(empty)", "(anonymous)");
        var params = fn.param ? fn.param.join(", ") : "";
        var signature = fnName + "(" + params + ")";
        fn.desc = "function " + signature + " \n  from line " + fn.line + " to " + fn.last + "\n  at level " + fn.metrics.depth;
        result.push({message: fn.desc, severity: "function",
             from: Pos(fn.line - 1, 0),
             to: Pos(fn.line - 1, 0),
             name: fnName,
             level: fn.metrics.depth
            });
      }
    }
    if (data.regions) {
      for (i = 0; i < data.regions.length; ++ i) {
        var region = data.regions[i];
        var desc = region.id + " " + region.name + "\n  from line " + region.from.line + " to " + region.to.line + "\n  at level " + region.level;
        result.push({message: desc, 
             severity: "region",
             id: region.id,
             name: region.name,
             level: region.level,
             from: Pos(region.from.line - 1, region.from.ch - 1),
             to: Pos(region.to.line - 1, region.to.ch - 1)
            });
      }
    }
    
    return result;
  }

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
  
  function Pos(line, ch) {
    return {line:line, ch:ch};
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
                       from: Pos(error.line - 1, start),
                       to: Pos(error.line - 1, end)});
      }
    }
  }
}) ();
