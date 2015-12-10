<?php
// To save:
// cloudsave.php?method=save&path=chrome-ext&key=file2&value=hello2323
// To load:
// cloudsave.php?method=load&path=chrome-ext&key=file2
// To list:
// cloudsave.php?method=list&path=chrome-ext

// apt-get install php5-mcrypt


$ROOTPATH_PREFIX = "/media/RPI-Data";
$ROOTPATH = "$ROOTPATH_PREFIX/CloudStorage";
$PASSPHASE = "<Any non-empty text>"; // Any non-empty text
$KEY_IV= "<16 characters>"; // 16 characters;

@$code = isset($_GET["method"]) ? $_GET["method"] : $_POST["method"];
if (!$code) $code = "";

// method should be load or save
@$method = isset($_GET["method"]) ? $_GET["method"] : $_POST["method"];
if (!$method) $method = "load";

@$path = isset($_GET["path"]) ? $_GET["path"] : $_POST["path"] ;
if (!$path || $path == "")
	$path = "$ROOTPATH/Default";
else
	$path = "$ROOTPATH/$path";
	
@$key = isset($_GET["key"]) ? $_GET["key"] : $_POST["key"] ;
if (!$key) $key = "__default____file__";

@$value = isset($_GET["value"]) ? $_GET["value"] : $_POST["value"] ;
if (!$value) $value = "";

@$token = isset($_GET["token"]) ? $_GET["token"] : $_POST["token"] ;
if (!$token) $token = "";
@$time = isset($_GET["time"]) ? $_GET["time"] : $_POST["time"] ;
if (!$time) $time = "";

$filePath = "$path/$key.txt";
$file = null;

$return = array ('code'=>1, 'code_desc'=>'0 is ok, others is errcode.', 'result'=>'', 'message'=>'', 'detail'=>array() );
$authorized = false;

function info($msg) {
	GLOBAL $return;
	array_push($return['detail'], $msg);
}

// Authenticate
$PRIVATEKEY = md5($PASSPHASE);  //key的长度必须16，32位,这里直接MD5一个长度为32位的key
$crypttext = mcrypt_encrypt(MCRYPT_RIJNDAEL_128, $PRIVATEKEY, $time, MCRYPT_MODE_CBC, $KEY_IV);
$cryptbase64 = base64_encode($crypttext);
$authorized = ($cryptbase64 == $token);

//info("time is '$time'");
//info("token is '$token'");
//info("computed token is '$cryptbase64'");



if (!$authorized) {
	header('HTTP/1.1 401 Unauthorized');
	exit;
}

// Load file
if ($method == "load") {
	header("Content-type:text/plain");
	if (file_exists($filePath)) {
		$file = fopen($filePath, "r");
		$contents = fread($file, filesize($filePath));
		fclose($file);
		echo $contents;
	} else {
		header("HTTP/1.1 404 File $key Not Found");
	}
}
else {
	header("Content-type:application/json");
	try {

		// Save file
		if ($method == "save") {
			// If the directory $path does not exist, then create it.
			if (!is_dir($path)) {
				$dirmode = 0777;
				// echo "Create dir $path with mask $mode <br/>";
				$ok = mkdir($path, $dirmode, true);
				$ok = chmod($path, $dirmode);
			}		
			
			// Create and write content to the file.
			$filemode = 0664;
			if (strpos($filePath, $ROOTPATH) === 0) {
				if ($file = fopen($filePath, "w")) {
					fwrite($file, $value);
					chmod($filePath, $filemode);
					info( "'$key' is saved to file $filePath" );
				}
			}
			$return["code"] = 0;  
		} 
		// List files
		else if ($method == "list") {
			if($files = scandir($path, SCANDIR_SORT_DESCENDING)) {        
				$files = array_slice($files, 0, count($files) - 2);
				$files = array_map(function($ele) { 
					return preg_replace('/\.txt$/', "", $ele);
				}, $files); 
				$return["code"] = 0;  
				$return["result"] = $files;
			}   
			$return["result"] = $files;
		}
		// Delete a single file
		else if ($method == "delete") {
			@unlink("$path/$key.txt");
			$return["code"] = 0;  
			$return["message"] = "$key is removed.";
		}
		// Remove all files except the last 10 (sorting by file name descending)
		else if ($method == "removeExceptLast10") {
			// Remove files
			if($files = scandir($path, SCANDIR_SORT_DESCENDING)) { 
				$keepCount = 10;       
				$fileRemovedCount = count($files) - 2 - $keepCount;
				$fileRemovedCount = $fileRemovedCount > 0 ? $fileRemovedCount : 0;
				$files = array_slice($files, $keepCount, count($files) - 2 - $keepCount);
				// info( "Following files are to be removed.\n" . var_export($files) );
				array_walk($files, function($ele) use($path) { 
					@unlink("$path/$ele");
					info( "$path/$ele is removed." );
				});   
			}
			
			// list remaining files
			if($files = scandir($path, SCANDIR_SORT_DESCENDING)) {        
				$files = array_slice($files, 0, count($files) - 2);
				$files = array_map(function($ele) { 
					return preg_replace('/\.txt$/', "", $ele);
				}, $files); 
				$return["result"] = $files;
			}   
			 
			$return["code"] = 0;  
			$return["message"] = "$fileRemovedCount files in total are removed.";  
		}

	} catch (Exception $err) {
	}		
	
	echo json_encode($return);
}

?>