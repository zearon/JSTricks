function getStaticTheme(theme) {
	if (theme === undefined)
		theme = storage.getSetting("theme");
		
	if (theme != "automatic") {
		return theme;
	} else {
		var now = (new Date()).Format("hh:mm");
		var nightStartTime = storage.getSetting("theme_nightStartTime");
		var nightEndTime = storage.getSetting("theme_nightEndTime");
		var dayTheme = storage.getSetting("theme_day");
		var nightTheme = storage.getSetting("theme_night");
		
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