	// 对Date的扩展，将 Date 转化为指定格式的String 
	// 月(M)、日(d)、小时(h)、分(m)、秒(s)、季度(q) 可以用 1-2 个占位符， 
	// 年(y)可以用 1-4 个占位符，毫秒(S)只能用 1 个占位符(是 1-3 位的数字) 
	// 例子： 
	// (new Date()).Format("yyyy-MM-dd hh:mm:ss.S") ==> 2006-07-02 08:09:04.423 
	// (new Date()).Format("yyyy-M-d h:m:s.S")      ==> 2006-7-2 8:9:4.18 
	Date.prototype.Format = function(fmt)  { //author: meizz 
	  var o = { 
		"M+" : this.getMonth()+1,                 //月份 
		"d+" : this.getDate(),                    //日 
		"h+" : this.getHours(),                   //小时 
		"m+" : this.getMinutes(),                 //分 
		"s+" : this.getSeconds(),                 //秒 
		"q+" : Math.floor((this.getMonth()+3)/3), //季度 
		"S"  : this.getMilliseconds()             //毫秒 
	  }; 
	  if(/(y+)/.test(fmt)) 
			fmt=fmt.replace(RegExp.$1, (this.getFullYear()+"").substr(4 - RegExp.$1.length)); 
	  for(var k in o) 
			if(new RegExp("("+ k +")").test(fmt)) 
	  		fmt = fmt.replace(RegExp.$1, (RegExp.$1.length==1) ? (o[k]) : (("00"+ o[k]).substr((""+ o[k]).length))); 
	  return fmt; 
	}
	
	String.prototype.replaceAll = function(AFindText, ARepText) {
		var raRegExp = new RegExp(this.getTextRegexpPattern(AFindText), "ig");
		return this.replace(raRegExp, ARepText);
	}
	
	String.prototype.getTextRegexpPattern = function() {
		return this.replace(/([\(\)\[\]\{\}\^\$\+\-\*\?\.\"\'\|\/\\])/g, "\\$1");
	}
	
	function isArray(it) { return Object.prototype.toString.call(it) === '[object Array]'; }
	function isFunction(it) { return Object.prototype.toString.call(it) === '[object Function]'; }

	function guid() {
			return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
					var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
					return v.toString(16);
			});
	}
	
	Array.prototype.contains = function (element) {
		return this.some(function(ele) { return ele === element; });
	}
	
	Array.prototype.removeElement = function (element) {
	  return this.filter(function(ele) { return ele !== element; });
	}
	
	Array.prototype.addIfNotIn = function (element) {
	  if (this.contains(element))
	    return;
	    
	  this.push(element);
	}
	
	Array.prototype.addAllIfNotIn = function (array) {
	  for (var i = 0; i < array.length; ++ i) {
	    this.addIfNotIn(array[i]);
	  }
	}
	
	// useKeyAsItem: true / false / "pair"
	// filter(key, value) => true/false
	function objectToArray(obj, useKeyAsItem, filter) {
	  var result = [];
	  for (var key in obj) {
	    var item, val = obj[key];
	    if (!filter || filter(key, val) ) {
	      if (useKeyAsItem === true)
	        item = key;
	      else if (useKeyAsItem === false)
	        item = val;
	      else if (useKeyAsItem === "pair")
	        item = {key:key, value:val};
	      else
	        item = key;
	      
	      result.push(item);
	    }
	  }
	  return result;
	}
	
	function compareVersion(v1, v2) {
	  var parts1 = v1.split("."), parts2 = v2.split(".");
	  var len1 = parts1.length, len2 = parts2.length;
	  var len = len1 >= len2 ? len1 : len2;
	  
	  var i = 0, diff = 0;
	  do {
	    var part1 = parts1[i] !== undefined ? parts1[i] : 0;
	    var part2 = parts2[i] !== undefined ? parts2[i] : 0;
	    diff = parseInt(part1) - parseInt(part2);
	    
	    ++ i;
	  } while (i < len && diff === 0);
	  
	  return diff;
	}