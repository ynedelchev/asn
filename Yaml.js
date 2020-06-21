
function parseYaml(content) {
    if (content == null || content.length <= 0) {
        return null;
    }
    var lines = content.split("\n");
    var result = {};            var requiresValueFor = null;  var requiresValueIndex = 0;
    var objectIdentations = {}; var arrayIdentations = {};    var objects = [];
    var oi = 0;                 var isArray = false;
    var indent = 0;             var isArrayElement = false;
    objectIdentations[0] = 0;   arrayIdentations[0] = 0;      objects[0] = result;
    for (var i = 0; i < lines.length; i++) {
        isArrayElement = false;
        var line = lines[i];
        if (line == null) {
            continue;
        }
        line = line.replace(/\s+$/g, '');
        if (line == "---" || line == "...") { continue; }
        var index = line.search(/\S|$/);
        line = index < line.length ? line.substring(index) : "";
        if (line == null || line == "" || line.charAt(0) == "#" || (line.charAt(0) == "/" && line.charAt(1) == "/")) {
            continue;
        }
        if (line.length >= 1 && line.charAt(0) == "-") {
            isArrayElement = true;
            if (!isArray) {
                if (oi == 0 || requiresValueFor == null || objects.lenght <= 0) {
                    result = [];
                    objects[oi] = result;
                } else {
                    objects[oi] = [];
                    objects[requiresValueIndex][requiresValueFor] = objects[oi];
                }
                isArray =  true;
            }
            line = line.substring(1);
        }
        if (requiresValueFor != null && isArrayElement && index != indent) {
            throw new Error("A. Wrong identiation found on line " + (i+1) + " with " + index + " spaces where identation of " + (indent) +" spaces was expected. Line: \"" + line + "\".");
        }
        if (requiresValueFor != null && !isArrayElement && index != indent+2) {
            throw new Error("B. Wrong identiation found on line " + (i+1) + " with " + index + " spaces where identation of " + (indent+2) +" spaces was expected. Line: \"" + line + "\".");
        }
        if (requiresValueFor == null && index > indent) {
            throw new Error("Wrong identation found on line " + (i+1) + " with " + index + " spaces where no more than " + indent + " spaces were expected, near line: \"" + line + "\".")
        }
        if (index < indent) {
            var objectRestoreIndex = isArrayElement ? arrayIdentations[index] : objectIdentations[index];
            if (objectRestoreIndex == null) {
                throw new Error("C. Wrong identation of " + index + " spaces on line " + (i+1) + ". Cannot find previous object on that identation level. Line: \"" + line + "\".");
            }
            oi = objectRestoreIndex;
            if (objects[oi] == null) {
                throw new Error("D. Wrong identation of " + index + " spaces on line " + (i+1) + ". Cannot find previous object on that identation level. Line: \"" + line + "\".");
            }
        }
        indent = index;
        if (requiresValueFor != null) {
            if (isArrayElement) {
              arrayIdentations[indent] = (objects.length)-1;
            } else {
              objectIdentations[indent] = (objects.length)-1;
            }
        }
        requiresValueFor = null; requiresValueIndex = 0;
        line = line.replace(/^\s+|\s+$/g, '');
        var key = null; var value = undefined;
        if (isArrayElement) {
            key = isArray ? objects[oi].length : 0;
            while (isArray) {
                value = line;
                if (value.length >= 2 && value.charAt(0) == "-" && value.charAt(1) == " ") {
                    objects[oi][key] = [];
                    indent = indent + 2;
                    objects.push(objects[oi][key]);
                    oi = objects.length-1;
                    line = line.substring(2).replace(/^\s+|\s+$/g, '');
                } else {
                    isArray = false;
                }
            }
            var colIndex = line.indexOf(":");
            if (line.length > 0 && line.charAt(0) != "\"" && line.charAt(0) != "'" && colIndex >=0) {
                objects[oi][key] = {}
                indent = indent + 2;
                objects.push(objects[oi][key]);
                oi = objects.length-1;
                key = line.substring(0, colIndex);
                value = colIndex>= line.length-1? "" : line.substring(colIndex+1);
            }
        } else {
            var colonIndex = line.indexOf(":");
            if (colonIndex == null || colonIndex < 0) {
                throw new Error("Colon (:) expected on line " + i + " after \"" + line + "\".");
            }
            key = line.substring(0, colonIndex);
            value = colonIndex >= line.length-1? "" : line.substring(colonIndex+1);
        }
        value = value.replace(/^\s+|\s+$/g, '');
        if (value == ""     ) { value = undefined; }
        if (value == "{}"   ) { value = {};   }
        if (value == "[]"   ) { value = [];   }
        if (value == "null" ) { value = null; }
        if (value == "true" ) { value = true; }
        if (value == "false") { value = false;}
        if (value == "\"\"" || value == "''") {
            value = "";
        }
        if (value != null && value.length >= 2 && ( (value.charAt(0) == "\"" && value.charAt(value.length-1) == "\"") || (value.charAt(0) == "'" && value.charAt(value.length-1)=="'"))) {
            value = value.substring(1, value.length-1);
        }
        if (value != null) {
            var parsedInt = parseInt(value);
            value == !isNaN(parsedInt) ? parsedInt : value;
        }
        if (value !== undefined) {
            objects[oi][key] = value;
        } else {
            requiresValueFor = key;
            requiresValueIndex = oi;
            objects[oi][key] = {};
            objects.push(objects[oi][key]);
            oi = objects.length-1;
        }
    }
    return objects[0];
}

function main() {
    var src = "" //---\n" +
    + "employees: \n"
    + "  employee: \n"
    + "  - id: \"1\"\n"
    + "    firstName: \"Tom\"\n"
    + "    lastName: \"Cruise\" \n"
    + "    group: \"A\"\n"
    + "  - id: \"2\"\n"
    + "    firstName: \"Maria\"\n"
    + "    lastName: \"Sharapova\"\n"
    + "    group: \"B\"\n"
    + "  - id: \"007\"\n"
    + "    firstName: \"James\"\n"
    + "    lastName: \"Bond\"\n"
    + "    group: \"A\"\n"
    ;
    var yaml = parseYaml(src)
    console.log(JSON.stringify(yaml, null, 2));
}


main();
