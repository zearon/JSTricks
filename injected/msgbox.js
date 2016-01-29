//****************************************************
//**             Message Box Utilities              **
//****************************************************
(function() {
	var $ = null; //require("jquery");  lazy load jquery in initMessageBox function with require.async
	// This object only exists in the content scripts.
	// In the top frame, there is a delegate for msgbox, which is defined in injected.js
	// and processed in autoload.js
	(function(Msgbox) {
    var msgbox = new Msgbox();
    if (chrome.extension) {
      window.msgbox = msgbox;
      define("msgbox", [], msgbox);
    } else {
      window.msgbox_02510e5e_ac1d_4f71_b376_92d5fba1437c = msgbox;
    }
    
    /*
    Sample code of getting msg object as a global variable:
    var msgbox = chrome.extension ? window.msgbox : 
               window.msgbox_02510e5e_ac1d_4f71_b376_92d5fba1437c;	
    */    
	}) ( (function() {
    function Msgbox() {
      this.init.apply(this, arguments);
    }
  
    var UTIL = chrome.extension ? window.UTIL : 
               window.UTIL_dad28be6_ead8_4d79_87bf_6fd217f27d6d;
    var INFO = null;
    function getINFO() {
      return INFO ? INFO :
             INFO = chrome.extension ? window.INFO : 
             window.INFO_cb8e4309_b9cf_44ad_95d1_b570a913ccd9;
    }
    
    var messageTimer = null;
    var msgDivID = "jstmessage___eircksdfjkdfh";
    var msgboxInited = false, msgboxStartInit = false;
    var callbackOnMsgboxInited = [];
    var mode;// = parseInt(INFO.settings.builtin_msgboxPosition); // 0 for top, 1 for bottom
    var displayTime;// = parseInt(INFO.settings.builtin_msgboxDisplayTime);
  
    Msgbox.prototype.clone = function() {
      var instance = new Msgbox();
      instance.init.apply(instance, arguments);
      return instance;
    };
  
    Msgbox.prototype.init = function(srcScript, extraStackLevel) {
      if (!srcScript) srcScript = "";
      if (!extraStackLevel) extraStackLevel = 0;
      this.srcScript = srcScript;
      this.extraStackLevel = extraStackLevel;
    }
  
    Msgbox.prototype.log = function() {
      log_internal(this, 2, UTIL.argsToArray(arguments));
    };
  
    Msgbox.prototype.show = function() {
      show_internal(this, UTIL.argsToArray(arguments), true);
    };
  
    Msgbox.prototype.showRaw = function() {
      show_internal(this, UTIL.argsToArray(arguments), false);
    };
  
    Msgbox.prototype.initMsgboxAndShow = function(text) {
      function showMessageInMessageBox() {
        showMessage(text);
      }
      
      initMessageBox(showMessageInMessageBox);
    };
  
    function log_internal(self, stacktraceLevel, args) {
      var stacktrace = new Error().stack.split(/\n\s*\bat\b\s*/);
      var stlevel = stacktraceLevel + 1;
      if (self.extraStackLevel) stlevel += self.extraStackLevel;
      stacktrace = stacktrace[stlevel];

      notifyMessage({type:"log", msg:args.join(" "), script:self.srcScript, stacktrace:stacktrace});
    
      if (self.srcScript)
        args.unshift("[" + self.srcScript + "]");
        
      if (getINFO().settings.builtin_msgboxShowStacktrace === "true")
        args = args.concat(["\n\tat", stacktrace]);
    
      console.log.apply(console, args);
    }
    
    function notifyMessage(obj) {        
      if (chrome.extension) {
        autoload.notifyMessage(obj);
      } else {
        UTIL.callMethodInContentScript("autoload", "notifyMessage", UTIL.argsToArray(arguments));
      }
    }
  
    function show_internal(self, args, escapeHtml) {
      escapeHtml = (escapeHtml == undefined) ? false : escapeHtml;
      if (self.srcScript)
        args.unshift("[" + self.srcScript + "]");
      var text = args.join(" ");
      text = escapeHtml ? UTIL.String.html2Escape(text) : text;
        
      function showMessageInMessageBox() {        
        showMessage(text);
      }
    
      log_internal(self, 3, args);
      
      if (chrome.extension) {
        initMessageBox(showMessageInMessageBox);
      } else {
        UTIL.callMethodInContentScript("msgbox", "initMsgboxAndShow", [text]);
      }
    }
  
    function initMessageBox(callback) {
      getINFO();
      
      if (!msgboxInited) {
        // Not initialized yet 
        callbackOnMsgboxInited.push(callback);
    
        if (!msgboxStartInit) {
          msgboxStartInit = true;
          run(['jquery'], function(jQuery) {
            $ = jQuery;
            mode = parseInt(INFO.settings.builtin_msgboxPosition); // 0 for top, 1 for bottom
            displayTime = parseInt(INFO.settings.builtin_msgboxDisplayTime);
  
            buildMsgBox();
            msgboxInited = true;
        
            // call callbacks
            callbackOnMsgboxInited.forEach(function(callback) {
              callback();
            });
            callbackOnMsgboxInited = [];
          });
        }
      } else {
        // Already initialized
        callback();
      }
    }
  
    function showMessage(text)
    {    
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
          color:black;
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
  
    return Msgbox;
	})() );

}) (); 