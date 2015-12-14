var template_site_script = 
`run(["jquery"], function($) {
  function SiteScript() {	// for website {{url}}
    <SELECTION_START>// YOUR CODE GOES HERE<SELECTION_END>
  }
  
  $(SiteScript);
});
`;

var template_content_script_comment_run =
`/* IF THIS SCRIPT ONLY DEFINES A MODULE, THIS FUNCTION CAN BE REMOVED.
 * 
 * run function defines the entry point of an execution. It takes two parameters. 
 * Parameter 1 is the dependency list of this module. Each element in this lists is the ID
 *             of a required module.
 * Parameter 2 is a function to to be called when all dependencies are loaded, and every 
 *             argument of the function is set with the value of exported symbol of the 
 *             corresponding dependent module.
 */
`;

var template_content_script_comment_define =
`/* DEFINE A MODULE. OTHER MODULES AND SCRIPTS CAN REQUIRE THIS MODULE.
 * No more than ONE module should be defined in a content script.
 *
 * define function defines a module. It takes three parameters. 
 * Parameter 1 is the ID of this module.
 * Parameter 2 is the dependency list of this module.
 * parameter 3 is a factory function to create exported symbols of this module. 
 * Note: The ID of dynamic content scripts should be the same with its name, except that 
 *       it starts with a #. The other dependencies should be defined in "seajs.config"  
 *       section of Meta Data (Global) or in Main site script (this script is hidden by
 *       default and can be shown by turn on "Show Main script" switch in Options tab).
 */
`;

var template_content_script_run =
`{{comments.run}}run(["jquery", "#{{name}}"], function($, obj) {
  // Call the do method defined in the module above.
  obj.do();
});
`;


var template_content_script_module_object =
`{{comments.define}}define("#{{name}}", ["jquery", "msgbox", "#LibBase"], function(require, exports, module) {
  var $ = require("jquery");
  var log = require("msgbox");  // log prints a message in console and show a message box.
  var libBase = require("#LibBase");
  
  function {{name}}() {
    this.config = this.getConfig("{{name}}");
  }
  {{name}}.prototype = libBase;
    
  {{name}}.prototype.do = function () {
    <SELECTION_START>// YOUR CODE GOES HERE<SELECTION_END>
  	
    console.log("{{name}}.do() is invoked");
    console.log(this);
  };
  
  // The returned value is exported. 
  // You can also use "module.exports = [whatever]" to export a symbol.
  return new {{name}}();
});

${template_content_script_run}
`;


var template_content_script_module_simple =
`{{comments.define}}define("#{{name}}", ["jquery", "msgbox"], function(require, exports, module) {
  var $ = require("jquery");
  var log = require("msgbox");  // log prints a message in console and show a message box.

  /* Exported symbols. You can add exports.whatever here and after within this scope. */
  exports.do = function () {
    <SELECTION_START>// YOUR CODE GOES HERE<SELECTION_END>
    
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