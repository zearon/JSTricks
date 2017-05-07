// <a target='_blank' href='https://chrome.google.com/webstore/detail/care-your-eyes/fidmpnedniahpnkeomejhnepmbdamlhl'><b>Care-your-eyes</b></a> extension causes the height of some webpages becomes too big. This function fixes this problem.
setTimeout(function() {
	var height = document.body.scrollHeight;
	var ele1 = document.getElementById("cye-workaround-body");
	if (ele1) ele1.style.height = height + "px";
	var ele2 = document.getElementById("cye-workaround-body-image");
	if (ele2) ele2.style.height = height + "px";

	console.log("[Plugins] Height is adjusted for Eye-protection extension.");
}, 500);