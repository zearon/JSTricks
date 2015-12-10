//****************************************************
//**             Message Box Utilities              **
//****************************************************
seajs.use("jquery", function($) {
	window.log = log;
	
	var messageTimer = null;
	var msgDivID = "jstmessage___eircksdfjkdfh";
	
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
	

}); 