
const BinaryBuffer = require('./BinaryBuffer');

const DELIMITER = "-----";
const BEGIN = "BEGIN";
const END = "END";
const MAX_BODY_LINE_LENGTH = 64;

function startsWith(str, prefix) {
    if (str == null || prefix == null || str.length < prefix.length) {
        return false;
    }
    for (var i = 0; i < prefix.length; i++) {
        if (str.charAt(i) != prefix.charAt(i)) {
            return false;
        }
    }
    return true;
}

function endsWith(str, suffix) {
    if (str == null || suffix == null || str.length < suffix.length) {
        return false;
    }
    var j = str.length-1;
    for (var i = suffix.length-1; i >= 0;) {
        if (str.charAt(j) != suffix.charAt(i)) {
            return false;
        }
        i--;
        j--
    }
    return true;
}

var Pem = function Pem(type, headers, body) {
    if (typeof(type) != "string") {
        throw new Error("Pem type is not string. Instead it is of type \"" + typeof(type) + "\" : " + type + ".");
    }
    if (typeof(headers) != "object") {
        throw new Error("Pem headers are not a map of key-value pairs. Instead their type is \"" + typeof(headers) + "\".");
    }
    if (typeof(body) == "string") {
        var binaryBody = new BinaryBuffer();
        this.body = binaryBody.fromBase64String(body);
    } else if (typeof(body) != "object" || body.toBase64String == null) {
        throw new Error("Pem body can be specified either as base 64 encoded string or as a BinaryBuffer. However its type is currently \""
            + typeof(body) + "\").");
    }
    this.type = type;
    this.headers = headers;
    this.body = body;

    this.getBody= function () {
        return this.body;
    }
    this.toString= function(flag) {
        var str = DELIMITER + BEGIN + " " + this.type + DELIMITER + "\n";
        var procTypeKey = "Proc-Type";
        var procTypeValue = this.headers[procTypeKey];
        if (procTypeValue != null) {
            str += procTypeKey + ": " + procTypeValue + "\n";
        }
        var keys = [];
        for (var headerKey in this.headers) {
            keys.push(headerKey);
        }
        keys = Array.sort(keys);
        for (var keyIndex in keys) {
            var key = keys[keyIndex];
            if (key == procTypeKey) {
                continue;
            }
            var value = this.headers[key];
            str += key + ": " + value + "\n";
        }

        var body = this.body.toBase64String();
        var offset = 0;
        while (offset < body.length) {
            str += body.slice(offset, offset + MAX_BODY_LINE_LENGTH) + '\n'
            offset += MAX_BODY_LINE_LENGTH;
        }
        str += DELIMITER + END + " " + this.type + DELIMITER + "\n";
        return str;
    }
}

Pem.fromPemString = function (pem) {
    var pems = Pem.arrayOfPems(pem);
    if (pems == null || pems.length == 0) {
        throw new Error("Invalid PEM data. No PEM object found. At least one required. Pem objects should start with a line like \"" + DELIMITER+BEGIN + " <sometype> " + DELIMITER
            +"\" and should with a line like \"" + DELIMITER+END + " <sometype> " + DELIMITER +"\", where <pemtype> is the type of PEM object.");
    }
    if (pems.length > 1) {
        throw new Error("More than one PEM objects found in PEM data. Just one was expected.");
    }
    return pem[0];
}
Pem.arrayOfPems = function (pensString) {
    var pems = []
    var lines = pensString.toString('utf8').split('\n');
    var lineIndex = 0;
    var line = null;
    while (lineIndex < lines.length) {
        while (lineIndex < lines.length) {
            line = lines[lineIndex];
            line = line == null ? "" : line.trim();
            if (line != null && startsWith(line, DELIMITER+BEGIN) && endsWith(line, DELIMITER)) {
                break;
            }
            lineIndex++;
        }
        if (lineIndex >= lines.length) {
            break;
        }
        var beginLine = lineIndex;
        line = lines[lineIndex];
        line = line == null ? "" : line.trim();
        var type = line.slice((DELIMITER+BEGIN).length, line.length - DELIMITER.length);
        if (type === "") {
            throw new Error("Invalid Pem type at line number " + lineIndex +", line: \"" + line + "\". The PEM type should be a non empty string between \"" + DELIMITER+BEGIN
                + "\" and \"" + DELIMITER + "\" markers.");
        }
        var readingHeaders = true;
        var headers = {};
        var body = [];
        var endLine = -1;
        lineIndex++;
        while (lineIndex < lines.length) {
            line = lines[lineIndex];
            line = line == null ? "" : line.trim();
            if (line == "" || line.charAt(0) == "#") {
                lineIndex++;
                continue;
            }
            if (startsWith(line, DELIMITER+END)) {
                if (line.trim() != DELIMITER+END + type + DELIMITER) {
                    throw new Error("Invalid PEM format at line " + lineINdex + ". Invalid closing PEM line \"" + line + "\". Closing the PEM block that begins with \"" + DELIMITER+BEGIN + type + DELIMITER
                        +"\". Expected \"" + DELIMITER+END + type + DELIMITER + "\" instead.");
                }
                endLine = lineIndex;
                lineIndex++;
                break;
            }
            if (readingHeaders) {
                if (line.indexOf(":") != -1) {
                    var keyValue = line.split(":", 2);
                    if (keyValue == null || keyValue.length !== 2 || keyValue[0] == "" || keyValue[1] == "") {
                        throw new Error("Invalid PEM format at line " + lineIndex + ". Invalid header definition line \"" + line
                            + "\". Cannot be split into two nonempty parts (a key and its value), separated by a colon (:).");
                    }
                    var key = keyValue[0].trim();
                    var value = keyValue[1].trim();
                    headers[key] = value;
                } else {
                    readingHeaders = false;
                }
            }
            if (!readingHeaders) {
                body.push(line);
            }
            lineIndex++;
        }
        if (endLine == -1) {
            throw new Error("Invalid PEM format. Unexpected end of file. Begin of PEM object has been received at line " + beginLine + " (" + DELIMITER+BEGIN + type + DELIMITER
                + "), but a corresponding closing line (\"" + DELIMITER+END + type + DELIMITER + "\") was never found till the end of the file.");
        }
        if (body.length == 0) {
            throw new Error("Invalid PEM format. Empty PEM body between start line " + beginLine + " (\"" + DELIMITER+BEGIN + type + DELIMITER + "\") and end line " + endLine
                + " (\"" + DELIMITER+END + type + DELIMITER + "\").");
        }
        type = type.trim();
        var binaryBody = new BinaryBuffer();
        binaryBody.fromBase64String(body.join("\n"));
        var pem = new Pem(type, headers, binaryBody);
        pems.push(pem);
    }
    return pems;
}

