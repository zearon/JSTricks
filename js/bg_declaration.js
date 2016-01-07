/* globals chrome, Image, document, getSetting, getExtDisabledPattern */


	chrome.runtime.onInstalled.addListener(function() {
	  setSetting("temp-rules-baseindex", 0, true);
    // DO NOT register onInstalled event here, because resetDeclarativeRules is invoked
    // by a function registered with onInstalled event in bg.js
	  //resetDeclarativeRules();
	});
	//chrome.runtime.onMessage.addListener();
	
	
	/* Event listeners */
	function resetDeclarativeRules(forInit) {
		// Replace all rules ...
		chrome.declarativeContent.onPageChanged.removeRules(undefined, function() {
		       
			if (chrome.runtime.lastError)
				console.error(chrome.runtime.lastError);
				
			var baseIndex = getSetting("temp-rules-baseindex", true);
			if (!baseIndex) {
			  baseIndex = 0;
			}
			
			//updateRules(baseIndex, forInit);
		}); // end of removeRules	
		
		function updateRules(baseIndex, forInit) {
// 			  
// 			// Set default icon
// 			createSetIconAction("icon/ICON19.png", "icon/ICON38.png", function(setDefaultIconAction) {
// 				// Set active icon
// 				createSetIconAction("icon/ICON19_active.png", "icon/ICON38_active.png", function(setActiveIconAction) {
//           // Set auto icon
//           createSetIconAction("icon/ICON19_auto.png", "icon/ICON38_auto.png", function(setAutoIconAction) {
//             // Set disabled icon
//             createSetIconAction("icon/ICON19_disabled.png", "icon/ICON38_disabled.png", function(setDisabledIconAction) {					
              var rules = [];
              // Set page action
              rules.push( {
                id: "showPageAction" + baseIndex, priority: 0,
                conditions: [
                  new chrome.declarativeContent.PageStateMatcher({
                    pageUrl: { urlMatches: ".*" },
                  })
                ],
                // And shows the extension's page action.
                actions: [  new chrome.declarativeContent.ShowPageAction()]
              } );
            /*
            
              // Set default icon
              rules.push( {
                id: "setDefaultIcon" + baseIndex, priority: baseIndex++,
                conditions: [
                  new chrome.declarativeContent.PageStateMatcher({
                    pageUrl: { urlMatches: ".*"
                    //getSetting("temp-rules-allsites-pattern") 
                    },
                  })
                ],
                // And shows the extension's page action.
                actions: [  setDefaultIconAction ]
              } );
            
              // Set active icon
              rules.push( {
                id: "setActiveIcon" + baseIndex, priority: baseIndex++,
                conditions: [
                  new chrome.declarativeContent.PageStateMatcher({
                    //pageUrl: { urlMatches: ('://' + 'www.baidu.com/').getTextRegexpPattern() + ".*" },
                    pageUrl: { urlMatches: getSetting("temp-rules-inactivesites-pattern") },
                  })
                ],
                actions: [  setActiveIconAction ]
              } );
            
              // Set auto icon
              rules.push( {
                id: "setAutoIcon" + baseIndex, priority: baseIndex++,
                conditions: [
                  new chrome.declarativeContent.PageStateMatcher({
                    //pageUrl: { urlMatches: ('://' + 'www.baidu.com/').getTextRegexpPattern() + ".*" },
                    pageUrl: { urlMatches: getSetting("temp-rules-activesites-pattern") },
                  })
                ],
                actions: [  setAutoIconAction ]
              } );
            
              // Set disabled icon
              rules.push( {
                id: "setDisabledIcon" + baseIndex, priority: baseIndex++,
                conditions: [
                  new chrome.declarativeContent.PageStateMatcher({
                    pageUrl: { urlMatches: getExtDisabledPattern() },
                  })
                ],
                actions: [  setDisabledIconAction ]
              } );*/
    
              // Load content script
              rules.push( {
                id: "loadScript" + baseIndex, priority: 0,
                conditions: [
                  new chrome.declarativeContent.PageStateMatcher({
                    pageUrl: { urlMatches: getSetting("temp-rules-activesites-pattern") },
                  })
                ],
                actions: [  new chrome.declarativeContent.RequestContentScript({
                  "js": [ "injected/dom.js", "injected/sea-debug.js", "injected/seajs_boot.js", "injected/autoload.js"],
                  "allFrames": false,
                  "matchAboutBlank": false}) ]
              } );
            
              /*
              // Load extra plugin content script
              rules.push( {
                id: "loadScript",
                priority: 103,
                conditions: [
                  new chrome.declarativeContent.PageStateMatcher({
                    css: ["#cye-workaround-body"],
                  })
                ],
        
                // And shows the extension's page action.
                actions: [  new chrome.declarativeContent.RequestContentScript({
                  "js": ["injected/plugin/care-your-eyes.js"],
                  "allFrames": true,
                  "matchAboutBlank": false}) ]
              } );	*/		
            
//               console.log("base index=", baseIndex);
//               if (/*forInit && */(baseIndex % 40) != 0) {
                    //setTimeout(function() { addRules(rules); }, 100);


//               } else {
//                 chrome.declarativeContent.onPageChanged.getRules(undefined, function(rules) { console.log("current rules:", rules); });		
//               }

                
              addRules(rules);
              setSetting("temp-rules-baseindex", baseIndex, true);
              
//             });
//           });
//         });
// 			});		
			
			
		} // end of update rules
		
		function addRules(rules) {
      chrome.declarativeContent.onPageChanged.addRules(rules, function() { 
        if (chrome.runtime.lastError) 
          console.error(chrome.runtime.lastError); 
        
        console.info("Set rules", rules); 
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
	
	}
	
