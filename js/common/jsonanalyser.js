(function(JsonAnalyzer) {
  window.JsonAnalyzer = new JsonAnalyzer();
  
  //test
  var meta = window.meta = localStorage["meta"];   // "meta_test"
  window.JsonAnalyzer.setProperty(meta, '."plugins"@1', false);   // ."plugins"@1
}) ((function() {
  function JsonAnalyzer() {
  }
  
  JsonAnalyzer.prototype.init = function() {
  };
  
	/* Find the index of a property of a JSON object in its string representation.
	 * @param json: the JSON string
	 * @param propPath: a string specifying the path of the property in the object
	 *        which consists of a serials of '."[objectProp]"' or '@[arrayIndex]'.
	 *        For example, '."plugins"@1' indicate json.plugins[1]
	 */
	JsonAnalyzer.prototype.indexOf = function(json, propPath) {
	  
	};
  
	/* Set the value of a property of a JSON object in its string representation.
	 * @param json: the JSON string
	 * @param propPath: a string specifying the path of the property in the object
	 *        which consists of a serials of '."[objectProp]"' or '@[arrayIndex]'.
	 *        For example, '."plugins"@1' indicate json.plugins[1]
	 * @param value: a new value to be set for the property specified by propPath.
	 * @return a new string representing the new JSON object.
	 */
	JsonAnalyzer.prototype.setProperty = function(json, propPath, value) {
    //console.log(json);
	  var match = new Matching(json, propPath);
	  match.setProperty(value);
	};
	
	
	function Matching(json, propPath) {
	  this.json = json;
	  this.path = propPath;
	  
	  this.mode = 0; // 0: init, 1: looking for object property, 2: looking for array element
	  this.stack = [];
	  this.stackLevel = 0;
	  this.startPos = 0;
    this.endPos = 0;
    
    this.text = "";
    this.len = 0;
	  this.pos = 0;
    this.line = 1;
    this.column = 1;
    this.ch = "";
    this.nextchar = "";
    this.word = "";
    this.isWhiteSpace = false;
    this.isDigit = false;
    this.isAlpha = false;
    this.notEnd = true;
    
    this.path = this.parsePath(propPath);
	}
	
	var TYPE_OBJECT_PROPERTY = 1, TYPE_ARRAY_ELEMENT = 2, TYPE_SIMPLE_VALUE = 3;
	
	Matching.prototype.setProperty = function(value) {
	  this.getIndex();
	};
	
	var MODE_value                  = 1,
	    MODE_in_object              = 100,
	    MODE_in_object_key_quote    = 101,
	    MODE_in_object_key_escape   = 102,
	    MODE_in_object_key_ok       = 103,
	    MODE_in_object              = 100,
   	  
	    MODE_in_string_value        = 300,
	    MODE_in_string_escape       = 301,
	    MODE_in_number_bool         = 400;
	    
	    
	Matching.prototype.getIndex = function() {
	  console.log(this.path);
	  
	  this.mode = MODE_value, this.text = this.json, this.len = this.json.length, 
	  this.pos = 0, this.line = 1, this.column = 1, this.word = "", this.stack = [];
	  var inString = false;
	  
	  var minPos_debug_outout = this.len + 1, maxPos_debug_outout = this.len;
	  
	  for (this.pos = 0; this.pos <= this.len; this.nextChar() ) {
	    this.printStatus(minPos_debug_outout, maxPos_debug_outout);
	    this.getChar();
	    if (this.mode === MODE_value) {	      
	      if (this.ch === "{") {
	        this.mode = MODE_in_object;
	        this.stack.push({type:TYPE_OBJECT_PROPERTY, key:"" });
	          
          // CHECK PATH: Object .""
          var pathMatch = this.checkPath();
	      } else if (this.ch === "[") {
	        this.mode = MODE_value;
	        this.stack.push({type:TYPE_ARRAY_ELEMENT, key:-1 });
	          
          // CHECK PATH: Array @-1
          var pathMatch = this.checkPath();
	      } else if (this.ch === "}") {
	        this.stack.pop();
	        if (this.inObject())
	          this.mode = MODE_in_object;
	        else
	          this.mode = MODE_value;
	      } else if (this.ch === "]") {
	        this.stack.pop();
	        if (this.inObject())
	          this.mode = MODE_in_object;
	        else
	          this.mode = MODE_value;
	      } else if (this.ch === ",") {
	        if (this.inObject()) {
	          this.mode = MODE_in_object;
	        } else {
	          this.mode = MODE_value;
	          var stacktop = this.stackTop();
	          ++ stacktop.key;
	          
	          // CHECK PATH: Array @next
            var pathMatch = this.checkPath();
	        }
	      } else if (this.ch === '"') {
	        this.mode = MODE_in_string_value;
	        this.stack.push({type:TYPE_SIMPLE_VALUE, key:"value" });
	        inString = true;
	      } else if (!this.isWhiteSpace && this.notEnd) {
	        this.mode = MODE_in_number_bool;
	        this.stack.push({type:TYPE_SIMPLE_VALUE, key:"value" });
	      } else if (this.isWhiteSpace || !this.notEnd) {
	      } else {
	        this.error(['"{"', '"["', '"\""', 'digit', '"true/false"', 'WHITE_SPACE', 'END_OF_FILE']);
	      }
	    }
	    
	    else if (this.mode === MODE_in_object) {
	      if (this.isWhiteSpace) {
	      } else if (this.ch === '"') {
	        this.mode = MODE_in_object_key_quote;
	        this.word = "";
	      } else if (this.ch === "}") {
	        this.stack.pop();
	        if (this.inObject())
	          this.mode = MODE_in_object;
	        else
	          this.mode = MODE_value;
	      }
	    }
	    
	    else if (this.mode === MODE_in_object_key_quote) {
	      if (this.ch === '"') {
	        this.mode = MODE_in_object_key_ok;
	        var key = this.word;
	        this.stackTop().key = key;
	          
	        // CHECK PATH: Object ."Property"
	        var pathMatch = this.checkPath();
	      } else if (this.ch === "\\") {
	        this.mode = MODE_in_object_key_escape;
	        this.word += this.ch;
	      } else {
	        this.word += this.ch;
	      }
	    }   
	    
	    else if (this.mode === MODE_in_object_key_escape) {
	      this.mode = MODE_in_object_key_quote;
	    } 
	    
	    else if (this.mode === MODE_in_object_key_ok) {
	      if (this.isWhiteSpace) {
	      } else if (this.ch === ":") {
	        this.mode = MODE_value;
	      }
	    }
	    
	    else if (this.mode === MODE_in_string_value) {
	      if (this.ch === '"') {
	        this.stack.pop();
	        this.mode = MODE_value;
	      } else if (this.ch === "\\") {
	        this.mode = MODE_in_string_escape;
	      }
	    }	   
	    
	    else if (this.mode === MODE_in_string_escape) {
	      this.mode = MODE_in_string_value;
	    } 
	    
	    
	    if (this.mode === MODE_in_number_bool) {
	      if (!isAlpha(this.nextchar) && !isDigit(this.nextchar)) {
	        this.stack.pop();
	        this.mode = MODE_value;
	      }
	    }
	    
	  } // end of for
    this.printStatus(minPos_debug_outout, maxPos_debug_outout);
	};
	
	Matching.prototype.checkPath = function() {
	  var mismatch = false;
	  for (var i = 0; i < this.path.length; ++ i) {
	    var path = this.path[i];
	    var inStack = this.stack[i];
	    
	    mismatch = !inStack || path.type !== inStack.type || path.key !== inStack.key;
	    if (mismatch)
	      break;
	  }
	  
    console.log("********** path matches?", !mismatch, "pos", this.pos, "path", this.stackRepr());
    this.printStatus(true);
	  
	  return !mismatch;
	};
	
	Matching.prototype.startValue = function() {	  
    console.log("<<<<<<<<< start value. pos", this.pos, "path", this.stackRepr());
    this.printStatus(true);
	};
	
	Matching.prototype.stackRepr = function() {
	  return this.stack.map(function(ele) { 
	    switch (ele.type) {
	      case TYPE_ARRAY_ELEMENT:
	        return "@" + ele.key;
	      case TYPE_OBJECT_PROPERTY:
	        return '."' + ele.key + '"';
	      default:
	        return "?" + ele.key;
	    }
	  }).join("");
	}
	
	Matching.prototype.error = function(expected, found) {
	  var expectedstr = expected.join(" / ");

	  console.log("current mode is", this.mode, "current word is", this.word,"Context:");
	  this.printContext();	  
	  
	  throw new Error("Error at line " + this.line + " column " + this.column + 
	        '. Expected ' + expectedstr + ' but "' + this.ch + '" found');
	};
	
	Matching.prototype.updateContext = function() { 
	  var text = this.text + "{END_OF_FILE}", len = text.length;
	  var behind = 20, ahead = 100;
	  var start = this.pos - behind >= 0 ? this.pos - behind : 0;
	  var end = this.pos + ahead <= len ? this.pos + ahead : len;
	  this.context = text.slice(start, this.pos) + "->>|" + text.slice(this.pos, end);
	  
	  return this.context; 
	}
	
	Matching.prototype.printContext = function() {	 
	  this.updateContext();
	  console.debug("  ", this.context);
	}
	
	var lastMode = -1;
	Matching.prototype.printStatus = function(minPos, maxPos) {
	   
	  if (minPos == undefined) minPos = 0;
	  if (maxPos == undefined) maxPos = this.len;
	  if (minPos === true || (this.pos >= minPos && this.pos <= maxPos)) {
	    if (minPos !== true && lastMode === this.mode)
	      return;
	    
	    console.debug("pos", this.pos, "mode", this.mode, "word <" + this.word + "> stack", this.stackRepr());
	    console.debug("  ", this.updateContext());
	    lastMode = this.mode;
	  }
	}
	
	
	
	Matching.prototype.value2Str = function(value) {
	  return JSON.stringify(value);
	};

	Matching.prototype.stackTop = function() {
	  var len = this.stack.length;
	  return this.stack[len - 1];
	}
	
	Matching.prototype.inArray = function() {
	  var top =  this.stackTop();
	  return top && top.type === TYPE_ARRAY_ELEMENT;
	}
	
	Matching.prototype.inObject = function() {
	  var top =  this.stackTop();
	  return top && top.type === TYPE_OBJECT_PROPERTY;
	}
	
	Matching.prototype.getChar = function() {
	  this.ch = this.pos < this.len ? 
	            (this.notEnd = true, this.text[this.pos]) : 
	            (this.notEnd = false, "END_OF_FILE");
	  this.nextchar = this.pos + 1 < this.len ? this.text[this.pos + 1] : "END_OF_FILE";
	  
	  // Line break: \n in Unix, \r in Mac, and \r\n in Windows
	  // replace \r not followed by a \n with \n, and ignore \r
	  if (this.ch === "\r" && nextchar !== "\n")
	    this.ch = "\n";
	  
	  this.isWhiteSpace = isWhiteSpace(this.ch);
	  this.isDigit = isDigit(this.ch);
	  this.isAlpha = isAlpha(this.ch);
	  
	  return this.ch;
	};
	
	Matching.prototype.nextChar = function() {
	  ++ this.pos;
	  if (this.ch === "\n") {
	    ++ this.line;
	    this.column = 1;
	  } else if (this.ch === "\r") {
	    ++ this.column;
	  } else {
	    ++ this.column;
	  }
	};
	
	function isWhiteSpace(ch) {
	  return ch === " " || ch === "\t" || ch === "\r" || ch === "\n";
	}
	
	var char_code_0 = "0".charCodeAt(), char_code_9 = "9".charCodeAt();
	function isDigit(ch) {
	  var charcode = ch.charCodeAt();
	  return charcode >= char_code_0 && charcode <= char_code_9;
	}
	
	var char_code_a = "a".charCodeAt(), char_code_z = "z".charCodeAt();
	var char_code_A = "A".charCodeAt(), char_code_Z = "Z".charCodeAt();
	function isAlpha(ch) {
	  var charcode = ch.charCodeAt();
	  return (charcode >= char_code_a && charcode <= char_code_z) || 
	         (charcode >= char_code_A && charcode <= char_code_Z);
	}
	
	
	Matching.prototype.parsePath = function(path) {
	  var pathPart = [];
	  var MODE_Init        = 0, 
	      MODE_Object      = 10,
	      MODE_Array       = 20,
	      MODE_Quote_start = 11,
	      MODE_Escape_next = 12,
	      MODE_Array_index = 21;
	  this.mode = MODE_Init, this.text = path, this.len = path.length, this.pos = 0, 
	  this.line = 1, this.column = 1, this.word = ""; 
	  for (this.pos = 0; this.pos <= this.len; this.nextChar() ) {
	    this.getChar();
	    if (this.mode === MODE_Init) {
	      if (this.ch === ".") {
	        this.mode = MODE_Object;
	        this.word = "";
	      } else if (this.ch === "@") {
	        this.mode = MODE_Array;
	        this.word = "";
	      } else if (this.isWhiteSpace || !this.notEnd) {
	      } else {
	        this.error(['"."', '"@"']);
	      }
	    } 
	    
	    else if (this.mode === MODE_Object) {
	      if (this.ch === '"') {
	        this.mode = MODE_Quote_start;
	      } else if (this.isWhiteSpace) {
	      } else {
	        this.error(['"\""']);
	      }
	    }
	    
	    else if (this.mode === MODE_Quote_start) {
	      if (this.ch === '"') {
	        this.mode = MODE_Init;
	        pathPart.push({type:TYPE_OBJECT_PROPERTY, key:this.word});
	      } else if (this.ch === "\\") {
	        this.mode = MODE_Escape_next;
	        this.word += "\\";
	      } else if (this.notEnd) {
	        this.word += this.ch;
	      } else {
	        this.error(["any character"]);
	      }
	    }
	    
	    else if (this.mode === MODE_Escape_next) {
	      if (this.notEnd) {
	        this.mode = MODE_Quote_start;
	        this.word += this.ch;
	      } else {
	        this.error(["any character"]);
	      }
	    }
	    
	    else if (this.mode === MODE_Array) {
	      if (this.isDigit) {
	        this.word += this.ch;
	        if (!isDigit(this.nextchar)) {
	          this.mode = MODE_Init;
	          pathPart.push({type:TYPE_ARRAY_ELEMENT, key:parseInt(this.word) });
	        }
	      }
	    }	    
	    // end of for
	  }
	  
	  return pathPart;
	}	
	
	
  
  return JsonAnalyzer;
}) ());