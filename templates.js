var template_site_script = 
`run(["jquery"], function($) {
  function main() {

  }
  
  $(main);
});
`;

var template_content_script_run =
`/* run function defines an entry point. It takes two parameters. Parameter 1 is the dependency list of this module.
 * Parameter 2 is the function to to be called, and every dependency corresponds to a parameter of this function.
 */
run(["jquery", "#{{name}}"], function($, obj) {
  // Call the do method defined in the module above.
  obj.do();
});
`;


var template_content_script_module_object =
`/* define function defines a module. It takes three parameters. Parameter 1 is the ID of this module.
 * Parameter 2 is the dependency list of this module, and parameter 3 is a factory function to create
 * the module. The ID of dynamic content scripts should be the same with its name, except that it 
 * starts with a #. The other dependencies should be defined in "seajs.config" section of Meta Data (Global).
 */
define("#{{name}}", ["jquery", "#LibBase"], function(require, exports, module) {
  var $ = require("jquery");
  var libBase = require("#LibBase");
  
  function {{name}}() {
    this.config = this.getConfig("{{name}}");
  }
  {{name}}.prototype = libBase;
    
  {{name}}.prototype.do = function () {
    // Your code goes here.
  	
    console.log("{{name}}.do() is invoked");
    console.log(this);
  };
  
  return new {{name}}();
});

${template_content_script_run}
`;


var template_content_script_module_simple =
`/* define function defines a module. It takes three parameters. Parameter 1 is the ID of this module.
 * Parameter 2 is the dependency list of this module, and parameter 3 is a factory function to create
 * the module. The ID of dynamic content scripts should be the same with its name, except that it 
 * starts with a #. The other dependencies should be defined in "seajs.config" section of Meta Data (Global).
 */
define("#{{name}}", ["jquery"], function(require, exports, module) {
  var $ = require("jquery");

  /* Exported symbols. You can define exports.whatever here and after. */
  exports.do = function () {
    // Your code goes here.
    
    console.log("{{name}}.do() is invoked");
  };
});

${template_content_script_run}
`;


var template_content_script_simple_run =
`run(["jquery"], function($) {
  // Your code here.
});
`;

var template_content_script_all = {
	"Module - Object Style"	: template_content_script_module_object,
	"Module - Simple Style"	: template_content_script_module_simple,
	"Simple Run"			: template_content_script_simple_run
};