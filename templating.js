// A tiny templating engine without eval() which is limited by chrome security policy.

function compile_template(template, context) {
	if (!context) {	
		return template;
	}
	
	var dict = {};
	expandObjectToDict(dict, context);
	
	var result = template;
	for (key in dict) {
		result = result.replace(new RegExp('{{' + key + '}}', 'g'), dict[key]);
	}
	
	//console.log(dict);
	//console.log(result);
	
	return result;
}

function expandObjectToDict(dict, obj, prefix) {
	if (prefix == undefined)
		prefix = "";
	
	for (key in obj) {
		if (key == "__proto__")
			continue;
		
		var value = obj[key], newKey = key;
		if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
			if (isNaN(parseInt(key))) {
				if (prefix) {
					dict[prefix + '.' + key] = value;
				} else {
					dict[key] = value;
				}
			} else {
				if (prefix) {
					//dict[prefix + '.' + key] = value;
					dict[prefix + '[' + key + ']'] = value;
				} else {
					dict[key] = value;
				}
			}
		} else {
			expandObjectToDict(dict, value, 
				prefix ? prefix + "." + key : key);
		}
	}
}