(function(global) {
	/*********************************************
	 *             Public Interfaces             *
	 *                                           *
	 * Requires jQuery and cryptojs (3 files)    *
	 *   aes.js, md5.js, pad-zeropadding.js      *
	 *********************************************/
	 
	function CloudSave(url, path, passphrase, keyiv) {
		this.url = url;
		this.path = path;
		this.passphrase = passphrase;
		this.keyiv = keyiv;
	}
	
	CloudSave.prototype = {
		setPassword							: setPassword,
		backupSingleFile				: backupSingleFile,	
		restoreFromSingleFile		: restoreFromSingleFile,		 
		backupPackage 					: backupPackage,	
		restoreFromPackage 			: restoreFromPackage,
		restoreFromPackageFull	: restoreFromPackageFull,
		
		list				: list,
		view				: view,
		remove			: remove,
		leaveLast10	: leaveLast10,
		genKeyIV		: cloudStorageGenKeyIV,
		
		cloudStoragePost				: cloudStoragePost,
		MD5											: function(data) { try { return CryptoJS.MD5(data); } catch(ex) {console.info("Please make sure md5 in cryptojs in included."); throw ex;}},
		formatDate							: formatDate
	}
	CloudSave.prototype.constructor = CloudSave;
	
	// Export module
	global.CloudSave = CloudSave;
	
	
	
	 
	/*********************************************
	 *        Interface Definition               *
	 *********************************************/	 
	
	function setPassword(passphrase, keyiv) {
		this.passphrase = passphrase,
		this.keyiv = keyiv;
	}
	 
	/**
	 * Save a file into cloud.
	 */
	function backupSingleFile(filename, filedata, onok, onerr) {
		// cloudsave.php?method=save&path=chrome-ext&key=file2&value=hello2323
		this.cloudStoragePost({"method":"save", "key":filename, "value":filedata}, true, onok, onerr);
	}
	
	/**
	 * Restore a file from cloud.
	 */
	function restoreFromSingleFile(filename, onComplete) {
		this.view(filename, onComplete);
	}
	
	function backupPackage(manifest, assetFetcher, onok, onerr) {
		// var remoteManifest = getRemoteManifest();
		// var diffManifest = compareManifest(manifest, remoteManifest);
		// add <manifest file path>=<manifest content> to POST request as a field
		// for each file in manifest.assets
		// 		var text = assetFetcher(filename.version)
		// 		add add <asset file path>=<text> to POST request as a field
		// post the POST request to server
	}	
	
	/**
	 * Recover from a package with a given manifest from server in incremental mode:
	 * manifestFile: the filename of target manifest to be recovered.
	 * baseManifest: the base manifest in incremental recovery mode.
	 * onok: a callback when successfully get the content from cloud. function onok(manifest) {...}
	 * onerr (optional): a callback when error occurs during fetching the content from cloud. function onerr(err) {...}
	 * The baseManifest is a JSON object. E.g.
	 * var baseManifest = { 
	 *		"version": "20160101-1200000", 
	 *		"props": {
	 *			"key1": "value1",
	 *			"key2":	"value2"
	 *		}, 
	 *		"assets": {
	 *			"file1": "20160101-0810000",
	 *			"file2": "20160101-0815213"
	 *		}
	 *	}
	 */
	function restoreFromPackage (manifestFile, baseManifest, onok, onerr) {
		restoreFromPackage("incremental", manifest);
	};	
	
	/**
	 * Recover from a package with a given manifest from server in incremental mode:
	 * manifestFile: the filename of target manifest to be recovered.
	 * onok: a callback when successfully get the content from cloud. function onok(manifest) {...}
	 * onerr (optional): a callback when error occurs during fetching the content from cloud. function onerr(err) {...}
	 */
	function restoreFromPackageFull(manifest, onok, onerr) {
		restoreFromPackage("incremental", manifest);
	};
		
	function list(onok, onerr) {
		// cloudsave.php?method=list&path=chrome-ext
		this.cloudStoragePost({"method":"list"}, true, onok, onerr);
	}
	
	function view(filename, oncomplete) {
		//cloudsave.php?method=load&path=chrome-ext&key=20151101-185152
		this.cloudStoragePost({"method":"load", "key":filename}, false, oncomplete);
	}
	
		
	function remove(key, onok, onerr) {				
		//cloudsave.php?method=delete&path=chrome-ext&key=20151101-181410
		this.cloudStoragePost({"method":"delete", "key":key}, true, onok, onerr);
	}
		
	function leaveLast10(onok, onerr) {
		// cloudsave.php?method=removeExceptLast10&path=chrome-ext
		this.cloudStoragePost({"method":"removeExceptLast10"}, true, onok, onerr);
	}
	
	 
	/*********************************************
	 *        Internal Implementations           *
	 *********************************************/	 


	
	function getRemoteManifest(onok, onerr) {
	}
	
	function compareManifest(localMenifest, remoteManifest) {
		// return a new manifest representing the difference
	}
	
	function createPackage(manifest, assetFetcher) {
		// manifest.content = {};
		// for each file in manifest.assets
		// 		var text = assetFetcher(filename.version)
		// 		save text file to server
	}
	
	
	/**
	 * Get a package from server whose:
	 * mode: "full" for full recovery, and "incremental" for incremental recovery.
	 * manifestFile: the filename of target manifest to be recovered.
	 * baseManifest: the base manifest in incremental recovery mode.
	 * base (optional): the base manifest in incremental recovery mode.
	 * onok: a callback when successfully get the content from cloud. function onok(manifest) {...}
	 * onerr (optional): a callback when error occurs during fetching the content from cloud. function onerr(err) {...}
	 * The manifest is a JSON object. E.g.
	 * var manifest = { 
	 *		"version": "20160101-1200000", 
	 *		"props": {
	 *			"key1": "value1",
	 *			"key2":	"value2"
	 *		}, 
	 *		"assets": {
	 *			"file1": "20160101-0810000",
	 *			"file2": "20160101-0815213"
	 *		}
	 *	}
	 */
	function restoreFromPackage(mode, manifestFile, baseManifest, onok, onerr) {
		if (mode == "full") {
			// send a request to server with manifestFile=manifestFile
			//		with onok and onerr
		}
		
		else if (mode == "incremental") {
			// var remoteManifest = getRemoteManifest();
			// var diffManifest = compareManifest(manifest, remoteManifest);			
			// send a request to server with manifestFile=manifestFile, baseManifest=<JSON data of basemanifest>
			//		with onok and onerr
		}
	}
	
	
	 		
	function cloudStoragePost(data, resInJson, onok, onerr) {
		if (!this.url || !this.passphrase || !this.keyiv) {
			onerr(new Error("Cannot initialize cloud save. Cloud storage is not set yet."));
			return;
		}
		
		var timestr = formatDate(new Date(), "yyyyMMddhhmmssS");
		data["path"] = this.path;			
		data["time"] = timestr;
		data["token"] = cloudStorageGenCode(timestr, this.passphrase, this.keyiv);
		
		if (!onerr)	
			onerr = onPostError;
		
		$.post(this.url, data).done(onPostComplete).fail(onerr);
	
		function onPostComplete(data) {
			if (resInJson) {
				if (data.code == 0) {
					onok(data);
				} else {
					var err = new Error("Failed to delete the configuration. \n" + data.message);
					console.error("Cloud post error:", data);
					onerr(err);
				}
			} else {
				onok(data);
			}
		}
	
		function onPostError(err) {
			console.error(err);
		}
	}

	
	

	/*********************************************
	 *        Utility methods                    *
	 *********************************************/	
	
	function cloudStorageGenCode(text, passphrase, keyiv) {		
		// function defined in aes.js, md5.js, pad-zeropadding.js in js/cryptojs	
		var key_hash = CryptoJS.MD5(passphrase); 
		var key = CryptoJS.enc.Utf8.parse(key_hash); 			
		var iv  = CryptoJS.enc.Utf8.parse(keyiv); 
		// var iv  = CryptoJS.enc.Utf8.parse('1234567812345678'); 
		var encrypted = CryptoJS.AES.encrypt(text, key, { iv: iv,mode:CryptoJS.mode.CBC, padding:CryptoJS.pad.ZeroPadding}); 
		var encryptedText = "" + encrypted;
		//console.log(text)
		//console.log(keyiv)
		//console.log(encryptedText);
		return encryptedText;
	}
	
	function cloudStorageGenKeyIV() {
		chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFYHIJKLMNOPQRSTUVWXYZ~!@#$%^&*()_+{}|[]:;<>,.?/';
		length = chars.length;
		key = '';
		for (var i = 0; i < 16; ++ i) {
			var index = Math.round((Math.random() * 1000000)) % 88;
			key += chars[index];
		}
		
		return key;
	}
	
	function formatDate(date, fmt)  { //author: meizz 
	  var o = { 
		"M+" : date.getMonth()+1,                 //月份 
		"d+" : date.getDate(),                    //日 
		"h+" : date.getHours(),                   //小时 
		"m+" : date.getMinutes(),                 //分 
		"s+" : date.getSeconds(),                 //秒 
		"q+" : Math.floor((date.getMonth()+3)/3), //季度 
		"S"  : date.getMilliseconds()             //毫秒 
	  }; 
	  if(/(y+)/.test(fmt)) 
		fmt=fmt.replace(RegExp.$1, (date.getFullYear()+"").substr(4 - RegExp.$1.length)); 
	  for(var k in o) 
		if(new RegExp("("+ k +")").test(fmt)) 
	  fmt = fmt.replace(RegExp.$1, (RegExp.$1.length==1) ? (o[k]) : (("00"+ o[k]).substr((""+ o[k]).length))); 
	  return fmt; 
	}
	
}) (this);