// CodeMirror, copyright (c) by Marijn Haverbeke and others
// Distributed under an MIT license: http://codemirror.net/LICENSE

(function(mod) {
  if (typeof exports == "object" && typeof module == "object") // CommonJS
    mod(require("../../lib/codemirror"))
  else if (typeof define == "function" && define.amd) // AMD
    define(["../../lib/codemirror"], mod)
  else // Plain browser env
    mod(CodeMirror)
})(function(CodeMirror) {
  "use strict"
  
  CodeMirror.defineOption("rightColumn", false, function(cm, val, old) {
    if (old && old != CodeMirror.Init) {
      //setColumnLayout_partof(cm);
    }
    
    setRightColumnOptions(cm, val);
  });
  
  CodeMirror.defineExtension("rightColumn_get", function() {
    var state = this.state.rightColumn;
    if (state) return state.contentPanel;
    return null;
  });
  
  
  
  
  function setRightColumnOptions(cm, val) {
    if (!val) {
      val = { width: 0};
    }
      
    setColumnLayout_partof(cm, val);
    
    if (!cm._scrollbar_update_replaced) {
      cm._scrollbar_update_replaced = true;
      cm.display.scrollbars.orig_update = 
        cm.display.scrollbars.update;
      cm.display.scrollbars.update = updateScrollbar;
    }
  
    // Decorator method for Scrollbars.update
    function updateScrollbar(measure) {
      var state = cm.state.rightColumn;
      var width = this.cm.options.rightColumn.width
      
      var result = cm.display.scrollbars.orig_update(measure); 
           
      var needsH = measure.scrollWidth > measure.clientWidth + 1;
      if (needsH) {
        this.horiz.style.right = (parseInt(this.horiz.style.right) + width) + "px";
        this.horiz.firstChild.style.width =
          (parseInt(this.horiz.firstChild.style.width) - width) + "px";
      }
      
      state.sizer.style.borderRightWidth = "0";
      // in ../../lib/codemirror.js function updateScrollbarsInner at about line 546
      // set padding-right of div.CodeMirror-sizer after calling scrollers.update with code:
      // d.sizer.style.paddingRight = sizes.sizerPaddingRight
      result.sizerPaddingRight = "0px";
      
      return result;
    }
  }
  
  function setColumnLayout_partof(cm, options) {
    if (!options) {
      options = { width: 0};
    }
    
    var wrapper = cm.getWrapperElement();  
    var width = options.width;
    
    if (!cm.state.rightColumn) {
      cm.state.rightColumn = {};
      cm.state.rightColumn.width = width;
      cm.state.rightColumn.panel = document.createElement("div");
      cm.state.rightColumn.panel.className = "cm-rightpanel";
      cm.state.rightColumn.panel.setAttribute("style", "position:absolute; top:0; right:0; width:"+width+"px; height:100%; overflow:hidden;");
      
      cm.state.rightColumn.panel.innerHTML = "<div id='spitter' style='width:5px; cursor:move; position:absolute; top:0; left:0; height:100%; background-color:lightgray;' ></div>" + 
                                             "<div style='padding-left:5px; height:100%; overflow:auto;'></div>";
      cm.state.rightColumn.panel.children[0].addEventListener("mousedown", onSpliterDragStart, true);
      
      cm.state.rightColumn.contentPanel = document.createElement("div");
      cm.state.rightColumn.contentPanel.className = "cm-rightpanel-content";
      cm.state.rightColumn.panel.children[1].appendChild(cm.state.rightColumn.contentPanel);
      
      wrapper.appendChild(cm.state.rightColumn.panel);
    } else {
      cm.state.rightColumn.panel.style.width = width + "px";
    }
    
    var state = cm.state.rightColumn;  
    
    state.corner  = wrapper.querySelector(".CodeMirror-scrollbar-filler");
    state.sizer = wrapper.querySelector(".CodeMirror-sizer");
    
    cm.display.scroller.style.width = "calc(100% - " + width + "px)";
    cm.display.scrollbars.vert.style.right = width + "px";
    state.corner.style.right = width + "px";
    
    // Update scrollbars of the editor zone.
    var scrollTop = cm.display.scrollbars.vert.scrollTop;
    cm.display.scrollbars.vert.scrollTop = scrollTop + 200;
    setTimeout(function() {cm.display.scrollbars.vert.scrollTop = scrollTop;}, 10);
  
    // Event handlers for the splitter bar. 
    // Only support HTML5 compatible browsers
    var origWidth = null, origin = null, offset = 0;
    function onSpliterDragStart(e) {
      console.log("drag start");
      origWidth = cm.getOption("rightColumn").width;
      origin = e.pageX;
      document.body.addEventListener("mousemove", onSpliterDrag);
      document.body.addEventListener("mouseup", onSpliterDragEnd);
    }
  
    function onSpliterDrag(e) {
      offset = e.pageX - origin;
      console.log("dragging. offset=", offset);
    }
  
    function onSpliterDragEnd(e) {
      cm.setOption("rightColumn", {width: origWidth-offset});
      document.body.removeEventListener("mousemove", onSpliterDrag);
      document.body.removeEventListener("mouseup", onSpliterDragEnd);
    }
  }
  
/*  
  .CodeMirror-scroll {
  width: calc(100% - 150px);
}

.CodeMirror-vscrollbar {
  right: 150px;
}

.CodeMirror-hscrollbar {
  right: 165px !important;
}

.CodeMirror-scrollbar-filler {
  right: 150px !important;
}
*/
});
