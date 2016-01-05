(function() {	
	/* Register events */
	chrome.runtime.onInstalled.addListener(onExtensionInstalled);
	/*chrome.runtime.onMessage.addListener(onMessageReceived);*/

	/* Event listeners */
	function onExtensionInstalled(details) {
		//initConextMenu();
	}
	/*
	function onMessageReceived(request, sender) {
		if (request.method == "UpdateSettings") {
			onOptionValueChanged();
		} else if (request.method == "UpdateContextMenu") {
			var scriptGroups = request.data;
			console.log("Update Context Menu");
			console.log(scriptGroups);
			updateConextMenu(scriptGroups);
		} 
	}*/
	
	
	//function get
}) ();

