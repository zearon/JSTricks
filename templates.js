var template_content_script_module =
`/* define function defines a module. It takes three parameters. Parameter 1 is the ID of this module.
 * Parameter 2 is the dependency list of this module, and parameter 3 is a factory function to create
 * the module. The ID of dynamic content scripts should be the same with its name, except that it 
 * starts with a #. The other dependencies should be defined in "seajs.config" section of Meta Data (Global).
 */
define("#$(name)", ["jquery", "#LibBase"], function(require, exports, module) {
  var $ = require("jquery");
  var libBase = require("#LibBase");
  
  function $(name)() {
    this.config = this.getConfig("$(name)");
  }
  $(name).prototype = libBase;
    
  // Prototypes for $(name)
  $(name).prototype.method1 = function () {
    console.log("$(name).method1 is invoked");
    console.log(this);
  };
  
  // end of $(name) prototypes
  
  return new $(name)();
});
`;


var template_content_script_common =
`/* run function defines an entry point. It takes two parameters. Parameter 1 is the dependency list of this module.
 * Every element of this list is an ID of a dependent script. If the script is a dynamic content script, its ID
 * is the same with its name, except that it starts with a #. If there is no dependency, the first parameter can be omitted.
 * Parameter 2 is the function to to be called, and every dependency corresponds to a parameter of this function.
 */
run(["jquery"], function($) {
  // Your code here.
});
`;