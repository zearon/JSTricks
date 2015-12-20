/*
 * Requires jQuery
 */

CodeMirror.wrapSyntaxCheckHightlight = function(instance) {
	var wrapper = instance.getWrapperElement();
	var gutterWrapper = $(wrapper).find(".CodeMirror-gutter-text");
	var linesWrapper = $(wrapper).find(".CodeMirror-lines div:last");
	
	instance.clearSyntaxCheckHightlight = function() {
		linesWrapper.children("pre").removeClass("CodeMirror-line-error").removeClass("CodeMirror-line-warning");
		gutterWrapper.children().removeClass("CodeMirror-line-error").removeClass("CodeMirror-line-warning").attr("title", "");
	};
	
	// Errors is an array of objects which have .line and .reason attributes
	instance.setErrorLines = function(errors) {
		var lines = linesWrapper.children("pre");
		var count = errors.length;
		for (var i = 0; i < count; ++ i) {
			var error = errors[i];
			linesWrapper.find(`pre:eq(${error.line-1})`).removeClass("CodeMirror-line-warning").addClass("CodeMirror-line-error");
			gutterWrapper.find(`:eq(${error.line-1})`).removeClass("CodeMirror-line-warning").addClass("CodeMirror-line-error").attr("title", error.reason);
		}
	};	
	
	// Errors is an array of objects which have .line and .reason attributes
	instance.setWarningLines = function(errors) {
		var lines = linesWrapper.children("pre");
		var count = errors.length;
		for (var i = 0; i < count; ++ i) {
			var error = errors[i];
			linesWrapper.find(`pre:eq(${error.line-1})`).removeClass("CodeMirror-line-error").addClass("CodeMirror-line-warning");
			gutterWrapper.find(`:eq(${error.line-1})`).removeClass("CodeMirror-line-error").addClass("CodeMirror-line-warning").attr("title", error.reason);
		}
	};
	
	instance.getAllLineElements = function() {
		return linesWrapper.children("pre");
	}
	
	return instance;
}

CodeMirror._fromTextArea = CodeMirror.fromTextArea;
CodeMirror.fromTextArea = function(textarea, options) {
	var editor = CodeMirror._fromTextArea(textarea, options);
	return CodeMirror.wrapSyntaxCheckHightlight(editor);
}