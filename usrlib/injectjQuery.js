(function() {
	function loadScript(src, callback) {
		var s = document.createElement('script');
		s.setAttribute('src', src);
		s.setAttribute('type', 'text/javascript');
		s.onload = callback;
		document.getElementsByTagName('head')[0].appendChild(s);
	};
	function loadLink(rel,href) {
		var s = document.createElement('link');
		s.setAttribute('rel', rel);
		s.setAttribute('href', href);
		document.getElementsByTagName('head')[0].appendChild(s);
	}
	
	if (typeof window.__UI_dialog__ === 'undefined') {
		if (typeof jQuery === 'undefined') {
			var symbol = 'jQuery';
			if (typeof $ === 'undefined')
				symbol = '$';
				
			loadScript('https://code.jquery.com/jquery-2.1.1.min.js', onLoad);
			if (symbol == 'jQuery') {
				jQuery.noConflict();
			}
		} else {
			onLoad();
		}
		
		function onLoad() {	
			var $ = jQuery;
			loadLink('stylesheet', 'https://code.jquery.com/ui/1.11.4/themes/smoothness/jquery-ui.css');
			loadScript('https://code.jquery.com/ui/1.11.4/jquery-ui.js', createAndShowDialog);
		}
	} else {
		showDialog();
	}
	
	function createAndShowDialog() {
		console.log('Create and show dialog');
		createDialog();
		showDialog();
	}
	
	function createDialog() {
		var path = "D:/<百度云同步盘路径>/Util/ChromeExtConfig";
		if (navigator.userAgent.indexOf('Macintosh') >= 0)
			path = "/Volumes/MacData/Users/zhiyuangong/BaiduCloud/百度云同步盘/Util/ChromeExtConfig";
			
		$('body').append('<div id="__UI_dialog__DIV" title="Local Storage Backup and Restore">'+
			'<input id="__UI_dialog__backup" type="button" value="Backup" />'+
			'<a id="__UI_dialog__link" download="backup.json" style="display:none">Download</a><hr/>'+
			'Local storage backup file: '+
			'<input id="__LocalStorageFP__" type="file" />'+
			'<input id="__UI_dialog__restore" type="button" value="Restore" />'+
		'</div>');
		
		window.__UI_dialog__ = $('#__UI_dialog__DIV').dialog({
			autoOpen: false, width: 450, modal: true
		});
		$('#__UI_dialog__backup').click(backup);
		$('#__UI_dialog__restore').click(restore);
		
		console.log('Dialog created');
	}
	
	function showDialog() {
		console.log('Show dialog');
		window.__UI_dialog__.dialog('open');
	}
	
	function backup() {
		var data = JSON.stringify(localStorage);
		var link = $('#__UI_dialog__link');
		link.attr('href', "data:text/plain;charset=UTF-8,"+encodeURIComponent(data));
		link.attr('data-downloadurl', "text/plain:backup.json:"+"http://html5-demos.appspot.com/static/a.download.html");
		link.innerHtml = "Download";
		link.show();
	}
	
	function restore() {
		var file = $('#__LocalStorageFP__')[0].files[0];
		var reader = new FileReader();
		reader.onload = function() {
			text = this.result;
			console.log(text);
			var values = JSON.parse(text);
			for (v in values) {
				localStorage[v] = values[v];
				/*console.log(v+"="+values[v]);*/
			}
		};
		reader.readAsText(file);
	}
})();