
function getNextByte(value, startByteIndex, startBitsStr, additional, index) {
    if (index >= value.length) {
        var startByte = value[startByteIndex];
        throw new Error("Invalid UTF-8 sequence. Byte " + startByteIndex + " with value " + startByte + " (" + String.fromCharCode(startByte) + "; binary: " + toBinary(startByte)
            + ") starts with " + startBitsStr + " in binary and thus requires " + additional + " bytes after it, but we only have " + (value.length - startByteIndex) + ".");
    }
    var byteValue = value[index];
    checkNextByteFormat(value, startByteIndex, startBitsStr, additional, index);
    return byteValue;
}
function checkNextByteFormat(value, startByteIndex, startBitsStr, additional, index) {
    if ((value[index] & 0xC0) != 0x80) {
        var startByte = value[startByteIndex];
        var wrongByte = value[index];
        throw new Error("Invalid UTF-8 byte sequence. Byte " + startByteIndex + " with value " + startByte + " (" +String.fromCharCode(startByte) +"; binary: " + toBinary(startByte)
            + ") starts with " + startBitsStr + " in binary and thus requires " + additional + " additional bytes, each of which shouls start with 10 in binary. However byte "
            + (index - startByteIndex)+ " after it with value " + wrongByte + " (" + String.fromCharCode(wrongByte) + "; binary: " + toBinary(wrongByte)
            +") does not start with 10 in binary.");
    }
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

var BinaryBuffer = function BinaryBuffer(value, start, end) {
    this.className = "BinaryBuffer";
    var i =0;
    var element = null;
    if (start != null) {
        if (typeof(start) != "number") {
            throw new Error("Invalid start index.");
        }
    }
    if (value == null) {
        this.value = new Array();
    } else {
        if (typeof(value) == "string") {
            this.value = new Array();
            start = start == null ? 0 : start;
            end   = end   == null ? value.length : end;
            for (i = start; i < value.length && i < end; i++) {
                element = value.charCodeAt(i);
                if (element < 0 || element > 255) {
                    throw new Error("Element with number value \"" + element + "\", represented as character \"" + value.charAt(i)
                        + "\" on position " + i + " is not a valid byte. It should be an integer number between 0 and 255 (Could be represented in string using the hex notation \\xXX).");
                }
                this.value[i] = element;
            }
        } else if (typeof(value) == "object" && value.length != null) {
            this.value = new Array();
            start = start == null ? 0 : start;
            end   = end   == null ? value.length : end;
            for (i = start; i < value.length && i < end; i++) {
                element = value[i];
                if (element == null) {
                    throw new Error("Missing element at position " + i + " in array of bytes.");
                }
                if (typeof(element) != "number") {
                    throw new Error("Element at position " + i +" is not a byte (integer number between 0 and 255. Instead its type is "
                        + typeof(element) + ".");
                }
                if (element < 0 || element > 255) {
                    throw new Error("Element " + element + " at position " + i + " is not a byte representation. It must be an integer number between 0 and 255.");
                }
                this.value[i] = Math.floor(element);
            }
        } else {
            throw new Error("Unknown value type \"" + typeof(value) + "\" for value \"" + value
                + "\". Supported types are \"string\" and array of bytes (integers between 0 and 255).");
        }
    }

    this.getLength function () {
        return this.value.length;
    }
    this.set= function (index, value) {
        if (index < 0 || index >= this.value.length) {
            throw new Error("Index " + index + " is out of bounds for an binary buffer with " + this.value.length + " elements.");
        }
        if (typeof(value) != number) {
            throw new Error("Invalid value of type \"" + typeof(value) + "\" for value \"" + value + "\". Only values with type number and value between 0 and 255 allowed.");
        }
        if (value < 0 || value > 255) {
            throw new Error("Invalid value \"" + value + "\". It should be an integer number between 0 and 255.");
        }
        this.value[index] = Math.floor(value);
    }
    this.setBe= function(index, value, bytesCount) {
        bytesCount--;
        var shift = 0;
        var i = 0;
        for (; i < bytesCount; i++) {
            shift += 8;
        }
        i = index;
        for(; shift >= 0; shift = shift - 8) {
            var byteValue = (value >> shift) & 0x00FF;
            this.set(i, byteValue);
        }
    }
    this.get= function (index) {
        if (index < 0 || index >= this.value.length)  {
            throw new Error("Invalid index " + index + " for a binary array of " + this.value.length + " elements.");
        }
        return this.value[index];
    }
    this.getBe= function (index, bytesCount) {
        var intValue = 0;
        var offset = index;
        for (var i = 0; i < bytesCount; i++) {
            intValue = intValue << 8;
            var val = this.get(offset);
            intValue = intValue | val;
            offset++;
        }
        return intValue;
    }
    this.copyFrom= function (positin, source) {
        if (source == null || source.className != "BinaryBuffer") {
            throw new Error("Invalid source.");
        }
        var desIndex = position;
        var srcIndex = 0;
        for (; srcIndex < source.getLength(); srcIndex++) {
            set(desIndex, source.get(srcIndex));
            destIndex++;
        }
    }
    this.equals= function (buf) {
        if (buf.className != "BinaryBuffer") {
            return false;
        }
        if (this.getLength() != buf.getLength()) {
            return false;
        }
        for (var i = 0; i < this.getLength(); i++) {
            var byte1 = this.get(i);
            var byte2 = buf.get(i);
            if (byte1 != byte2) {
                return false;
            }
        }
        return true;
    }
    this.append= function (value) {
        if (typeof(value) != number) {
            throw new Error("Invalid value of type \"" + typeof(value) + "\" for value \"" + value + "\". Only values with type number and value between 0 and 255 allowed.");
        }
        if (value < 0 || value > 255) {
            throw new Error("Invalid value \"" + value + "\". It should be an integer number between 0 and 255.");
        }
        this.value[this.value.length] = Math.floor(value);
    }
    this.concat= function (buff) {
        if (typeof(buff) == "string") {
            // TODO:
        } else if (typeof(buff) == "object" && buff.length != null) {
            // TODO:
        } else {
            throw new Error("Cannot concatenate with value of type \"" + typeof(buff) + "\"");
        }
    }
    this.alloc= function (size) {
        for (var i = this.getLength(); i < size; i++) {
            this.set(i, 0x00);
        }
        return this;
    }
    this.slice= function (start, end) {
        end = end == null ? this.value.length : end;
        var result = new BinaryBuffer(this.value, start, end);
        return result;
    }
    this.toString= function(radix, spacing) {
        if (radix != null && (typeof(radix) != "number" || radix < 2 || radix - Math.floor(radix) != 0)) {
            throw new Error("Invalid radix " + typeof(radix) + " " + radix + ". It should be an integer number greater or equal to 2.");
        }
        var str = "";
        for (var i = 0; i < this.value.length; i++) {
            var byte = this.value[i];
            var chr = "";
            if (radix == null) {
                chr = String.fromCharCode(byte);
            } else {
                if (byte < 0) {
                    byte = byte & 0x00FF;
                }
                if (radix == 2) {
                    chr = toBinary(byte);
                    chr = chr + (spacing == null ? "" : spacing);
                } else if (radix == 16) {
                    chr = byte.toString(16);
                    chr = chr.length < 2 ? "0" + chr : chr;
                    chr = chr + (spacing == null ? "" : spacing);
                } else if (radix == 8) {
                    chr = byte.toString(8);
                    chr = chr.length < 2 ? "00" + chr : chr.length < 3 ? "0"+chr : chr;
                    chr = chr + (spacing == null ? "" : spacing);
                } else {
                    chr = byte.toString(radix);
                    chr = chr + (spacing == null ? " " : spacing);
                }
            }
            str += chr;
        }
        return str;
    }
    this.toHexString= function (spacing) {
        return this.toString(16, spacing);
    }
    this.toOctString= function (spacing) {
        return this.toString(8, spacing);
    }
    this.toBase64String= function () {
        var alpha = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
        var packsRemainder = this.value.length % 3;
        var packsCount     = (this.value.length - packsRemainder) / 3;
        var str = "";
        var a = null;
        var b = null;
        var c = null;
        var base64_first = null;
        var base64_second = null;
        var base64_third = null;
        var base64_fourth = null;
        for (var i = 0; i < packsCount; i++) {
            a = this.value[(i * 3) + 0];    // AAAAaa aaBBBB bbbbCC CCcccc
            b = this.value[(i * 3) + 1];
            c = this.value[(i * 3) + 2];

            base64_first  =  ( a >> 2 ) & 0x3F; // 0011 1111
            base64_second = (( a << 4 ) & 0x30 ) |  (( b >> 4 ) & 0x0F);
            base64_third  = (( b << 2 ) & 0x3C ) |  (( c >> 6 ) & 0x03);
            base64_fourth =  ( c      ) & 0x3F;

            str += alpha[base64_first];
            str += alpha[base64_second];
            str += alpha[base64_third];
            str += alpha[base64_fourth];
        }
        if (packsRemainder == 1) {
            a = this.value[packsCount * 3];

            base64_first  = ( a >> 2 ) & 0x3F;
            base64_second = ( a << 4 ) & 0x30;

            str += alpha[base64_first];
            str += alpha[base64_second];
            str += "==";
        } else if (packsRemainder == 2) {
            a = this.value[(packsCount * 3) + 0];
            b = this.value[(packsCount * 3) + 1];

            base64_first  =  ( a >> 2 ) & 0x3F; // 0011 1111
            base64_second = (( a << 4 ) & 0x30 ) |  (( b >> 4 ) & 0x0F);
            base64_third  = (( b << 2 ) & 0x3C );

            str += alpha[base64_first];
            str += alpha[base64_second];
            str += alpha[base64_third];
            str += "=";
        }
        return str;
    }
    this.fromBase64String= function (str) {
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
        this.value = value;
        return this;
    }
    this.toUtf8String= function () {
        var str = "";
        var i = 0;
        var second = null;
        var third  = null;
        var fourth = null;
        var fifth  = null;
        var sixth  = null;
        while(i < this.value.length) {
            var byteValue = this.value[i];
            var startByteIndex = i;
            var code = 0;
            if ((byteValue & 0x80) == 0) {
                code = byteValue & 0x00FF;

            } else if ((byteValue & 0xE0) == 0xC0) {
                second = getNextByte(this.value, startByteIndex, "110", 1, ++i);
                code = ((byteValue & 0x1F) << 6 ) | (second & 0x3F);

            } else if ((byteValue & 0xF0) == 0xE0) {
                second = getNextByte(this.value, startByteIndex, "1110",  2, ++i);
                third  = getNextByte(this.value, startByteIndex, "1110",  2, ++i);
                code = ((byteValue & 0x0F) <<12) | ((second &0x3F) << 6) | ((third & 0x3F)<<0);

            } else if ((byteValue & 0xF8) == 0xF0) {
                second = getNextByte(this.value, startByteIndex, "11110",  3, ++i);
                third  = getNextByte(this.value, startByteIndex, "11110",  3, ++i);
                fourth = getNextByte(this.value, startByteIndex, "11110",  3, ++i);
                code = ((byteValue & 0x07) <<18) | ((second &0x3F) << 12) | ((third & 0x3F)<<6) | ((fourth&0x3F)<<0);

            } else if ((byteValue & 0xFC) == 0xF8) {
                second = getNextByte(this.value, startByteIndex, "111110",  4, ++i);
                third  = getNextByte(this.value, startByteIndex, "111110",  4, ++i);
                fourth = getNextByte(this.value, startByteIndex, "111110",  4, ++i);
                fifth  = getNextByte(this.value, startByteIndex, "111110",  4, ++i);
                code = ((byteValue & 0x03) <<24) | ((second &0x3F) << 18) | ((third & 0x3F)<<12) | ((fourth&0x3F)<<6) | ((fifth&0x3F)<<0);

            } else if ((byteValue & 0xFE) == 0xFC) {
                second = getNextByte(this.value, startByteIndex, "1111110",  5, ++i);
                third  = getNextByte(this.value, startByteIndex, "1111110",  5, ++i);
                fourth = getNextByte(this.value, startByteIndex, "1111110",  5, ++i);
                fifth  = getNextByte(this.value, startByteIndex, "1111110",  5, ++i);
                sixth  = getNextByte(this.value, startByteIndex, "1111110",  5, ++i);
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
    this.fromUtf8String= function (str) {
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
        this.value = value;
        return this;
    }
}




