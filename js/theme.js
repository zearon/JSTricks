function getStaticTheme(theme) {
	if (theme === undefined)
		theme = localStorage["$setting.temp-theme"];
		
	if (theme != "automatic") {
		return theme;
	} else {
		var now = (new Date()).Format("hh:mm");
		var nightStartTime = localStorage["$setting.theme_nightStartTime"];
		var nightEndTime = localStorage["$setting.theme_nightEndTime"];
		var dayTheme = localStorage["$setting.theme_day"];
		var nightTheme = localStorage["$setting.theme_night"];
		
		return (now >= nightStartTime || now <= nightEndTime) ? nightTheme : dayTheme;
	}
}

function getCodeMirrorTheme(theme) {
	if (theme === undefined)
		theme = getStaticTheme();
	
	switch (theme) {
	case "light":
		return "default";
	case "_yellow":
		return "_yellow";
	case "dark":
		return "abcdef";
	default:
		return "_yellow";
	}	
}

function setTheme(theme) {
	var theme_ = getStaticTheme(theme);
	var theme_codemirror = getCodeMirrorTheme(theme_), theme_jqueryui;
	
	theme_ = "theme-" + theme_;
	var classes = $("body").attr("class");
	classes = classes ? classes.replace(/theme-.+?\b/g, theme_) : theme_;
	$("body").attr("class", classes);	
	
	// editors is a list of CodeMirror objects
	for (var i = 0; i < editors.length; ++ i) {
		editors[i].setOption("theme", theme_codemirror);
	}
}

function loadTheme() {
	setTheme(getStaticTheme());
}

$(loadTheme);