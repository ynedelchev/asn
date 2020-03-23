// Credits to : http://luca.ntop.org/Teaching/Appunti/asn1.html
// https://en.wikipedia.org/wiki/X.690


var CLASS_UNIVERSAL   = 0x0;
var CLASS_APPLICATION = 0x01;
var CLASS_CONTEXTUAL  = 0x02;
var CLASS_PRIVATE     = 0x03

var TYPE_END          = 0x00;
var TYPE_INTEGER      = 0x02;
var TYPE_BIT_STRING   = 0x03;
var TYPE_OCTET_STRING = 0x04;
var TYPE_NULL         = 0x05;
var TYPE_OBJECT_ID    = 0x06;
var TYPE_UTF8STRING   = 0x0C;
var TYPE_SEQUENCE     = 0x10;
var TYPE_SET          = 0x11;
var TYPE_PRINTABLE    = 0x13;
var TYPE_T61STRING    = 0x14;
var TYPE_IA5STRING    = 0x16;
var TYPE_UTC_TIME     = 0x17;
var TYPE_CONTINUE     = 0x1F;


function classToString(asnClass) {
    switch (asnClass) {
        case CLASS_UNIVERSAL:   return "Universal";
        case CLASS_APPLICATION: return "Application Specific";
        case CLASS_CONTEXTUAL:  return "Context Specific";
        case CLASS_PRIVATE:     return "Privte";
        default: return "Unknown";
    }
}
function typeToString(type) {
    switch (type) {
        case TYPE_INTEGER:      return "Integer";
        case TYPE_BIT_STRING:   return "Bit String";
        case TYPE_OCTET_STRING: return "Octet String";
        case TYPE_NULL:         return "NULL";
        case TYPE_OBJECT_ID:    return "Object Id";
        case TYPE_UTF8STRING:   return "UTF-8 String";
        case TYPE_SEQUENCE:     return "Sequence";
        case TYPE_SET:          return "Set";
        case TYPE_PRINTABLE:    return "Printable String";
        case TYPE_T61STRING:    return "T61 String";
        case TYPE_IA5STRING:    return "International ASCII String";
        case TYPE_UTC_TIME:     return "UTC Time";
        default: return "Unknown or unsupported type hex: " + type.toString(16) + "."
    }
}

function getIntegerSizeInBytes(value, bitsInByte, name) {
    if (value < Number.MAX_SAFE_INTEGER) {
        var compare = 0x01 << bitsInByte;
        var bytes = 1;
        while (value >= compare && compare > 0) {  // add condition for `compare >= 0` cause there may be an overflow at some point.
            bytes++;
            compare = compare << bitsInByte;
        }
        return bytes;
    }
    throw new Error("This implementation does not support " + name + " bigger than " + Number.MAX_SAFE_INTEGER
        + " such as this one which is " + value);
}

function getSignedIntSizeInBytes(integer) {
    var value = integer < 0 ? integer >>> 0 : integer;
    var bytesCount = getIntegerSizeInBytes(value, 8, "integer");
    var maskMostSignificantBit = 0x80 << ((bytesCount - 1 )*8);
    if (integer > 0 && (value & maskMostSignificantBit) > 0) {
        bytesCount ++;
    }
    if (integer < 0) {
        var i = bytesCount-1;
        while (i >= 0 && ((value >> (i * 8)) & 0x00FF) == 0xFF) {
            bytesCount--;
            i--;
        }
        maskMostSignificantBit = 0x80 << ((bytesCount - 1 )*8);
        if ((value & maskMostSignificantBit) == 0) {
            bytesCount ++;
        }
    }
    return bytesCount;
}

function getSizeInBytes(value, maxValueForOneByte, bitsInByte, name) {
    if (value < maxValueForOneByte) {
        return 1;
    }
    return getIntegerSizeInBytes(value, bitsInByte, name) + 1;
}
function getTypeSizeInBytes(type) {
    return getSizeInBytes(type, 0x1F, 7, "ASN.1 types");
}

function getLengthSizeInBytes(len) {
    return getSizeInBytes(len, 0x80, 8, "ASN.1 type lengths");
}

function getDerEncodedType(asnClass, constructed, type) {
    var typeBytes = getTypeSizeInBytes(type);
    var firstByte = asnClass << 6 | (constructed ? 0x20 : 0x00);
    if (typeBytes == 1) {
        firstByte = firstByte | (type & 0x1F);
        return [ firstByte ]
    }
    var bytes = [ (firstByte | 0x1F) ];
    var index = 1;
    var i = typeBytes - 2;
    while (i > 0) {
        butes[index++] = (( type >> (i*7) ) & 0x7F) | 0x80;
        i--;
    }
    bytes[index++] = (type & 0x7F);
    if (index != typeBytes) {
        throw new Error("Wrong calculation for bytes for type " + type + ". Calculated that we would need " + typeBytes
            + "bytes, but we actually need " + index + " bytes.");
    }
    return bytes;
}

function getDerEncodedLength(len) {
    if (len < 0x80) {
        return [ (len & 0x7F) ];
    }
    var lenBytes = getLengthSizeInBytes(len);
    if ((lenBytes-1) > 0x7F) {
        throw new Error("ASN.1 Length " + len + " need to be encoded with " + lenBytes + " bytes, but no more than " + 0x7F
            + " bytes for the length is supportd by ASN.1.");
    }
    var bytes = [ (lenBytes &0x7) ];
    var index = 1;
    var i = lenBytes - 2;
    while (i >= 0) {
        butes[index++] = ( len >> (i*8) ) & 0x00FF;
        i--;
    }
    if (index != lenBytes) {
        throw new Error("Wrong calculation for bytes for lenght " + len +". Calculated that we would need " + lenBytes
            + " bytes, but we actually need " + index + " bytes.");
    }
    return bytes;
}
function concatByteArray(arr, extra) {
    var index = arr.length;
    for (var i = 0; i < extra.length; i++) {
        arr[index++] = extra[i];
    }
    return arr;
}
function subArray(original, start, end) {
    var subArr = [];
    var index = 0;
    for (var i = start; i < end; i++) {
        subArr[index++] = original[i];
    }
    return subArr;
}
function arrayToASCIIString(arr) {
    if (arr == null) {
        return "";
    }
    var str = "";
    for (var i = 0; i < arr.length; i++) {
        str += String.fromCharCode(arr[i])
    }
    return str;
}
function getDerEncodedInteger(integer, calculated) {
    var value = integer < 0 ? integer >>> 0 : integer;
    var bytesCount = calculated != null ? calculated : getSignedIntSizeInBytes(integer);
    var bytes = [ ];
    var index = 0;
    var i = bytesCount - 1;
    while (i >= 0) {
        bytes[index++] = (( value >> (i*8) ) & 0x00FF);
        i--;
    }
    if (index != bytesCount) {
        throw new Error("Wrong calculation for bytes for integer " + value +". Calculated that we would need " + bytesCount
            + " bytes, but we actually need " + index + " bytes.");
    }
    return bytes;
}
function normalizeBitString(byteArr, start, end) {
    if (byteArr == null || byteArr.length < 1) {
        return [];
    }
    start = start == null ? 0 : start;
    end   = end   == null ? byteArr.length : end;
    if (start >= end) {
        return [];
    }
    var i = start;
    var index = 0;
    var unusedBits = byteArr[i++];
    var unusedBytes = (unusedBits - (unusedBits % 8) ) / 8;
    unusedBits = unusedBits % 8;

    var bytes = [unusedBits];
    for (index = 1; i < (end-unusedBytes); i++) {
        bytes[index] = byteArr[i];
        index++;
    }
    var mask = 0xFF;
    for (i = 0; i < unusedBits; i++) {
        mask = ( mask << 1 ) & 0x00FE;
    }
    if (bytes.length > 1) {
        bytes[bytes.length-1] = bytes[bytes.length-1] & mask;
    }
    return bytes;
}
function getDerEncodedBitString(byteArr) {
    return byteArr
}
function toUtf8(str) {
    var value = [];
    var destIndex = 0;
    for (var index = 0; index < str.length; index++) {
        var code = str.charCodeAt(index);
        if (code <= 0x7F) {
            value[destIndex++] = code;
        } else if (code <= 0x7FF) {
            value[destIndex++] = ((code >> 6 ) & 0x1F) | 0xC0;
            value[destIndex++] = ((code >> 0 ) & 0x3F) | 0x80;
        } else if (code <= 0xFFFF) {
            value[destIndex++] = ((code >> 12) & 0x0F) | 0xE0;
            value[destIndex++] = ((code >> 6 ) & 0x3F) | 0x80;
            value[destIndex++] = ((code >> 0 ) & 0x3F) | 0x80;
        } else if (code <= 0x1FFFFF) {
            value[destIndex++] = ((code >> 18) & 0x07) | 0xF0;
            value[destIndex++] = ((code >> 12) & 0x3F) | 0x80;
            value[destIndex++] = ((code >> 6 ) & 0x3F) | 0x80;
            value[destIndex++] = ((code >> 0 ) & 0x3F) | 0x80;
        } else if (code <= 0x03FFFFFF) {
            value[destIndex++] = ((code >> 24) & 0x03) | 0xF0;
            value[destIndex++] = ((code >> 18) & 0x3F) | 0x80;
            value[destIndex++] = ((code >> 12) & 0x3F) | 0x80;
            value[destIndex++] = ((code >> 6 ) & 0x3F) | 0x80;
            value[destIndex++] = ((code >> 0 ) & 0x3F) | 0x80;
        } else if (code <= 0x7FFFFFFF) {
            value[destIndex++] = ((code >> 30) & 0x01) | 0xFC;
            value[destIndex++] = ((code >> 24) & 0x3F) | 0x80;
            value[destIndex++] = ((code >> 18) & 0x3F) | 0x80;
            value[destIndex++] = ((code >> 12) & 0x3F) | 0x80;
            value[destIndex++] = ((code >> 6 ) & 0x3F) | 0x80;
            value[destIndex++] = ((code >> 0 ) & 0x3F) | 0x80;
        } else {
            throw new Error("Unsupported Unicode character \"" + str.charAt(index) + "\" with code " + code + " (binary: " + toBinary(code) + ") at index " + index
                + ". Cannot represent it as UTF-8 byte sequence.");
        }
    }
    return value;
}
function fromUtf8(value) {
    var str = "";
    var i = 0;
    var second = null;
    var third  = null;
    var fourth = null;
    var fifth  = null;
    var sixth  = null;
    while(i < value.length) {
        var byteValue = value[i];
        var startByteIndex = i;
        var code = 0;
        if ((byteValue & 0x80) == 0) {
            code = byteValue & 0x00FF;

        } else if ((byteValue & 0xE0) == 0xC0) {
            second = getNextByte(value, startByteIndex, "110", 1, ++i);
            code = ((byteValue & 0x1F) << 6 ) | (second & 0x3F);

        } else if ((byteValue & 0xF0) == 0xE0) {
            second = getNextByte(value, startByteIndex, "1110",  2, ++i);
            third  = getNextByte(value, startByteIndex, "1110",  2, ++i);
            code = ((byteValue & 0x0F) <<12) | ((second &0x3F) << 6) | ((third & 0x3F)<<0);

        } else if ((byteValue & 0xF8) == 0xF0) {
            second = getNextByte(value, startByteIndex, "11110",  3, ++i);
            third  = getNextByte(value, startByteIndex, "11110",  3, ++i);
            fourth = getNextByte(value, startByteIndex, "11110",  3, ++i);
            code = ((byteValue & 0x07) <<18) | ((second &0x3F) << 12) | ((third & 0x3F)<<6) | ((fourth&0x3F)<<0);

        } else if ((byteValue & 0xFC) == 0xF8) {
            second = getNextByte(value, startByteIndex, "111110",  4, ++i);
            third  = getNextByte(value, startByteIndex, "111110",  4, ++i);
            fourth = getNextByte(value, startByteIndex, "111110",  4, ++i);
            fifth  = getNextByte(value, startByteIndex, "111110",  4, ++i);
            code = ((byteValue & 0x03) <<24) | ((second &0x3F) << 18) | ((third & 0x3F)<<12) | ((fourth&0x3F)<<6) | ((fifth&0x3F)<<0);

        } else if ((byteValue & 0xFE) == 0xFC) {
            second = getNextByte(value, startByteIndex, "1111110",  5, ++i);
            third  = getNextByte(value, startByteIndex, "1111110",  5, ++i);
            fourth = getNextByte(value, startByteIndex, "1111110",  5, ++i);
            fifth  = getNextByte(value, startByteIndex, "1111110",  5, ++i);
            sixth  = getNextByte(value, startByteIndex, "1111110",  5, ++i);
            code = ((byteValue & 0x01) <<30) | ((second &0x3F) << 24) | ((third & 0x3F)<<18) | ((fourth&0x3F)<<12) | ((fifth&0x3F)<<6) | ((sixth&0x3F)<<0);

        } else {
            throw new Error("Invalid UTF-8 sequence. Byte " + startByteIndex + " with value " + byteValue + " (" + String.fromCharCode(byteValue)
                + ") is an invalid start of byte sequence. In binary it should start with either 0 or 110 or 1110 or 11110 or 111110 or 1111110. However its binarty representation is "
                + toBinary(byteValue) + ".");
        }
        var chr = String.fromCharCode(code);
        str += chr;
        i++;
    }
    return str;
}
function getNextBase64Character(str, index, equalSignReceived, alpha) {
    var chr = null;
    var code = 0;
    var padding = equalSignReceived;
    while (index < str.length) {
        chr = str.charAt(index);
        if (chr == " " || chr == "\r" || chr == "\n" || chr == "\t") {
            index++;
            continue;
        }
        if (chr == "=") {
            padding = true;
        } else {
            if (equalSignReceived) {
                throw new Error("Invalid Base64 Endcoding character \"" + chr + "\" with code " + str.charCodeAt(index) + " on position " + index
                    + " received afer an equal sign (=) padding character has already been received. The equal sign padding character is the only possible padding character at the end.");
            }
            code = alpha.indexOf(chr);
            if (code == -1) {
                throw new Error("Invalid Base64 Encoding character \"" + chr + "\" with code " + str.charCodeAt(index) + " on position " + index + ".");
            }
        }
        break;
    }
    return { character: chr, code: code, padding: padding, nextIndex: ++index};
}
function fromBase64(str) {
    var alpha = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    var value = [];
    var index = 0;
    var destIndex  = 0;
    var padding = false;
    while (true) {

        var first   = getNextBase64Character(str, index, padding, alpha);
        var second  = getNextBase64Character(str, first .nextIndex, first .padding, alpha);
        var third   = getNextBase64Character(str, second.nextIndex, second.padding, alpha);
        var fourth  = getNextBase64Character(str, third .nextIndex, third .padding, alpha);

        index = fourth.nextIndex;
        padding = fourth.padding;

        // ffffffss sssstttt ttffffff
        var base64_first  = first.code  == null ? 0 : first.code;
        var base64_second = second.code == null ? 0 : second.code;
        var base64_third  = third.code  == null ? 0 : third.code;
        var base64_fourth = fourth.code == null ? 0 : fourth.code;

        var a = (( base64_first  << 2 ) & 0xFC ) | ((base64_second >> 4) & 0x03);
        var b = (( base64_second << 4 ) & 0xF0 ) | ((base64_third  >> 2) & 0x0F);
        var c = (( base64_third  << 6 ) & 0xC0 ) | ((base64_fourth >> 0) & 0x3F);

        value [destIndex++] = a;
        if (!third.padding) {
            value [destIndex++] = b;
        } else {
            break;
        }
        if (!fourth.padding) {
            value [destIndex++] = c;
        } else {
            break;
        }
        if (index >= str.length) {
            break;
        }
    }
    return value;
}
function normalizeOctetString(octets, start, end) {
    var bytes = [];
    var i;
    var index = 0;
    if (octets == null) {
        return bytes;
    }
    start = start == null ? 0 : start;
    end   = end   == null ? octets.length : end;
    if (typeof value == "string") {
        for (i = start; i < end; i++) {
            var code = octets.charCodeAt(i);
            if (code > 0x0FF) {
                throw new Error("Element \"" + octets.charAt(i) + "\" with code " + code + " at index " + i
                    + " in octet string has invalid value. It cannot represent an octet byte (integer between 0 and 255).");
            }
            bytes[index++] = code;
        }
    } else if (typeof octets == "object" && octets.length != null) {
        for (i = start; i < end; i++) {
            var element = octets[i];
            if (element == null) {
                throw new Error("Missing element at index " + i + " in octet string.");
            }
            if (typeof element != "number") {
                throw new Error("Element (\"" + element + "\") at index " + i + " in octet string is not a number. It is of type \"" + (typeof element) + "\".");
            }
            if (element < 0 || element > 0x0FF) {
                throw new Error("Element (\"" + element + "\") at index " + i + " in octet string cannot represent octet byte (an integer between 0 and 255). It is out of range.");
            }
            if (element - Math.floor(element) != 0) {
                throw new Error("Element (\"" + element + "\") at index " + i + " in octet string is not an integer. Its partial part is: " + Math.floor(element) + ".");
            }
            bytes[index++] = element;
        }
    } else {
        throw new Error("Unsupported type for octet string: " + (typeof octets) + ". It should be either a string or an array of bytes (integers between 0 and 255). Current value is:"  + octets + ".");
    }
    return bytes;
}
function getDerEncodedOctetString(value) {
    return value;
}
function getDerEncodedNull() {
    return [];
}
function normalizeObjectId(arr) {
    if (typeof arr != "object" || arr.length == null) {
        throw new Error("Invalid type for object id : \"" + (typeof arr) + "\". It should be an array of integers.");
    }
    if (arr.length < 2) {
        throw new Error("Incomplete list of numbers in object id. At least two elements required.");
    }
    if (typeof arr[0] != "number" || arr[0] < 0 || arr[0] > 2 || ( arr[0] - Math.floor(arr[0]) ) != 0) {
        throw new Error("First element in object identifier should be either 0 or 1 or 2, but it is: \"" + arr[0] + "\" with type \"" + (typeof arr[0]) + "\".");
    }
    if (typeof arr[1] != "number" || arr[1] <0 || arr[1] > 39 || ( arr[1] - Math.floor(arr[1]) ) != 0) {
        throw new Error("Second element in object identifier should be an integer between 0 and 39 inclusive, it it is \"" + arr[1] + "\" with type \"" + (typeof arr[1]) + "\".");
    }
    var bytes = [ ((arr[0] * 40) + arr[1]) ];
    var index = 1;
    for (var i = 2; i < arr.length; i++) {
        var typeBytes = getSizeInBytes(arr[i], 0xFF, 7, "Object Identifier element");
        var j = typeBytes - 2;
        while (j > 0) {
            bytes[index++] = (( arr[i] >> (j*7) ) & 0x7F) | 0x80;
            j--;
        }
        bytes[index++] = (arr[i] & 0x7F);
    }
    return bytes;
}
function getObjectIdAsArray(value) {
    if (value == null || value.length <= 0) {
        return [];
    }
    var result = [];
    var index = 0;
    var first = value[0];
    var second = first % 40;
    first = (first - second)/40;
    result[index++] = first;
    result[index++] = second;
    var element = 0;
    for (var i = 1; i < value.length; i++) {
        element = element << 7;
        element = element | (value[i] & 0x7F);
        if ((value[i] & 0x80) == 0x00) {
            result[index++] = element;
            element = 0;
        }
    }
    if ((value[value.length-1] & 0x80) == 0x80) {
        result[index] = element;
    }
    return result;
}
function getDerEncodedObjectId(value) {
    return value;
}
function getDerEncodedUtf8String(value) {
    return toUtf8(value);
}
function normalizePrintable(value) {
    if (value == null) {
        return "";
    }
    var allowed = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz 0123456789()+',-./:=?";
    for (var i = 0; i < value.length; i++) {
        var chr = value.charAt(i);
        if (allowed.indexOf(chr) == -1) {
            throw new Error("Character \"" + chr + "\" with char code " + value.charCodeAt(i) + " on position " + i + " in printable string \"" + value
                + "\" is not allowed. Allowed characters are: " + allowed.split("").map(function (ch) { return "\"" + ch + "\""}).join(", ") + ". ");
        }
    }
    return value;
}
function isPrintable(value) {
    try {
        normalizePrintable(value);
    } catch (e) {
        return false;
    }
    return true;
}
function getDerEncodedPrintable(value) {
    var bytes = [];
    for (var i = 0; i < value.length; i++) {
        var chr = value.charCodeAt(i);
        bytes[i] = chr & 0x0FF;
    }
    return bytes;
}
function normalizeT61String(value) {
    if (value == null) {
        return "";
    }
    var translation = { 0x2126: 0xE0, 0x0126: 0xE4, 0x132: 0xE6, 0x13F: 0xE7, 0x141: 0xE8, 0x0152: 0x0EA, 0x166: 0xED, 0x14A: 0xEE, 0x149: 0xEF,
                        0x138:  0xF0, 0x111:  0xF2, 0x127: 0xF4, 0x131: 0xF5, 0x133: 0xF6, 0x140: 0xE7,   0x142: 0xF8, 0x153: 0xFA, 0x167: 0xFD, 0x14B: 0xFE};
    for (var i = 0; i < value.length; i++) {
        var code = value.charCodeAt(i);
        if (code > 0x0FF) {
            var translated = translation[code];
            if (translated == null) {
                throw new Error("Character \"" + value.charAt(i) + "\" with char code " + code + " on position " + i + " in T61 string \"" + value
                    + "\" is not allowed. Allowing only characters with codes between 0 and 255 inclusive.");
            }
            value[i] = translated & 0x0FF;
        }
    }
    return value;
}
function isT61String(value) {
    try {
        normalizeT61String(value);
    } catch (e) {
        return false;
    }
    return true;
}
function getDerEncodedT61String(value) {
    var bytes = [];
    for (var i = 0; i < value.length; i++) {
        var chr = value.charCodeAt(i);
        bytes[i] = chr & 0x0FF;
    }
    return bytes;
}
function normalizeIA5String(value) {
    if (value == null) {
        return "";
    }
    for (var i = 0; i < value.length; i++) {
        var code = value.charCodeAt(i);
        if (code > 0x07F) {
            throw new Error("Character \"" + value.charAt(i) + "\" with char code " + code + " on position " + i + " in Internation Alphabet 5 (IA5) string \"" + value
                + "\" is not allowed. Allowing only characters with codes between 0 and 127 inclusive.");
        }
    }
    return value;
}
function isIA5String(value) {
    try {
        normalizeIA5String(value);
    } catch (e) {
        return false;
    }
    return true;
}
function getDerEncodedIA5String(value) {
    var bytes = [];
    for (var i = 0; i < value.length; i++) {
        var chr = value.charCodeAt(i);
        bytes[i] = chr & 0x0FF;
    }
    return bytes;
}
function normalizeUtcTime(value) {
    var formats = ["YYMMDDhhmmZ", "YYMMDDhhmm+hhmm", "YYMMDDhhmm-hhmm", "YYMMDDhhmmssZ", "YYMMDDhhmmss+hhmm", "YYMMDDhhmmss-hhmm"];
    function getDigit(d, position, utc) {
        if (d == '0') return 0; else if (d == '1') return 1; else if (d == '2') return 2; else if (d == '3') return 3; else if (d == '4') return 4; else
        if (d == '5') return 5; else if (d == '6') return 6; else if (d == '7') return 7; else if (d == '8') return 8; else if (d == '9') return 9;
        throw new Error("Character \"" + d + "\" with code " + d.charCodeAt(0) + " at position " + position +" in UTC Time string \"" + utc
            + "\" is not a digit. A digit was expected. Valid digits are: 0, 1, 2, 3, 4, 5, 6, 7, 8 and 9. Valid UTC Time formats are: "
            + formats.map(function (format) {return "\"" + format + "\"";}).join(", ") + ".");
    }
    if (value == null || typeof value != "string" || value.length < 11 ) {
        throw new Error("Invalid UTC Date and Time format: \"" + value + "\" (" + (typeof value)
            + "). At least 11 characters are required. Valid fomats are: "
            + formats.map(function (format) {return "\"" + format + "\"";}).join(", "));
    }
    var yearHigh = getDigit(value.charAt(0));   var monthHigh = getDigit(value.charAt(2));  var dayHigh = getDigit(value.charAt(4));
    var yearLow  = getDigit(value.charAt(1));   var monthLow  = getDigit(value.charAt(3));  var dayLow  = getDigit(value.charAt(5));

    var hourHigh = getDigit(value.charAt(6));   var minHigh   = getDigit(value.charAt(8));
    var hourLow  = getDigit(value.charAt(7));   var minLow    = getDigit(value.charAt(9));

    var year  = 2000 + (yearHigh * 10) + yearLow;
    var month = (monthHigh * 10) + monthLow;  if (month < 1 || month > 12) throw new Error("Invalid month number \"" + month + "\" at index 3 in UTC Time \"" + value + "\".");
    var day   = (dayHigh   * 10) + dayLow;    if (day   < 1 || day   > 31) throw new Error("Invalid day number \"" + day + "\" at index 5 in UTC Time \"" + value + "\".");
    var hour  = (hourHigh  * 10) + hourLow;   if (hour  < 0 || hour  > 24) throw new Error("Invalid hour number \"" + hour + "\" at index 7 in UTC Time \"" + value + "\".");
    var min   = (minHigh   * 10) + minLow;    if (min   < 0 || day   > 59) throw new Error("Invalid minutes number \"" + min + "\" at index 9 in UTC Time \"" + value + "\".");
    var sec   = 0;
    var date = new Date();
    var chr = value.charAt(10)
    var index = 10;
    if ( chr !== 'Z' && chr != '-' && chr != '+') {
        if (value.length < 13) {
            throw new Error("Since character (\"" + chr + "\"; hex code: " + value.charCodeAt(10).toString(16) + ") with index 11 in \"" + value
                + "\" is not \"Z\", so we expect the seconds to be defined on the next two positions and then either \"Z\", \"+\" or \"-\". Valid formats are: "
                + formats.map(function (format) {return "\"" + format + "\"";}).join(", ") + ".");
        }
        var secHigh = getDigit(value.charAt(10));
        var secLow  = getDigit(value.charAt(11));
        sec = (secHigh * 10) + secLow;
        index = 12;
    }
    date.setUTCFullYear(year);
    date.setUTCMonth(month-1);
    date.setUTCDate(day);
    date.setUTCHours(hour);
    date.setUTCMinutes(min);
    date.setUTCSeconds(sec);
    chr = value.charAt(index);
    if (chr == "Z") {
        // We are Good.
    } else if (chr == '+' || chr == '-') {
        if (value.length < index + 4) {
            throw new Error("Since character (\"" + chr + "\"; hex code: " + value.charCodeAt(index).toString(16) + ") with index " + (index+1) + " in \"" + value
                + "\" is not \"Z\", so we expect the local time hours and minutes to be defined in the next 4 positions, however the value is too short. Valid formats are: "
                + formats.map(function (format) {return "\"" + format + "\"";}).join(", ") + ".");
        }
        var localHourHigh = getDigit(value.charAt(index + 1));   var localMinutesHigh = getDigit(value.charAt(index+3));
        var localHourLow  = getDigit(value.charAt(index + 2));   var localMinutesLow  = getDigit(value.charAt(index+4));
        var localHour = (localHourHigh    * 10) + localHourLow;
        var localMin  = (localMinutesHigh * 10) + localMinutesLow;
        if (localHour < 0 || localHour > 24) throw new Error("Invalid value (\"" + localHour + "\") for hour in the local time zone in UTC Time \"" + value + "\".");
        if (localMin  < 0 || localMin  > 59) throw new Error("Invalid value (\"" + localMin  + "\") for minutes in the local time zone in UTC Time \"" + value + "\".");
        //date.setTimezoneOffset((localHour * 60) + localMin); // Ignoring for now.
    } else {
        throw new Error("Invalid character \"" + chr + "\" (hex: " + chr.toString(16) + ") on position " + (index+1) + " in UTC Time \"" + value
            + "\". Expecting either \"Z\" or \"+\" or \"-\". Valid UTC Time formats are: " + formats.map(function (format) {return "\"" + format + "\"";}).join(", ") + ".");
    }
    return date;
}
function getDerEncodedUtcTime(value) {
    var bytes = [];
    for (var i = 0; i < value.length; i++) {
        var chr = value.charCodeAt(i);
        bytes[i] = chr & 0x0FF;
    }
    return bytes;
}
function normalizeAsn1Object(obj) {
    if (obj == null) {
        return (new Asn()).setNull();
    } else if ((typeof obj) == "object" && obj.className == "ASN.1") {
        return obj;
    }
    var asn = new Asn();
    if ((typeof obj) == "number") {
        if ((obj - Math.floor(obj)) == 0) {
            return (new Asn()).setIntegerValue(obj);
        } else {
            throw new Error("Floating point real numbers are not supported by current implementation. Current implementation cannot use \"" + obj + "\" with type \""
                + (typeof arr[i]) + "\" as ASN.1 value - not implemented.");
        }
    } else if (typeof obj == "string") {
        if (isPrintable(obj)) {
            asn.setPrintableString(obj);
        } else if (isT61String(obj)) {
            asn.setT61String(obj);
        } else if (isIA5String(obj)) {
            asn.setIA5String(obj);
        } else {
            asn.setOctetStringUtf8(obj);  // Encode with UTF encoding and get the resutling byte array, then use it as octet string.
        }
    } else if (typeof obj == "boolean") {
        throw new Error("Boolean values not supported by current ASN.1 implementation. Not implemented. Canont use value \"" + obj + "\" of type \""
            + (typeof obj)+ "\" as ASN.1 value.");
    } else if ((typeof obj) == "object" && obj.getUTCFullYear != null && obj.getUTCMonth != null && obj.getUTCDate != null
        && obj.getUTCHours != null && obj.getUTCMinutes != null && obj.getUTCSeconds != null) {
        asn.setUtcTime(obj);
    } else {
        throw new Error("Value \"" + obj + "\" (" + JSON.stringify(obj) + ") of type \"" + (typeof obj) + "\" cannot be used as ASN.1 value.");
    }
    return asn;
}
function normalizeAsn1Sequence(arr) {
    if (arr == null) {
        return [];
    }
    for (var i =0; i < arr.length; i++) {
        arr[i] = normalizeAsn1Object(arr[i]);
    }
    return arr;
}
function getDerEncodedSequence(value) {
    var bytes = [];
    for (var i =0; i < value.length; i++) {
        var bytesSubelement = getDerEncodedValue(value[i].getType(), value[i].getValue());
        bytes = concatByteArray(bytes, bytesSubelement);
    }
    return bytes;
}
function normalizeAsnSet(set) {
    if (set == null) {
        return [];
    }
    var types = {};
    var i;
    for (i =0; i < set.length; i++) {
        var asn = normalizeAsn1Object(set[i]);
        var type = asn.getType();
        if (types[type] != null) {
            throw new Error("The element with index " + i + " and type \"" + typeToString(type) + "\" (hex: " + type.toString(16) + ") and value \""
                + this.value + "\" (" + (typeof this.value) + ") cannot be part of the ASN.1 set as there is already an element with same type ("
                + type + "). That is an element with value \"" + types[type].getValue() + "\"." );
        }
        types[type] = asn;
    }
    var keys = [];
    for (var key in types) {
        keys.push(key);
    }
    keys.sort(function (a, b) {return a-b;});
    var arr = [];
    var index = 0;
    for (i = 0; i < keys.length; i++) {
        key = keys[i];
        arr[index] = types[key];
        index++;
    }
    return arr;
}
function getDerEncodedSet(value) {
    var set = normalizeAsnSet(value);
    var bytes = [];
    for (var i =0; i < set.length; i++) {
        var bytesSubelement = getDerEncodedValue(set[i].getType(), set[i].getValue());
        bytes = concatByteArray(bytes, bytesSubelement);
    }
    return bytes;
}

function getDerEncodedValue(type, value) {
    switch (type) {
        case TYPE_INTEGER:      return getDerEncodedInteger(value);     // value should be an integer number
        case TYPE_BIT_STRING:   return getDerEncodedBitString(value);   // value should be an array of bytes (integers 0-255) first byte shows number of unused bits.
        case TYPE_OCTET_STRING: return getDerEncodedOctetString(value); // value should be an array of bytes.
        case TYPE_NULL:         return getDerEncodedNull();             // value ignored.
        case TYPE_OBJECT_ID:    return getDerEncodedObjectId(value);    // value should be a normalized array of bytes.
        case TYPE_UTF8STRING:   return getDerEncodedUtf8String(value);  // Value sould be a string.
        case TYPE_SEQUENCE:     return getDerEncodedSequence(value);    // value is array of ASN objects.
        case TYPE_SET:          return getDerEncodedSet(value);
        case TYPE_PRINTABLE:    return getDerEncodedPrintable(value);   // value should be a string with printable characters.
        case TYPE_T61STRING:    return getDerEncodedT61String(value);   // value should be a string with characters from the first code page only (0 - 255).
        case TYPE_IA5STRING:    return getDerEncodedIA5String(value);   // value should be a string with characters form the International Alphabet 5 standard (0 - 127)
        case TYPE_UTC_TIME:     return getDerEncodedUtcTime(value);     // value should be a string in the format: "YYMMDDhhmmssZ"
        default: throw new Error("Unsupported type \"" + type + "\" (hex: " + type.toString(16) + ").");
    }
}
function getValueFromBerEncoding(type, constructed, arr, start, end) {
// console.log("getValueFromBerEncoding: (" + type + ", " + constructed + ", arr, " + start + ", " + end + ")")
    var r = null;
    switch (type) {
        case TYPE_INTEGER:      r= readBerInteger(constructed, arr, start, end);        break;
        case TYPE_BIT_STRING:   r= readBerBitString(constructed, arr, start, end);      break;
        case TYPE_OCTET_STRING: r= readBerOctetString(constructed, arr, start, end);    break;
        case TYPE_NULL:         r= readBerNull();                                       break;
        case TYPE_OBJECT_ID:    r= readBerObjectId(constructed, arr, start, end);       break;
        case TYPE_UTF8STRING:   r= readBerUtf8String(constructed, arr, start, end);     break;
        case TYPE_SEQUENCE:     r= readBerSequence(constructed, arr, start, end);       break;
        case TYPE_SET:          r= readBerSet(constructed, arr, start, end);            break;
        case TYPE_PRINTABLE:    r= readBerPrintable(constructed, arr, start, end);      break;
        case TYPE_T61STRING:    r= readBerT61String(constructed, arr, start, end);      break;
        case TYPE_IA5STRING:    r= readBerIA5String(constructed, arr, start, end);      break;
        case TYPE_UTC_TIME:     r= readBerUtcTime(constructed, arr, start, end);        break;
        default:                r= readBerGeneric(constructed, arr, start, end);        //break;
    }
// console.log("getValueFromBerEncoding: Result: " + JSON.stringify(r, null, 2));
    return r;
}
function readBerInteger(constructed, arr, start, end) {
    if (constructed) {
        throw new Error("Cnostructed format for integers, not supported by this implemenation.");
    }
    var index = start;
    var value = 0x00;
    var negative = false;
    if (index < end && (arr[index] & 0x80) == 0x80) {
        value = -1;
        negative = true;
    }
    for (;index < end; index++) {
        var previous = value;
        value  = value << 8;
        value  = value | ( arr[index] & 0x0FF);
        if ( (negative && value > prevous) || (!negative && value < previous)) {
            // Overflow. Cannot be represented as integer. Leave it as byte array.
            return {value: subArray(arr, start, end), length: end - start, constructed: false};
        }
    }
    var length = end - start;
    return { value: value, length: length, constructed: false};
}
function readBerBitString(constructed, arr, start, end) {
    if (constructed) {
        // throw new Error("Cnostructed format for bit strings, not supported by this implemenation.");
    }
    var bytes = normalizeBitString(arr, start, end);
    return { value: bytes, length: bytes.length, constructed: false};
}
function readBerBinaryStringsGeneral(constructed, arr, start, end, allowedStringTypes, normalizeFunction) {
    var bytes = [];
    var name = allowedStringTypes[allowedStringTypes.length-1];
    if (constructed) {
        var index = start;
        while (index < end) {
            var tag = readType(arr, index, end);
            var len = readLength(tag.asnClass, tag.type, arr, tag.start, tag.end);
            if (tag.constructed) {
                throw new Error("Subtype with constructed encoding not allowed as subelement for constructed encoding of " + name + " String. Subelement is of type \""
                    + typeToString(tag.type) + " (hex: " + tag.type.toString(16) + ") and length: " + len.length + " bytes. Its class is: "
                    + classToString(tag.asnClass) + ".");
            }
            if (allowedStringTypes.indexOf(tag.type) != -1) {
                concatByteArray(bytes, subArray(arr, len.start, len.start+len.length));
            } else {
                throw new Error("Subtupe \"" + typeToString(tag.type) + "\" (hex: " + tag.type.toString(16)
                    + ") not supported in constructed encoding for " + name + " String.");
            };
            index = len.start + len.length;
        }
    } else {
        bytes = subArray(arr, start, end);
    }
    var value = normalizeFunction(bytes);
// console.log("readBerBinaryStringsGeneral: " + JSON.stringify({value: value, length: value.length, constructed: false}));
    return {value: value, length: value.length, constructed: false};
}
function readBerOctetString(constructed, arr, start, end) {
    return readBerBinaryStringsGeneral(constructed, arr, start, end, [TYPE_UTC_TIME, TYPE_PRINTABLE, TYPE_T61STRING, TYPE_IA5STRING, TYPE_OCTET_STRING], normalizeOctetString);
}
function readBerNull() {
    return {value: null, length: 0, constructed: false};
}
function readBerObjectId(constructed, arr, start, end) {
    if (constructed) {
        throw new Error("Constructed encoding of Object identifier not supported by this implementation.");
    }
    if (start >= end) {
        throw new Error("At least one byte required in the encoding of Object Identifier, but none present.");
    }
    var value = arr[start];
    if (typeof value != "number" || value - Math.floor(value) != 0 || value < 0 || value > 0x00FF) {
        throw new Error("First byte \"" + value + "\" of type \"" + (typeof value)
            + "\" cannot really be converted to a byte. To be able to do taht it should be an integer between 0 and 255 inclusive.");
    }
    var first = (value  - (value % 40)) / 40;
    if (first < 0 || first > 2) {
        throw new Error("First element (\"" + first + "\") of Objecgt identifier should be either 0 or 1 or 2, but it is " + first + ".");
    }
    var bytes = [];
    var index = 0;
    for (var i = start; i < end; i++) {
        if (typeof arr[i] != "number" || arr[i] - Math.floor(arr[i]) != 0 || arr[i] < 0 || arr[i] > 0x0FF) {
            throw new Error("Byte (" + arr[i] + ") with " + i
                + " in the encoding of Object Identifier is not an actual buyte. It should be an integer between 0 and 255 inclusive.");
        }
        bytes[index++] = arr[i] & 0x0FF;
    }
    if ((bytes[bytes.length-1] & 0x080) == 0x80) {
        throw new Error("Last byte in the encoding of Object identifier, should have its most significant bit cleared, but it does not. Byte value is: hex: "
            + toHex(bytes[bytes.length-1]) + "; Bin: " + toBinary(bytes[bytes.length-1]) + ").");
    }
    return {value: bytes, length: bytes.length, constructed: false};
}
function readBerUtf8String(constructed, arr, start, end) {
    var allowedSubTypes = [TYPE_UTC_TIME, TYPE_PRINTABLE, TYPE_T61STRING, TYPE_IA5STRING, TYPE_OCTET_STRING, TYPE_UTF8STRING];
    var result = readBerBinaryStringsGeneral(constructed, arr, start, end, allowedSubTypes, fromUtf8);
// console.log("readBerUtf8String: " + JSON.stringify(result));
    return result;
}
function readBerStringGeneric(constructed, arr, start, end, allowedStringTypes, normalizeFunction) {
    var value = "";
    var bytes, str;
    if (constructed) {
        var index = start;
        while (index < end) {
            var tag = readType(arr, index, end);
            var len = readLength(tag.asnClass, tag.type, arr, tag.start, tag.end);
            if (tag.constructed) {
                throw new Error("Subtype with constructed encoding not allowed as subelement for constructed encoding of "
                    + typeToString(allowedStringTypes[allowedStringTypes.length-1]) + " String. Subelement is of type \""
                    + typeToString(tag.type) + " (hex: " + tag.type.toString(16) + ") and length: " + len.length + " bytes. Its class is: "
                    + classToString(tag.asnClass) + ".");
            }
            if (allowedStringTypes.indexOf(tag.type) != -1) {
                bytes = subArray(arr, len.start, len.start + len.length);
                str   = arrayToASCIIString(bytes);
                value += normalizeFunction(str);
            } else {
                throw new Error("Subtupe \"" + typeToString(tag.type) + "\" (hex: " + tag.type.toString(16)
                    + ") not supported in constructed encoding for " + typeToString(allowedStringTypes[allowedStringTypes.length-1]) + " String.");
            };
            index = len.start + len.length;
        }
    } else {
        bytes = subArray(arr, start, end);
        str   = arrayToASCIIString(bytes);
        value = normalizeFunction(str);
    }
    return {value: value, length: value.length, constructed: false};
}
function readBerPrintable(constructed, arr, start, end) {
    return readBerStringGeneric(constructed, arr, start, end, [TYPE_UTC_TIME, TYPE_PRINTABLE], normalizePrintable);
}
function readBerT61String(constructed, arr, start, end) {
    return readBerStringGeneric(constructed, arr, start, end, [TYPE_UTC_TIME, TYPE_PRINTABLE, TYPE_T61STRING], normalizeT61String);
}
function readBerIA5String(constructed, arr, start, end) {
    return readBerStringGeneric(constructed, arr, start, end, [TYPE_UTC_TIME, TYPE_PRINTABLE, TYPE_T61STRING, TYPE_IA5STRING], normalizeIA5String);
}
function readBerUtcTime(constructed, arr, start, end) {
    var utc = readBerStringGeneric(constructed, arr, start, end, [TYPE_UTC_TIME], function (a) {return a;});
    var date = normalizeUtcTime(utc.value);
    return {value: utc.value, length: utc.length, constructed: false, date: date};
}
function readBerSequence(constructed, arr, start, end) {
    if (!constructed) {
        throw new Error("Cannot parse sequence with primitive encoding. Sequence requires constructed encoding. Value start index: " + start + ".");
    }
    var result = [];
    var length = 0;
    var index = start;
    while (index < end) {
        var tag = readType(arr, index, end);
// console.log("readBerSequence: tag: " + JSON.stringify(tag));
        var len = readLength(tag.asnClass, tag.type, arr, tag.start, tag.end);
        var val = getValueFromBerEncoding(tag.type, tag.constructed, arr, len.start, len.start + len.length);
// console.log("readBerSequence: new Asn(" + tag.asnClass+", " + tag.constructed+", " + tag.type+", " + val.length+", " + val.value + ", " + (tag.constructed ? val.value : null) + ");");
        var asn = new Asn(tag.asnClass, tag.constructed, tag.type, val.length, val.value, tag.constructed ? val.value : null);
        asn.date = val.date;
        var completeLength = asn.getCompleteLength();
        length += completeLength;
        result.push(asn);
        index = len.start + len.length;
    }
    return {value: result, length: length, constructed: true};
}
function readBerSet(constructed, arr, start, end) {
    if (!constructed) {
        throw new Error("Cannot parse sequence with primitive encoding. Sequence requires constructed encoding.");
    }
    var result = [];
    var length = 0;
    var index = start;
    while (index < end) {
        var tag = readType(arr, index, end);
        var len = readLength(tag.asnClass, tag.type, arr, tag.start, tag.end);
        var val = getValueFromBerEncoding(tag.type, tag.constructed, arr, len.start, len.end);
        var asn = new Asn(tag.asnClass, tag.constructed, tag.type, val.length, val.value, tag.constructed ? val.value : null);
        asn.date = val.date;
        var completeLength = asn.getCompleteLength();
        length += completeLength;
        result.push(asn);
        index = len.start + len.length;
    }
    result = normalizeAsnSet(result); // Sort by type number.
    return {value: result, length: length, constructed: true};
}
function readBerGeneric(constructed, arr, start, end) {
    if (constructed) {
        return readBerSequence(constructed, arr, start, end);
    }
    return readBerOctetString(constructed, arr, start, end);
}

function readType(arr, start, end) {
    start = start == null ? 0 : start;
    end   = end == null ? arr.length : end;
    var index = start;
    if (end - index <=0) {
        return null;
    }
    var tag = arr[index++];
    var asnClass = ( tag >> 6 ) & 0x3;
    var constructed = (tag & 0x20)  == 0x20;
    var type = tag & 0x1F;
    if (type != 0x1F) {
        return { start: index, end: end, asnClass: asnClass, constructed: constructed, type: type};
    }
    type = 0x0;
    do {
        if (end - index <= 0) {
            throw new Error("Start new ASN.1 object with class hex: \"" + asnClass.toString(16) + "\" with "
                + (constructed ? "Constructed" : "Primitive")
                + " encoding, requires its type to be defined in at least one more byte, but the input ended.");
        }
        var value = arr[index++];
        var previous = type;
        type = type << 7;
        type = type | (value & 0x7F);
        if (type < previous) {
            throw new Error("Overflow while calculating type for ASN.1 object of class hex: \"" + asnClass.toString(16)
                + "\" with " + (constructed ? "Construted" : "Priomitive") + " encoding. Overflow appeared when adding new byte hex: "
                    + (value & 0x7F).toString(16) + " to the previous value hex: " + previous.toString(16) +" which resulted in hex: "
                    + type.toString(16) + ". Index: " + index + ".");
        }
    } while ((value & 0x080) == 0x80);
// console.log("readType: " + JSON.stringify({ start: index, end: end, asnClass: asnClass, isConstructed: constructed, type: type}, null, 2));
    return { start: index, end: end, asnClass: asnClass, constructed: constructed, type: type};
}

function readLength(asnClass, type, arr, start, end) {
    start = start == null ? 0 : start;
    end   = end == null ? arr.length : end;
    var index = start;
    if (end - index <=0) {
        throw new Error("Element of type hex: " + type.toString(16) + " requires ASN.1 length field, but the input finished at index " + index + ".");
    }
    var len = arr[index++];
    if (len <= 0x7F) {
        return { start: index, end: end, length: len}
    }
    var lengthOfTheLength = (len & 0x7F);
    if (lengthOfTheLength == 0) {
        // Undefined length. Value would continue untill the 0x00 0x00 marker.
        return {start: index, end: end, length: null};
    }
    len = 0;
    for (var i =0; i < lengthOfTheLength; i++) {
        if (end - index <= 0) {
            throw new Error("Element of type hex: " + type.toString(16) + " requires additional " + lengthOfTheLength
                + " bytes to define the length of the ASN.1 value, however the input finishes at the " + (lengthOfTheLength - i)
                + " byte after the start of length definition.");
        }
        var previous = len;
        var value = arr[index++];
        value = value & 0x0FF;
        len = len << 8;
        len = len | value ;
        if(len < previous) {
            throw new Error("Overflow while calculating the length of the value for ASN.1 object of class hex: " + asnClass.toString(16)
                + " and type hex: " + type.toString(16) + " with value length that need to be defined in " + lengthOfTheLength
                + " bytes. Overflow appeared on the byte " + i + ", when adding new byte hex: " + value.toString(16) + " to the previous value hex: "
                + previous.toString(16) + " which resulted in he: " + len.toString(16) + ".");
        }
    }
    return {start: index, end: end, length: len}
}
function indexOfEndMarker(constructed, arr, start, end) {
    start = start == null ? 0 : start;
    end   = end == null ? arr.length : end;
    var index = start;
    if (constructed) {
        while (index < end) {
            if (index + 1 < end) {
                if (arr[index] == 0x00 && arr[index+1] == 0x00) {
                    break;
                }
            }
            var tag = readType(arr, index, end);
            var len = readLength(tag.asnClass, tag.type, arr, tag.start, end);
            index = len.start;
        }
    } else {
        while (index < end) {
            if (index + 1 < end) {
                if (arr[index] == 0x00 && arr[index+1] == 0x00) {
                    break;
                }
            }
            index++;
        }
    }
    return index;
}



var Asn = function (asnClass, isConstructed, type, len, value, subElements) {
    this.className = "ASN.1";
    this.asnClass = asnClass;
    this.constructed = isConstructed;
    this.type = type;
    this.length = len;
    this.value = value;
    this.sub = subElements;

    this.getValue = function () {
        return this.value;
    }
    this.setIntegerValue = function (value) {
        this.asnClass = CLASS_UNIVERSAL;
        this.value = value;
        this.type = TYPE_INTEGER;
        this.length = getSignedIntSizeInBytes(value);
        this.constructed = false;
        this.sub = null;
        return this;
    }
    this.setBitStringValue = function (arr) {
        this.asnClass = CLASS_UNIVERSAL;
        this.constructed = false;
        this.type = TYPE_BIT_STRING;
        this.value = normalizeBitString(arr);
        this.length = this.value.length;
        this.sub = null;
        return this;
    }
    this.setOctetString = function (value) {
        this.asnClass = CLASS_UNIVERSAL;
        this.constructed = false;
        this.type = TYPE_OCTET_STRING;
        this.value = normalizeOctetString(value);
        this.length = this.value.length;
        this.sub = null;
        return this;
    }
    this.setOctetStringUtf8 = function (value) {
        return this.setOctetString(toUtf8(value));
    }
    this.setNull = function () {
        this.asnClass = CLASS_UNIVERSAL;
        this.constructed = false;
        this.type = TYPE_NULL;
        this.value = null;
        this.length = 0;
        this.sub = null;
        return this;
    }
    this.setObjectId = function (arr) {
        this.asnClass = CLASS_UNIVERSAL;
        this.constructed = false;
        this.type = TYPE_OBJECT_ID;
        this.value = normalizeObjectId(arr);
        this.length = this.value.length;
        this.sub = null;
        return this;
    }
    this.setPrintableString = function (value) {
        this.asnClass = CLASS_UNIVERSAL;
        this.constructed = false;
        this.type = TYPE_PRINTABLE;
        this.value = normalizePrintable(value);
        this.length = this.value.length;
        this.sub = null;
        return this;
    }
    this.setT61String = function (value) {
        this.asnClass = CLASS_UNIVERSAL;
        this.constructed = false;
        this.type = TYPE_T61STRING;
        this.value = normalizeT61String(value);
        this.length = this.value.length;
        this.sub = null;
        return this;
    }
    this.setIA5String = function (value) {
        this.asnClass = CLASS_UNIVERSAL;
        this.constructed = false;
        this.type = TYPE_IA5STRING;
        this.value = normalizeIA5String(value);
        this.length = this.value.length;
        this.sub = null;
        return this;
    }
    this.getString = function () {
        if (this.type == TYPE_PRINTABLE || this.type == TYPE_T61STRING || this.type == TYPE_IA5STRING || this.type == TYPE_UTF8STRING) {
            return this.value
        } else if (this.type == TYPE_OCTET_STRING) {
            return arrayToASCIIString(this.value);
        } else if (this.type == TYPE_INTEGER) {
            return typeof this.value == "number" ? "" + this.value: this.value;
        } else if (this.type == TYPE_NULL) {
            return "NULL";
        } else if (this.type == TYPE_UTC_TIME) {
            function fmt(min, val) { while (("" + val).length < min) { val = "0" + val; } return val;}
            return fmt(4, this.date.getUTCFullYear()) + "-" + fmt(2, this.date.getUTCMonth() +1) + "-" + fmt(2, this.date.getUTCDate())
                + " " + fmt(2,this.date.getUTCHours()) + ":" + fmt(2,this.date.getUTCMinutes()) + ":" + fmt(2,this.date.getUTCSeconds()) + " GMT [" + this.value + "]";
        } else if (this.type == TYPE_OBJECT_ID) {
            var objectId = getObjectIdAsArray(this.value);
            var name = null;
            if (objectId.length == 2 && objectId[0] == 1 && objectId[1] ==2) {
                name = "ISO member bodies";
            } else if (objectId.length == 3 && objectId[0] == 1 && objectId[1] ==2 && objectId[2] == 840) {
                name = "US (ANSI)";
            } else if (objectId.length == 4 && objectId[0] == 1 && objectId[1] ==2 && objectId[2] == 840 && objectId[3] == 113549) {
                name = "RSA Data Security, Inc.";
            } else if (objectId.length == 5 && objectId[0] == 1 && objectId[1] ==2 && objectId[2] == 840 && objectId[3] == 113549 && objectId[4] == 1) {
                name = "RSA Data Security, Inc. PKCS";
            } else if (objectId.length == 2 && objectId[0] == 2 && objectId[1] ==5) {
                name = "directory services (X.500)";
            } else if (objectId.length == 3 && objectId[0] == 2 && objectId[1] ==5 && objectId[2] == 8) {
                name = "directory services-algorithms";
            }
            return objectId.join(".") + (name == null ? "" : " (" + name + ")");
        } else if (this.type == TYPE_BIT_STRING) {
            if (this.value == null || this.value.length <= 0) {
                return "";
            }
            var unusedBits = this.value[0];
            unusedBits = unusedBits > 8 ? 8 : unusedBits;
            unusedBits = unusedBits < 0 ? 0 : unusedBits;
            var str = "";
            var i = 1;
            for (; i < this.value.length-1; i++) {
                str += toBinary(this.value[i]) + " ";
            }
            i = this.value.length -1;
            var lastByte = this.value[i];
            if (i != 0) {
                var mask = 0x080;
                for (var j = 0; j < 8-unusedBits; j++) {
                    str += ((lastByte & mask) & 0x0FF ) > 0 ? "1":"0";
                    mask = (mask >> 1 ) & 0x0FF;
                }
            }
            return str;
        } else {
            throw new Error("The ASN.1 object cannot be represented as string. Its type is " + this.type + " (hex: " + this.type.toString(16)
               + "). Its value is: \"" + this.value + "\" of type \"" + (typeof this.value) + "\".");
        }
    }
    this.setUtcTimeNow = function () {
        var date = new Date();
        this.setUtcTime(date);
        return this;
    }
    this.setUtcTime = function (date) {
        var valueSet = false;
        if (typeof date == "string") {
            var str = date;
            date = normalizeUtcTime(date);
            this.value = str;
            this.length = str.length;
            valueSet = true;
        } else if (typeof date == "number") {
            date = new Date(date);
        }
        if (typeof date == "object") {
            this.date = date;
            var day = this.date.getUTCDate();       // 1 - 32
            var year = this.date.getUTCFullYear();  // yyyy
            var month = this.date.getUTCMonth();    // 0 - 11
            var hour  = this.date.getUTCHours();    // Local time.
            var minutes =  this.date.getUTCMinutes();
            var seconds = this.date.getUTCSeconds();
            year = year % 100;
            month++;
            var yearString = year < 10 ? "0" + year : "" + year;
            var monthString = month < 10 ? "0" + month : "" + month;
            this.asnClass = CLASS_UNIVERSAL;
            this.constructed = false;
            this.type = TYPE_UTC_TIME;
            if (!valueSet) {
                this.value = "" + yearString + monthString + day + hour + minutes + seconds + "Z";
                this.length = this.value.length;
            }
            this.sub = null;
        }
        return this;
    }
    this.getUtcTime = function () {
        if (this.type == TYPE_UTC_TIME && this.date != null && typeof this.date == "object") {
            return this.date;
        }
        throw new Error("The ASN.1 object does not represent UTC Time. Its type is " + this.type + " (hex: " + this.type.toString(16)
            + "). Value is: \"" + this.value + "\" of type \"" + (typeof this.value) + "\".");
    }
    this.setSequence = function (arr) {
        this.asnClass = CLASS_UNIVERSAL;
        this.constructed = true;
        this.type = TYPE_SEQUENCE;
        this.value = normalizeAsn1Sequence(arr);
        this.sub = this.value;
        this.length = null; // invalidate
        this.length = this.getValueLength();
        return this;
    }
    this.addAsnToSequence = function (asn) {
        if (!this.constructed || this.type != TYPE_SEQUENCE || this.value != "object" || this.value.length == null) {
            return this.setSequence([asn]);
        }
        this.value.push(normalizeAsn1Object(asn));
        this.length = null; // Invalidate
        this.length = this.getValueLength();
        return this;
    }
    this.setSet = function (set) {
        this.asnClass = CLASS_UNIVERSAL;
        this.constructed = true;
        this.type = TYPE_SET;
        this.value = normalizeAsnSet(set);
        this.sub = this.value;
        this.length = null;
        this.length = this.getValueLength();
        return this;
    }
    this.addAsnToSet = function (asn) {
        if (!this.constructed || this.type != TYPE_SET || this.value != "object" || this.value.length == null) {
            return this.setSet([asn]);
        }
        this.value.push(normalizeAsn1Object(asn));
        this.value = normalizeAsnSet(this.value);
        this.length = null;
        this.length = this.getValueLength();
        return this;
    }
    this.getUtcTime = function () {
        if (this.type != TYPE_UTC_TIME || this.date == null) {
            throw new Error("Current ASN.1 elment does not hold an UTC Time element.");
        }
        return this.date;
    }
    this.isConstructed = function () {
        return this.constructued;
    }
    this.getClass = function () {
        return this.asnClass;
    }
    this.getType = function() {
        return this.type;
    }
    this.getValueLength = function() {
        if (this.length != null) {
            return this.length;
        }
        if (this.sub == null || this.sub.length == null) {
            return 0;
        }
        var len = 0;
        for (var i = 0; i < this.sub.length; i++) {
            var subLength = this.sub[i].getCompleteLength();
            if (subLength == null) {
                return null;
            }
            len += subLength;
        }
        return len;
    }
    this.getCompleteLength = function() {
        var valueLength = this.getValueLength();
        return valueLength + getTypeSizeInBytes(this.type) + getLengthSizeInBytes(valueLength);
    }
    this.toJson = function () {
        var obj = {
            class:  "0x" + toHex(this.asnClass) + " (" + classToString(this.asnClass) + ")",
            type:   "0x" + toHex(this.type) + " (" + typeToString(this.type) + ")",
            length: this.length,
            value: null
        };
        if (!this.constructed) {
            try {  obj.value = this.getString(); } catch (e) { console.log("toJson: " + e+ ":"+ JSON.stringify(e, null, 2));obj.value = this.value; }
        } else {
            obj.value = [];
            for (var i = 0; i < this.value.length; i++) {
                if (this.value[i].className == "ASN.1") {
                    obj.value.push(this.value[i].toJson());
                } else {
                    obj.value = this.value;
                    break;
                }
            }
        }
        return obj;
    }
    this.toJsonShort = function () {
        var map, i, key;
        function setIsMap(set) {try {return set.find(function (e) {return e.getType() != TYPE_SEQUENCE || e.getValue().length != 2}) == null;} catch (e) {return false;}}
        function seqIsMap(seq) {try {return seq.find(function (e) {return e.getType() != TYPE_SET || !setIsMap(e.getValue())}) == null;} catch (e) {return false;}}
// console.log("toJsonShort: this.constructed : " +this.constructed + "; type: " + this.type + "");
        if (!this.constructed) {
// console.log("toJsonShort:                  : " +this.getString());
            return this.getString();
        }
        if (this.type == TYPE_SEQUENCE) {
            if (seqIsMap(this.value)) {
                map = {};
                for (i = 0; i < this.value.length; i++) {
                    var set = this.value[i].toJsonShort();
                    for (key in set) {
                        map[key] = set[key];
                    }
                }
                return map;
            }
// console.log("toJsonShort: SEQUENCE:");
            return this.value.map(function (val) {try { return val.toJsonShort();} catch (e) {return val;}});
        } else if (this.type = TYPE_SET) {
            map = {};
            if (setIsMap(this.value)) {
                for (i =0; i < this.value.length; i++) {
                    try {
                        key   = this.value[i].getValue()[0].getString();
                        var value = this.value[i].getValue()[1].toJsonShort();
                        map[key] = value;
                    } catch (e) {
                    }
                }
                return map;
            }
            return this.value.map(function (val) {try { return val.toJsonShort();} catch (e) {return val;}});
        } else {
            return [];
        }
    }
    this.toDer = function () {
        var bytesType  = getDerEncodedType(this.getClass(), this.isConstructed(), this.getType());
        var bytesLen   = getDerEncodedLength(this.getValueLength());
        var bytesValue = getDerEncodedValue(this.getType(), this.getValue());
        var bytes = [];
        bytes = concatByteArray(bytes, bytesType);
        bytes = concatByteArray(bytes, bytesLen);
        bytes = concatByteArray(bytes, bytesValue);
        return bytes;
    }
    this.fromBer = function (arr, start, end) {
// console.log("fromBer: (arr, " + start + ", " + end + ")" )
        arr   = arr == null ? [] : arr;
        start = start == null ? 0 : start;
        end   = end   == null ? arr.length: end;
        var index = start;
        var tag = readType(arr, index, end);
// console.log("fromBer: tag: " + JSON.stringify(tag));
        if (tag == null) {
            throw new Error("Cannot read ASN.1 object from input.");
        }
        this.asnClass = tag.asnClass;
        var constructed = tag.constructed;
        this.type = tag.type;
        index = tag.start;
        var len = readLength(asnClass, type, arr, index, end);
// console.log("fromBer: len: " + JSON.stringify(len));
        var length = len.length;
        index = len.start;
        end = length == null ? indexOfEndMarker(constructed, arr, index, end) : index + length;

        var result = getValueFromBerEncoding(this.type, constructed, arr, index, end);
        this.value  = result.value;
        this.length = result.length;
        this.constructed = result.constructed;
        if (result.date != null) {
            this.date = result.date;
        }
        this.sub = this.isConstructed() ? this.value : null;
        return this;
    }
    this.fromPem = function (pem) {
        var bytes = fromBase64(pem);
// var bytes = atob(pem);
// console.log(bytes.map(function (byte) {return toHex(byte);}).join(" "));
        return this.fromBer(bytes);
    }
}

function toBinary(byteValue) {
    if (byteValue < 0) {
        byteValue = byteValue & 0x00FF;
    }
    var str = byteValue.toString(2);
    var len = str.length;
    var prefix = "";
    for (var i = len; i < 8; i++) {
        prefix += "0";
    }
    return prefix + str;
}
function toHex(byteValue) {
    if (byteValue < 0) {
        byteValue = byteValue & 0x00FF;
    }
    var str = byteValue.toString(16);
    return str.length < 2 ? "0" + str : str;
}
var asn = new Asn();


var pem =
"MIID2zCCAsMCFEP9cUYeS7XTB9+oSnyZEtAvHdKLMA0GCSqGSIb3DQEBCwUAMIGp"
+"MQswCQYDVQQGEwJCRzEOMAwGA1UECAwFU29maWExDjAMBgNVBAcMBVNvZmlhMRgw"
+"FgYDVQQKDA9WTXdhcmUtREVWLVRFU1QxFDASBgNVBAsMC1ZNVy1ERVYtVFNUMSIw"
+"IAYDVQQDDBlzb21lLWNuLXZyYS0wMS5jb3JwLmxvY2FsMSYwJAYJKoZIhvcNAQkB"
+"FhdhYmVsb2Jvcm9kb3ZAdm13YXJlLmNvbTAeFw0yMDAyMDMxNjQzMzZaFw0zMDAx"
+"MzExNjQzMzZaMIGpMQswCQYDVQQGEwJCRzEOMAwGA1UECAwFU29maWExDjAMBgNV"
+"BAcMBVNvZmlhMRgwFgYDVQQKDA9WTXdhcmUtREVWLVRFU1QxFDASBgNVBAsMC1ZN"
+"Vy1ERVYtVFNUMSIwIAYDVQQDDBlzb21lLWNuLXZyYS0wMS5jb3JwLmxvY2FsMSYw"
+"JAYJKoZIhvcNAQkBFhdhYmVsb2Jvcm9kb3ZAdm13YXJlLmNvbTCCASIwDQYJKoZI"
+"hvcNAQEBBQADggEPADCCAQoCggEBANBYag3blBr3lhffFA9u/1IjSwzXJeIvG5Uf"
+"ctxG5cbI+YiRgyp4AGh6gza65eH0aL5qMEnh5NGnMReLqDX80lXMhVXvgqWfBHje"
+"pEqJ90ETdQ5nv0H1jaF+vZ/BxMR1FVWQIqr8Eqm08xWwLizMSBKf1A1sMtHJp5jK"
+"b3rKH0GX7SnV6jznLPD+nb4aA6FzCjuktW8TD3P/t2LYsuIhempaFBNm6FCwy5Eh"
+"M1qY2OEE77MxrmcdeAnOT3H0stdjN67U6uThxdblQWJd9jM85M4GI5hMFC7SXvAp"
+"szhhmGFgCWMtctGOyCBow7j2dkVeHJPufiyyCrBb0z3M0yHQv7UCAwEAATANBgkq"
+"hkiG9w0BAQsFAAOCAQEARwpHGr8hM7b9pcbM0i1VW3/q+M3IGyWkBIpwbwS2UPGA"
+"AIeSgw5iZIk5Z1fFQqwu8nLRdAounyXVNGbVDU11vkWz+8dVsqSNi+PEKqnI28/F"
+"7kZP25i6di/2K3iBjkzIR9jkqUImptvtlZmvtDH+4tmahnpuwTPE7gf5cwriow1U"
+"AvUHDUUVUyUFpHpE7eZ/k/uvfmRzRdFRF8qwK5Dkde0tgHhtQwg+mcF+wSVH6fSs"
+"5Zh1ifDd0asfXboplQB2VkeSf0vBQoDfMnBz34vmv502ylPSJpTkYwI8d2gTKaGG"
+"x75/rR4xzPnCnyyVMoBKR+pUD5nF2gsPYBQkQrMPHA==";
var pem2=
"MIIGoDCCBIigAwIBAgIJAICRY3cWdgK1MA0GCSqGSIb3DQEBCwUAMIGeMQswCQYD"
+"VQQGEwJCRzERMA8GA1UECAwIQnVsZ2FyaWExDjAMBgNVBAcMBVNvZmlhMQ8wDQYD"
+"VQQKDAZWTXdhcmUxKDAmBgNVBAsMH1dvcmxkd2lkZSBDZW50ZXIgb2YgRW5naW5l"
+"ZXJpbmcxCzAJBgNVBAMMAmNhMSQwIgYJKoZIhvcNAQkBFhV5bmVkZWxjaGV2QHZt"
+"d2FyZS5jb20wHhcNMjAwMzE4MTcyMjMyWhcNMjAwNDE3MTcyMjMyWjCBnjELMAkG"
+"A1UEBhMCQkcxETAPBgNVBAgMCEJ1bGdhcmlhMQ4wDAYDVQQHDAVTb2ZpYTEPMA0G"
+"A1UECgwGVk13YXJlMSgwJgYDVQQLDB9Xb3JsZHdpZGUgQ2VudGVyIG9mIEVuZ2lu"
+"ZWVyaW5nMQswCQYDVQQDDAJjYTEkMCIGCSqGSIb3DQEJARYVeW5lZGVsY2hldkB2"
+"bXdhcmUuY29tMIICIjANBgkqhkiG9w0BAQEFAAOCAg8AMIICCgKCAgEAxnWdv3WN"
+"f3Igo/DN7y9XoW8mQEEykURNdoq0Zacindj37qfeE2NbyTinU8iENJuNA7Jzqh5K"
+"GS3Tu9330R6RsDbj2CAYP0w/EanRU7s0DKcdVwWLZg89Cd4i6vvEMlZru9aYDCuN"
+"LZZTd+tVlyz4ncrGmyHHHwl1YsHglu0oiu2wELWuFzKAM2sneBuDiPWOHyLV8Pgd"
+"rvRWPw7Y2Qgnp7xbPAoLxJpFhbcNTET55EbKX2muW/EdqAnMwEvjYCXebKbtA1Lp"
+"eQf/ayIjnalQ/yg0RHhXPy051q9OhFa9sj3BfeQ/94mT04mTPa0ruxDkBO/zt49A"
+"9yYuCNWvOmFFoYuPn+WBHxK7zzfLSArUvbhsvTcYNXmN69U4qlYqTGoc/9ZIpB4B"
+"x4WkLa1LWXWUnkIbb3+lclO8nivdGnoKTOxHCZ7LkPtQwTzPn3b3ZgW9iCO1Z9sm"
+"jgo+LR7txVhV8kpXR3aPwRBMDitXX4KnwWld0788qlOygY54SZwD5EhBvJ/Xinx2"
+"JFUHHN8RE6HsB9rOo9ZUDzt2z7A7s33J0ptAZBAQ2Dm2x6orGsT+4SumrlOWliTD"
+"tNJujSVheNOGcEo+UhCWBvb3zpVnpjaOqxyccSNZj/l0WmbZgpnl3Yh69ZL/bnMd"
+"Ha6dqQ5Q0CY67vfdK6L74T0PgD8nfeK00SUCAwEAAaOB3jCB2zCBvQYDVR0jBIG1"
+"MIGyoYGkpIGhMIGeMQswCQYDVQQGEwJCRzERMA8GA1UECAwIQnVsZ2FyaWExDjAM"
+"BgNVBAcMBVNvZmlhMQ8wDQYDVQQKDAZWTXdhcmUxKDAmBgNVBAsMH1dvcmxkd2lk"
+"ZSBDZW50ZXIgb2YgRW5naW5lZXJpbmcxCzAJBgNVBAMMAmNhMSQwIgYJKoZIhvcN"
+"AQkBFhV5bmVkZWxjaGV2QHZtd2FyZS5jb22CCQCAkWN3FnYCtTAMBgNVHRMEBTAD"
+"AQH/MAsGA1UdDwQEAwIE8DANBgkqhkiG9w0BAQsFAAOCAgEAWAk7dzVHzJ5fcuhj"
+"6MfPIrWwdQs+6y77+CAZbvMgBgsAgGP4MX43aPre6E9Oc7cY1U3jGf24eSZOS443"
+"vJsQAYEQAEz65S/W4lSF0nNgmGh1y6uY7lLjFYuJwZSE8ba8ghUIFiXRYGeYX6Ba"
+"bFkgQZ8wLLFnn8eFVTjLgNaFplnkHqnz4li4s7SZj+LfoiTTfz5RYBQXeGFa6NdY"
+"Obs5kb2OLK62C4Nr+0jIWPKbxLF5RZfnu+Uc4DFov+Wu1iEwcEOsZJ15wPCzs/lY"
+"u39KGYU8ZhlsGyyK3HPzqkyIxRTDNEkxhc2q8KjLXdBI9ChoW1W3EkRP4n9sS0PM"
+"Gg9g0oVJdeMzaV/9jqVpOBwj982u0yh5NUo9jAFQ1Zoa5UncTMo2cgdd1hN71mpN"
+"/vx3aQWPv40EKGvbdxDMrwplSEQ1YUgswGH5fpKo7LR5jzFmtO0kpdyx+CUx7njI"
+"SRA0S4PEHFNZcf6igiI78dF7PUS/nXUwBNIE/sqoRowX8LN7gcFjwVwxzkY24sDa"
+"B9OYHjxbZfI7oFC97D8x07MH4v+UPa73rkJMR1rGyHrqNdwc7CH0FPs1DdOVIE8n"
+"ud5Nja8+xycA/Jk7bSvB1jJjpc3oL0G9j0HOcxqQKd4e1IQXuss5V7FnQxSOVCq4"
+"GVK0r3LkAxtl/EGmQC1DRlHAUWg=";
// asn.fromBer([0x04, 0x08, 0x01, 0x23, 0x45, 0x67, 0x89, 0xab, 0xcd, 0xef]);
// asn.fromBer([0x04, 0x81, 0x08, 0x01, 0x23, 0x45, 0x67, 0x89, 0xab, 0xcd, 0xef]);
// asn.fromBer([0x24, 0x0c, 0x04, 0x04, 0x01, 0x23, 0x45, 0x67, 0x04, 0x04, 0x89, 0xab, 0xcd, 0xef]);
// asn.fromBer([0x33, 0x0f, 0x13, 0x05, 0x54, 0x65, 0x73, 0x74, 0x20, 0x13, 0x06, 0x55, 0x73, 0x65, 0x72, 0x20, 0x31]);
// asn.fromBer([0x14, 0x0f, 0x63, 0x6c, 0xc2, 0x65, 0x73, 0x20, 0x70, 0x75, 0x62, 0x6c, 0x69, 0x71, 0x75, 0x65, 0x73]);
// asn.fromBer([0x14, 0x81, 0x0f, 0x63, 0x6c, 0xc2, 0x65, 0x73, 0x20, 0x70, 0x75, 0x62, 0x6c, 0x69, 0x71, 0x75, 0x65, 0x73]);
//asn.fromBer([0x34, 0x15, 0x14, 0x05, 0x63, 0x6c, 0xc2, 0x65, 0x73, 0x14, 0x01, 0x20, 0x14, 0x09, 0x70, 0x75, 0x62, 0x6c, 0x69, 0x71, 0x75, 0x65, 0x73]);
// asn.fromBer([0x17, 0x0d, 0x39, 0x31, 0x30, 0x35, 0x30, 0x36, 0x32, 0x33, 0x34, 0x35, 0x34, 0x30, 0x5a]);
// asn.fromBer([0x17, 0x11, 0x39, 0x31, 0x30, 0x35, 0x30, 0x36, 0x31, 0x36, 0x34, 0x35, 0x34, 0x30, 0x2D, 0x30, 0x37, 0x30, 0x30]);
asn.fromPem(pem2);
// asn.setUtcTime("910506164540-0700");
// console.log("JSON: " + asn.toJsonShort());
console.log(JSON.stringify(asn.toJsonShort(), null, 2));

// console.log("asn: " + JSON.stringify(asn));
// var der = asn.toDer();
// var str = "";
// for (var i = 0; i < der.length; i++) {
//     str += toHex(der[i]) + " ";
// }
// console.log(str);
// str = "";
// for (var i = 0; i < der.length; i++) {
//     str += toBinary(der[i]) + " ";
// }
// console.log(str);
