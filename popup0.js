function loadPopupPage() {
	var popupWindow = window.open(
	chrome.extension.getURL("popup.html"),
		"exampleName",
		"width=600,height=571"
	);
	window.close(); // close the Chrome extension pop-up
}

loadPopupPage();