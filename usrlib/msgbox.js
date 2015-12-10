//****************************************************
//**             Message Box Utilities              **
//****************************************************
(function() {
	var $ = jQuery;
	var messageTimer = null;
	var msgDivID = "jstmessage___eircksdfjkdfh";
	window.log = log;
	
	function log(text, raw) {
	  console.log(text);
	  if (showMessage) 
		showMessage(text, raw);
	}
	function showMessage(text, raw)
	{
		raw = (typeof raw === 'undefined') ? false : raw;
		text = raw ? text.replace(/</g,'&lt;').replace(/>/g,'&gt;') : text;
		
		var $message = $(`#${msgDivID}`);
		clearTimeout(messageTimer);
		$message.stop().animate({top:"0px"});
		$message.append("<div>" + text + "</div>");
		messageTimer = setTimeout(hideMsgBox,1750);	
		//console.log(text);
	}
	function keepMsgBox() {
		clearTimeout(messageTimer);
		var $message = $(`#${msgDivID}`);
		$message.stop().animate({top:"0px"});
	}
	function hideMsgBox() {
		var $message = $(`#${msgDivID}`);
		var height = $message.height();
		$(`#${msgDivID}`).animate({top:"-"+(height)+"px"},800,
			function(){
				$message.text("");
				$message.css({top:"-50px"});
		})
	}
	function buildMsgBox() {
		$('body').append(`
		<style>
			#${msgDivID}
			{
				position:fixed;
				top:-50px;
				left:50%;
				margin-left:-250px;
				width:500px;
				padding:0 10px;
				opacity: 0.6;
				background:rgba(247,223,29,1);
				box-shadow:rgba(0,0,0,0.4) 0 3px 10px;
				border-radius:0 0 5px 5px;
				border:1px solid rgba(147,123,19,1);
				border-top:0px;
				z-index:2000;
			}
			#${msgDivID} div{
				text-align:center;
				line-height:16px;
				font-weight:normal;
				font-size:12px;
			}
			#${msgDivID} pre{
				text-align:left;
				line-height:16px;
				font-weight:normal;
				font-size:12px;
			}
	</style>
	<div id="${msgDivID}" ></div>
		`);
		$('#'+msgDivID).hover(keepMsgBox, hideMsgBox);
	}
			
	$(function() {
		buildMsgBox();
	});
	
	
	//****************************************************
	//**       Loaded Content Script Dictionary         **
	//****************************************************
	
	
	//****************************************************
	//**               Include Utilities                **
	//****************************************************
	console.log("[JScript Tricks] define function includeCS(urls) in msgbox.js");
	function require(urls, callback) {
	  var urlList = {}; var signal = $.Deferred();
	  if (typeof urls === "string") {
		urlList[0] = urls;
	  } else {
		urlList = urls;
	  
		if (!(typeof urls === "object") || !urlList[0]) {
		  console.log("includeCS requires one or an array of url strings.");
		  console.log(urls);
		  signal.reject();
		  return signal;
		}
	  }
	  
	  chrome.runtime.sendMessage({method: "RequireContectScript", data:urlList}, function() {
		try {  	
		  if (callback)
			callback();
		} catch (exception) {}
		
		signal.resolve();
	  });
	  
	  return signal;
	}
	
	function includeCS(urls, callback) {
	  var urlList = {}; var signal = $.Deferred();
	  if (typeof urls === "string") {
		urlList[0] = urls;
	  } else {
		urlList = urls;
	  
		if (!(typeof urls === "object") || !urlList[0]) {
		  console.log("includeCS requires one or an array of url strings.");
		  console.log(urls);
		  signal.reject();
		  return signal;
		}
	  }
	  
	  return __loadScript(signal, callback, urlList, 0);
	}
	
	function __loadScript(signal, callback, urlList, index) {
	  var url = urlList[index];
	  if (!url) {
		console.log(`urls[${index}]="${url}" is invalid`);
		return;
	  }
		
		
	  if (!(/^(http|https|file|chrome-extension):\/\//.test(url))) {
		// Load dynamic content scripts
		url = "chrome-extension://" + chrome.runtime.id + "/" + url;
	  }
	  
	  //console.log(url);
	  
	  $.getScript(url)
		.done(function() {
		  console.log(`script loaded from ${url}`);
		  
		  if (index < urlList.length - 1) {
			__loadScript(signal, callback, urlList, index + 1);
		  } else {
			try{
			  if (callback)
				callback();
			} catch (exception) {}
			
			signal.resolve();
		  }
			
		})
		.fail(function() { signal.reject(); });
	  
	  return signal;
	}
})();
 