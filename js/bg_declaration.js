/* globals chrome, Image, document, getSetting, getExtDisabledPattern */

(function() {
	chrome.runtime.onInstalled.addListener(resetDeclarativeRules);
	window.resetDeclarativeRules = resetDeclarativeRules;
	
	/* Event listeners */
	function resetDeclarativeRules(callback) {
		// Replace all rules ...
		chrome.declarativeContent.onPageChanged.removeRules(undefined, function() {
		       
			if (chrome.runtime.lastError)
				console.error(chrome.runtime.lastError);
			
			updateRules();
		}); // end of removeRules	
		
		function updateRules() {
      // Set disabled icon
      createSetIconAction("icon/ICON19_disabled.png", "icon/ICON38_disabled.png", function(setDisabledIconAction) {					
        var rules = [];
        // Set page action
        rules.push( {
          id: "showPageAction", priority: 0,
          conditions: [
            new chrome.declarativeContent.PageStateMatcher({
              pageUrl: { urlMatches: ".*" },
            })
          ],
          // And shows the extension's page action.
          actions: [  new chrome.declarativeContent.ShowPageAction()]
        } );
        
        // Set disabled icon
        rules.push( {
          id: "setDisabledIcon", priority: 10,
          conditions: [
            new chrome.declarativeContent.PageStateMatcher({
              pageUrl: { urlMatches: storage.getExtDisabledPattern() },
            })
          ],
          // Set disabled icon
          actions: [ setDisabledIconAction ]
        } );
        
        addRules(rules, callback);      
      });
			
		} 
	
	}
		
  function addRules(rules, callback) {
    chrome.declarativeContent.onPageChanged.addRules(rules, function() { 
      if (chrome.runtime.lastError) 
        console.error(chrome.runtime.lastError); 
      
      console.info("Set rules", rules); 
      invokeCallback(callback);
    });
  }
  
  // A workaround function to set icon, since {path} does not work for chrome.declarativeContent.SetIcon
  function createSetIconAction(path19, path38, callback) {
    var canvas = document.createElement("canvas");
    var ctx = canvas.getContext("2d");
    var image19 = new Image();
    image19.onload = function() {
      ctx.drawImage(image19,0,0,19,19);
      var imageData19 = ctx.getImageData(0,0,19,19);
      var image38 = new Image();
      image38.onload = function() {
        ctx.drawImage(image38,0,0,38,38);
        var imageData38 = ctx.getImageData(0,0,38,38);      
        var action = new chrome.declarativeContent.SetIcon({
          imageData: {19: imageData19, 38: imageData38}
        });
        callback(action);
      };
      image38.src = chrome.runtime.getURL(path38);
    };
    image19.src = chrome.runtime.getURL(path19);
  }
  
  function invokeCallback(cb) {
    if (cb && UTIL.isFunction(cb)) {
      cb();
    }
  }

}) ();
