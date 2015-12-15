//****************************************************
//**             Message Box Utilities              **
//****************************************************
//seajs.use("jquery", function($) {
define(["jquery"], function(require, exports, module) {
	var $ = require("jquery");
	module.exports = window.log = log;
	
	var messageTimer = null;
	var msgDivID = "jstmessage___eircksdfjkdfh";
	var mode = parseInt(INFO.settings.builtin_msgboxPosition); // 0 for top, 1 for bottom
	var displayTime = parseInt(INFO.settings.builtin_msgboxDisplayTime);
	
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
		$message.stop().animate( getCssDisplayed() );
		$message.append("<div>" + text + "</div>");
		messageTimer = setTimeout(hideMsgBox, displayTime);	
		//console.log(text);
	}
	function keepMsgBox() {
		clearTimeout(messageTimer);
		var $message = $(`#${msgDivID}`);
		$message.stop().animate( getCssDisplayed() );
	}
	function hideMsgBox() {
		var $message = $(`#${msgDivID}`);
		$(`#${msgDivID}`).animate(getCssHidden($message) , 800,
			function(){
				$message.text("");
				$message.css( getInitCSSStyle() );
		})
	}
	function getInitCSS() {
		var css;
		switch (mode) {
		case 0:
			css = {top:"-50px"};
			break;
		case 1:
			css = {bottom:"-50px"};
			break;
		}
		return css;
	}
	function getInitCSSStyle() {
		var style = "";
		switch (mode) {
		case 0:
			style = "top:-50px;";
			break;
		case 1:
			style = "bottom:-50px;";
			break;
		}
		return style;
	}
	function getCssDisplayed() {
		var css;
		switch (mode) {
		case 0:
			css = {top:"0px"};
			break;
		case 1:
			css = {bottom:"0px"};
			break;
		}
		return css;
	}
	function getCssHidden(msgDiv) {
		var css;
		var height = msgDiv.height();
		switch (mode) {
		case 0:
			css = {top:"-"+(height)+"px"};
			break;
		case 1:
			css = {bottom:"-"+(height)+"px"};
			break;
		}
		return css;
	}
	
	function buildMsgBox() {
		$('body').append(`
		<style>
			#${msgDivID}
			{
				position:fixed;
				${getInitCSSStyle()}
				left:calc( 50% - ${INFO.settings.builtin_msgboxWidth} / 2);
				padding:0 10px;
				width:${INFO.settings.builtin_msgboxWidth}; /* 500px */
				font-family: "Microsoft YaHei";
				opacity: ${INFO.settings.builtin_msgboxOpacity}; /* 0.8 */
				box-shadow:rgba(0,0,0,0.4) 0 3px 10px;
				border-radius:5px 5px 5px 5px;
				background:${INFO.settings.builtin_msgboxBgColor}; /* rgba(247,223,29,1), #F7DF1D */
				border:${INFO.settings.builtin_msgboxExtraStyles}; /* 1px solid rgba(147,123,19,1) #937B13 */
				border-top:0px;
				z-index:2147483645;
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
		$('#'+msgDivID).hover(keepMsgBox, function() {
			messageTimer = setTimeout(hideMsgBox, displayTime);	
		});
	}
			
	$(function() {
		buildMsgBox();
	});
	

}); 