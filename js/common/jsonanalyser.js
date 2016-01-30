(function(JsonAnalyzer) {
  window.JsonAnalyzer = new JsonAnalyzer();
  
  //test
//   var meta = window.meta = localStorage["meta"];   // "meta_test"
//   var newVal = window.JsonAnalyzer.setProperty(meta, '.plugins[0]["enabled"]', false);   // ."plugins"@1
//   console.log(newVal, JSON.parse(newVal));
  
  //
}) ((function() {
  function JsonAnalyzer() {
  }
  
  JsonAnalyzer.prototype.init = function() {
  };
  
	/* Find the index of a property of a JSON object in its string representation.
	 * @param json: the JSON string. MAKE SURE THIS IS A VALID JSON STRING
	 * @param propPath: a string specifying the path of the property in the object
	 *        which consists of a serials of '."[objectProp]"' or '@[arrayIndex]'.
	 *        For example, '."plugins"@1' indicate json.plugins[1]
	 */
	JsonAnalyzer.prototype.find = function(json, propPath) {	  
	  var match = new Matching(json, propPath);
	  return match.getIndex();
	};
  
	/* Set the value of a property of a JSON object in its string representation.
	 * @param json: the JSON string. MAKE SURE THIS IS A VALID JSON STRING
	 * @param propPath: a string specifying the path of the property in the object
	 *        which consists of a serials of '."[objectProp]"' or '@[arrayIndex]'.
	 *        For example, '."plugins"@1' indicate json.plugins[1]
	 * @param value: a new value to be set for the property specified by propPath.
	 * @return a new string representing the new JSON object.
	 */
	JsonAnalyzer.prototype.setProperty = function(json, propPath, value) {
	  var match = new Matching(json, propPath);
	  var pos = match.getIndex();
	  if (pos) {
	    var newJson = json.slice(0, pos.from) + JSON.stringify(value) + json.slice(pos.to);
	    return newJson;
	  }
	  return false;
	};
	
	
	function Matching(json, propPath) {
	  this.json = json;
	  this.propPath = propPath;
	  
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
	}
	
	var TYPE_OBJECT_PROPERTY = 1, TYPE_ARRAY_ELEMENT = 2, TYPE_SIMPLE_VALUE = 3;
	
	// The 1- 6 bits from lower to higher are used for sub-modes, so Mode should be greater 
	// than 1 << 6.
	// bit 1-2     is for start/end sub-mode                 00:other, 01:start, 10:end
	// bit 3       is for non-string/in-string sub-mode      0:non-string, 1:in-string
	// bit 4-6     is for other sub-modes, which is {a = (n * 8) | a < 64, n = 1,2,…}, since the last 3 bits are 000.
	// If mode & 3 === 1, then it is a value start sub-mode
	// If mode & 3 === 2, then it is a value end sub-mode
	// If (mode & 4) >> 2 === 0, then it is a non-string sub-mode
	// If (mode & 4) >> 2 === 1, then it is a in-string sub-mode
	var MODE_value_start            = 1;    // last two bits are 01        mode & 3 = 1
	    MODE_value_end              = 2,    // last two bits are 10        mode & 3 = 2
	    MODE_in_string              = 4,    // last three bits are 011     mode & 7 = 3
	
	    ValueType_object            = 1,
	    MODE_object_base            = ValueType_object << 6,          // 64
	    MODE_object_value_start     = MODE_object_base + MODE_value_start,
	    MODE_object_value_end       = MODE_object_base + MODE_value_end, 
	    MODE_object_key_quote       = MODE_object_base + MODE_in_string,
	    MODE_object_key             = MODE_object_base + 8,
	    MODE_object_key_ok          = MODE_object_base + 16,
	    
	    ValueType_array             = 2,
	    MODE_array_base             = ValueType_array << 6,           // 128
	    MODE_array_value_start      = MODE_array_base + MODE_value_start,
	    MODE_array_value_end        = MODE_array_base + MODE_value_end,	    
   	  
	    ValueType_string            = 3,
	    MODE_string_base            = ValueType_string << 6,          // 192
	    MODE_string_value_start     = MODE_string_base + MODE_value_start,
	    MODE_string_value_end       = MODE_string_base + MODE_value_end,
	    MODE_string_value_quote     = MODE_string_base + MODE_in_string,
	    
	    ValueType_number_bool         = 4,
	    MODE_number_bool_base         = ValueType_number_bool << 6,     // 256
	    MODE_number_bool_value_start  = MODE_number_bool_base + MODE_value_start,
	    MODE_number_bool_value_end    = MODE_number_bool_base + MODE_value_end,
	    MODE_number_bool_value        = MODE_number_bool_base + 8;
	    
	var END_OF_FILE = "END_OF_FILE";
	    
	var ValueModeMap = {
	    "{":          MODE_object_value_start,
	    "[":          MODE_array_value_start,
	    '"':          MODE_string_value_start,
	    "}":          MODE_object_value_end,
	    "]":          MODE_array_value_end,
	    // undefined: MODE_number_bool_value_start
	}
	
	var StringModeNext = {};
	// Enter string mode
	StringModeNext[MODE_object_key]           = MODE_object_key_quote;
	StringModeNext[MODE_string_value_start]   = MODE_string_value_quote;
	// Leave string mode
	StringModeNext[MODE_object_key_quote]     = MODE_object_key_ok;
	StringModeNext[MODE_string_value_quote]   = MODE_string_value_end;
	
	Matching.prototype.pushValueInStack = function(mode) {
	  if (this.inArray()) {
	    this.stackTop().key += 1;
	  }
	  
	  if (mode == undefined) mode = this.mode;
	  switch (mode) {
	  case MODE_object_value_start:
	    this.stack.push({type:TYPE_OBJECT_PROPERTY, key:"", startPos: this.pos, startLine: this.line, startColumn:this.column });
	    break;
	  case MODE_array_value_start:
	    this.stack.push({type:TYPE_ARRAY_ELEMENT, key:-1, startPos: this.pos, startLine: this.line, startColumn:this.column });
	    break;
	  default:
	    this.stack.push({type:TYPE_SIMPLE_VALUE, key:"VALUE", startPos: this.pos, startLine: this.line, startColumn:this.column });
	    break;
	  }
	}
	
	Matching.prototype.popValueOutofStack = function() {	  
	  var top = this.stack.pop();
	  top.endPos = this.pos + 1;
	  
    // CHECK PATH: Object .""
    var pathMatches = this.checkPath();
    if (pathMatches) {
      this.notFound = false;
      this.foundProperty = {  
            from:       top.startPos, 
            to:         top.endPos, 
            fromPos:    { line:top.startLine, ch:top.startColumn },
            toPos:      { line:this.line, ch: this.column + 1 },
            path:       this.propPath,
            posTo0BasedIndex: function() {
              this.fromPos.line -= 1;
              this.fromPos.ch   -= 1;
              this.toPos.line   -= 1;
              this.toPos.ch     -= 1;
            }
      };
    }
	}
	    
	    
	Matching.prototype.getIndex = function() {
    this.path = this.parseJsonPath(this.propPath);
	  //console.log(this.path);
	  
	  this.text = this.json, this.len = this.json.length, this.pos = 0, this.notFound = true,
	  this.line = 1, this.column = 1, this.escapeMode = false, this.word = "", this.stack = [];
	  
	  this.minPos_debug_outout = this.len + 1;
	  this.maxPos_debug_outout = this.len;
	  this.updateMode(MODE_value_start);
	  
	  for (this.pos = 0; this.notFound && this.pos <= this.len; this.nextChar() ) {
	    this.getChar();	      
	    
	    // Start a value
	    if (!this.escapeMode && this.isValueStartMode) {
	      this.nextNonEmtpyChar();
	      if (this.notEnd) {
	        // { -> object, [ -> arrya, " -> string, other -> number/bool
	        var mode = ValueModeMap[this.ch];  
	        if (mode == undefined) mode = MODE_number_bool_value_start;
	        this.updateMode(mode);
	        
	        if (this.isValueStartMode)
	          this.pushValueInStack();
	      } 
	    }
	    
	    // Object value
	    if (this.valueType === ValueType_object) {
	      if (this.mode === MODE_object_value_start) {
	        this.updateMode(MODE_object_key);
	        continue;
	      } else if (this.mode === MODE_object_key) {
	        if (this.ch === '"')
	          this.quotedString();
	        else if (this.ch === "}")
	          this.updateMode(MODE_object_value_end);
	      } else if (this.mode === MODE_object_key_quote) {
	        this.quotedString();
	        // Mode was changed into key ok
	        if (this.mode === MODE_object_key_ok) {
	          this.stackTop().key = this.word.slice(1, -1); // remove " at beginning and ending
	        }
	      } else if (this.mode === MODE_object_key_ok) {
	        if (this.isWhiteSpace) {
	        } else if (this.ch === ":") {
	          this.updateMode(MODE_value_start);
	        }
	      }
	    }
	    
	    // Array value
	    else if (this.valueType === ValueType_array) {
	      if (this.isValueStartMode) {
	        this.updateMode(MODE_value_start);
	        continue;
	      }
	    }
	    
	    // String value
	    else if (this.valueType === ValueType_string) {
	      this.quotedString();
	    }
	    
	    // Number/boolean value
	    else if (this.valueType === ValueType_number_bool) {
	      if (this.isValueStartMode) {
	        this.updateMode(MODE_number_bool_value);
	      }
	      if (!isAlpha(this.nextchar) && !isDigit(this.nextchar)) {
	        this.updateMode(MODE_number_bool_value_end);
	      }
	    }
	    
	    
	    // Complete a value
	    if (!this.escapeMode && this.isValueEndMode) {
	      this.nextNonEmtpyChar();
	      
	      if (this.inSimpleValue()) {
	        this.popValueOutofStack();
	      } else if (this.ch === "]" || this.ch === "}") {
	        this.popValueOutofStack();
	      }        
	      
	      if (this.ch === ",") {
	        if (this.inArray()) {
	          this.updateMode(MODE_value_start);
	        } else if (this.inObject()) {
	          this.updateMode(MODE_object_key);
	        } else {
	          this.updateMode(MODE_value_start);
	        }
	      } 
	    }
	    
	  } // end of for
	  
	  return this.foundProperty;
	};
	
	Matching.prototype.nextNonEmtpyChar = function() {
    while (this.isWhiteSpace && this.notEnd && this.pos <= this.len) {
      this.nextChar(); this.getChar();
    }
	}
	
	Matching.prototype.quotedString = function() {
	  if (!this.isInStringMode) {
	    // Not in string mode
	    if (this.ch === '"') {
	      var nextMode = StringModeNext[this.mode];
	      this.updateMode(nextMode);
	      this.word = this.ch;
	      this.escapeMode = false;
	    }
	  } else {
	    // In string mode
	    this.word += this.ch;
	    if (this.escapeMode) {
	      this.escapeMode = false;
	    } else {
        if (this.ch === "\\") {
          this.escapeMode = true;
        } else if (this.ch === '"') {
          var nextMode = StringModeNext[this.mode];
          this.updateMode(nextMode);
        }
	    }
	  }
	}
	
	Matching.prototype.updateSubModes = function() {
	  var valueModeValue    = this.mode & 3;	  
	  this.isValueStartMode = valueModeValue === 1;
	  this.isValueEndMode   = valueModeValue === 2;
	  this.isValueOtherMode = valueModeValue === 0;
	  
	  switch (valueModeValue) {
	  case 0:
	    this.valueMode = "other";
	    break;
	  case 1:
	    this.valueMode = "start";
	    break;
	  case 2:
	    this.valueMode = "end";
	    break;
	  default:
	    this.valueMode = "???";
	    break;
	  }
	  
	  this.valueType = this.mode >> 6;
	  switch (this.valueType) {
	  case ValueType_object:
	    this.valueTypeRepr = "object";
	    break;
	  case ValueType_array:
	    this.valueTypeRepr = "array";
	    break;
	  case ValueType_string:
	    this.valueTypeRepr = "string";
	    break;
	  case ValueType_number_bool:
	    this.valueTypeRepr = "number_bool";
	    break;
	  default:
	    this.valueType = "???";
	    break;
	  }
	  
	  this.isInStringMode   = ((this.mode & 4) >> 2 === 1);
	  this.stringMode = this.isInStringMode ? "in-string" : "non-string";
	}
	
	Matching.prototype.updateMode = function(mode) {
	  this.mode = mode;
	  this.updateSubModes();
	  this.printStatus(this.minPos_debug_outout, this.maxPos_debug_outout);
	}
	
	Matching.prototype.checkPath = function() {
	  var pathNow = this.stackRepr();
	  var mismatch = false;
	  var len = this.path.length >= this.stack.length ? this.path.length : this.stack.length;
	  for (var i = 0; i < len; ++ i) {
	    var path = this.path[i];
	    var inStack = this.stack[i];
	    
	    mismatch = !path || !inStack || path.type !== inStack.type || path.key !== inStack.key;
	    if (mismatch)
	      break;
	  }
	  
//     console.log("********** path matches?", !mismatch, "pos", this.pos, "path", this.stackRepr());
//     this.printStatus(true);
	  
	  return !mismatch;
	};
	
	Matching.prototype.stackRepr = function() {
	  return this.stack.map(function(ele) { 
	    switch (ele.type) {
	      case TYPE_ARRAY_ELEMENT:
	        return "@" + ele.key;
	      case TYPE_OBJECT_PROPERTY:
	        return '.' + ele.key;
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
	
	Matching.prototype.updateStatus = function() {
	  this.status = "pos " + this.pos + " mode " + this.mode +
	      " (" + this.valueTypeRepr + ", " + this.valueMode + ", " + this.stringMode + ") "+ 
	      "word <" + this.word + "> stack " + this.stackRepr();
	  return this.status;
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
	    console.log("pos", this.pos, "at", this.line + ":" + this.column, "mode", this.mode, 
	      "(" + this.valueTypeRepr + ", " + this.valueMode + ", " + this.stringMode + ")", 
	      "word <" + this.word + "> stack", this.stackRepr());
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
	
	Matching.prototype.inSimpleValue = function() {
	  var top =  this.stackTop();
	  return top && top.type === TYPE_SIMPLE_VALUE;
	}
	
	
	
	Matching.prototype.getChar = function() {
	  this.ch = this.pos < this.len ? 
	            (this.notEnd = true, this.text[this.pos]) : 
	            (this.notEnd = false, END_OF_FILE);
	  this.nextchar = this.pos + 1 < this.len ? this.text[this.pos + 1] : END_OF_FILE;
	  
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
	  if (ch === END_OF_FILE)
	    return false;
	    
	  var charcode = ch.charCodeAt();
	  return charcode >= char_code_0 && charcode <= char_code_9;
	}
	
	var char_code_a = "a".charCodeAt(), char_code_z = "z".charCodeAt();
	var char_code_A = "A".charCodeAt(), char_code_Z = "Z".charCodeAt();
	function isAlpha(ch) {
	  if (ch === END_OF_FILE)
	    return false;
	    
	  var charcode = ch.charCodeAt();
	  return (charcode >= char_code_a && charcode <= char_code_z) || 
	         (charcode >= char_code_A && charcode <= char_code_Z);
	}
	
	var char_code_$ = "$".charCodeAt(), char_code__ = "_".charCodeAt();
	function isIdentifier(ch) {
	  if (ch === END_OF_FILE)
	    return false;
	    
	  var charcode = ch.charCodeAt();	  
	  return (charcode >= char_code_a && charcode <= char_code_z) || 
	         (charcode >= char_code_A && charcode <= char_code_Z) ||
	         (charcode >= char_code_0 && charcode <= char_code_9) ||
	         charcode === char_code_$ || charcode === char_code__ ||
	         charcode >= 128;
	}
	
	/* Parse a string specifying the path of the property in the object which consists of a 
	 * serials of '."[objectProp]"' or '@[arrayIndex]'.
	 * For example, '."plugins"@1' indicate json.plugins[1]
	 */
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
	
	/* Parse a string specifying the path of the property in the object which consists of a 
	 * serials of '.objectProperty' , '[arrayIndex]' or '["objectProperty"]'.
	 */
	Matching.prototype.parseJsonPath = function(path) {
	  //console.log(path);
	  
	  var MODE_Init         = 0, 
	      MODE_Object       = 10,
	      MODE_Object_start = 11,
	      MODE_Array        = 20,
	      MODE_Quote_start  = 21,
	      MODE_Escape_next  = 22,
	      MODE_Array_index  = 23,
	      MODE_Quote_end  = 24;
	  this.mode = MODE_Init, this.text = path, this.len = path.length, this.pos = 0, 
	  this.line = 1, this.column = 1, this.word = "", pathPart = []; 
	  
	  for (this.pos = 0; this.pos <= this.len; this.nextChar() ) {
	    this.getChar();
	    if (this.mode === MODE_Init) {
	      if (this.ch === ".") {
	        this.mode = MODE_Object;
	        this.word = "";
	      } else if (this.ch === "[") {
	        this.mode = MODE_Array;
	        this.word = "";
	      } else if (this.isWhiteSpace || !this.notEnd) {
	      } else {
	        this.error(['"."', '"["']);
	      }
	    } 
	    
	    else if (this.mode === MODE_Object) {
	      if (isIdentifier(this.ch)) {
	        this.word += this.ch;
	        if (isIdentifier(this.nextchar)) {
	          this.mode = MODE_Object_start;
	        } else {
	          this.mode = MODE_Init;
	          pathPart.push({type:TYPE_OBJECT_PROPERTY, key:this.word});
	        }
	      } else {
	        this.error(['"a-z"', '"A-Z"', '"0-9"', '"$"', '"_"', 'char code >= 128']);
	      }
	    }
	    
	    else if (this.mode === MODE_Object_start) {
	      if (isIdentifier(this.ch)) {
	        this.word += this.ch;
	        if (!isIdentifier(this.nextchar)) {
	          this.mode = MODE_Init;
	          pathPart.push({type:TYPE_OBJECT_PROPERTY, key:this.word});
	        }
	      }
	    }
	    
	    else if (this.mode === MODE_Array) {
	      if (isDigit(this.ch)) {
	        this.word = this.ch;
          this.mode = MODE_Array_index;
	      } else if (this.ch === '"' || this.ch === "'" || this.ch === "`") {
	        this.mode = MODE_Quote_start;
	        this.word = "";
	        this.quote = this.ch;
	      } else {
	        this.error(['"0-9"', '"\""']);
	      }
	    }
	    
	    else if (this.mode === MODE_Array_index) {
	      if (isDigit(this.ch)) {
	        this.word += this.ch;
	      } else if (this.ch == "]") {
          this.mode = MODE_Init;
          pathPart.push({type:TYPE_ARRAY_ELEMENT, key:parseInt(this.word)});
	      } else {
	        this.error(['"0-9"', '"]"']);
	      }
	    }
	    
	    else if (this.mode === MODE_Quote_start) {
	      if (this.ch === this.quote) {
	        this.mode = MODE_Quote_end;
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
	    
	    else if (this.mode === MODE_Quote_end) {
	      if (this.ch === "]") {
	        this.mode = MODE_Init;
	      } else {
	        this.error(['"]"']);
	      }
	    }
	    // end of for
	  }
	  
	  return pathPart;
	}	
  
  return JsonAnalyzer;
}) ());