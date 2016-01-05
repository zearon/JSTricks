(function() {
	chrome.runtime.onInstalled.addListener(onExtensionInstalled);
	
	/* Event listeners */
	function onExtensionInstalled(details) {
		// Replace all rules ...
		chrome.declarativeContent.onPageChanged.removeRules(["setIcon"], function() {
			// With a new rule ...
			var rules = [];
			rules.push( {
				id: "setIcon",
				tags: ["icon", "allpage"],
				priority: 100,
				// That fires when a page's URL contains a 'g' ...
				conditions: [
					new chrome.declarativeContent.PageStateMatcher({
						pageUrl: { urlMatches: 'baidu\.com.*' },
					})
				],
				// And shows the extension's page action.
				actions: [ /*
					new chrome.declarativeContent.ShowPageAction(),
					new chorme.declarativeContent.setIcon({path:"icon/ICON38_auto.png"})*/
				]
			} );
			
			
			chrome.declarativeContent.onPageChanged.addRules(rules);
			//chrome.declarativeContent.onPageChanged.getRules("", function(rules) { console.log(rules); });
			console.log("rules:", rules);
			
		});

	}
}) ();