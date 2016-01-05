// <a target='_blank' href='https://chrome.google.com/webstore/detail/care-your-eyes/fidmpnedniahpnkeomejhnepmbdamlhl'><b>Care-your-eyes</b></a> extension causes the height of some webpages becomes too big. This function fixes this problem.
setTimeout(function() {
	var height = document.body.clientHeight;
	document.getElementById("cye-workaround-body").style.height = height + "px";
	document.getElementById("cye-workaround-body-image").style.height = height + "px";

	console.log("[Plugins] Height is adjusted for Eye-protection extension.");
}, 500);