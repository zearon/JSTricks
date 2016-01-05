(function() {
	chrome.runtime.onInstalled.addListener(onExtensionInstalled);
	
	/* Event listeners */
	function onExtensionInstalled(details) {
		// Replace all rules ...
		chrome.declarativeContent.onPageChanged.removeRules(["setIcon"], function() {
			// With a new rule ...
			chrome.declarativeContent.onPageChanged.addRules([
				{
					id: "setIcon",
					tags: ["icon", "allpage"],
					priority: 100,
					// That fires when a page's URL contains a 'g' ...
					conditions: [
						new chrome.declarativeContent.PageStateMatcher({
							pageUrl: { urlContains: 'c' },
						})
					],
					// And shows the extension's page action.
					actions: [ new chrome.declarativeContent.ShowPageAction() ]
				}
			]);
		});

	}
}) ();