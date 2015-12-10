// local.js
// localStorage loader plugin for requireJS which load modules from localStorage

define({
    load: function (name, parentRequire, onload, config) {
    	try {
    		if (!localStorage[name]) {
    			onload.error(new Error(`Module ${name} does not exists in local storage.`));
    			return;
    		}
    		
			// load the script from localStorage        
			// E.g. require(["local!Novel], ...) will use a loader defined in 'local' module, 
			// i.e. this module, to load a script with name 'Novel'.
			var text = JSON.parse(localStorage[name]).script;
			
	
			// Have RequireJS execute the JavaScript within
			//the correct environment/context, and trigger the load
			//call for this resource.
			onload.fromText(text);
		} catch (exception) {
			onload.error(new Error(`Module ${name} does not exists in local storage (no script attribute).`));
		}
    }
});