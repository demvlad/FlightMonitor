(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
(function (global){(function (){
'use strict';

var possibleNames = require('possible-typed-array-names');

var g = typeof globalThis === 'undefined' ? global : globalThis;

/** @type {import('.')} */
module.exports = function availableTypedArrays() {
	var /** @type {ReturnType<typeof availableTypedArrays>} */ out = [];
	for (var i = 0; i < possibleNames.length; i++) {
		if (typeof g[possibleNames[i]] === 'function') {
			// @ts-expect-error
			out[out.length] = possibleNames[i];
		}
	}
	return out;
};

}).call(this)}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"possible-typed-array-names":54}],2:[function(require,module,exports){
'use strict'

exports.byteLength = byteLength
exports.toByteArray = toByteArray
exports.fromByteArray = fromByteArray

var lookup = []
var revLookup = []
var Arr = typeof Uint8Array !== 'undefined' ? Uint8Array : Array

var code = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
for (var i = 0, len = code.length; i < len; ++i) {
  lookup[i] = code[i]
  revLookup[code.charCodeAt(i)] = i
}

// Support decoding URL-safe base64 strings, as Node.js does.
// See: https://en.wikipedia.org/wiki/Base64#URL_applications
revLookup['-'.charCodeAt(0)] = 62
revLookup['_'.charCodeAt(0)] = 63

function getLens (b64) {
  var len = b64.length

  if (len % 4 > 0) {
    throw new Error('Invalid string. Length must be a multiple of 4')
  }

  // Trim off extra bytes after placeholder bytes are found
  // See: https://github.com/beatgammit/base64-js/issues/42
  var validLen = b64.indexOf('=')
  if (validLen === -1) validLen = len

  var placeHoldersLen = validLen === len
    ? 0
    : 4 - (validLen % 4)

  return [validLen, placeHoldersLen]
}

// base64 is 4/3 + up to two characters of the original data
function byteLength (b64) {
  var lens = getLens(b64)
  var validLen = lens[0]
  var placeHoldersLen = lens[1]
  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
}

function _byteLength (b64, validLen, placeHoldersLen) {
  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
}

function toByteArray (b64) {
  var tmp
  var lens = getLens(b64)
  var validLen = lens[0]
  var placeHoldersLen = lens[1]

  var arr = new Arr(_byteLength(b64, validLen, placeHoldersLen))

  var curByte = 0

  // if there are placeholders, only get up to the last complete 4 chars
  var len = placeHoldersLen > 0
    ? validLen - 4
    : validLen

  var i
  for (i = 0; i < len; i += 4) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 18) |
      (revLookup[b64.charCodeAt(i + 1)] << 12) |
      (revLookup[b64.charCodeAt(i + 2)] << 6) |
      revLookup[b64.charCodeAt(i + 3)]
    arr[curByte++] = (tmp >> 16) & 0xFF
    arr[curByte++] = (tmp >> 8) & 0xFF
    arr[curByte++] = tmp & 0xFF
  }

  if (placeHoldersLen === 2) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 2) |
      (revLookup[b64.charCodeAt(i + 1)] >> 4)
    arr[curByte++] = tmp & 0xFF
  }

  if (placeHoldersLen === 1) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 10) |
      (revLookup[b64.charCodeAt(i + 1)] << 4) |
      (revLookup[b64.charCodeAt(i + 2)] >> 2)
    arr[curByte++] = (tmp >> 8) & 0xFF
    arr[curByte++] = tmp & 0xFF
  }

  return arr
}

function tripletToBase64 (num) {
  return lookup[num >> 18 & 0x3F] +
    lookup[num >> 12 & 0x3F] +
    lookup[num >> 6 & 0x3F] +
    lookup[num & 0x3F]
}

function encodeChunk (uint8, start, end) {
  var tmp
  var output = []
  for (var i = start; i < end; i += 3) {
    tmp =
      ((uint8[i] << 16) & 0xFF0000) +
      ((uint8[i + 1] << 8) & 0xFF00) +
      (uint8[i + 2] & 0xFF)
    output.push(tripletToBase64(tmp))
  }
  return output.join('')
}

function fromByteArray (uint8) {
  var tmp
  var len = uint8.length
  var extraBytes = len % 3 // if we have 1 byte left, pad 2 bytes
  var parts = []
  var maxChunkLength = 16383 // must be multiple of 3

  // go through the array every three bytes, we'll deal with trailing stuff later
  for (var i = 0, len2 = len - extraBytes; i < len2; i += maxChunkLength) {
    parts.push(encodeChunk(uint8, i, (i + maxChunkLength) > len2 ? len2 : (i + maxChunkLength)))
  }

  // pad the end with zeros, but make sure to not forget the extra bytes
  if (extraBytes === 1) {
    tmp = uint8[len - 1]
    parts.push(
      lookup[tmp >> 2] +
      lookup[(tmp << 4) & 0x3F] +
      '=='
    )
  } else if (extraBytes === 2) {
    tmp = (uint8[len - 2] << 8) + uint8[len - 1]
    parts.push(
      lookup[tmp >> 10] +
      lookup[(tmp >> 4) & 0x3F] +
      lookup[(tmp << 2) & 0x3F] +
      '='
    )
  }

  return parts.join('')
}

},{}],3:[function(require,module,exports){
(function (Buffer){(function (){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <https://feross.org>
 * @license  MIT
 */
/* eslint-disable no-proto */

'use strict'

var base64 = require('base64-js')
var ieee754 = require('ieee754')

exports.Buffer = Buffer
exports.SlowBuffer = SlowBuffer
exports.INSPECT_MAX_BYTES = 50

var K_MAX_LENGTH = 0x7fffffff
exports.kMaxLength = K_MAX_LENGTH

/**
 * If `Buffer.TYPED_ARRAY_SUPPORT`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Print warning and recommend using `buffer` v4.x which has an Object
 *               implementation (most compatible, even IE6)
 *
 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
 * Opera 11.6+, iOS 4.2+.
 *
 * We report that the browser does not support typed arrays if the are not subclassable
 * using __proto__. Firefox 4-29 lacks support for adding new properties to `Uint8Array`
 * (See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438). IE 10 lacks support
 * for __proto__ and has a buggy typed array implementation.
 */
Buffer.TYPED_ARRAY_SUPPORT = typedArraySupport()

if (!Buffer.TYPED_ARRAY_SUPPORT && typeof console !== 'undefined' &&
    typeof console.error === 'function') {
  console.error(
    'This browser lacks typed array (Uint8Array) support which is required by ' +
    '`buffer` v5.x. Use `buffer` v4.x if you require old browser support.'
  )
}

function typedArraySupport () {
  // Can typed array instances can be augmented?
  try {
    var arr = new Uint8Array(1)
    arr.__proto__ = { __proto__: Uint8Array.prototype, foo: function () { return 42 } }
    return arr.foo() === 42
  } catch (e) {
    return false
  }
}

Object.defineProperty(Buffer.prototype, 'parent', {
  enumerable: true,
  get: function () {
    if (!Buffer.isBuffer(this)) return undefined
    return this.buffer
  }
})

Object.defineProperty(Buffer.prototype, 'offset', {
  enumerable: true,
  get: function () {
    if (!Buffer.isBuffer(this)) return undefined
    return this.byteOffset
  }
})

function createBuffer (length) {
  if (length > K_MAX_LENGTH) {
    throw new RangeError('The value "' + length + '" is invalid for option "size"')
  }
  // Return an augmented `Uint8Array` instance
  var buf = new Uint8Array(length)
  buf.__proto__ = Buffer.prototype
  return buf
}

/**
 * The Buffer constructor returns instances of `Uint8Array` that have their
 * prototype changed to `Buffer.prototype`. Furthermore, `Buffer` is a subclass of
 * `Uint8Array`, so the returned instances will have all the node `Buffer` methods
 * and the `Uint8Array` methods. Square bracket notation works as expected -- it
 * returns a single octet.
 *
 * The `Uint8Array` prototype remains unmodified.
 */

function Buffer (arg, encodingOrOffset, length) {
  // Common case.
  if (typeof arg === 'number') {
    if (typeof encodingOrOffset === 'string') {
      throw new TypeError(
        'The "string" argument must be of type string. Received type number'
      )
    }
    return allocUnsafe(arg)
  }
  return from(arg, encodingOrOffset, length)
}

// Fix subarray() in ES2016. See: https://github.com/feross/buffer/pull/97
if (typeof Symbol !== 'undefined' && Symbol.species != null &&
    Buffer[Symbol.species] === Buffer) {
  Object.defineProperty(Buffer, Symbol.species, {
    value: null,
    configurable: true,
    enumerable: false,
    writable: false
  })
}

Buffer.poolSize = 8192 // not used by this implementation

function from (value, encodingOrOffset, length) {
  if (typeof value === 'string') {
    return fromString(value, encodingOrOffset)
  }

  if (ArrayBuffer.isView(value)) {
    return fromArrayLike(value)
  }

  if (value == null) {
    throw TypeError(
      'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
      'or Array-like Object. Received type ' + (typeof value)
    )
  }

  if (isInstance(value, ArrayBuffer) ||
      (value && isInstance(value.buffer, ArrayBuffer))) {
    return fromArrayBuffer(value, encodingOrOffset, length)
  }

  if (typeof value === 'number') {
    throw new TypeError(
      'The "value" argument must not be of type number. Received type number'
    )
  }

  var valueOf = value.valueOf && value.valueOf()
  if (valueOf != null && valueOf !== value) {
    return Buffer.from(valueOf, encodingOrOffset, length)
  }

  var b = fromObject(value)
  if (b) return b

  if (typeof Symbol !== 'undefined' && Symbol.toPrimitive != null &&
      typeof value[Symbol.toPrimitive] === 'function') {
    return Buffer.from(
      value[Symbol.toPrimitive]('string'), encodingOrOffset, length
    )
  }

  throw new TypeError(
    'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
    'or Array-like Object. Received type ' + (typeof value)
  )
}

/**
 * Functionally equivalent to Buffer(arg, encoding) but throws a TypeError
 * if value is a number.
 * Buffer.from(str[, encoding])
 * Buffer.from(array)
 * Buffer.from(buffer)
 * Buffer.from(arrayBuffer[, byteOffset[, length]])
 **/
Buffer.from = function (value, encodingOrOffset, length) {
  return from(value, encodingOrOffset, length)
}

// Note: Change prototype *after* Buffer.from is defined to workaround Chrome bug:
// https://github.com/feross/buffer/pull/148
Buffer.prototype.__proto__ = Uint8Array.prototype
Buffer.__proto__ = Uint8Array

function assertSize (size) {
  if (typeof size !== 'number') {
    throw new TypeError('"size" argument must be of type number')
  } else if (size < 0) {
    throw new RangeError('The value "' + size + '" is invalid for option "size"')
  }
}

function alloc (size, fill, encoding) {
  assertSize(size)
  if (size <= 0) {
    return createBuffer(size)
  }
  if (fill !== undefined) {
    // Only pay attention to encoding if it's a string. This
    // prevents accidentally sending in a number that would
    // be interpretted as a start offset.
    return typeof encoding === 'string'
      ? createBuffer(size).fill(fill, encoding)
      : createBuffer(size).fill(fill)
  }
  return createBuffer(size)
}

/**
 * Creates a new filled Buffer instance.
 * alloc(size[, fill[, encoding]])
 **/
Buffer.alloc = function (size, fill, encoding) {
  return alloc(size, fill, encoding)
}

function allocUnsafe (size) {
  assertSize(size)
  return createBuffer(size < 0 ? 0 : checked(size) | 0)
}

/**
 * Equivalent to Buffer(num), by default creates a non-zero-filled Buffer instance.
 * */
Buffer.allocUnsafe = function (size) {
  return allocUnsafe(size)
}
/**
 * Equivalent to SlowBuffer(num), by default creates a non-zero-filled Buffer instance.
 */
Buffer.allocUnsafeSlow = function (size) {
  return allocUnsafe(size)
}

function fromString (string, encoding) {
  if (typeof encoding !== 'string' || encoding === '') {
    encoding = 'utf8'
  }

  if (!Buffer.isEncoding(encoding)) {
    throw new TypeError('Unknown encoding: ' + encoding)
  }

  var length = byteLength(string, encoding) | 0
  var buf = createBuffer(length)

  var actual = buf.write(string, encoding)

  if (actual !== length) {
    // Writing a hex string, for example, that contains invalid characters will
    // cause everything after the first invalid character to be ignored. (e.g.
    // 'abxxcd' will be treated as 'ab')
    buf = buf.slice(0, actual)
  }

  return buf
}

function fromArrayLike (array) {
  var length = array.length < 0 ? 0 : checked(array.length) | 0
  var buf = createBuffer(length)
  for (var i = 0; i < length; i += 1) {
    buf[i] = array[i] & 255
  }
  return buf
}

function fromArrayBuffer (array, byteOffset, length) {
  if (byteOffset < 0 || array.byteLength < byteOffset) {
    throw new RangeError('"offset" is outside of buffer bounds')
  }

  if (array.byteLength < byteOffset + (length || 0)) {
    throw new RangeError('"length" is outside of buffer bounds')
  }

  var buf
  if (byteOffset === undefined && length === undefined) {
    buf = new Uint8Array(array)
  } else if (length === undefined) {
    buf = new Uint8Array(array, byteOffset)
  } else {
    buf = new Uint8Array(array, byteOffset, length)
  }

  // Return an augmented `Uint8Array` instance
  buf.__proto__ = Buffer.prototype
  return buf
}

function fromObject (obj) {
  if (Buffer.isBuffer(obj)) {
    var len = checked(obj.length) | 0
    var buf = createBuffer(len)

    if (buf.length === 0) {
      return buf
    }

    obj.copy(buf, 0, 0, len)
    return buf
  }

  if (obj.length !== undefined) {
    if (typeof obj.length !== 'number' || numberIsNaN(obj.length)) {
      return createBuffer(0)
    }
    return fromArrayLike(obj)
  }

  if (obj.type === 'Buffer' && Array.isArray(obj.data)) {
    return fromArrayLike(obj.data)
  }
}

function checked (length) {
  // Note: cannot use `length < K_MAX_LENGTH` here because that fails when
  // length is NaN (which is otherwise coerced to zero.)
  if (length >= K_MAX_LENGTH) {
    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
                         'size: 0x' + K_MAX_LENGTH.toString(16) + ' bytes')
  }
  return length | 0
}

function SlowBuffer (length) {
  if (+length != length) { // eslint-disable-line eqeqeq
    length = 0
  }
  return Buffer.alloc(+length)
}

Buffer.isBuffer = function isBuffer (b) {
  return b != null && b._isBuffer === true &&
    b !== Buffer.prototype // so Buffer.isBuffer(Buffer.prototype) will be false
}

Buffer.compare = function compare (a, b) {
  if (isInstance(a, Uint8Array)) a = Buffer.from(a, a.offset, a.byteLength)
  if (isInstance(b, Uint8Array)) b = Buffer.from(b, b.offset, b.byteLength)
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
    throw new TypeError(
      'The "buf1", "buf2" arguments must be one of type Buffer or Uint8Array'
    )
  }

  if (a === b) return 0

  var x = a.length
  var y = b.length

  for (var i = 0, len = Math.min(x, y); i < len; ++i) {
    if (a[i] !== b[i]) {
      x = a[i]
      y = b[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

Buffer.isEncoding = function isEncoding (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'latin1':
    case 'binary':
    case 'base64':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.concat = function concat (list, length) {
  if (!Array.isArray(list)) {
    throw new TypeError('"list" argument must be an Array of Buffers')
  }

  if (list.length === 0) {
    return Buffer.alloc(0)
  }

  var i
  if (length === undefined) {
    length = 0
    for (i = 0; i < list.length; ++i) {
      length += list[i].length
    }
  }

  var buffer = Buffer.allocUnsafe(length)
  var pos = 0
  for (i = 0; i < list.length; ++i) {
    var buf = list[i]
    if (isInstance(buf, Uint8Array)) {
      buf = Buffer.from(buf)
    }
    if (!Buffer.isBuffer(buf)) {
      throw new TypeError('"list" argument must be an Array of Buffers')
    }
    buf.copy(buffer, pos)
    pos += buf.length
  }
  return buffer
}

function byteLength (string, encoding) {
  if (Buffer.isBuffer(string)) {
    return string.length
  }
  if (ArrayBuffer.isView(string) || isInstance(string, ArrayBuffer)) {
    return string.byteLength
  }
  if (typeof string !== 'string') {
    throw new TypeError(
      'The "string" argument must be one of type string, Buffer, or ArrayBuffer. ' +
      'Received type ' + typeof string
    )
  }

  var len = string.length
  var mustMatch = (arguments.length > 2 && arguments[2] === true)
  if (!mustMatch && len === 0) return 0

  // Use a for loop to avoid recursion
  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'ascii':
      case 'latin1':
      case 'binary':
        return len
      case 'utf8':
      case 'utf-8':
        return utf8ToBytes(string).length
      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return len * 2
      case 'hex':
        return len >>> 1
      case 'base64':
        return base64ToBytes(string).length
      default:
        if (loweredCase) {
          return mustMatch ? -1 : utf8ToBytes(string).length // assume utf8
        }
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}
Buffer.byteLength = byteLength

function slowToString (encoding, start, end) {
  var loweredCase = false

  // No need to verify that "this.length <= MAX_UINT32" since it's a read-only
  // property of a typed array.

  // This behaves neither like String nor Uint8Array in that we set start/end
  // to their upper/lower bounds if the value passed is out of range.
  // undefined is handled specially as per ECMA-262 6th Edition,
  // Section 13.3.3.7 Runtime Semantics: KeyedBindingInitialization.
  if (start === undefined || start < 0) {
    start = 0
  }
  // Return early if start > this.length. Done here to prevent potential uint32
  // coercion fail below.
  if (start > this.length) {
    return ''
  }

  if (end === undefined || end > this.length) {
    end = this.length
  }

  if (end <= 0) {
    return ''
  }

  // Force coersion to uint32. This will also coerce falsey/NaN values to 0.
  end >>>= 0
  start >>>= 0

  if (end <= start) {
    return ''
  }

  if (!encoding) encoding = 'utf8'

  while (true) {
    switch (encoding) {
      case 'hex':
        return hexSlice(this, start, end)

      case 'utf8':
      case 'utf-8':
        return utf8Slice(this, start, end)

      case 'ascii':
        return asciiSlice(this, start, end)

      case 'latin1':
      case 'binary':
        return latin1Slice(this, start, end)

      case 'base64':
        return base64Slice(this, start, end)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return utf16leSlice(this, start, end)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = (encoding + '').toLowerCase()
        loweredCase = true
    }
  }
}

// This property is used by `Buffer.isBuffer` (and the `is-buffer` npm package)
// to detect a Buffer instance. It's not possible to use `instanceof Buffer`
// reliably in a browserify context because there could be multiple different
// copies of the 'buffer' package in use. This method works even for Buffer
// instances that were created from another copy of the `buffer` package.
// See: https://github.com/feross/buffer/issues/154
Buffer.prototype._isBuffer = true

function swap (b, n, m) {
  var i = b[n]
  b[n] = b[m]
  b[m] = i
}

Buffer.prototype.swap16 = function swap16 () {
  var len = this.length
  if (len % 2 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 16-bits')
  }
  for (var i = 0; i < len; i += 2) {
    swap(this, i, i + 1)
  }
  return this
}

Buffer.prototype.swap32 = function swap32 () {
  var len = this.length
  if (len % 4 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 32-bits')
  }
  for (var i = 0; i < len; i += 4) {
    swap(this, i, i + 3)
    swap(this, i + 1, i + 2)
  }
  return this
}

Buffer.prototype.swap64 = function swap64 () {
  var len = this.length
  if (len % 8 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 64-bits')
  }
  for (var i = 0; i < len; i += 8) {
    swap(this, i, i + 7)
    swap(this, i + 1, i + 6)
    swap(this, i + 2, i + 5)
    swap(this, i + 3, i + 4)
  }
  return this
}

Buffer.prototype.toString = function toString () {
  var length = this.length
  if (length === 0) return ''
  if (arguments.length === 0) return utf8Slice(this, 0, length)
  return slowToString.apply(this, arguments)
}

Buffer.prototype.toLocaleString = Buffer.prototype.toString

Buffer.prototype.equals = function equals (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return true
  return Buffer.compare(this, b) === 0
}

Buffer.prototype.inspect = function inspect () {
  var str = ''
  var max = exports.INSPECT_MAX_BYTES
  str = this.toString('hex', 0, max).replace(/(.{2})/g, '$1 ').trim()
  if (this.length > max) str += ' ... '
  return '<Buffer ' + str + '>'
}

Buffer.prototype.compare = function compare (target, start, end, thisStart, thisEnd) {
  if (isInstance(target, Uint8Array)) {
    target = Buffer.from(target, target.offset, target.byteLength)
  }
  if (!Buffer.isBuffer(target)) {
    throw new TypeError(
      'The "target" argument must be one of type Buffer or Uint8Array. ' +
      'Received type ' + (typeof target)
    )
  }

  if (start === undefined) {
    start = 0
  }
  if (end === undefined) {
    end = target ? target.length : 0
  }
  if (thisStart === undefined) {
    thisStart = 0
  }
  if (thisEnd === undefined) {
    thisEnd = this.length
  }

  if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
    throw new RangeError('out of range index')
  }

  if (thisStart >= thisEnd && start >= end) {
    return 0
  }
  if (thisStart >= thisEnd) {
    return -1
  }
  if (start >= end) {
    return 1
  }

  start >>>= 0
  end >>>= 0
  thisStart >>>= 0
  thisEnd >>>= 0

  if (this === target) return 0

  var x = thisEnd - thisStart
  var y = end - start
  var len = Math.min(x, y)

  var thisCopy = this.slice(thisStart, thisEnd)
  var targetCopy = target.slice(start, end)

  for (var i = 0; i < len; ++i) {
    if (thisCopy[i] !== targetCopy[i]) {
      x = thisCopy[i]
      y = targetCopy[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

// Finds either the first index of `val` in `buffer` at offset >= `byteOffset`,
// OR the last index of `val` in `buffer` at offset <= `byteOffset`.
//
// Arguments:
// - buffer - a Buffer to search
// - val - a string, Buffer, or number
// - byteOffset - an index into `buffer`; will be clamped to an int32
// - encoding - an optional encoding, relevant is val is a string
// - dir - true for indexOf, false for lastIndexOf
function bidirectionalIndexOf (buffer, val, byteOffset, encoding, dir) {
  // Empty buffer means no match
  if (buffer.length === 0) return -1

  // Normalize byteOffset
  if (typeof byteOffset === 'string') {
    encoding = byteOffset
    byteOffset = 0
  } else if (byteOffset > 0x7fffffff) {
    byteOffset = 0x7fffffff
  } else if (byteOffset < -0x80000000) {
    byteOffset = -0x80000000
  }
  byteOffset = +byteOffset // Coerce to Number.
  if (numberIsNaN(byteOffset)) {
    // byteOffset: it it's undefined, null, NaN, "foo", etc, search whole buffer
    byteOffset = dir ? 0 : (buffer.length - 1)
  }

  // Normalize byteOffset: negative offsets start from the end of the buffer
  if (byteOffset < 0) byteOffset = buffer.length + byteOffset
  if (byteOffset >= buffer.length) {
    if (dir) return -1
    else byteOffset = buffer.length - 1
  } else if (byteOffset < 0) {
    if (dir) byteOffset = 0
    else return -1
  }

  // Normalize val
  if (typeof val === 'string') {
    val = Buffer.from(val, encoding)
  }

  // Finally, search either indexOf (if dir is true) or lastIndexOf
  if (Buffer.isBuffer(val)) {
    // Special case: looking for empty string/buffer always fails
    if (val.length === 0) {
      return -1
    }
    return arrayIndexOf(buffer, val, byteOffset, encoding, dir)
  } else if (typeof val === 'number') {
    val = val & 0xFF // Search for a byte value [0-255]
    if (typeof Uint8Array.prototype.indexOf === 'function') {
      if (dir) {
        return Uint8Array.prototype.indexOf.call(buffer, val, byteOffset)
      } else {
        return Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset)
      }
    }
    return arrayIndexOf(buffer, [ val ], byteOffset, encoding, dir)
  }

  throw new TypeError('val must be string, number or Buffer')
}

function arrayIndexOf (arr, val, byteOffset, encoding, dir) {
  var indexSize = 1
  var arrLength = arr.length
  var valLength = val.length

  if (encoding !== undefined) {
    encoding = String(encoding).toLowerCase()
    if (encoding === 'ucs2' || encoding === 'ucs-2' ||
        encoding === 'utf16le' || encoding === 'utf-16le') {
      if (arr.length < 2 || val.length < 2) {
        return -1
      }
      indexSize = 2
      arrLength /= 2
      valLength /= 2
      byteOffset /= 2
    }
  }

  function read (buf, i) {
    if (indexSize === 1) {
      return buf[i]
    } else {
      return buf.readUInt16BE(i * indexSize)
    }
  }

  var i
  if (dir) {
    var foundIndex = -1
    for (i = byteOffset; i < arrLength; i++) {
      if (read(arr, i) === read(val, foundIndex === -1 ? 0 : i - foundIndex)) {
        if (foundIndex === -1) foundIndex = i
        if (i - foundIndex + 1 === valLength) return foundIndex * indexSize
      } else {
        if (foundIndex !== -1) i -= i - foundIndex
        foundIndex = -1
      }
    }
  } else {
    if (byteOffset + valLength > arrLength) byteOffset = arrLength - valLength
    for (i = byteOffset; i >= 0; i--) {
      var found = true
      for (var j = 0; j < valLength; j++) {
        if (read(arr, i + j) !== read(val, j)) {
          found = false
          break
        }
      }
      if (found) return i
    }
  }

  return -1
}

Buffer.prototype.includes = function includes (val, byteOffset, encoding) {
  return this.indexOf(val, byteOffset, encoding) !== -1
}

Buffer.prototype.indexOf = function indexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, true)
}

Buffer.prototype.lastIndexOf = function lastIndexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, false)
}

function hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  var strLen = string.length

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; ++i) {
    var parsed = parseInt(string.substr(i * 2, 2), 16)
    if (numberIsNaN(parsed)) return i
    buf[offset + i] = parsed
  }
  return i
}

function utf8Write (buf, string, offset, length) {
  return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
}

function asciiWrite (buf, string, offset, length) {
  return blitBuffer(asciiToBytes(string), buf, offset, length)
}

function latin1Write (buf, string, offset, length) {
  return asciiWrite(buf, string, offset, length)
}

function base64Write (buf, string, offset, length) {
  return blitBuffer(base64ToBytes(string), buf, offset, length)
}

function ucs2Write (buf, string, offset, length) {
  return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
}

Buffer.prototype.write = function write (string, offset, length, encoding) {
  // Buffer#write(string)
  if (offset === undefined) {
    encoding = 'utf8'
    length = this.length
    offset = 0
  // Buffer#write(string, encoding)
  } else if (length === undefined && typeof offset === 'string') {
    encoding = offset
    length = this.length
    offset = 0
  // Buffer#write(string, offset[, length][, encoding])
  } else if (isFinite(offset)) {
    offset = offset >>> 0
    if (isFinite(length)) {
      length = length >>> 0
      if (encoding === undefined) encoding = 'utf8'
    } else {
      encoding = length
      length = undefined
    }
  } else {
    throw new Error(
      'Buffer.write(string, encoding, offset[, length]) is no longer supported'
    )
  }

  var remaining = this.length - offset
  if (length === undefined || length > remaining) length = remaining

  if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
    throw new RangeError('Attempt to write outside buffer bounds')
  }

  if (!encoding) encoding = 'utf8'

  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'hex':
        return hexWrite(this, string, offset, length)

      case 'utf8':
      case 'utf-8':
        return utf8Write(this, string, offset, length)

      case 'ascii':
        return asciiWrite(this, string, offset, length)

      case 'latin1':
      case 'binary':
        return latin1Write(this, string, offset, length)

      case 'base64':
        // Warning: maxLength not taken into account in base64Write
        return base64Write(this, string, offset, length)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return ucs2Write(this, string, offset, length)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}

Buffer.prototype.toJSON = function toJSON () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

function base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function utf8Slice (buf, start, end) {
  end = Math.min(buf.length, end)
  var res = []

  var i = start
  while (i < end) {
    var firstByte = buf[i]
    var codePoint = null
    var bytesPerSequence = (firstByte > 0xEF) ? 4
      : (firstByte > 0xDF) ? 3
        : (firstByte > 0xBF) ? 2
          : 1

    if (i + bytesPerSequence <= end) {
      var secondByte, thirdByte, fourthByte, tempCodePoint

      switch (bytesPerSequence) {
        case 1:
          if (firstByte < 0x80) {
            codePoint = firstByte
          }
          break
        case 2:
          secondByte = buf[i + 1]
          if ((secondByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F)
            if (tempCodePoint > 0x7F) {
              codePoint = tempCodePoint
            }
          }
          break
        case 3:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F)
            if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
              codePoint = tempCodePoint
            }
          }
          break
        case 4:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          fourthByte = buf[i + 3]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F)
            if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
              codePoint = tempCodePoint
            }
          }
      }
    }

    if (codePoint === null) {
      // we did not generate a valid codePoint so insert a
      // replacement char (U+FFFD) and advance only 1 byte
      codePoint = 0xFFFD
      bytesPerSequence = 1
    } else if (codePoint > 0xFFFF) {
      // encode to utf16 (surrogate pair dance)
      codePoint -= 0x10000
      res.push(codePoint >>> 10 & 0x3FF | 0xD800)
      codePoint = 0xDC00 | codePoint & 0x3FF
    }

    res.push(codePoint)
    i += bytesPerSequence
  }

  return decodeCodePointsArray(res)
}

// Based on http://stackoverflow.com/a/22747272/680742, the browser with
// the lowest limit is Chrome, with 0x10000 args.
// We go 1 magnitude less, for safety
var MAX_ARGUMENTS_LENGTH = 0x1000

function decodeCodePointsArray (codePoints) {
  var len = codePoints.length
  if (len <= MAX_ARGUMENTS_LENGTH) {
    return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
  }

  // Decode in chunks to avoid "call stack size exceeded".
  var res = ''
  var i = 0
  while (i < len) {
    res += String.fromCharCode.apply(
      String,
      codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
    )
  }
  return res
}

function asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i] & 0x7F)
  }
  return ret
}

function latin1Slice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i])
  }
  return ret
}

function hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; ++i) {
    out += toHex(buf[i])
  }
  return out
}

function utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + (bytes[i + 1] * 256))
  }
  return res
}

Buffer.prototype.slice = function slice (start, end) {
  var len = this.length
  start = ~~start
  end = end === undefined ? len : ~~end

  if (start < 0) {
    start += len
    if (start < 0) start = 0
  } else if (start > len) {
    start = len
  }

  if (end < 0) {
    end += len
    if (end < 0) end = 0
  } else if (end > len) {
    end = len
  }

  if (end < start) end = start

  var newBuf = this.subarray(start, end)
  // Return an augmented `Uint8Array` instance
  newBuf.__proto__ = Buffer.prototype
  return newBuf
}

/*
 * Need to make sure that buffer isn't trying to write out of bounds.
 */
function checkOffset (offset, ext, length) {
  if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
  if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
}

Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }

  return val
}

Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    checkOffset(offset, byteLength, this.length)
  }

  var val = this[offset + --byteLength]
  var mul = 1
  while (byteLength > 0 && (mul *= 0x100)) {
    val += this[offset + --byteLength] * mul
  }

  return val
}

Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  return this[offset]
}

Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return this[offset] | (this[offset + 1] << 8)
}

Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return (this[offset] << 8) | this[offset + 1]
}

Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return ((this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16)) +
      (this[offset + 3] * 0x1000000)
}

Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] * 0x1000000) +
    ((this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    this[offset + 3])
}

Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var i = byteLength
  var mul = 1
  var val = this[offset + --i]
  while (i > 0 && (mul *= 0x100)) {
    val += this[offset + --i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  if (!(this[offset] & 0x80)) return (this[offset])
  return ((0xff - this[offset] + 1) * -1)
}

Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset] | (this[offset + 1] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset + 1] | (this[offset] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset]) |
    (this[offset + 1] << 8) |
    (this[offset + 2] << 16) |
    (this[offset + 3] << 24)
}

Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] << 24) |
    (this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    (this[offset + 3])
}

Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, true, 23, 4)
}

Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, false, 23, 4)
}

Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, true, 52, 8)
}

Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, false, 52, 8)
}

function checkInt (buf, value, offset, ext, max, min) {
  if (!Buffer.isBuffer(buf)) throw new TypeError('"buffer" argument must be a Buffer instance')
  if (value > max || value < min) throw new RangeError('"value" argument is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
}

Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var mul = 1
  var i = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var i = byteLength - 1
  var mul = 1
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0)
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset + 3] = (value >>> 24)
  this[offset + 2] = (value >>> 16)
  this[offset + 1] = (value >>> 8)
  this[offset] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = 0
  var mul = 1
  var sub = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = byteLength - 1
  var mul = 1
  var sub = 0
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80)
  if (value < 0) value = 0xff + value + 1
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  this[offset + 2] = (value >>> 16)
  this[offset + 3] = (value >>> 24)
  return offset + 4
}

Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (value < 0) value = 0xffffffff + value + 1
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

function checkIEEE754 (buf, value, offset, ext, max, min) {
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
  if (offset < 0) throw new RangeError('Index out of range')
}

function writeFloat (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }
  ieee754.write(buf, value, offset, littleEndian, 23, 4)
  return offset + 4
}

Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
  return writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
  return writeFloat(this, value, offset, false, noAssert)
}

function writeDouble (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }
  ieee754.write(buf, value, offset, littleEndian, 52, 8)
  return offset + 8
}

Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
  return writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
  return writeDouble(this, value, offset, false, noAssert)
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function copy (target, targetStart, start, end) {
  if (!Buffer.isBuffer(target)) throw new TypeError('argument should be a Buffer')
  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (targetStart >= target.length) targetStart = target.length
  if (!targetStart) targetStart = 0
  if (end > 0 && end < start) end = start

  // Copy 0 bytes; we're done
  if (end === start) return 0
  if (target.length === 0 || this.length === 0) return 0

  // Fatal error conditions
  if (targetStart < 0) {
    throw new RangeError('targetStart out of bounds')
  }
  if (start < 0 || start >= this.length) throw new RangeError('Index out of range')
  if (end < 0) throw new RangeError('sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length) end = this.length
  if (target.length - targetStart < end - start) {
    end = target.length - targetStart + start
  }

  var len = end - start

  if (this === target && typeof Uint8Array.prototype.copyWithin === 'function') {
    // Use built-in when available, missing from IE11
    this.copyWithin(targetStart, start, end)
  } else if (this === target && start < targetStart && targetStart < end) {
    // descending copy from end
    for (var i = len - 1; i >= 0; --i) {
      target[i + targetStart] = this[i + start]
    }
  } else {
    Uint8Array.prototype.set.call(
      target,
      this.subarray(start, end),
      targetStart
    )
  }

  return len
}

// Usage:
//    buffer.fill(number[, offset[, end]])
//    buffer.fill(buffer[, offset[, end]])
//    buffer.fill(string[, offset[, end]][, encoding])
Buffer.prototype.fill = function fill (val, start, end, encoding) {
  // Handle string cases:
  if (typeof val === 'string') {
    if (typeof start === 'string') {
      encoding = start
      start = 0
      end = this.length
    } else if (typeof end === 'string') {
      encoding = end
      end = this.length
    }
    if (encoding !== undefined && typeof encoding !== 'string') {
      throw new TypeError('encoding must be a string')
    }
    if (typeof encoding === 'string' && !Buffer.isEncoding(encoding)) {
      throw new TypeError('Unknown encoding: ' + encoding)
    }
    if (val.length === 1) {
      var code = val.charCodeAt(0)
      if ((encoding === 'utf8' && code < 128) ||
          encoding === 'latin1') {
        // Fast path: If `val` fits into a single byte, use that numeric value.
        val = code
      }
    }
  } else if (typeof val === 'number') {
    val = val & 255
  }

  // Invalid ranges are not set to a default, so can range check early.
  if (start < 0 || this.length < start || this.length < end) {
    throw new RangeError('Out of range index')
  }

  if (end <= start) {
    return this
  }

  start = start >>> 0
  end = end === undefined ? this.length : end >>> 0

  if (!val) val = 0

  var i
  if (typeof val === 'number') {
    for (i = start; i < end; ++i) {
      this[i] = val
    }
  } else {
    var bytes = Buffer.isBuffer(val)
      ? val
      : Buffer.from(val, encoding)
    var len = bytes.length
    if (len === 0) {
      throw new TypeError('The value "' + val +
        '" is invalid for argument "value"')
    }
    for (i = 0; i < end - start; ++i) {
      this[i + start] = bytes[i % len]
    }
  }

  return this
}

// HELPER FUNCTIONS
// ================

var INVALID_BASE64_RE = /[^+/0-9A-Za-z-_]/g

function base64clean (str) {
  // Node takes equal signs as end of the Base64 encoding
  str = str.split('=')[0]
  // Node strips out invalid characters like \n and \t from the string, base64-js does not
  str = str.trim().replace(INVALID_BASE64_RE, '')
  // Node converts strings with length < 2 to ''
  if (str.length < 2) return ''
  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
  while (str.length % 4 !== 0) {
    str = str + '='
  }
  return str
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (string, units) {
  units = units || Infinity
  var codePoint
  var length = string.length
  var leadSurrogate = null
  var bytes = []

  for (var i = 0; i < length; ++i) {
    codePoint = string.charCodeAt(i)

    // is surrogate component
    if (codePoint > 0xD7FF && codePoint < 0xE000) {
      // last char was a lead
      if (!leadSurrogate) {
        // no lead yet
        if (codePoint > 0xDBFF) {
          // unexpected trail
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        } else if (i + 1 === length) {
          // unpaired lead
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        }

        // valid lead
        leadSurrogate = codePoint

        continue
      }

      // 2 leads in a row
      if (codePoint < 0xDC00) {
        if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
        leadSurrogate = codePoint
        continue
      }

      // valid surrogate pair
      codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000
    } else if (leadSurrogate) {
      // valid bmp char, but last char was a lead
      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
    }

    leadSurrogate = null

    // encode utf8
    if (codePoint < 0x80) {
      if ((units -= 1) < 0) break
      bytes.push(codePoint)
    } else if (codePoint < 0x800) {
      if ((units -= 2) < 0) break
      bytes.push(
        codePoint >> 0x6 | 0xC0,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x10000) {
      if ((units -= 3) < 0) break
      bytes.push(
        codePoint >> 0xC | 0xE0,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x110000) {
      if ((units -= 4) < 0) break
      bytes.push(
        codePoint >> 0x12 | 0xF0,
        codePoint >> 0xC & 0x3F | 0x80,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else {
      throw new Error('Invalid code point')
    }
  }

  return bytes
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str, units) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    if ((units -= 2) < 0) break

    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(base64clean(str))
}

function blitBuffer (src, dst, offset, length) {
  for (var i = 0; i < length; ++i) {
    if ((i + offset >= dst.length) || (i >= src.length)) break
    dst[i + offset] = src[i]
  }
  return i
}

// ArrayBuffer or Uint8Array objects from other contexts (i.e. iframes) do not pass
// the `instanceof` check but they should be treated as of that type.
// See: https://github.com/feross/buffer/issues/166
function isInstance (obj, type) {
  return obj instanceof type ||
    (obj != null && obj.constructor != null && obj.constructor.name != null &&
      obj.constructor.name === type.name)
}
function numberIsNaN (obj) {
  // For IE11 support
  return obj !== obj // eslint-disable-line no-self-compare
}

}).call(this)}).call(this,require("buffer").Buffer)
},{"base64-js":2,"buffer":3,"ieee754":39}],4:[function(require,module,exports){
'use strict';

var bind = require('function-bind');

var $apply = require('./functionApply');
var $call = require('./functionCall');
var $reflectApply = require('./reflectApply');

/** @type {import('./actualApply')} */
module.exports = $reflectApply || bind.call($call, $apply);

},{"./functionApply":6,"./functionCall":7,"./reflectApply":9,"function-bind":26}],5:[function(require,module,exports){
'use strict';

var bind = require('function-bind');
var $apply = require('./functionApply');
var actualApply = require('./actualApply');

/** @type {import('./applyBind')} */
module.exports = function applyBind() {
	return actualApply(bind, $apply, arguments);
};

},{"./actualApply":4,"./functionApply":6,"function-bind":26}],6:[function(require,module,exports){
'use strict';

/** @type {import('./functionApply')} */
module.exports = Function.prototype.apply;

},{}],7:[function(require,module,exports){
'use strict';

/** @type {import('./functionCall')} */
module.exports = Function.prototype.call;

},{}],8:[function(require,module,exports){
'use strict';

var bind = require('function-bind');
var $TypeError = require('es-errors/type');

var $call = require('./functionCall');
var $actualApply = require('./actualApply');

/** @type {(args: [Function, thisArg?: unknown, ...args: unknown[]]) => Function} TODO FIXME, find a way to use import('.') */
module.exports = function callBindBasic(args) {
	if (args.length < 1 || typeof args[0] !== 'function') {
		throw new $TypeError('a function is required');
	}
	return $actualApply(bind, $call, args);
};

},{"./actualApply":4,"./functionCall":7,"es-errors/type":20,"function-bind":26}],9:[function(require,module,exports){
'use strict';

/** @type {import('./reflectApply')} */
module.exports = typeof Reflect !== 'undefined' && Reflect && Reflect.apply;

},{}],10:[function(require,module,exports){
'use strict';

var setFunctionLength = require('set-function-length');

var $defineProperty = require('es-define-property');

var callBindBasic = require('call-bind-apply-helpers');
var applyBind = require('call-bind-apply-helpers/applyBind');

module.exports = function callBind(originalFunction) {
	var func = callBindBasic(arguments);
	var adjustedLength = originalFunction.length - (arguments.length - 1);
	return setFunctionLength(
		func,
		1 + (adjustedLength > 0 ? adjustedLength : 0),
		true
	);
};

if ($defineProperty) {
	$defineProperty(module.exports, 'apply', { value: applyBind });
} else {
	module.exports.apply = applyBind;
}

},{"call-bind-apply-helpers":8,"call-bind-apply-helpers/applyBind":5,"es-define-property":14,"set-function-length":57}],11:[function(require,module,exports){
'use strict';

var GetIntrinsic = require('get-intrinsic');

var callBindBasic = require('call-bind-apply-helpers');

/** @type {(thisArg: string, searchString: string, position?: number) => number} */
var $indexOf = callBindBasic([GetIntrinsic('%String.prototype.indexOf%')]);

/** @type {import('.')} */
module.exports = function callBoundIntrinsic(name, allowMissing) {
	/* eslint no-extra-parens: 0 */

	var intrinsic = /** @type {(this: unknown, ...args: unknown[]) => unknown} */ (GetIntrinsic(name, !!allowMissing));
	if (typeof intrinsic === 'function' && $indexOf(name, '.prototype.') > -1) {
		return callBindBasic(/** @type {const} */ ([intrinsic]));
	}
	return intrinsic;
};

},{"call-bind-apply-helpers":8,"get-intrinsic":28}],12:[function(require,module,exports){
'use strict';

var $defineProperty = require('es-define-property');

var $SyntaxError = require('es-errors/syntax');
var $TypeError = require('es-errors/type');

var gopd = require('gopd');

/** @type {import('.')} */
module.exports = function defineDataProperty(
	obj,
	property,
	value
) {
	if (!obj || (typeof obj !== 'object' && typeof obj !== 'function')) {
		throw new $TypeError('`obj` must be an object or a function`');
	}
	if (typeof property !== 'string' && typeof property !== 'symbol') {
		throw new $TypeError('`property` must be a string or a symbol`');
	}
	if (arguments.length > 3 && typeof arguments[3] !== 'boolean' && arguments[3] !== null) {
		throw new $TypeError('`nonEnumerable`, if provided, must be a boolean or null');
	}
	if (arguments.length > 4 && typeof arguments[4] !== 'boolean' && arguments[4] !== null) {
		throw new $TypeError('`nonWritable`, if provided, must be a boolean or null');
	}
	if (arguments.length > 5 && typeof arguments[5] !== 'boolean' && arguments[5] !== null) {
		throw new $TypeError('`nonConfigurable`, if provided, must be a boolean or null');
	}
	if (arguments.length > 6 && typeof arguments[6] !== 'boolean') {
		throw new $TypeError('`loose`, if provided, must be a boolean');
	}

	var nonEnumerable = arguments.length > 3 ? arguments[3] : null;
	var nonWritable = arguments.length > 4 ? arguments[4] : null;
	var nonConfigurable = arguments.length > 5 ? arguments[5] : null;
	var loose = arguments.length > 6 ? arguments[6] : false;

	/* @type {false | TypedPropertyDescriptor<unknown>} */
	var desc = !!gopd && gopd(obj, property);

	if ($defineProperty) {
		$defineProperty(obj, property, {
			configurable: nonConfigurable === null && desc ? desc.configurable : !nonConfigurable,
			enumerable: nonEnumerable === null && desc ? desc.enumerable : !nonEnumerable,
			value: value,
			writable: nonWritable === null && desc ? desc.writable : !nonWritable
		});
	} else if (loose || (!nonEnumerable && !nonWritable && !nonConfigurable)) {
		// must fall back to [[Set]], and was not explicitly asked to make non-enumerable, non-writable, or non-configurable
		obj[property] = value; // eslint-disable-line no-param-reassign
	} else {
		throw new $SyntaxError('This environment does not support defining a property as non-configurable, non-writable, or non-enumerable.');
	}
};

},{"es-define-property":14,"es-errors/syntax":19,"es-errors/type":20,"gopd":33}],13:[function(require,module,exports){
'use strict';

var callBind = require('call-bind-apply-helpers');
var gOPD = require('gopd');

var hasProtoAccessor;
try {
	// eslint-disable-next-line no-extra-parens, no-proto
	hasProtoAccessor = /** @type {{ __proto__?: typeof Array.prototype }} */ ([]).__proto__ === Array.prototype;
} catch (e) {
	if (!e || typeof e !== 'object' || !('code' in e) || e.code !== 'ERR_PROTO_ACCESS') {
		throw e;
	}
}

// eslint-disable-next-line no-extra-parens
var desc = !!hasProtoAccessor && gOPD && gOPD(Object.prototype, /** @type {keyof typeof Object.prototype} */ ('__proto__'));

var $Object = Object;
var $getPrototypeOf = $Object.getPrototypeOf;

/** @type {import('./get')} */
module.exports = desc && typeof desc.get === 'function'
	? callBind([desc.get])
	: typeof $getPrototypeOf === 'function'
		? /** @type {import('./get')} */ function getDunder(value) {
			// eslint-disable-next-line eqeqeq
			return $getPrototypeOf(value == null ? value : $Object(value));
		}
		: false;

},{"call-bind-apply-helpers":8,"gopd":33}],14:[function(require,module,exports){
'use strict';

/** @type {import('.')} */
var $defineProperty = Object.defineProperty || false;
if ($defineProperty) {
	try {
		$defineProperty({}, 'a', { value: 1 });
	} catch (e) {
		// IE 8 has a broken defineProperty
		$defineProperty = false;
	}
}

module.exports = $defineProperty;

},{}],15:[function(require,module,exports){
'use strict';

/** @type {import('./eval')} */
module.exports = EvalError;

},{}],16:[function(require,module,exports){
'use strict';

/** @type {import('.')} */
module.exports = Error;

},{}],17:[function(require,module,exports){
'use strict';

/** @type {import('./range')} */
module.exports = RangeError;

},{}],18:[function(require,module,exports){
'use strict';

/** @type {import('./ref')} */
module.exports = ReferenceError;

},{}],19:[function(require,module,exports){
'use strict';

/** @type {import('./syntax')} */
module.exports = SyntaxError;

},{}],20:[function(require,module,exports){
'use strict';

/** @type {import('./type')} */
module.exports = TypeError;

},{}],21:[function(require,module,exports){
'use strict';

/** @type {import('./uri')} */
module.exports = URIError;

},{}],22:[function(require,module,exports){
'use strict';

/** @type {import('.')} */
module.exports = Object;

},{}],23:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

'use strict';

var R = typeof Reflect === 'object' ? Reflect : null
var ReflectApply = R && typeof R.apply === 'function'
  ? R.apply
  : function ReflectApply(target, receiver, args) {
    return Function.prototype.apply.call(target, receiver, args);
  }

var ReflectOwnKeys
if (R && typeof R.ownKeys === 'function') {
  ReflectOwnKeys = R.ownKeys
} else if (Object.getOwnPropertySymbols) {
  ReflectOwnKeys = function ReflectOwnKeys(target) {
    return Object.getOwnPropertyNames(target)
      .concat(Object.getOwnPropertySymbols(target));
  };
} else {
  ReflectOwnKeys = function ReflectOwnKeys(target) {
    return Object.getOwnPropertyNames(target);
  };
}

function ProcessEmitWarning(warning) {
  if (console && console.warn) console.warn(warning);
}

var NumberIsNaN = Number.isNaN || function NumberIsNaN(value) {
  return value !== value;
}

function EventEmitter() {
  EventEmitter.init.call(this);
}
module.exports = EventEmitter;
module.exports.once = once;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._eventsCount = 0;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
var defaultMaxListeners = 10;

function checkListener(listener) {
  if (typeof listener !== 'function') {
    throw new TypeError('The "listener" argument must be of type Function. Received type ' + typeof listener);
  }
}

Object.defineProperty(EventEmitter, 'defaultMaxListeners', {
  enumerable: true,
  get: function() {
    return defaultMaxListeners;
  },
  set: function(arg) {
    if (typeof arg !== 'number' || arg < 0 || NumberIsNaN(arg)) {
      throw new RangeError('The value of "defaultMaxListeners" is out of range. It must be a non-negative number. Received ' + arg + '.');
    }
    defaultMaxListeners = arg;
  }
});

EventEmitter.init = function() {

  if (this._events === undefined ||
      this._events === Object.getPrototypeOf(this)._events) {
    this._events = Object.create(null);
    this._eventsCount = 0;
  }

  this._maxListeners = this._maxListeners || undefined;
};

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function setMaxListeners(n) {
  if (typeof n !== 'number' || n < 0 || NumberIsNaN(n)) {
    throw new RangeError('The value of "n" is out of range. It must be a non-negative number. Received ' + n + '.');
  }
  this._maxListeners = n;
  return this;
};

function _getMaxListeners(that) {
  if (that._maxListeners === undefined)
    return EventEmitter.defaultMaxListeners;
  return that._maxListeners;
}

EventEmitter.prototype.getMaxListeners = function getMaxListeners() {
  return _getMaxListeners(this);
};

EventEmitter.prototype.emit = function emit(type) {
  var args = [];
  for (var i = 1; i < arguments.length; i++) args.push(arguments[i]);
  var doError = (type === 'error');

  var events = this._events;
  if (events !== undefined)
    doError = (doError && events.error === undefined);
  else if (!doError)
    return false;

  // If there is no 'error' event listener then throw.
  if (doError) {
    var er;
    if (args.length > 0)
      er = args[0];
    if (er instanceof Error) {
      // Note: The comments on the `throw` lines are intentional, they show
      // up in Node's output if this results in an unhandled exception.
      throw er; // Unhandled 'error' event
    }
    // At least give some kind of context to the user
    var err = new Error('Unhandled error.' + (er ? ' (' + er.message + ')' : ''));
    err.context = er;
    throw err; // Unhandled 'error' event
  }

  var handler = events[type];

  if (handler === undefined)
    return false;

  if (typeof handler === 'function') {
    ReflectApply(handler, this, args);
  } else {
    var len = handler.length;
    var listeners = arrayClone(handler, len);
    for (var i = 0; i < len; ++i)
      ReflectApply(listeners[i], this, args);
  }

  return true;
};

function _addListener(target, type, listener, prepend) {
  var m;
  var events;
  var existing;

  checkListener(listener);

  events = target._events;
  if (events === undefined) {
    events = target._events = Object.create(null);
    target._eventsCount = 0;
  } else {
    // To avoid recursion in the case that type === "newListener"! Before
    // adding it to the listeners, first emit "newListener".
    if (events.newListener !== undefined) {
      target.emit('newListener', type,
                  listener.listener ? listener.listener : listener);

      // Re-assign `events` because a newListener handler could have caused the
      // this._events to be assigned to a new object
      events = target._events;
    }
    existing = events[type];
  }

  if (existing === undefined) {
    // Optimize the case of one listener. Don't need the extra array object.
    existing = events[type] = listener;
    ++target._eventsCount;
  } else {
    if (typeof existing === 'function') {
      // Adding the second element, need to change to array.
      existing = events[type] =
        prepend ? [listener, existing] : [existing, listener];
      // If we've already got an array, just append.
    } else if (prepend) {
      existing.unshift(listener);
    } else {
      existing.push(listener);
    }

    // Check for listener leak
    m = _getMaxListeners(target);
    if (m > 0 && existing.length > m && !existing.warned) {
      existing.warned = true;
      // No error code for this since it is a Warning
      // eslint-disable-next-line no-restricted-syntax
      var w = new Error('Possible EventEmitter memory leak detected. ' +
                          existing.length + ' ' + String(type) + ' listeners ' +
                          'added. Use emitter.setMaxListeners() to ' +
                          'increase limit');
      w.name = 'MaxListenersExceededWarning';
      w.emitter = target;
      w.type = type;
      w.count = existing.length;
      ProcessEmitWarning(w);
    }
  }

  return target;
}

EventEmitter.prototype.addListener = function addListener(type, listener) {
  return _addListener(this, type, listener, false);
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.prependListener =
    function prependListener(type, listener) {
      return _addListener(this, type, listener, true);
    };

function onceWrapper() {
  if (!this.fired) {
    this.target.removeListener(this.type, this.wrapFn);
    this.fired = true;
    if (arguments.length === 0)
      return this.listener.call(this.target);
    return this.listener.apply(this.target, arguments);
  }
}

function _onceWrap(target, type, listener) {
  var state = { fired: false, wrapFn: undefined, target: target, type: type, listener: listener };
  var wrapped = onceWrapper.bind(state);
  wrapped.listener = listener;
  state.wrapFn = wrapped;
  return wrapped;
}

EventEmitter.prototype.once = function once(type, listener) {
  checkListener(listener);
  this.on(type, _onceWrap(this, type, listener));
  return this;
};

EventEmitter.prototype.prependOnceListener =
    function prependOnceListener(type, listener) {
      checkListener(listener);
      this.prependListener(type, _onceWrap(this, type, listener));
      return this;
    };

// Emits a 'removeListener' event if and only if the listener was removed.
EventEmitter.prototype.removeListener =
    function removeListener(type, listener) {
      var list, events, position, i, originalListener;

      checkListener(listener);

      events = this._events;
      if (events === undefined)
        return this;

      list = events[type];
      if (list === undefined)
        return this;

      if (list === listener || list.listener === listener) {
        if (--this._eventsCount === 0)
          this._events = Object.create(null);
        else {
          delete events[type];
          if (events.removeListener)
            this.emit('removeListener', type, list.listener || listener);
        }
      } else if (typeof list !== 'function') {
        position = -1;

        for (i = list.length - 1; i >= 0; i--) {
          if (list[i] === listener || list[i].listener === listener) {
            originalListener = list[i].listener;
            position = i;
            break;
          }
        }

        if (position < 0)
          return this;

        if (position === 0)
          list.shift();
        else {
          spliceOne(list, position);
        }

        if (list.length === 1)
          events[type] = list[0];

        if (events.removeListener !== undefined)
          this.emit('removeListener', type, originalListener || listener);
      }

      return this;
    };

EventEmitter.prototype.off = EventEmitter.prototype.removeListener;

EventEmitter.prototype.removeAllListeners =
    function removeAllListeners(type) {
      var listeners, events, i;

      events = this._events;
      if (events === undefined)
        return this;

      // not listening for removeListener, no need to emit
      if (events.removeListener === undefined) {
        if (arguments.length === 0) {
          this._events = Object.create(null);
          this._eventsCount = 0;
        } else if (events[type] !== undefined) {
          if (--this._eventsCount === 0)
            this._events = Object.create(null);
          else
            delete events[type];
        }
        return this;
      }

      // emit removeListener for all listeners on all events
      if (arguments.length === 0) {
        var keys = Object.keys(events);
        var key;
        for (i = 0; i < keys.length; ++i) {
          key = keys[i];
          if (key === 'removeListener') continue;
          this.removeAllListeners(key);
        }
        this.removeAllListeners('removeListener');
        this._events = Object.create(null);
        this._eventsCount = 0;
        return this;
      }

      listeners = events[type];

      if (typeof listeners === 'function') {
        this.removeListener(type, listeners);
      } else if (listeners !== undefined) {
        // LIFO order
        for (i = listeners.length - 1; i >= 0; i--) {
          this.removeListener(type, listeners[i]);
        }
      }

      return this;
    };

function _listeners(target, type, unwrap) {
  var events = target._events;

  if (events === undefined)
    return [];

  var evlistener = events[type];
  if (evlistener === undefined)
    return [];

  if (typeof evlistener === 'function')
    return unwrap ? [evlistener.listener || evlistener] : [evlistener];

  return unwrap ?
    unwrapListeners(evlistener) : arrayClone(evlistener, evlistener.length);
}

EventEmitter.prototype.listeners = function listeners(type) {
  return _listeners(this, type, true);
};

EventEmitter.prototype.rawListeners = function rawListeners(type) {
  return _listeners(this, type, false);
};

EventEmitter.listenerCount = function(emitter, type) {
  if (typeof emitter.listenerCount === 'function') {
    return emitter.listenerCount(type);
  } else {
    return listenerCount.call(emitter, type);
  }
};

EventEmitter.prototype.listenerCount = listenerCount;
function listenerCount(type) {
  var events = this._events;

  if (events !== undefined) {
    var evlistener = events[type];

    if (typeof evlistener === 'function') {
      return 1;
    } else if (evlistener !== undefined) {
      return evlistener.length;
    }
  }

  return 0;
}

EventEmitter.prototype.eventNames = function eventNames() {
  return this._eventsCount > 0 ? ReflectOwnKeys(this._events) : [];
};

function arrayClone(arr, n) {
  var copy = new Array(n);
  for (var i = 0; i < n; ++i)
    copy[i] = arr[i];
  return copy;
}

function spliceOne(list, index) {
  for (; index + 1 < list.length; index++)
    list[index] = list[index + 1];
  list.pop();
}

function unwrapListeners(arr) {
  var ret = new Array(arr.length);
  for (var i = 0; i < ret.length; ++i) {
    ret[i] = arr[i].listener || arr[i];
  }
  return ret;
}

function once(emitter, name) {
  return new Promise(function (resolve, reject) {
    function errorListener(err) {
      emitter.removeListener(name, resolver);
      reject(err);
    }

    function resolver() {
      if (typeof emitter.removeListener === 'function') {
        emitter.removeListener('error', errorListener);
      }
      resolve([].slice.call(arguments));
    };

    eventTargetAgnosticAddListener(emitter, name, resolver, { once: true });
    if (name !== 'error') {
      addErrorHandlerIfEventEmitter(emitter, errorListener, { once: true });
    }
  });
}

function addErrorHandlerIfEventEmitter(emitter, handler, flags) {
  if (typeof emitter.on === 'function') {
    eventTargetAgnosticAddListener(emitter, 'error', handler, flags);
  }
}

function eventTargetAgnosticAddListener(emitter, name, listener, flags) {
  if (typeof emitter.on === 'function') {
    if (flags.once) {
      emitter.once(name, listener);
    } else {
      emitter.on(name, listener);
    }
  } else if (typeof emitter.addEventListener === 'function') {
    // EventTarget does not have `error` event semantics like Node
    // EventEmitters, we do not listen for `error` events here.
    emitter.addEventListener(name, function wrapListener(arg) {
      // IE does not have builtin `{ once: true }` support so we
      // have to do it manually.
      if (flags.once) {
        emitter.removeEventListener(name, wrapListener);
      }
      listener(arg);
    });
  } else {
    throw new TypeError('The "emitter" argument must be of type EventEmitter. Received type ' + typeof emitter);
  }
}

},{}],24:[function(require,module,exports){
'use strict';

var isCallable = require('is-callable');

var toStr = Object.prototype.toString;
var hasOwnProperty = Object.prototype.hasOwnProperty;

/** @type {<This, A extends readonly unknown[]>(arr: A, iterator: (this: This | void, value: A[number], index: number, arr: A) => void, receiver: This | undefined) => void} */
var forEachArray = function forEachArray(array, iterator, receiver) {
    for (var i = 0, len = array.length; i < len; i++) {
        if (hasOwnProperty.call(array, i)) {
            if (receiver == null) {
                iterator(array[i], i, array);
            } else {
                iterator.call(receiver, array[i], i, array);
            }
        }
    }
};

/** @type {<This, S extends string>(string: S, iterator: (this: This | void, value: S[number], index: number, string: S) => void, receiver: This | undefined) => void} */
var forEachString = function forEachString(string, iterator, receiver) {
    for (var i = 0, len = string.length; i < len; i++) {
        // no such thing as a sparse string.
        if (receiver == null) {
            iterator(string.charAt(i), i, string);
        } else {
            iterator.call(receiver, string.charAt(i), i, string);
        }
    }
};

/** @type {<This, O>(obj: O, iterator: (this: This | void, value: O[keyof O], index: keyof O, obj: O) => void, receiver: This | undefined) => void} */
var forEachObject = function forEachObject(object, iterator, receiver) {
    for (var k in object) {
        if (hasOwnProperty.call(object, k)) {
            if (receiver == null) {
                iterator(object[k], k, object);
            } else {
                iterator.call(receiver, object[k], k, object);
            }
        }
    }
};

/** @type {(x: unknown) => x is readonly unknown[]} */
function isArray(x) {
    return toStr.call(x) === '[object Array]';
}

/** @type {import('.')._internal} */
module.exports = function forEach(list, iterator, thisArg) {
    if (!isCallable(iterator)) {
        throw new TypeError('iterator must be a function');
    }

    var receiver;
    if (arguments.length >= 3) {
        receiver = thisArg;
    }

    if (isArray(list)) {
        forEachArray(list, iterator, receiver);
    } else if (typeof list === 'string') {
        forEachString(list, iterator, receiver);
    } else {
        forEachObject(list, iterator, receiver);
    }
};

},{"is-callable":42}],25:[function(require,module,exports){
'use strict';

/* eslint no-invalid-this: 1 */

var ERROR_MESSAGE = 'Function.prototype.bind called on incompatible ';
var toStr = Object.prototype.toString;
var max = Math.max;
var funcType = '[object Function]';

var concatty = function concatty(a, b) {
    var arr = [];

    for (var i = 0; i < a.length; i += 1) {
        arr[i] = a[i];
    }
    for (var j = 0; j < b.length; j += 1) {
        arr[j + a.length] = b[j];
    }

    return arr;
};

var slicy = function slicy(arrLike, offset) {
    var arr = [];
    for (var i = offset || 0, j = 0; i < arrLike.length; i += 1, j += 1) {
        arr[j] = arrLike[i];
    }
    return arr;
};

var joiny = function (arr, joiner) {
    var str = '';
    for (var i = 0; i < arr.length; i += 1) {
        str += arr[i];
        if (i + 1 < arr.length) {
            str += joiner;
        }
    }
    return str;
};

module.exports = function bind(that) {
    var target = this;
    if (typeof target !== 'function' || toStr.apply(target) !== funcType) {
        throw new TypeError(ERROR_MESSAGE + target);
    }
    var args = slicy(arguments, 1);

    var bound;
    var binder = function () {
        if (this instanceof bound) {
            var result = target.apply(
                this,
                concatty(args, arguments)
            );
            if (Object(result) === result) {
                return result;
            }
            return this;
        }
        return target.apply(
            that,
            concatty(args, arguments)
        );

    };

    var boundLength = max(0, target.length - args.length);
    var boundArgs = [];
    for (var i = 0; i < boundLength; i++) {
        boundArgs[i] = '$' + i;
    }

    bound = Function('binder', 'return function (' + joiny(boundArgs, ',') + '){ return binder.apply(this,arguments); }')(binder);

    if (target.prototype) {
        var Empty = function Empty() {};
        Empty.prototype = target.prototype;
        bound.prototype = new Empty();
        Empty.prototype = null;
    }

    return bound;
};

},{}],26:[function(require,module,exports){
'use strict';

var implementation = require('./implementation');

module.exports = Function.prototype.bind || implementation;

},{"./implementation":25}],27:[function(require,module,exports){
'use strict';

/** @type {GeneratorFunctionConstructor | false} */
var cached;

/** @type {import('./index.js')} */
module.exports = function getGeneratorFunction() {
	if (typeof cached === 'undefined') {
		try {
			// eslint-disable-next-line no-new-func
			cached = Function('return function* () {}')().constructor;
		} catch (e) {
			cached = false;
		}
	}
	return cached;
};


},{}],28:[function(require,module,exports){
'use strict';

var undefined;

var $Object = require('es-object-atoms');

var $Error = require('es-errors');
var $EvalError = require('es-errors/eval');
var $RangeError = require('es-errors/range');
var $ReferenceError = require('es-errors/ref');
var $SyntaxError = require('es-errors/syntax');
var $TypeError = require('es-errors/type');
var $URIError = require('es-errors/uri');

var abs = require('math-intrinsics/abs');
var floor = require('math-intrinsics/floor');
var max = require('math-intrinsics/max');
var min = require('math-intrinsics/min');
var pow = require('math-intrinsics/pow');
var round = require('math-intrinsics/round');
var sign = require('math-intrinsics/sign');

var $Function = Function;

// eslint-disable-next-line consistent-return
var getEvalledConstructor = function (expressionSyntax) {
	try {
		return $Function('"use strict"; return (' + expressionSyntax + ').constructor;')();
	} catch (e) {}
};

var $gOPD = require('gopd');
var $defineProperty = require('es-define-property');

var throwTypeError = function () {
	throw new $TypeError();
};
var ThrowTypeError = $gOPD
	? (function () {
		try {
			// eslint-disable-next-line no-unused-expressions, no-caller, no-restricted-properties
			arguments.callee; // IE 8 does not throw here
			return throwTypeError;
		} catch (calleeThrows) {
			try {
				// IE 8 throws on Object.getOwnPropertyDescriptor(arguments, '')
				return $gOPD(arguments, 'callee').get;
			} catch (gOPDthrows) {
				return throwTypeError;
			}
		}
	}())
	: throwTypeError;

var hasSymbols = require('has-symbols')();

var getProto = require('get-proto');
var $ObjectGPO = require('get-proto/Object.getPrototypeOf');
var $ReflectGPO = require('get-proto/Reflect.getPrototypeOf');

var $apply = require('call-bind-apply-helpers/functionApply');
var $call = require('call-bind-apply-helpers/functionCall');

var needsEval = {};

var TypedArray = typeof Uint8Array === 'undefined' || !getProto ? undefined : getProto(Uint8Array);

var INTRINSICS = {
	__proto__: null,
	'%AggregateError%': typeof AggregateError === 'undefined' ? undefined : AggregateError,
	'%Array%': Array,
	'%ArrayBuffer%': typeof ArrayBuffer === 'undefined' ? undefined : ArrayBuffer,
	'%ArrayIteratorPrototype%': hasSymbols && getProto ? getProto([][Symbol.iterator]()) : undefined,
	'%AsyncFromSyncIteratorPrototype%': undefined,
	'%AsyncFunction%': needsEval,
	'%AsyncGenerator%': needsEval,
	'%AsyncGeneratorFunction%': needsEval,
	'%AsyncIteratorPrototype%': needsEval,
	'%Atomics%': typeof Atomics === 'undefined' ? undefined : Atomics,
	'%BigInt%': typeof BigInt === 'undefined' ? undefined : BigInt,
	'%BigInt64Array%': typeof BigInt64Array === 'undefined' ? undefined : BigInt64Array,
	'%BigUint64Array%': typeof BigUint64Array === 'undefined' ? undefined : BigUint64Array,
	'%Boolean%': Boolean,
	'%DataView%': typeof DataView === 'undefined' ? undefined : DataView,
	'%Date%': Date,
	'%decodeURI%': decodeURI,
	'%decodeURIComponent%': decodeURIComponent,
	'%encodeURI%': encodeURI,
	'%encodeURIComponent%': encodeURIComponent,
	'%Error%': $Error,
	'%eval%': eval, // eslint-disable-line no-eval
	'%EvalError%': $EvalError,
	'%Float16Array%': typeof Float16Array === 'undefined' ? undefined : Float16Array,
	'%Float32Array%': typeof Float32Array === 'undefined' ? undefined : Float32Array,
	'%Float64Array%': typeof Float64Array === 'undefined' ? undefined : Float64Array,
	'%FinalizationRegistry%': typeof FinalizationRegistry === 'undefined' ? undefined : FinalizationRegistry,
	'%Function%': $Function,
	'%GeneratorFunction%': needsEval,
	'%Int8Array%': typeof Int8Array === 'undefined' ? undefined : Int8Array,
	'%Int16Array%': typeof Int16Array === 'undefined' ? undefined : Int16Array,
	'%Int32Array%': typeof Int32Array === 'undefined' ? undefined : Int32Array,
	'%isFinite%': isFinite,
	'%isNaN%': isNaN,
	'%IteratorPrototype%': hasSymbols && getProto ? getProto(getProto([][Symbol.iterator]())) : undefined,
	'%JSON%': typeof JSON === 'object' ? JSON : undefined,
	'%Map%': typeof Map === 'undefined' ? undefined : Map,
	'%MapIteratorPrototype%': typeof Map === 'undefined' || !hasSymbols || !getProto ? undefined : getProto(new Map()[Symbol.iterator]()),
	'%Math%': Math,
	'%Number%': Number,
	'%Object%': $Object,
	'%Object.getOwnPropertyDescriptor%': $gOPD,
	'%parseFloat%': parseFloat,
	'%parseInt%': parseInt,
	'%Promise%': typeof Promise === 'undefined' ? undefined : Promise,
	'%Proxy%': typeof Proxy === 'undefined' ? undefined : Proxy,
	'%RangeError%': $RangeError,
	'%ReferenceError%': $ReferenceError,
	'%Reflect%': typeof Reflect === 'undefined' ? undefined : Reflect,
	'%RegExp%': RegExp,
	'%Set%': typeof Set === 'undefined' ? undefined : Set,
	'%SetIteratorPrototype%': typeof Set === 'undefined' || !hasSymbols || !getProto ? undefined : getProto(new Set()[Symbol.iterator]()),
	'%SharedArrayBuffer%': typeof SharedArrayBuffer === 'undefined' ? undefined : SharedArrayBuffer,
	'%String%': String,
	'%StringIteratorPrototype%': hasSymbols && getProto ? getProto(''[Symbol.iterator]()) : undefined,
	'%Symbol%': hasSymbols ? Symbol : undefined,
	'%SyntaxError%': $SyntaxError,
	'%ThrowTypeError%': ThrowTypeError,
	'%TypedArray%': TypedArray,
	'%TypeError%': $TypeError,
	'%Uint8Array%': typeof Uint8Array === 'undefined' ? undefined : Uint8Array,
	'%Uint8ClampedArray%': typeof Uint8ClampedArray === 'undefined' ? undefined : Uint8ClampedArray,
	'%Uint16Array%': typeof Uint16Array === 'undefined' ? undefined : Uint16Array,
	'%Uint32Array%': typeof Uint32Array === 'undefined' ? undefined : Uint32Array,
	'%URIError%': $URIError,
	'%WeakMap%': typeof WeakMap === 'undefined' ? undefined : WeakMap,
	'%WeakRef%': typeof WeakRef === 'undefined' ? undefined : WeakRef,
	'%WeakSet%': typeof WeakSet === 'undefined' ? undefined : WeakSet,

	'%Function.prototype.call%': $call,
	'%Function.prototype.apply%': $apply,
	'%Object.defineProperty%': $defineProperty,
	'%Object.getPrototypeOf%': $ObjectGPO,
	'%Math.abs%': abs,
	'%Math.floor%': floor,
	'%Math.max%': max,
	'%Math.min%': min,
	'%Math.pow%': pow,
	'%Math.round%': round,
	'%Math.sign%': sign,
	'%Reflect.getPrototypeOf%': $ReflectGPO
};

if (getProto) {
	try {
		null.error; // eslint-disable-line no-unused-expressions
	} catch (e) {
		// https://github.com/tc39/proposal-shadowrealm/pull/384#issuecomment-1364264229
		var errorProto = getProto(getProto(e));
		INTRINSICS['%Error.prototype%'] = errorProto;
	}
}

var doEval = function doEval(name) {
	var value;
	if (name === '%AsyncFunction%') {
		value = getEvalledConstructor('async function () {}');
	} else if (name === '%GeneratorFunction%') {
		value = getEvalledConstructor('function* () {}');
	} else if (name === '%AsyncGeneratorFunction%') {
		value = getEvalledConstructor('async function* () {}');
	} else if (name === '%AsyncGenerator%') {
		var fn = doEval('%AsyncGeneratorFunction%');
		if (fn) {
			value = fn.prototype;
		}
	} else if (name === '%AsyncIteratorPrototype%') {
		var gen = doEval('%AsyncGenerator%');
		if (gen && getProto) {
			value = getProto(gen.prototype);
		}
	}

	INTRINSICS[name] = value;

	return value;
};

var LEGACY_ALIASES = {
	__proto__: null,
	'%ArrayBufferPrototype%': ['ArrayBuffer', 'prototype'],
	'%ArrayPrototype%': ['Array', 'prototype'],
	'%ArrayProto_entries%': ['Array', 'prototype', 'entries'],
	'%ArrayProto_forEach%': ['Array', 'prototype', 'forEach'],
	'%ArrayProto_keys%': ['Array', 'prototype', 'keys'],
	'%ArrayProto_values%': ['Array', 'prototype', 'values'],
	'%AsyncFunctionPrototype%': ['AsyncFunction', 'prototype'],
	'%AsyncGenerator%': ['AsyncGeneratorFunction', 'prototype'],
	'%AsyncGeneratorPrototype%': ['AsyncGeneratorFunction', 'prototype', 'prototype'],
	'%BooleanPrototype%': ['Boolean', 'prototype'],
	'%DataViewPrototype%': ['DataView', 'prototype'],
	'%DatePrototype%': ['Date', 'prototype'],
	'%ErrorPrototype%': ['Error', 'prototype'],
	'%EvalErrorPrototype%': ['EvalError', 'prototype'],
	'%Float32ArrayPrototype%': ['Float32Array', 'prototype'],
	'%Float64ArrayPrototype%': ['Float64Array', 'prototype'],
	'%FunctionPrototype%': ['Function', 'prototype'],
	'%Generator%': ['GeneratorFunction', 'prototype'],
	'%GeneratorPrototype%': ['GeneratorFunction', 'prototype', 'prototype'],
	'%Int8ArrayPrototype%': ['Int8Array', 'prototype'],
	'%Int16ArrayPrototype%': ['Int16Array', 'prototype'],
	'%Int32ArrayPrototype%': ['Int32Array', 'prototype'],
	'%JSONParse%': ['JSON', 'parse'],
	'%JSONStringify%': ['JSON', 'stringify'],
	'%MapPrototype%': ['Map', 'prototype'],
	'%NumberPrototype%': ['Number', 'prototype'],
	'%ObjectPrototype%': ['Object', 'prototype'],
	'%ObjProto_toString%': ['Object', 'prototype', 'toString'],
	'%ObjProto_valueOf%': ['Object', 'prototype', 'valueOf'],
	'%PromisePrototype%': ['Promise', 'prototype'],
	'%PromiseProto_then%': ['Promise', 'prototype', 'then'],
	'%Promise_all%': ['Promise', 'all'],
	'%Promise_reject%': ['Promise', 'reject'],
	'%Promise_resolve%': ['Promise', 'resolve'],
	'%RangeErrorPrototype%': ['RangeError', 'prototype'],
	'%ReferenceErrorPrototype%': ['ReferenceError', 'prototype'],
	'%RegExpPrototype%': ['RegExp', 'prototype'],
	'%SetPrototype%': ['Set', 'prototype'],
	'%SharedArrayBufferPrototype%': ['SharedArrayBuffer', 'prototype'],
	'%StringPrototype%': ['String', 'prototype'],
	'%SymbolPrototype%': ['Symbol', 'prototype'],
	'%SyntaxErrorPrototype%': ['SyntaxError', 'prototype'],
	'%TypedArrayPrototype%': ['TypedArray', 'prototype'],
	'%TypeErrorPrototype%': ['TypeError', 'prototype'],
	'%Uint8ArrayPrototype%': ['Uint8Array', 'prototype'],
	'%Uint8ClampedArrayPrototype%': ['Uint8ClampedArray', 'prototype'],
	'%Uint16ArrayPrototype%': ['Uint16Array', 'prototype'],
	'%Uint32ArrayPrototype%': ['Uint32Array', 'prototype'],
	'%URIErrorPrototype%': ['URIError', 'prototype'],
	'%WeakMapPrototype%': ['WeakMap', 'prototype'],
	'%WeakSetPrototype%': ['WeakSet', 'prototype']
};

var bind = require('function-bind');
var hasOwn = require('hasown');
var $concat = bind.call($call, Array.prototype.concat);
var $spliceApply = bind.call($apply, Array.prototype.splice);
var $replace = bind.call($call, String.prototype.replace);
var $strSlice = bind.call($call, String.prototype.slice);
var $exec = bind.call($call, RegExp.prototype.exec);

/* adapted from https://github.com/lodash/lodash/blob/4.17.15/dist/lodash.js#L6735-L6744 */
var rePropName = /[^%.[\]]+|\[(?:(-?\d+(?:\.\d+)?)|(["'])((?:(?!\2)[^\\]|\\.)*?)\2)\]|(?=(?:\.|\[\])(?:\.|\[\]|%$))/g;
var reEscapeChar = /\\(\\)?/g; /** Used to match backslashes in property paths. */
var stringToPath = function stringToPath(string) {
	var first = $strSlice(string, 0, 1);
	var last = $strSlice(string, -1);
	if (first === '%' && last !== '%') {
		throw new $SyntaxError('invalid intrinsic syntax, expected closing `%`');
	} else if (last === '%' && first !== '%') {
		throw new $SyntaxError('invalid intrinsic syntax, expected opening `%`');
	}
	var result = [];
	$replace(string, rePropName, function (match, number, quote, subString) {
		result[result.length] = quote ? $replace(subString, reEscapeChar, '$1') : number || match;
	});
	return result;
};
/* end adaptation */

var getBaseIntrinsic = function getBaseIntrinsic(name, allowMissing) {
	var intrinsicName = name;
	var alias;
	if (hasOwn(LEGACY_ALIASES, intrinsicName)) {
		alias = LEGACY_ALIASES[intrinsicName];
		intrinsicName = '%' + alias[0] + '%';
	}

	if (hasOwn(INTRINSICS, intrinsicName)) {
		var value = INTRINSICS[intrinsicName];
		if (value === needsEval) {
			value = doEval(intrinsicName);
		}
		if (typeof value === 'undefined' && !allowMissing) {
			throw new $TypeError('intrinsic ' + name + ' exists, but is not available. Please file an issue!');
		}

		return {
			alias: alias,
			name: intrinsicName,
			value: value
		};
	}

	throw new $SyntaxError('intrinsic ' + name + ' does not exist!');
};

module.exports = function GetIntrinsic(name, allowMissing) {
	if (typeof name !== 'string' || name.length === 0) {
		throw new $TypeError('intrinsic name must be a non-empty string');
	}
	if (arguments.length > 1 && typeof allowMissing !== 'boolean') {
		throw new $TypeError('"allowMissing" argument must be a boolean');
	}

	if ($exec(/^%?[^%]*%?$/, name) === null) {
		throw new $SyntaxError('`%` may not be present anywhere but at the beginning and end of the intrinsic name');
	}
	var parts = stringToPath(name);
	var intrinsicBaseName = parts.length > 0 ? parts[0] : '';

	var intrinsic = getBaseIntrinsic('%' + intrinsicBaseName + '%', allowMissing);
	var intrinsicRealName = intrinsic.name;
	var value = intrinsic.value;
	var skipFurtherCaching = false;

	var alias = intrinsic.alias;
	if (alias) {
		intrinsicBaseName = alias[0];
		$spliceApply(parts, $concat([0, 1], alias));
	}

	for (var i = 1, isOwn = true; i < parts.length; i += 1) {
		var part = parts[i];
		var first = $strSlice(part, 0, 1);
		var last = $strSlice(part, -1);
		if (
			(
				(first === '"' || first === "'" || first === '`')
				|| (last === '"' || last === "'" || last === '`')
			)
			&& first !== last
		) {
			throw new $SyntaxError('property names with quotes must have matching quotes');
		}
		if (part === 'constructor' || !isOwn) {
			skipFurtherCaching = true;
		}

		intrinsicBaseName += '.' + part;
		intrinsicRealName = '%' + intrinsicBaseName + '%';

		if (hasOwn(INTRINSICS, intrinsicRealName)) {
			value = INTRINSICS[intrinsicRealName];
		} else if (value != null) {
			if (!(part in value)) {
				if (!allowMissing) {
					throw new $TypeError('base intrinsic for ' + name + ' exists, but the property is not available.');
				}
				return void undefined;
			}
			if ($gOPD && (i + 1) >= parts.length) {
				var desc = $gOPD(value, part);
				isOwn = !!desc;

				// By convention, when a data property is converted to an accessor
				// property to emulate a data property that does not suffer from
				// the override mistake, that accessor's getter is marked with
				// an `originalValue` property. Here, when we detect this, we
				// uphold the illusion by pretending to see that original data
				// property, i.e., returning the value rather than the getter
				// itself.
				if (isOwn && 'get' in desc && !('originalValue' in desc.get)) {
					value = desc.get;
				} else {
					value = value[part];
				}
			} else {
				isOwn = hasOwn(value, part);
				value = value[part];
			}

			if (isOwn && !skipFurtherCaching) {
				INTRINSICS[intrinsicRealName] = value;
			}
		}
	}
	return value;
};

},{"call-bind-apply-helpers/functionApply":6,"call-bind-apply-helpers/functionCall":7,"es-define-property":14,"es-errors":16,"es-errors/eval":15,"es-errors/range":17,"es-errors/ref":18,"es-errors/syntax":19,"es-errors/type":20,"es-errors/uri":21,"es-object-atoms":22,"function-bind":26,"get-proto":31,"get-proto/Object.getPrototypeOf":29,"get-proto/Reflect.getPrototypeOf":30,"gopd":33,"has-symbols":35,"hasown":38,"math-intrinsics/abs":46,"math-intrinsics/floor":47,"math-intrinsics/max":49,"math-intrinsics/min":50,"math-intrinsics/pow":51,"math-intrinsics/round":52,"math-intrinsics/sign":53}],29:[function(require,module,exports){
'use strict';

var $Object = require('es-object-atoms');

/** @type {import('./Object.getPrototypeOf')} */
module.exports = $Object.getPrototypeOf || null;

},{"es-object-atoms":22}],30:[function(require,module,exports){
'use strict';

/** @type {import('./Reflect.getPrototypeOf')} */
module.exports = (typeof Reflect !== 'undefined' && Reflect.getPrototypeOf) || null;

},{}],31:[function(require,module,exports){
'use strict';

var reflectGetProto = require('./Reflect.getPrototypeOf');
var originalGetProto = require('./Object.getPrototypeOf');

var getDunderProto = require('dunder-proto/get');

/** @type {import('.')} */
module.exports = reflectGetProto
	? function getProto(O) {
		// @ts-expect-error TS can't narrow inside a closure, for some reason
		return reflectGetProto(O);
	}
	: originalGetProto
		? function getProto(O) {
			if (!O || (typeof O !== 'object' && typeof O !== 'function')) {
				throw new TypeError('getProto: not an object');
			}
			// @ts-expect-error TS can't narrow inside a closure, for some reason
			return originalGetProto(O);
		}
		: getDunderProto
			? function getProto(O) {
				// @ts-expect-error TS can't narrow inside a closure, for some reason
				return getDunderProto(O);
			}
			: null;

},{"./Object.getPrototypeOf":29,"./Reflect.getPrototypeOf":30,"dunder-proto/get":13}],32:[function(require,module,exports){
'use strict';

/** @type {import('./gOPD')} */
module.exports = Object.getOwnPropertyDescriptor;

},{}],33:[function(require,module,exports){
'use strict';

/** @type {import('.')} */
var $gOPD = require('./gOPD');

if ($gOPD) {
	try {
		$gOPD([], 'length');
	} catch (e) {
		// IE 8 has a broken gOPD
		$gOPD = null;
	}
}

module.exports = $gOPD;

},{"./gOPD":32}],34:[function(require,module,exports){
'use strict';

var $defineProperty = require('es-define-property');

var hasPropertyDescriptors = function hasPropertyDescriptors() {
	return !!$defineProperty;
};

hasPropertyDescriptors.hasArrayLengthDefineBug = function hasArrayLengthDefineBug() {
	// node v0.6 has a bug where array lengths can be Set but not Defined
	if (!$defineProperty) {
		return null;
	}
	try {
		return $defineProperty([], 'length', { value: 1 }).length !== 1;
	} catch (e) {
		// In Firefox 4-22, defining length on an array throws an exception.
		return true;
	}
};

module.exports = hasPropertyDescriptors;

},{"es-define-property":14}],35:[function(require,module,exports){
'use strict';

var origSymbol = typeof Symbol !== 'undefined' && Symbol;
var hasSymbolSham = require('./shams');

/** @type {import('.')} */
module.exports = function hasNativeSymbols() {
	if (typeof origSymbol !== 'function') { return false; }
	if (typeof Symbol !== 'function') { return false; }
	if (typeof origSymbol('foo') !== 'symbol') { return false; }
	if (typeof Symbol('bar') !== 'symbol') { return false; }

	return hasSymbolSham();
};

},{"./shams":36}],36:[function(require,module,exports){
'use strict';

/** @type {import('./shams')} */
/* eslint complexity: [2, 18], max-statements: [2, 33] */
module.exports = function hasSymbols() {
	if (typeof Symbol !== 'function' || typeof Object.getOwnPropertySymbols !== 'function') { return false; }
	if (typeof Symbol.iterator === 'symbol') { return true; }

	/** @type {{ [k in symbol]?: unknown }} */
	var obj = {};
	var sym = Symbol('test');
	var symObj = Object(sym);
	if (typeof sym === 'string') { return false; }

	if (Object.prototype.toString.call(sym) !== '[object Symbol]') { return false; }
	if (Object.prototype.toString.call(symObj) !== '[object Symbol]') { return false; }

	// temp disabled per https://github.com/ljharb/object.assign/issues/17
	// if (sym instanceof Symbol) { return false; }
	// temp disabled per https://github.com/WebReflection/get-own-property-symbols/issues/4
	// if (!(symObj instanceof Symbol)) { return false; }

	// if (typeof Symbol.prototype.toString !== 'function') { return false; }
	// if (String(sym) !== Symbol.prototype.toString.call(sym)) { return false; }

	var symVal = 42;
	obj[sym] = symVal;
	for (var _ in obj) { return false; } // eslint-disable-line no-restricted-syntax, no-unreachable-loop
	if (typeof Object.keys === 'function' && Object.keys(obj).length !== 0) { return false; }

	if (typeof Object.getOwnPropertyNames === 'function' && Object.getOwnPropertyNames(obj).length !== 0) { return false; }

	var syms = Object.getOwnPropertySymbols(obj);
	if (syms.length !== 1 || syms[0] !== sym) { return false; }

	if (!Object.prototype.propertyIsEnumerable.call(obj, sym)) { return false; }

	if (typeof Object.getOwnPropertyDescriptor === 'function') {
		// eslint-disable-next-line no-extra-parens
		var descriptor = /** @type {PropertyDescriptor} */ (Object.getOwnPropertyDescriptor(obj, sym));
		if (descriptor.value !== symVal || descriptor.enumerable !== true) { return false; }
	}

	return true;
};

},{}],37:[function(require,module,exports){
'use strict';

var hasSymbols = require('has-symbols/shams');

/** @type {import('.')} */
module.exports = function hasToStringTagShams() {
	return hasSymbols() && !!Symbol.toStringTag;
};

},{"has-symbols/shams":36}],38:[function(require,module,exports){
'use strict';

var call = Function.prototype.call;
var $hasOwn = Object.prototype.hasOwnProperty;
var bind = require('function-bind');

/** @type {import('.')} */
module.exports = bind.call(call, $hasOwn);

},{"function-bind":26}],39:[function(require,module,exports){
/*! ieee754. BSD-3-Clause License. Feross Aboukhadijeh <https://feross.org/opensource> */
exports.read = function (buffer, offset, isLE, mLen, nBytes) {
  var e, m
  var eLen = (nBytes * 8) - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var nBits = -7
  var i = isLE ? (nBytes - 1) : 0
  var d = isLE ? -1 : 1
  var s = buffer[offset + i]

  i += d

  e = s & ((1 << (-nBits)) - 1)
  s >>= (-nBits)
  nBits += eLen
  for (; nBits > 0; e = (e * 256) + buffer[offset + i], i += d, nBits -= 8) {}

  m = e & ((1 << (-nBits)) - 1)
  e >>= (-nBits)
  nBits += mLen
  for (; nBits > 0; m = (m * 256) + buffer[offset + i], i += d, nBits -= 8) {}

  if (e === 0) {
    e = 1 - eBias
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity)
  } else {
    m = m + Math.pow(2, mLen)
    e = e - eBias
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
}

exports.write = function (buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c
  var eLen = (nBytes * 8) - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0)
  var i = isLE ? 0 : (nBytes - 1)
  var d = isLE ? 1 : -1
  var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0

  value = Math.abs(value)

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0
    e = eMax
  } else {
    e = Math.floor(Math.log(value) / Math.LN2)
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--
      c *= 2
    }
    if (e + eBias >= 1) {
      value += rt / c
    } else {
      value += rt * Math.pow(2, 1 - eBias)
    }
    if (value * c >= 2) {
      e++
      c /= 2
    }

    if (e + eBias >= eMax) {
      m = 0
      e = eMax
    } else if (e + eBias >= 1) {
      m = ((value * c) - 1) * Math.pow(2, mLen)
      e = e + eBias
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen)
      e = 0
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

  e = (e << mLen) | m
  eLen += mLen
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

  buffer[offset + i - d] |= s * 128
}

},{}],40:[function(require,module,exports){
if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    if (superCtor) {
      ctor.super_ = superCtor
      ctor.prototype = Object.create(superCtor.prototype, {
        constructor: {
          value: ctor,
          enumerable: false,
          writable: true,
          configurable: true
        }
      })
    }
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    if (superCtor) {
      ctor.super_ = superCtor
      var TempCtor = function () {}
      TempCtor.prototype = superCtor.prototype
      ctor.prototype = new TempCtor()
      ctor.prototype.constructor = ctor
    }
  }
}

},{}],41:[function(require,module,exports){
'use strict';

var hasToStringTag = require('has-tostringtag/shams')();
var callBound = require('call-bound');

var $toString = callBound('Object.prototype.toString');

/** @type {import('.')} */
var isStandardArguments = function isArguments(value) {
	if (
		hasToStringTag
		&& value
		&& typeof value === 'object'
		&& Symbol.toStringTag in value
	) {
		return false;
	}
	return $toString(value) === '[object Arguments]';
};

/** @type {import('.')} */
var isLegacyArguments = function isArguments(value) {
	if (isStandardArguments(value)) {
		return true;
	}
	return value !== null
		&& typeof value === 'object'
		&& 'length' in value
		&& typeof value.length === 'number'
		&& value.length >= 0
		&& $toString(value) !== '[object Array]'
		&& 'callee' in value
		&& $toString(value.callee) === '[object Function]';
};

var supportsStandardArguments = (function () {
	return isStandardArguments(arguments);
}());

// @ts-expect-error TODO make this not error
isStandardArguments.isLegacyArguments = isLegacyArguments; // for tests

/** @type {import('.')} */
module.exports = supportsStandardArguments ? isStandardArguments : isLegacyArguments;

},{"call-bound":11,"has-tostringtag/shams":37}],42:[function(require,module,exports){
'use strict';

var fnToStr = Function.prototype.toString;
var reflectApply = typeof Reflect === 'object' && Reflect !== null && Reflect.apply;
var badArrayLike;
var isCallableMarker;
if (typeof reflectApply === 'function' && typeof Object.defineProperty === 'function') {
	try {
		badArrayLike = Object.defineProperty({}, 'length', {
			get: function () {
				throw isCallableMarker;
			}
		});
		isCallableMarker = {};
		// eslint-disable-next-line no-throw-literal
		reflectApply(function () { throw 42; }, null, badArrayLike);
	} catch (_) {
		if (_ !== isCallableMarker) {
			reflectApply = null;
		}
	}
} else {
	reflectApply = null;
}

var constructorRegex = /^\s*class\b/;
var isES6ClassFn = function isES6ClassFunction(value) {
	try {
		var fnStr = fnToStr.call(value);
		return constructorRegex.test(fnStr);
	} catch (e) {
		return false; // not a function
	}
};

var tryFunctionObject = function tryFunctionToStr(value) {
	try {
		if (isES6ClassFn(value)) { return false; }
		fnToStr.call(value);
		return true;
	} catch (e) {
		return false;
	}
};
var toStr = Object.prototype.toString;
var objectClass = '[object Object]';
var fnClass = '[object Function]';
var genClass = '[object GeneratorFunction]';
var ddaClass = '[object HTMLAllCollection]'; // IE 11
var ddaClass2 = '[object HTML document.all class]';
var ddaClass3 = '[object HTMLCollection]'; // IE 9-10
var hasToStringTag = typeof Symbol === 'function' && !!Symbol.toStringTag; // better: use `has-tostringtag`

var isIE68 = !(0 in [,]); // eslint-disable-line no-sparse-arrays, comma-spacing

var isDDA = function isDocumentDotAll() { return false; };
if (typeof document === 'object') {
	// Firefox 3 canonicalizes DDA to undefined when it's not accessed directly
	var all = document.all;
	if (toStr.call(all) === toStr.call(document.all)) {
		isDDA = function isDocumentDotAll(value) {
			/* globals document: false */
			// in IE 6-8, typeof document.all is "object" and it's truthy
			if ((isIE68 || !value) && (typeof value === 'undefined' || typeof value === 'object')) {
				try {
					var str = toStr.call(value);
					return (
						str === ddaClass
						|| str === ddaClass2
						|| str === ddaClass3 // opera 12.16
						|| str === objectClass // IE 6-8
					) && value('') == null; // eslint-disable-line eqeqeq
				} catch (e) { /**/ }
			}
			return false;
		};
	}
}

module.exports = reflectApply
	? function isCallable(value) {
		if (isDDA(value)) { return true; }
		if (!value) { return false; }
		if (typeof value !== 'function' && typeof value !== 'object') { return false; }
		try {
			reflectApply(value, null, badArrayLike);
		} catch (e) {
			if (e !== isCallableMarker) { return false; }
		}
		return !isES6ClassFn(value) && tryFunctionObject(value);
	}
	: function isCallable(value) {
		if (isDDA(value)) { return true; }
		if (!value) { return false; }
		if (typeof value !== 'function' && typeof value !== 'object') { return false; }
		if (hasToStringTag) { return tryFunctionObject(value); }
		if (isES6ClassFn(value)) { return false; }
		var strClass = toStr.call(value);
		if (strClass !== fnClass && strClass !== genClass && !(/^\[object HTML/).test(strClass)) { return false; }
		return tryFunctionObject(value);
	};

},{}],43:[function(require,module,exports){
'use strict';

var callBound = require('call-bound');
var safeRegexTest = require('safe-regex-test');
var isFnRegex = safeRegexTest(/^\s*(?:function)?\*/);
var hasToStringTag = require('has-tostringtag/shams')();
var getProto = require('get-proto');

var toStr = callBound('Object.prototype.toString');
var fnToStr = callBound('Function.prototype.toString');

var getGeneratorFunction = require('generator-function');

/** @type {import('.')} */
module.exports = function isGeneratorFunction(fn) {
	if (typeof fn !== 'function') {
		return false;
	}
	if (isFnRegex(fnToStr(fn))) {
		return true;
	}
	if (!hasToStringTag) {
		var str = toStr(fn);
		return str === '[object GeneratorFunction]';
	}
	if (!getProto) {
		return false;
	}
	var GeneratorFunction = getGeneratorFunction();
	return GeneratorFunction && getProto(fn) === GeneratorFunction.prototype;
};

},{"call-bound":11,"generator-function":27,"get-proto":31,"has-tostringtag/shams":37,"safe-regex-test":56}],44:[function(require,module,exports){
'use strict';

var callBound = require('call-bound');
var hasToStringTag = require('has-tostringtag/shams')();
var hasOwn = require('hasown');
var gOPD = require('gopd');

/** @type {import('.')} */
var fn;

if (hasToStringTag) {
	/** @type {(receiver: ThisParameterType<typeof RegExp.prototype.exec>, ...args: Parameters<typeof RegExp.prototype.exec>) => ReturnType<typeof RegExp.prototype.exec>} */
	var $exec = callBound('RegExp.prototype.exec');
	/** @type {object} */
	var isRegexMarker = {};

	var throwRegexMarker = function () {
		throw isRegexMarker;
	};
	/** @type {{ toString(): never, valueOf(): never, [Symbol.toPrimitive]?(): never }} */
	var badStringifier = {
		toString: throwRegexMarker,
		valueOf: throwRegexMarker
	};

	if (typeof Symbol.toPrimitive === 'symbol') {
		badStringifier[Symbol.toPrimitive] = throwRegexMarker;
	}

	/** @type {import('.')} */
	// @ts-expect-error TS can't figure out that the $exec call always throws
	// eslint-disable-next-line consistent-return
	fn = function isRegex(value) {
		if (!value || typeof value !== 'object') {
			return false;
		}

		// eslint-disable-next-line no-extra-parens
		var descriptor = /** @type {NonNullable<typeof gOPD>} */ (gOPD)(/** @type {{ lastIndex?: unknown }} */ (value), 'lastIndex');
		var hasLastIndexDataProperty = descriptor && hasOwn(descriptor, 'value');
		if (!hasLastIndexDataProperty) {
			return false;
		}

		try {
			// eslint-disable-next-line no-extra-parens
			$exec(value, /** @type {string} */ (/** @type {unknown} */ (badStringifier)));
		} catch (e) {
			return e === isRegexMarker;
		}
	};
} else {
	/** @type {(receiver: ThisParameterType<typeof Object.prototype.toString>, ...args: Parameters<typeof Object.prototype.toString>) => ReturnType<typeof Object.prototype.toString>} */
	var $toString = callBound('Object.prototype.toString');
	/** @const @type {'[object RegExp]'} */
	var regexClass = '[object RegExp]';

	/** @type {import('.')} */
	fn = function isRegex(value) {
		// In older browsers, typeof regex incorrectly returns 'function'
		if (!value || (typeof value !== 'object' && typeof value !== 'function')) {
			return false;
		}

		return $toString(value) === regexClass;
	};
}

module.exports = fn;

},{"call-bound":11,"gopd":33,"has-tostringtag/shams":37,"hasown":38}],45:[function(require,module,exports){
'use strict';

var whichTypedArray = require('which-typed-array');

/** @type {import('.')} */
module.exports = function isTypedArray(value) {
	return !!whichTypedArray(value);
};

},{"which-typed-array":61}],46:[function(require,module,exports){
'use strict';

/** @type {import('./abs')} */
module.exports = Math.abs;

},{}],47:[function(require,module,exports){
'use strict';

/** @type {import('./floor')} */
module.exports = Math.floor;

},{}],48:[function(require,module,exports){
'use strict';

/** @type {import('./isNaN')} */
module.exports = Number.isNaN || function isNaN(a) {
	return a !== a;
};

},{}],49:[function(require,module,exports){
'use strict';

/** @type {import('./max')} */
module.exports = Math.max;

},{}],50:[function(require,module,exports){
'use strict';

/** @type {import('./min')} */
module.exports = Math.min;

},{}],51:[function(require,module,exports){
'use strict';

/** @type {import('./pow')} */
module.exports = Math.pow;

},{}],52:[function(require,module,exports){
'use strict';

/** @type {import('./round')} */
module.exports = Math.round;

},{}],53:[function(require,module,exports){
'use strict';

var $isNaN = require('./isNaN');

/** @type {import('./sign')} */
module.exports = function sign(number) {
	if ($isNaN(number) || number === 0) {
		return number;
	}
	return number < 0 ? -1 : +1;
};

},{"./isNaN":48}],54:[function(require,module,exports){
'use strict';

/** @type {import('.')} */
module.exports = [
	'Float16Array',
	'Float32Array',
	'Float64Array',
	'Int8Array',
	'Int16Array',
	'Int32Array',
	'Uint8Array',
	'Uint8ClampedArray',
	'Uint16Array',
	'Uint32Array',
	'BigInt64Array',
	'BigUint64Array'
];

},{}],55:[function(require,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;
process.prependListener = noop;
process.prependOnceListener = noop;

process.listeners = function (name) { return [] }

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],56:[function(require,module,exports){
'use strict';

var callBound = require('call-bound');
var isRegex = require('is-regex');

var $exec = callBound('RegExp.prototype.exec');
var $TypeError = require('es-errors/type');

/** @type {import('.')} */
module.exports = function regexTester(regex) {
	if (!isRegex(regex)) {
		throw new $TypeError('`regex` must be a RegExp');
	}
	return function test(s) {
		return $exec(regex, s) !== null;
	};
};

},{"call-bound":11,"es-errors/type":20,"is-regex":44}],57:[function(require,module,exports){
'use strict';

var GetIntrinsic = require('get-intrinsic');
var define = require('define-data-property');
var hasDescriptors = require('has-property-descriptors')();
var gOPD = require('gopd');

var $TypeError = require('es-errors/type');
var $floor = GetIntrinsic('%Math.floor%');

/** @type {import('.')} */
module.exports = function setFunctionLength(fn, length) {
	if (typeof fn !== 'function') {
		throw new $TypeError('`fn` is not a function');
	}
	if (typeof length !== 'number' || length < 0 || length > 0xFFFFFFFF || $floor(length) !== length) {
		throw new $TypeError('`length` must be a positive 32-bit integer');
	}

	var loose = arguments.length > 2 && !!arguments[2];

	var functionLengthIsConfigurable = true;
	var functionLengthIsWritable = true;
	if ('length' in fn && gOPD) {
		var desc = gOPD(fn, 'length');
		if (desc && !desc.configurable) {
			functionLengthIsConfigurable = false;
		}
		if (desc && !desc.writable) {
			functionLengthIsWritable = false;
		}
	}

	if (functionLengthIsConfigurable || functionLengthIsWritable || !loose) {
		if (hasDescriptors) {
			define(/** @type {Parameters<define>[0]} */ (fn), 'length', length, true, true);
		} else {
			define(/** @type {Parameters<define>[0]} */ (fn), 'length', length);
		}
	}
	return fn;
};

},{"define-data-property":12,"es-errors/type":20,"get-intrinsic":28,"gopd":33,"has-property-descriptors":34}],58:[function(require,module,exports){
module.exports = function isBuffer(arg) {
  return arg && typeof arg === 'object'
    && typeof arg.copy === 'function'
    && typeof arg.fill === 'function'
    && typeof arg.readUInt8 === 'function';
}
},{}],59:[function(require,module,exports){
// Currently in sync with Node.js lib/internal/util/types.js
// https://github.com/nodejs/node/commit/112cc7c27551254aa2b17098fb774867f05ed0d9

'use strict';

var isArgumentsObject = require('is-arguments');
var isGeneratorFunction = require('is-generator-function');
var whichTypedArray = require('which-typed-array');
var isTypedArray = require('is-typed-array');

function uncurryThis(f) {
  return f.call.bind(f);
}

var BigIntSupported = typeof BigInt !== 'undefined';
var SymbolSupported = typeof Symbol !== 'undefined';

var ObjectToString = uncurryThis(Object.prototype.toString);

var numberValue = uncurryThis(Number.prototype.valueOf);
var stringValue = uncurryThis(String.prototype.valueOf);
var booleanValue = uncurryThis(Boolean.prototype.valueOf);

if (BigIntSupported) {
  var bigIntValue = uncurryThis(BigInt.prototype.valueOf);
}

if (SymbolSupported) {
  var symbolValue = uncurryThis(Symbol.prototype.valueOf);
}

function checkBoxedPrimitive(value, prototypeValueOf) {
  if (typeof value !== 'object') {
    return false;
  }
  try {
    prototypeValueOf(value);
    return true;
  } catch(e) {
    return false;
  }
}

exports.isArgumentsObject = isArgumentsObject;
exports.isGeneratorFunction = isGeneratorFunction;
exports.isTypedArray = isTypedArray;

// Taken from here and modified for better browser support
// https://github.com/sindresorhus/p-is-promise/blob/cda35a513bda03f977ad5cde3a079d237e82d7ef/index.js
function isPromise(input) {
	return (
		(
			typeof Promise !== 'undefined' &&
			input instanceof Promise
		) ||
		(
			input !== null &&
			typeof input === 'object' &&
			typeof input.then === 'function' &&
			typeof input.catch === 'function'
		)
	);
}
exports.isPromise = isPromise;

function isArrayBufferView(value) {
  if (typeof ArrayBuffer !== 'undefined' && ArrayBuffer.isView) {
    return ArrayBuffer.isView(value);
  }

  return (
    isTypedArray(value) ||
    isDataView(value)
  );
}
exports.isArrayBufferView = isArrayBufferView;


function isUint8Array(value) {
  return whichTypedArray(value) === 'Uint8Array';
}
exports.isUint8Array = isUint8Array;

function isUint8ClampedArray(value) {
  return whichTypedArray(value) === 'Uint8ClampedArray';
}
exports.isUint8ClampedArray = isUint8ClampedArray;

function isUint16Array(value) {
  return whichTypedArray(value) === 'Uint16Array';
}
exports.isUint16Array = isUint16Array;

function isUint32Array(value) {
  return whichTypedArray(value) === 'Uint32Array';
}
exports.isUint32Array = isUint32Array;

function isInt8Array(value) {
  return whichTypedArray(value) === 'Int8Array';
}
exports.isInt8Array = isInt8Array;

function isInt16Array(value) {
  return whichTypedArray(value) === 'Int16Array';
}
exports.isInt16Array = isInt16Array;

function isInt32Array(value) {
  return whichTypedArray(value) === 'Int32Array';
}
exports.isInt32Array = isInt32Array;

function isFloat32Array(value) {
  return whichTypedArray(value) === 'Float32Array';
}
exports.isFloat32Array = isFloat32Array;

function isFloat64Array(value) {
  return whichTypedArray(value) === 'Float64Array';
}
exports.isFloat64Array = isFloat64Array;

function isBigInt64Array(value) {
  return whichTypedArray(value) === 'BigInt64Array';
}
exports.isBigInt64Array = isBigInt64Array;

function isBigUint64Array(value) {
  return whichTypedArray(value) === 'BigUint64Array';
}
exports.isBigUint64Array = isBigUint64Array;

function isMapToString(value) {
  return ObjectToString(value) === '[object Map]';
}
isMapToString.working = (
  typeof Map !== 'undefined' &&
  isMapToString(new Map())
);

function isMap(value) {
  if (typeof Map === 'undefined') {
    return false;
  }

  return isMapToString.working
    ? isMapToString(value)
    : value instanceof Map;
}
exports.isMap = isMap;

function isSetToString(value) {
  return ObjectToString(value) === '[object Set]';
}
isSetToString.working = (
  typeof Set !== 'undefined' &&
  isSetToString(new Set())
);
function isSet(value) {
  if (typeof Set === 'undefined') {
    return false;
  }

  return isSetToString.working
    ? isSetToString(value)
    : value instanceof Set;
}
exports.isSet = isSet;

function isWeakMapToString(value) {
  return ObjectToString(value) === '[object WeakMap]';
}
isWeakMapToString.working = (
  typeof WeakMap !== 'undefined' &&
  isWeakMapToString(new WeakMap())
);
function isWeakMap(value) {
  if (typeof WeakMap === 'undefined') {
    return false;
  }

  return isWeakMapToString.working
    ? isWeakMapToString(value)
    : value instanceof WeakMap;
}
exports.isWeakMap = isWeakMap;

function isWeakSetToString(value) {
  return ObjectToString(value) === '[object WeakSet]';
}
isWeakSetToString.working = (
  typeof WeakSet !== 'undefined' &&
  isWeakSetToString(new WeakSet())
);
function isWeakSet(value) {
  return isWeakSetToString(value);
}
exports.isWeakSet = isWeakSet;

function isArrayBufferToString(value) {
  return ObjectToString(value) === '[object ArrayBuffer]';
}
isArrayBufferToString.working = (
  typeof ArrayBuffer !== 'undefined' &&
  isArrayBufferToString(new ArrayBuffer())
);
function isArrayBuffer(value) {
  if (typeof ArrayBuffer === 'undefined') {
    return false;
  }

  return isArrayBufferToString.working
    ? isArrayBufferToString(value)
    : value instanceof ArrayBuffer;
}
exports.isArrayBuffer = isArrayBuffer;

function isDataViewToString(value) {
  return ObjectToString(value) === '[object DataView]';
}
isDataViewToString.working = (
  typeof ArrayBuffer !== 'undefined' &&
  typeof DataView !== 'undefined' &&
  isDataViewToString(new DataView(new ArrayBuffer(1), 0, 1))
);
function isDataView(value) {
  if (typeof DataView === 'undefined') {
    return false;
  }

  return isDataViewToString.working
    ? isDataViewToString(value)
    : value instanceof DataView;
}
exports.isDataView = isDataView;

// Store a copy of SharedArrayBuffer in case it's deleted elsewhere
var SharedArrayBufferCopy = typeof SharedArrayBuffer !== 'undefined' ? SharedArrayBuffer : undefined;
function isSharedArrayBufferToString(value) {
  return ObjectToString(value) === '[object SharedArrayBuffer]';
}
function isSharedArrayBuffer(value) {
  if (typeof SharedArrayBufferCopy === 'undefined') {
    return false;
  }

  if (typeof isSharedArrayBufferToString.working === 'undefined') {
    isSharedArrayBufferToString.working = isSharedArrayBufferToString(new SharedArrayBufferCopy());
  }

  return isSharedArrayBufferToString.working
    ? isSharedArrayBufferToString(value)
    : value instanceof SharedArrayBufferCopy;
}
exports.isSharedArrayBuffer = isSharedArrayBuffer;

function isAsyncFunction(value) {
  return ObjectToString(value) === '[object AsyncFunction]';
}
exports.isAsyncFunction = isAsyncFunction;

function isMapIterator(value) {
  return ObjectToString(value) === '[object Map Iterator]';
}
exports.isMapIterator = isMapIterator;

function isSetIterator(value) {
  return ObjectToString(value) === '[object Set Iterator]';
}
exports.isSetIterator = isSetIterator;

function isGeneratorObject(value) {
  return ObjectToString(value) === '[object Generator]';
}
exports.isGeneratorObject = isGeneratorObject;

function isWebAssemblyCompiledModule(value) {
  return ObjectToString(value) === '[object WebAssembly.Module]';
}
exports.isWebAssemblyCompiledModule = isWebAssemblyCompiledModule;

function isNumberObject(value) {
  return checkBoxedPrimitive(value, numberValue);
}
exports.isNumberObject = isNumberObject;

function isStringObject(value) {
  return checkBoxedPrimitive(value, stringValue);
}
exports.isStringObject = isStringObject;

function isBooleanObject(value) {
  return checkBoxedPrimitive(value, booleanValue);
}
exports.isBooleanObject = isBooleanObject;

function isBigIntObject(value) {
  return BigIntSupported && checkBoxedPrimitive(value, bigIntValue);
}
exports.isBigIntObject = isBigIntObject;

function isSymbolObject(value) {
  return SymbolSupported && checkBoxedPrimitive(value, symbolValue);
}
exports.isSymbolObject = isSymbolObject;

function isBoxedPrimitive(value) {
  return (
    isNumberObject(value) ||
    isStringObject(value) ||
    isBooleanObject(value) ||
    isBigIntObject(value) ||
    isSymbolObject(value)
  );
}
exports.isBoxedPrimitive = isBoxedPrimitive;

function isAnyArrayBuffer(value) {
  return typeof Uint8Array !== 'undefined' && (
    isArrayBuffer(value) ||
    isSharedArrayBuffer(value)
  );
}
exports.isAnyArrayBuffer = isAnyArrayBuffer;

['isProxy', 'isExternal', 'isModuleNamespaceObject'].forEach(function(method) {
  Object.defineProperty(exports, method, {
    enumerable: false,
    value: function() {
      throw new Error(method + ' is not supported in userland');
    }
  });
});

},{"is-arguments":41,"is-generator-function":43,"is-typed-array":45,"which-typed-array":61}],60:[function(require,module,exports){
(function (process){(function (){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var getOwnPropertyDescriptors = Object.getOwnPropertyDescriptors ||
  function getOwnPropertyDescriptors(obj) {
    var keys = Object.keys(obj);
    var descriptors = {};
    for (var i = 0; i < keys.length; i++) {
      descriptors[keys[i]] = Object.getOwnPropertyDescriptor(obj, keys[i]);
    }
    return descriptors;
  };

var formatRegExp = /%[sdj%]/g;
exports.format = function(f) {
  if (!isString(f)) {
    var objects = [];
    for (var i = 0; i < arguments.length; i++) {
      objects.push(inspect(arguments[i]));
    }
    return objects.join(' ');
  }

  var i = 1;
  var args = arguments;
  var len = args.length;
  var str = String(f).replace(formatRegExp, function(x) {
    if (x === '%%') return '%';
    if (i >= len) return x;
    switch (x) {
      case '%s': return String(args[i++]);
      case '%d': return Number(args[i++]);
      case '%j':
        try {
          return JSON.stringify(args[i++]);
        } catch (_) {
          return '[Circular]';
        }
      default:
        return x;
    }
  });
  for (var x = args[i]; i < len; x = args[++i]) {
    if (isNull(x) || !isObject(x)) {
      str += ' ' + x;
    } else {
      str += ' ' + inspect(x);
    }
  }
  return str;
};


// Mark that a method should not be used.
// Returns a modified function which warns once by default.
// If --no-deprecation is set, then it is a no-op.
exports.deprecate = function(fn, msg) {
  if (typeof process !== 'undefined' && process.noDeprecation === true) {
    return fn;
  }

  // Allow for deprecating things in the process of starting up.
  if (typeof process === 'undefined') {
    return function() {
      return exports.deprecate(fn, msg).apply(this, arguments);
    };
  }

  var warned = false;
  function deprecated() {
    if (!warned) {
      if (process.throwDeprecation) {
        throw new Error(msg);
      } else if (process.traceDeprecation) {
        console.trace(msg);
      } else {
        console.error(msg);
      }
      warned = true;
    }
    return fn.apply(this, arguments);
  }

  return deprecated;
};


var debugs = {};
var debugEnvRegex = /^$/;

if (process.env.NODE_DEBUG) {
  var debugEnv = process.env.NODE_DEBUG;
  debugEnv = debugEnv.replace(/[|\\{}()[\]^$+?.]/g, '\\$&')
    .replace(/\*/g, '.*')
    .replace(/,/g, '$|^')
    .toUpperCase();
  debugEnvRegex = new RegExp('^' + debugEnv + '$', 'i');
}
exports.debuglog = function(set) {
  set = set.toUpperCase();
  if (!debugs[set]) {
    if (debugEnvRegex.test(set)) {
      var pid = process.pid;
      debugs[set] = function() {
        var msg = exports.format.apply(exports, arguments);
        console.error('%s %d: %s', set, pid, msg);
      };
    } else {
      debugs[set] = function() {};
    }
  }
  return debugs[set];
};


/**
 * Echos the value of a value. Trys to print the value out
 * in the best way possible given the different types.
 *
 * @param {Object} obj The object to print out.
 * @param {Object} opts Optional options object that alters the output.
 */
/* legacy: obj, showHidden, depth, colors*/
function inspect(obj, opts) {
  // default options
  var ctx = {
    seen: [],
    stylize: stylizeNoColor
  };
  // legacy...
  if (arguments.length >= 3) ctx.depth = arguments[2];
  if (arguments.length >= 4) ctx.colors = arguments[3];
  if (isBoolean(opts)) {
    // legacy...
    ctx.showHidden = opts;
  } else if (opts) {
    // got an "options" object
    exports._extend(ctx, opts);
  }
  // set default options
  if (isUndefined(ctx.showHidden)) ctx.showHidden = false;
  if (isUndefined(ctx.depth)) ctx.depth = 2;
  if (isUndefined(ctx.colors)) ctx.colors = false;
  if (isUndefined(ctx.customInspect)) ctx.customInspect = true;
  if (ctx.colors) ctx.stylize = stylizeWithColor;
  return formatValue(ctx, obj, ctx.depth);
}
exports.inspect = inspect;


// http://en.wikipedia.org/wiki/ANSI_escape_code#graphics
inspect.colors = {
  'bold' : [1, 22],
  'italic' : [3, 23],
  'underline' : [4, 24],
  'inverse' : [7, 27],
  'white' : [37, 39],
  'grey' : [90, 39],
  'black' : [30, 39],
  'blue' : [34, 39],
  'cyan' : [36, 39],
  'green' : [32, 39],
  'magenta' : [35, 39],
  'red' : [31, 39],
  'yellow' : [33, 39]
};

// Don't use 'blue' not visible on cmd.exe
inspect.styles = {
  'special': 'cyan',
  'number': 'yellow',
  'boolean': 'yellow',
  'undefined': 'grey',
  'null': 'bold',
  'string': 'green',
  'date': 'magenta',
  // "name": intentionally not styling
  'regexp': 'red'
};


function stylizeWithColor(str, styleType) {
  var style = inspect.styles[styleType];

  if (style) {
    return '\u001b[' + inspect.colors[style][0] + 'm' + str +
           '\u001b[' + inspect.colors[style][1] + 'm';
  } else {
    return str;
  }
}


function stylizeNoColor(str, styleType) {
  return str;
}


function arrayToHash(array) {
  var hash = {};

  array.forEach(function(val, idx) {
    hash[val] = true;
  });

  return hash;
}


function formatValue(ctx, value, recurseTimes) {
  // Provide a hook for user-specified inspect functions.
  // Check that value is an object with an inspect function on it
  if (ctx.customInspect &&
      value &&
      isFunction(value.inspect) &&
      // Filter out the util module, it's inspect function is special
      value.inspect !== exports.inspect &&
      // Also filter out any prototype objects using the circular check.
      !(value.constructor && value.constructor.prototype === value)) {
    var ret = value.inspect(recurseTimes, ctx);
    if (!isString(ret)) {
      ret = formatValue(ctx, ret, recurseTimes);
    }
    return ret;
  }

  // Primitive types cannot have properties
  var primitive = formatPrimitive(ctx, value);
  if (primitive) {
    return primitive;
  }

  // Look up the keys of the object.
  var keys = Object.keys(value);
  var visibleKeys = arrayToHash(keys);

  if (ctx.showHidden) {
    keys = Object.getOwnPropertyNames(value);
  }

  // IE doesn't make error fields non-enumerable
  // http://msdn.microsoft.com/en-us/library/ie/dww52sbt(v=vs.94).aspx
  if (isError(value)
      && (keys.indexOf('message') >= 0 || keys.indexOf('description') >= 0)) {
    return formatError(value);
  }

  // Some type of object without properties can be shortcutted.
  if (keys.length === 0) {
    if (isFunction(value)) {
      var name = value.name ? ': ' + value.name : '';
      return ctx.stylize('[Function' + name + ']', 'special');
    }
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    }
    if (isDate(value)) {
      return ctx.stylize(Date.prototype.toString.call(value), 'date');
    }
    if (isError(value)) {
      return formatError(value);
    }
  }

  var base = '', array = false, braces = ['{', '}'];

  // Make Array say that they are Array
  if (isArray(value)) {
    array = true;
    braces = ['[', ']'];
  }

  // Make functions say that they are functions
  if (isFunction(value)) {
    var n = value.name ? ': ' + value.name : '';
    base = ' [Function' + n + ']';
  }

  // Make RegExps say that they are RegExps
  if (isRegExp(value)) {
    base = ' ' + RegExp.prototype.toString.call(value);
  }

  // Make dates with properties first say the date
  if (isDate(value)) {
    base = ' ' + Date.prototype.toUTCString.call(value);
  }

  // Make error with message first say the error
  if (isError(value)) {
    base = ' ' + formatError(value);
  }

  if (keys.length === 0 && (!array || value.length == 0)) {
    return braces[0] + base + braces[1];
  }

  if (recurseTimes < 0) {
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    } else {
      return ctx.stylize('[Object]', 'special');
    }
  }

  ctx.seen.push(value);

  var output;
  if (array) {
    output = formatArray(ctx, value, recurseTimes, visibleKeys, keys);
  } else {
    output = keys.map(function(key) {
      return formatProperty(ctx, value, recurseTimes, visibleKeys, key, array);
    });
  }

  ctx.seen.pop();

  return reduceToSingleString(output, base, braces);
}


function formatPrimitive(ctx, value) {
  if (isUndefined(value))
    return ctx.stylize('undefined', 'undefined');
  if (isString(value)) {
    var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '')
                                             .replace(/'/g, "\\'")
                                             .replace(/\\"/g, '"') + '\'';
    return ctx.stylize(simple, 'string');
  }
  if (isNumber(value))
    return ctx.stylize('' + value, 'number');
  if (isBoolean(value))
    return ctx.stylize('' + value, 'boolean');
  // For some reason typeof null is "object", so special case here.
  if (isNull(value))
    return ctx.stylize('null', 'null');
}


function formatError(value) {
  return '[' + Error.prototype.toString.call(value) + ']';
}


function formatArray(ctx, value, recurseTimes, visibleKeys, keys) {
  var output = [];
  for (var i = 0, l = value.length; i < l; ++i) {
    if (hasOwnProperty(value, String(i))) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          String(i), true));
    } else {
      output.push('');
    }
  }
  keys.forEach(function(key) {
    if (!key.match(/^\d+$/)) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          key, true));
    }
  });
  return output;
}


function formatProperty(ctx, value, recurseTimes, visibleKeys, key, array) {
  var name, str, desc;
  desc = Object.getOwnPropertyDescriptor(value, key) || { value: value[key] };
  if (desc.get) {
    if (desc.set) {
      str = ctx.stylize('[Getter/Setter]', 'special');
    } else {
      str = ctx.stylize('[Getter]', 'special');
    }
  } else {
    if (desc.set) {
      str = ctx.stylize('[Setter]', 'special');
    }
  }
  if (!hasOwnProperty(visibleKeys, key)) {
    name = '[' + key + ']';
  }
  if (!str) {
    if (ctx.seen.indexOf(desc.value) < 0) {
      if (isNull(recurseTimes)) {
        str = formatValue(ctx, desc.value, null);
      } else {
        str = formatValue(ctx, desc.value, recurseTimes - 1);
      }
      if (str.indexOf('\n') > -1) {
        if (array) {
          str = str.split('\n').map(function(line) {
            return '  ' + line;
          }).join('\n').slice(2);
        } else {
          str = '\n' + str.split('\n').map(function(line) {
            return '   ' + line;
          }).join('\n');
        }
      }
    } else {
      str = ctx.stylize('[Circular]', 'special');
    }
  }
  if (isUndefined(name)) {
    if (array && key.match(/^\d+$/)) {
      return str;
    }
    name = JSON.stringify('' + key);
    if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
      name = name.slice(1, -1);
      name = ctx.stylize(name, 'name');
    } else {
      name = name.replace(/'/g, "\\'")
                 .replace(/\\"/g, '"')
                 .replace(/(^"|"$)/g, "'");
      name = ctx.stylize(name, 'string');
    }
  }

  return name + ': ' + str;
}


function reduceToSingleString(output, base, braces) {
  var numLinesEst = 0;
  var length = output.reduce(function(prev, cur) {
    numLinesEst++;
    if (cur.indexOf('\n') >= 0) numLinesEst++;
    return prev + cur.replace(/\u001b\[\d\d?m/g, '').length + 1;
  }, 0);

  if (length > 60) {
    return braces[0] +
           (base === '' ? '' : base + '\n ') +
           ' ' +
           output.join(',\n  ') +
           ' ' +
           braces[1];
  }

  return braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
}


// NOTE: These type checking functions intentionally don't use `instanceof`
// because it is fragile and can be easily faked with `Object.create()`.
exports.types = require('./support/types');

function isArray(ar) {
  return Array.isArray(ar);
}
exports.isArray = isArray;

function isBoolean(arg) {
  return typeof arg === 'boolean';
}
exports.isBoolean = isBoolean;

function isNull(arg) {
  return arg === null;
}
exports.isNull = isNull;

function isNullOrUndefined(arg) {
  return arg == null;
}
exports.isNullOrUndefined = isNullOrUndefined;

function isNumber(arg) {
  return typeof arg === 'number';
}
exports.isNumber = isNumber;

function isString(arg) {
  return typeof arg === 'string';
}
exports.isString = isString;

function isSymbol(arg) {
  return typeof arg === 'symbol';
}
exports.isSymbol = isSymbol;

function isUndefined(arg) {
  return arg === void 0;
}
exports.isUndefined = isUndefined;

function isRegExp(re) {
  return isObject(re) && objectToString(re) === '[object RegExp]';
}
exports.isRegExp = isRegExp;
exports.types.isRegExp = isRegExp;

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}
exports.isObject = isObject;

function isDate(d) {
  return isObject(d) && objectToString(d) === '[object Date]';
}
exports.isDate = isDate;
exports.types.isDate = isDate;

function isError(e) {
  return isObject(e) &&
      (objectToString(e) === '[object Error]' || e instanceof Error);
}
exports.isError = isError;
exports.types.isNativeError = isError;

function isFunction(arg) {
  return typeof arg === 'function';
}
exports.isFunction = isFunction;

function isPrimitive(arg) {
  return arg === null ||
         typeof arg === 'boolean' ||
         typeof arg === 'number' ||
         typeof arg === 'string' ||
         typeof arg === 'symbol' ||  // ES6 symbol
         typeof arg === 'undefined';
}
exports.isPrimitive = isPrimitive;

exports.isBuffer = require('./support/isBuffer');

function objectToString(o) {
  return Object.prototype.toString.call(o);
}


function pad(n) {
  return n < 10 ? '0' + n.toString(10) : n.toString(10);
}


var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
              'Oct', 'Nov', 'Dec'];

// 26 Feb 16:19:34
function timestamp() {
  var d = new Date();
  var time = [pad(d.getHours()),
              pad(d.getMinutes()),
              pad(d.getSeconds())].join(':');
  return [d.getDate(), months[d.getMonth()], time].join(' ');
}


// log is just a thin wrapper to console.log that prepends a timestamp
exports.log = function() {
  console.log('%s - %s', timestamp(), exports.format.apply(exports, arguments));
};


/**
 * Inherit the prototype methods from one constructor into another.
 *
 * The Function.prototype.inherits from lang.js rewritten as a standalone
 * function (not on Function.prototype). NOTE: If this file is to be loaded
 * during bootstrapping this function needs to be rewritten using some native
 * functions as prototype setup using normal JavaScript does not work as
 * expected during bootstrapping (see mirror.js in r114903).
 *
 * @param {function} ctor Constructor function which needs to inherit the
 *     prototype.
 * @param {function} superCtor Constructor function to inherit prototype from.
 */
exports.inherits = require('inherits');

exports._extend = function(origin, add) {
  // Don't do anything if add isn't an object
  if (!add || !isObject(add)) return origin;

  var keys = Object.keys(add);
  var i = keys.length;
  while (i--) {
    origin[keys[i]] = add[keys[i]];
  }
  return origin;
};

function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

var kCustomPromisifiedSymbol = typeof Symbol !== 'undefined' ? Symbol('util.promisify.custom') : undefined;

exports.promisify = function promisify(original) {
  if (typeof original !== 'function')
    throw new TypeError('The "original" argument must be of type Function');

  if (kCustomPromisifiedSymbol && original[kCustomPromisifiedSymbol]) {
    var fn = original[kCustomPromisifiedSymbol];
    if (typeof fn !== 'function') {
      throw new TypeError('The "util.promisify.custom" argument must be of type Function');
    }
    Object.defineProperty(fn, kCustomPromisifiedSymbol, {
      value: fn, enumerable: false, writable: false, configurable: true
    });
    return fn;
  }

  function fn() {
    var promiseResolve, promiseReject;
    var promise = new Promise(function (resolve, reject) {
      promiseResolve = resolve;
      promiseReject = reject;
    });

    var args = [];
    for (var i = 0; i < arguments.length; i++) {
      args.push(arguments[i]);
    }
    args.push(function (err, value) {
      if (err) {
        promiseReject(err);
      } else {
        promiseResolve(value);
      }
    });

    try {
      original.apply(this, args);
    } catch (err) {
      promiseReject(err);
    }

    return promise;
  }

  Object.setPrototypeOf(fn, Object.getPrototypeOf(original));

  if (kCustomPromisifiedSymbol) Object.defineProperty(fn, kCustomPromisifiedSymbol, {
    value: fn, enumerable: false, writable: false, configurable: true
  });
  return Object.defineProperties(
    fn,
    getOwnPropertyDescriptors(original)
  );
}

exports.promisify.custom = kCustomPromisifiedSymbol

function callbackifyOnRejected(reason, cb) {
  // `!reason` guard inspired by bluebird (Ref: https://goo.gl/t5IS6M).
  // Because `null` is a special error value in callbacks which means "no error
  // occurred", we error-wrap so the callback consumer can distinguish between
  // "the promise rejected with null" or "the promise fulfilled with undefined".
  if (!reason) {
    var newReason = new Error('Promise was rejected with a falsy value');
    newReason.reason = reason;
    reason = newReason;
  }
  return cb(reason);
}

function callbackify(original) {
  if (typeof original !== 'function') {
    throw new TypeError('The "original" argument must be of type Function');
  }

  // We DO NOT return the promise as it gives the user a false sense that
  // the promise is actually somehow related to the callback's execution
  // and that the callback throwing will reject the promise.
  function callbackified() {
    var args = [];
    for (var i = 0; i < arguments.length; i++) {
      args.push(arguments[i]);
    }

    var maybeCb = args.pop();
    if (typeof maybeCb !== 'function') {
      throw new TypeError('The last argument must be of type Function');
    }
    var self = this;
    var cb = function() {
      return maybeCb.apply(self, arguments);
    };
    // In true node style we process the callback on `nextTick` with all the
    // implications (stack, `uncaughtException`, `async_hooks`)
    original.apply(this, args)
      .then(function(ret) { process.nextTick(cb.bind(null, null, ret)) },
            function(rej) { process.nextTick(callbackifyOnRejected.bind(null, rej, cb)) });
  }

  Object.setPrototypeOf(callbackified, Object.getPrototypeOf(original));
  Object.defineProperties(callbackified,
                          getOwnPropertyDescriptors(original));
  return callbackified;
}
exports.callbackify = callbackify;

}).call(this)}).call(this,require('_process'))
},{"./support/isBuffer":58,"./support/types":59,"_process":55,"inherits":40}],61:[function(require,module,exports){
(function (global){(function (){
'use strict';

var forEach = require('for-each');
var availableTypedArrays = require('available-typed-arrays');
var callBind = require('call-bind');
var callBound = require('call-bound');
var gOPD = require('gopd');
var getProto = require('get-proto');

var $toString = callBound('Object.prototype.toString');
var hasToStringTag = require('has-tostringtag/shams')();

var g = typeof globalThis === 'undefined' ? global : globalThis;
var typedArrays = availableTypedArrays();

var $slice = callBound('String.prototype.slice');

/** @type {<T = unknown>(array: readonly T[], value: unknown) => number} */
var $indexOf = callBound('Array.prototype.indexOf', true) || function indexOf(array, value) {
	for (var i = 0; i < array.length; i += 1) {
		if (array[i] === value) {
			return i;
		}
	}
	return -1;
};

/** @typedef {import('./types').Getter} Getter */
/** @type {import('./types').Cache} */
var cache = { __proto__: null };
if (hasToStringTag && gOPD && getProto) {
	forEach(typedArrays, function (typedArray) {
		var arr = new g[typedArray]();
		if (Symbol.toStringTag in arr && getProto) {
			var proto = getProto(arr);
			// @ts-expect-error TS won't narrow inside a closure
			var descriptor = gOPD(proto, Symbol.toStringTag);
			if (!descriptor && proto) {
				var superProto = getProto(proto);
				// @ts-expect-error TS won't narrow inside a closure
				descriptor = gOPD(superProto, Symbol.toStringTag);
			}
			// @ts-expect-error TODO: fix
			cache['$' + typedArray] = callBind(descriptor.get);
		}
	});
} else {
	forEach(typedArrays, function (typedArray) {
		var arr = new g[typedArray]();
		var fn = arr.slice || arr.set;
		if (fn) {
			cache[
				/** @type {`$${import('.').TypedArrayName}`} */ ('$' + typedArray)
			] = /** @type {import('./types').BoundSlice | import('./types').BoundSet} */ (
				// @ts-expect-error TODO FIXME
				callBind(fn)
			);
		}
	});
}

/** @type {(value: object) => false | import('.').TypedArrayName} */
var tryTypedArrays = function tryAllTypedArrays(value) {
	/** @type {ReturnType<typeof tryAllTypedArrays>} */ var found = false;
	forEach(
		/** @type {Record<`\$${import('.').TypedArrayName}`, Getter>} */ (cache),
		/** @type {(getter: Getter, name: `\$${import('.').TypedArrayName}`) => void} */
		function (getter, typedArray) {
			if (!found) {
				try {
					// @ts-expect-error a throw is fine here
					if ('$' + getter(value) === typedArray) {
						found = /** @type {import('.').TypedArrayName} */ ($slice(typedArray, 1));
					}
				} catch (e) { /**/ }
			}
		}
	);
	return found;
};

/** @type {(value: object) => false | import('.').TypedArrayName} */
var trySlices = function tryAllSlices(value) {
	/** @type {ReturnType<typeof tryAllSlices>} */ var found = false;
	forEach(
		/** @type {Record<`\$${import('.').TypedArrayName}`, Getter>} */(cache),
		/** @type {(getter: Getter, name: `\$${import('.').TypedArrayName}`) => void} */ function (getter, name) {
			if (!found) {
				try {
					// @ts-expect-error a throw is fine here
					getter(value);
					found = /** @type {import('.').TypedArrayName} */ ($slice(name, 1));
				} catch (e) { /**/ }
			}
		}
	);
	return found;
};

/** @type {import('.')} */
module.exports = function whichTypedArray(value) {
	if (!value || typeof value !== 'object') { return false; }
	if (!hasToStringTag) {
		/** @type {string} */
		var tag = $slice($toString(value), 8, -1);
		if ($indexOf(typedArrays, tag) > -1) {
			return tag;
		}
		if (tag !== 'Object') {
			return false;
		}
		// node < 0.6 hits here on real Typed Arrays
		return trySlices(value);
	}
	if (!gOPD) { return null; } // unknown engine
	return tryTypedArrays(value);
};

}).call(this)}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"available-typed-arrays":1,"call-bind":10,"call-bound":11,"for-each":24,"get-proto":31,"gopd":33,"has-tostringtag/shams":37}],62:[function(require,module,exports){
(function (Buffer){(function (){
/*
MAVLink protocol implementation for node.js (auto-generated by mavgen_javascript.py)

Generated from: common.xml,standard.xml,minimal.xml

Note: this file has been auto-generated. DO NOT EDIT
*/

jspack = require("jspack").jspack,
    _ = require("underscore"),
    events = require("events"),
    util = require("util");

// Add a convenience method to Buffer
Buffer.prototype.toByteArray = function () {
  return Array.prototype.slice.call(this, 0)
}

mavlink20 = function(){};

// Implement the CRC-16/MCRF4XX function (present in the Python version through the mavutil.py package)
mavlink20.x25Crc = function(buffer, crcIN) {

    var bytes = buffer;
    var crcOUT = crcIN ===  undefined ? 0xffff : crcIN;
    _.each(bytes, function(e) {
        var tmp = e ^ (crcOUT & 0xff);
        tmp = (tmp ^ (tmp << 4)) & 0xff;
        crcOUT = (crcOUT >> 8) ^ (tmp << 8) ^ (tmp << 3) ^ (tmp >> 4);
        crcOUT = crcOUT & 0xffff;
    });
    return crcOUT;

}

mavlink20.WIRE_PROTOCOL_VERSION = "2.0";
mavlink20.HEADER_LEN = 10;

mavlink20.MAVLINK_TYPE_CHAR     = 0
mavlink20.MAVLINK_TYPE_UINT8_T  = 1
mavlink20.MAVLINK_TYPE_INT8_T   = 2
mavlink20.MAVLINK_TYPE_UINT16_T = 3
mavlink20.MAVLINK_TYPE_INT16_T  = 4
mavlink20.MAVLINK_TYPE_UINT32_T = 5
mavlink20.MAVLINK_TYPE_INT32_T  = 6
mavlink20.MAVLINK_TYPE_UINT64_T = 7
mavlink20.MAVLINK_TYPE_INT64_T  = 8
mavlink20.MAVLINK_TYPE_FLOAT    = 9
mavlink20.MAVLINK_TYPE_DOUBLE   = 10

mavlink20.MAVLINK_IFLAG_SIGNED = 0x01

// Mavlink headers incorporate sequence, source system (platform) and source component. 
mavlink20.header = function(msgId, mlen, seq, srcSystem, srcComponent, incompat_flags=0, compat_flags=0,) {

    this.mlen = ( typeof mlen === 'undefined' ) ? 0 : mlen;
    this.seq = ( typeof seq === 'undefined' ) ? 0 : seq;
    this.srcSystem = ( typeof srcSystem === 'undefined' ) ? 0 : srcSystem;
    this.srcComponent = ( typeof srcComponent === 'undefined' ) ? 0 : srcComponent;
    this.msgId = msgId
    this.incompat_flags = incompat_flags
    this.compat_flags = compat_flags

}
mavlink20.header.prototype.pack = function() {
    return jspack.Pack('BBBBBBBHB', [253, this.mlen, this.incompat_flags, this.compat_flags, this.seq, this.srcSystem, this.srcComponent, ((this.msgId & 0xFF) << 8) | ((this.msgId >> 8) & 0xFF), this.msgId>>16]);
}
        
// Base class declaration: mavlink.message will be the parent class for each
// concrete implementation in mavlink.messages.
mavlink20.message = function() {};

// Convenience setter to facilitate turning the unpacked array of data into member properties
mavlink20.message.prototype.set = function(args) {
    _.each(this.fieldnames, function(e, i) {
        this[e] = args[i];
    }, this);
};

// This pack function builds the header and produces a complete MAVLink message,
// including header and message CRC.
mavlink20.message.prototype.pack = function(mav, crc_extra, payload) {

    this.payload = payload;
    var plen = this.payload.length;
        //in MAVLink2 we can strip trailing zeros off payloads. This allows for simple
        // variable length arrays and smaller packets
        while (plen > 1 && this.payload[plen-1] == 0) {
                plen = plen - 1;
        }
        this.payload = this.payload.slice(0, plen);
        var incompat_flags = 0;
    this.header = new mavlink20.header(this.id, this.payload.length, mav.seq, mav.srcSystem, mav.srcComponent, incompat_flags, 0,);    
    this.msgbuf = this.header.pack().concat(this.payload);
    var crc = mavlink20.x25Crc(this.msgbuf.slice(1));

    // For now, assume always using crc_extra = True.  TODO: check/fix this.
    crc = mavlink20.x25Crc([crc_extra], crc);
    this.msgbuf = this.msgbuf.concat(jspack.Pack('<H', [crc] ) );
    return this.msgbuf;

}


// enums

// HL_FAILURE_FLAG
mavlink20.HL_FAILURE_FLAG_GPS = 1 // GPS failure.
mavlink20.HL_FAILURE_FLAG_DIFFERENTIAL_PRESSURE = 2 // Differential pressure sensor failure.
mavlink20.HL_FAILURE_FLAG_ABSOLUTE_PRESSURE = 4 // Absolute pressure sensor failure.
mavlink20.HL_FAILURE_FLAG_3D_ACCEL = 8 // Accelerometer sensor failure.
mavlink20.HL_FAILURE_FLAG_3D_GYRO = 16 // Gyroscope sensor failure.
mavlink20.HL_FAILURE_FLAG_3D_MAG = 32 // Magnetometer sensor failure.
mavlink20.HL_FAILURE_FLAG_TERRAIN = 64 // Terrain subsystem failure.
mavlink20.HL_FAILURE_FLAG_BATTERY = 128 // Battery failure/critical low battery.
mavlink20.HL_FAILURE_FLAG_RC_RECEIVER = 256 // RC receiver failure/no RC connection.
mavlink20.HL_FAILURE_FLAG_OFFBOARD_LINK = 512 // Offboard link failure.
mavlink20.HL_FAILURE_FLAG_ENGINE = 1024 // Engine failure.
mavlink20.HL_FAILURE_FLAG_GEOFENCE = 2048 // Geofence violation.
mavlink20.HL_FAILURE_FLAG_ESTIMATOR = 4096 // Estimator failure, for example measurement rejection or large
                        // variances.
mavlink20.HL_FAILURE_FLAG_MISSION = 8192 // Mission failure.
mavlink20.HL_FAILURE_FLAG_ENUM_END = 8193 // 

// MAV_GOTO
mavlink20.MAV_GOTO_DO_HOLD = 0 // Hold at the current position.
mavlink20.MAV_GOTO_DO_CONTINUE = 1 // Continue with the next item in mission execution.
mavlink20.MAV_GOTO_HOLD_AT_CURRENT_POSITION = 2 // Hold at the current position of the system
mavlink20.MAV_GOTO_HOLD_AT_SPECIFIED_POSITION = 3 // Hold at the position specified in the parameters of the DO_HOLD action
mavlink20.MAV_GOTO_ENUM_END = 4 // 

// MAV_MODE
mavlink20.MAV_MODE_PREFLIGHT = 0 // System is not ready to fly, booting, calibrating, etc. No flag is set.
mavlink20.MAV_MODE_MANUAL_DISARMED = 64 // System is allowed to be active, under manual (RC) control, no
                        // stabilization
                        // (MAV_MODE_FLAG_MANUAL_INPUT_ENABLED)
mavlink20.MAV_MODE_TEST_DISARMED = 66 // UNDEFINED mode. This solely depends on the autopilot - use with
                        // caution, intended for developers only.
                        // (MAV_MODE_FLAG_MANUAL_INPUT_ENABLED,
                        // MAV_MODE_FLAG_TEST_ENABLED).
mavlink20.MAV_MODE_STABILIZE_DISARMED = 80 // System is allowed to be active, under assisted RC control
                        // (MAV_MODE_FLAG_SAFETY_ARMED,
                        // MAV_MODE_FLAG_STABILIZE_ENABLED)
mavlink20.MAV_MODE_GUIDED_DISARMED = 88 // System is allowed to be active, under autonomous control, manual
                        // setpoint (MAV_MODE_FLAG_SAFETY_ARMED,
                        // MAV_MODE_FLAG_STABILIZE_ENABLED,
                        // MAV_MODE_FLAG_GUIDED_ENABLED)
mavlink20.MAV_MODE_AUTO_DISARMED = 92 // System is allowed to be active, under autonomous control and
                        // navigation (the trajectory is decided
                        // onboard and not pre-programmed by
                        // waypoints). (MAV_MODE_FLAG_SAFETY_ARMED,
                        // MAV_MODE_FLAG_STABILIZE_ENABLED,
                        // MAV_MODE_FLAG_GUIDED_ENABLED,
                        // MAV_MODE_FLAG_AUTO_ENABLED).
mavlink20.MAV_MODE_MANUAL_ARMED = 192 // System is allowed to be active, under manual (RC) control, no
                        // stabilization (MAV_MODE_FLAG_SAFETY_ARMED,
                        // MAV_MODE_FLAG_MANUAL_INPUT_ENABLED)
mavlink20.MAV_MODE_TEST_ARMED = 194 // UNDEFINED mode. This solely depends on the autopilot - use with
                        // caution, intended for developers only
                        // (MAV_MODE_FLAG_SAFETY_ARMED,
                        // MAV_MODE_FLAG_MANUAL_INPUT_ENABLED,
                        // MAV_MODE_FLAG_TEST_ENABLED)
mavlink20.MAV_MODE_STABILIZE_ARMED = 208 // System is allowed to be active, under assisted RC control
                        // (MAV_MODE_FLAG_SAFETY_ARMED,
                        // MAV_MODE_FLAG_MANUAL_INPUT_ENABLED,
                        // MAV_MODE_FLAG_STABILIZE_ENABLED)
mavlink20.MAV_MODE_GUIDED_ARMED = 216 // System is allowed to be active, under autonomous control, manual
                        // setpoint (MAV_MODE_FLAG_SAFETY_ARMED,
                        // MAV_MODE_FLAG_MANUAL_INPUT_ENABLED,
                        // MAV_MODE_FLAG_STABILIZE_ENABLED,
                        // MAV_MODE_FLAG_GUIDED_ENABLED)
mavlink20.MAV_MODE_AUTO_ARMED = 220 // System is allowed to be active, under autonomous control and
                        // navigation (the trajectory is decided
                        // onboard and not pre-programmed by
                        // waypoints). (MAV_MODE_FLAG_SAFETY_ARMED,
                        // MAV_MODE_FLAG_MANUAL_INPUT_ENABLED,
                        // MAV_MODE_FLAG_STABILIZE_ENABLED, MAV_MODE_F
                        // LAG_GUIDED_ENABLED,MAV_MODE_FLAG_AUTO_ENABL
                        // ED).
mavlink20.MAV_MODE_ENUM_END = 221 // 

// MAV_SYS_STATUS_SENSOR
mavlink20.MAV_SYS_STATUS_SENSOR_3D_GYRO = 1 // 0x01 3D gyro
mavlink20.MAV_SYS_STATUS_SENSOR_3D_ACCEL = 2 // 0x02 3D accelerometer
mavlink20.MAV_SYS_STATUS_SENSOR_3D_MAG = 4 // 0x04 3D magnetometer
mavlink20.MAV_SYS_STATUS_SENSOR_ABSOLUTE_PRESSURE = 8 // 0x08 absolute pressure
mavlink20.MAV_SYS_STATUS_SENSOR_DIFFERENTIAL_PRESSURE = 16 // 0x10 differential pressure
mavlink20.MAV_SYS_STATUS_SENSOR_GPS = 32 // 0x20 GPS
mavlink20.MAV_SYS_STATUS_SENSOR_OPTICAL_FLOW = 64 // 0x40 optical flow
mavlink20.MAV_SYS_STATUS_SENSOR_VISION_POSITION = 128 // 0x80 computer vision position
mavlink20.MAV_SYS_STATUS_SENSOR_LASER_POSITION = 256 // 0x100 laser based position
mavlink20.MAV_SYS_STATUS_SENSOR_EXTERNAL_GROUND_TRUTH = 512 // 0x200 external ground truth (Vicon or Leica)
mavlink20.MAV_SYS_STATUS_SENSOR_ANGULAR_RATE_CONTROL = 1024 // 0x400 3D angular rate control
mavlink20.MAV_SYS_STATUS_SENSOR_ATTITUDE_STABILIZATION = 2048 // 0x800 attitude stabilization
mavlink20.MAV_SYS_STATUS_SENSOR_YAW_POSITION = 4096 // 0x1000 yaw position
mavlink20.MAV_SYS_STATUS_SENSOR_Z_ALTITUDE_CONTROL = 8192 // 0x2000 z/altitude control
mavlink20.MAV_SYS_STATUS_SENSOR_XY_POSITION_CONTROL = 16384 // 0x4000 x/y position control
mavlink20.MAV_SYS_STATUS_SENSOR_MOTOR_OUTPUTS = 32768 // 0x8000 motor outputs / control
mavlink20.MAV_SYS_STATUS_SENSOR_RC_RECEIVER = 65536 // 0x10000 RC receiver
mavlink20.MAV_SYS_STATUS_SENSOR_3D_GYRO2 = 131072 // 0x20000 2nd 3D gyro
mavlink20.MAV_SYS_STATUS_SENSOR_3D_ACCEL2 = 262144 // 0x40000 2nd 3D accelerometer
mavlink20.MAV_SYS_STATUS_SENSOR_3D_MAG2 = 524288 // 0x80000 2nd 3D magnetometer
mavlink20.MAV_SYS_STATUS_GEOFENCE = 1048576 // 0x100000 geofence
mavlink20.MAV_SYS_STATUS_AHRS = 2097152 // 0x200000 AHRS subsystem health
mavlink20.MAV_SYS_STATUS_TERRAIN = 4194304 // 0x400000 Terrain subsystem health
mavlink20.MAV_SYS_STATUS_REVERSE_MOTOR = 8388608 // 0x800000 Motors are reversed
mavlink20.MAV_SYS_STATUS_LOGGING = 16777216 // 0x1000000 Logging
mavlink20.MAV_SYS_STATUS_SENSOR_BATTERY = 33554432 // 0x2000000 Battery
mavlink20.MAV_SYS_STATUS_SENSOR_PROXIMITY = 67108864 // 0x4000000 Proximity
mavlink20.MAV_SYS_STATUS_SENSOR_SATCOM = 134217728 // 0x8000000 Satellite Communication
mavlink20.MAV_SYS_STATUS_PREARM_CHECK = 268435456 // 0x10000000 pre-arm check status. Always healthy when armed
mavlink20.MAV_SYS_STATUS_OBSTACLE_AVOIDANCE = 536870912 // 0x20000000 Avoidance/collision prevention
mavlink20.MAV_SYS_STATUS_SENSOR_PROPULSION = 1073741824 // 0x40000000 propulsion (actuator, esc, motor or propellor)
mavlink20.MAV_SYS_STATUS_EXTENSION_USED = 2147483648 // 0x80000000 Extended bit-field are used for further sensor status bits
                        // (needs to be set in
                        // onboard_control_sensors_present only)
mavlink20.MAV_SYS_STATUS_SENSOR_ENUM_END = 2147483649 // 

// MAV_SYS_STATUS_SENSOR_EXTENDED
mavlink20.MAV_SYS_STATUS_RECOVERY_SYSTEM = 1 // 0x01 Recovery system (parachute, balloon, retracts etc)
mavlink20.MAV_SYS_STATUS_SENSOR_EXTENDED_ENUM_END = 2 // 

// MAV_FRAME
mavlink20.MAV_FRAME_GLOBAL = 0 // Global (WGS84) coordinate frame + altitude relative to mean sea level
                        // (MSL).
mavlink20.MAV_FRAME_LOCAL_NED = 1 // NED local tangent frame (x: North, y: East, z: Down) with origin fixed
                        // relative to earth.
mavlink20.MAV_FRAME_MISSION = 2 // NOT a coordinate frame, indicates a mission command.
mavlink20.MAV_FRAME_GLOBAL_RELATIVE_ALT = 3 //            Global (WGS84) coordinate frame + altitude relative to the
                        // home position.
mavlink20.MAV_FRAME_LOCAL_ENU = 4 // ENU local tangent frame (x: East, y: North, z: Up) with origin fixed
                        // relative to earth.
mavlink20.MAV_FRAME_GLOBAL_INT = 5 // Global (WGS84) coordinate frame (scaled) + altitude relative to mean
                        // sea level (MSL).
mavlink20.MAV_FRAME_GLOBAL_RELATIVE_ALT_INT = 6 // Global (WGS84) coordinate frame (scaled) + altitude relative to the
                        // home position.
mavlink20.MAV_FRAME_LOCAL_OFFSET_NED = 7 // NED local tangent frame (x: North, y: East, z: Down) with origin that
                        // travels with the vehicle.
mavlink20.MAV_FRAME_BODY_NED = 8 // Same as MAV_FRAME_LOCAL_NED when used to represent position values.
                        // Same as MAV_FRAME_BODY_FRD when used with
                        // velocity/acceleration values.
mavlink20.MAV_FRAME_BODY_OFFSET_NED = 9 // This is the same as MAV_FRAME_BODY_FRD.
mavlink20.MAV_FRAME_GLOBAL_TERRAIN_ALT = 10 // Global (WGS84) coordinate frame with AGL altitude (altitude at ground
                        // level).
mavlink20.MAV_FRAME_GLOBAL_TERRAIN_ALT_INT = 11 // Global (WGS84) coordinate frame (scaled) with AGL altitude (altitude
                        // at ground level).
mavlink20.MAV_FRAME_BODY_FRD = 12 // FRD local frame aligned to the vehicle's attitude (x: Forward, y:
                        // Right, z: Down) with an origin that travels
                        // with vehicle.
mavlink20.MAV_FRAME_RESERVED_13 = 13 // MAV_FRAME_BODY_FLU - Body fixed frame of reference, Z-up (x: Forward,
                        // y: Left, z: Up).
mavlink20.MAV_FRAME_RESERVED_14 = 14 // MAV_FRAME_MOCAP_NED - Odometry local coordinate frame of data given by
                        // a motion capture system, Z-down (x: North,
                        // y: East, z: Down).
mavlink20.MAV_FRAME_RESERVED_15 = 15 // MAV_FRAME_MOCAP_ENU - Odometry local coordinate frame of data given by
                        // a motion capture system, Z-up (x: East, y:
                        // North, z: Up).
mavlink20.MAV_FRAME_RESERVED_16 = 16 // MAV_FRAME_VISION_NED - Odometry local coordinate frame of data given
                        // by a vision estimation system, Z-down (x:
                        // North, y: East, z: Down).
mavlink20.MAV_FRAME_RESERVED_17 = 17 // MAV_FRAME_VISION_ENU - Odometry local coordinate frame of data given
                        // by a vision estimation system, Z-up (x:
                        // East, y: North, z: Up).
mavlink20.MAV_FRAME_RESERVED_18 = 18 // MAV_FRAME_ESTIM_NED - Odometry local coordinate frame of data given by
                        // an estimator running onboard the vehicle,
                        // Z-down (x: North, y: East, z: Down).
mavlink20.MAV_FRAME_RESERVED_19 = 19 // MAV_FRAME_ESTIM_ENU - Odometry local coordinate frame of data given by
                        // an estimator running onboard the vehicle,
                        // Z-up (x: East, y: North, z: Up).
mavlink20.MAV_FRAME_LOCAL_FRD = 20 // FRD local tangent frame (x: Forward, y: Right, z: Down) with origin
                        // fixed relative to earth. The forward axis
                        // is aligned to the front of the vehicle in
                        // the horizontal plane.
mavlink20.MAV_FRAME_LOCAL_FLU = 21 // FLU local tangent frame (x: Forward, y: Left, z: Up) with origin fixed
                        // relative to earth. The forward axis is
                        // aligned to the front of the vehicle in the
                        // horizontal plane.
mavlink20.MAV_FRAME_ENUM_END = 22 // 

// MAVLINK_DATA_STREAM_TYPE
mavlink20.MAVLINK_DATA_STREAM_IMG_JPEG = 0 // 
mavlink20.MAVLINK_DATA_STREAM_IMG_BMP = 1 // 
mavlink20.MAVLINK_DATA_STREAM_IMG_RAW8U = 2 // 
mavlink20.MAVLINK_DATA_STREAM_IMG_RAW32U = 3 // 
mavlink20.MAVLINK_DATA_STREAM_IMG_PGM = 4 // 
mavlink20.MAVLINK_DATA_STREAM_IMG_PNG = 5 // 
mavlink20.MAVLINK_DATA_STREAM_TYPE_ENUM_END = 6 // 

// FENCE_BREACH
mavlink20.FENCE_BREACH_NONE = 0 // No last fence breach
mavlink20.FENCE_BREACH_MINALT = 1 // Breached minimum altitude
mavlink20.FENCE_BREACH_MAXALT = 2 // Breached maximum altitude
mavlink20.FENCE_BREACH_BOUNDARY = 3 // Breached fence boundary
mavlink20.FENCE_BREACH_ENUM_END = 4 // 

// FENCE_MITIGATE
mavlink20.FENCE_MITIGATE_UNKNOWN = 0 // Unknown
mavlink20.FENCE_MITIGATE_NONE = 1 // No actions being taken
mavlink20.FENCE_MITIGATE_VEL_LIMIT = 2 // Velocity limiting active to prevent breach
mavlink20.FENCE_MITIGATE_ENUM_END = 3 // 

// FENCE_TYPE
mavlink20.FENCE_TYPE_ALT_MAX = 1 // Maximum altitude fence
mavlink20.FENCE_TYPE_CIRCLE = 2 // Circle fence
mavlink20.FENCE_TYPE_POLYGON = 4 // Polygon fence
mavlink20.FENCE_TYPE_ALT_MIN = 8 // Minimum altitude fence
mavlink20.FENCE_TYPE_ENUM_END = 9 // 

// MAV_MOUNT_MODE
mavlink20.MAV_MOUNT_MODE_RETRACT = 0 // Load and keep safe position (Roll,Pitch,Yaw) from permanent memory and
                        // stop stabilization
mavlink20.MAV_MOUNT_MODE_NEUTRAL = 1 // Load and keep neutral position (Roll,Pitch,Yaw) from permanent memory.
mavlink20.MAV_MOUNT_MODE_MAVLINK_TARGETING = 2 // Load neutral position and start MAVLink Roll,Pitch,Yaw control with
                        // stabilization
mavlink20.MAV_MOUNT_MODE_RC_TARGETING = 3 // Load neutral position and start RC Roll,Pitch,Yaw control with
                        // stabilization
mavlink20.MAV_MOUNT_MODE_GPS_POINT = 4 // Load neutral position and start to point to Lat,Lon,Alt
mavlink20.MAV_MOUNT_MODE_SYSID_TARGET = 5 // Gimbal tracks system with specified system ID
mavlink20.MAV_MOUNT_MODE_HOME_LOCATION = 6 // Gimbal tracks home position
mavlink20.MAV_MOUNT_MODE_ENUM_END = 7 // 

// GIMBAL_DEVICE_CAP_FLAGS
mavlink20.GIMBAL_DEVICE_CAP_FLAGS_HAS_RETRACT = 1 // Gimbal device supports a retracted position.
mavlink20.GIMBAL_DEVICE_CAP_FLAGS_HAS_NEUTRAL = 2 // Gimbal device supports a horizontal, forward looking position,
                        // stabilized.
mavlink20.GIMBAL_DEVICE_CAP_FLAGS_HAS_ROLL_AXIS = 4 // Gimbal device supports rotating around roll axis.
mavlink20.GIMBAL_DEVICE_CAP_FLAGS_HAS_ROLL_FOLLOW = 8 // Gimbal device supports to follow a roll angle relative to the vehicle.
mavlink20.GIMBAL_DEVICE_CAP_FLAGS_HAS_ROLL_LOCK = 16 // Gimbal device supports locking to a roll angle (generally that's the
                        // default with roll stabilized).
mavlink20.GIMBAL_DEVICE_CAP_FLAGS_HAS_PITCH_AXIS = 32 // Gimbal device supports rotating around pitch axis.
mavlink20.GIMBAL_DEVICE_CAP_FLAGS_HAS_PITCH_FOLLOW = 64 // Gimbal device supports to follow a pitch angle relative to the
                        // vehicle.
mavlink20.GIMBAL_DEVICE_CAP_FLAGS_HAS_PITCH_LOCK = 128 // Gimbal device supports locking to a pitch angle (generally that's the
                        // default with pitch stabilized).
mavlink20.GIMBAL_DEVICE_CAP_FLAGS_HAS_YAW_AXIS = 256 // Gimbal device supports rotating around yaw axis.
mavlink20.GIMBAL_DEVICE_CAP_FLAGS_HAS_YAW_FOLLOW = 512 // Gimbal device supports to follow a yaw angle relative to the vehicle
                        // (generally that's the default).
mavlink20.GIMBAL_DEVICE_CAP_FLAGS_HAS_YAW_LOCK = 1024 // Gimbal device supports locking to an absolute heading, i.e., yaw angle
                        // relative to North (earth frame, often this
                        // is an option available).
mavlink20.GIMBAL_DEVICE_CAP_FLAGS_SUPPORTS_INFINITE_YAW = 2048 // Gimbal device supports yawing/panning infinitely (e.g. using slip
                        // disk).
mavlink20.GIMBAL_DEVICE_CAP_FLAGS_SUPPORTS_YAW_IN_EARTH_FRAME = 4096 // Gimbal device supports yaw angles and angular velocities relative to
                        // North (earth frame). This usually requires
                        // support by an autopilot via
                        // AUTOPILOT_STATE_FOR_GIMBAL_DEVICE. Support
                        // can go on and off during runtime, which is
                        // reported by the flag GIMBAL_DEVICE_FLAGS_CA
                        // N_ACCEPT_YAW_IN_EARTH_FRAME.
mavlink20.GIMBAL_DEVICE_CAP_FLAGS_HAS_RC_INPUTS = 8192 // Gimbal device supports radio control inputs as an alternative input
                        // for controlling the gimbal orientation.
mavlink20.GIMBAL_DEVICE_CAP_FLAGS_ENUM_END = 8193 // 

// GIMBAL_MANAGER_CAP_FLAGS
mavlink20.GIMBAL_MANAGER_CAP_FLAGS_HAS_RETRACT = 1 // Based on GIMBAL_DEVICE_CAP_FLAGS_HAS_RETRACT.
mavlink20.GIMBAL_MANAGER_CAP_FLAGS_HAS_NEUTRAL = 2 // Based on GIMBAL_DEVICE_CAP_FLAGS_HAS_NEUTRAL.
mavlink20.GIMBAL_MANAGER_CAP_FLAGS_HAS_ROLL_AXIS = 4 // Based on GIMBAL_DEVICE_CAP_FLAGS_HAS_ROLL_AXIS.
mavlink20.GIMBAL_MANAGER_CAP_FLAGS_HAS_ROLL_FOLLOW = 8 // Based on GIMBAL_DEVICE_CAP_FLAGS_HAS_ROLL_FOLLOW.
mavlink20.GIMBAL_MANAGER_CAP_FLAGS_HAS_ROLL_LOCK = 16 // Based on GIMBAL_DEVICE_CAP_FLAGS_HAS_ROLL_LOCK.
mavlink20.GIMBAL_MANAGER_CAP_FLAGS_HAS_PITCH_AXIS = 32 // Based on GIMBAL_DEVICE_CAP_FLAGS_HAS_PITCH_AXIS.
mavlink20.GIMBAL_MANAGER_CAP_FLAGS_HAS_PITCH_FOLLOW = 64 // Based on GIMBAL_DEVICE_CAP_FLAGS_HAS_PITCH_FOLLOW.
mavlink20.GIMBAL_MANAGER_CAP_FLAGS_HAS_PITCH_LOCK = 128 // Based on GIMBAL_DEVICE_CAP_FLAGS_HAS_PITCH_LOCK.
mavlink20.GIMBAL_MANAGER_CAP_FLAGS_HAS_YAW_AXIS = 256 // Based on GIMBAL_DEVICE_CAP_FLAGS_HAS_YAW_AXIS.
mavlink20.GIMBAL_MANAGER_CAP_FLAGS_HAS_YAW_FOLLOW = 512 // Based on GIMBAL_DEVICE_CAP_FLAGS_HAS_YAW_FOLLOW.
mavlink20.GIMBAL_MANAGER_CAP_FLAGS_HAS_YAW_LOCK = 1024 // Based on GIMBAL_DEVICE_CAP_FLAGS_HAS_YAW_LOCK.
mavlink20.GIMBAL_MANAGER_CAP_FLAGS_SUPPORTS_INFINITE_YAW = 2048 // Based on GIMBAL_DEVICE_CAP_FLAGS_SUPPORTS_INFINITE_YAW.
mavlink20.GIMBAL_MANAGER_CAP_FLAGS_SUPPORTS_YAW_IN_EARTH_FRAME = 4096 // Based on GIMBAL_DEVICE_CAP_FLAGS_SUPPORTS_YAW_IN_EARTH_FRAME.
mavlink20.GIMBAL_MANAGER_CAP_FLAGS_HAS_RC_INPUTS = 8192 // Based on GIMBAL_DEVICE_CAP_FLAGS_HAS_RC_INPUTS.
mavlink20.GIMBAL_MANAGER_CAP_FLAGS_CAN_POINT_LOCATION_LOCAL = 65536 // Gimbal manager supports to point to a local position.
mavlink20.GIMBAL_MANAGER_CAP_FLAGS_CAN_POINT_LOCATION_GLOBAL = 131072 // Gimbal manager supports to point to a global latitude, longitude,
                        // altitude position.
mavlink20.GIMBAL_MANAGER_CAP_FLAGS_ENUM_END = 131073 // 

// GIMBAL_DEVICE_FLAGS
mavlink20.GIMBAL_DEVICE_FLAGS_RETRACT = 1 // Set to retracted safe position (no stabilization), takes precedence
                        // over all other flags.
mavlink20.GIMBAL_DEVICE_FLAGS_NEUTRAL = 2 // Set to neutral/default position, taking precedence over all other
                        // flags except RETRACT. Neutral is commonly
                        // forward-facing and horizontal
                        // (roll=pitch=yaw=0) but may be any
                        // orientation.
mavlink20.GIMBAL_DEVICE_FLAGS_ROLL_LOCK = 4 // Lock roll angle to absolute angle relative to horizon (not relative to
                        // vehicle). This is generally the default
                        // with a stabilizing gimbal.
mavlink20.GIMBAL_DEVICE_FLAGS_PITCH_LOCK = 8 // Lock pitch angle to absolute angle relative to horizon (not relative
                        // to vehicle). This is generally the default
                        // with a stabilizing gimbal.
mavlink20.GIMBAL_DEVICE_FLAGS_YAW_LOCK = 16 // Lock yaw angle to absolute angle relative to North (not relative to
                        // vehicle). If this flag is set, the yaw
                        // angle and z component of angular velocity
                        // are relative to North (earth frame, x-axis
                        // pointing North), else they are relative to
                        // the vehicle heading (vehicle frame, earth
                        // frame rotated so that the x-axis is
                        // pointing forward).
mavlink20.GIMBAL_DEVICE_FLAGS_YAW_IN_VEHICLE_FRAME = 32 // Yaw angle and z component of angular velocity are relative to the
                        // vehicle heading (vehicle frame, earth frame
                        // rotated such that the x-axis is pointing
                        // forward).
mavlink20.GIMBAL_DEVICE_FLAGS_YAW_IN_EARTH_FRAME = 64 // Yaw angle and z component of angular velocity are relative to North
                        // (earth frame, x-axis is pointing North).
mavlink20.GIMBAL_DEVICE_FLAGS_ACCEPTS_YAW_IN_EARTH_FRAME = 128 // Gimbal device can accept yaw angle inputs relative to North (earth
                        // frame). This flag is only for reporting
                        // (attempts to set this flag are ignored).
mavlink20.GIMBAL_DEVICE_FLAGS_RC_EXCLUSIVE = 256 // The gimbal orientation is set exclusively by the RC signals feed to
                        // the gimbal's radio control inputs. MAVLink
                        // messages for setting the gimbal orientation
                        // (GIMBAL_DEVICE_SET_ATTITUDE) are ignored.
mavlink20.GIMBAL_DEVICE_FLAGS_RC_MIXED = 512 // The gimbal orientation is determined by combining/mixing the RC
                        // signals feed to the gimbal's radio control
                        // inputs and the MAVLink messages for setting
                        // the gimbal orientation
                        // (GIMBAL_DEVICE_SET_ATTITUDE). How these two
                        // controls are combined or mixed is not
                        // defined by the protocol but is up to the
                        // implementation.
mavlink20.GIMBAL_DEVICE_FLAGS_ENUM_END = 513 // 

// GIMBAL_MANAGER_FLAGS
mavlink20.GIMBAL_MANAGER_FLAGS_RETRACT = 1 // Based on GIMBAL_DEVICE_FLAGS_RETRACT.
mavlink20.GIMBAL_MANAGER_FLAGS_NEUTRAL = 2 // Based on GIMBAL_DEVICE_FLAGS_NEUTRAL.
mavlink20.GIMBAL_MANAGER_FLAGS_ROLL_LOCK = 4 // Based on GIMBAL_DEVICE_FLAGS_ROLL_LOCK.
mavlink20.GIMBAL_MANAGER_FLAGS_PITCH_LOCK = 8 // Based on GIMBAL_DEVICE_FLAGS_PITCH_LOCK.
mavlink20.GIMBAL_MANAGER_FLAGS_YAW_LOCK = 16 // Based on GIMBAL_DEVICE_FLAGS_YAW_LOCK.
mavlink20.GIMBAL_MANAGER_FLAGS_YAW_IN_VEHICLE_FRAME = 32 // Based on GIMBAL_DEVICE_FLAGS_YAW_IN_VEHICLE_FRAME.
mavlink20.GIMBAL_MANAGER_FLAGS_YAW_IN_EARTH_FRAME = 64 // Based on GIMBAL_DEVICE_FLAGS_YAW_IN_EARTH_FRAME.
mavlink20.GIMBAL_MANAGER_FLAGS_ACCEPTS_YAW_IN_EARTH_FRAME = 128 // Based on GIMBAL_DEVICE_FLAGS_ACCEPTS_YAW_IN_EARTH_FRAME.
mavlink20.GIMBAL_MANAGER_FLAGS_RC_EXCLUSIVE = 256 // Based on GIMBAL_DEVICE_FLAGS_RC_EXCLUSIVE.
mavlink20.GIMBAL_MANAGER_FLAGS_RC_MIXED = 512 // Based on GIMBAL_DEVICE_FLAGS_RC_MIXED.
mavlink20.GIMBAL_MANAGER_FLAGS_ENUM_END = 513 // 

// GIMBAL_DEVICE_ERROR_FLAGS
mavlink20.GIMBAL_DEVICE_ERROR_FLAGS_AT_ROLL_LIMIT = 1 // Gimbal device is limited by hardware roll limit.
mavlink20.GIMBAL_DEVICE_ERROR_FLAGS_AT_PITCH_LIMIT = 2 // Gimbal device is limited by hardware pitch limit.
mavlink20.GIMBAL_DEVICE_ERROR_FLAGS_AT_YAW_LIMIT = 4 // Gimbal device is limited by hardware yaw limit.
mavlink20.GIMBAL_DEVICE_ERROR_FLAGS_ENCODER_ERROR = 8 // There is an error with the gimbal encoders.
mavlink20.GIMBAL_DEVICE_ERROR_FLAGS_POWER_ERROR = 16 // There is an error with the gimbal power source.
mavlink20.GIMBAL_DEVICE_ERROR_FLAGS_MOTOR_ERROR = 32 // There is an error with the gimbal motors.
mavlink20.GIMBAL_DEVICE_ERROR_FLAGS_SOFTWARE_ERROR = 64 // There is an error with the gimbal's software.
mavlink20.GIMBAL_DEVICE_ERROR_FLAGS_COMMS_ERROR = 128 // There is an error with the gimbal's communication.
mavlink20.GIMBAL_DEVICE_ERROR_FLAGS_CALIBRATION_RUNNING = 256 // Gimbal device is currently calibrating.
mavlink20.GIMBAL_DEVICE_ERROR_FLAGS_NO_MANAGER = 512 // Gimbal device is not assigned to a gimbal manager.
mavlink20.GIMBAL_DEVICE_ERROR_FLAGS_ENUM_END = 513 // 

// GRIPPER_ACTIONS
mavlink20.GRIPPER_ACTION_OPEN = 0 // Gripper commence open. Often used to release cargo.
mavlink20.GRIPPER_ACTION_CLOSE = 1 // Gripper commence close. Often used to grab onto cargo.
mavlink20.GRIPPER_ACTION_STOP = 2 // Gripper stop (maintain current grip position).
mavlink20.GRIPPER_ACTIONS_ENUM_END = 3 // 

// WINCH_ACTIONS
mavlink20.WINCH_RELAXED = 0 // Allow motor to freewheel.
mavlink20.WINCH_RELATIVE_LENGTH_CONTROL = 1 // Wind or unwind specified length of line, optionally using specified
                        // rate.
mavlink20.WINCH_RATE_CONTROL = 2 // Wind or unwind line at specified rate.
mavlink20.WINCH_LOCK = 3 // Perform the locking sequence to relieve motor while in the fully
                        // retracted position. Only action and
                        // instance command parameters are used,
                        // others are ignored.
mavlink20.WINCH_DELIVER = 4 // Sequence of drop, slow down, touch down, reel up, lock. Only action
                        // and instance command parameters are used,
                        // others are ignored.
mavlink20.WINCH_HOLD = 5 // Engage motor and hold current position. Only action and instance
                        // command parameters are used, others are
                        // ignored.
mavlink20.WINCH_RETRACT = 6 // Return the reel to the fully retracted position. Only action and
                        // instance command parameters are used,
                        // others are ignored.
mavlink20.WINCH_LOAD_LINE = 7 // Load the reel with line. The winch will calculate the total loaded
                        // length and stop when the tension exceeds a
                        // threshold. Only action and instance command
                        // parameters are used, others are ignored.
mavlink20.WINCH_ABANDON_LINE = 8 // Spool out the entire length of the line. Only action and instance
                        // command parameters are used, others are
                        // ignored.
mavlink20.WINCH_LOAD_PAYLOAD = 9 // Spools out just enough to present the hook to the user to load the
                        // payload. Only action and instance command
                        // parameters are used, others are ignored
mavlink20.WINCH_ACTIONS_ENUM_END = 10 // 

// UAVCAN_NODE_HEALTH
mavlink20.UAVCAN_NODE_HEALTH_OK = 0 // The node is functioning properly.
mavlink20.UAVCAN_NODE_HEALTH_WARNING = 1 // A critical parameter went out of range or the node has encountered a
                        // minor failure.
mavlink20.UAVCAN_NODE_HEALTH_ERROR = 2 // The node has encountered a major failure.
mavlink20.UAVCAN_NODE_HEALTH_CRITICAL = 3 // The node has suffered a fatal malfunction.
mavlink20.UAVCAN_NODE_HEALTH_ENUM_END = 4 // 

// UAVCAN_NODE_MODE
mavlink20.UAVCAN_NODE_MODE_OPERATIONAL = 0 // The node is performing its primary functions.
mavlink20.UAVCAN_NODE_MODE_INITIALIZATION = 1 // The node is initializing; this mode is entered immediately after
                        // startup.
mavlink20.UAVCAN_NODE_MODE_MAINTENANCE = 2 // The node is under maintenance.
mavlink20.UAVCAN_NODE_MODE_SOFTWARE_UPDATE = 3 // The node is in the process of updating its software.
mavlink20.UAVCAN_NODE_MODE_OFFLINE = 7 // The node is no longer available online.
mavlink20.UAVCAN_NODE_MODE_ENUM_END = 8 // 

// ESC_CONNECTION_TYPE
mavlink20.ESC_CONNECTION_TYPE_PPM = 0 // Traditional PPM ESC.
mavlink20.ESC_CONNECTION_TYPE_SERIAL = 1 // Serial Bus connected ESC.
mavlink20.ESC_CONNECTION_TYPE_ONESHOT = 2 // One Shot PPM ESC.
mavlink20.ESC_CONNECTION_TYPE_I2C = 3 // I2C ESC.
mavlink20.ESC_CONNECTION_TYPE_CAN = 4 // CAN-Bus ESC.
mavlink20.ESC_CONNECTION_TYPE_DSHOT = 5 // DShot ESC.
mavlink20.ESC_CONNECTION_TYPE_ENUM_END = 6 // 

// ESC_FAILURE_FLAGS
mavlink20.ESC_FAILURE_OVER_CURRENT = 1 // Over current failure.
mavlink20.ESC_FAILURE_OVER_VOLTAGE = 2 // Over voltage failure.
mavlink20.ESC_FAILURE_OVER_TEMPERATURE = 4 // Over temperature failure.
mavlink20.ESC_FAILURE_OVER_RPM = 8 // Over RPM failure.
mavlink20.ESC_FAILURE_INCONSISTENT_CMD = 16 // Inconsistent command failure i.e. out of bounds.
mavlink20.ESC_FAILURE_MOTOR_STUCK = 32 // Motor stuck failure.
mavlink20.ESC_FAILURE_GENERIC = 64 // Generic ESC failure.
mavlink20.ESC_FAILURE_FLAGS_ENUM_END = 65 // 

// STORAGE_STATUS
mavlink20.STORAGE_STATUS_EMPTY = 0 // Storage is missing (no microSD card loaded for example.)
mavlink20.STORAGE_STATUS_UNFORMATTED = 1 // Storage present but unformatted.
mavlink20.STORAGE_STATUS_READY = 2 // Storage present and ready.
mavlink20.STORAGE_STATUS_NOT_SUPPORTED = 3 // Camera does not supply storage status information. Capacity
                        // information in STORAGE_INFORMATION fields
                        // will be ignored.
mavlink20.STORAGE_STATUS_ENUM_END = 4 // 

// STORAGE_TYPE
mavlink20.STORAGE_TYPE_UNKNOWN = 0 // Storage type is not known.
mavlink20.STORAGE_TYPE_USB_STICK = 1 // Storage type is USB device.
mavlink20.STORAGE_TYPE_SD = 2 // Storage type is SD card.
mavlink20.STORAGE_TYPE_MICROSD = 3 // Storage type is microSD card.
mavlink20.STORAGE_TYPE_CF = 4 // Storage type is CFast.
mavlink20.STORAGE_TYPE_CFE = 5 // Storage type is CFexpress.
mavlink20.STORAGE_TYPE_XQD = 6 // Storage type is XQD.
mavlink20.STORAGE_TYPE_HD = 7 // Storage type is HD mass storage type.
mavlink20.STORAGE_TYPE_OTHER = 254 // Storage type is other, not listed type.
mavlink20.STORAGE_TYPE_ENUM_END = 255 // 

// STORAGE_USAGE_FLAG
mavlink20.STORAGE_USAGE_FLAG_SET = 1 // Always set to 1 (indicates STORAGE_INFORMATION.storage_usage is
                        // supported).
mavlink20.STORAGE_USAGE_FLAG_PHOTO = 2 // Storage for saving photos.
mavlink20.STORAGE_USAGE_FLAG_VIDEO = 4 // Storage for saving videos.
mavlink20.STORAGE_USAGE_FLAG_LOGS = 8 // Storage for saving logs.
mavlink20.STORAGE_USAGE_FLAG_ENUM_END = 9 // 

// ORBIT_YAW_BEHAVIOUR
mavlink20.ORBIT_YAW_BEHAVIOUR_HOLD_FRONT_TO_CIRCLE_CENTER = 0 // Vehicle front points to the center (default).
mavlink20.ORBIT_YAW_BEHAVIOUR_HOLD_INITIAL_HEADING = 1 // Vehicle front holds heading when message received.
mavlink20.ORBIT_YAW_BEHAVIOUR_UNCONTROLLED = 2 // Yaw uncontrolled.
mavlink20.ORBIT_YAW_BEHAVIOUR_HOLD_FRONT_TANGENT_TO_CIRCLE = 3 // Vehicle front follows flight path (tangential to circle).
mavlink20.ORBIT_YAW_BEHAVIOUR_RC_CONTROLLED = 4 // Yaw controlled by RC input.
mavlink20.ORBIT_YAW_BEHAVIOUR_UNCHANGED = 5 // Vehicle uses current yaw behaviour (unchanged). The vehicle-default
                        // yaw behaviour is used if this value is
                        // specified when orbit is first commanded.
mavlink20.ORBIT_YAW_BEHAVIOUR_ENUM_END = 6 // 

// WIFI_CONFIG_AP_RESPONSE
mavlink20.WIFI_CONFIG_AP_RESPONSE_UNDEFINED = 0 // Undefined response. Likely an indicative of a system that doesn't
                        // support this request.
mavlink20.WIFI_CONFIG_AP_RESPONSE_ACCEPTED = 1 // Changes accepted.
mavlink20.WIFI_CONFIG_AP_RESPONSE_REJECTED = 2 // Changes rejected.
mavlink20.WIFI_CONFIG_AP_RESPONSE_MODE_ERROR = 3 // Invalid Mode.
mavlink20.WIFI_CONFIG_AP_RESPONSE_SSID_ERROR = 4 // Invalid SSID.
mavlink20.WIFI_CONFIG_AP_RESPONSE_PASSWORD_ERROR = 5 // Invalid Password.
mavlink20.WIFI_CONFIG_AP_RESPONSE_ENUM_END = 6 // 

// CELLULAR_CONFIG_RESPONSE
mavlink20.CELLULAR_CONFIG_RESPONSE_ACCEPTED = 0 // Changes accepted.
mavlink20.CELLULAR_CONFIG_RESPONSE_APN_ERROR = 1 // Invalid APN.
mavlink20.CELLULAR_CONFIG_RESPONSE_PIN_ERROR = 2 // Invalid PIN.
mavlink20.CELLULAR_CONFIG_RESPONSE_REJECTED = 3 // Changes rejected.
mavlink20.CELLULAR_CONFIG_BLOCKED_PUK_REQUIRED = 4 // PUK is required to unblock SIM card.
mavlink20.CELLULAR_CONFIG_RESPONSE_ENUM_END = 5 // 

// WIFI_CONFIG_AP_MODE
mavlink20.WIFI_CONFIG_AP_MODE_UNDEFINED = 0 // WiFi mode is undefined.
mavlink20.WIFI_CONFIG_AP_MODE_AP = 1 // WiFi configured as an access point.
mavlink20.WIFI_CONFIG_AP_MODE_STATION = 2 // WiFi configured as a station connected to an existing local WiFi
                        // network.
mavlink20.WIFI_CONFIG_AP_MODE_DISABLED = 3 // WiFi disabled.
mavlink20.WIFI_CONFIG_AP_MODE_ENUM_END = 4 // 

// COMP_METADATA_TYPE
mavlink20.COMP_METADATA_TYPE_GENERAL = 0 // General information about the component. General metadata includes
                        // information about other metadata types
                        // supported by the component. Files of this
                        // type must be supported, and must be
                        // downloadable from vehicle using a MAVLink
                        // FTP URI.
mavlink20.COMP_METADATA_TYPE_PARAMETER = 1 // Parameter meta data.
mavlink20.COMP_METADATA_TYPE_COMMANDS = 2 // Meta data that specifies which commands and command parameters the
                        // vehicle supports. (WIP)
mavlink20.COMP_METADATA_TYPE_PERIPHERALS = 3 // Meta data that specifies external non-MAVLink peripherals.
mavlink20.COMP_METADATA_TYPE_EVENTS = 4 // Meta data for the events interface.
mavlink20.COMP_METADATA_TYPE_ACTUATORS = 5 // Meta data for actuator configuration (motors, servos and vehicle
                        // geometry) and testing.
mavlink20.COMP_METADATA_TYPE_ENUM_END = 6 // 

// ACTUATOR_CONFIGURATION
mavlink20.ACTUATOR_CONFIGURATION_NONE = 0 // Do nothing.
mavlink20.ACTUATOR_CONFIGURATION_BEEP = 1 // Command the actuator to beep now.
mavlink20.ACTUATOR_CONFIGURATION_3D_MODE_ON = 2 // Permanently set the actuator (ESC) to 3D mode (reversible thrust).
mavlink20.ACTUATOR_CONFIGURATION_3D_MODE_OFF = 3 // Permanently set the actuator (ESC) to non 3D mode (non-reversible
                        // thrust).
mavlink20.ACTUATOR_CONFIGURATION_SPIN_DIRECTION1 = 4 // Permanently set the actuator (ESC) to spin direction 1 (which can be
                        // clockwise or counter-clockwise).
mavlink20.ACTUATOR_CONFIGURATION_SPIN_DIRECTION2 = 5 // Permanently set the actuator (ESC) to spin direction 2 (opposite of
                        // direction 1).
mavlink20.ACTUATOR_CONFIGURATION_ENUM_END = 6 // 

// ACTUATOR_OUTPUT_FUNCTION
mavlink20.ACTUATOR_OUTPUT_FUNCTION_NONE = 0 // No function (disabled).
mavlink20.ACTUATOR_OUTPUT_FUNCTION_MOTOR1 = 1 // Motor 1
mavlink20.ACTUATOR_OUTPUT_FUNCTION_MOTOR2 = 2 // Motor 2
mavlink20.ACTUATOR_OUTPUT_FUNCTION_MOTOR3 = 3 // Motor 3
mavlink20.ACTUATOR_OUTPUT_FUNCTION_MOTOR4 = 4 // Motor 4
mavlink20.ACTUATOR_OUTPUT_FUNCTION_MOTOR5 = 5 // Motor 5
mavlink20.ACTUATOR_OUTPUT_FUNCTION_MOTOR6 = 6 // Motor 6
mavlink20.ACTUATOR_OUTPUT_FUNCTION_MOTOR7 = 7 // Motor 7
mavlink20.ACTUATOR_OUTPUT_FUNCTION_MOTOR8 = 8 // Motor 8
mavlink20.ACTUATOR_OUTPUT_FUNCTION_MOTOR9 = 9 // Motor 9
mavlink20.ACTUATOR_OUTPUT_FUNCTION_MOTOR10 = 10 // Motor 10
mavlink20.ACTUATOR_OUTPUT_FUNCTION_MOTOR11 = 11 // Motor 11
mavlink20.ACTUATOR_OUTPUT_FUNCTION_MOTOR12 = 12 // Motor 12
mavlink20.ACTUATOR_OUTPUT_FUNCTION_MOTOR13 = 13 // Motor 13
mavlink20.ACTUATOR_OUTPUT_FUNCTION_MOTOR14 = 14 // Motor 14
mavlink20.ACTUATOR_OUTPUT_FUNCTION_MOTOR15 = 15 // Motor 15
mavlink20.ACTUATOR_OUTPUT_FUNCTION_MOTOR16 = 16 // Motor 16
mavlink20.ACTUATOR_OUTPUT_FUNCTION_SERVO1 = 33 // Servo 1
mavlink20.ACTUATOR_OUTPUT_FUNCTION_SERVO2 = 34 // Servo 2
mavlink20.ACTUATOR_OUTPUT_FUNCTION_SERVO3 = 35 // Servo 3
mavlink20.ACTUATOR_OUTPUT_FUNCTION_SERVO4 = 36 // Servo 4
mavlink20.ACTUATOR_OUTPUT_FUNCTION_SERVO5 = 37 // Servo 5
mavlink20.ACTUATOR_OUTPUT_FUNCTION_SERVO6 = 38 // Servo 6
mavlink20.ACTUATOR_OUTPUT_FUNCTION_SERVO7 = 39 // Servo 7
mavlink20.ACTUATOR_OUTPUT_FUNCTION_SERVO8 = 40 // Servo 8
mavlink20.ACTUATOR_OUTPUT_FUNCTION_SERVO9 = 41 // Servo 9
mavlink20.ACTUATOR_OUTPUT_FUNCTION_SERVO10 = 42 // Servo 10
mavlink20.ACTUATOR_OUTPUT_FUNCTION_SERVO11 = 43 // Servo 11
mavlink20.ACTUATOR_OUTPUT_FUNCTION_SERVO12 = 44 // Servo 12
mavlink20.ACTUATOR_OUTPUT_FUNCTION_SERVO13 = 45 // Servo 13
mavlink20.ACTUATOR_OUTPUT_FUNCTION_SERVO14 = 46 // Servo 14
mavlink20.ACTUATOR_OUTPUT_FUNCTION_SERVO15 = 47 // Servo 15
mavlink20.ACTUATOR_OUTPUT_FUNCTION_SERVO16 = 48 // Servo 16
mavlink20.ACTUATOR_OUTPUT_FUNCTION_ENUM_END = 49 // 

// AUTOTUNE_AXIS
mavlink20.AUTOTUNE_AXIS_ROLL = 1 // Autotune roll axis.
mavlink20.AUTOTUNE_AXIS_PITCH = 2 // Autotune pitch axis.
mavlink20.AUTOTUNE_AXIS_YAW = 4 // Autotune yaw axis.
mavlink20.AUTOTUNE_AXIS_ENUM_END = 5 // 

// PREFLIGHT_STORAGE_PARAMETER_ACTION
mavlink20.PARAM_READ_PERSISTENT = 0 // Read all parameters from persistent storage. Replaces values in
                        // volatile storage.
mavlink20.PARAM_WRITE_PERSISTENT = 1 // Write all parameter values to persistent storage (flash/EEPROM)
mavlink20.PARAM_RESET_CONFIG_DEFAULT = 2 // Reset all user configurable parameters to their default value
                        // (including airframe selection, sensor
                        // calibration data, safety settings, and so
                        // on). Does not reset values that contain
                        // operation counters and vehicle computed
                        // statistics.
mavlink20.PARAM_RESET_SENSOR_DEFAULT = 3 // Reset only sensor calibration parameters to factory defaults (or
                        // firmware default if not available)
mavlink20.PARAM_RESET_ALL_DEFAULT = 4 // Reset all parameters, including operation counters, to default values
mavlink20.PREFLIGHT_STORAGE_PARAMETER_ACTION_ENUM_END = 5 // 

// PREFLIGHT_STORAGE_MISSION_ACTION
mavlink20.MISSION_READ_PERSISTENT = 0 // Read current mission data from persistent storage
mavlink20.MISSION_WRITE_PERSISTENT = 1 // Write current mission data to persistent storage
mavlink20.MISSION_RESET_DEFAULT = 2 // Erase all mission data stored on the vehicle (both persistent and
                        // volatile storage)
mavlink20.PREFLIGHT_STORAGE_MISSION_ACTION_ENUM_END = 3 // 

// REBOOT_SHUTDOWN_ACTION
mavlink20.REBOOT_SHUTDOWN_ACTION_NONE = 0 // Do nothing.
mavlink20.REBOOT_SHUTDOWN_ACTION_REBOOT = 1 // Reboot component.
mavlink20.REBOOT_SHUTDOWN_ACTION_SHUTDOWN = 2 // Shutdown component.
mavlink20.REBOOT_SHUTDOWN_ACTION_REBOOT_TO_BOOTLOADER = 3 // Reboot component and keep it in the bootloader until upgraded.
mavlink20.REBOOT_SHUTDOWN_ACTION_POWER_ON = 4 // Power on component. Do nothing if component is already powered (ACK
                        // command with MAV_RESULT_ACCEPTED).
mavlink20.REBOOT_SHUTDOWN_ACTION_ENUM_END = 5 // 

// REBOOT_SHUTDOWN_CONDITIONS
mavlink20.REBOOT_SHUTDOWN_CONDITIONS_SAFETY_INTERLOCKED = 0 // Reboot/Shutdown only if allowed by safety checks, such as being
                        // landed.
mavlink20.REBOOT_SHUTDOWN_CONDITIONS_FORCE = 20190226 // Force reboot/shutdown of the autopilot/component regardless of system
                        // state.
mavlink20.REBOOT_SHUTDOWN_CONDITIONS_ENUM_END = 20190227 // 

// MAV_CMD
mavlink20.MAV_CMD_NAV_WAYPOINT = 16 // Navigate to waypoint. This is intended for use in missions (for guided
                        // commands outside of missions use
                        // MAV_CMD_DO_REPOSITION).
mavlink20.MAV_CMD_NAV_LOITER_UNLIM = 17 // Loiter around this waypoint an unlimited amount of time
mavlink20.MAV_CMD_NAV_LOITER_TURNS = 18 // Loiter around this waypoint for X turns
mavlink20.MAV_CMD_NAV_LOITER_TIME = 19 // Loiter at the specified latitude, longitude and altitude for a certain
                        // amount of time. Multicopter vehicles stop
                        // at the point (within a vehicle-specific
                        // acceptance radius). Forward-only moving
                        // vehicles (e.g. fixed-wing) circle the point
                        // with the specified radius/direction. If the
                        // Heading Required parameter (2) is non-zero
                        // forward moving aircraft will only leave the
                        // loiter circle once heading towards the next
                        // waypoint.
mavlink20.MAV_CMD_NAV_RETURN_TO_LAUNCH = 20 // Return to launch location
mavlink20.MAV_CMD_NAV_LAND = 21 // Land at location.
mavlink20.MAV_CMD_NAV_TAKEOFF = 22 // Takeoff from ground / hand. Vehicles that support multiple takeoff
                        // modes (e.g. VTOL quadplane) should take off
                        // using the currently configured mode.
mavlink20.MAV_CMD_NAV_LAND_LOCAL = 23 // Land at local position (local frame only)
mavlink20.MAV_CMD_NAV_TAKEOFF_LOCAL = 24 // Takeoff from local position (local frame only)
mavlink20.MAV_CMD_NAV_FOLLOW = 25 // Vehicle following, i.e. this waypoint represents the position of a
                        // moving vehicle
mavlink20.MAV_CMD_NAV_CONTINUE_AND_CHANGE_ALT = 30 // Continue on the current course and climb/descend to specified
                        // altitude.  When the altitude is reached
                        // continue to the next command (i.e., don't
                        // proceed to the next command until the
                        // desired altitude is reached.
mavlink20.MAV_CMD_NAV_LOITER_TO_ALT = 31 // Begin loiter at the specified Latitude and Longitude.  If Lat=Lon=0,
                        // then loiter at the current position.  Don't
                        // consider the navigation command complete
                        // (don't leave loiter) until the altitude has
                        // been reached. Additionally, if the Heading
                        // Required parameter is non-zero the aircraft
                        // will not leave the loiter until heading
                        // toward the next waypoint.
mavlink20.MAV_CMD_DO_FOLLOW = 32 // Begin following a target
mavlink20.MAV_CMD_DO_FOLLOW_REPOSITION = 33 // Reposition the MAV after a follow target command has been sent
mavlink20.MAV_CMD_DO_ORBIT = 34 // Start orbiting on the circumference of a circle defined by the
                        // parameters. Setting values to NaN/INT32_MAX
                        // (as appropriate) results in using defaults.
mavlink20.MAV_CMD_NAV_ROI = 80 // Sets the region of interest (ROI) for a sensor set or the vehicle
                        // itself. This can then be used by the
                        // vehicle's control system to control the
                        // vehicle attitude and the attitude of
                        // various sensors such as cameras.
mavlink20.MAV_CMD_NAV_PATHPLANNING = 81 // Control autonomous path planning on the MAV.
mavlink20.MAV_CMD_NAV_SPLINE_WAYPOINT = 82 // Navigate to waypoint using a spline path.
mavlink20.MAV_CMD_NAV_VTOL_TAKEOFF = 84 // Takeoff from ground using VTOL mode, and transition to forward flight
                        // with specified heading. The command should
                        // be ignored by vehicles that dont support
                        // both VTOL and fixed-wing flight
                        // (multicopters, boats,etc.).
mavlink20.MAV_CMD_NAV_VTOL_LAND = 85 // Land using VTOL mode
mavlink20.MAV_CMD_NAV_GUIDED_ENABLE = 92 // Hand control over to an external controller
mavlink20.MAV_CMD_NAV_DELAY = 93 // Delay the next navigation command a number of seconds or until a
                        // specified time
mavlink20.MAV_CMD_NAV_PAYLOAD_PLACE = 94 // Descend and place payload. Vehicle moves to specified location,
                        // descends until it detects a hanging payload
                        // has reached the ground, and then releases
                        // the payload. If ground is not detected
                        // before the reaching the maximum descent
                        // value (param1), the command will complete
                        // without releasing the payload.
mavlink20.MAV_CMD_NAV_LAST = 95 // NOP - This command is only used to mark the upper limit of the
                        // NAV/ACTION commands in the enumeration
mavlink20.MAV_CMD_CONDITION_DELAY = 112 // Delay mission state machine.
mavlink20.MAV_CMD_CONDITION_CHANGE_ALT = 113 // Ascend/descend to target altitude at specified rate. Delay mission
                        // state machine until desired altitude
                        // reached.
mavlink20.MAV_CMD_CONDITION_DISTANCE = 114 // Delay mission state machine until within desired distance of next NAV
                        // point.
mavlink20.MAV_CMD_CONDITION_YAW = 115 // Reach a certain target angle.
mavlink20.MAV_CMD_CONDITION_LAST = 159 // NOP - This command is only used to mark the upper limit of the
                        // CONDITION commands in the enumeration
mavlink20.MAV_CMD_DO_SET_MODE = 176 // Set system mode.
mavlink20.MAV_CMD_DO_JUMP = 177 // Jump to the desired command in the mission list.  Repeat this action
                        // only the specified number of times
mavlink20.MAV_CMD_DO_CHANGE_SPEED = 178 // Change speed and/or throttle set points. The value persists until it
                        // is overridden or there is a mode change
mavlink20.MAV_CMD_DO_SET_HOME = 179 //            Sets the home position to either to the current position or
                        // a specified position.           The home
                        // position is the default position that the
                        // system will return to and land on.
                        // The position is set automatically by the
                        // system during the takeoff (and may also be
                        // set using this command).           Note:
                        // the current home position may be emitted in
                        // a HOME_POSITION message on request (using
                        // MAV_CMD_REQUEST_MESSAGE with param1=242).
mavlink20.MAV_CMD_DO_SET_PARAMETER = 180 // Set a system parameter.  Caution!  Use of this command requires
                        // knowledge of the numeric enumeration value
                        // of the parameter.
mavlink20.MAV_CMD_DO_SET_RELAY = 181 // Set a relay to a condition.
mavlink20.MAV_CMD_DO_REPEAT_RELAY = 182 // Cycle a relay on and off for a desired number of cycles with a desired
                        // period.
mavlink20.MAV_CMD_DO_SET_SERVO = 183 // Set a servo to a desired PWM value.
mavlink20.MAV_CMD_DO_REPEAT_SERVO = 184 // Cycle a between its nominal setting and a desired PWM for a desired
                        // number of cycles with a desired period.
mavlink20.MAV_CMD_DO_FLIGHTTERMINATION = 185 // Terminate flight immediately.           Flight termination immediately
                        // and irreversibly terminates the current
                        // flight, returning the vehicle to ground.
                        // The vehicle will ignore RC or other input
                        // until it has been power-cycled.
                        // Termination may trigger safety measures,
                        // including: disabling motors and deployment
                        // of parachute on multicopters, and setting
                        // flight surfaces to initiate a landing
                        // pattern on fixed-wing).           On
                        // multicopters without a parachute it may
                        // trigger a crash landing.           Support
                        // for this command can be tested using the
                        // protocol bit:
                        // MAV_PROTOCOL_CAPABILITY_FLIGHT_TERMINATION.
                        // Support for this command can also be tested
                        // by sending the command with param1=0 (<
                        // 0.5); the ACK should be either
                        // MAV_RESULT_FAILED or
                        // MAV_RESULT_UNSUPPORTED.
mavlink20.MAV_CMD_DO_CHANGE_ALTITUDE = 186 // Change altitude set point.
mavlink20.MAV_CMD_DO_SET_ACTUATOR = 187 // Sets actuators (e.g. servos) to a desired value. The actuator numbers
                        // are mapped to specific outputs (e.g. on any
                        // MAIN or AUX PWM or UAVCAN) using a flight-
                        // stack specific mechanism (i.e. a
                        // parameter).
mavlink20.MAV_CMD_DO_RETURN_PATH_START = 188 // Mission item to specify the start of a failsafe/landing return-path
                        // segment (the end of the segment is the next
                        // MAV_CMD_DO_LAND_START item).           A
                        // vehicle that is using missions for landing
                        // (e.g. in a return mode) will join the
                        // mission on the closest path of the return-
                        // path segment (instead of
                        // MAV_CMD_DO_LAND_START or the nearest
                        // waypoint).           The main use case is
                        // to minimize the failsafe flight path in
                        // corridor missions, where the
                        // inbound/outbound paths are constrained (by
                        // geofences) to the same particular path.
                        // The MAV_CMD_NAV_RETURN_PATH_START would be
                        // placed at the start of the return path.
                        // If a failsafe occurs on the outbound path
                        // the vehicle will move to the nearest point
                        // on the return path (which is parallel for
                        // this kind of mission), effectively turning
                        // round and following the shortest path to
                        // landing.           If a failsafe occurs on
                        // the inbound path the vehicle is already on
                        // the return segment and will continue to
                        // landing.           The
                        // Latitude/Longitude/Altitude are optional,
                        // and may be set to 0 if not needed.
                        // If specified, the item defines the waypoint
                        // at which the return segment starts.
                        // If sent using as a command, the vehicle
                        // will perform a mission landing (using the
                        // land segment if defined) or reject the
                        // command if mission landings are not
                        // supported, or no mission landing is
                        // defined. When used as a command any
                        // position information in the command is
                        // ignored.
mavlink20.MAV_CMD_DO_LAND_START = 189 // Mission item to mark the start of a mission landing pattern, or a
                        // command to land with a mission landing
                        // pattern.          When used in a mission,
                        // this is a marker for the start of a
                        // sequence of mission items that represent a
                        // landing pattern.         It should be
                        // followed by a navigation item that defines
                        // the first waypoint of the landing sequence.
                        // The start marker positional params are used
                        // only for selecting what landing pattern to
                        // use if several are defined in the mission
                        // (the selected pattern will be the one with
                        // the marker position that is closest to the
                        // vehicle when a landing is commanded).
                        // If the marker item position has zero-values
                        // for latitude, longitude, and altitude, then
                        // landing pattern selection is instead based
                        // on the position of the first waypoint in
                        // the landing sequence.                When
                        // sent as a command it triggers a landing
                        // using a mission landing pattern.
                        // The location parameters are not used in
                        // this case, and should be set to 0.
mavlink20.MAV_CMD_DO_RALLY_LAND = 190 // Mission command to perform a landing from a rally point.
mavlink20.MAV_CMD_DO_GO_AROUND = 191 // Mission command to safely abort an autonomous landing.
mavlink20.MAV_CMD_DO_REPOSITION = 192 // Reposition the vehicle to a specific WGS84 global position. This
                        // command is intended for guided commands
                        // (for missions use MAV_CMD_NAV_WAYPOINT
                        // instead).
mavlink20.MAV_CMD_DO_PAUSE_CONTINUE = 193 // If in a GPS controlled position mode, hold the current position or
                        // continue.
mavlink20.MAV_CMD_DO_SET_REVERSE = 194 // Set moving direction to forward or reverse.
mavlink20.MAV_CMD_DO_SET_ROI_LOCATION = 195 // Sets the region of interest (ROI) to a location. This can then be used
                        // by the vehicle's control system to control
                        // the vehicle attitude and the attitude of
                        // various sensors such as cameras. This
                        // command can be sent to a gimbal manager but
                        // not to a gimbal device. A gimbal is not to
                        // react to this message.
mavlink20.MAV_CMD_DO_SET_ROI_WPNEXT_OFFSET = 196 // Sets the region of interest (ROI) to be toward next waypoint, with
                        // optional pitch/roll/yaw offset. This can
                        // then be used by the vehicle's control
                        // system to control the vehicle attitude and
                        // the attitude of various sensors such as
                        // cameras. This command can be sent to a
                        // gimbal manager but not to a gimbal device.
                        // A gimbal device is not to react to this
                        // message.
mavlink20.MAV_CMD_DO_SET_ROI_NONE = 197 // Cancels any previous ROI command returning the vehicle/sensors to
                        // default flight characteristics. This can
                        // then be used by the vehicle's control
                        // system to control the vehicle attitude and
                        // the attitude of various sensors such as
                        // cameras. This command can be sent to a
                        // gimbal manager but not to a gimbal device.
                        // A gimbal device is not to react to this
                        // message. After this command the gimbal
                        // manager should go back to manual input if
                        // available, and otherwise assume a neutral
                        // position.
mavlink20.MAV_CMD_DO_SET_ROI_SYSID = 198 // Mount tracks system with specified system ID. Determination of target
                        // vehicle position may be done with
                        // GLOBAL_POSITION_INT or any other means.
                        // This command can be sent to a gimbal
                        // manager but not to a gimbal device. A
                        // gimbal device is not to react to this
                        // message.
mavlink20.MAV_CMD_DO_CONTROL_VIDEO = 200 // Control onboard camera system.
mavlink20.MAV_CMD_DO_SET_ROI = 201 // Sets the region of interest (ROI) for a sensor set or the vehicle
                        // itself. This can then be used by the
                        // vehicle's control system to control the
                        // vehicle attitude and the attitude of
                        // various sensors such as cameras.
mavlink20.MAV_CMD_DO_DIGICAM_CONFIGURE = 202 // Configure digital camera. This is a fallback message for systems that
                        // have not yet implemented PARAM_EXT_XXX
                        // messages and camera definition files (see h
                        // ttps://mavlink.io/en/services/camera_def.ht
                        // ml ).
mavlink20.MAV_CMD_DO_DIGICAM_CONTROL = 203 // Control digital camera. This is a fallback message for systems that
                        // have not yet implemented PARAM_EXT_XXX
                        // messages and camera definition files (see h
                        // ttps://mavlink.io/en/services/camera_def.ht
                        // ml ).
mavlink20.MAV_CMD_DO_MOUNT_CONFIGURE = 204 // Mission command to configure a camera or antenna mount
mavlink20.MAV_CMD_DO_MOUNT_CONTROL = 205 // Mission command to control a camera or antenna mount
mavlink20.MAV_CMD_DO_SET_CAM_TRIGG_DIST = 206 // Mission command to set camera trigger distance for this flight. The
                        // camera is triggered each time this distance
                        // is exceeded. This command can also be used
                        // to set the shutter integration time for the
                        // camera.
mavlink20.MAV_CMD_DO_FENCE_ENABLE = 207 //            Enable the geofence.           This can be used in a
                        // mission or via the command protocol.
                        // The persistence/lifetime of the setting is
                        // undefined.           Depending on flight
                        // stack implementation it may persist until
                        // superseded, or it may revert to a system
                        // default at the end of a mission.
                        // Flight stacks typically reset the setting
                        // to system defaults on reboot.
mavlink20.MAV_CMD_DO_PARACHUTE = 208 // Mission item/command to release a parachute or enable/disable auto
                        // release.
mavlink20.MAV_CMD_DO_MOTOR_TEST = 209 // Command to perform motor test.
mavlink20.MAV_CMD_DO_INVERTED_FLIGHT = 210 // Change to/from inverted flight.
mavlink20.MAV_CMD_DO_GRIPPER = 211 // Mission command to operate a gripper.
mavlink20.MAV_CMD_DO_AUTOTUNE_ENABLE = 212 // Enable/disable autotune.
mavlink20.MAV_CMD_NAV_SET_YAW_SPEED = 213 // Sets a desired vehicle turn angle and speed change.
mavlink20.MAV_CMD_DO_SET_CAM_TRIGG_INTERVAL = 214 // Mission command to set camera trigger interval for this flight. If
                        // triggering is enabled, the camera is
                        // triggered each time this interval expires.
                        // This command can also be used to set the
                        // shutter integration time for the camera.
mavlink20.MAV_CMD_DO_MOUNT_CONTROL_QUAT = 220 // Mission command to control a camera or antenna mount, using a
                        // quaternion as reference.
mavlink20.MAV_CMD_DO_GUIDED_MASTER = 221 // set id of master controller
mavlink20.MAV_CMD_DO_GUIDED_LIMITS = 222 // Set limits for external control
mavlink20.MAV_CMD_DO_ENGINE_CONTROL = 223 // Control vehicle engine. This is interpreted by the vehicles engine
                        // controller to change the target engine
                        // state. It is intended for vehicles with
                        // internal combustion engines
mavlink20.MAV_CMD_DO_SET_MISSION_CURRENT = 224 //            Set the mission item with sequence number seq as the
                        // current item and emit MISSION_CURRENT
                        // (whether or not the mission number
                        // changed).           If a mission is
                        // currently being executed, the system will
                        // continue to this new mission item on the
                        // shortest path, skipping any intermediate
                        // mission items.           Note that mission
                        // jump repeat counters are not reset unless
                        // param2 is set (see MAV_CMD_DO_JUMP param2).
                        // This command may trigger a mission state-
                        // machine change on some systems: for example
                        // from MISSION_STATE_NOT_STARTED or
                        // MISSION_STATE_PAUSED to
                        // MISSION_STATE_ACTIVE.           If the
                        // system is in mission mode, on those systems
                        // this command might therefore start, restart
                        // or resume the mission.           If the
                        // system is not in mission mode this command
                        // must not trigger a switch to mission mode.
                        // The mission may be "reset" using param2.
                        // Resetting sets jump counters to initial
                        // values (to reset counters without changing
                        // the current mission item set the param1 to
                        // `-1`).           Resetting also explicitly
                        // changes a mission state of
                        // MISSION_STATE_COMPLETE to
                        // MISSION_STATE_PAUSED or
                        // MISSION_STATE_ACTIVE, potentially allowing
                        // it to resume when it is (next) in a mission
                        // mode.            The command will ACK with
                        // MAV_RESULT_FAILED if the sequence number is
                        // out of range (including if there is no
                        // mission item).
mavlink20.MAV_CMD_DO_LAST = 240 // NOP - This command is only used to mark the upper limit of the DO
                        // commands in the enumeration
mavlink20.MAV_CMD_PREFLIGHT_CALIBRATION = 241 // Trigger calibration. This command will be only accepted if in pre-
                        // flight mode. Except for Temperature
                        // Calibration, only one sensor should be set
                        // in a single message and all others should
                        // be zero.
mavlink20.MAV_CMD_PREFLIGHT_SET_SENSOR_OFFSETS = 242 // Set sensor offsets. This command will be only accepted if in pre-
                        // flight mode.
mavlink20.MAV_CMD_PREFLIGHT_UAVCAN = 243 // Trigger UAVCAN configuration (actuator ID assignment and direction
                        // mapping). Note that this maps to the legacy
                        // UAVCAN v0 function UAVCAN_ENUMERATE, which
                        // is intended to be executed just once during
                        // initial vehicle configuration (it is not a
                        // normal pre-flight command and has been
                        // poorly named).
mavlink20.MAV_CMD_PREFLIGHT_STORAGE = 245 // Request storage of different parameter values and logs. This command
                        // will be only accepted if in pre-flight
                        // mode.
mavlink20.MAV_CMD_PREFLIGHT_REBOOT_SHUTDOWN = 246 // Request the reboot or shutdown of system components.
mavlink20.MAV_CMD_OVERRIDE_GOTO = 252 // Override current mission with command to pause mission, pause mission
                        // and move to position, continue/resume
                        // mission. When param 1 indicates that the
                        // mission is paused (MAV_GOTO_DO_HOLD), param
                        // 2 defines whether it holds in place or
                        // moves to another position.
mavlink20.MAV_CMD_OBLIQUE_SURVEY = 260 // Mission command to set a Camera Auto Mount Pivoting Oblique Survey
                        // (Replaces CAM_TRIGG_DIST for this purpose).
                        // The camera is triggered each time this
                        // distance is exceeded, then the mount moves
                        // to the next position. Params 4~6 set-up the
                        // angle limits and number of positions for
                        // oblique survey, where mount-enabled
                        // vehicles automatically roll the camera
                        // between shots to emulate an oblique camera
                        // setup (providing an increased HFOV). This
                        // command can also be used to set the shutter
                        // integration time for the camera.
mavlink20.MAV_CMD_DO_SET_STANDARD_MODE = 262 // Enable the specified standard MAVLink mode.           If the specified
                        // mode is not supported, the vehicle should
                        // ACK with MAV_RESULT_FAILED.           See h
                        // ttps://mavlink.io/en/services/standard_mode
                        // s.html
mavlink20.MAV_CMD_MISSION_START = 300 // start running a mission
mavlink20.MAV_CMD_ACTUATOR_TEST = 310 // Actuator testing command. This is similar to MAV_CMD_DO_MOTOR_TEST but
                        // operates on the level of output functions,
                        // i.e. it is possible to test Motor1
                        // independent from which output it is
                        // configured on. Autopilots must NACK this
                        // command with
                        // MAV_RESULT_TEMPORARILY_REJECTED while
                        // armed.
mavlink20.MAV_CMD_CONFIGURE_ACTUATOR = 311 // Actuator configuration command.
mavlink20.MAV_CMD_COMPONENT_ARM_DISARM = 400 // Arms / Disarms a component
mavlink20.MAV_CMD_RUN_PREARM_CHECKS = 401 // Instructs a target system to run pre-arm checks.           This allows
                        // preflight checks to be run on demand, which
                        // may be useful on systems that normally run
                        // them at low rate, or which do not trigger
                        // checks when the armable state might have
                        // changed.           This command should
                        // return MAV_RESULT_ACCEPTED if it will run
                        // the checks.           The results of the
                        // checks are usually then reported in
                        // SYS_STATUS messages (this is system-
                        // specific).           The command should
                        // return MAV_RESULT_TEMPORARILY_REJECTED if
                        // the system is already armed.
mavlink20.MAV_CMD_ILLUMINATOR_ON_OFF = 405 // Turns illuminators ON/OFF. An illuminator is a light source that is
                        // used for lighting up dark areas external to
                        // the system: e.g. a torch or searchlight (as
                        // opposed to a light source for illuminating
                        // the system itself, e.g. an indicator
                        // light).
mavlink20.MAV_CMD_DO_ILLUMINATOR_CONFIGURE = 406 // Configures illuminator settings. An illuminator is a light source that
                        // is used for lighting up dark areas external
                        // to the system: e.g. a torch or searchlight
                        // (as opposed to a light source for
                        // illuminating the system itself, e.g. an
                        // indicator light).
mavlink20.MAV_CMD_GET_HOME_POSITION = 410 // Request the home position from the vehicle.           The vehicle will
                        // ACK the command and then emit the
                        // HOME_POSITION message.
mavlink20.MAV_CMD_INJECT_FAILURE = 420 // Inject artificial failure for testing purposes. Note that autopilots
                        // should implement an additional protection
                        // before accepting this command such as a
                        // specific param setting.
mavlink20.MAV_CMD_START_RX_PAIR = 500 // Starts receiver pairing.
mavlink20.MAV_CMD_GET_MESSAGE_INTERVAL = 510 //            Request the interval between messages for a particular
                        // MAVLink message ID.           The receiver
                        // should ACK the command and then emit its
                        // response in a MESSAGE_INTERVAL message.
mavlink20.MAV_CMD_SET_MESSAGE_INTERVAL = 511 // Set the interval between messages for a particular MAVLink message ID.
                        // This interface replaces
                        // REQUEST_DATA_STREAM.
mavlink20.MAV_CMD_REQUEST_MESSAGE = 512 // Request the target system(s) emit a single instance of a specified
                        // message (i.e. a "one-shot" version of
                        // MAV_CMD_SET_MESSAGE_INTERVAL).
mavlink20.MAV_CMD_REQUEST_PROTOCOL_VERSION = 519 // Request MAVLink protocol version compatibility. All receivers should
                        // ACK the command and then emit their
                        // capabilities in an PROTOCOL_VERSION message
mavlink20.MAV_CMD_REQUEST_AUTOPILOT_CAPABILITIES = 520 // Request autopilot capabilities. The receiver should ACK the command
                        // and then emit its capabilities in an
                        // AUTOPILOT_VERSION message
mavlink20.MAV_CMD_REQUEST_CAMERA_INFORMATION = 521 // Request camera information (CAMERA_INFORMATION).
mavlink20.MAV_CMD_REQUEST_CAMERA_SETTINGS = 522 // Request camera settings (CAMERA_SETTINGS).
mavlink20.MAV_CMD_REQUEST_STORAGE_INFORMATION = 525 // Request storage information (STORAGE_INFORMATION). Use the command's
                        // target_component to target a specific
                        // component's storage.
mavlink20.MAV_CMD_STORAGE_FORMAT = 526 // Format a storage medium. Once format is complete, a
                        // STORAGE_INFORMATION message is sent. Use
                        // the command's target_component to target a
                        // specific component's storage.
mavlink20.MAV_CMD_REQUEST_CAMERA_CAPTURE_STATUS = 527 // Request camera capture status (CAMERA_CAPTURE_STATUS)
mavlink20.MAV_CMD_REQUEST_FLIGHT_INFORMATION = 528 // Request flight information (FLIGHT_INFORMATION)
mavlink20.MAV_CMD_RESET_CAMERA_SETTINGS = 529 // Reset all camera settings to Factory Default
mavlink20.MAV_CMD_SET_CAMERA_MODE = 530 // Set camera running mode. Use NaN for reserved values. GCS will send a
                        // MAV_CMD_REQUEST_VIDEO_STREAM_STATUS command
                        // after a mode change if the camera supports
                        // video streaming.
mavlink20.MAV_CMD_SET_CAMERA_ZOOM = 531 // Set camera zoom. Camera must respond with a CAMERA_SETTINGS message
                        // (on success).
mavlink20.MAV_CMD_SET_CAMERA_FOCUS = 532 // Set camera focus. Camera must respond with a CAMERA_SETTINGS message
                        // (on success).
mavlink20.MAV_CMD_SET_STORAGE_USAGE = 533 // Set that a particular storage is the preferred location for saving
                        // photos, videos, and/or other media (e.g. to
                        // set that an SD card is used for storing
                        // videos).           There can only be one
                        // preferred save location for each particular
                        // media type: setting a media usage flag will
                        // clear/reset that same flag if set on any
                        // other storage.           If no flag is set
                        // the system should use its default storage.
                        // A target system can choose to always use
                        // default storage, in which case it should
                        // ACK the command with
                        // MAV_RESULT_UNSUPPORTED.           A target
                        // system can choose to not allow a particular
                        // storage to be set as preferred storage, in
                        // which case it should ACK the command with
                        // MAV_RESULT_DENIED.
mavlink20.MAV_CMD_SET_CAMERA_SOURCE = 534 // Set camera source. Changes the camera's active sources on cameras with
                        // multiple image sensors.
mavlink20.MAV_CMD_JUMP_TAG = 600 // Tagged jump target. Can be jumped to with MAV_CMD_DO_JUMP_TAG.
mavlink20.MAV_CMD_DO_JUMP_TAG = 601 // Jump to the matching tag in the mission list. Repeat this action for
                        // the specified number of times. A mission
                        // should contain a single matching tag for
                        // each jump. If this is not the case then a
                        // jump to a missing tag should complete the
                        // mission, and a jump where there are
                        // multiple matching tags should always select
                        // the one with the lowest mission sequence
                        // number.
mavlink20.MAV_CMD_DO_GIMBAL_MANAGER_PITCHYAW = 1000 // Set gimbal manager pitch/yaw setpoints (low rate command). It is
                        // possible to set combinations of the values
                        // below. E.g. an angle as well as a desired
                        // angular rate can be used to get to this
                        // angle at a certain angular rate, or an
                        // angular rate only will result in continuous
                        // turning. NaN is to be used to signal unset.
                        // Note: only the gimbal manager will react to
                        // this command - it will be ignored by a
                        // gimbal device. Use
                        // GIMBAL_MANAGER_SET_PITCHYAW if you need to
                        // stream pitch/yaw setpoints at higher rate.
mavlink20.MAV_CMD_DO_GIMBAL_MANAGER_CONFIGURE = 1001 // Gimbal configuration to set which sysid/compid is in primary and
                        // secondary control.
mavlink20.MAV_CMD_IMAGE_START_CAPTURE = 2000 // Start image capture sequence. CAMERA_IMAGE_CAPTURED must be emitted
                        // after each capture.            Param1 (id)
                        // may be used to specify the target camera:
                        // 0: all cameras, 1 to 6: autopilot-connected
                        // cameras, 7-255: MAVLink camera component
                        // ID.           It is needed in order to
                        // target specific cameras connected to the
                        // autopilot, or specific sensors in a multi-
                        // sensor camera (neither of which have a
                        // distinct MAVLink component ID).
                        // It is also needed to specify the target
                        // camera in missions.            When used in
                        // a mission, an autopilot should execute the
                        // MAV_CMD for a specified local camera
                        // (param1 = 1-6), or resend it as a command
                        // if it is intended for a MAVLink camera
                        // (param1 = 7 - 255), setting the command's
                        // target_component as the param1 value (and
                        // setting param1 in the command to zero).
                        // If the param1 is 0 the autopilot should do
                        // both.            When sent in a command the
                        // target MAVLink address is set using
                        // target_component.           If addressed
                        // specifically to an autopilot: param1 should
                        // be used in the same way as it is for
                        // missions (though command should NACK with
                        // MAV_RESULT_DENIED if a specified local
                        // camera does not exist).           If
                        // addressed to a MAVLink camera, param 1 can
                        // be used to address all cameras (0), or to
                        // separately address 1 to 7 individual
                        // sensors. Other values should be NACKed with
                        // MAV_RESULT_DENIED.           If the command
                        // is broadcast (target_component is 0) then
                        // param 1 should be set to 0 (any other value
                        // should be NACKED with MAV_RESULT_DENIED).
                        // An autopilot would trigger any local
                        // cameras and forward the command to all
                        // channels.
mavlink20.MAV_CMD_IMAGE_STOP_CAPTURE = 2001 // Stop image capture sequence.            Param1 (id) may be used to
                        // specify the target camera: 0: all cameras,
                        // 1 to 6: autopilot-connected cameras, 7-255:
                        // MAVLink camera component ID.           It
                        // is needed in order to target specific
                        // cameras connected to the autopilot, or
                        // specific sensors in a multi-sensor camera
                        // (neither of which have a distinct MAVLink
                        // component ID).           It is also needed
                        // to specify the target camera in missions.
                        // When used in a mission, an autopilot should
                        // execute the MAV_CMD for a specified local
                        // camera (param1 = 1-6), or resend it as a
                        // command if it is intended for a MAVLink
                        // camera (param1 = 7 - 255), setting the
                        // command's target_component as the param1
                        // value (and setting param1 in the command to
                        // zero).           If the param1 is 0 the
                        // autopilot should do both.            When
                        // sent in a command the target MAVLink
                        // address is set using target_component.
                        // If addressed specifically to an autopilot:
                        // param1 should be used in the same way as it
                        // is for missions (though command should NACK
                        // with MAV_RESULT_DENIED if a specified local
                        // camera does not exist).           If
                        // addressed to a MAVLink camera, param1 can
                        // be used to address all cameras (0), or to
                        // separately address 1 to 7 individual
                        // sensors. Other values should be NACKed with
                        // MAV_RESULT_DENIED.           If the command
                        // is broadcast (target_component is 0) then
                        // param 1 should be set to 0 (any other value
                        // should be NACKED with MAV_RESULT_DENIED).
                        // An autopilot would trigger any local
                        // cameras and forward the command to all
                        // channels.
mavlink20.MAV_CMD_REQUEST_CAMERA_IMAGE_CAPTURE = 2002 // Re-request a CAMERA_IMAGE_CAPTURED message.
mavlink20.MAV_CMD_DO_TRIGGER_CONTROL = 2003 // Enable or disable on-board camera triggering system.
mavlink20.MAV_CMD_CAMERA_TRACK_POINT = 2004 // If the camera supports point visual tracking
                        // (CAMERA_CAP_FLAGS_HAS_TRACKING_POINT is
                        // set), this command allows to initiate the
                        // tracking.
mavlink20.MAV_CMD_CAMERA_TRACK_RECTANGLE = 2005 // If the camera supports rectangle visual tracking
                        // (CAMERA_CAP_FLAGS_HAS_TRACKING_RECTANGLE is
                        // set), this command allows to initiate the
                        // tracking.
mavlink20.MAV_CMD_CAMERA_STOP_TRACKING = 2010 // Stops ongoing tracking.
mavlink20.MAV_CMD_VIDEO_START_CAPTURE = 2500 // Starts video capture (recording).
mavlink20.MAV_CMD_VIDEO_STOP_CAPTURE = 2501 // Stop the current video capture (recording).
mavlink20.MAV_CMD_VIDEO_START_STREAMING = 2502 // Start video streaming
mavlink20.MAV_CMD_VIDEO_STOP_STREAMING = 2503 // Stop the given video stream
mavlink20.MAV_CMD_REQUEST_VIDEO_STREAM_INFORMATION = 2504 // Request video stream information (VIDEO_STREAM_INFORMATION)
mavlink20.MAV_CMD_REQUEST_VIDEO_STREAM_STATUS = 2505 // Request video stream status (VIDEO_STREAM_STATUS)
mavlink20.MAV_CMD_LOGGING_START = 2510 // Request to start streaming logging data over MAVLink (see also
                        // LOGGING_DATA message)
mavlink20.MAV_CMD_LOGGING_STOP = 2511 // Request to stop streaming log data over MAVLink
mavlink20.MAV_CMD_AIRFRAME_CONFIGURATION = 2520 // 
mavlink20.MAV_CMD_CONTROL_HIGH_LATENCY = 2600 // Request to start/stop transmitting over the high latency telemetry
mavlink20.MAV_CMD_PANORAMA_CREATE = 2800 // Create a panorama at the current position
mavlink20.MAV_CMD_DO_VTOL_TRANSITION = 3000 // Request VTOL transition
mavlink20.MAV_CMD_ARM_AUTHORIZATION_REQUEST = 3001 // Request authorization to arm the vehicle to a external entity, the arm
                        // authorizer is responsible to request all
                        // data that is needs from the vehicle before
                        // authorize or deny the request.
                        // If approved the COMMAND_ACK message
                        // progress field should be set with period of
                        // time that this authorization is valid in
                        // seconds.                 If the
                        // authorization is denied
                        // COMMAND_ACK.result_param2 should be set
                        // with one of the reasons in
                        // ARM_AUTH_DENIED_REASON.
mavlink20.MAV_CMD_SET_GUIDED_SUBMODE_STANDARD = 4000 // This command sets the submode to standard guided when vehicle is in
                        // guided mode. The vehicle holds position and
                        // altitude and the user can input the desired
                        // velocities along all three axes.
mavlink20.MAV_CMD_SET_GUIDED_SUBMODE_CIRCLE = 4001 // This command sets submode circle when vehicle is in guided mode.
                        // Vehicle flies along a circle facing the
                        // center of the circle. The user can input
                        // the velocity along the circle and change
                        // the radius. If no input is given the
                        // vehicle will hold position.
mavlink20.MAV_CMD_CONDITION_GATE = 4501 // Delay mission state machine until gate has been reached.
mavlink20.MAV_CMD_NAV_FENCE_RETURN_POINT = 5000 // Fence return point (there can only be one such point in a geofence
                        // definition). If rally points are supported
                        // they should be used instead.
mavlink20.MAV_CMD_NAV_FENCE_POLYGON_VERTEX_INCLUSION = 5001 // Fence vertex for an inclusion polygon (the polygon must not be self-
                        // intersecting). The vehicle must stay within
                        // this area. Minimum of 3 vertices required.
                        // The vertices for a polygon must be sent
                        // sequentially, each with param1 set to the
                        // total number of vertices in the polygon.
mavlink20.MAV_CMD_NAV_FENCE_POLYGON_VERTEX_EXCLUSION = 5002 // Fence vertex for an exclusion polygon (the polygon must not be self-
                        // intersecting). The vehicle must stay
                        // outside this area. Minimum of 3 vertices
                        // required.           The vertices for a
                        // polygon must be sent sequentially, each
                        // with param1 set to the total number of
                        // vertices in the polygon.
mavlink20.MAV_CMD_NAV_FENCE_CIRCLE_INCLUSION = 5003 // Circular fence area. The vehicle must stay inside this area.
mavlink20.MAV_CMD_NAV_FENCE_CIRCLE_EXCLUSION = 5004 // Circular fence area. The vehicle must stay outside this area.
mavlink20.MAV_CMD_NAV_RALLY_POINT = 5100 // Rally point. You can have multiple rally points defined.
mavlink20.MAV_CMD_UAVCAN_GET_NODE_INFO = 5200 // Commands the vehicle to respond with a sequence of messages
                        // UAVCAN_NODE_INFO, one message per every
                        // UAVCAN node that is online. Note that some
                        // of the response messages can be lost, which
                        // the receiver can detect easily by checking
                        // whether every received UAVCAN_NODE_STATUS
                        // has a matching message UAVCAN_NODE_INFO
                        // received earlier; if not, this command
                        // should be sent again in order to request
                        // re-transmission of the node information
                        // messages.
mavlink20.MAV_CMD_DO_SET_SAFETY_SWITCH_STATE = 5300 // Change state of safety switch.
mavlink20.MAV_CMD_DO_ADSB_OUT_IDENT = 10001 // Trigger the start of an ADSB-out IDENT. This should only be used when
                        // requested to do so by an Air Traffic
                        // Controller in controlled airspace. This
                        // starts the IDENT which is then typically
                        // held for 18 seconds by the hardware per the
                        // Mode A, C, and S transponder spec.
mavlink20.MAV_CMD_PAYLOAD_PREPARE_DEPLOY = 30001 // Deploy payload on a Lat / Lon / Alt position. This includes the
                        // navigation to reach the required release
                        // position and velocity.
mavlink20.MAV_CMD_PAYLOAD_CONTROL_DEPLOY = 30002 // Control the payload deployment.
mavlink20.MAV_CMD_WAYPOINT_USER_1 = 31000 // User defined waypoint item. Ground Station will show the Vehicle as
                        // flying through this item.
mavlink20.MAV_CMD_WAYPOINT_USER_2 = 31001 // User defined waypoint item. Ground Station will show the Vehicle as
                        // flying through this item.
mavlink20.MAV_CMD_WAYPOINT_USER_3 = 31002 // User defined waypoint item. Ground Station will show the Vehicle as
                        // flying through this item.
mavlink20.MAV_CMD_WAYPOINT_USER_4 = 31003 // User defined waypoint item. Ground Station will show the Vehicle as
                        // flying through this item.
mavlink20.MAV_CMD_WAYPOINT_USER_5 = 31004 // User defined waypoint item. Ground Station will show the Vehicle as
                        // flying through this item.
mavlink20.MAV_CMD_SPATIAL_USER_1 = 31005 // User defined spatial item. Ground Station will not show the Vehicle as
                        // flying through this item. Example: ROI
                        // item.
mavlink20.MAV_CMD_SPATIAL_USER_2 = 31006 // User defined spatial item. Ground Station will not show the Vehicle as
                        // flying through this item. Example: ROI
                        // item.
mavlink20.MAV_CMD_SPATIAL_USER_3 = 31007 // User defined spatial item. Ground Station will not show the Vehicle as
                        // flying through this item. Example: ROI
                        // item.
mavlink20.MAV_CMD_SPATIAL_USER_4 = 31008 // User defined spatial item. Ground Station will not show the Vehicle as
                        // flying through this item. Example: ROI
                        // item.
mavlink20.MAV_CMD_SPATIAL_USER_5 = 31009 // User defined spatial item. Ground Station will not show the Vehicle as
                        // flying through this item. Example: ROI
                        // item.
mavlink20.MAV_CMD_USER_1 = 31010 // User defined command. Ground Station will not show the Vehicle as
                        // flying through this item. Example:
                        // MAV_CMD_DO_SET_PARAMETER item.
mavlink20.MAV_CMD_USER_2 = 31011 // User defined command. Ground Station will not show the Vehicle as
                        // flying through this item. Example:
                        // MAV_CMD_DO_SET_PARAMETER item.
mavlink20.MAV_CMD_USER_3 = 31012 // User defined command. Ground Station will not show the Vehicle as
                        // flying through this item. Example:
                        // MAV_CMD_DO_SET_PARAMETER item.
mavlink20.MAV_CMD_USER_4 = 31013 // User defined command. Ground Station will not show the Vehicle as
                        // flying through this item. Example:
                        // MAV_CMD_DO_SET_PARAMETER item.
mavlink20.MAV_CMD_USER_5 = 31014 // User defined command. Ground Station will not show the Vehicle as
                        // flying through this item. Example:
                        // MAV_CMD_DO_SET_PARAMETER item.
mavlink20.MAV_CMD_CAN_FORWARD = 32000 // Request forwarding of CAN packets from the given CAN bus to this
                        // component. CAN Frames are sent using
                        // CAN_FRAME and CANFD_FRAME messages
mavlink20.MAV_CMD_FIXED_MAG_CAL_YAW = 42006 // Magnetometer calibration based on provided known yaw. This allows for
                        // fast calibration using WMM field tables in
                        // the vehicle, given only the known yaw of
                        // the vehicle. If Latitude and longitude are
                        // both zero then use the current vehicle
                        // location.
mavlink20.MAV_CMD_DO_WINCH = 42600 // Command to operate winch.
mavlink20.MAV_CMD_EXTERNAL_POSITION_ESTIMATE = 43003 // Provide an external position estimate for use when dead-reckoning.
                        // This is meant to be used for occasional
                        // position resets that may be provided by a
                        // external system such as a remote pilot
                        // using landmarks over a video link.
mavlink20.MAV_CMD_ENUM_END = 43004 // 

// MAV_DATA_STREAM
mavlink20.MAV_DATA_STREAM_ALL = 0 // Enable all data streams
mavlink20.MAV_DATA_STREAM_RAW_SENSORS = 1 // Enable IMU_RAW, GPS_RAW, GPS_STATUS packets.
mavlink20.MAV_DATA_STREAM_EXTENDED_STATUS = 2 // Enable GPS_STATUS, CONTROL_STATUS, AUX_STATUS
mavlink20.MAV_DATA_STREAM_RC_CHANNELS = 3 // Enable RC_CHANNELS_SCALED, RC_CHANNELS_RAW, SERVO_OUTPUT_RAW
mavlink20.MAV_DATA_STREAM_RAW_CONTROLLER = 4 // Enable ATTITUDE_CONTROLLER_OUTPUT, POSITION_CONTROLLER_OUTPUT,
                        // NAV_CONTROLLER_OUTPUT.
mavlink20.MAV_DATA_STREAM_POSITION = 6 // Enable LOCAL_POSITION, GLOBAL_POSITION_INT messages.
mavlink20.MAV_DATA_STREAM_EXTRA1 = 10 // Dependent on the autopilot
mavlink20.MAV_DATA_STREAM_EXTRA2 = 11 // Dependent on the autopilot
mavlink20.MAV_DATA_STREAM_EXTRA3 = 12 // Dependent on the autopilot
mavlink20.MAV_DATA_STREAM_ENUM_END = 13 // 

// MAV_ROI
mavlink20.MAV_ROI_NONE = 0 // No region of interest.
mavlink20.MAV_ROI_WPNEXT = 1 // Point toward next waypoint, with optional pitch/roll/yaw offset.
mavlink20.MAV_ROI_WPINDEX = 2 // Point toward given waypoint.
mavlink20.MAV_ROI_LOCATION = 3 // Point toward fixed location.
mavlink20.MAV_ROI_TARGET = 4 // Point toward of given id.
mavlink20.MAV_ROI_ENUM_END = 5 // 

// MAV_PARAM_TYPE
mavlink20.MAV_PARAM_TYPE_UINT8 = 1 // 8-bit unsigned integer
mavlink20.MAV_PARAM_TYPE_INT8 = 2 // 8-bit signed integer
mavlink20.MAV_PARAM_TYPE_UINT16 = 3 // 16-bit unsigned integer
mavlink20.MAV_PARAM_TYPE_INT16 = 4 // 16-bit signed integer
mavlink20.MAV_PARAM_TYPE_UINT32 = 5 // 32-bit unsigned integer
mavlink20.MAV_PARAM_TYPE_INT32 = 6 // 32-bit signed integer
mavlink20.MAV_PARAM_TYPE_UINT64 = 7 // 64-bit unsigned integer
mavlink20.MAV_PARAM_TYPE_INT64 = 8 // 64-bit signed integer
mavlink20.MAV_PARAM_TYPE_REAL32 = 9 // 32-bit floating-point
mavlink20.MAV_PARAM_TYPE_REAL64 = 10 // 64-bit floating-point
mavlink20.MAV_PARAM_TYPE_ENUM_END = 11 // 

// MAV_PARAM_ERROR
mavlink20.MAV_PARAM_ERROR_NO_ERROR = 0 // No error occurred (not expected in PARAM_ERROR but may be used in
                        // future implementations.
mavlink20.MAV_PARAM_ERROR_DOES_NOT_EXIST = 1 // Parameter does not exist
mavlink20.MAV_PARAM_ERROR_VALUE_OUT_OF_RANGE = 2 // Parameter value does not fit within accepted range
mavlink20.MAV_PARAM_ERROR_PERMISSION_DENIED = 3 // Caller is not permitted to set the value of this parameter
mavlink20.MAV_PARAM_ERROR_COMPONENT_NOT_FOUND = 4 // Unknown component specified
mavlink20.MAV_PARAM_ERROR_READ_ONLY = 5 // Parameter is read-only
mavlink20.MAV_PARAM_ERROR_ENUM_END = 6 // 

// MAV_PARAM_EXT_TYPE
mavlink20.MAV_PARAM_EXT_TYPE_UINT8 = 1 // 8-bit unsigned integer
mavlink20.MAV_PARAM_EXT_TYPE_INT8 = 2 // 8-bit signed integer
mavlink20.MAV_PARAM_EXT_TYPE_UINT16 = 3 // 16-bit unsigned integer
mavlink20.MAV_PARAM_EXT_TYPE_INT16 = 4 // 16-bit signed integer
mavlink20.MAV_PARAM_EXT_TYPE_UINT32 = 5 // 32-bit unsigned integer
mavlink20.MAV_PARAM_EXT_TYPE_INT32 = 6 // 32-bit signed integer
mavlink20.MAV_PARAM_EXT_TYPE_UINT64 = 7 // 64-bit unsigned integer
mavlink20.MAV_PARAM_EXT_TYPE_INT64 = 8 // 64-bit signed integer
mavlink20.MAV_PARAM_EXT_TYPE_REAL32 = 9 // 32-bit floating-point
mavlink20.MAV_PARAM_EXT_TYPE_REAL64 = 10 // 64-bit floating-point
mavlink20.MAV_PARAM_EXT_TYPE_CUSTOM = 11 // Custom Type
mavlink20.MAV_PARAM_EXT_TYPE_ENUM_END = 12 // 

// MAV_RESULT
mavlink20.MAV_RESULT_ACCEPTED = 0 // Command is valid (is supported and has valid parameters), and was
                        // executed.
mavlink20.MAV_RESULT_TEMPORARILY_REJECTED = 1 // Command is valid, but cannot be executed at this time. This is used to
                        // indicate a problem that should be fixed
                        // just by waiting (e.g. a state machine is
                        // busy, can't arm because have not got GPS
                        // lock, etc.). Retrying later should work.
mavlink20.MAV_RESULT_DENIED = 2 // Command is invalid (is supported but has invalid parameters). Retrying
                        // same command and parameters will not work.
mavlink20.MAV_RESULT_UNSUPPORTED = 3 // Command is not supported (unknown).
mavlink20.MAV_RESULT_FAILED = 4 // Command is valid, but execution has failed. This is used to indicate
                        // any non-temporary or unexpected problem,
                        // i.e. any problem that must be fixed before
                        // the command can succeed/be retried. For
                        // example, attempting to write a file when
                        // out of memory, attempting to arm when
                        // sensors are not calibrated, etc.
mavlink20.MAV_RESULT_IN_PROGRESS = 5 // Command is valid and is being executed. This will be followed by
                        // further progress updates, i.e. the
                        // component may send further COMMAND_ACK
                        // messages with result MAV_RESULT_IN_PROGRESS
                        // (at a rate decided by the implementation),
                        // and must terminate by sending a COMMAND_ACK
                        // message with final result of the operation.
                        // The COMMAND_ACK.progress field can be used
                        // to indicate the progress of the operation.
mavlink20.MAV_RESULT_CANCELLED = 6 // Command has been cancelled (as a result of receiving a COMMAND_CANCEL
                        // message).
mavlink20.MAV_RESULT_COMMAND_LONG_ONLY = 7 // Command is only accepted when sent as a COMMAND_LONG.
mavlink20.MAV_RESULT_COMMAND_INT_ONLY = 8 // Command is only accepted when sent as a COMMAND_INT.
mavlink20.MAV_RESULT_COMMAND_UNSUPPORTED_MAV_FRAME = 9 // Command is invalid because a frame is required and the specified frame
                        // is not supported.
mavlink20.MAV_RESULT_NOT_IN_CONTROL = 10 // Command has been rejected because source system is not in control of
                        // the target system/component.
mavlink20.MAV_RESULT_ENUM_END = 11 // 

// MAV_MISSION_RESULT
mavlink20.MAV_MISSION_ACCEPTED = 0 // mission accepted OK
mavlink20.MAV_MISSION_ERROR = 1 // Generic error / not accepting mission commands at all right now.
mavlink20.MAV_MISSION_UNSUPPORTED_FRAME = 2 // Coordinate frame is not supported.
mavlink20.MAV_MISSION_UNSUPPORTED = 3 // Command is not supported.
mavlink20.MAV_MISSION_NO_SPACE = 4 // Mission items exceed storage space.
mavlink20.MAV_MISSION_INVALID = 5 // One of the parameters has an invalid value.
mavlink20.MAV_MISSION_INVALID_PARAM1 = 6 // param1 has an invalid value.
mavlink20.MAV_MISSION_INVALID_PARAM2 = 7 // param2 has an invalid value.
mavlink20.MAV_MISSION_INVALID_PARAM3 = 8 // param3 has an invalid value.
mavlink20.MAV_MISSION_INVALID_PARAM4 = 9 // param4 has an invalid value.
mavlink20.MAV_MISSION_INVALID_PARAM5_X = 10 // x / param5 has an invalid value.
mavlink20.MAV_MISSION_INVALID_PARAM6_Y = 11 // y / param6 has an invalid value.
mavlink20.MAV_MISSION_INVALID_PARAM7 = 12 // z / param7 has an invalid value.
mavlink20.MAV_MISSION_INVALID_SEQUENCE = 13 // Mission item received out of sequence
mavlink20.MAV_MISSION_DENIED = 14 // Not accepting any mission commands from this communication partner.
mavlink20.MAV_MISSION_OPERATION_CANCELLED = 15 // Current mission operation cancelled (e.g. mission upload, mission
                        // download).
mavlink20.MAV_MISSION_RESULT_ENUM_END = 16 // 

// MAV_SEVERITY
mavlink20.MAV_SEVERITY_EMERGENCY = 0 // System is unusable. This is a "panic" condition.
mavlink20.MAV_SEVERITY_ALERT = 1 // Action should be taken immediately. Indicates error in non-critical
                        // systems.
mavlink20.MAV_SEVERITY_CRITICAL = 2 // Action must be taken immediately. Indicates failure in a primary
                        // system.
mavlink20.MAV_SEVERITY_ERROR = 3 // Indicates an error in secondary/redundant systems.
mavlink20.MAV_SEVERITY_WARNING = 4 // Indicates about a possible future error if this is not resolved within
                        // a given timeframe. Example would be a low
                        // battery warning.
mavlink20.MAV_SEVERITY_NOTICE = 5 // An unusual event has occurred, though not an error condition. This
                        // should be investigated for the root cause.
mavlink20.MAV_SEVERITY_INFO = 6 // Normal operational messages. Useful for logging. No action is required
                        // for these messages.
mavlink20.MAV_SEVERITY_DEBUG = 7 // Useful non-operational messages that can assist in debugging. These
                        // should not occur during normal operation.
mavlink20.MAV_SEVERITY_ENUM_END = 8 // 

// MAV_POWER_STATUS
mavlink20.MAV_POWER_STATUS_BRICK_VALID = 1 // main brick power supply valid
mavlink20.MAV_POWER_STATUS_SERVO_VALID = 2 // main servo power supply valid for FMU
mavlink20.MAV_POWER_STATUS_USB_CONNECTED = 4 // USB power is connected
mavlink20.MAV_POWER_STATUS_PERIPH_OVERCURRENT = 8 // peripheral supply is in over-current state
mavlink20.MAV_POWER_STATUS_PERIPH_HIPOWER_OVERCURRENT = 16 // hi-power peripheral supply is in over-current state
mavlink20.MAV_POWER_STATUS_CHANGED = 32 // Power status has changed since boot
mavlink20.MAV_POWER_STATUS_ENUM_END = 33 // 

// SERIAL_CONTROL_DEV
mavlink20.SERIAL_CONTROL_DEV_TELEM1 = 0 // First telemetry port
mavlink20.SERIAL_CONTROL_DEV_TELEM2 = 1 // Second telemetry port
mavlink20.SERIAL_CONTROL_DEV_GPS1 = 2 // First GPS port
mavlink20.SERIAL_CONTROL_DEV_GPS2 = 3 // Second GPS port
mavlink20.SERIAL_CONTROL_DEV_SHELL = 10 // system shell
mavlink20.SERIAL_CONTROL_SERIAL0 = 100 // SERIAL0
mavlink20.SERIAL_CONTROL_SERIAL1 = 101 // SERIAL1
mavlink20.SERIAL_CONTROL_SERIAL2 = 102 // SERIAL2
mavlink20.SERIAL_CONTROL_SERIAL3 = 103 // SERIAL3
mavlink20.SERIAL_CONTROL_SERIAL4 = 104 // SERIAL4
mavlink20.SERIAL_CONTROL_SERIAL5 = 105 // SERIAL5
mavlink20.SERIAL_CONTROL_SERIAL6 = 106 // SERIAL6
mavlink20.SERIAL_CONTROL_SERIAL7 = 107 // SERIAL7
mavlink20.SERIAL_CONTROL_SERIAL8 = 108 // SERIAL8
mavlink20.SERIAL_CONTROL_SERIAL9 = 109 // SERIAL9
mavlink20.SERIAL_CONTROL_DEV_ENUM_END = 110 // 

// SERIAL_CONTROL_FLAG
mavlink20.SERIAL_CONTROL_FLAG_REPLY = 1 // Set if this is a reply
mavlink20.SERIAL_CONTROL_FLAG_RESPOND = 2 // Set if the sender wants the receiver to send a response as another
                        // SERIAL_CONTROL message
mavlink20.SERIAL_CONTROL_FLAG_EXCLUSIVE = 4 // Set if access to the serial port should be removed from whatever
                        // driver is currently using it, giving
                        // exclusive access to the SERIAL_CONTROL
                        // protocol. The port can be handed back by
                        // sending a request without this flag set
mavlink20.SERIAL_CONTROL_FLAG_BLOCKING = 8 // Block on writes to the serial port
mavlink20.SERIAL_CONTROL_FLAG_MULTI = 16 // Send multiple replies until port is drained
mavlink20.SERIAL_CONTROL_FLAG_ENUM_END = 17 // 

// MAV_DISTANCE_SENSOR
mavlink20.MAV_DISTANCE_SENSOR_LASER = 0 // Laser rangefinder, e.g. LightWare SF02/F or PulsedLight units
mavlink20.MAV_DISTANCE_SENSOR_ULTRASOUND = 1 // Ultrasound rangefinder, e.g. MaxBotix units
mavlink20.MAV_DISTANCE_SENSOR_INFRARED = 2 // Infrared rangefinder, e.g. Sharp units
mavlink20.MAV_DISTANCE_SENSOR_RADAR = 3 // Radar type, e.g. uLanding units
mavlink20.MAV_DISTANCE_SENSOR_UNKNOWN = 4 // Broken or unknown type, e.g. analog units
mavlink20.MAV_DISTANCE_SENSOR_ENUM_END = 5 // 

// MAV_SENSOR_ORIENTATION
mavlink20.MAV_SENSOR_ROTATION_NONE = 0 // Roll: 0, Pitch: 0, Yaw: 0
mavlink20.MAV_SENSOR_ROTATION_YAW_45 = 1 // Roll: 0, Pitch: 0, Yaw: 45
mavlink20.MAV_SENSOR_ROTATION_YAW_90 = 2 // Roll: 0, Pitch: 0, Yaw: 90
mavlink20.MAV_SENSOR_ROTATION_YAW_135 = 3 // Roll: 0, Pitch: 0, Yaw: 135
mavlink20.MAV_SENSOR_ROTATION_YAW_180 = 4 // Roll: 0, Pitch: 0, Yaw: 180
mavlink20.MAV_SENSOR_ROTATION_YAW_225 = 5 // Roll: 0, Pitch: 0, Yaw: 225
mavlink20.MAV_SENSOR_ROTATION_YAW_270 = 6 // Roll: 0, Pitch: 0, Yaw: 270
mavlink20.MAV_SENSOR_ROTATION_YAW_315 = 7 // Roll: 0, Pitch: 0, Yaw: 315
mavlink20.MAV_SENSOR_ROTATION_ROLL_180 = 8 // Roll: 180, Pitch: 0, Yaw: 0
mavlink20.MAV_SENSOR_ROTATION_ROLL_180_YAW_45 = 9 // Roll: 180, Pitch: 0, Yaw: 45
mavlink20.MAV_SENSOR_ROTATION_ROLL_180_YAW_90 = 10 // Roll: 180, Pitch: 0, Yaw: 90
mavlink20.MAV_SENSOR_ROTATION_ROLL_180_YAW_135 = 11 // Roll: 180, Pitch: 0, Yaw: 135
mavlink20.MAV_SENSOR_ROTATION_PITCH_180 = 12 // Roll: 0, Pitch: 180, Yaw: 0
mavlink20.MAV_SENSOR_ROTATION_ROLL_180_YAW_225 = 13 // Roll: 180, Pitch: 0, Yaw: 225
mavlink20.MAV_SENSOR_ROTATION_ROLL_180_YAW_270 = 14 // Roll: 180, Pitch: 0, Yaw: 270
mavlink20.MAV_SENSOR_ROTATION_ROLL_180_YAW_315 = 15 // Roll: 180, Pitch: 0, Yaw: 315
mavlink20.MAV_SENSOR_ROTATION_ROLL_90 = 16 // Roll: 90, Pitch: 0, Yaw: 0
mavlink20.MAV_SENSOR_ROTATION_ROLL_90_YAW_45 = 17 // Roll: 90, Pitch: 0, Yaw: 45
mavlink20.MAV_SENSOR_ROTATION_ROLL_90_YAW_90 = 18 // Roll: 90, Pitch: 0, Yaw: 90
mavlink20.MAV_SENSOR_ROTATION_ROLL_90_YAW_135 = 19 // Roll: 90, Pitch: 0, Yaw: 135
mavlink20.MAV_SENSOR_ROTATION_ROLL_270 = 20 // Roll: 270, Pitch: 0, Yaw: 0
mavlink20.MAV_SENSOR_ROTATION_ROLL_270_YAW_45 = 21 // Roll: 270, Pitch: 0, Yaw: 45
mavlink20.MAV_SENSOR_ROTATION_ROLL_270_YAW_90 = 22 // Roll: 270, Pitch: 0, Yaw: 90
mavlink20.MAV_SENSOR_ROTATION_ROLL_270_YAW_135 = 23 // Roll: 270, Pitch: 0, Yaw: 135
mavlink20.MAV_SENSOR_ROTATION_PITCH_90 = 24 // Roll: 0, Pitch: 90, Yaw: 0
mavlink20.MAV_SENSOR_ROTATION_PITCH_270 = 25 // Roll: 0, Pitch: 270, Yaw: 0
mavlink20.MAV_SENSOR_ROTATION_PITCH_180_YAW_90 = 26 // Roll: 0, Pitch: 180, Yaw: 90
mavlink20.MAV_SENSOR_ROTATION_PITCH_180_YAW_270 = 27 // Roll: 0, Pitch: 180, Yaw: 270
mavlink20.MAV_SENSOR_ROTATION_ROLL_90_PITCH_90 = 28 // Roll: 90, Pitch: 90, Yaw: 0
mavlink20.MAV_SENSOR_ROTATION_ROLL_180_PITCH_90 = 29 // Roll: 180, Pitch: 90, Yaw: 0
mavlink20.MAV_SENSOR_ROTATION_ROLL_270_PITCH_90 = 30 // Roll: 270, Pitch: 90, Yaw: 0
mavlink20.MAV_SENSOR_ROTATION_ROLL_90_PITCH_180 = 31 // Roll: 90, Pitch: 180, Yaw: 0
mavlink20.MAV_SENSOR_ROTATION_ROLL_270_PITCH_180 = 32 // Roll: 270, Pitch: 180, Yaw: 0
mavlink20.MAV_SENSOR_ROTATION_ROLL_90_PITCH_270 = 33 // Roll: 90, Pitch: 270, Yaw: 0
mavlink20.MAV_SENSOR_ROTATION_ROLL_180_PITCH_270 = 34 // Roll: 180, Pitch: 270, Yaw: 0
mavlink20.MAV_SENSOR_ROTATION_ROLL_270_PITCH_270 = 35 // Roll: 270, Pitch: 270, Yaw: 0
mavlink20.MAV_SENSOR_ROTATION_ROLL_90_PITCH_180_YAW_90 = 36 // Roll: 90, Pitch: 180, Yaw: 90
mavlink20.MAV_SENSOR_ROTATION_ROLL_90_YAW_270 = 37 // Roll: 90, Pitch: 0, Yaw: 270
mavlink20.MAV_SENSOR_ROTATION_ROLL_90_PITCH_68_YAW_293 = 38 // Roll: 90, Pitch: 68, Yaw: 293
mavlink20.MAV_SENSOR_ROTATION_PITCH_315 = 39 // Pitch: 315
mavlink20.MAV_SENSOR_ROTATION_ROLL_90_PITCH_315 = 40 // Roll: 90, Pitch: 315
mavlink20.MAV_SENSOR_ROTATION_CUSTOM = 100 // Custom orientation
mavlink20.MAV_SENSOR_ORIENTATION_ENUM_END = 101 // 

// MAV_MISSION_TYPE
mavlink20.MAV_MISSION_TYPE_MISSION = 0 // Items are mission commands for main mission.
mavlink20.MAV_MISSION_TYPE_FENCE = 1 // Specifies GeoFence area(s). Items are MAV_CMD_NAV_FENCE_ GeoFence
                        // items.
mavlink20.MAV_MISSION_TYPE_RALLY = 2 // Specifies the rally points for the vehicle. Rally points are
                        // alternative RTL points. Items are
                        // MAV_CMD_NAV_RALLY_POINT rally point items.
mavlink20.MAV_MISSION_TYPE_ALL = 255 // Only used in MISSION_CLEAR_ALL to clear all mission types.
mavlink20.MAV_MISSION_TYPE_ENUM_END = 256 // 

// MAV_ESTIMATOR_TYPE
mavlink20.MAV_ESTIMATOR_TYPE_UNKNOWN = 0 // Unknown type of the estimator.
mavlink20.MAV_ESTIMATOR_TYPE_NAIVE = 1 // This is a naive estimator without any real covariance feedback.
mavlink20.MAV_ESTIMATOR_TYPE_VISION = 2 // Computer vision based estimate. Might be up to scale.
mavlink20.MAV_ESTIMATOR_TYPE_VIO = 3 // Visual-inertial estimate.
mavlink20.MAV_ESTIMATOR_TYPE_GPS = 4 // Plain GPS estimate.
mavlink20.MAV_ESTIMATOR_TYPE_GPS_INS = 5 // Estimator integrating GPS and inertial sensing.
mavlink20.MAV_ESTIMATOR_TYPE_MOCAP = 6 // Estimate from external motion capturing system.
mavlink20.MAV_ESTIMATOR_TYPE_LIDAR = 7 // Estimator based on lidar sensor input.
mavlink20.MAV_ESTIMATOR_TYPE_AUTOPILOT = 8 // Estimator on autopilot.
mavlink20.MAV_ESTIMATOR_TYPE_ENUM_END = 9 // 

// MAV_BATTERY_TYPE
mavlink20.MAV_BATTERY_TYPE_UNKNOWN = 0 // Not specified.
mavlink20.MAV_BATTERY_TYPE_LIPO = 1 // Lithium polymer battery
mavlink20.MAV_BATTERY_TYPE_LIFE = 2 // Lithium-iron-phosphate battery
mavlink20.MAV_BATTERY_TYPE_LION = 3 // Lithium-ION battery
mavlink20.MAV_BATTERY_TYPE_NIMH = 4 // Nickel metal hydride battery
mavlink20.MAV_BATTERY_TYPE_ENUM_END = 5 // 

// MAV_BATTERY_FUNCTION
mavlink20.MAV_BATTERY_FUNCTION_UNKNOWN = 0 // Battery function is unknown
mavlink20.MAV_BATTERY_FUNCTION_ALL = 1 // Battery supports all flight systems
mavlink20.MAV_BATTERY_FUNCTION_PROPULSION = 2 // Battery for the propulsion system
mavlink20.MAV_BATTERY_FUNCTION_AVIONICS = 3 // Avionics battery
mavlink20.MAV_BATTERY_FUNCTION_PAYLOAD = 4 // Payload battery
mavlink20.MAV_BATTERY_FUNCTION_ENUM_END = 5 // 

// MAV_BATTERY_CHARGE_STATE
mavlink20.MAV_BATTERY_CHARGE_STATE_UNDEFINED = 0 // Low battery state is not provided
mavlink20.MAV_BATTERY_CHARGE_STATE_OK = 1 // Battery is not in low state. Normal operation.
mavlink20.MAV_BATTERY_CHARGE_STATE_LOW = 2 // Battery state is low, warn and monitor close.
mavlink20.MAV_BATTERY_CHARGE_STATE_CRITICAL = 3 // Battery state is critical, return or abort immediately.
mavlink20.MAV_BATTERY_CHARGE_STATE_EMERGENCY = 4 // Battery state is too low for ordinary abort sequence. Perform fastest
                        // possible emergency stop to prevent damage.
mavlink20.MAV_BATTERY_CHARGE_STATE_FAILED = 5 // Battery failed, damage unavoidable. Possible causes (faults) are
                        // listed in MAV_BATTERY_FAULT.
mavlink20.MAV_BATTERY_CHARGE_STATE_UNHEALTHY = 6 // Battery is diagnosed to be defective or an error occurred, usage is
                        // discouraged / prohibited. Possible causes
                        // (faults) are listed in MAV_BATTERY_FAULT.
mavlink20.MAV_BATTERY_CHARGE_STATE_CHARGING = 7 // Battery is charging.
mavlink20.MAV_BATTERY_CHARGE_STATE_ENUM_END = 8 // 

// MAV_BATTERY_MODE
mavlink20.MAV_BATTERY_MODE_UNKNOWN = 0 // Battery mode not supported/unknown battery mode/normal operation.
mavlink20.MAV_BATTERY_MODE_AUTO_DISCHARGING = 1 // Battery is auto discharging (towards storage level).
mavlink20.MAV_BATTERY_MODE_HOT_SWAP = 2 // Battery in hot-swap mode (current limited to prevent spikes that might
                        // damage sensitive electrical circuits).
mavlink20.MAV_BATTERY_MODE_ENUM_END = 3 // 

// MAV_BATTERY_FAULT
mavlink20.MAV_BATTERY_FAULT_DEEP_DISCHARGE = 1 // Battery has deep discharged.
mavlink20.MAV_BATTERY_FAULT_SPIKES = 2 // Voltage spikes.
mavlink20.MAV_BATTERY_FAULT_CELL_FAIL = 4 // One or more cells have failed. Battery should also report
                        // MAV_BATTERY_CHARGE_STATE_FAILE (and should
                        // not be used).
mavlink20.MAV_BATTERY_FAULT_OVER_CURRENT = 8 // Over-current fault.
mavlink20.MAV_BATTERY_FAULT_OVER_TEMPERATURE = 16 // Over-temperature fault.
mavlink20.MAV_BATTERY_FAULT_UNDER_TEMPERATURE = 32 // Under-temperature fault.
mavlink20.MAV_BATTERY_FAULT_INCOMPATIBLE_VOLTAGE = 64 // Vehicle voltage is not compatible with this battery (batteries on same
                        // power rail should have similar voltage).
mavlink20.MAV_BATTERY_FAULT_INCOMPATIBLE_FIRMWARE = 128 // Battery firmware is not compatible with current autopilot firmware.
mavlink20.BATTERY_FAULT_INCOMPATIBLE_CELLS_CONFIGURATION = 256 // Battery is not compatible due to cell configuration (e.g. 5s1p when
                        // vehicle requires 6s).
mavlink20.MAV_BATTERY_FAULT_ENUM_END = 257 // 

// MAV_FUEL_TYPE
mavlink20.MAV_FUEL_TYPE_UNKNOWN = 0 // Not specified. Fuel levels are normalized (i.e. maximum is 1, and
                        // other levels are relative to 1).
mavlink20.MAV_FUEL_TYPE_LIQUID = 1 // A generic liquid fuel. Fuel levels are in millilitres (ml). Fuel rates
                        // are in millilitres/second.
mavlink20.MAV_FUEL_TYPE_GAS = 2 // A gas tank. Fuel levels are in kilo-Pascal (kPa), and flow rates are
                        // in milliliters per second (ml/s).
mavlink20.MAV_FUEL_TYPE_ENUM_END = 3 // 

// MAV_GENERATOR_STATUS_FLAG
mavlink20.MAV_GENERATOR_STATUS_FLAG_OFF = 1 // Generator is off.
mavlink20.MAV_GENERATOR_STATUS_FLAG_READY = 2 // Generator is ready to start generating power.
mavlink20.MAV_GENERATOR_STATUS_FLAG_GENERATING = 4 // Generator is generating power.
mavlink20.MAV_GENERATOR_STATUS_FLAG_CHARGING = 8 // Generator is charging the batteries (generating enough power to charge
                        // and provide the load).
mavlink20.MAV_GENERATOR_STATUS_FLAG_REDUCED_POWER = 16 // Generator is operating at a reduced maximum power.
mavlink20.MAV_GENERATOR_STATUS_FLAG_MAXPOWER = 32 // Generator is providing the maximum output.
mavlink20.MAV_GENERATOR_STATUS_FLAG_OVERTEMP_WARNING = 64 // Generator is near the maximum operating temperature, cooling is
                        // insufficient.
mavlink20.MAV_GENERATOR_STATUS_FLAG_OVERTEMP_FAULT = 128 // Generator hit the maximum operating temperature and shutdown.
mavlink20.MAV_GENERATOR_STATUS_FLAG_ELECTRONICS_OVERTEMP_WARNING = 256 // Power electronics are near the maximum operating temperature, cooling
                        // is insufficient.
mavlink20.MAV_GENERATOR_STATUS_FLAG_ELECTRONICS_OVERTEMP_FAULT = 512 // Power electronics hit the maximum operating temperature and shutdown.
mavlink20.MAV_GENERATOR_STATUS_FLAG_ELECTRONICS_FAULT = 1024 // Power electronics experienced a fault and shutdown.
mavlink20.MAV_GENERATOR_STATUS_FLAG_POWERSOURCE_FAULT = 2048 // The power source supplying the generator failed e.g. mechanical
                        // generator stopped, tether is no longer
                        // providing power, solar cell is in shade,
                        // hydrogen reaction no longer happening.
mavlink20.MAV_GENERATOR_STATUS_FLAG_COMMUNICATION_WARNING = 4096 // Generator controller having communication problems.
mavlink20.MAV_GENERATOR_STATUS_FLAG_COOLING_WARNING = 8192 // Power electronic or generator cooling system error.
mavlink20.MAV_GENERATOR_STATUS_FLAG_POWER_RAIL_FAULT = 16384 // Generator controller power rail experienced a fault.
mavlink20.MAV_GENERATOR_STATUS_FLAG_OVERCURRENT_FAULT = 32768 // Generator controller exceeded the overcurrent threshold and shutdown
                        // to prevent damage.
mavlink20.MAV_GENERATOR_STATUS_FLAG_BATTERY_OVERCHARGE_CURRENT_FAULT = 65536 // Generator controller detected a high current going into the batteries
                        // and shutdown to prevent battery damage.
mavlink20.MAV_GENERATOR_STATUS_FLAG_OVERVOLTAGE_FAULT = 131072 // Generator controller exceeded it's overvoltage threshold and shutdown
                        // to prevent it exceeding the voltage rating.
mavlink20.MAV_GENERATOR_STATUS_FLAG_BATTERY_UNDERVOLT_FAULT = 262144 // Batteries are under voltage (generator will not start).
mavlink20.MAV_GENERATOR_STATUS_FLAG_START_INHIBITED = 524288 // Generator start is inhibited by e.g. a safety switch.
mavlink20.MAV_GENERATOR_STATUS_FLAG_MAINTENANCE_REQUIRED = 1048576 // Generator requires maintenance.
mavlink20.MAV_GENERATOR_STATUS_FLAG_WARMING_UP = 2097152 // Generator is not ready to generate yet.
mavlink20.MAV_GENERATOR_STATUS_FLAG_IDLE = 4194304 // Generator is idle.
mavlink20.MAV_GENERATOR_STATUS_FLAG_ENUM_END = 4194305 // 

// MAV_VTOL_STATE
mavlink20.MAV_VTOL_STATE_UNDEFINED = 0 // MAV is not configured as VTOL
mavlink20.MAV_VTOL_STATE_TRANSITION_TO_FW = 1 // VTOL is in transition from multicopter to fixed-wing
mavlink20.MAV_VTOL_STATE_TRANSITION_TO_MC = 2 // VTOL is in transition from fixed-wing to multicopter
mavlink20.MAV_VTOL_STATE_MC = 3 // VTOL is in multicopter state
mavlink20.MAV_VTOL_STATE_FW = 4 // VTOL is in fixed-wing state
mavlink20.MAV_VTOL_STATE_ENUM_END = 5 // 

// MAV_LANDED_STATE
mavlink20.MAV_LANDED_STATE_UNDEFINED = 0 // MAV landed state is unknown
mavlink20.MAV_LANDED_STATE_ON_GROUND = 1 // MAV is landed (on ground)
mavlink20.MAV_LANDED_STATE_IN_AIR = 2 // MAV is in air
mavlink20.MAV_LANDED_STATE_TAKEOFF = 3 // MAV currently taking off
mavlink20.MAV_LANDED_STATE_LANDING = 4 // MAV currently landing
mavlink20.MAV_LANDED_STATE_ENUM_END = 5 // 

// ADSB_ALTITUDE_TYPE
mavlink20.ADSB_ALTITUDE_TYPE_PRESSURE_QNH = 0 // Altitude reported from a Baro source using QNH reference
mavlink20.ADSB_ALTITUDE_TYPE_GEOMETRIC = 1 // Altitude reported from a GNSS source
mavlink20.ADSB_ALTITUDE_TYPE_ENUM_END = 2 // 

// ADSB_EMITTER_TYPE
mavlink20.ADSB_EMITTER_TYPE_NO_INFO = 0 // 
mavlink20.ADSB_EMITTER_TYPE_LIGHT = 1 // 
mavlink20.ADSB_EMITTER_TYPE_SMALL = 2 // 
mavlink20.ADSB_EMITTER_TYPE_LARGE = 3 // 
mavlink20.ADSB_EMITTER_TYPE_HIGH_VORTEX_LARGE = 4 // 
mavlink20.ADSB_EMITTER_TYPE_HEAVY = 5 // 
mavlink20.ADSB_EMITTER_TYPE_HIGHLY_MANUV = 6 // 
mavlink20.ADSB_EMITTER_TYPE_ROTOCRAFT = 7 // 
mavlink20.ADSB_EMITTER_TYPE_UNASSIGNED = 8 // 
mavlink20.ADSB_EMITTER_TYPE_GLIDER = 9 // 
mavlink20.ADSB_EMITTER_TYPE_LIGHTER_AIR = 10 // 
mavlink20.ADSB_EMITTER_TYPE_PARACHUTE = 11 // 
mavlink20.ADSB_EMITTER_TYPE_ULTRA_LIGHT = 12 // 
mavlink20.ADSB_EMITTER_TYPE_UNASSIGNED2 = 13 // 
mavlink20.ADSB_EMITTER_TYPE_UAV = 14 // 
mavlink20.ADSB_EMITTER_TYPE_SPACE = 15 // 
mavlink20.ADSB_EMITTER_TYPE_UNASSGINED3 = 16 // 
mavlink20.ADSB_EMITTER_TYPE_EMERGENCY_SURFACE = 17 // 
mavlink20.ADSB_EMITTER_TYPE_SERVICE_SURFACE = 18 // 
mavlink20.ADSB_EMITTER_TYPE_POINT_OBSTACLE = 19 // 
mavlink20.ADSB_EMITTER_TYPE_ENUM_END = 20 // 

// ADSB_FLAGS
mavlink20.ADSB_FLAGS_VALID_COORDS = 1 // 
mavlink20.ADSB_FLAGS_VALID_ALTITUDE = 2 // 
mavlink20.ADSB_FLAGS_VALID_HEADING = 4 // 
mavlink20.ADSB_FLAGS_VALID_VELOCITY = 8 // 
mavlink20.ADSB_FLAGS_VALID_CALLSIGN = 16 // 
mavlink20.ADSB_FLAGS_VALID_SQUAWK = 32 // 
mavlink20.ADSB_FLAGS_SIMULATED = 64 // 
mavlink20.ADSB_FLAGS_VERTICAL_VELOCITY_VALID = 128 // 
mavlink20.ADSB_FLAGS_BARO_VALID = 256 // 
mavlink20.ADSB_FLAGS_SOURCE_UAT = 32768 // 
mavlink20.ADSB_FLAGS_ENUM_END = 32769 // 

// MAV_DO_REPOSITION_FLAGS
mavlink20.MAV_DO_REPOSITION_FLAGS_CHANGE_MODE = 1 // The aircraft should immediately transition into guided. This should
                        // not be set for follow me applications
mavlink20.MAV_DO_REPOSITION_FLAGS_RELATIVE_YAW = 2 // Yaw relative to the vehicle current heading (if not set, relative to
                        // North).
mavlink20.MAV_DO_REPOSITION_FLAGS_ENUM_END = 3 // 

// SPEED_TYPE
mavlink20.SPEED_TYPE_AIRSPEED = 0 // Airspeed
mavlink20.SPEED_TYPE_GROUNDSPEED = 1 // Groundspeed
mavlink20.SPEED_TYPE_CLIMB_SPEED = 2 // Climb speed
mavlink20.SPEED_TYPE_DESCENT_SPEED = 3 // Descent speed
mavlink20.SPEED_TYPE_ENUM_END = 4 // 

// ESTIMATOR_STATUS_FLAGS
mavlink20.ESTIMATOR_ATTITUDE = 1 // True if the attitude estimate is good
mavlink20.ESTIMATOR_VELOCITY_HORIZ = 2 // True if the horizontal velocity estimate is good
mavlink20.ESTIMATOR_VELOCITY_VERT = 4 // True if the  vertical velocity estimate is good
mavlink20.ESTIMATOR_POS_HORIZ_REL = 8 // True if the horizontal position (relative) estimate is good
mavlink20.ESTIMATOR_POS_HORIZ_ABS = 16 // True if the horizontal position (absolute) estimate is good
mavlink20.ESTIMATOR_POS_VERT_ABS = 32 // True if the vertical position (absolute) estimate is good
mavlink20.ESTIMATOR_POS_VERT_AGL = 64 // True if the vertical position (above ground) estimate is good
mavlink20.ESTIMATOR_CONST_POS_MODE = 128 // True if the EKF is in a constant position mode and is not using
                        // external measurements (eg GPS or optical
                        // flow)
mavlink20.ESTIMATOR_PRED_POS_HORIZ_REL = 256 // True if the EKF has sufficient data to enter a mode that will provide
                        // a (relative) position estimate
mavlink20.ESTIMATOR_PRED_POS_HORIZ_ABS = 512 // True if the EKF has sufficient data to enter a mode that will provide
                        // a (absolute) position estimate
mavlink20.ESTIMATOR_GPS_GLITCH = 1024 // True if the EKF has detected a GPS glitch
mavlink20.ESTIMATOR_ACCEL_ERROR = 2048 // True if the EKF has detected bad accelerometer data
mavlink20.ESTIMATOR_STATUS_FLAGS_ENUM_END = 2049 // 

// MOTOR_TEST_ORDER
mavlink20.MOTOR_TEST_ORDER_DEFAULT = 0 // Default autopilot motor test method.
mavlink20.MOTOR_TEST_ORDER_SEQUENCE = 1 // Motor numbers are specified as their index in a predefined vehicle-
                        // specific sequence.
mavlink20.MOTOR_TEST_ORDER_BOARD = 2 // Motor numbers are specified as the output as labeled on the board.
mavlink20.MOTOR_TEST_ORDER_ENUM_END = 3 // 

// MOTOR_TEST_THROTTLE_TYPE
mavlink20.MOTOR_TEST_THROTTLE_PERCENT = 0 // Throttle as a percentage (0 ~ 100)
mavlink20.MOTOR_TEST_THROTTLE_PWM = 1 // Throttle as an absolute PWM value (normally in range of 1000~2000).
mavlink20.MOTOR_TEST_THROTTLE_PILOT = 2 // Throttle pass-through from pilot's transmitter.
mavlink20.MOTOR_TEST_COMPASS_CAL = 3 // Per-motor compass calibration test.
mavlink20.MOTOR_TEST_THROTTLE_TYPE_ENUM_END = 4 // 

// GPS_INPUT_IGNORE_FLAGS
mavlink20.GPS_INPUT_IGNORE_FLAG_ALT = 1 // ignore altitude field
mavlink20.GPS_INPUT_IGNORE_FLAG_HDOP = 2 // ignore hdop field
mavlink20.GPS_INPUT_IGNORE_FLAG_VDOP = 4 // ignore vdop field
mavlink20.GPS_INPUT_IGNORE_FLAG_VEL_HORIZ = 8 // ignore horizontal velocity field (vn and ve)
mavlink20.GPS_INPUT_IGNORE_FLAG_VEL_VERT = 16 // ignore vertical velocity field (vd)
mavlink20.GPS_INPUT_IGNORE_FLAG_SPEED_ACCURACY = 32 // ignore speed accuracy field
mavlink20.GPS_INPUT_IGNORE_FLAG_HORIZONTAL_ACCURACY = 64 // ignore horizontal accuracy field
mavlink20.GPS_INPUT_IGNORE_FLAG_VERTICAL_ACCURACY = 128 // ignore vertical accuracy field
mavlink20.GPS_INPUT_IGNORE_FLAGS_ENUM_END = 129 // 

// MAV_COLLISION_ACTION
mavlink20.MAV_COLLISION_ACTION_NONE = 0 // Ignore any potential collisions
mavlink20.MAV_COLLISION_ACTION_REPORT = 1 // Report potential collision
mavlink20.MAV_COLLISION_ACTION_ASCEND_OR_DESCEND = 2 // Ascend or Descend to avoid threat
mavlink20.MAV_COLLISION_ACTION_MOVE_HORIZONTALLY = 3 // Move horizontally to avoid threat
mavlink20.MAV_COLLISION_ACTION_MOVE_PERPENDICULAR = 4 // Aircraft to move perpendicular to the collision's velocity vector
mavlink20.MAV_COLLISION_ACTION_RTL = 5 // Aircraft to fly directly back to its launch point
mavlink20.MAV_COLLISION_ACTION_HOVER = 6 // Aircraft to stop in place
mavlink20.MAV_COLLISION_ACTION_ENUM_END = 7 // 

// MAV_COLLISION_THREAT_LEVEL
mavlink20.MAV_COLLISION_THREAT_LEVEL_NONE = 0 // Not a threat
mavlink20.MAV_COLLISION_THREAT_LEVEL_LOW = 1 // Craft is mildly concerned about this threat
mavlink20.MAV_COLLISION_THREAT_LEVEL_HIGH = 2 // Craft is panicking, and may take actions to avoid threat
mavlink20.MAV_COLLISION_THREAT_LEVEL_ENUM_END = 3 // 

// MAV_COLLISION_SRC
mavlink20.MAV_COLLISION_SRC_ADSB = 0 // ID field references ADSB_VEHICLE packets
mavlink20.MAV_COLLISION_SRC_MAVLINK_GPS_GLOBAL_INT = 1 // ID field references MAVLink SRC ID
mavlink20.MAV_COLLISION_SRC_ENUM_END = 2 // 

// GPS_FIX_TYPE
mavlink20.GPS_FIX_TYPE_NO_GPS = 0 // No GPS connected
mavlink20.GPS_FIX_TYPE_NO_FIX = 1 // No position information, GPS is connected
mavlink20.GPS_FIX_TYPE_2D_FIX = 2 // 2D position
mavlink20.GPS_FIX_TYPE_3D_FIX = 3 // 3D position
mavlink20.GPS_FIX_TYPE_DGPS = 4 // DGPS/SBAS aided 3D position
mavlink20.GPS_FIX_TYPE_RTK_FLOAT = 5 // RTK float, 3D position
mavlink20.GPS_FIX_TYPE_RTK_FIXED = 6 // RTK Fixed, 3D position
mavlink20.GPS_FIX_TYPE_STATIC = 7 // Static fixed, typically used for base stations
mavlink20.GPS_FIX_TYPE_PPP = 8 // PPP, 3D position.
mavlink20.GPS_FIX_TYPE_ENUM_END = 9 // 

// RTK_BASELINE_COORDINATE_SYSTEM
mavlink20.RTK_BASELINE_COORDINATE_SYSTEM_ECEF = 0 // Earth-centered, Earth-fixed
mavlink20.RTK_BASELINE_COORDINATE_SYSTEM_NED = 1 // RTK basestation centered, north, east, down
mavlink20.RTK_BASELINE_COORDINATE_SYSTEM_ENUM_END = 2 // 

// LANDING_TARGET_TYPE
mavlink20.LANDING_TARGET_TYPE_LIGHT_BEACON = 0 // Landing target signaled by light beacon (ex: IR-LOCK)
mavlink20.LANDING_TARGET_TYPE_RADIO_BEACON = 1 // Landing target signaled by radio beacon (ex: ILS, NDB)
mavlink20.LANDING_TARGET_TYPE_VISION_FIDUCIAL = 2 // Landing target represented by a fiducial marker (ex: ARTag)
mavlink20.LANDING_TARGET_TYPE_VISION_OTHER = 3 // Landing target represented by a pre-defined visual shape/feature (ex:
                        // X-marker, H-marker, square)
mavlink20.LANDING_TARGET_TYPE_ENUM_END = 4 // 

// VTOL_TRANSITION_HEADING
mavlink20.VTOL_TRANSITION_HEADING_VEHICLE_DEFAULT = 0 // Respect the heading configuration of the vehicle.
mavlink20.VTOL_TRANSITION_HEADING_NEXT_WAYPOINT = 1 // Use the heading pointing towards the next waypoint.
mavlink20.VTOL_TRANSITION_HEADING_TAKEOFF = 2 // Use the heading on takeoff (while sitting on the ground).
mavlink20.VTOL_TRANSITION_HEADING_SPECIFIED = 3 // Use the specified heading in parameter 4.
mavlink20.VTOL_TRANSITION_HEADING_ANY = 4 // Use the current heading when reaching takeoff altitude (potentially
                        // facing the wind when weather-vaning is
                        // active).
mavlink20.VTOL_TRANSITION_HEADING_ENUM_END = 5 // 

// CAMERA_CAP_FLAGS
mavlink20.CAMERA_CAP_FLAGS_CAPTURE_VIDEO = 1 // Camera is able to record video
mavlink20.CAMERA_CAP_FLAGS_CAPTURE_IMAGE = 2 // Camera is able to capture images
mavlink20.CAMERA_CAP_FLAGS_HAS_MODES = 4 // Camera has separate Video and Image/Photo modes
                        // (MAV_CMD_SET_CAMERA_MODE)
mavlink20.CAMERA_CAP_FLAGS_CAN_CAPTURE_IMAGE_IN_VIDEO_MODE = 8 // Camera can capture images while in video mode
mavlink20.CAMERA_CAP_FLAGS_CAN_CAPTURE_VIDEO_IN_IMAGE_MODE = 16 // Camera can capture videos while in Photo/Image mode
mavlink20.CAMERA_CAP_FLAGS_HAS_IMAGE_SURVEY_MODE = 32 // Camera has image survey mode (MAV_CMD_SET_CAMERA_MODE)
mavlink20.CAMERA_CAP_FLAGS_HAS_BASIC_ZOOM = 64 // Camera has basic zoom control (MAV_CMD_SET_CAMERA_ZOOM)
mavlink20.CAMERA_CAP_FLAGS_HAS_BASIC_FOCUS = 128 // Camera has basic focus control (MAV_CMD_SET_CAMERA_FOCUS)
mavlink20.CAMERA_CAP_FLAGS_HAS_VIDEO_STREAM = 256 // Camera has video streaming capabilities (request
                        // VIDEO_STREAM_INFORMATION with
                        // MAV_CMD_REQUEST_MESSAGE for video streaming
                        // info)
mavlink20.CAMERA_CAP_FLAGS_HAS_TRACKING_POINT = 512 // Camera supports tracking of a point on the camera view.
mavlink20.CAMERA_CAP_FLAGS_HAS_TRACKING_RECTANGLE = 1024 // Camera supports tracking of a selection rectangle on the camera view.
mavlink20.CAMERA_CAP_FLAGS_HAS_TRACKING_GEO_STATUS = 2048 // Camera supports tracking geo status (CAMERA_TRACKING_GEO_STATUS).
mavlink20.CAMERA_CAP_FLAGS_HAS_THERMAL_RANGE = 4096 // Camera supports absolute thermal range (request CAMERA_THERMAL_RANGE
                        // with MAV_CMD_REQUEST_MESSAGE).
mavlink20.CAMERA_CAP_FLAGS_HAS_MTI = 8192 // Camera supports Moving Target Indicators (MTI) on the camera view
                        // (using MAV_CMD_CAMERA_START_MTI).
mavlink20.CAMERA_CAP_FLAGS_ENUM_END = 8193 // 

// VIDEO_STREAM_STATUS_FLAGS
mavlink20.VIDEO_STREAM_STATUS_FLAGS_RUNNING = 1 // Stream is active (running)
mavlink20.VIDEO_STREAM_STATUS_FLAGS_THERMAL = 2 // Stream is thermal imaging
mavlink20.VIDEO_STREAM_STATUS_FLAGS_THERMAL_RANGE_ENABLED = 4 // Stream can report absolute thermal range (see CAMERA_THERMAL_RANGE).
mavlink20.VIDEO_STREAM_STATUS_FLAGS_ENUM_END = 5 // 

// VIDEO_STREAM_TYPE
mavlink20.VIDEO_STREAM_TYPE_RTSP = 0 // Stream is RTSP
mavlink20.VIDEO_STREAM_TYPE_RTPUDP = 1 // Stream is RTP UDP (URI gives the port number)
mavlink20.VIDEO_STREAM_TYPE_TCP_MPEG = 2 // Stream is MPEG on TCP
mavlink20.VIDEO_STREAM_TYPE_MPEG_TS = 3 // Stream is MPEG TS (URI gives the port number)
mavlink20.VIDEO_STREAM_TYPE_ENUM_END = 4 // 

// VIDEO_STREAM_ENCODING
mavlink20.VIDEO_STREAM_ENCODING_UNKNOWN = 0 // Stream encoding is unknown
mavlink20.VIDEO_STREAM_ENCODING_H264 = 1 // Stream encoding is H.264
mavlink20.VIDEO_STREAM_ENCODING_H265 = 2 // Stream encoding is H.265
mavlink20.VIDEO_STREAM_ENCODING_ENUM_END = 3 // 

// CAMERA_TRACKING_STATUS_FLAGS
mavlink20.CAMERA_TRACKING_STATUS_FLAGS_IDLE = 0 // Camera is not tracking
mavlink20.CAMERA_TRACKING_STATUS_FLAGS_ACTIVE = 1 // Camera is tracking
mavlink20.CAMERA_TRACKING_STATUS_FLAGS_ERROR = 2 // Camera tracking in error state
mavlink20.CAMERA_TRACKING_STATUS_FLAGS_MTI = 4 // Camera Moving Target Indicators (MTI) are active
mavlink20.CAMERA_TRACKING_STATUS_FLAGS_COASTING = 8 // Camera tracking target is obscured and is being predicted
mavlink20.CAMERA_TRACKING_STATUS_FLAGS_ENUM_END = 9 // 

// CAMERA_TRACKING_MODE
mavlink20.CAMERA_TRACKING_MODE_NONE = 0 // Not tracking
mavlink20.CAMERA_TRACKING_MODE_POINT = 1 // Target is a point
mavlink20.CAMERA_TRACKING_MODE_RECTANGLE = 2 // Target is a rectangle
mavlink20.CAMERA_TRACKING_MODE_ENUM_END = 3 // 

// CAMERA_TRACKING_TARGET_DATA
mavlink20.CAMERA_TRACKING_TARGET_DATA_EMBEDDED = 1 // Target data embedded in image data (proprietary)
mavlink20.CAMERA_TRACKING_TARGET_DATA_RENDERED = 2 // Target data rendered in image
mavlink20.CAMERA_TRACKING_TARGET_DATA_IN_STATUS = 4 // Target data within status message (Point or Rectangle)
mavlink20.CAMERA_TRACKING_TARGET_DATA_ENUM_END = 5 // 

// CAMERA_ZOOM_TYPE
mavlink20.ZOOM_TYPE_STEP = 0 // Zoom one step increment (-1 for wide, 1 for tele)
mavlink20.ZOOM_TYPE_CONTINUOUS = 1 // Continuous normalized zoom in/out rate until stopped. Range -1..1,
                        // negative: wide, positive: narrow/tele, 0 to
                        // stop zooming. Other values should be
                        // clipped to the range.
mavlink20.ZOOM_TYPE_RANGE = 2 // Zoom value as proportion of full camera range (a percentage value
                        // between 0.0 and 100.0)
mavlink20.ZOOM_TYPE_FOCAL_LENGTH = 3 // Zoom value/variable focal length in millimetres. Note that there is no
                        // message to get the valid zoom range of the
                        // camera, so this can type can only be used
                        // for cameras where the zoom range is known
                        // (implying that this cannot reliably be used
                        // in a GCS for an arbitrary camera)
mavlink20.ZOOM_TYPE_HORIZONTAL_FOV = 4 // Zoom value as horizontal field of view in degrees.
mavlink20.CAMERA_ZOOM_TYPE_ENUM_END = 5 // 

// SET_FOCUS_TYPE
mavlink20.FOCUS_TYPE_STEP = 0 // Focus one step increment (-1 for focusing in, 1 for focusing out
                        // towards infinity).
mavlink20.FOCUS_TYPE_CONTINUOUS = 1 // Continuous normalized focus in/out rate until stopped. Range -1..1,
                        // negative: in, positive: out towards
                        // infinity, 0 to stop focusing. Other values
                        // should be clipped to the range.
mavlink20.FOCUS_TYPE_RANGE = 2 // Focus value as proportion of full camera focus range (a value between
                        // 0.0 and 100.0)
mavlink20.FOCUS_TYPE_METERS = 3 // Focus value in metres. Note that there is no message to get the valid
                        // focus range of the camera, so this can type
                        // can only be used for cameras where the
                        // range is known (implying that this cannot
                        // reliably be used in a GCS for an arbitrary
                        // camera).
mavlink20.FOCUS_TYPE_AUTO = 4 // Focus automatically.
mavlink20.FOCUS_TYPE_AUTO_SINGLE = 5 // Single auto focus. Mainly used for still pictures. Usually abbreviated
                        // as AF-S.
mavlink20.FOCUS_TYPE_AUTO_CONTINUOUS = 6 // Continuous auto focus. Mainly used for dynamic scenes. Abbreviated as
                        // AF-C.
mavlink20.SET_FOCUS_TYPE_ENUM_END = 7 // 

// CAMERA_SOURCE
mavlink20.CAMERA_SOURCE_DEFAULT = 0 // Default camera source.
mavlink20.CAMERA_SOURCE_RGB = 1 // RGB camera source.
mavlink20.CAMERA_SOURCE_IR = 2 // IR camera source.
mavlink20.CAMERA_SOURCE_NDVI = 3 // NDVI camera source.
mavlink20.CAMERA_SOURCE_ENUM_END = 4 // 

// PARAM_ACK
mavlink20.PARAM_ACK_ACCEPTED = 0 // Parameter value ACCEPTED and SET
mavlink20.PARAM_ACK_VALUE_UNSUPPORTED = 1 // Parameter value UNKNOWN/UNSUPPORTED
mavlink20.PARAM_ACK_FAILED = 2 // Parameter failed to set
mavlink20.PARAM_ACK_IN_PROGRESS = 3 // Parameter value received but not yet set/accepted. A subsequent
                        // PARAM_EXT_ACK with the final result will
                        // follow once operation is completed. This is
                        // returned immediately for parameters that
                        // take longer to set, indicating that the the
                        // parameter was received and does not need to
                        // be resent.
mavlink20.PARAM_ACK_ENUM_END = 4 // 

// CAMERA_MODE
mavlink20.CAMERA_MODE_IMAGE = 0 // Camera is in image/photo capture mode.
mavlink20.CAMERA_MODE_VIDEO = 1 // Camera is in video capture mode.
mavlink20.CAMERA_MODE_IMAGE_SURVEY = 2 // Camera is in image survey capture mode. It allows for camera
                        // controller to do specific settings for
                        // surveys.
mavlink20.CAMERA_MODE_ENUM_END = 3 // 

// MAV_ARM_AUTH_DENIED_REASON
mavlink20.MAV_ARM_AUTH_DENIED_REASON_GENERIC = 0 // Not a specific reason
mavlink20.MAV_ARM_AUTH_DENIED_REASON_NONE = 1 // Authorizer will send the error as string to GCS
mavlink20.MAV_ARM_AUTH_DENIED_REASON_INVALID_WAYPOINT = 2 // At least one waypoint have a invalid value
mavlink20.MAV_ARM_AUTH_DENIED_REASON_TIMEOUT = 3 // Timeout in the authorizer process(in case it depends on network)
mavlink20.MAV_ARM_AUTH_DENIED_REASON_AIRSPACE_IN_USE = 4 // Airspace of the mission in use by another vehicle, second result
                        // parameter can have the waypoint id that
                        // caused it to be denied.
mavlink20.MAV_ARM_AUTH_DENIED_REASON_BAD_WEATHER = 5 // Weather is not good to fly
mavlink20.MAV_ARM_AUTH_DENIED_REASON_ENUM_END = 6 // 

// RC_TYPE
mavlink20.RC_TYPE_SPEKTRUM = 0 // Spektrum
mavlink20.RC_TYPE_CRSF = 1 // CRSF
mavlink20.RC_TYPE_ENUM_END = 2 // 

// RC_SUB_TYPE
mavlink20.RC_SUB_TYPE_SPEKTRUM_DSM2 = 0 // Spektrum DSM2
mavlink20.RC_SUB_TYPE_SPEKTRUM_DSMX = 1 // Spektrum DSMX
mavlink20.RC_SUB_TYPE_SPEKTRUM_DSMX8 = 2 // Spektrum DSMX8
mavlink20.RC_SUB_TYPE_ENUM_END = 3 // 

// POSITION_TARGET_TYPEMASK
mavlink20.POSITION_TARGET_TYPEMASK_X_IGNORE = 1 // Ignore position x
mavlink20.POSITION_TARGET_TYPEMASK_Y_IGNORE = 2 // Ignore position y
mavlink20.POSITION_TARGET_TYPEMASK_Z_IGNORE = 4 // Ignore position z
mavlink20.POSITION_TARGET_TYPEMASK_VX_IGNORE = 8 // Ignore velocity x
mavlink20.POSITION_TARGET_TYPEMASK_VY_IGNORE = 16 // Ignore velocity y
mavlink20.POSITION_TARGET_TYPEMASK_VZ_IGNORE = 32 // Ignore velocity z
mavlink20.POSITION_TARGET_TYPEMASK_AX_IGNORE = 64 // Ignore acceleration x
mavlink20.POSITION_TARGET_TYPEMASK_AY_IGNORE = 128 // Ignore acceleration y
mavlink20.POSITION_TARGET_TYPEMASK_AZ_IGNORE = 256 // Ignore acceleration z
mavlink20.POSITION_TARGET_TYPEMASK_FORCE_SET = 512 // Use force instead of acceleration
mavlink20.POSITION_TARGET_TYPEMASK_YAW_IGNORE = 1024 // Ignore yaw
mavlink20.POSITION_TARGET_TYPEMASK_YAW_RATE_IGNORE = 2048 // Ignore yaw rate
mavlink20.POSITION_TARGET_TYPEMASK_ENUM_END = 2049 // 

// ATTITUDE_TARGET_TYPEMASK
mavlink20.ATTITUDE_TARGET_TYPEMASK_BODY_ROLL_RATE_IGNORE = 1 // Ignore body roll rate
mavlink20.ATTITUDE_TARGET_TYPEMASK_BODY_PITCH_RATE_IGNORE = 2 // Ignore body pitch rate
mavlink20.ATTITUDE_TARGET_TYPEMASK_BODY_YAW_RATE_IGNORE = 4 // Ignore body yaw rate
mavlink20.ATTITUDE_TARGET_TYPEMASK_THRUST_BODY_SET = 32 // Use 3D body thrust setpoint instead of throttle
mavlink20.ATTITUDE_TARGET_TYPEMASK_THROTTLE_IGNORE = 64 // Ignore throttle
mavlink20.ATTITUDE_TARGET_TYPEMASK_ATTITUDE_IGNORE = 128 // Ignore attitude
mavlink20.ATTITUDE_TARGET_TYPEMASK_ENUM_END = 129 // 

// UTM_FLIGHT_STATE
mavlink20.UTM_FLIGHT_STATE_UNKNOWN = 1 // The flight state can't be determined.
mavlink20.UTM_FLIGHT_STATE_GROUND = 2 // UAS on ground.
mavlink20.UTM_FLIGHT_STATE_AIRBORNE = 3 // UAS airborne.
mavlink20.UTM_FLIGHT_STATE_EMERGENCY = 16 // UAS is in an emergency flight state.
mavlink20.UTM_FLIGHT_STATE_NOCTRL = 32 // UAS has no active controls.
mavlink20.UTM_FLIGHT_STATE_ENUM_END = 33 // 

// UTM_DATA_AVAIL_FLAGS
mavlink20.UTM_DATA_AVAIL_FLAGS_TIME_VALID = 1 // The field time contains valid data.
mavlink20.UTM_DATA_AVAIL_FLAGS_UAS_ID_AVAILABLE = 2 // The field uas_id contains valid data.
mavlink20.UTM_DATA_AVAIL_FLAGS_POSITION_AVAILABLE = 4 // The fields lat, lon and h_acc contain valid data.
mavlink20.UTM_DATA_AVAIL_FLAGS_ALTITUDE_AVAILABLE = 8 // The fields alt and v_acc contain valid data.
mavlink20.UTM_DATA_AVAIL_FLAGS_RELATIVE_ALTITUDE_AVAILABLE = 16 // The field relative_alt contains valid data.
mavlink20.UTM_DATA_AVAIL_FLAGS_HORIZONTAL_VELO_AVAILABLE = 32 // The fields vx and vy contain valid data.
mavlink20.UTM_DATA_AVAIL_FLAGS_VERTICAL_VELO_AVAILABLE = 64 // The field vz contains valid data.
mavlink20.UTM_DATA_AVAIL_FLAGS_NEXT_WAYPOINT_AVAILABLE = 128 // The fields next_lat, next_lon and next_alt contain valid data.
mavlink20.UTM_DATA_AVAIL_FLAGS_ENUM_END = 129 // 

// CELLULAR_STATUS_FLAG
mavlink20.CELLULAR_STATUS_FLAG_UNKNOWN = 0 // State unknown or not reportable.
mavlink20.CELLULAR_STATUS_FLAG_FAILED = 1 // Modem is unusable
mavlink20.CELLULAR_STATUS_FLAG_INITIALIZING = 2 // Modem is being initialized
mavlink20.CELLULAR_STATUS_FLAG_LOCKED = 3 // Modem is locked
mavlink20.CELLULAR_STATUS_FLAG_DISABLED = 4 // Modem is not enabled and is powered down
mavlink20.CELLULAR_STATUS_FLAG_DISABLING = 5 // Modem is currently transitioning to the CELLULAR_STATUS_FLAG_DISABLED
                        // state
mavlink20.CELLULAR_STATUS_FLAG_ENABLING = 6 // Modem is currently transitioning to the CELLULAR_STATUS_FLAG_ENABLED
                        // state
mavlink20.CELLULAR_STATUS_FLAG_ENABLED = 7 // Modem is enabled and powered on but not registered with a network
                        // provider and not available for data
                        // connections
mavlink20.CELLULAR_STATUS_FLAG_SEARCHING = 8 // Modem is searching for a network provider to register
mavlink20.CELLULAR_STATUS_FLAG_REGISTERED = 9 // Modem is registered with a network provider, and data connections and
                        // messaging may be available for use
mavlink20.CELLULAR_STATUS_FLAG_DISCONNECTING = 10 // Modem is disconnecting and deactivating the last active packet data
                        // bearer. This state will not be entered if
                        // more than one packet data bearer is active
                        // and one of the active bearers is
                        // deactivated
mavlink20.CELLULAR_STATUS_FLAG_CONNECTING = 11 // Modem is activating and connecting the first packet data bearer.
                        // Subsequent bearer activations when another
                        // bearer is already active do not cause this
                        // state to be entered
mavlink20.CELLULAR_STATUS_FLAG_CONNECTED = 12 // One or more packet data bearers is active and connected
mavlink20.CELLULAR_STATUS_FLAG_ENUM_END = 13 // 

// CELLULAR_NETWORK_FAILED_REASON
mavlink20.CELLULAR_NETWORK_FAILED_REASON_NONE = 0 // No error
mavlink20.CELLULAR_NETWORK_FAILED_REASON_UNKNOWN = 1 // Error state is unknown
mavlink20.CELLULAR_NETWORK_FAILED_REASON_SIM_MISSING = 2 // SIM is required for the modem but missing
mavlink20.CELLULAR_NETWORK_FAILED_REASON_SIM_ERROR = 3 // SIM is available, but not usable for connection
mavlink20.CELLULAR_NETWORK_FAILED_REASON_ENUM_END = 4 // 

// CELLULAR_NETWORK_RADIO_TYPE
mavlink20.CELLULAR_NETWORK_RADIO_TYPE_NONE = 0 // 
mavlink20.CELLULAR_NETWORK_RADIO_TYPE_GSM = 1 // 
mavlink20.CELLULAR_NETWORK_RADIO_TYPE_CDMA = 2 // 
mavlink20.CELLULAR_NETWORK_RADIO_TYPE_WCDMA = 3 // 
mavlink20.CELLULAR_NETWORK_RADIO_TYPE_LTE = 4 // 
mavlink20.CELLULAR_NETWORK_RADIO_TYPE_ENUM_END = 5 // 

// PRECISION_LAND_MODE
mavlink20.PRECISION_LAND_MODE_DISABLED = 0 // Normal (non-precision) landing.
mavlink20.PRECISION_LAND_MODE_OPPORTUNISTIC = 1 // Use precision landing if beacon detected when land command accepted,
                        // otherwise land normally.
mavlink20.PRECISION_LAND_MODE_REQUIRED = 2 // Use precision landing, searching for beacon if not found when land
                        // command accepted (land normally if beacon
                        // cannot be found).
mavlink20.PRECISION_LAND_MODE_ENUM_END = 3 // 

// PARACHUTE_ACTION
mavlink20.PARACHUTE_DISABLE = 0 // Disable auto-release of parachute (i.e. release triggered by crash
                        // detectors).
mavlink20.PARACHUTE_ENABLE = 1 // Enable auto-release of parachute.
mavlink20.PARACHUTE_RELEASE = 2 // Release parachute and kill motors.
mavlink20.PARACHUTE_ACTION_ENUM_END = 3 // 

// MAV_TUNNEL_PAYLOAD_TYPE
mavlink20.MAV_TUNNEL_PAYLOAD_TYPE_UNKNOWN = 0 // Encoding of payload unknown.
mavlink20.MAV_TUNNEL_PAYLOAD_TYPE_STORM32_RESERVED0 = 200 // Registered for STorM32 gimbal controller.
mavlink20.MAV_TUNNEL_PAYLOAD_TYPE_STORM32_RESERVED1 = 201 // Registered for STorM32 gimbal controller.
mavlink20.MAV_TUNNEL_PAYLOAD_TYPE_STORM32_RESERVED2 = 202 // Registered for STorM32 gimbal controller.
mavlink20.MAV_TUNNEL_PAYLOAD_TYPE_STORM32_RESERVED3 = 203 // Registered for STorM32 gimbal controller.
mavlink20.MAV_TUNNEL_PAYLOAD_TYPE_STORM32_RESERVED4 = 204 // Registered for STorM32 gimbal controller.
mavlink20.MAV_TUNNEL_PAYLOAD_TYPE_STORM32_RESERVED5 = 205 // Registered for STorM32 gimbal controller.
mavlink20.MAV_TUNNEL_PAYLOAD_TYPE_STORM32_RESERVED6 = 206 // Registered for STorM32 gimbal controller.
mavlink20.MAV_TUNNEL_PAYLOAD_TYPE_STORM32_RESERVED7 = 207 // Registered for STorM32 gimbal controller.
mavlink20.MAV_TUNNEL_PAYLOAD_TYPE_STORM32_RESERVED8 = 208 // Registered for STorM32 gimbal controller.
mavlink20.MAV_TUNNEL_PAYLOAD_TYPE_STORM32_RESERVED9 = 209 // Registered for STorM32 gimbal controller.
mavlink20.MAV_TUNNEL_PAYLOAD_TYPE_MODALAI_REMOTE_OSD = 210 // Registered for ModalAI remote OSD protocol.
mavlink20.MAV_TUNNEL_PAYLOAD_TYPE_MODALAI_ESC_UART_PASSTHRU = 211 // Registered for ModalAI ESC UART passthru protocol.
mavlink20.MAV_TUNNEL_PAYLOAD_TYPE_MODALAI_IO_UART_PASSTHRU = 212 // Registered for ModalAI vendor use.
mavlink20.MAV_TUNNEL_PAYLOAD_TYPE_ENUM_END = 213 // 

// MAV_ODID_ID_TYPE
mavlink20.MAV_ODID_ID_TYPE_NONE = 0 // No type defined.
mavlink20.MAV_ODID_ID_TYPE_SERIAL_NUMBER = 1 // Manufacturer Serial Number (ANSI/CTA-2063 format).
mavlink20.MAV_ODID_ID_TYPE_CAA_REGISTRATION_ID = 2 // CAA (Civil Aviation Authority) registered ID. Format: [ICAO Country
                        // Code].[CAA Assigned ID].
mavlink20.MAV_ODID_ID_TYPE_UTM_ASSIGNED_UUID = 3 // UTM (Unmanned Traffic Management) assigned UUID (RFC4122).
mavlink20.MAV_ODID_ID_TYPE_SPECIFIC_SESSION_ID = 4 // A 20 byte ID for a specific flight/session. The exact ID type is
                        // indicated by the first byte of uas_id and
                        // these type values are managed by ICAO.
mavlink20.MAV_ODID_ID_TYPE_ENUM_END = 5 // 

// MAV_ODID_UA_TYPE
mavlink20.MAV_ODID_UA_TYPE_NONE = 0 // No UA (Unmanned Aircraft) type defined.
mavlink20.MAV_ODID_UA_TYPE_AEROPLANE = 1 // Aeroplane/Airplane. Fixed wing.
mavlink20.MAV_ODID_UA_TYPE_HELICOPTER_OR_MULTIROTOR = 2 // Helicopter or multirotor.
mavlink20.MAV_ODID_UA_TYPE_GYROPLANE = 3 // Gyroplane.
mavlink20.MAV_ODID_UA_TYPE_HYBRID_LIFT = 4 // VTOL (Vertical Take-Off and Landing). Fixed wing aircraft that can
                        // take off vertically.
mavlink20.MAV_ODID_UA_TYPE_ORNITHOPTER = 5 // Ornithopter.
mavlink20.MAV_ODID_UA_TYPE_GLIDER = 6 // Glider.
mavlink20.MAV_ODID_UA_TYPE_KITE = 7 // Kite.
mavlink20.MAV_ODID_UA_TYPE_FREE_BALLOON = 8 // Free Balloon.
mavlink20.MAV_ODID_UA_TYPE_CAPTIVE_BALLOON = 9 // Captive Balloon.
mavlink20.MAV_ODID_UA_TYPE_AIRSHIP = 10 // Airship. E.g. a blimp.
mavlink20.MAV_ODID_UA_TYPE_FREE_FALL_PARACHUTE = 11 // Free Fall/Parachute (unpowered).
mavlink20.MAV_ODID_UA_TYPE_ROCKET = 12 // Rocket.
mavlink20.MAV_ODID_UA_TYPE_TETHERED_POWERED_AIRCRAFT = 13 // Tethered powered aircraft.
mavlink20.MAV_ODID_UA_TYPE_GROUND_OBSTACLE = 14 // Ground Obstacle.
mavlink20.MAV_ODID_UA_TYPE_OTHER = 15 // Other type of aircraft not listed earlier.
mavlink20.MAV_ODID_UA_TYPE_ENUM_END = 16 // 

// MAV_ODID_STATUS
mavlink20.MAV_ODID_STATUS_UNDECLARED = 0 // The status of the (UA) Unmanned Aircraft is undefined.
mavlink20.MAV_ODID_STATUS_GROUND = 1 // The UA is on the ground.
mavlink20.MAV_ODID_STATUS_AIRBORNE = 2 // The UA is in the air.
mavlink20.MAV_ODID_STATUS_EMERGENCY = 3 // The UA is having an emergency.
mavlink20.MAV_ODID_STATUS_REMOTE_ID_SYSTEM_FAILURE = 4 // The remote ID system is failing or unreliable in some way.
mavlink20.MAV_ODID_STATUS_ENUM_END = 5 // 

// MAV_ODID_HEIGHT_REF
mavlink20.MAV_ODID_HEIGHT_REF_OVER_TAKEOFF = 0 // The height field is relative to the take-off location.
mavlink20.MAV_ODID_HEIGHT_REF_OVER_GROUND = 1 // The height field is relative to ground.
mavlink20.MAV_ODID_HEIGHT_REF_ENUM_END = 2 // 

// MAV_ODID_HOR_ACC
mavlink20.MAV_ODID_HOR_ACC_UNKNOWN = 0 // The horizontal accuracy is unknown.
mavlink20.MAV_ODID_HOR_ACC_10NM = 1 // The horizontal accuracy is smaller than 10 Nautical Miles. 18.52 km.
mavlink20.MAV_ODID_HOR_ACC_4NM = 2 // The horizontal accuracy is smaller than 4 Nautical Miles. 7.408 km.
mavlink20.MAV_ODID_HOR_ACC_2NM = 3 // The horizontal accuracy is smaller than 2 Nautical Miles. 3.704 km.
mavlink20.MAV_ODID_HOR_ACC_1NM = 4 // The horizontal accuracy is smaller than 1 Nautical Miles. 1.852 km.
mavlink20.MAV_ODID_HOR_ACC_0_5NM = 5 // The horizontal accuracy is smaller than 0.5 Nautical Miles. 926 m.
mavlink20.MAV_ODID_HOR_ACC_0_3NM = 6 // The horizontal accuracy is smaller than 0.3 Nautical Miles. 555.6 m.
mavlink20.MAV_ODID_HOR_ACC_0_1NM = 7 // The horizontal accuracy is smaller than 0.1 Nautical Miles. 185.2 m.
mavlink20.MAV_ODID_HOR_ACC_0_05NM = 8 // The horizontal accuracy is smaller than 0.05 Nautical Miles. 92.6 m.
mavlink20.MAV_ODID_HOR_ACC_30_METER = 9 // The horizontal accuracy is smaller than 30 meter.
mavlink20.MAV_ODID_HOR_ACC_10_METER = 10 // The horizontal accuracy is smaller than 10 meter.
mavlink20.MAV_ODID_HOR_ACC_3_METER = 11 // The horizontal accuracy is smaller than 3 meter.
mavlink20.MAV_ODID_HOR_ACC_1_METER = 12 // The horizontal accuracy is smaller than 1 meter.
mavlink20.MAV_ODID_HOR_ACC_ENUM_END = 13 // 

// MAV_ODID_VER_ACC
mavlink20.MAV_ODID_VER_ACC_UNKNOWN = 0 // The vertical accuracy is unknown.
mavlink20.MAV_ODID_VER_ACC_150_METER = 1 // The vertical accuracy is smaller than 150 meter.
mavlink20.MAV_ODID_VER_ACC_45_METER = 2 // The vertical accuracy is smaller than 45 meter.
mavlink20.MAV_ODID_VER_ACC_25_METER = 3 // The vertical accuracy is smaller than 25 meter.
mavlink20.MAV_ODID_VER_ACC_10_METER = 4 // The vertical accuracy is smaller than 10 meter.
mavlink20.MAV_ODID_VER_ACC_3_METER = 5 // The vertical accuracy is smaller than 3 meter.
mavlink20.MAV_ODID_VER_ACC_1_METER = 6 // The vertical accuracy is smaller than 1 meter.
mavlink20.MAV_ODID_VER_ACC_ENUM_END = 7 // 

// MAV_ODID_SPEED_ACC
mavlink20.MAV_ODID_SPEED_ACC_UNKNOWN = 0 // The speed accuracy is unknown.
mavlink20.MAV_ODID_SPEED_ACC_10_METERS_PER_SECOND = 1 // The speed accuracy is smaller than 10 meters per second.
mavlink20.MAV_ODID_SPEED_ACC_3_METERS_PER_SECOND = 2 // The speed accuracy is smaller than 3 meters per second.
mavlink20.MAV_ODID_SPEED_ACC_1_METERS_PER_SECOND = 3 // The speed accuracy is smaller than 1 meters per second.
mavlink20.MAV_ODID_SPEED_ACC_0_3_METERS_PER_SECOND = 4 // The speed accuracy is smaller than 0.3 meters per second.
mavlink20.MAV_ODID_SPEED_ACC_ENUM_END = 5 // 

// MAV_ODID_TIME_ACC
mavlink20.MAV_ODID_TIME_ACC_UNKNOWN = 0 // The timestamp accuracy is unknown.
mavlink20.MAV_ODID_TIME_ACC_0_1_SECOND = 1 // The timestamp accuracy is smaller than or equal to 0.1 second.
mavlink20.MAV_ODID_TIME_ACC_0_2_SECOND = 2 // The timestamp accuracy is smaller than or equal to 0.2 second.
mavlink20.MAV_ODID_TIME_ACC_0_3_SECOND = 3 // The timestamp accuracy is smaller than or equal to 0.3 second.
mavlink20.MAV_ODID_TIME_ACC_0_4_SECOND = 4 // The timestamp accuracy is smaller than or equal to 0.4 second.
mavlink20.MAV_ODID_TIME_ACC_0_5_SECOND = 5 // The timestamp accuracy is smaller than or equal to 0.5 second.
mavlink20.MAV_ODID_TIME_ACC_0_6_SECOND = 6 // The timestamp accuracy is smaller than or equal to 0.6 second.
mavlink20.MAV_ODID_TIME_ACC_0_7_SECOND = 7 // The timestamp accuracy is smaller than or equal to 0.7 second.
mavlink20.MAV_ODID_TIME_ACC_0_8_SECOND = 8 // The timestamp accuracy is smaller than or equal to 0.8 second.
mavlink20.MAV_ODID_TIME_ACC_0_9_SECOND = 9 // The timestamp accuracy is smaller than or equal to 0.9 second.
mavlink20.MAV_ODID_TIME_ACC_1_0_SECOND = 10 // The timestamp accuracy is smaller than or equal to 1.0 second.
mavlink20.MAV_ODID_TIME_ACC_1_1_SECOND = 11 // The timestamp accuracy is smaller than or equal to 1.1 second.
mavlink20.MAV_ODID_TIME_ACC_1_2_SECOND = 12 // The timestamp accuracy is smaller than or equal to 1.2 second.
mavlink20.MAV_ODID_TIME_ACC_1_3_SECOND = 13 // The timestamp accuracy is smaller than or equal to 1.3 second.
mavlink20.MAV_ODID_TIME_ACC_1_4_SECOND = 14 // The timestamp accuracy is smaller than or equal to 1.4 second.
mavlink20.MAV_ODID_TIME_ACC_1_5_SECOND = 15 // The timestamp accuracy is smaller than or equal to 1.5 second.
mavlink20.MAV_ODID_TIME_ACC_ENUM_END = 16 // 

// MAV_ODID_AUTH_TYPE
mavlink20.MAV_ODID_AUTH_TYPE_NONE = 0 // No authentication type is specified.
mavlink20.MAV_ODID_AUTH_TYPE_UAS_ID_SIGNATURE = 1 // Signature for the UAS (Unmanned Aircraft System) ID.
mavlink20.MAV_ODID_AUTH_TYPE_OPERATOR_ID_SIGNATURE = 2 // Signature for the Operator ID.
mavlink20.MAV_ODID_AUTH_TYPE_MESSAGE_SET_SIGNATURE = 3 // Signature for the entire message set.
mavlink20.MAV_ODID_AUTH_TYPE_NETWORK_REMOTE_ID = 4 // Authentication is provided by Network Remote ID.
mavlink20.MAV_ODID_AUTH_TYPE_SPECIFIC_AUTHENTICATION = 5 // The exact authentication type is indicated by the first byte of
                        // authentication_data and these type values
                        // are managed by ICAO.
mavlink20.MAV_ODID_AUTH_TYPE_ENUM_END = 6 // 

// MAV_ODID_DESC_TYPE
mavlink20.MAV_ODID_DESC_TYPE_TEXT = 0 // Optional free-form text description of the purpose of the flight.
mavlink20.MAV_ODID_DESC_TYPE_EMERGENCY = 1 // Optional additional clarification when status ==
                        // MAV_ODID_STATUS_EMERGENCY.
mavlink20.MAV_ODID_DESC_TYPE_EXTENDED_STATUS = 2 // Optional additional clarification when status !=
                        // MAV_ODID_STATUS_EMERGENCY.
mavlink20.MAV_ODID_DESC_TYPE_ENUM_END = 3 // 

// MAV_ODID_OPERATOR_LOCATION_TYPE
mavlink20.MAV_ODID_OPERATOR_LOCATION_TYPE_TAKEOFF = 0 // The location/altitude of the operator is the same as the take-off
                        // location.
mavlink20.MAV_ODID_OPERATOR_LOCATION_TYPE_LIVE_GNSS = 1 // The location/altitude of the operator is dynamic. E.g. based on live
                        // GNSS data.
mavlink20.MAV_ODID_OPERATOR_LOCATION_TYPE_FIXED = 2 // The location/altitude of the operator are fixed values.
mavlink20.MAV_ODID_OPERATOR_LOCATION_TYPE_ENUM_END = 3 // 

// MAV_ODID_CLASSIFICATION_TYPE
mavlink20.MAV_ODID_CLASSIFICATION_TYPE_UNDECLARED = 0 // The classification type for the UA is undeclared.
mavlink20.MAV_ODID_CLASSIFICATION_TYPE_EU = 1 // The classification type for the UA follows EU (European Union)
                        // specifications.
mavlink20.MAV_ODID_CLASSIFICATION_TYPE_ENUM_END = 2 // 

// MAV_ODID_CATEGORY_EU
mavlink20.MAV_ODID_CATEGORY_EU_UNDECLARED = 0 // The category for the UA, according to the EU specification, is
                        // undeclared.
mavlink20.MAV_ODID_CATEGORY_EU_OPEN = 1 // The category for the UA, according to the EU specification, is the
                        // Open category.
mavlink20.MAV_ODID_CATEGORY_EU_SPECIFIC = 2 // The category for the UA, according to the EU specification, is the
                        // Specific category.
mavlink20.MAV_ODID_CATEGORY_EU_CERTIFIED = 3 // The category for the UA, according to the EU specification, is the
                        // Certified category.
mavlink20.MAV_ODID_CATEGORY_EU_ENUM_END = 4 // 

// MAV_ODID_CLASS_EU
mavlink20.MAV_ODID_CLASS_EU_UNDECLARED = 0 // The class for the UA, according to the EU specification, is
                        // undeclared.
mavlink20.MAV_ODID_CLASS_EU_CLASS_0 = 1 // The class for the UA, according to the EU specification, is Class 0.
mavlink20.MAV_ODID_CLASS_EU_CLASS_1 = 2 // The class for the UA, according to the EU specification, is Class 1.
mavlink20.MAV_ODID_CLASS_EU_CLASS_2 = 3 // The class for the UA, according to the EU specification, is Class 2.
mavlink20.MAV_ODID_CLASS_EU_CLASS_3 = 4 // The class for the UA, according to the EU specification, is Class 3.
mavlink20.MAV_ODID_CLASS_EU_CLASS_4 = 5 // The class for the UA, according to the EU specification, is Class 4.
mavlink20.MAV_ODID_CLASS_EU_CLASS_5 = 6 // The class for the UA, according to the EU specification, is Class 5.
mavlink20.MAV_ODID_CLASS_EU_CLASS_6 = 7 // The class for the UA, according to the EU specification, is Class 6.
mavlink20.MAV_ODID_CLASS_EU_ENUM_END = 8 // 

// MAV_ODID_OPERATOR_ID_TYPE
mavlink20.MAV_ODID_OPERATOR_ID_TYPE_CAA = 0 // CAA (Civil Aviation Authority) registered operator ID.
mavlink20.MAV_ODID_OPERATOR_ID_TYPE_ENUM_END = 1 // 

// MAV_ODID_ARM_STATUS
mavlink20.MAV_ODID_ARM_STATUS_GOOD_TO_ARM = 0 // Passing arming checks.
mavlink20.MAV_ODID_ARM_STATUS_PRE_ARM_FAIL_GENERIC = 1 // Generic arming failure, see error string for details.
mavlink20.MAV_ODID_ARM_STATUS_ENUM_END = 2 // 

// TUNE_FORMAT
mavlink20.TUNE_FORMAT_QBASIC1_1 = 1 // Format is QBasic 1.1 Play:
                        // https://www.qbasic.net/en/reference/qb11/St
                        // atement/PLAY-006.htm.
mavlink20.TUNE_FORMAT_MML_MODERN = 2 // Format is Modern Music Markup Language (MML):
                        // https://en.wikipedia.org/wiki/Music_Macro_L
                        // anguage#Modern_MML.
mavlink20.TUNE_FORMAT_ENUM_END = 3 // 

// AIS_TYPE
mavlink20.AIS_TYPE_UNKNOWN = 0 // Not available (default).
mavlink20.AIS_TYPE_RESERVED_1 = 1 // 
mavlink20.AIS_TYPE_RESERVED_2 = 2 // 
mavlink20.AIS_TYPE_RESERVED_3 = 3 // 
mavlink20.AIS_TYPE_RESERVED_4 = 4 // 
mavlink20.AIS_TYPE_RESERVED_5 = 5 // 
mavlink20.AIS_TYPE_RESERVED_6 = 6 // 
mavlink20.AIS_TYPE_RESERVED_7 = 7 // 
mavlink20.AIS_TYPE_RESERVED_8 = 8 // 
mavlink20.AIS_TYPE_RESERVED_9 = 9 // 
mavlink20.AIS_TYPE_RESERVED_10 = 10 // 
mavlink20.AIS_TYPE_RESERVED_11 = 11 // 
mavlink20.AIS_TYPE_RESERVED_12 = 12 // 
mavlink20.AIS_TYPE_RESERVED_13 = 13 // 
mavlink20.AIS_TYPE_RESERVED_14 = 14 // 
mavlink20.AIS_TYPE_RESERVED_15 = 15 // 
mavlink20.AIS_TYPE_RESERVED_16 = 16 // 
mavlink20.AIS_TYPE_RESERVED_17 = 17 // 
mavlink20.AIS_TYPE_RESERVED_18 = 18 // 
mavlink20.AIS_TYPE_RESERVED_19 = 19 // 
mavlink20.AIS_TYPE_WIG = 20 // Wing In Ground effect.
mavlink20.AIS_TYPE_WIG_HAZARDOUS_A = 21 // 
mavlink20.AIS_TYPE_WIG_HAZARDOUS_B = 22 // 
mavlink20.AIS_TYPE_WIG_HAZARDOUS_C = 23 // 
mavlink20.AIS_TYPE_WIG_HAZARDOUS_D = 24 // 
mavlink20.AIS_TYPE_WIG_RESERVED_1 = 25 // 
mavlink20.AIS_TYPE_WIG_RESERVED_2 = 26 // 
mavlink20.AIS_TYPE_WIG_RESERVED_3 = 27 // 
mavlink20.AIS_TYPE_WIG_RESERVED_4 = 28 // 
mavlink20.AIS_TYPE_WIG_RESERVED_5 = 29 // 
mavlink20.AIS_TYPE_FISHING = 30 // 
mavlink20.AIS_TYPE_TOWING = 31 // 
mavlink20.AIS_TYPE_TOWING_LARGE = 32 // Towing: length exceeds 200m or breadth exceeds 25m.
mavlink20.AIS_TYPE_DREDGING = 33 // Dredging or other underwater ops.
mavlink20.AIS_TYPE_DIVING = 34 // 
mavlink20.AIS_TYPE_MILITARY = 35 // 
mavlink20.AIS_TYPE_SAILING = 36 // 
mavlink20.AIS_TYPE_PLEASURE = 37 // 
mavlink20.AIS_TYPE_RESERVED_20 = 38 // 
mavlink20.AIS_TYPE_RESERVED_21 = 39 // 
mavlink20.AIS_TYPE_HSC = 40 // High Speed Craft.
mavlink20.AIS_TYPE_HSC_HAZARDOUS_A = 41 // 
mavlink20.AIS_TYPE_HSC_HAZARDOUS_B = 42 // 
mavlink20.AIS_TYPE_HSC_HAZARDOUS_C = 43 // 
mavlink20.AIS_TYPE_HSC_HAZARDOUS_D = 44 // 
mavlink20.AIS_TYPE_HSC_RESERVED_1 = 45 // 
mavlink20.AIS_TYPE_HSC_RESERVED_2 = 46 // 
mavlink20.AIS_TYPE_HSC_RESERVED_3 = 47 // 
mavlink20.AIS_TYPE_HSC_RESERVED_4 = 48 // 
mavlink20.AIS_TYPE_HSC_UNKNOWN = 49 // 
mavlink20.AIS_TYPE_PILOT = 50 // 
mavlink20.AIS_TYPE_SAR = 51 // Search And Rescue vessel.
mavlink20.AIS_TYPE_TUG = 52 // 
mavlink20.AIS_TYPE_PORT_TENDER = 53 // 
mavlink20.AIS_TYPE_ANTI_POLLUTION = 54 // Anti-pollution equipment.
mavlink20.AIS_TYPE_LAW_ENFORCEMENT = 55 // 
mavlink20.AIS_TYPE_SPARE_LOCAL_1 = 56 // 
mavlink20.AIS_TYPE_SPARE_LOCAL_2 = 57 // 
mavlink20.AIS_TYPE_MEDICAL_TRANSPORT = 58 // 
mavlink20.AIS_TYPE_NONECOMBATANT = 59 // Noncombatant ship according to RR Resolution No. 18.
mavlink20.AIS_TYPE_PASSENGER = 60 // 
mavlink20.AIS_TYPE_PASSENGER_HAZARDOUS_A = 61 // 
mavlink20.AIS_TYPE_PASSENGER_HAZARDOUS_B = 62 // 
mavlink20.AIS_TYPE_PASSENGER_HAZARDOUS_C = 63 // 
mavlink20.AIS_TYPE_PASSENGER_HAZARDOUS_D = 64 // 
mavlink20.AIS_TYPE_PASSENGER_RESERVED_1 = 65 // 
mavlink20.AIS_TYPE_PASSENGER_RESERVED_2 = 66 // 
mavlink20.AIS_TYPE_PASSENGER_RESERVED_3 = 67 // 
mavlink20.AIS_TYPE_PASSENGER_RESERVED_4 = 68 // 
mavlink20.AIS_TYPE_PASSENGER_UNKNOWN = 69 // 
mavlink20.AIS_TYPE_CARGO = 70 // 
mavlink20.AIS_TYPE_CARGO_HAZARDOUS_A = 71 // 
mavlink20.AIS_TYPE_CARGO_HAZARDOUS_B = 72 // 
mavlink20.AIS_TYPE_CARGO_HAZARDOUS_C = 73 // 
mavlink20.AIS_TYPE_CARGO_HAZARDOUS_D = 74 // 
mavlink20.AIS_TYPE_CARGO_RESERVED_1 = 75 // 
mavlink20.AIS_TYPE_CARGO_RESERVED_2 = 76 // 
mavlink20.AIS_TYPE_CARGO_RESERVED_3 = 77 // 
mavlink20.AIS_TYPE_CARGO_RESERVED_4 = 78 // 
mavlink20.AIS_TYPE_CARGO_UNKNOWN = 79 // 
mavlink20.AIS_TYPE_TANKER = 80 // 
mavlink20.AIS_TYPE_TANKER_HAZARDOUS_A = 81 // 
mavlink20.AIS_TYPE_TANKER_HAZARDOUS_B = 82 // 
mavlink20.AIS_TYPE_TANKER_HAZARDOUS_C = 83 // 
mavlink20.AIS_TYPE_TANKER_HAZARDOUS_D = 84 // 
mavlink20.AIS_TYPE_TANKER_RESERVED_1 = 85 // 
mavlink20.AIS_TYPE_TANKER_RESERVED_2 = 86 // 
mavlink20.AIS_TYPE_TANKER_RESERVED_3 = 87 // 
mavlink20.AIS_TYPE_TANKER_RESERVED_4 = 88 // 
mavlink20.AIS_TYPE_TANKER_UNKNOWN = 89 // 
mavlink20.AIS_TYPE_OTHER = 90 // 
mavlink20.AIS_TYPE_OTHER_HAZARDOUS_A = 91 // 
mavlink20.AIS_TYPE_OTHER_HAZARDOUS_B = 92 // 
mavlink20.AIS_TYPE_OTHER_HAZARDOUS_C = 93 // 
mavlink20.AIS_TYPE_OTHER_HAZARDOUS_D = 94 // 
mavlink20.AIS_TYPE_OTHER_RESERVED_1 = 95 // 
mavlink20.AIS_TYPE_OTHER_RESERVED_2 = 96 // 
mavlink20.AIS_TYPE_OTHER_RESERVED_3 = 97 // 
mavlink20.AIS_TYPE_OTHER_RESERVED_4 = 98 // 
mavlink20.AIS_TYPE_OTHER_UNKNOWN = 99 // 
mavlink20.AIS_TYPE_ENUM_END = 100 // 

// AIS_NAV_STATUS
mavlink20.AIS_NAV_STATUS_UNDER_WAY = 0 // Under way using engine.
mavlink20.AIS_NAV_STATUS_ANCHORED = 1 // 
mavlink20.AIS_NAV_STATUS_UN_COMMANDED = 2 // 
mavlink20.AIS_NAV_STATUS_RESTRICTED_MANOEUVERABILITY = 3 // 
mavlink20.AIS_NAV_STATUS_DRAUGHT_CONSTRAINED = 4 // 
mavlink20.AIS_NAV_STATUS_MOORED = 5 // 
mavlink20.AIS_NAV_STATUS_AGROUND = 6 // 
mavlink20.AIS_NAV_STATUS_FISHING = 7 // 
mavlink20.AIS_NAV_STATUS_SAILING = 8 // 
mavlink20.AIS_NAV_STATUS_RESERVED_HSC = 9 // 
mavlink20.AIS_NAV_STATUS_RESERVED_WIG = 10 // 
mavlink20.AIS_NAV_STATUS_RESERVED_1 = 11 // 
mavlink20.AIS_NAV_STATUS_RESERVED_2 = 12 // 
mavlink20.AIS_NAV_STATUS_RESERVED_3 = 13 // 
mavlink20.AIS_NAV_STATUS_AIS_SART = 14 // Search And Rescue Transponder.
mavlink20.AIS_NAV_STATUS_UNKNOWN = 15 // Not available (default).
mavlink20.AIS_NAV_STATUS_ENUM_END = 16 // 

// AIS_FLAGS
mavlink20.AIS_FLAGS_POSITION_ACCURACY = 1 // 1 = Position accuracy less than 10m, 0 = position accuracy greater
                        // than 10m.
mavlink20.AIS_FLAGS_VALID_COG = 2 // 
mavlink20.AIS_FLAGS_VALID_VELOCITY = 4 // 
mavlink20.AIS_FLAGS_HIGH_VELOCITY = 8 // 1 = Velocity over 52.5765m/s (102.2 knots)
mavlink20.AIS_FLAGS_VALID_TURN_RATE = 16 // 
mavlink20.AIS_FLAGS_TURN_RATE_SIGN_ONLY = 32 // Only the sign of the returned turn rate value is valid, either greater
                        // than 5deg/30s or less than -5deg/30s
mavlink20.AIS_FLAGS_VALID_DIMENSIONS = 64 // 
mavlink20.AIS_FLAGS_LARGE_BOW_DIMENSION = 128 // Distance to bow is larger than 511m
mavlink20.AIS_FLAGS_LARGE_STERN_DIMENSION = 256 // Distance to stern is larger than 511m
mavlink20.AIS_FLAGS_LARGE_PORT_DIMENSION = 512 // Distance to port side is larger than 63m
mavlink20.AIS_FLAGS_LARGE_STARBOARD_DIMENSION = 1024 // Distance to starboard side is larger than 63m
mavlink20.AIS_FLAGS_VALID_CALLSIGN = 2048 // 
mavlink20.AIS_FLAGS_VALID_NAME = 4096 // 
mavlink20.AIS_FLAGS_ENUM_END = 4097 // 

// FAILURE_UNIT
mavlink20.FAILURE_UNIT_SENSOR_GYRO = 0 // 
mavlink20.FAILURE_UNIT_SENSOR_ACCEL = 1 // 
mavlink20.FAILURE_UNIT_SENSOR_MAG = 2 // 
mavlink20.FAILURE_UNIT_SENSOR_BARO = 3 // 
mavlink20.FAILURE_UNIT_SENSOR_GPS = 4 // 
mavlink20.FAILURE_UNIT_SENSOR_OPTICAL_FLOW = 5 // 
mavlink20.FAILURE_UNIT_SENSOR_VIO = 6 // 
mavlink20.FAILURE_UNIT_SENSOR_DISTANCE_SENSOR = 7 // 
mavlink20.FAILURE_UNIT_SENSOR_AIRSPEED = 8 // 
mavlink20.FAILURE_UNIT_SYSTEM_BATTERY = 100 // 
mavlink20.FAILURE_UNIT_SYSTEM_MOTOR = 101 // 
mavlink20.FAILURE_UNIT_SYSTEM_SERVO = 102 // 
mavlink20.FAILURE_UNIT_SYSTEM_AVOIDANCE = 103 // 
mavlink20.FAILURE_UNIT_SYSTEM_RC_SIGNAL = 104 // 
mavlink20.FAILURE_UNIT_SYSTEM_MAVLINK_SIGNAL = 105 // 
mavlink20.FAILURE_UNIT_ENUM_END = 106 // 

// FAILURE_TYPE
mavlink20.FAILURE_TYPE_OK = 0 // No failure injected, used to reset a previous failure.
mavlink20.FAILURE_TYPE_OFF = 1 // Sets unit off, so completely non-responsive.
mavlink20.FAILURE_TYPE_STUCK = 2 // Unit is stuck e.g. keeps reporting the same value.
mavlink20.FAILURE_TYPE_GARBAGE = 3 // Unit is reporting complete garbage.
mavlink20.FAILURE_TYPE_WRONG = 4 // Unit is consistently wrong.
mavlink20.FAILURE_TYPE_SLOW = 5 // Unit is slow, so e.g. reporting at slower than expected rate.
mavlink20.FAILURE_TYPE_DELAYED = 6 // Data of unit is delayed in time.
mavlink20.FAILURE_TYPE_INTERMITTENT = 7 // Unit is sometimes working, sometimes not.
mavlink20.FAILURE_TYPE_ENUM_END = 8 // 

// NAV_VTOL_LAND_OPTIONS
mavlink20.NAV_VTOL_LAND_OPTIONS_DEFAULT = 0 // Default autopilot landing behaviour.
mavlink20.NAV_VTOL_LAND_OPTIONS_FW_DESCENT = 1 // Descend in fixed wing mode, transitioning to multicopter mode for
                        // vertical landing when close to the ground.
                        // The fixed wing descent pattern is at the
                        // discretion of the vehicle (e.g. transition
                        // altitude, loiter direction, radius, and
                        // speed, etc.).
mavlink20.NAV_VTOL_LAND_OPTIONS_HOVER_DESCENT = 2 // Land in multicopter mode on reaching the landing coordinates (the
                        // whole landing is by "hover descent").
mavlink20.NAV_VTOL_LAND_OPTIONS_ENUM_END = 3 // 

// MAV_WINCH_STATUS_FLAG
mavlink20.MAV_WINCH_STATUS_HEALTHY = 1 // Winch is healthy
mavlink20.MAV_WINCH_STATUS_FULLY_RETRACTED = 2 // Winch line is fully retracted
mavlink20.MAV_WINCH_STATUS_MOVING = 4 // Winch motor is moving
mavlink20.MAV_WINCH_STATUS_CLUTCH_ENGAGED = 8 // Winch clutch is engaged allowing motor to move freely.
mavlink20.MAV_WINCH_STATUS_LOCKED = 16 // Winch is locked by locking mechanism.
mavlink20.MAV_WINCH_STATUS_DROPPING = 32 // Winch is gravity dropping payload.
mavlink20.MAV_WINCH_STATUS_ARRESTING = 64 // Winch is arresting payload descent.
mavlink20.MAV_WINCH_STATUS_GROUND_SENSE = 128 // Winch is using torque measurements to sense the ground.
mavlink20.MAV_WINCH_STATUS_RETRACTING = 256 // Winch is returning to the fully retracted position.
mavlink20.MAV_WINCH_STATUS_REDELIVER = 512 // Winch is redelivering the payload. This is a failover state if the
                        // line tension goes above a threshold during
                        // RETRACTING.
mavlink20.MAV_WINCH_STATUS_ABANDON_LINE = 1024 // Winch is abandoning the line and possibly payload. Winch unspools the
                        // entire calculated line length. This is a
                        // failover state from REDELIVER if the number
                        // of attempts exceeds a threshold.
mavlink20.MAV_WINCH_STATUS_LOCKING = 2048 // Winch is engaging the locking mechanism.
mavlink20.MAV_WINCH_STATUS_LOAD_LINE = 4096 // Winch is spooling on line.
mavlink20.MAV_WINCH_STATUS_LOAD_PAYLOAD = 8192 // Winch is loading a payload.
mavlink20.MAV_WINCH_STATUS_FLAG_ENUM_END = 8193 // 

// MAG_CAL_STATUS
mavlink20.MAG_CAL_NOT_STARTED = 0 // 
mavlink20.MAG_CAL_WAITING_TO_START = 1 // 
mavlink20.MAG_CAL_RUNNING_STEP_ONE = 2 // 
mavlink20.MAG_CAL_RUNNING_STEP_TWO = 3 // 
mavlink20.MAG_CAL_SUCCESS = 4 // 
mavlink20.MAG_CAL_FAILED = 5 // 
mavlink20.MAG_CAL_BAD_ORIENTATION = 6 // 
mavlink20.MAG_CAL_BAD_RADIUS = 7 // 
mavlink20.MAG_CAL_STATUS_ENUM_END = 8 // 

// MAV_EVENT_ERROR_REASON
mavlink20.MAV_EVENT_ERROR_REASON_UNAVAILABLE = 0 // The requested event is not available (anymore).
mavlink20.MAV_EVENT_ERROR_REASON_ENUM_END = 1 // 

// MAV_EVENT_CURRENT_SEQUENCE_FLAGS
mavlink20.MAV_EVENT_CURRENT_SEQUENCE_FLAGS_RESET = 1 // A sequence reset has happened (e.g. vehicle reboot).
mavlink20.MAV_EVENT_CURRENT_SEQUENCE_FLAGS_ENUM_END = 2 // 

// HIL_SENSOR_UPDATED_FLAGS
mavlink20.HIL_SENSOR_UPDATED_XACC = 1 // The value in the xacc field has been updated
mavlink20.HIL_SENSOR_UPDATED_YACC = 2 // The value in the yacc field has been updated
mavlink20.HIL_SENSOR_UPDATED_ZACC = 4 // The value in the zacc field has been updated
mavlink20.HIL_SENSOR_UPDATED_XGYRO = 8 // The value in the xgyro field has been updated
mavlink20.HIL_SENSOR_UPDATED_YGYRO = 16 // The value in the ygyro field has been updated
mavlink20.HIL_SENSOR_UPDATED_ZGYRO = 32 // The value in the zgyro field has been updated
mavlink20.HIL_SENSOR_UPDATED_XMAG = 64 // The value in the xmag field has been updated
mavlink20.HIL_SENSOR_UPDATED_YMAG = 128 // The value in the ymag field has been updated
mavlink20.HIL_SENSOR_UPDATED_ZMAG = 256 // The value in the zmag field has been updated
mavlink20.HIL_SENSOR_UPDATED_ABS_PRESSURE = 512 // The value in the abs_pressure field has been updated
mavlink20.HIL_SENSOR_UPDATED_DIFF_PRESSURE = 1024 // The value in the diff_pressure field has been updated
mavlink20.HIL_SENSOR_UPDATED_PRESSURE_ALT = 2048 // The value in the pressure_alt field has been updated
mavlink20.HIL_SENSOR_UPDATED_TEMPERATURE = 4096 // The value in the temperature field has been updated
mavlink20.HIL_SENSOR_UPDATED_RESET = 2147483648 // Full reset of attitude/position/velocities/etc was performed in sim
                        // (Bit 31).
mavlink20.HIL_SENSOR_UPDATED_FLAGS_ENUM_END = 2147483649 // 

// HIGHRES_IMU_UPDATED_FLAGS
mavlink20.HIGHRES_IMU_UPDATED_XACC = 1 // The value in the xacc field has been updated
mavlink20.HIGHRES_IMU_UPDATED_YACC = 2 // The value in the yacc field has been updated
mavlink20.HIGHRES_IMU_UPDATED_ZACC = 4 // The value in the zacc field has been updated since
mavlink20.HIGHRES_IMU_UPDATED_XGYRO = 8 // The value in the xgyro field has been updated
mavlink20.HIGHRES_IMU_UPDATED_YGYRO = 16 // The value in the ygyro field has been updated
mavlink20.HIGHRES_IMU_UPDATED_ZGYRO = 32 // The value in the zgyro field has been updated
mavlink20.HIGHRES_IMU_UPDATED_XMAG = 64 // The value in the xmag field has been updated
mavlink20.HIGHRES_IMU_UPDATED_YMAG = 128 // The value in the ymag field has been updated
mavlink20.HIGHRES_IMU_UPDATED_ZMAG = 256 // The value in the zmag field has been updated
mavlink20.HIGHRES_IMU_UPDATED_ABS_PRESSURE = 512 // The value in the abs_pressure field has been updated
mavlink20.HIGHRES_IMU_UPDATED_DIFF_PRESSURE = 1024 // The value in the diff_pressure field has been updated
mavlink20.HIGHRES_IMU_UPDATED_PRESSURE_ALT = 2048 // The value in the pressure_alt field has been updated
mavlink20.HIGHRES_IMU_UPDATED_TEMPERATURE = 4096 // The value in the temperature field has been updated
mavlink20.HIGHRES_IMU_UPDATED_FLAGS_ENUM_END = 4097 // 

// CAN_FILTER_OP
mavlink20.CAN_FILTER_REPLACE = 0 // 
mavlink20.CAN_FILTER_ADD = 1 // 
mavlink20.CAN_FILTER_REMOVE = 2 // 
mavlink20.CAN_FILTER_OP_ENUM_END = 3 // 

// MAV_FTP_ERR
mavlink20.MAV_FTP_ERR_NONE = 0 // None: No error
mavlink20.MAV_FTP_ERR_FAIL = 1 // Fail: Unknown failure
mavlink20.MAV_FTP_ERR_FAILERRNO = 2 // FailErrno: Command failed, Err number sent back in
                        // PayloadHeader.data[1].                 This
                        // is a file-system error number understood by
                        // the server operating system.
mavlink20.MAV_FTP_ERR_INVALIDDATASIZE = 3 // InvalidDataSize: Payload size is invalid
mavlink20.MAV_FTP_ERR_INVALIDSESSION = 4 // InvalidSession: Session is not currently open
mavlink20.MAV_FTP_ERR_NOSESSIONSAVAILABLE = 5 // NoSessionsAvailable: All available sessions are already in use
mavlink20.MAV_FTP_ERR_EOF = 6 // EOF: Offset past end of file for ListDirectory and ReadFile commands
mavlink20.MAV_FTP_ERR_UNKNOWNCOMMAND = 7 // UnknownCommand: Unknown command / opcode
mavlink20.MAV_FTP_ERR_FILEEXISTS = 8 // FileExists: File/directory already exists
mavlink20.MAV_FTP_ERR_FILEPROTECTED = 9 // FileProtected: File/directory is write protected
mavlink20.MAV_FTP_ERR_FILENOTFOUND = 10 // FileNotFound: File/directory not found
mavlink20.MAV_FTP_ERR_ENUM_END = 11 // 

// MAV_FTP_OPCODE
mavlink20.MAV_FTP_OPCODE_NONE = 0 // None. Ignored, always ACKed
mavlink20.MAV_FTP_OPCODE_TERMINATESESSION = 1 // TerminateSession: Terminates open Read session
mavlink20.MAV_FTP_OPCODE_RESETSESSION = 2 // ResetSessions: Terminates all open read sessions
mavlink20.MAV_FTP_OPCODE_LISTDIRECTORY = 3 // ListDirectory. List files and directories in path from offset
mavlink20.MAV_FTP_OPCODE_OPENFILERO = 4 // OpenFileRO: Opens file at path for reading, returns session
mavlink20.MAV_FTP_OPCODE_READFILE = 5 // ReadFile: Reads size bytes from offset in session
mavlink20.MAV_FTP_OPCODE_CREATEFILE = 6 // CreateFile: Creates file at path for writing, returns session
mavlink20.MAV_FTP_OPCODE_WRITEFILE = 7 // WriteFile: Writes size bytes to offset in session
mavlink20.MAV_FTP_OPCODE_REMOVEFILE = 8 // RemoveFile: Remove file at path
mavlink20.MAV_FTP_OPCODE_CREATEDIRECTORY = 9 // CreateDirectory: Creates directory at path
mavlink20.MAV_FTP_OPCODE_REMOVEDIRECTORY = 10 // RemoveDirectory: Removes directory at path. The directory must be
                        // empty.
mavlink20.MAV_FTP_OPCODE_OPENFILEWO = 11 // OpenFileWO: Opens file at path for writing, returns session
mavlink20.MAV_FTP_OPCODE_TRUNCATEFILE = 12 // TruncateFile: Truncate file at path to offset length
mavlink20.MAV_FTP_OPCODE_RENAME = 13 // Rename: Rename path1 to path2
mavlink20.MAV_FTP_OPCODE_CALCFILECRC = 14 // CalcFileCRC32: Calculate CRC32 for file at path
mavlink20.MAV_FTP_OPCODE_BURSTREADFILE = 15 // BurstReadFile: Burst download session file
mavlink20.MAV_FTP_OPCODE_ACK = 128 // ACK: ACK response
mavlink20.MAV_FTP_OPCODE_NAK = 129 // NAK: NAK response
mavlink20.MAV_FTP_OPCODE_ENUM_END = 130 // 

// MISSION_STATE
mavlink20.MISSION_STATE_UNKNOWN = 0 // The mission status reporting is not supported.
mavlink20.MISSION_STATE_NO_MISSION = 1 // No mission on the vehicle.
mavlink20.MISSION_STATE_NOT_STARTED = 2 // Mission has not started. This is the case after a mission has uploaded
                        // but not yet started executing.
mavlink20.MISSION_STATE_ACTIVE = 3 // Mission is active, and will execute mission items when in auto mode.
mavlink20.MISSION_STATE_PAUSED = 4 // Mission is paused when in auto mode.
mavlink20.MISSION_STATE_COMPLETE = 5 // Mission has executed all mission items.
mavlink20.MISSION_STATE_ENUM_END = 6 // 

// SAFETY_SWITCH_STATE
mavlink20.SAFETY_SWITCH_STATE_SAFE = 0 // Safety switch is engaged and vehicle should be safe to approach.
mavlink20.SAFETY_SWITCH_STATE_DANGEROUS = 1 // Safety switch is NOT engaged and motors, propellers and other
                        // actuators should be considered active.
mavlink20.SAFETY_SWITCH_STATE_ENUM_END = 2 // 

// ILLUMINATOR_MODE
mavlink20.ILLUMINATOR_MODE_UNKNOWN = 0 // Illuminator mode is not specified/unknown
mavlink20.ILLUMINATOR_MODE_INTERNAL_CONTROL = 1 // Illuminator behavior is controlled by MAV_CMD_DO_ILLUMINATOR_CONFIGURE
                        // settings
mavlink20.ILLUMINATOR_MODE_EXTERNAL_SYNC = 2 // Illuminator behavior is controlled by external factors: e.g. an
                        // external hardware signal
mavlink20.ILLUMINATOR_MODE_ENUM_END = 3 // 

// ILLUMINATOR_ERROR_FLAGS
mavlink20.ILLUMINATOR_ERROR_FLAGS_THERMAL_THROTTLING = 1 // Illuminator thermal throttling error.
mavlink20.ILLUMINATOR_ERROR_FLAGS_OVER_TEMPERATURE_SHUTDOWN = 2 // Illuminator over temperature shutdown error.
mavlink20.ILLUMINATOR_ERROR_FLAGS_THERMISTOR_FAILURE = 4 // Illuminator thermistor failure.
mavlink20.ILLUMINATOR_ERROR_FLAGS_ENUM_END = 5 // 

// MAV_STANDARD_MODE
mavlink20.MAV_STANDARD_MODE_NON_STANDARD = 0 // Non standard mode.           This may be used when reporting the mode
                        // if the current flight mode is not a
                        // standard mode.
mavlink20.MAV_STANDARD_MODE_POSITION_HOLD = 1 // Position mode (manual).           Position-controlled and stabilized
                        // manual mode.           When sticks are
                        // released vehicles return to their level-
                        // flight orientation and hold both position
                        // and altitude against wind and external
                        // forces.           This mode can only be set
                        // by vehicles that can hold a fixed position.
                        // Multicopter (MC) vehicles actively brake
                        // and hold both position and altitude against
                        // wind and external forces.           Hybrid
                        // MC/FW ("VTOL") vehicles first transition to
                        // multicopter mode (if needed) but otherwise
                        // behave in the same way as MC vehicles.
                        // Fixed-wing (FW) vehicles must not support
                        // this mode.           Other vehicle types
                        // must not support this mode (this may be
                        // revisited through the PR process).
mavlink20.MAV_STANDARD_MODE_ORBIT = 2 // Orbit (manual).           Position-controlled and stabilized manual
                        // mode.           The vehicle circles around
                        // a fixed setpoint in the horizontal plane at
                        // a particular radius, altitude, and
                        // direction.           Flight stacks may
                        // further allow manual control over the
                        // setpoint position, radius, direction,
                        // speed, and/or altitude of the circle, but
                        // this is not mandated.           Flight
                        // stacks may support the [MAV_CMD_DO_ORBIT](h
                        // ttps://mavlink.io/en/messages/common.html#M
                        // AV_CMD_DO_ORBIT) for changing the orbit
                        // parameters.           MC and FW vehicles
                        // may support this mode.           Hybrid
                        // MC/FW ("VTOL") vehicles may support this
                        // mode in MC/FW or both modes; if the mode is
                        // not supported by the current configuration
                        // the vehicle should transition to the
                        // supported configuration.           Other
                        // vehicle types must not support this mode
                        // (this may be revisited through the PR
                        // process).
mavlink20.MAV_STANDARD_MODE_CRUISE = 3 // Cruise mode (manual).           Position-controlled and stabilized
                        // manual mode.           When sticks are
                        // released vehicles return to their level-
                        // flight orientation and hold their original
                        // track against wind and external forces.
                        // Fixed-wing (FW) vehicles level orientation
                        // and maintain current track and altitude
                        // against wind and external forces.
                        // Hybrid MC/FW ("VTOL") vehicles first
                        // transition to FW mode (if needed) but
                        // otherwise behave in the same way as MC
                        // vehicles.           Multicopter (MC)
                        // vehicles must not support this mode.
                        // Other vehicle types must not support this
                        // mode (this may be revisited through the PR
                        // process).
mavlink20.MAV_STANDARD_MODE_ALTITUDE_HOLD = 4 // Altitude hold (manual).           Altitude-controlled and stabilized
                        // manual mode.           When sticks are
                        // released vehicles return to their level-
                        // flight orientation and hold their altitude.
                        // MC vehicles continue with existing momentum
                        // and may move with wind (or other external
                        // forces).           FW vehicles continue
                        // with current heading, but may be moved off-
                        // track by wind.           Hybrid MC/FW
                        // ("VTOL") vehicles behave according to their
                        // current configuration/mode (FW or MC).
                        // Other vehicle types must not support this
                        // mode (this may be revisited through the PR
                        // process).
mavlink20.MAV_STANDARD_MODE_SAFE_RECOVERY = 5 // Safe recovery mode (auto).           Automatic mode that takes vehicle
                        // to a predefined safe location via a safe
                        // flight path, and may also automatically
                        // land the vehicle.           This mode is
                        // more commonly referred to as RTL and/or or
                        // Smart RTL.           The precise return
                        // location, flight path, and landing
                        // behaviour depend on vehicle configuration
                        // and type.           For example, the
                        // vehicle might return to the home/launch
                        // location, a rally point, or the start of a
                        // mission landing, it might follow a direct
                        // path, mission path, or breadcrumb path, and
                        // land using a mission landing pattern or
                        // some other kind of descent.
mavlink20.MAV_STANDARD_MODE_MISSION = 6 // Mission mode (automatic).           Automatic mode that executes
                        // MAVLink missions.           Missions are
                        // executed from the current waypoint as soon
                        // as the mode is enabled.
mavlink20.MAV_STANDARD_MODE_LAND = 7 // Land mode (auto).           Automatic mode that lands the vehicle at
                        // the current location.           The precise
                        // landing behaviour depends on vehicle
                        // configuration and type.
mavlink20.MAV_STANDARD_MODE_TAKEOFF = 8 // Takeoff mode (auto).           Automatic takeoff mode.           The
                        // precise takeoff behaviour depends on
                        // vehicle configuration and type.
mavlink20.MAV_STANDARD_MODE_ENUM_END = 9 // 

// MAV_MODE_PROPERTY
mavlink20.MAV_MODE_PROPERTY_ADVANCED = 1 // If set, this mode is an advanced mode.           For example a rate-
                        // controlled manual mode might be advanced,
                        // whereas a position-controlled manual mode
                        // is not.           A GCS can optionally use
                        // this flag to configure the UI for its
                        // intended users.
mavlink20.MAV_MODE_PROPERTY_NOT_USER_SELECTABLE = 2 // If set, this mode should not be added to the list of selectable modes.
                        // The mode might still be selected by the FC
                        // directly (for example as part of a
                        // failsafe).
mavlink20.MAV_MODE_PROPERTY_AUTO_MODE = 4 // If set, this mode is automatically controlled (it may use but does not
                        // require a manual controller).           If
                        // unset the mode is a assumed to require user
                        // input (be a manual mode).
mavlink20.MAV_MODE_PROPERTY_ENUM_END = 5 // 

// HIL_ACTUATOR_CONTROLS_FLAGS
mavlink20.HIL_ACTUATOR_CONTROLS_FLAGS_LOCKSTEP = 1 // Simulation is using lockstep
mavlink20.HIL_ACTUATOR_CONTROLS_FLAGS_ENUM_END = 2 // 

// COMPUTER_STATUS_FLAGS
mavlink20.COMPUTER_STATUS_FLAGS_UNDER_VOLTAGE = 1 // Indicates if the system is experiencing voltage outside of acceptable
                        // range.
mavlink20.COMPUTER_STATUS_FLAGS_CPU_THROTTLE = 2 // Indicates if CPU throttling is active.
mavlink20.COMPUTER_STATUS_FLAGS_THERMAL_THROTTLE = 4 // Indicates if thermal throttling is active.
mavlink20.COMPUTER_STATUS_FLAGS_DISK_FULL = 8 // Indicates if main disk is full.
mavlink20.COMPUTER_STATUS_FLAGS_ENUM_END = 9 // 

// MAV_BOOL
mavlink20.MAV_BOOL_FALSE = 0 // False.
mavlink20.MAV_BOOL_TRUE = 1 // True.
mavlink20.MAV_BOOL_ENUM_END = 2 // 

// MAV_PROTOCOL_CAPABILITY
mavlink20.MAV_PROTOCOL_CAPABILITY_MISSION_FLOAT = 1 // Autopilot supports the MISSION_ITEM float message type.           Note
                        // that MISSION_ITEM is deprecated, and
                        // autopilots should use MISSION_INT instead.
mavlink20.MAV_PROTOCOL_CAPABILITY_PARAM_FLOAT = 2 // Autopilot supports the new param float message type.
mavlink20.MAV_PROTOCOL_CAPABILITY_MISSION_INT = 4 // Autopilot supports MISSION_ITEM_INT scaled integer message type.
                        // Note that this flag must always be set if
                        // missions are supported, because missions
                        // must always use MISSION_ITEM_INT (rather
                        // than MISSION_ITEM, which is deprecated).
mavlink20.MAV_PROTOCOL_CAPABILITY_COMMAND_INT = 8 // Autopilot supports COMMAND_INT scaled integer message type.
mavlink20.MAV_PROTOCOL_CAPABILITY_PARAM_ENCODE_BYTEWISE = 16 // Parameter protocol uses byte-wise encoding of parameter values into
                        // param_value (float) fields: https://mavlink
                        // .io/en/services/parameter.html#parameter-
                        // encoding.           Note that either this
                        // flag or
                        // MAV_PROTOCOL_CAPABILITY_PARAM_ENCODE_C_CAST
                        // should be set if the parameter protocol is
                        // supported.
mavlink20.MAV_PROTOCOL_CAPABILITY_FTP = 32 // Autopilot supports the File Transfer Protocol v1:
                        // https://mavlink.io/en/services/ftp.html.
mavlink20.MAV_PROTOCOL_CAPABILITY_SET_ATTITUDE_TARGET = 64 // Autopilot supports commanding attitude offboard.
mavlink20.MAV_PROTOCOL_CAPABILITY_SET_POSITION_TARGET_LOCAL_NED = 128 // Autopilot supports commanding position and velocity targets in local
                        // NED frame.
mavlink20.MAV_PROTOCOL_CAPABILITY_SET_POSITION_TARGET_GLOBAL_INT = 256 // Autopilot supports commanding position and velocity targets in global
                        // scaled integers.
mavlink20.MAV_PROTOCOL_CAPABILITY_TERRAIN = 512 // Autopilot supports terrain protocol / data handling.
mavlink20.MAV_PROTOCOL_CAPABILITY_RESERVED3 = 1024 // Reserved for future use.
mavlink20.MAV_PROTOCOL_CAPABILITY_FLIGHT_TERMINATION = 2048 // Autopilot supports the MAV_CMD_DO_FLIGHTTERMINATION command (flight
                        // termination).
mavlink20.MAV_PROTOCOL_CAPABILITY_COMPASS_CALIBRATION = 4096 // Autopilot supports onboard compass calibration.
mavlink20.MAV_PROTOCOL_CAPABILITY_MAVLINK2 = 8192 // Autopilot supports MAVLink version 2.
mavlink20.MAV_PROTOCOL_CAPABILITY_MISSION_FENCE = 16384 // Autopilot supports mission fence protocol.
mavlink20.MAV_PROTOCOL_CAPABILITY_MISSION_RALLY = 32768 // Autopilot supports mission rally point protocol.
mavlink20.MAV_PROTOCOL_CAPABILITY_RESERVED2 = 65536 // Reserved for future use.
mavlink20.MAV_PROTOCOL_CAPABILITY_PARAM_ENCODE_C_CAST = 131072 // Parameter protocol uses C-cast of parameter values to set the
                        // param_value (float) fields: https://mavlink
                        // .io/en/services/parameter.html#parameter-
                        // encoding.           Note that either this
                        // flag or MAV_PROTOCOL_CAPABILITY_PARAM_ENCOD
                        // E_BYTEWISE should be set if the parameter
                        // protocol is supported.
mavlink20.MAV_PROTOCOL_CAPABILITY_COMPONENT_IMPLEMENTS_GIMBAL_MANAGER = 262144 // This component implements/is a gimbal manager. This means the
                        // GIMBAL_MANAGER_INFORMATION, and other
                        // messages can be requested.
mavlink20.MAV_PROTOCOL_CAPABILITY_COMPONENT_ACCEPTS_GCS_CONTROL = 524288 // Component supports locking control to a particular GCS independent of
                        // its system (via
                        // MAV_CMD_REQUEST_OPERATOR_CONTROL).
mavlink20.MAV_PROTOCOL_CAPABILITY_GRIPPER = 1048576 // Autopilot has a connected gripper. MAVLink Grippers would set
                        // MAV_TYPE_GRIPPER instead.
mavlink20.MAV_PROTOCOL_CAPABILITY_ENUM_END = 1048577 // 

// FIRMWARE_VERSION_TYPE
mavlink20.FIRMWARE_VERSION_TYPE_DEV = 0 // development release
mavlink20.FIRMWARE_VERSION_TYPE_ALPHA = 64 // alpha release
mavlink20.FIRMWARE_VERSION_TYPE_BETA = 128 // beta release
mavlink20.FIRMWARE_VERSION_TYPE_RC = 192 // release candidate
mavlink20.FIRMWARE_VERSION_TYPE_OFFICIAL = 255 // official stable release
mavlink20.FIRMWARE_VERSION_TYPE_ENUM_END = 256 // 

// MAV_AUTOPILOT
mavlink20.MAV_AUTOPILOT_GENERIC = 0 // Generic autopilot, full support for everything
mavlink20.MAV_AUTOPILOT_RESERVED = 1 // Reserved for future use.
mavlink20.MAV_AUTOPILOT_SLUGS = 2 // SLUGS autopilot, http://slugsuav.soe.ucsc.edu
mavlink20.MAV_AUTOPILOT_ARDUPILOTMEGA = 3 // ArduPilot - Plane/Copter/Rover/Sub/Tracker, https://ardupilot.org
mavlink20.MAV_AUTOPILOT_OPENPILOT = 4 // OpenPilot, http://openpilot.org
mavlink20.MAV_AUTOPILOT_GENERIC_WAYPOINTS_ONLY = 5 // Generic autopilot only supporting simple waypoints
mavlink20.MAV_AUTOPILOT_GENERIC_WAYPOINTS_AND_SIMPLE_NAVIGATION_ONLY = 6 // Generic autopilot supporting waypoints and other simple navigation
                        // commands
mavlink20.MAV_AUTOPILOT_GENERIC_MISSION_FULL = 7 // Generic autopilot supporting the full mission command set
mavlink20.MAV_AUTOPILOT_INVALID = 8 // No valid autopilot, e.g. a GCS or other MAVLink component
mavlink20.MAV_AUTOPILOT_PPZ = 9 // PPZ UAV - http://nongnu.org/paparazzi
mavlink20.MAV_AUTOPILOT_UDB = 10 // UAV Dev Board
mavlink20.MAV_AUTOPILOT_FP = 11 // FlexiPilot
mavlink20.MAV_AUTOPILOT_PX4 = 12 // PX4 Autopilot - http://px4.io/
mavlink20.MAV_AUTOPILOT_SMACCMPILOT = 13 // SMACCMPilot - http://smaccmpilot.org
mavlink20.MAV_AUTOPILOT_AUTOQUAD = 14 // AutoQuad -- http://autoquad.org
mavlink20.MAV_AUTOPILOT_ARMAZILA = 15 // Armazila -- http://armazila.com
mavlink20.MAV_AUTOPILOT_AEROB = 16 // Aerob -- http://aerob.ru
mavlink20.MAV_AUTOPILOT_ASLUAV = 17 // ASLUAV autopilot -- http://www.asl.ethz.ch
mavlink20.MAV_AUTOPILOT_SMARTAP = 18 // SmartAP Autopilot - http://sky-drones.com
mavlink20.MAV_AUTOPILOT_AIRRAILS = 19 // AirRails - http://uaventure.com
mavlink20.MAV_AUTOPILOT_REFLEX = 20 // Fusion Reflex - https://fusion.engineering
mavlink20.MAV_AUTOPILOT_ENUM_END = 21 // 

// MAV_TYPE
mavlink20.MAV_TYPE_GENERIC = 0 // Generic micro air vehicle
mavlink20.MAV_TYPE_FIXED_WING = 1 // Fixed wing aircraft.
mavlink20.MAV_TYPE_QUADROTOR = 2 // Quadrotor
mavlink20.MAV_TYPE_COAXIAL = 3 // Coaxial helicopter
mavlink20.MAV_TYPE_HELICOPTER = 4 // Normal helicopter with tail rotor.
mavlink20.MAV_TYPE_ANTENNA_TRACKER = 5 // Ground installation
mavlink20.MAV_TYPE_GCS = 6 // Operator control unit / ground control station
mavlink20.MAV_TYPE_AIRSHIP = 7 // Airship, controlled
mavlink20.MAV_TYPE_FREE_BALLOON = 8 // Free balloon, uncontrolled
mavlink20.MAV_TYPE_ROCKET = 9 // Rocket
mavlink20.MAV_TYPE_GROUND_ROVER = 10 // Ground rover
mavlink20.MAV_TYPE_SURFACE_BOAT = 11 // Surface vessel, boat, ship
mavlink20.MAV_TYPE_SUBMARINE = 12 // Submarine
mavlink20.MAV_TYPE_HEXAROTOR = 13 // Hexarotor
mavlink20.MAV_TYPE_OCTOROTOR = 14 // Octorotor
mavlink20.MAV_TYPE_TRICOPTER = 15 // Tricopter
mavlink20.MAV_TYPE_FLAPPING_WING = 16 // Flapping wing
mavlink20.MAV_TYPE_KITE = 17 // Kite
mavlink20.MAV_TYPE_ONBOARD_CONTROLLER = 18 // Onboard companion controller
mavlink20.MAV_TYPE_VTOL_TAILSITTER_DUOROTOR = 19 // Two-rotor Tailsitter VTOL that additionally uses control surfaces in
                        // vertical operation. Note, value previously
                        // named MAV_TYPE_VTOL_DUOROTOR.
mavlink20.MAV_TYPE_VTOL_TAILSITTER_QUADROTOR = 20 // Quad-rotor Tailsitter VTOL using a V-shaped quad config in vertical
                        // operation. Note: value previously named
                        // MAV_TYPE_VTOL_QUADROTOR.
mavlink20.MAV_TYPE_VTOL_TILTROTOR = 21 // Tiltrotor VTOL. Fuselage and wings stay (nominally) horizontal in all
                        // flight phases. It able to tilt (some)
                        // rotors to provide thrust in cruise flight.
mavlink20.MAV_TYPE_VTOL_FIXEDROTOR = 22 // VTOL with separate fixed rotors for hover and cruise flight. Fuselage
                        // and wings stay (nominally) horizontal in
                        // all flight phases.
mavlink20.MAV_TYPE_VTOL_TAILSITTER = 23 // Tailsitter VTOL. Fuselage and wings orientation changes depending on
                        // flight phase: vertical for hover,
                        // horizontal for cruise. Use more specific
                        // VTOL MAV_TYPE_VTOL_TAILSITTER_DUOROTOR or
                        // MAV_TYPE_VTOL_TAILSITTER_QUADROTOR if
                        // appropriate.
mavlink20.MAV_TYPE_VTOL_TILTWING = 24 // Tiltwing VTOL. Fuselage stays horizontal in all flight phases. The
                        // whole wing, along with any attached engine,
                        // can tilt between vertical and horizontal
                        // mode.
mavlink20.MAV_TYPE_VTOL_RESERVED5 = 25 // VTOL reserved 5
mavlink20.MAV_TYPE_GIMBAL = 26 // Gimbal
mavlink20.MAV_TYPE_ADSB = 27 // ADSB system
mavlink20.MAV_TYPE_PARAFOIL = 28 // Steerable, nonrigid airfoil
mavlink20.MAV_TYPE_DODECAROTOR = 29 // Dodecarotor
mavlink20.MAV_TYPE_CAMERA = 30 // Camera
mavlink20.MAV_TYPE_CHARGING_STATION = 31 // Charging station
mavlink20.MAV_TYPE_FLARM = 32 // FLARM collision avoidance system
mavlink20.MAV_TYPE_SERVO = 33 // Servo
mavlink20.MAV_TYPE_ODID = 34 // Open Drone ID. See https://mavlink.io/en/services/opendroneid.html.
mavlink20.MAV_TYPE_DECAROTOR = 35 // Decarotor
mavlink20.MAV_TYPE_BATTERY = 36 // Battery
mavlink20.MAV_TYPE_PARACHUTE = 37 // Parachute
mavlink20.MAV_TYPE_LOG = 38 // Log
mavlink20.MAV_TYPE_OSD = 39 // OSD
mavlink20.MAV_TYPE_IMU = 40 // IMU
mavlink20.MAV_TYPE_GPS = 41 // GPS
mavlink20.MAV_TYPE_WINCH = 42 // Winch
mavlink20.MAV_TYPE_GENERIC_MULTIROTOR = 43 // Generic multirotor that does not fit into a specific type or whose
                        // type is unknown
mavlink20.MAV_TYPE_ILLUMINATOR = 44 // Illuminator. An illuminator is a light source that is used for
                        // lighting up dark areas external to the
                        // system: e.g. a torch or searchlight (as
                        // opposed to a light source for illuminating
                        // the system itself, e.g. an indicator
                        // light).
mavlink20.MAV_TYPE_SPACECRAFT_ORBITER = 45 // Orbiter spacecraft. Includes satellites orbiting terrestrial and
                        // extra-terrestrial bodies. Follows NASA
                        // Spacecraft Classification.
mavlink20.MAV_TYPE_GROUND_QUADRUPED = 46 // A generic four-legged ground vehicle (e.g., a robot dog).
mavlink20.MAV_TYPE_VTOL_GYRODYNE = 47 // VTOL hybrid of helicopter and autogyro. It has a main rotor for lift
                        // and separate propellers for forward flight.
                        // The rotor must be powered for hover but can
                        // autorotate in cruise flight. See:
                        // https://en.wikipedia.org/wiki/Gyrodyne
mavlink20.MAV_TYPE_GRIPPER = 48 // Gripper
mavlink20.MAV_TYPE_RADIO = 49 // Radio
mavlink20.MAV_TYPE_ENUM_END = 50 // 

// MAV_MODE_FLAG
mavlink20.MAV_MODE_FLAG_CUSTOM_MODE_ENABLED = 1 // 0b00000001 system-specific custom mode is enabled. When using this
                        // flag to enable a custom mode all other
                        // flags should be ignored.
mavlink20.MAV_MODE_FLAG_TEST_ENABLED = 2 // 0b00000010 system has a test mode enabled. This flag is intended for
                        // temporary system tests and should not be
                        // used for stable implementations.
mavlink20.MAV_MODE_FLAG_AUTO_ENABLED = 4 // 0b00000100 autonomous mode enabled, system finds its own goal
                        // positions. Guided flag can be set or not,
                        // depends on the actual implementation.
mavlink20.MAV_MODE_FLAG_GUIDED_ENABLED = 8 // 0b00001000 guided mode enabled, system flies waypoints / mission
                        // items.
mavlink20.MAV_MODE_FLAG_STABILIZE_ENABLED = 16 // 0b00010000 system stabilizes electronically its attitude (and
                        // optionally position). It needs however
                        // further control inputs to move around.
mavlink20.MAV_MODE_FLAG_HIL_ENABLED = 32 // 0b00100000 hardware in the loop simulation. All motors / actuators are
                        // blocked, but internal software is full
                        // operational.
mavlink20.MAV_MODE_FLAG_MANUAL_INPUT_ENABLED = 64 // 0b01000000 remote control input is enabled.
mavlink20.MAV_MODE_FLAG_SAFETY_ARMED = 128 // 0b10000000 MAV safety set to armed. Motors are enabled / running / can
                        // start. Ready to fly. Additional note: this
                        // flag is to be ignore when sent in the
                        // command MAV_CMD_DO_SET_MODE and
                        // MAV_CMD_COMPONENT_ARM_DISARM shall be used
                        // instead. The flag can still be used to
                        // report the armed state.
mavlink20.MAV_MODE_FLAG_ENUM_END = 129 // 

// MAV_MODE_FLAG_DECODE_POSITION
mavlink20.MAV_MODE_FLAG_DECODE_POSITION_CUSTOM_MODE = 1 // Eighth bit: 00000001
mavlink20.MAV_MODE_FLAG_DECODE_POSITION_TEST = 2 // Seventh bit: 00000010
mavlink20.MAV_MODE_FLAG_DECODE_POSITION_AUTO = 4 // Sixth bit:   00000100
mavlink20.MAV_MODE_FLAG_DECODE_POSITION_GUIDED = 8 // Fifth bit:  00001000
mavlink20.MAV_MODE_FLAG_DECODE_POSITION_STABILIZE = 16 // Fourth bit: 00010000
mavlink20.MAV_MODE_FLAG_DECODE_POSITION_HIL = 32 // Third bit:  00100000
mavlink20.MAV_MODE_FLAG_DECODE_POSITION_MANUAL = 64 // Second bit: 01000000
mavlink20.MAV_MODE_FLAG_DECODE_POSITION_SAFETY = 128 // First bit:  10000000
mavlink20.MAV_MODE_FLAG_DECODE_POSITION_ENUM_END = 129 // 

// MAV_STATE
mavlink20.MAV_STATE_UNINIT = 0 // Uninitialized system, state is unknown.
mavlink20.MAV_STATE_BOOT = 1 // System is booting up.
mavlink20.MAV_STATE_CALIBRATING = 2 // System is calibrating and not flight-ready.
mavlink20.MAV_STATE_STANDBY = 3 // System is grounded and on standby. It can be launched any time.
mavlink20.MAV_STATE_ACTIVE = 4 // System is active and might be already airborne. Motors are engaged.
mavlink20.MAV_STATE_CRITICAL = 5 // System is in a non-normal flight mode (failsafe). It can however still
                        // navigate.
mavlink20.MAV_STATE_EMERGENCY = 6 // System is in a non-normal flight mode (failsafe). It lost control over
                        // parts or over the whole airframe. It is in
                        // mayday and going down.
mavlink20.MAV_STATE_POWEROFF = 7 // System just initialized its power-down sequence, will shut down now.
mavlink20.MAV_STATE_FLIGHT_TERMINATION = 8 // System is terminating itself (failsafe or commanded).
mavlink20.MAV_STATE_ENUM_END = 9 // 

// MAV_COMPONENT
mavlink20.MAV_COMP_ID_ALL = 0 // Target id (target_component) used to broadcast messages to all
                        // components of the receiving system.
                        // Components should attempt to process
                        // messages with this component ID and forward
                        // to components on any other interfaces.
                        // Note: This is not a valid *source*
                        // component id for a message.
mavlink20.MAV_COMP_ID_AUTOPILOT1 = 1 // System flight controller component ("autopilot"). Only one autopilot
                        // is expected in a particular system.
mavlink20.MAV_COMP_ID_USER1 = 25 // Id for a component on privately managed MAVLink network. Can be used
                        // for any purpose but may not be published by
                        // components outside of the private network.
mavlink20.MAV_COMP_ID_USER2 = 26 // Id for a component on privately managed MAVLink network. Can be used
                        // for any purpose but may not be published by
                        // components outside of the private network.
mavlink20.MAV_COMP_ID_USER3 = 27 // Id for a component on privately managed MAVLink network. Can be used
                        // for any purpose but may not be published by
                        // components outside of the private network.
mavlink20.MAV_COMP_ID_USER4 = 28 // Id for a component on privately managed MAVLink network. Can be used
                        // for any purpose but may not be published by
                        // components outside of the private network.
mavlink20.MAV_COMP_ID_USER5 = 29 // Id for a component on privately managed MAVLink network. Can be used
                        // for any purpose but may not be published by
                        // components outside of the private network.
mavlink20.MAV_COMP_ID_USER6 = 30 // Id for a component on privately managed MAVLink network. Can be used
                        // for any purpose but may not be published by
                        // components outside of the private network.
mavlink20.MAV_COMP_ID_USER7 = 31 // Id for a component on privately managed MAVLink network. Can be used
                        // for any purpose but may not be published by
                        // components outside of the private network.
mavlink20.MAV_COMP_ID_USER8 = 32 // Id for a component on privately managed MAVLink network. Can be used
                        // for any purpose but may not be published by
                        // components outside of the private network.
mavlink20.MAV_COMP_ID_USER9 = 33 // Id for a component on privately managed MAVLink network. Can be used
                        // for any purpose but may not be published by
                        // components outside of the private network.
mavlink20.MAV_COMP_ID_USER10 = 34 // Id for a component on privately managed MAVLink network. Can be used
                        // for any purpose but may not be published by
                        // components outside of the private network.
mavlink20.MAV_COMP_ID_USER11 = 35 // Id for a component on privately managed MAVLink network. Can be used
                        // for any purpose but may not be published by
                        // components outside of the private network.
mavlink20.MAV_COMP_ID_USER12 = 36 // Id for a component on privately managed MAVLink network. Can be used
                        // for any purpose but may not be published by
                        // components outside of the private network.
mavlink20.MAV_COMP_ID_USER13 = 37 // Id for a component on privately managed MAVLink network. Can be used
                        // for any purpose but may not be published by
                        // components outside of the private network.
mavlink20.MAV_COMP_ID_USER14 = 38 // Id for a component on privately managed MAVLink network. Can be used
                        // for any purpose but may not be published by
                        // components outside of the private network.
mavlink20.MAV_COMP_ID_USER15 = 39 // Id for a component on privately managed MAVLink network. Can be used
                        // for any purpose but may not be published by
                        // components outside of the private network.
mavlink20.MAV_COMP_ID_USER16 = 40 // Id for a component on privately managed MAVLink network. Can be used
                        // for any purpose but may not be published by
                        // components outside of the private network.
mavlink20.MAV_COMP_ID_USER17 = 41 // Id for a component on privately managed MAVLink network. Can be used
                        // for any purpose but may not be published by
                        // components outside of the private network.
mavlink20.MAV_COMP_ID_USER18 = 42 // Id for a component on privately managed MAVLink network. Can be used
                        // for any purpose but may not be published by
                        // components outside of the private network.
mavlink20.MAV_COMP_ID_USER19 = 43 // Id for a component on privately managed MAVLink network. Can be used
                        // for any purpose but may not be published by
                        // components outside of the private network.
mavlink20.MAV_COMP_ID_USER20 = 44 // Id for a component on privately managed MAVLink network. Can be used
                        // for any purpose but may not be published by
                        // components outside of the private network.
mavlink20.MAV_COMP_ID_USER21 = 45 // Id for a component on privately managed MAVLink network. Can be used
                        // for any purpose but may not be published by
                        // components outside of the private network.
mavlink20.MAV_COMP_ID_USER22 = 46 // Id for a component on privately managed MAVLink network. Can be used
                        // for any purpose but may not be published by
                        // components outside of the private network.
mavlink20.MAV_COMP_ID_USER23 = 47 // Id for a component on privately managed MAVLink network. Can be used
                        // for any purpose but may not be published by
                        // components outside of the private network.
mavlink20.MAV_COMP_ID_USER24 = 48 // Id for a component on privately managed MAVLink network. Can be used
                        // for any purpose but may not be published by
                        // components outside of the private network.
mavlink20.MAV_COMP_ID_USER25 = 49 // Id for a component on privately managed MAVLink network. Can be used
                        // for any purpose but may not be published by
                        // components outside of the private network.
mavlink20.MAV_COMP_ID_USER26 = 50 // Id for a component on privately managed MAVLink network. Can be used
                        // for any purpose but may not be published by
                        // components outside of the private network.
mavlink20.MAV_COMP_ID_USER27 = 51 // Id for a component on privately managed MAVLink network. Can be used
                        // for any purpose but may not be published by
                        // components outside of the private network.
mavlink20.MAV_COMP_ID_USER28 = 52 // Id for a component on privately managed MAVLink network. Can be used
                        // for any purpose but may not be published by
                        // components outside of the private network.
mavlink20.MAV_COMP_ID_USER29 = 53 // Id for a component on privately managed MAVLink network. Can be used
                        // for any purpose but may not be published by
                        // components outside of the private network.
mavlink20.MAV_COMP_ID_USER30 = 54 // Id for a component on privately managed MAVLink network. Can be used
                        // for any purpose but may not be published by
                        // components outside of the private network.
mavlink20.MAV_COMP_ID_USER31 = 55 // Id for a component on privately managed MAVLink network. Can be used
                        // for any purpose but may not be published by
                        // components outside of the private network.
mavlink20.MAV_COMP_ID_USER32 = 56 // Id for a component on privately managed MAVLink network. Can be used
                        // for any purpose but may not be published by
                        // components outside of the private network.
mavlink20.MAV_COMP_ID_USER33 = 57 // Id for a component on privately managed MAVLink network. Can be used
                        // for any purpose but may not be published by
                        // components outside of the private network.
mavlink20.MAV_COMP_ID_USER34 = 58 // Id for a component on privately managed MAVLink network. Can be used
                        // for any purpose but may not be published by
                        // components outside of the private network.
mavlink20.MAV_COMP_ID_USER35 = 59 // Id for a component on privately managed MAVLink network. Can be used
                        // for any purpose but may not be published by
                        // components outside of the private network.
mavlink20.MAV_COMP_ID_USER36 = 60 // Id for a component on privately managed MAVLink network. Can be used
                        // for any purpose but may not be published by
                        // components outside of the private network.
mavlink20.MAV_COMP_ID_USER37 = 61 // Id for a component on privately managed MAVLink network. Can be used
                        // for any purpose but may not be published by
                        // components outside of the private network.
mavlink20.MAV_COMP_ID_USER38 = 62 // Id for a component on privately managed MAVLink network. Can be used
                        // for any purpose but may not be published by
                        // components outside of the private network.
mavlink20.MAV_COMP_ID_USER39 = 63 // Id for a component on privately managed MAVLink network. Can be used
                        // for any purpose but may not be published by
                        // components outside of the private network.
mavlink20.MAV_COMP_ID_USER40 = 64 // Id for a component on privately managed MAVLink network. Can be used
                        // for any purpose but may not be published by
                        // components outside of the private network.
mavlink20.MAV_COMP_ID_USER41 = 65 // Id for a component on privately managed MAVLink network. Can be used
                        // for any purpose but may not be published by
                        // components outside of the private network.
mavlink20.MAV_COMP_ID_USER42 = 66 // Id for a component on privately managed MAVLink network. Can be used
                        // for any purpose but may not be published by
                        // components outside of the private network.
mavlink20.MAV_COMP_ID_USER43 = 67 // Id for a component on privately managed MAVLink network. Can be used
                        // for any purpose but may not be published by
                        // components outside of the private network.
mavlink20.MAV_COMP_ID_TELEMETRY_RADIO = 68 // Telemetry radio (e.g. SiK radio, or other component that emits
                        // RADIO_STATUS messages).
mavlink20.MAV_COMP_ID_USER45 = 69 // Id for a component on privately managed MAVLink network. Can be used
                        // for any purpose but may not be published by
                        // components outside of the private network.
mavlink20.MAV_COMP_ID_USER46 = 70 // Id for a component on privately managed MAVLink network. Can be used
                        // for any purpose but may not be published by
                        // components outside of the private network.
mavlink20.MAV_COMP_ID_USER47 = 71 // Id for a component on privately managed MAVLink network. Can be used
                        // for any purpose but may not be published by
                        // components outside of the private network.
mavlink20.MAV_COMP_ID_USER48 = 72 // Id for a component on privately managed MAVLink network. Can be used
                        // for any purpose but may not be published by
                        // components outside of the private network.
mavlink20.MAV_COMP_ID_USER49 = 73 // Id for a component on privately managed MAVLink network. Can be used
                        // for any purpose but may not be published by
                        // components outside of the private network.
mavlink20.MAV_COMP_ID_USER50 = 74 // Id for a component on privately managed MAVLink network. Can be used
                        // for any purpose but may not be published by
                        // components outside of the private network.
mavlink20.MAV_COMP_ID_USER51 = 75 // Id for a component on privately managed MAVLink network. Can be used
                        // for any purpose but may not be published by
                        // components outside of the private network.
mavlink20.MAV_COMP_ID_USER52 = 76 // Id for a component on privately managed MAVLink network. Can be used
                        // for any purpose but may not be published by
                        // components outside of the private network.
mavlink20.MAV_COMP_ID_USER53 = 77 // Id for a component on privately managed MAVLink network. Can be used
                        // for any purpose but may not be published by
                        // components outside of the private network.
mavlink20.MAV_COMP_ID_USER54 = 78 // Id for a component on privately managed MAVLink network. Can be used
                        // for any purpose but may not be published by
                        // components outside of the private network.
mavlink20.MAV_COMP_ID_USER55 = 79 // Id for a component on privately managed MAVLink network. Can be used
                        // for any purpose but may not be published by
                        // components outside of the private network.
mavlink20.MAV_COMP_ID_USER56 = 80 // Id for a component on privately managed MAVLink network. Can be used
                        // for any purpose but may not be published by
                        // components outside of the private network.
mavlink20.MAV_COMP_ID_USER57 = 81 // Id for a component on privately managed MAVLink network. Can be used
                        // for any purpose but may not be published by
                        // components outside of the private network.
mavlink20.MAV_COMP_ID_USER58 = 82 // Id for a component on privately managed MAVLink network. Can be used
                        // for any purpose but may not be published by
                        // components outside of the private network.
mavlink20.MAV_COMP_ID_USER59 = 83 // Id for a component on privately managed MAVLink network. Can be used
                        // for any purpose but may not be published by
                        // components outside of the private network.
mavlink20.MAV_COMP_ID_USER60 = 84 // Id for a component on privately managed MAVLink network. Can be used
                        // for any purpose but may not be published by
                        // components outside of the private network.
mavlink20.MAV_COMP_ID_USER61 = 85 // Id for a component on privately managed MAVLink network. Can be used
                        // for any purpose but may not be published by
                        // components outside of the private network.
mavlink20.MAV_COMP_ID_USER62 = 86 // Id for a component on privately managed MAVLink network. Can be used
                        // for any purpose but may not be published by
                        // components outside of the private network.
mavlink20.MAV_COMP_ID_USER63 = 87 // Id for a component on privately managed MAVLink network. Can be used
                        // for any purpose but may not be published by
                        // components outside of the private network.
mavlink20.MAV_COMP_ID_USER64 = 88 // Id for a component on privately managed MAVLink network. Can be used
                        // for any purpose but may not be published by
                        // components outside of the private network.
mavlink20.MAV_COMP_ID_USER65 = 89 // Id for a component on privately managed MAVLink network. Can be used
                        // for any purpose but may not be published by
                        // components outside of the private network.
mavlink20.MAV_COMP_ID_USER66 = 90 // Id for a component on privately managed MAVLink network. Can be used
                        // for any purpose but may not be published by
                        // components outside of the private network.
mavlink20.MAV_COMP_ID_USER67 = 91 // Id for a component on privately managed MAVLink network. Can be used
                        // for any purpose but may not be published by
                        // components outside of the private network.
mavlink20.MAV_COMP_ID_USER68 = 92 // Id for a component on privately managed MAVLink network. Can be used
                        // for any purpose but may not be published by
                        // components outside of the private network.
mavlink20.MAV_COMP_ID_USER69 = 93 // Id for a component on privately managed MAVLink network. Can be used
                        // for any purpose but may not be published by
                        // components outside of the private network.
mavlink20.MAV_COMP_ID_USER70 = 94 // Id for a component on privately managed MAVLink network. Can be used
                        // for any purpose but may not be published by
                        // components outside of the private network.
mavlink20.MAV_COMP_ID_USER71 = 95 // Id for a component on privately managed MAVLink network. Can be used
                        // for any purpose but may not be published by
                        // components outside of the private network.
mavlink20.MAV_COMP_ID_USER72 = 96 // Id for a component on privately managed MAVLink network. Can be used
                        // for any purpose but may not be published by
                        // components outside of the private network.
mavlink20.MAV_COMP_ID_USER73 = 97 // Id for a component on privately managed MAVLink network. Can be used
                        // for any purpose but may not be published by
                        // components outside of the private network.
mavlink20.MAV_COMP_ID_USER74 = 98 // Id for a component on privately managed MAVLink network. Can be used
                        // for any purpose but may not be published by
                        // components outside of the private network.
mavlink20.MAV_COMP_ID_USER75 = 99 // Id for a component on privately managed MAVLink network. Can be used
                        // for any purpose but may not be published by
                        // components outside of the private network.
mavlink20.MAV_COMP_ID_CAMERA = 100 // Camera #1.
mavlink20.MAV_COMP_ID_CAMERA2 = 101 // Camera #2.
mavlink20.MAV_COMP_ID_CAMERA3 = 102 // Camera #3.
mavlink20.MAV_COMP_ID_CAMERA4 = 103 // Camera #4.
mavlink20.MAV_COMP_ID_CAMERA5 = 104 // Camera #5.
mavlink20.MAV_COMP_ID_CAMERA6 = 105 // Camera #6.
mavlink20.MAV_COMP_ID_RADIO = 110 // Radio #1.
mavlink20.MAV_COMP_ID_RADIO2 = 111 // Radio #2.
mavlink20.MAV_COMP_ID_RADIO3 = 112 // Radio #3.
mavlink20.MAV_COMP_ID_SERVO1 = 140 // Servo #1.
mavlink20.MAV_COMP_ID_SERVO2 = 141 // Servo #2.
mavlink20.MAV_COMP_ID_SERVO3 = 142 // Servo #3.
mavlink20.MAV_COMP_ID_SERVO4 = 143 // Servo #4.
mavlink20.MAV_COMP_ID_SERVO5 = 144 // Servo #5.
mavlink20.MAV_COMP_ID_SERVO6 = 145 // Servo #6.
mavlink20.MAV_COMP_ID_SERVO7 = 146 // Servo #7.
mavlink20.MAV_COMP_ID_SERVO8 = 147 // Servo #8.
mavlink20.MAV_COMP_ID_SERVO9 = 148 // Servo #9.
mavlink20.MAV_COMP_ID_SERVO10 = 149 // Servo #10.
mavlink20.MAV_COMP_ID_SERVO11 = 150 // Servo #11.
mavlink20.MAV_COMP_ID_SERVO12 = 151 // Servo #12.
mavlink20.MAV_COMP_ID_SERVO13 = 152 // Servo #13.
mavlink20.MAV_COMP_ID_SERVO14 = 153 // Servo #14.
mavlink20.MAV_COMP_ID_GIMBAL = 154 // Gimbal #1.
mavlink20.MAV_COMP_ID_LOG = 155 // Logging component.
mavlink20.MAV_COMP_ID_ADSB = 156 // Automatic Dependent Surveillance-Broadcast (ADS-B) component.
mavlink20.MAV_COMP_ID_OSD = 157 // On Screen Display (OSD) devices for video links.
mavlink20.MAV_COMP_ID_PERIPHERAL = 158 // Generic autopilot peripheral component ID. Meant for devices that do
                        // not implement the parameter microservice.
mavlink20.MAV_COMP_ID_QX1_GIMBAL = 159 // Gimbal ID for QX1.
mavlink20.MAV_COMP_ID_FLARM = 160 // FLARM collision alert component.
mavlink20.MAV_COMP_ID_PARACHUTE = 161 // Parachute component.
mavlink20.MAV_COMP_ID_WINCH = 169 // Winch component.
mavlink20.MAV_COMP_ID_GIMBAL2 = 171 // Gimbal #2.
mavlink20.MAV_COMP_ID_GIMBAL3 = 172 // Gimbal #3.
mavlink20.MAV_COMP_ID_GIMBAL4 = 173 // Gimbal #4
mavlink20.MAV_COMP_ID_GIMBAL5 = 174 // Gimbal #5.
mavlink20.MAV_COMP_ID_GIMBAL6 = 175 // Gimbal #6.
mavlink20.MAV_COMP_ID_BATTERY = 180 // Battery #1.
mavlink20.MAV_COMP_ID_BATTERY2 = 181 // Battery #2.
mavlink20.MAV_COMP_ID_MAVCAN = 189 // CAN over MAVLink client.
mavlink20.MAV_COMP_ID_MISSIONPLANNER = 190 // Component that can generate/supply a mission flight plan (e.g. GCS or
                        // developer API).
mavlink20.MAV_COMP_ID_ONBOARD_COMPUTER = 191 // Component that lives on the onboard computer (companion computer) and
                        // has some generic functionalities, such as
                        // settings system parameters and monitoring
                        // the status of some processes that don't
                        // directly speak mavlink and so on.
mavlink20.MAV_COMP_ID_ONBOARD_COMPUTER2 = 192 // Component that lives on the onboard computer (companion computer) and
                        // has some generic functionalities, such as
                        // settings system parameters and monitoring
                        // the status of some processes that don't
                        // directly speak mavlink and so on.
mavlink20.MAV_COMP_ID_ONBOARD_COMPUTER3 = 193 // Component that lives on the onboard computer (companion computer) and
                        // has some generic functionalities, such as
                        // settings system parameters and monitoring
                        // the status of some processes that don't
                        // directly speak mavlink and so on.
mavlink20.MAV_COMP_ID_ONBOARD_COMPUTER4 = 194 // Component that lives on the onboard computer (companion computer) and
                        // has some generic functionalities, such as
                        // settings system parameters and monitoring
                        // the status of some processes that don't
                        // directly speak mavlink and so on.
mavlink20.MAV_COMP_ID_PATHPLANNER = 195 // Component that finds an optimal path between points based on a certain
                        // constraint (e.g. minimum snap, shortest
                        // path, cost, etc.).
mavlink20.MAV_COMP_ID_OBSTACLE_AVOIDANCE = 196 // Component that plans a collision free path between two points.
mavlink20.MAV_COMP_ID_VISUAL_INERTIAL_ODOMETRY = 197 // Component that provides position estimates using VIO techniques.
mavlink20.MAV_COMP_ID_PAIRING_MANAGER = 198 // Component that manages pairing of vehicle and GCS.
mavlink20.MAV_COMP_ID_IMU = 200 // Inertial Measurement Unit (IMU) #1.
mavlink20.MAV_COMP_ID_IMU_2 = 201 // Inertial Measurement Unit (IMU) #2.
mavlink20.MAV_COMP_ID_IMU_3 = 202 // Inertial Measurement Unit (IMU) #3.
mavlink20.MAV_COMP_ID_GPS = 220 // GPS #1.
mavlink20.MAV_COMP_ID_GPS2 = 221 // GPS #2.
mavlink20.MAV_COMP_ID_ODID_TXRX_1 = 236 // Open Drone ID transmitter/receiver (Bluetooth/WiFi/Internet).
mavlink20.MAV_COMP_ID_ODID_TXRX_2 = 237 // Open Drone ID transmitter/receiver (Bluetooth/WiFi/Internet).
mavlink20.MAV_COMP_ID_ODID_TXRX_3 = 238 // Open Drone ID transmitter/receiver (Bluetooth/WiFi/Internet).
mavlink20.MAV_COMP_ID_UDP_BRIDGE = 240 // Component to bridge MAVLink to UDP (i.e. from a UART).
mavlink20.MAV_COMP_ID_UART_BRIDGE = 241 // Component to bridge to UART (i.e. from UDP).
mavlink20.MAV_COMP_ID_TUNNEL_NODE = 242 // Component handling TUNNEL messages (e.g. vendor specific GUI of a
                        // component).
mavlink20.MAV_COMP_ID_ILLUMINATOR = 243 // Illuminator
mavlink20.MAV_COMP_ID_SYSTEM_CONTROL = 250 // Deprecated, don't use. Component for handling system messages (e.g. to
                        // ARM, takeoff, etc.).
mavlink20.MAV_COMPONENT_ENUM_END = 251 // 

// message IDs
mavlink20.MAVLINK_MSG_ID_BAD_DATA = -1
mavlink20.MAVLINK_MSG_ID_SYS_STATUS = 1
mavlink20.MAVLINK_MSG_ID_SYSTEM_TIME = 2
mavlink20.MAVLINK_MSG_ID_PING = 4
mavlink20.MAVLINK_MSG_ID_CHANGE_OPERATOR_CONTROL = 5
mavlink20.MAVLINK_MSG_ID_CHANGE_OPERATOR_CONTROL_ACK = 6
mavlink20.MAVLINK_MSG_ID_AUTH_KEY = 7
mavlink20.MAVLINK_MSG_ID_LINK_NODE_STATUS = 8
mavlink20.MAVLINK_MSG_ID_SET_MODE = 11
mavlink20.MAVLINK_MSG_ID_PARAM_REQUEST_READ = 20
mavlink20.MAVLINK_MSG_ID_PARAM_REQUEST_LIST = 21
mavlink20.MAVLINK_MSG_ID_PARAM_VALUE = 22
mavlink20.MAVLINK_MSG_ID_PARAM_SET = 23
mavlink20.MAVLINK_MSG_ID_GPS_RAW_INT = 24
mavlink20.MAVLINK_MSG_ID_GPS_STATUS = 25
mavlink20.MAVLINK_MSG_ID_SCALED_IMU = 26
mavlink20.MAVLINK_MSG_ID_RAW_IMU = 27
mavlink20.MAVLINK_MSG_ID_RAW_PRESSURE = 28
mavlink20.MAVLINK_MSG_ID_SCALED_PRESSURE = 29
mavlink20.MAVLINK_MSG_ID_ATTITUDE = 30
mavlink20.MAVLINK_MSG_ID_ATTITUDE_QUATERNION = 31
mavlink20.MAVLINK_MSG_ID_LOCAL_POSITION_NED = 32
mavlink20.MAVLINK_MSG_ID_RC_CHANNELS_SCALED = 34
mavlink20.MAVLINK_MSG_ID_RC_CHANNELS_RAW = 35
mavlink20.MAVLINK_MSG_ID_SERVO_OUTPUT_RAW = 36
mavlink20.MAVLINK_MSG_ID_MISSION_REQUEST_PARTIAL_LIST = 37
mavlink20.MAVLINK_MSG_ID_MISSION_WRITE_PARTIAL_LIST = 38
mavlink20.MAVLINK_MSG_ID_MISSION_ITEM = 39
mavlink20.MAVLINK_MSG_ID_MISSION_REQUEST = 40
mavlink20.MAVLINK_MSG_ID_MISSION_SET_CURRENT = 41
mavlink20.MAVLINK_MSG_ID_MISSION_CURRENT = 42
mavlink20.MAVLINK_MSG_ID_MISSION_REQUEST_LIST = 43
mavlink20.MAVLINK_MSG_ID_MISSION_COUNT = 44
mavlink20.MAVLINK_MSG_ID_MISSION_CLEAR_ALL = 45
mavlink20.MAVLINK_MSG_ID_MISSION_ITEM_REACHED = 46
mavlink20.MAVLINK_MSG_ID_MISSION_ACK = 47
mavlink20.MAVLINK_MSG_ID_SET_GPS_GLOBAL_ORIGIN = 48
mavlink20.MAVLINK_MSG_ID_GPS_GLOBAL_ORIGIN = 49
mavlink20.MAVLINK_MSG_ID_PARAM_MAP_RC = 50
mavlink20.MAVLINK_MSG_ID_MISSION_REQUEST_INT = 51
mavlink20.MAVLINK_MSG_ID_SAFETY_SET_ALLOWED_AREA = 54
mavlink20.MAVLINK_MSG_ID_SAFETY_ALLOWED_AREA = 55
mavlink20.MAVLINK_MSG_ID_ATTITUDE_QUATERNION_COV = 61
mavlink20.MAVLINK_MSG_ID_NAV_CONTROLLER_OUTPUT = 62
mavlink20.MAVLINK_MSG_ID_GLOBAL_POSITION_INT_COV = 63
mavlink20.MAVLINK_MSG_ID_LOCAL_POSITION_NED_COV = 64
mavlink20.MAVLINK_MSG_ID_RC_CHANNELS = 65
mavlink20.MAVLINK_MSG_ID_REQUEST_DATA_STREAM = 66
mavlink20.MAVLINK_MSG_ID_DATA_STREAM = 67
mavlink20.MAVLINK_MSG_ID_MANUAL_CONTROL = 69
mavlink20.MAVLINK_MSG_ID_RC_CHANNELS_OVERRIDE = 70
mavlink20.MAVLINK_MSG_ID_MISSION_ITEM_INT = 73
mavlink20.MAVLINK_MSG_ID_VFR_HUD = 74
mavlink20.MAVLINK_MSG_ID_COMMAND_INT = 75
mavlink20.MAVLINK_MSG_ID_COMMAND_LONG = 76
mavlink20.MAVLINK_MSG_ID_COMMAND_ACK = 77
mavlink20.MAVLINK_MSG_ID_COMMAND_CANCEL = 80
mavlink20.MAVLINK_MSG_ID_MANUAL_SETPOINT = 81
mavlink20.MAVLINK_MSG_ID_SET_ATTITUDE_TARGET = 82
mavlink20.MAVLINK_MSG_ID_ATTITUDE_TARGET = 83
mavlink20.MAVLINK_MSG_ID_SET_POSITION_TARGET_LOCAL_NED = 84
mavlink20.MAVLINK_MSG_ID_POSITION_TARGET_LOCAL_NED = 85
mavlink20.MAVLINK_MSG_ID_SET_POSITION_TARGET_GLOBAL_INT = 86
mavlink20.MAVLINK_MSG_ID_POSITION_TARGET_GLOBAL_INT = 87
mavlink20.MAVLINK_MSG_ID_LOCAL_POSITION_NED_SYSTEM_GLOBAL_OFFSET = 89
mavlink20.MAVLINK_MSG_ID_HIL_STATE = 90
mavlink20.MAVLINK_MSG_ID_HIL_CONTROLS = 91
mavlink20.MAVLINK_MSG_ID_HIL_RC_INPUTS_RAW = 92
mavlink20.MAVLINK_MSG_ID_HIL_ACTUATOR_CONTROLS = 93
mavlink20.MAVLINK_MSG_ID_OPTICAL_FLOW = 100
mavlink20.MAVLINK_MSG_ID_GLOBAL_VISION_POSITION_ESTIMATE = 101
mavlink20.MAVLINK_MSG_ID_VISION_POSITION_ESTIMATE = 102
mavlink20.MAVLINK_MSG_ID_VISION_SPEED_ESTIMATE = 103
mavlink20.MAVLINK_MSG_ID_VICON_POSITION_ESTIMATE = 104
mavlink20.MAVLINK_MSG_ID_HIGHRES_IMU = 105
mavlink20.MAVLINK_MSG_ID_OPTICAL_FLOW_RAD = 106
mavlink20.MAVLINK_MSG_ID_HIL_SENSOR = 107
mavlink20.MAVLINK_MSG_ID_SIM_STATE = 108
mavlink20.MAVLINK_MSG_ID_RADIO_STATUS = 109
mavlink20.MAVLINK_MSG_ID_FILE_TRANSFER_PROTOCOL = 110
mavlink20.MAVLINK_MSG_ID_TIMESYNC = 111
mavlink20.MAVLINK_MSG_ID_CAMERA_TRIGGER = 112
mavlink20.MAVLINK_MSG_ID_HIL_GPS = 113
mavlink20.MAVLINK_MSG_ID_HIL_OPTICAL_FLOW = 114
mavlink20.MAVLINK_MSG_ID_HIL_STATE_QUATERNION = 115
mavlink20.MAVLINK_MSG_ID_SCALED_IMU2 = 116
mavlink20.MAVLINK_MSG_ID_LOG_REQUEST_LIST = 117
mavlink20.MAVLINK_MSG_ID_LOG_ENTRY = 118
mavlink20.MAVLINK_MSG_ID_LOG_REQUEST_DATA = 119
mavlink20.MAVLINK_MSG_ID_LOG_DATA = 120
mavlink20.MAVLINK_MSG_ID_LOG_ERASE = 121
mavlink20.MAVLINK_MSG_ID_LOG_REQUEST_END = 122
mavlink20.MAVLINK_MSG_ID_GPS_INJECT_DATA = 123
mavlink20.MAVLINK_MSG_ID_GPS2_RAW = 124
mavlink20.MAVLINK_MSG_ID_POWER_STATUS = 125
mavlink20.MAVLINK_MSG_ID_SERIAL_CONTROL = 126
mavlink20.MAVLINK_MSG_ID_GPS_RTK = 127
mavlink20.MAVLINK_MSG_ID_GPS2_RTK = 128
mavlink20.MAVLINK_MSG_ID_SCALED_IMU3 = 129
mavlink20.MAVLINK_MSG_ID_DATA_TRANSMISSION_HANDSHAKE = 130
mavlink20.MAVLINK_MSG_ID_ENCAPSULATED_DATA = 131
mavlink20.MAVLINK_MSG_ID_DISTANCE_SENSOR = 132
mavlink20.MAVLINK_MSG_ID_TERRAIN_REQUEST = 133
mavlink20.MAVLINK_MSG_ID_TERRAIN_DATA = 134
mavlink20.MAVLINK_MSG_ID_TERRAIN_CHECK = 135
mavlink20.MAVLINK_MSG_ID_TERRAIN_REPORT = 136
mavlink20.MAVLINK_MSG_ID_SCALED_PRESSURE2 = 137
mavlink20.MAVLINK_MSG_ID_ATT_POS_MOCAP = 138
mavlink20.MAVLINK_MSG_ID_SET_ACTUATOR_CONTROL_TARGET = 139
mavlink20.MAVLINK_MSG_ID_ACTUATOR_CONTROL_TARGET = 140
mavlink20.MAVLINK_MSG_ID_ALTITUDE = 141
mavlink20.MAVLINK_MSG_ID_RESOURCE_REQUEST = 142
mavlink20.MAVLINK_MSG_ID_SCALED_PRESSURE3 = 143
mavlink20.MAVLINK_MSG_ID_FOLLOW_TARGET = 144
mavlink20.MAVLINK_MSG_ID_CONTROL_SYSTEM_STATE = 146
mavlink20.MAVLINK_MSG_ID_BATTERY_STATUS = 147
mavlink20.MAVLINK_MSG_ID_LANDING_TARGET = 149
mavlink20.MAVLINK_MSG_ID_FENCE_STATUS = 162
mavlink20.MAVLINK_MSG_ID_MAG_CAL_REPORT = 192
mavlink20.MAVLINK_MSG_ID_EFI_STATUS = 225
mavlink20.MAVLINK_MSG_ID_ESTIMATOR_STATUS = 230
mavlink20.MAVLINK_MSG_ID_WIND_COV = 231
mavlink20.MAVLINK_MSG_ID_GPS_INPUT = 232
mavlink20.MAVLINK_MSG_ID_GPS_RTCM_DATA = 233
mavlink20.MAVLINK_MSG_ID_HIGH_LATENCY = 234
mavlink20.MAVLINK_MSG_ID_HIGH_LATENCY2 = 235
mavlink20.MAVLINK_MSG_ID_VIBRATION = 241
mavlink20.MAVLINK_MSG_ID_HOME_POSITION = 242
mavlink20.MAVLINK_MSG_ID_SET_HOME_POSITION = 243
mavlink20.MAVLINK_MSG_ID_MESSAGE_INTERVAL = 244
mavlink20.MAVLINK_MSG_ID_EXTENDED_SYS_STATE = 245
mavlink20.MAVLINK_MSG_ID_ADSB_VEHICLE = 246
mavlink20.MAVLINK_MSG_ID_COLLISION = 247
mavlink20.MAVLINK_MSG_ID_V2_EXTENSION = 248
mavlink20.MAVLINK_MSG_ID_MEMORY_VECT = 249
mavlink20.MAVLINK_MSG_ID_DEBUG_VECT = 250
mavlink20.MAVLINK_MSG_ID_NAMED_VALUE_FLOAT = 251
mavlink20.MAVLINK_MSG_ID_NAMED_VALUE_INT = 252
mavlink20.MAVLINK_MSG_ID_STATUSTEXT = 253
mavlink20.MAVLINK_MSG_ID_DEBUG = 254
mavlink20.MAVLINK_MSG_ID_SETUP_SIGNING = 256
mavlink20.MAVLINK_MSG_ID_BUTTON_CHANGE = 257
mavlink20.MAVLINK_MSG_ID_PLAY_TUNE = 258
mavlink20.MAVLINK_MSG_ID_CAMERA_INFORMATION = 259
mavlink20.MAVLINK_MSG_ID_CAMERA_SETTINGS = 260
mavlink20.MAVLINK_MSG_ID_STORAGE_INFORMATION = 261
mavlink20.MAVLINK_MSG_ID_CAMERA_CAPTURE_STATUS = 262
mavlink20.MAVLINK_MSG_ID_CAMERA_IMAGE_CAPTURED = 263
mavlink20.MAVLINK_MSG_ID_FLIGHT_INFORMATION = 264
mavlink20.MAVLINK_MSG_ID_MOUNT_ORIENTATION = 265
mavlink20.MAVLINK_MSG_ID_LOGGING_DATA = 266
mavlink20.MAVLINK_MSG_ID_LOGGING_DATA_ACKED = 267
mavlink20.MAVLINK_MSG_ID_LOGGING_ACK = 268
mavlink20.MAVLINK_MSG_ID_VIDEO_STREAM_INFORMATION = 269
mavlink20.MAVLINK_MSG_ID_VIDEO_STREAM_STATUS = 270
mavlink20.MAVLINK_MSG_ID_CAMERA_FOV_STATUS = 271
mavlink20.MAVLINK_MSG_ID_CAMERA_TRACKING_IMAGE_STATUS = 275
mavlink20.MAVLINK_MSG_ID_CAMERA_TRACKING_GEO_STATUS = 276
mavlink20.MAVLINK_MSG_ID_CAMERA_THERMAL_RANGE = 277
mavlink20.MAVLINK_MSG_ID_GIMBAL_MANAGER_INFORMATION = 280
mavlink20.MAVLINK_MSG_ID_GIMBAL_MANAGER_STATUS = 281
mavlink20.MAVLINK_MSG_ID_GIMBAL_MANAGER_SET_ATTITUDE = 282
mavlink20.MAVLINK_MSG_ID_GIMBAL_DEVICE_INFORMATION = 283
mavlink20.MAVLINK_MSG_ID_GIMBAL_DEVICE_SET_ATTITUDE = 284
mavlink20.MAVLINK_MSG_ID_GIMBAL_DEVICE_ATTITUDE_STATUS = 285
mavlink20.MAVLINK_MSG_ID_AUTOPILOT_STATE_FOR_GIMBAL_DEVICE = 286
mavlink20.MAVLINK_MSG_ID_GIMBAL_MANAGER_SET_PITCHYAW = 287
mavlink20.MAVLINK_MSG_ID_GIMBAL_MANAGER_SET_MANUAL_CONTROL = 288
mavlink20.MAVLINK_MSG_ID_ESC_INFO = 290
mavlink20.MAVLINK_MSG_ID_ESC_STATUS = 291
mavlink20.MAVLINK_MSG_ID_WIFI_CONFIG_AP = 299
mavlink20.MAVLINK_MSG_ID_AIS_VESSEL = 301
mavlink20.MAVLINK_MSG_ID_UAVCAN_NODE_STATUS = 310
mavlink20.MAVLINK_MSG_ID_UAVCAN_NODE_INFO = 311
mavlink20.MAVLINK_MSG_ID_PARAM_EXT_REQUEST_READ = 320
mavlink20.MAVLINK_MSG_ID_PARAM_EXT_REQUEST_LIST = 321
mavlink20.MAVLINK_MSG_ID_PARAM_EXT_VALUE = 322
mavlink20.MAVLINK_MSG_ID_PARAM_EXT_SET = 323
mavlink20.MAVLINK_MSG_ID_PARAM_EXT_ACK = 324
mavlink20.MAVLINK_MSG_ID_OBSTACLE_DISTANCE = 330
mavlink20.MAVLINK_MSG_ID_ODOMETRY = 331
mavlink20.MAVLINK_MSG_ID_TRAJECTORY_REPRESENTATION_WAYPOINTS = 332
mavlink20.MAVLINK_MSG_ID_TRAJECTORY_REPRESENTATION_BEZIER = 333
mavlink20.MAVLINK_MSG_ID_CELLULAR_STATUS = 334
mavlink20.MAVLINK_MSG_ID_ISBD_LINK_STATUS = 335
mavlink20.MAVLINK_MSG_ID_CELLULAR_CONFIG = 336
mavlink20.MAVLINK_MSG_ID_RAW_RPM = 339
mavlink20.MAVLINK_MSG_ID_UTM_GLOBAL_POSITION = 340
mavlink20.MAVLINK_MSG_ID_PARAM_ERROR = 345
mavlink20.MAVLINK_MSG_ID_DEBUG_FLOAT_ARRAY = 350
mavlink20.MAVLINK_MSG_ID_ORBIT_EXECUTION_STATUS = 360
mavlink20.MAVLINK_MSG_ID_SMART_BATTERY_INFO = 370
mavlink20.MAVLINK_MSG_ID_FUEL_STATUS = 371
mavlink20.MAVLINK_MSG_ID_BATTERY_INFO = 372
mavlink20.MAVLINK_MSG_ID_GENERATOR_STATUS = 373
mavlink20.MAVLINK_MSG_ID_ACTUATOR_OUTPUT_STATUS = 375
mavlink20.MAVLINK_MSG_ID_TIME_ESTIMATE_TO_TARGET = 380
mavlink20.MAVLINK_MSG_ID_TUNNEL = 385
mavlink20.MAVLINK_MSG_ID_CAN_FRAME = 386
mavlink20.MAVLINK_MSG_ID_ONBOARD_COMPUTER_STATUS = 390
mavlink20.MAVLINK_MSG_ID_COMPONENT_INFORMATION = 395
mavlink20.MAVLINK_MSG_ID_COMPONENT_INFORMATION_BASIC = 396
mavlink20.MAVLINK_MSG_ID_COMPONENT_METADATA = 397
mavlink20.MAVLINK_MSG_ID_PLAY_TUNE_V2 = 400
mavlink20.MAVLINK_MSG_ID_SUPPORTED_TUNES = 401
mavlink20.MAVLINK_MSG_ID_EVENT = 410
mavlink20.MAVLINK_MSG_ID_CURRENT_EVENT_SEQUENCE = 411
mavlink20.MAVLINK_MSG_ID_REQUEST_EVENT = 412
mavlink20.MAVLINK_MSG_ID_RESPONSE_EVENT_ERROR = 413
mavlink20.MAVLINK_MSG_ID_AVAILABLE_MODES = 435
mavlink20.MAVLINK_MSG_ID_CURRENT_MODE = 436
mavlink20.MAVLINK_MSG_ID_AVAILABLE_MODES_MONITOR = 437
mavlink20.MAVLINK_MSG_ID_ILLUMINATOR_STATUS = 440
mavlink20.MAVLINK_MSG_ID_CANFD_FRAME = 387
mavlink20.MAVLINK_MSG_ID_CAN_FILTER_MODIFY = 388
mavlink20.MAVLINK_MSG_ID_WHEEL_DISTANCE = 9000
mavlink20.MAVLINK_MSG_ID_WINCH_STATUS = 9005
mavlink20.MAVLINK_MSG_ID_OPEN_DRONE_ID_BASIC_ID = 12900
mavlink20.MAVLINK_MSG_ID_OPEN_DRONE_ID_LOCATION = 12901
mavlink20.MAVLINK_MSG_ID_OPEN_DRONE_ID_AUTHENTICATION = 12902
mavlink20.MAVLINK_MSG_ID_OPEN_DRONE_ID_SELF_ID = 12903
mavlink20.MAVLINK_MSG_ID_OPEN_DRONE_ID_SYSTEM = 12904
mavlink20.MAVLINK_MSG_ID_OPEN_DRONE_ID_OPERATOR_ID = 12905
mavlink20.MAVLINK_MSG_ID_OPEN_DRONE_ID_MESSAGE_PACK = 12915
mavlink20.MAVLINK_MSG_ID_OPEN_DRONE_ID_ARM_STATUS = 12918
mavlink20.MAVLINK_MSG_ID_OPEN_DRONE_ID_SYSTEM_UPDATE = 12919
mavlink20.MAVLINK_MSG_ID_HYGROMETER_SENSOR = 12920
mavlink20.MAVLINK_MSG_ID_GLOBAL_POSITION_INT = 33
mavlink20.MAVLINK_MSG_ID_AUTOPILOT_VERSION = 148
mavlink20.MAVLINK_MSG_ID_HEARTBEAT = 0
mavlink20.MAVLINK_MSG_ID_PROTOCOL_VERSION = 300
mavlink20.messages = {};

/* 
The general system state. If the system is following the MAVLink
standard, the system state is mainly defined by three orthogonal
states/modes: The system mode, which is either LOCKED (motors shut
down and locked), MANUAL (system under RC control), GUIDED (system
with autonomous position control, position setpoint controlled
manually) or AUTO (system guided by path/waypoint planner). The
NAV_MODE defined the current flight state: LIFTOFF (often an open-loop
maneuver), LANDING, WAYPOINTS or VECTOR. This represents the internal
navigation state machine. The system status shows whether the system
is currently active or not and if an emergency occurred. During the
CRITICAL and EMERGENCY states the MAV is still considered to be
active, but should start emergency procedures autonomously. After a
failure occurred it should first move from active to critical to allow
manual intervention and then move to emergency after a certain
timeout.

                onboard_control_sensors_present        : Bitmap showing which onboard controllers and sensors are present. Value of 0: not present. Value of 1: present. (uint32_t)
                onboard_control_sensors_enabled        : Bitmap showing which onboard controllers and sensors are enabled:  Value of 0: not enabled. Value of 1: enabled. (uint32_t)
                onboard_control_sensors_health        : Bitmap showing which onboard controllers and sensors have an error (or are operational). Value of 0: error. Value of 1: healthy. (uint32_t)
                load                      : Maximum usage in percent of the mainloop time. Values: [0-1000] - should always be below 1000 (uint16_t)
                voltage_battery           : Battery voltage, UINT16_MAX: Voltage not sent by autopilot (uint16_t)
                current_battery           : Battery current, -1: Current not sent by autopilot (int16_t)
                battery_remaining         : Battery energy remaining, -1: Battery remaining energy not sent by autopilot (int8_t)
                drop_rate_comm            : Communication drop rate, (UART, I2C, SPI, CAN), dropped packets on all links (packets that were corrupted on reception on the MAV) (uint16_t)
                errors_comm               : Communication errors (UART, I2C, SPI, CAN), dropped packets on all links (packets that were corrupted on reception on the MAV) (uint16_t)
                errors_count1             : Autopilot-specific errors (uint16_t)
                errors_count2             : Autopilot-specific errors (uint16_t)
                errors_count3             : Autopilot-specific errors (uint16_t)
                errors_count4             : Autopilot-specific errors (uint16_t)
                onboard_control_sensors_present_extended        : Bitmap showing which onboard controllers and sensors are present. Value of 0: not present. Value of 1: present. (uint32_t)
                onboard_control_sensors_enabled_extended        : Bitmap showing which onboard controllers and sensors are enabled:  Value of 0: not enabled. Value of 1: enabled. (uint32_t)
                onboard_control_sensors_health_extended        : Bitmap showing which onboard controllers and sensors have an error (or are operational). Value of 0: error. Value of 1: healthy. (uint32_t)

*/
mavlink20.messages.sys_status = function(onboard_control_sensors_present, onboard_control_sensors_enabled, onboard_control_sensors_health, load, voltage_battery, current_battery, battery_remaining, drop_rate_comm, errors_comm, errors_count1, errors_count2, errors_count3, errors_count4, onboard_control_sensors_present_extended, onboard_control_sensors_enabled_extended, onboard_control_sensors_health_extended) {

    this.format = '<IIIHHhHHHHHHbIII';
    this.id = mavlink20.MAVLINK_MSG_ID_SYS_STATUS;
    this.order_map = [0, 1, 2, 3, 4, 5, 12, 6, 7, 8, 9, 10, 11, 13, 14, 15];
    this.crc_extra = 124;
    this.name = 'SYS_STATUS';

    this.fieldnames = ['onboard_control_sensors_present', 'onboard_control_sensors_enabled', 'onboard_control_sensors_health', 'load', 'voltage_battery', 'current_battery', 'battery_remaining', 'drop_rate_comm', 'errors_comm', 'errors_count1', 'errors_count2', 'errors_count3', 'errors_count4', 'onboard_control_sensors_present_extended', 'onboard_control_sensors_enabled_extended', 'onboard_control_sensors_health_extended'];


    this.set(arguments);

}
        mavlink20.messages.sys_status.prototype = new mavlink20.message;
mavlink20.messages.sys_status.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.onboard_control_sensors_present, this.onboard_control_sensors_enabled, this.onboard_control_sensors_health, this.load, this.voltage_battery, this.current_battery, this.drop_rate_comm, this.errors_comm, this.errors_count1, this.errors_count2, this.errors_count3, this.errors_count4, this.battery_remaining, this.onboard_control_sensors_present_extended, this.onboard_control_sensors_enabled_extended, this.onboard_control_sensors_health_extended]));
}

/* 
The system time is the time of the master clock.         This can be
emitted by flight controllers, onboard computers, or other components
in the MAVLink network.         Components that are using a less
reliable time source, such as a battery-backed real time clock, can
choose to match their system clock to that of a SYSTEM_TYPE that
indicates a more recent time.         This allows more broadly
accurate date stamping of logs, and so on.         If precise time
synchronization is needed then use TIMESYNC instead.

                time_unix_usec            : Timestamp (UNIX epoch time). (uint64_t)
                time_boot_ms              : Timestamp (time since system boot). (uint32_t)

*/
mavlink20.messages.system_time = function(time_unix_usec, time_boot_ms) {

    this.format = '<QI';
    this.id = mavlink20.MAVLINK_MSG_ID_SYSTEM_TIME;
    this.order_map = [0, 1];
    this.crc_extra = 137;
    this.name = 'SYSTEM_TIME';

    this.fieldnames = ['time_unix_usec', 'time_boot_ms'];


    this.set(arguments);

}
        mavlink20.messages.system_time.prototype = new mavlink20.message;
mavlink20.messages.system_time.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.time_unix_usec, this.time_boot_ms]));
}

/* 
A ping message either requesting or responding to a ping. This allows
to measure the system latencies, including serial port, radio modem
and UDP connections. The ping microservice is documented at
https://mavlink.io/en/services/ping.html

                time_usec                 : Timestamp (UNIX Epoch time or time since system boot). The receiving end can infer timestamp format (since 1.1.1970 or since system boot) by checking for the magnitude of the number. (uint64_t)
                seq                       : PING sequence (uint32_t)
                target_system             : 0: request ping from all receiving systems. If greater than 0: message is a ping response and number is the system id of the requesting system (uint8_t)
                target_component          : 0: request ping from all receiving components. If greater than 0: message is a ping response and number is the component id of the requesting component. (uint8_t)

*/
mavlink20.messages.ping = function(time_usec, seq, target_system, target_component) {

    this.format = '<QIBB';
    this.id = mavlink20.MAVLINK_MSG_ID_PING;
    this.order_map = [0, 1, 2, 3];
    this.crc_extra = 237;
    this.name = 'PING';

    this.fieldnames = ['time_usec', 'seq', 'target_system', 'target_component'];


    this.set(arguments);

}
        mavlink20.messages.ping.prototype = new mavlink20.message;
mavlink20.messages.ping.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.time_usec, this.seq, this.target_system, this.target_component]));
}

/* 
Request to control this MAV

                target_system             : System the GCS requests control for (uint8_t)
                control_request           : 0: request control of this MAV, 1: Release control of this MAV (uint8_t)
                version                   : 0: key as plaintext, 1-255: future, different hashing/encryption variants. The GCS should in general use the safest mode possible initially and then gradually move down the encryption level if it gets a NACK message indicating an encryption mismatch. (uint8_t)
                passkey                   : Password / Key, depending on version plaintext or encrypted. 25 or less characters, NULL terminated. The characters may involve A-Z, a-z, 0-9, and "!?,.-" (char)

*/
mavlink20.messages.change_operator_control = function(target_system, control_request, version, passkey) {

    this.format = '<BBB25s';
    this.id = mavlink20.MAVLINK_MSG_ID_CHANGE_OPERATOR_CONTROL;
    this.order_map = [0, 1, 2, 3];
    this.crc_extra = 217;
    this.name = 'CHANGE_OPERATOR_CONTROL';

    this.fieldnames = ['target_system', 'control_request', 'version', 'passkey'];


    this.set(arguments);

}
        mavlink20.messages.change_operator_control.prototype = new mavlink20.message;
mavlink20.messages.change_operator_control.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.target_system, this.control_request, this.version, this.passkey]));
}

/* 
Accept / deny control of this MAV

                gcs_system_id             : ID of the GCS this message (uint8_t)
                control_request           : 0: request control of this MAV, 1: Release control of this MAV (uint8_t)
                ack                       : 0: ACK, 1: NACK: Wrong passkey, 2: NACK: Unsupported passkey encryption method, 3: NACK: Already under control (uint8_t)

*/
mavlink20.messages.change_operator_control_ack = function(gcs_system_id, control_request, ack) {

    this.format = '<BBB';
    this.id = mavlink20.MAVLINK_MSG_ID_CHANGE_OPERATOR_CONTROL_ACK;
    this.order_map = [0, 1, 2];
    this.crc_extra = 104;
    this.name = 'CHANGE_OPERATOR_CONTROL_ACK';

    this.fieldnames = ['gcs_system_id', 'control_request', 'ack'];


    this.set(arguments);

}
        mavlink20.messages.change_operator_control_ack.prototype = new mavlink20.message;
mavlink20.messages.change_operator_control_ack.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.gcs_system_id, this.control_request, this.ack]));
}

/* 
Emit an encrypted signature / key identifying this system. PLEASE
NOTE: This protocol has been kept simple, so transmitting the key
requires an encrypted channel for true safety.

                key                       : key (char)

*/
mavlink20.messages.auth_key = function(key) {

    this.format = '<32s';
    this.id = mavlink20.MAVLINK_MSG_ID_AUTH_KEY;
    this.order_map = [0];
    this.crc_extra = 119;
    this.name = 'AUTH_KEY';

    this.fieldnames = ['key'];


    this.set(arguments);

}
        mavlink20.messages.auth_key.prototype = new mavlink20.message;
mavlink20.messages.auth_key.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.key]));
}

/* 
Status generated in each node in the communication chain and injected
into MAVLink stream.

                timestamp                 : Timestamp (time since system boot). (uint64_t)
                tx_buf                    : Remaining free transmit buffer space (uint8_t)
                rx_buf                    : Remaining free receive buffer space (uint8_t)
                tx_rate                   : Transmit rate (uint32_t)
                rx_rate                   : Receive rate (uint32_t)
                rx_parse_err              : Number of bytes that could not be parsed correctly. (uint16_t)
                tx_overflows              : Transmit buffer overflows. This number wraps around as it reaches UINT16_MAX (uint16_t)
                rx_overflows              : Receive buffer overflows. This number wraps around as it reaches UINT16_MAX (uint16_t)
                messages_sent             : Messages sent (uint32_t)
                messages_received         : Messages received (estimated from counting seq) (uint32_t)
                messages_lost             : Messages lost (estimated from counting seq) (uint32_t)

*/
mavlink20.messages.link_node_status = function(timestamp, tx_buf, rx_buf, tx_rate, rx_rate, rx_parse_err, tx_overflows, rx_overflows, messages_sent, messages_received, messages_lost) {

    this.format = '<QIIIIIHHHBB';
    this.id = mavlink20.MAVLINK_MSG_ID_LINK_NODE_STATUS;
    this.order_map = [0, 9, 10, 1, 2, 6, 7, 8, 3, 4, 5];
    this.crc_extra = 117;
    this.name = 'LINK_NODE_STATUS';

    this.fieldnames = ['timestamp', 'tx_buf', 'rx_buf', 'tx_rate', 'rx_rate', 'rx_parse_err', 'tx_overflows', 'rx_overflows', 'messages_sent', 'messages_received', 'messages_lost'];


    this.set(arguments);

}
        mavlink20.messages.link_node_status.prototype = new mavlink20.message;
mavlink20.messages.link_node_status.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.timestamp, this.tx_rate, this.rx_rate, this.messages_sent, this.messages_received, this.messages_lost, this.rx_parse_err, this.tx_overflows, this.rx_overflows, this.tx_buf, this.rx_buf]));
}

/* 
Set the system mode, as defined by enum MAV_MODE. There is no target
component id as the mode is by definition for the overall aircraft,
not only for one component.

                target_system             : The system setting the mode (uint8_t)
                base_mode                 : The new base mode. (uint8_t)
                custom_mode               : The new autopilot-specific mode. This field can be ignored by an autopilot. (uint32_t)

*/
mavlink20.messages.set_mode = function(target_system, base_mode, custom_mode) {

    this.format = '<IBB';
    this.id = mavlink20.MAVLINK_MSG_ID_SET_MODE;
    this.order_map = [1, 2, 0];
    this.crc_extra = 89;
    this.name = 'SET_MODE';

    this.fieldnames = ['target_system', 'base_mode', 'custom_mode'];


    this.set(arguments);

}
        mavlink20.messages.set_mode.prototype = new mavlink20.message;
mavlink20.messages.set_mode.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.custom_mode, this.target_system, this.base_mode]));
}

/* 
Request to read the onboard parameter with the param_id string id.
Onboard parameters are stored as key[const char*] -> value[float].
This allows to send a parameter to any other component (such as the
GCS) without the need of previous knowledge of possible parameter
names. Thus the same GCS can store different parameters for different
autopilots. See also https://mavlink.io/en/services/parameter.html for
a full documentation of QGroundControl and IMU code.

                target_system             : System ID (uint8_t)
                target_component          : Component ID (uint8_t)
                param_id                  : Onboard parameter id, terminated by NULL if the length is less than 16 human-readable chars and WITHOUT null termination (NULL) byte if the length is exactly 16 chars - applications have to provide 16+1 bytes storage if the ID is stored as string (char)
                param_index               : Parameter index. Send -1 to use the param ID field as identifier (else the param id will be ignored) (int16_t)

*/
mavlink20.messages.param_request_read = function(target_system, target_component, param_id, param_index) {

    this.format = '<hBB16s';
    this.id = mavlink20.MAVLINK_MSG_ID_PARAM_REQUEST_READ;
    this.order_map = [1, 2, 3, 0];
    this.crc_extra = 214;
    this.name = 'PARAM_REQUEST_READ';

    this.fieldnames = ['target_system', 'target_component', 'param_id', 'param_index'];


    this.set(arguments);

}
        mavlink20.messages.param_request_read.prototype = new mavlink20.message;
mavlink20.messages.param_request_read.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.param_index, this.target_system, this.target_component, this.param_id]));
}

/* 
Request all parameters of this component. After this request, all
parameters are emitted. The parameter microservice is documented at
https://mavlink.io/en/services/parameter.html

                target_system             : System ID (uint8_t)
                target_component          : Component ID (uint8_t)

*/
mavlink20.messages.param_request_list = function(target_system, target_component) {

    this.format = '<BB';
    this.id = mavlink20.MAVLINK_MSG_ID_PARAM_REQUEST_LIST;
    this.order_map = [0, 1];
    this.crc_extra = 159;
    this.name = 'PARAM_REQUEST_LIST';

    this.fieldnames = ['target_system', 'target_component'];


    this.set(arguments);

}
        mavlink20.messages.param_request_list.prototype = new mavlink20.message;
mavlink20.messages.param_request_list.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.target_system, this.target_component]));
}

/* 
Emit the value of a onboard parameter. The inclusion of param_count
and param_index in the message allows the recipient to keep track of
received parameters and allows him to re-request missing parameters
after a loss or timeout. The parameter microservice is documented at
https://mavlink.io/en/services/parameter.html

                param_id                  : Onboard parameter id, terminated by NULL if the length is less than 16 human-readable chars and WITHOUT null termination (NULL) byte if the length is exactly 16 chars - applications have to provide 16+1 bytes storage if the ID is stored as string (char)
                param_value               : Onboard parameter value (float)
                param_type                : Onboard parameter type. (uint8_t)
                param_count               : Total number of onboard parameters (uint16_t)
                param_index               : Index of this onboard parameter (uint16_t)

*/
mavlink20.messages.param_value = function(param_id, param_value, param_type, param_count, param_index) {

    this.format = '<fHH16sB';
    this.id = mavlink20.MAVLINK_MSG_ID_PARAM_VALUE;
    this.order_map = [3, 0, 4, 1, 2];
    this.crc_extra = 220;
    this.name = 'PARAM_VALUE';

    this.fieldnames = ['param_id', 'param_value', 'param_type', 'param_count', 'param_index'];


    this.set(arguments);

}
        mavlink20.messages.param_value.prototype = new mavlink20.message;
mavlink20.messages.param_value.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.param_value, this.param_count, this.param_index, this.param_id, this.param_type]));
}

/* 
Set a parameter value (write new value to permanent storage).
The receiving component should acknowledge the new parameter value by
broadcasting a PARAM_VALUE message (broadcasting ensures that multiple
GCS all have an up-to-date list of all parameters). If the sending GCS
did not receive a PARAM_VALUE within its timeout time, it should re-
send the PARAM_SET message. The parameter microservice is documented
at https://mavlink.io/en/services/parameter.html.

                target_system             : System ID (uint8_t)
                target_component          : Component ID (uint8_t)
                param_id                  : Onboard parameter id, terminated by NULL if the length is less than 16 human-readable chars and WITHOUT null termination (NULL) byte if the length is exactly 16 chars - applications have to provide 16+1 bytes storage if the ID is stored as string (char)
                param_value               : Onboard parameter value (float)
                param_type                : Onboard parameter type. (uint8_t)

*/
mavlink20.messages.param_set = function(target_system, target_component, param_id, param_value, param_type) {

    this.format = '<fBB16sB';
    this.id = mavlink20.MAVLINK_MSG_ID_PARAM_SET;
    this.order_map = [1, 2, 3, 0, 4];
    this.crc_extra = 168;
    this.name = 'PARAM_SET';

    this.fieldnames = ['target_system', 'target_component', 'param_id', 'param_value', 'param_type'];


    this.set(arguments);

}
        mavlink20.messages.param_set.prototype = new mavlink20.message;
mavlink20.messages.param_set.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.param_value, this.target_system, this.target_component, this.param_id, this.param_type]));
}

/* 
The global position, as returned by the Global Positioning System
(GPS). This is                 NOT the global position estimate of the
system, but rather a RAW sensor value. See message GLOBAL_POSITION_INT
for the global position estimate.

                time_usec                 : Timestamp (UNIX Epoch time or time since system boot). The receiving end can infer timestamp format (since 1.1.1970 or since system boot) by checking for the magnitude of the number. (uint64_t)
                fix_type                  : GPS fix type. (uint8_t)
                lat                       : Latitude (WGS84, EGM96 ellipsoid) (int32_t)
                lon                       : Longitude (WGS84, EGM96 ellipsoid) (int32_t)
                alt                       : Altitude (MSL). Positive for up. Note that virtually all GPS modules provide the MSL altitude in addition to the WGS84 altitude. (int32_t)
                eph                       : GPS HDOP horizontal dilution of position (unitless * 100). If unknown, set to: UINT16_MAX (uint16_t)
                epv                       : GPS VDOP vertical dilution of position (unitless * 100). If unknown, set to: UINT16_MAX (uint16_t)
                vel                       : GPS ground speed. If unknown, set to: UINT16_MAX (uint16_t)
                cog                       : Course over ground (NOT heading, but direction of movement) in degrees * 100, 0.0..359.99 degrees. If unknown, set to: UINT16_MAX (uint16_t)
                satellites_visible        : Number of satellites visible. If unknown, set to UINT8_MAX (uint8_t)
                alt_ellipsoid             : Altitude (above WGS84, EGM96 ellipsoid). Positive for up. (int32_t)
                h_acc                     : Position uncertainty. (uint32_t)
                v_acc                     : Altitude uncertainty. (uint32_t)
                vel_acc                   : Speed uncertainty. (uint32_t)
                hdg_acc                   : Heading / track uncertainty (uint32_t)
                yaw                       : Yaw in earth frame from north. Use 0 if this GPS does not provide yaw. Use UINT16_MAX if this GPS is configured to provide yaw and is currently unable to provide it. Use 36000 for north. (uint16_t)

*/
mavlink20.messages.gps_raw_int = function(time_usec, fix_type, lat, lon, alt, eph, epv, vel, cog, satellites_visible, alt_ellipsoid, h_acc, v_acc, vel_acc, hdg_acc, yaw) {

    this.format = '<QiiiHHHHBBiIIIIH';
    this.id = mavlink20.MAVLINK_MSG_ID_GPS_RAW_INT;
    this.order_map = [0, 8, 1, 2, 3, 4, 5, 6, 7, 9, 10, 11, 12, 13, 14, 15];
    this.crc_extra = 24;
    this.name = 'GPS_RAW_INT';

    this.fieldnames = ['time_usec', 'fix_type', 'lat', 'lon', 'alt', 'eph', 'epv', 'vel', 'cog', 'satellites_visible', 'alt_ellipsoid', 'h_acc', 'v_acc', 'vel_acc', 'hdg_acc', 'yaw'];


    this.set(arguments);

}
        mavlink20.messages.gps_raw_int.prototype = new mavlink20.message;
mavlink20.messages.gps_raw_int.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.time_usec, this.lat, this.lon, this.alt, this.eph, this.epv, this.vel, this.cog, this.fix_type, this.satellites_visible, this.alt_ellipsoid, this.h_acc, this.v_acc, this.vel_acc, this.hdg_acc, this.yaw]));
}

/* 
The positioning status, as reported by GPS. This message is intended
to display status information about each satellite visible to the
receiver. See message GLOBAL_POSITION_INT for the global position
estimate. This message can contain information for up to 20
satellites.

                satellites_visible        : Number of satellites visible (uint8_t)
                satellite_prn             : Global satellite ID (uint8_t)
                satellite_used            : 0: Satellite not used, 1: used for localization (uint8_t)
                satellite_elevation        : Elevation (0: right on top of receiver, 90: on the horizon) of satellite (uint8_t)
                satellite_azimuth         : Direction of satellite, 0: 0 deg, 255: 360 deg. (uint8_t)
                satellite_snr             : Signal to noise ratio of satellite (uint8_t)

*/
mavlink20.messages.gps_status = function(satellites_visible, satellite_prn, satellite_used, satellite_elevation, satellite_azimuth, satellite_snr) {

    this.format = '<B20s20s20s20s20s';
    this.id = mavlink20.MAVLINK_MSG_ID_GPS_STATUS;
    this.order_map = [0, 1, 2, 3, 4, 5];
    this.crc_extra = 23;
    this.name = 'GPS_STATUS';

    this.fieldnames = ['satellites_visible', 'satellite_prn', 'satellite_used', 'satellite_elevation', 'satellite_azimuth', 'satellite_snr'];


    this.set(arguments);

}
        mavlink20.messages.gps_status.prototype = new mavlink20.message;
mavlink20.messages.gps_status.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.satellites_visible, this.satellite_prn, this.satellite_used, this.satellite_elevation, this.satellite_azimuth, this.satellite_snr]));
}

/* 
The RAW IMU readings for the usual 9DOF sensor setup. This message
should contain the scaled values to the described units

                time_boot_ms              : Timestamp (time since system boot). (uint32_t)
                xacc                      : X acceleration (int16_t)
                yacc                      : Y acceleration (int16_t)
                zacc                      : Z acceleration (int16_t)
                xgyro                     : Angular speed around X axis (int16_t)
                ygyro                     : Angular speed around Y axis (int16_t)
                zgyro                     : Angular speed around Z axis (int16_t)
                xmag                      : X Magnetic field (int16_t)
                ymag                      : Y Magnetic field (int16_t)
                zmag                      : Z Magnetic field (int16_t)
                temperature               : Temperature, 0: IMU does not provide temperature values. If the IMU is at 0C it must send 1 (0.01C). (int16_t)

*/
mavlink20.messages.scaled_imu = function(time_boot_ms, xacc, yacc, zacc, xgyro, ygyro, zgyro, xmag, ymag, zmag, temperature) {

    this.format = '<Ihhhhhhhhhh';
    this.id = mavlink20.MAVLINK_MSG_ID_SCALED_IMU;
    this.order_map = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    this.crc_extra = 170;
    this.name = 'SCALED_IMU';

    this.fieldnames = ['time_boot_ms', 'xacc', 'yacc', 'zacc', 'xgyro', 'ygyro', 'zgyro', 'xmag', 'ymag', 'zmag', 'temperature'];


    this.set(arguments);

}
        mavlink20.messages.scaled_imu.prototype = new mavlink20.message;
mavlink20.messages.scaled_imu.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.time_boot_ms, this.xacc, this.yacc, this.zacc, this.xgyro, this.ygyro, this.zgyro, this.xmag, this.ymag, this.zmag, this.temperature]));
}

/* 
The RAW IMU readings for a 9DOF sensor, which is identified by the id
(default IMU1). This message should always contain the true raw values
without any scaling to allow data capture and system debugging.

                time_usec                 : Timestamp (UNIX Epoch time or time since system boot). The receiving end can infer timestamp format (since 1.1.1970 or since system boot) by checking for the magnitude of the number. (uint64_t)
                xacc                      : X acceleration (raw) (int16_t)
                yacc                      : Y acceleration (raw) (int16_t)
                zacc                      : Z acceleration (raw) (int16_t)
                xgyro                     : Angular speed around X axis (raw) (int16_t)
                ygyro                     : Angular speed around Y axis (raw) (int16_t)
                zgyro                     : Angular speed around Z axis (raw) (int16_t)
                xmag                      : X Magnetic field (raw) (int16_t)
                ymag                      : Y Magnetic field (raw) (int16_t)
                zmag                      : Z Magnetic field (raw) (int16_t)
                id                        : Id. Ids are numbered from 0 and map to IMUs numbered from 1 (e.g. IMU1 will have a message with id=0) (uint8_t)
                temperature               : Temperature, 0: IMU does not provide temperature values. If the IMU is at 0C it must send 1 (0.01C). (int16_t)

*/
mavlink20.messages.raw_imu = function(time_usec, xacc, yacc, zacc, xgyro, ygyro, zgyro, xmag, ymag, zmag, id, temperature) {

    this.format = '<QhhhhhhhhhBh';
    this.id = mavlink20.MAVLINK_MSG_ID_RAW_IMU;
    this.order_map = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
    this.crc_extra = 144;
    this.name = 'RAW_IMU';

    this.fieldnames = ['time_usec', 'xacc', 'yacc', 'zacc', 'xgyro', 'ygyro', 'zgyro', 'xmag', 'ymag', 'zmag', 'id', 'temperature'];


    this.set(arguments);

}
        mavlink20.messages.raw_imu.prototype = new mavlink20.message;
mavlink20.messages.raw_imu.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.time_usec, this.xacc, this.yacc, this.zacc, this.xgyro, this.ygyro, this.zgyro, this.xmag, this.ymag, this.zmag, this.id, this.temperature]));
}

/* 
The RAW pressure readings for the typical setup of one absolute
pressure and one differential pressure sensor. The sensor values
should be the raw, UNSCALED ADC values.

                time_usec                 : Timestamp (UNIX Epoch time or time since system boot). The receiving end can infer timestamp format (since 1.1.1970 or since system boot) by checking for the magnitude of the number. (uint64_t)
                press_abs                 : Absolute pressure (raw) (int16_t)
                press_diff1               : Differential pressure 1 (raw, 0 if nonexistent) (int16_t)
                press_diff2               : Differential pressure 2 (raw, 0 if nonexistent) (int16_t)
                temperature               : Raw Temperature measurement (raw) (int16_t)

*/
mavlink20.messages.raw_pressure = function(time_usec, press_abs, press_diff1, press_diff2, temperature) {

    this.format = '<Qhhhh';
    this.id = mavlink20.MAVLINK_MSG_ID_RAW_PRESSURE;
    this.order_map = [0, 1, 2, 3, 4];
    this.crc_extra = 67;
    this.name = 'RAW_PRESSURE';

    this.fieldnames = ['time_usec', 'press_abs', 'press_diff1', 'press_diff2', 'temperature'];


    this.set(arguments);

}
        mavlink20.messages.raw_pressure.prototype = new mavlink20.message;
mavlink20.messages.raw_pressure.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.time_usec, this.press_abs, this.press_diff1, this.press_diff2, this.temperature]));
}

/* 
The pressure readings for the typical setup of one absolute and
differential pressure sensor. The units are as specified in each
field.

                time_boot_ms              : Timestamp (time since system boot). (uint32_t)
                press_abs                 : Absolute pressure (float)
                press_diff                : Differential pressure 1 (float)
                temperature               : Absolute pressure temperature (int16_t)
                temperature_press_diff        : Differential pressure temperature (0, if not available). Report values of 0 (or 1) as 1 cdegC. (int16_t)

*/
mavlink20.messages.scaled_pressure = function(time_boot_ms, press_abs, press_diff, temperature, temperature_press_diff) {

    this.format = '<Iffhh';
    this.id = mavlink20.MAVLINK_MSG_ID_SCALED_PRESSURE;
    this.order_map = [0, 1, 2, 3, 4];
    this.crc_extra = 115;
    this.name = 'SCALED_PRESSURE';

    this.fieldnames = ['time_boot_ms', 'press_abs', 'press_diff', 'temperature', 'temperature_press_diff'];


    this.set(arguments);

}
        mavlink20.messages.scaled_pressure.prototype = new mavlink20.message;
mavlink20.messages.scaled_pressure.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.time_boot_ms, this.press_abs, this.press_diff, this.temperature, this.temperature_press_diff]));
}

/* 
The attitude in the aeronautical frame (right-handed, Z-down, Y-right,
X-front, ZYX, intrinsic).

                time_boot_ms              : Timestamp (time since system boot). (uint32_t)
                roll                      : Roll angle (-pi..+pi) (float)
                pitch                     : Pitch angle (-pi..+pi) (float)
                yaw                       : Yaw angle (-pi..+pi) (float)
                rollspeed                 : Roll angular speed (float)
                pitchspeed                : Pitch angular speed (float)
                yawspeed                  : Yaw angular speed (float)

*/
mavlink20.messages.attitude = function(time_boot_ms, roll, pitch, yaw, rollspeed, pitchspeed, yawspeed) {

    this.format = '<Iffffff';
    this.id = mavlink20.MAVLINK_MSG_ID_ATTITUDE;
    this.order_map = [0, 1, 2, 3, 4, 5, 6];
    this.crc_extra = 39;
    this.name = 'ATTITUDE';

    this.fieldnames = ['time_boot_ms', 'roll', 'pitch', 'yaw', 'rollspeed', 'pitchspeed', 'yawspeed'];


    this.set(arguments);

}
        mavlink20.messages.attitude.prototype = new mavlink20.message;
mavlink20.messages.attitude.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.time_boot_ms, this.roll, this.pitch, this.yaw, this.rollspeed, this.pitchspeed, this.yawspeed]));
}

/* 
The attitude in the aeronautical frame (right-handed, Z-down, X-front,
Y-right), expressed as quaternion. Quaternion order is w, x, y, z and
a zero rotation would be expressed as (1 0 0 0).

                time_boot_ms              : Timestamp (time since system boot). (uint32_t)
                q1                        : Quaternion component 1, w (1 in null-rotation) (float)
                q2                        : Quaternion component 2, x (0 in null-rotation) (float)
                q3                        : Quaternion component 3, y (0 in null-rotation) (float)
                q4                        : Quaternion component 4, z (0 in null-rotation) (float)
                rollspeed                 : Roll angular speed (float)
                pitchspeed                : Pitch angular speed (float)
                yawspeed                  : Yaw angular speed (float)
                repr_offset_q             : Rotation offset by which the attitude quaternion and angular speed vector should be rotated for user display (quaternion with [w, x, y, z] order, zero-rotation is [1, 0, 0, 0], send [0, 0, 0, 0] if field not supported). This field is intended for systems in which the reference attitude may change during flight. For example, tailsitters VTOLs rotate their reference attitude by 90 degrees between hover mode and fixed wing mode, thus repr_offset_q is equal to [1, 0, 0, 0] in hover mode and equal to [0.7071, 0, 0.7071, 0] in fixed wing mode. (float)

*/
mavlink20.messages.attitude_quaternion = function(time_boot_ms, q1, q2, q3, q4, rollspeed, pitchspeed, yawspeed, repr_offset_q) {

    this.format = '<Ifffffff4f';
    this.id = mavlink20.MAVLINK_MSG_ID_ATTITUDE_QUATERNION;
    this.order_map = [0, 1, 2, 3, 4, 5, 6, 7, 8];
    this.crc_extra = 246;
    this.name = 'ATTITUDE_QUATERNION';

    this.fieldnames = ['time_boot_ms', 'q1', 'q2', 'q3', 'q4', 'rollspeed', 'pitchspeed', 'yawspeed', 'repr_offset_q'];


    this.set(arguments);

}
        mavlink20.messages.attitude_quaternion.prototype = new mavlink20.message;
mavlink20.messages.attitude_quaternion.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.time_boot_ms, this.q1, this.q2, this.q3, this.q4, this.rollspeed, this.pitchspeed, this.yawspeed, this.repr_offset_q]));
}

/* 
The filtered local position (e.g. fused computer vision and
accelerometers). Coordinate frame is right-handed, Z-axis down
(aeronautical frame, NED / north-east-down convention)

                time_boot_ms              : Timestamp (time since system boot). (uint32_t)
                x                         : X Position (float)
                y                         : Y Position (float)
                z                         : Z Position (float)
                vx                        : X Speed (float)
                vy                        : Y Speed (float)
                vz                        : Z Speed (float)

*/
mavlink20.messages.local_position_ned = function(time_boot_ms, x, y, z, vx, vy, vz) {

    this.format = '<Iffffff';
    this.id = mavlink20.MAVLINK_MSG_ID_LOCAL_POSITION_NED;
    this.order_map = [0, 1, 2, 3, 4, 5, 6];
    this.crc_extra = 185;
    this.name = 'LOCAL_POSITION_NED';

    this.fieldnames = ['time_boot_ms', 'x', 'y', 'z', 'vx', 'vy', 'vz'];


    this.set(arguments);

}
        mavlink20.messages.local_position_ned.prototype = new mavlink20.message;
mavlink20.messages.local_position_ned.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.time_boot_ms, this.x, this.y, this.z, this.vx, this.vy, this.vz]));
}

/* 
The scaled values of the RC channels received: (-100%) -10000, (0%) 0,
(100%) 10000. Channels that are inactive should be set to INT16_MAX.

                time_boot_ms              : Timestamp (time since system boot). (uint32_t)
                port                      : Servo output port (set of 8 outputs = 1 port). Flight stacks running on Pixhawk should use: 0 = MAIN, 1 = AUX. (uint8_t)
                chan1_scaled              : RC channel 1 value scaled. (int16_t)
                chan2_scaled              : RC channel 2 value scaled. (int16_t)
                chan3_scaled              : RC channel 3 value scaled. (int16_t)
                chan4_scaled              : RC channel 4 value scaled. (int16_t)
                chan5_scaled              : RC channel 5 value scaled. (int16_t)
                chan6_scaled              : RC channel 6 value scaled. (int16_t)
                chan7_scaled              : RC channel 7 value scaled. (int16_t)
                chan8_scaled              : RC channel 8 value scaled. (int16_t)
                rssi                      : Receive signal strength indicator in device-dependent units/scale. Values: [0-254], UINT8_MAX: invalid/unknown. (uint8_t)

*/
mavlink20.messages.rc_channels_scaled = function(time_boot_ms, port, chan1_scaled, chan2_scaled, chan3_scaled, chan4_scaled, chan5_scaled, chan6_scaled, chan7_scaled, chan8_scaled, rssi) {

    this.format = '<IhhhhhhhhBB';
    this.id = mavlink20.MAVLINK_MSG_ID_RC_CHANNELS_SCALED;
    this.order_map = [0, 9, 1, 2, 3, 4, 5, 6, 7, 8, 10];
    this.crc_extra = 237;
    this.name = 'RC_CHANNELS_SCALED';

    this.fieldnames = ['time_boot_ms', 'port', 'chan1_scaled', 'chan2_scaled', 'chan3_scaled', 'chan4_scaled', 'chan5_scaled', 'chan6_scaled', 'chan7_scaled', 'chan8_scaled', 'rssi'];


    this.set(arguments);

}
        mavlink20.messages.rc_channels_scaled.prototype = new mavlink20.message;
mavlink20.messages.rc_channels_scaled.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.time_boot_ms, this.chan1_scaled, this.chan2_scaled, this.chan3_scaled, this.chan4_scaled, this.chan5_scaled, this.chan6_scaled, this.chan7_scaled, this.chan8_scaled, this.port, this.rssi]));
}

/* 
The RAW values of the RC channels received. The standard PPM
modulation is as follows: 1000 microseconds: 0%, 2000 microseconds:
100%. A value of UINT16_MAX implies the channel is unused. Individual
receivers/transmitters might violate this specification.

                time_boot_ms              : Timestamp (time since system boot). (uint32_t)
                port                      : Servo output port (set of 8 outputs = 1 port). Flight stacks running on Pixhawk should use: 0 = MAIN, 1 = AUX. (uint8_t)
                chan1_raw                 : RC channel 1 value. (uint16_t)
                chan2_raw                 : RC channel 2 value. (uint16_t)
                chan3_raw                 : RC channel 3 value. (uint16_t)
                chan4_raw                 : RC channel 4 value. (uint16_t)
                chan5_raw                 : RC channel 5 value. (uint16_t)
                chan6_raw                 : RC channel 6 value. (uint16_t)
                chan7_raw                 : RC channel 7 value. (uint16_t)
                chan8_raw                 : RC channel 8 value. (uint16_t)
                rssi                      : Receive signal strength indicator in device-dependent units/scale. Values: [0-254], UINT8_MAX: invalid/unknown. (uint8_t)

*/
mavlink20.messages.rc_channels_raw = function(time_boot_ms, port, chan1_raw, chan2_raw, chan3_raw, chan4_raw, chan5_raw, chan6_raw, chan7_raw, chan8_raw, rssi) {

    this.format = '<IHHHHHHHHBB';
    this.id = mavlink20.MAVLINK_MSG_ID_RC_CHANNELS_RAW;
    this.order_map = [0, 9, 1, 2, 3, 4, 5, 6, 7, 8, 10];
    this.crc_extra = 244;
    this.name = 'RC_CHANNELS_RAW';

    this.fieldnames = ['time_boot_ms', 'port', 'chan1_raw', 'chan2_raw', 'chan3_raw', 'chan4_raw', 'chan5_raw', 'chan6_raw', 'chan7_raw', 'chan8_raw', 'rssi'];


    this.set(arguments);

}
        mavlink20.messages.rc_channels_raw.prototype = new mavlink20.message;
mavlink20.messages.rc_channels_raw.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.time_boot_ms, this.chan1_raw, this.chan2_raw, this.chan3_raw, this.chan4_raw, this.chan5_raw, this.chan6_raw, this.chan7_raw, this.chan8_raw, this.port, this.rssi]));
}

/* 
Superseded by ACTUATOR_OUTPUT_STATUS. The RAW values of the servo
outputs (for RC input from the remote, use the RC_CHANNELS messages).
The standard PPM modulation is as follows: 1000 microseconds: 0%, 2000
microseconds: 100%.

                time_usec                 : Timestamp (UNIX Epoch time or time since system boot). The receiving end can infer timestamp format (since 1.1.1970 or since system boot) by checking for the magnitude of the number. (uint32_t)
                port                      : Servo output port (set of 8 outputs = 1 port). Flight stacks running on Pixhawk should use: 0 = MAIN, 1 = AUX. (uint8_t)
                servo1_raw                : Servo output 1 value (uint16_t)
                servo2_raw                : Servo output 2 value (uint16_t)
                servo3_raw                : Servo output 3 value (uint16_t)
                servo4_raw                : Servo output 4 value (uint16_t)
                servo5_raw                : Servo output 5 value (uint16_t)
                servo6_raw                : Servo output 6 value (uint16_t)
                servo7_raw                : Servo output 7 value (uint16_t)
                servo8_raw                : Servo output 8 value (uint16_t)
                servo9_raw                : Servo output 9 value (uint16_t)
                servo10_raw               : Servo output 10 value (uint16_t)
                servo11_raw               : Servo output 11 value (uint16_t)
                servo12_raw               : Servo output 12 value (uint16_t)
                servo13_raw               : Servo output 13 value (uint16_t)
                servo14_raw               : Servo output 14 value (uint16_t)
                servo15_raw               : Servo output 15 value (uint16_t)
                servo16_raw               : Servo output 16 value (uint16_t)

*/
mavlink20.messages.servo_output_raw = function(time_usec, port, servo1_raw, servo2_raw, servo3_raw, servo4_raw, servo5_raw, servo6_raw, servo7_raw, servo8_raw, servo9_raw, servo10_raw, servo11_raw, servo12_raw, servo13_raw, servo14_raw, servo15_raw, servo16_raw) {

    this.format = '<IHHHHHHHHBHHHHHHHH';
    this.id = mavlink20.MAVLINK_MSG_ID_SERVO_OUTPUT_RAW;
    this.order_map = [0, 9, 1, 2, 3, 4, 5, 6, 7, 8, 10, 11, 12, 13, 14, 15, 16, 17];
    this.crc_extra = 222;
    this.name = 'SERVO_OUTPUT_RAW';

    this.fieldnames = ['time_usec', 'port', 'servo1_raw', 'servo2_raw', 'servo3_raw', 'servo4_raw', 'servo5_raw', 'servo6_raw', 'servo7_raw', 'servo8_raw', 'servo9_raw', 'servo10_raw', 'servo11_raw', 'servo12_raw', 'servo13_raw', 'servo14_raw', 'servo15_raw', 'servo16_raw'];


    this.set(arguments);

}
        mavlink20.messages.servo_output_raw.prototype = new mavlink20.message;
mavlink20.messages.servo_output_raw.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.time_usec, this.servo1_raw, this.servo2_raw, this.servo3_raw, this.servo4_raw, this.servo5_raw, this.servo6_raw, this.servo7_raw, this.servo8_raw, this.port, this.servo9_raw, this.servo10_raw, this.servo11_raw, this.servo12_raw, this.servo13_raw, this.servo14_raw, this.servo15_raw, this.servo16_raw]));
}

/* 
Request a partial list of mission items from the system/component.
https://mavlink.io/en/services/mission.html. If start and end index
are the same, just send one waypoint.

                target_system             : System ID (uint8_t)
                target_component          : Component ID (uint8_t)
                start_index               : Start index (int16_t)
                end_index                 : End index, -1 by default (-1: send list to end). Else a valid index of the list (int16_t)
                mission_type              : Mission type. (uint8_t)

*/
mavlink20.messages.mission_request_partial_list = function(target_system, target_component, start_index, end_index, mission_type) {

    this.format = '<hhBBB';
    this.id = mavlink20.MAVLINK_MSG_ID_MISSION_REQUEST_PARTIAL_LIST;
    this.order_map = [2, 3, 0, 1, 4];
    this.crc_extra = 212;
    this.name = 'MISSION_REQUEST_PARTIAL_LIST';

    this.fieldnames = ['target_system', 'target_component', 'start_index', 'end_index', 'mission_type'];


    this.set(arguments);

}
        mavlink20.messages.mission_request_partial_list.prototype = new mavlink20.message;
mavlink20.messages.mission_request_partial_list.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.start_index, this.end_index, this.target_system, this.target_component, this.mission_type]));
}

/* 
This message is sent to the MAV to write a partial list. If start
index == end index, only one item will be transmitted / updated. If
the start index is NOT 0 and above the current list size, this request
should be REJECTED!

                target_system             : System ID (uint8_t)
                target_component          : Component ID (uint8_t)
                start_index               : Start index. Must be smaller / equal to the largest index of the current onboard list. (int16_t)
                end_index                 : End index, equal or greater than start index. (int16_t)
                mission_type              : Mission type. (uint8_t)

*/
mavlink20.messages.mission_write_partial_list = function(target_system, target_component, start_index, end_index, mission_type) {

    this.format = '<hhBBB';
    this.id = mavlink20.MAVLINK_MSG_ID_MISSION_WRITE_PARTIAL_LIST;
    this.order_map = [2, 3, 0, 1, 4];
    this.crc_extra = 9;
    this.name = 'MISSION_WRITE_PARTIAL_LIST';

    this.fieldnames = ['target_system', 'target_component', 'start_index', 'end_index', 'mission_type'];


    this.set(arguments);

}
        mavlink20.messages.mission_write_partial_list.prototype = new mavlink20.message;
mavlink20.messages.mission_write_partial_list.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.start_index, this.end_index, this.target_system, this.target_component, this.mission_type]));
}

/* 
Message encoding a mission item. This message is emitted to announce
the presence of a mission item and to set a mission item on the
system. The mission item can be either in x, y, z meters (type: LOCAL)
or x:lat, y:lon, z:altitude. Local frame is Z-down, right handed
(NED), global frame is Z-up, right handed (ENU). NaN may be used to
indicate an optional/default value (e.g. to use the system's current
latitude or yaw rather than a specific value). See also
https://mavlink.io/en/services/mission.html.

                target_system             : System ID (uint8_t)
                target_component          : Component ID (uint8_t)
                seq                       : Sequence (uint16_t)
                frame                     : The coordinate system of the waypoint. (uint8_t)
                command                   : The scheduled action for the waypoint. (uint16_t)
                current                   : false:0, true:1 (uint8_t)
                autocontinue              : Autocontinue to next waypoint. 0: false, 1: true. Set false to pause mission after the item completes. (uint8_t)
                param1                    : PARAM1, see MAV_CMD enum (float)
                param2                    : PARAM2, see MAV_CMD enum (float)
                param3                    : PARAM3, see MAV_CMD enum (float)
                param4                    : PARAM4, see MAV_CMD enum (float)
                x                         : PARAM5 / local: X coordinate, global: latitude (float)
                y                         : PARAM6 / local: Y coordinate, global: longitude (float)
                z                         : PARAM7 / local: Z coordinate, global: altitude (relative or absolute, depending on frame). (float)
                mission_type              : Mission type. (uint8_t)

*/
mavlink20.messages.mission_item = function(target_system, target_component, seq, frame, command, current, autocontinue, param1, param2, param3, param4, x, y, z, mission_type) {

    this.format = '<fffffffHHBBBBBB';
    this.id = mavlink20.MAVLINK_MSG_ID_MISSION_ITEM;
    this.order_map = [9, 10, 7, 11, 8, 12, 13, 0, 1, 2, 3, 4, 5, 6, 14];
    this.crc_extra = 254;
    this.name = 'MISSION_ITEM';

    this.fieldnames = ['target_system', 'target_component', 'seq', 'frame', 'command', 'current', 'autocontinue', 'param1', 'param2', 'param3', 'param4', 'x', 'y', 'z', 'mission_type'];


    this.set(arguments);

}
        mavlink20.messages.mission_item.prototype = new mavlink20.message;
mavlink20.messages.mission_item.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.param1, this.param2, this.param3, this.param4, this.x, this.y, this.z, this.seq, this.command, this.target_system, this.target_component, this.frame, this.current, this.autocontinue, this.mission_type]));
}

/* 
Request the information of the mission item with the sequence number
seq. The response of the system to this message should be a
MISSION_ITEM message. https://mavlink.io/en/services/mission.html

                target_system             : System ID (uint8_t)
                target_component          : Component ID (uint8_t)
                seq                       : Sequence (uint16_t)
                mission_type              : Mission type. (uint8_t)

*/
mavlink20.messages.mission_request = function(target_system, target_component, seq, mission_type) {

    this.format = '<HBBB';
    this.id = mavlink20.MAVLINK_MSG_ID_MISSION_REQUEST;
    this.order_map = [1, 2, 0, 3];
    this.crc_extra = 230;
    this.name = 'MISSION_REQUEST';

    this.fieldnames = ['target_system', 'target_component', 'seq', 'mission_type'];


    this.set(arguments);

}
        mavlink20.messages.mission_request.prototype = new mavlink20.message;
mavlink20.messages.mission_request.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.seq, this.target_system, this.target_component, this.mission_type]));
}

/* 
Set the mission item with sequence number seq as the current item and
emit MISSION_CURRENT (whether or not the mission number changed).
If a mission is currently being executed, the system will continue to
this new mission item on the shortest path, skipping any intermediate
mission items.         Note that mission jump repeat counters are not
reset (see MAV_CMD_DO_JUMP param2).          This message may trigger
a mission state-machine change on some systems: for example from
MISSION_STATE_NOT_STARTED or MISSION_STATE_PAUSED to
MISSION_STATE_ACTIVE.         If the system is in mission mode, on
those systems this command might therefore start, restart or resume
the mission.         If the system is not in mission mode this message
must not trigger a switch to mission mode.

                target_system             : System ID (uint8_t)
                target_component          : Component ID (uint8_t)
                seq                       : Sequence (uint16_t)

*/
mavlink20.messages.mission_set_current = function(target_system, target_component, seq) {

    this.format = '<HBB';
    this.id = mavlink20.MAVLINK_MSG_ID_MISSION_SET_CURRENT;
    this.order_map = [1, 2, 0];
    this.crc_extra = 28;
    this.name = 'MISSION_SET_CURRENT';

    this.fieldnames = ['target_system', 'target_component', 'seq'];


    this.set(arguments);

}
        mavlink20.messages.mission_set_current.prototype = new mavlink20.message;
mavlink20.messages.mission_set_current.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.seq, this.target_system, this.target_component]));
}

/* 
Message that announces the sequence number of the current target
mission item (that the system will fly towards/execute when the
mission is running).         This message should be streamed all the
time (nominally at 1Hz).         This message should be emitted
following a call to MAV_CMD_DO_SET_MISSION_CURRENT or
MISSION_SET_CURRENT.

                seq                       : Sequence (uint16_t)
                total                     : Total number of mission items on vehicle (on last item, sequence == total). If the autopilot stores its home location as part of the mission this will be excluded from the total. 0: Not supported, UINT16_MAX if no mission is present on the vehicle. (uint16_t)
                mission_state             : Mission state machine state. MISSION_STATE_UNKNOWN if state reporting not supported. (uint8_t)
                mission_mode              : Vehicle is in a mode that can execute mission items or suspended. 0: Unknown, 1: In mission mode, 2: Suspended (not in mission mode). (uint8_t)
                mission_id                : Id of current on-vehicle mission plan, or 0 if IDs are not supported or there is no mission loaded. GCS can use this to track changes to the mission plan type. The same value is returned on mission upload (in the MISSION_ACK). (uint32_t)
                fence_id                  : Id of current on-vehicle fence plan, or 0 if IDs are not supported or there is no fence loaded. GCS can use this to track changes to the fence plan type. The same value is returned on fence upload (in the MISSION_ACK). (uint32_t)
                rally_points_id           : Id of current on-vehicle rally point plan, or 0 if IDs are not supported or there are no rally points loaded. GCS can use this to track changes to the rally point plan type. The same value is returned on rally point upload (in the MISSION_ACK). (uint32_t)

*/
mavlink20.messages.mission_current = function(seq, total, mission_state, mission_mode, mission_id, fence_id, rally_points_id) {

    this.format = '<HHBBIII';
    this.id = mavlink20.MAVLINK_MSG_ID_MISSION_CURRENT;
    this.order_map = [0, 1, 2, 3, 4, 5, 6];
    this.crc_extra = 28;
    this.name = 'MISSION_CURRENT';

    this.fieldnames = ['seq', 'total', 'mission_state', 'mission_mode', 'mission_id', 'fence_id', 'rally_points_id'];


    this.set(arguments);

}
        mavlink20.messages.mission_current.prototype = new mavlink20.message;
mavlink20.messages.mission_current.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.seq, this.total, this.mission_state, this.mission_mode, this.mission_id, this.fence_id, this.rally_points_id]));
}

/* 
Request the overall list of mission items from the system/component.

                target_system             : System ID (uint8_t)
                target_component          : Component ID (uint8_t)
                mission_type              : Mission type. (uint8_t)

*/
mavlink20.messages.mission_request_list = function(target_system, target_component, mission_type) {

    this.format = '<BBB';
    this.id = mavlink20.MAVLINK_MSG_ID_MISSION_REQUEST_LIST;
    this.order_map = [0, 1, 2];
    this.crc_extra = 132;
    this.name = 'MISSION_REQUEST_LIST';

    this.fieldnames = ['target_system', 'target_component', 'mission_type'];


    this.set(arguments);

}
        mavlink20.messages.mission_request_list.prototype = new mavlink20.message;
mavlink20.messages.mission_request_list.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.target_system, this.target_component, this.mission_type]));
}

/* 
This message is emitted as response to MISSION_REQUEST_LIST by the MAV
and to initiate a write transaction. The GCS can then request the
individual mission item based on the knowledge of the total number of
waypoints.

                target_system             : System ID (uint8_t)
                target_component          : Component ID (uint8_t)
                count                     : Number of mission items in the sequence (uint16_t)
                mission_type              : Mission type. (uint8_t)
                opaque_id                 : Id of current on-vehicle mission, fence, or rally point plan (on download from vehicle).
        This field is used when downloading a plan from a vehicle to a GCS.
        0 on upload to the vehicle from GCS.
        0 if plan ids are not supported.
        The current on-vehicle plan ids are streamed in `MISSION_CURRENT`, allowing a GCS to determine if any part of the plan has changed and needs to be re-uploaded.
        The ids are recalculated by the vehicle when any part of the on-vehicle plan changes (when a new plan is uploaded, the vehicle returns the new id to the GCS in MISSION_ACK). (uint32_t)

*/
mavlink20.messages.mission_count = function(target_system, target_component, count, mission_type, opaque_id) {

    this.format = '<HBBBI';
    this.id = mavlink20.MAVLINK_MSG_ID_MISSION_COUNT;
    this.order_map = [1, 2, 0, 3, 4];
    this.crc_extra = 221;
    this.name = 'MISSION_COUNT';

    this.fieldnames = ['target_system', 'target_component', 'count', 'mission_type', 'opaque_id'];


    this.set(arguments);

}
        mavlink20.messages.mission_count.prototype = new mavlink20.message;
mavlink20.messages.mission_count.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.count, this.target_system, this.target_component, this.mission_type, this.opaque_id]));
}

/* 
Delete all mission items at once.

                target_system             : System ID (uint8_t)
                target_component          : Component ID (uint8_t)
                mission_type              : Mission type. (uint8_t)

*/
mavlink20.messages.mission_clear_all = function(target_system, target_component, mission_type) {

    this.format = '<BBB';
    this.id = mavlink20.MAVLINK_MSG_ID_MISSION_CLEAR_ALL;
    this.order_map = [0, 1, 2];
    this.crc_extra = 232;
    this.name = 'MISSION_CLEAR_ALL';

    this.fieldnames = ['target_system', 'target_component', 'mission_type'];


    this.set(arguments);

}
        mavlink20.messages.mission_clear_all.prototype = new mavlink20.message;
mavlink20.messages.mission_clear_all.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.target_system, this.target_component, this.mission_type]));
}

/* 
A certain mission item has been reached. The system will either hold
this position (or circle on the orbit) or (if the autocontinue on the
WP was set) continue to the next waypoint.

                seq                       : Sequence (uint16_t)

*/
mavlink20.messages.mission_item_reached = function(seq) {

    this.format = '<H';
    this.id = mavlink20.MAVLINK_MSG_ID_MISSION_ITEM_REACHED;
    this.order_map = [0];
    this.crc_extra = 11;
    this.name = 'MISSION_ITEM_REACHED';

    this.fieldnames = ['seq'];


    this.set(arguments);

}
        mavlink20.messages.mission_item_reached.prototype = new mavlink20.message;
mavlink20.messages.mission_item_reached.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.seq]));
}

/* 
Acknowledgment message during waypoint handling. The type field states
if this message is a positive ack (type=0) or if an error happened
(type=non-zero).

                target_system             : System ID (uint8_t)
                target_component          : Component ID (uint8_t)
                type                      : Mission result. (uint8_t)
                mission_type              : Mission type. (uint8_t)
                opaque_id                 : Id of new on-vehicle mission, fence, or rally point plan (on upload to vehicle).
        The id is calculated and returned by a vehicle when a new plan is uploaded by a GCS.
        The only requirement on the id is that it must change when there is any change to the on-vehicle plan type (there is no requirement that the id be globally unique).
        0 on download from the vehicle to the GCS (on download the ID is set in MISSION_COUNT).
        0 if plan ids are not supported.
        The current on-vehicle plan ids are streamed in `MISSION_CURRENT`, allowing a GCS to determine if any part of the plan has changed and needs to be re-uploaded. (uint32_t)

*/
mavlink20.messages.mission_ack = function(target_system, target_component, type, mission_type, opaque_id) {

    this.format = '<BBBBI';
    this.id = mavlink20.MAVLINK_MSG_ID_MISSION_ACK;
    this.order_map = [0, 1, 2, 3, 4];
    this.crc_extra = 153;
    this.name = 'MISSION_ACK';

    this.fieldnames = ['target_system', 'target_component', 'type', 'mission_type', 'opaque_id'];


    this.set(arguments);

}
        mavlink20.messages.mission_ack.prototype = new mavlink20.message;
mavlink20.messages.mission_ack.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.target_system, this.target_component, this.type, this.mission_type, this.opaque_id]));
}

/* 
Sets the GPS coordinates of the vehicle local origin (0,0,0) position.
Vehicle should emit GPS_GLOBAL_ORIGIN irrespective of whether the
origin is changed. This enables transform between the local coordinate
frame and the global (GPS) coordinate frame, which may be necessary
when (for example) indoor and outdoor settings are connected and the
MAV should move from in- to outdoor.

                target_system             : System ID (uint8_t)
                latitude                  : Latitude (WGS84) (int32_t)
                longitude                 : Longitude (WGS84) (int32_t)
                altitude                  : Altitude (MSL). Positive for up. (int32_t)
                time_usec                 : Timestamp (UNIX Epoch time or time since system boot). The receiving end can infer timestamp format (since 1.1.1970 or since system boot) by checking for the magnitude of the number. (uint64_t)

*/
mavlink20.messages.set_gps_global_origin = function(target_system, latitude, longitude, altitude, time_usec) {

    this.format = '<iiiBQ';
    this.id = mavlink20.MAVLINK_MSG_ID_SET_GPS_GLOBAL_ORIGIN;
    this.order_map = [3, 0, 1, 2, 4];
    this.crc_extra = 41;
    this.name = 'SET_GPS_GLOBAL_ORIGIN';

    this.fieldnames = ['target_system', 'latitude', 'longitude', 'altitude', 'time_usec'];


    this.set(arguments);

}
        mavlink20.messages.set_gps_global_origin.prototype = new mavlink20.message;
mavlink20.messages.set_gps_global_origin.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.latitude, this.longitude, this.altitude, this.target_system, this.time_usec]));
}

/* 
Publishes the GPS coordinates of the vehicle local origin (0,0,0)
position. Emitted whenever a new GPS-Local position mapping is
requested or set - e.g. following SET_GPS_GLOBAL_ORIGIN message.

                latitude                  : Latitude (WGS84) (int32_t)
                longitude                 : Longitude (WGS84) (int32_t)
                altitude                  : Altitude (MSL). Positive for up. (int32_t)
                time_usec                 : Timestamp (UNIX Epoch time or time since system boot). The receiving end can infer timestamp format (since 1.1.1970 or since system boot) by checking for the magnitude of the number. (uint64_t)

*/
mavlink20.messages.gps_global_origin = function(latitude, longitude, altitude, time_usec) {

    this.format = '<iiiQ';
    this.id = mavlink20.MAVLINK_MSG_ID_GPS_GLOBAL_ORIGIN;
    this.order_map = [0, 1, 2, 3];
    this.crc_extra = 39;
    this.name = 'GPS_GLOBAL_ORIGIN';

    this.fieldnames = ['latitude', 'longitude', 'altitude', 'time_usec'];


    this.set(arguments);

}
        mavlink20.messages.gps_global_origin.prototype = new mavlink20.message;
mavlink20.messages.gps_global_origin.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.latitude, this.longitude, this.altitude, this.time_usec]));
}

/* 
Bind a RC channel to a parameter. The parameter should change
according to the RC channel value.

                target_system             : System ID (uint8_t)
                target_component          : Component ID (uint8_t)
                param_id                  : Onboard parameter id, terminated by NULL if the length is less than 16 human-readable chars and WITHOUT null termination (NULL) byte if the length is exactly 16 chars - applications have to provide 16+1 bytes storage if the ID is stored as string (char)
                param_index               : Parameter index. Send -1 to use the param ID field as identifier (else the param id will be ignored), send -2 to disable any existing map for this rc_channel_index. (int16_t)
                parameter_rc_channel_index        : Index of parameter RC channel. Not equal to the RC channel id. Typically corresponds to a potentiometer-knob on the RC. (uint8_t)
                param_value0              : Initial parameter value (float)
                scale                     : Scale, maps the RC range [-1, 1] to a parameter value (float)
                param_value_min           : Minimum param value. The protocol does not define if this overwrites an onboard minimum value. (Depends on implementation) (float)
                param_value_max           : Maximum param value. The protocol does not define if this overwrites an onboard maximum value. (Depends on implementation) (float)

*/
mavlink20.messages.param_map_rc = function(target_system, target_component, param_id, param_index, parameter_rc_channel_index, param_value0, scale, param_value_min, param_value_max) {

    this.format = '<ffffhBB16sB';
    this.id = mavlink20.MAVLINK_MSG_ID_PARAM_MAP_RC;
    this.order_map = [5, 6, 7, 4, 8, 0, 1, 2, 3];
    this.crc_extra = 78;
    this.name = 'PARAM_MAP_RC';

    this.fieldnames = ['target_system', 'target_component', 'param_id', 'param_index', 'parameter_rc_channel_index', 'param_value0', 'scale', 'param_value_min', 'param_value_max'];


    this.set(arguments);

}
        mavlink20.messages.param_map_rc.prototype = new mavlink20.message;
mavlink20.messages.param_map_rc.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.param_value0, this.scale, this.param_value_min, this.param_value_max, this.param_index, this.target_system, this.target_component, this.param_id, this.parameter_rc_channel_index]));
}

/* 
Request the information of the mission item with the sequence number
seq. The response of the system to this message should be a
MISSION_ITEM_INT message. https://mavlink.io/en/services/mission.html

                target_system             : System ID (uint8_t)
                target_component          : Component ID (uint8_t)
                seq                       : Sequence (uint16_t)
                mission_type              : Mission type. (uint8_t)

*/
mavlink20.messages.mission_request_int = function(target_system, target_component, seq, mission_type) {

    this.format = '<HBBB';
    this.id = mavlink20.MAVLINK_MSG_ID_MISSION_REQUEST_INT;
    this.order_map = [1, 2, 0, 3];
    this.crc_extra = 196;
    this.name = 'MISSION_REQUEST_INT';

    this.fieldnames = ['target_system', 'target_component', 'seq', 'mission_type'];


    this.set(arguments);

}
        mavlink20.messages.mission_request_int.prototype = new mavlink20.message;
mavlink20.messages.mission_request_int.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.seq, this.target_system, this.target_component, this.mission_type]));
}

/* 
Set a safety zone (volume), which is defined by two corners of a cube.
This message can be used to tell the MAV which setpoints/waypoints to
accept and which to reject. Safety areas are often enforced by
national or competition regulations.

                target_system             : System ID (uint8_t)
                target_component          : Component ID (uint8_t)
                frame                     : Coordinate frame. Can be either global, GPS, right-handed with Z axis up or local, right handed, Z axis down. (uint8_t)
                p1x                       : x position 1 / Latitude 1 (float)
                p1y                       : y position 1 / Longitude 1 (float)
                p1z                       : z position 1 / Altitude 1 (float)
                p2x                       : x position 2 / Latitude 2 (float)
                p2y                       : y position 2 / Longitude 2 (float)
                p2z                       : z position 2 / Altitude 2 (float)

*/
mavlink20.messages.safety_set_allowed_area = function(target_system, target_component, frame, p1x, p1y, p1z, p2x, p2y, p2z) {

    this.format = '<ffffffBBB';
    this.id = mavlink20.MAVLINK_MSG_ID_SAFETY_SET_ALLOWED_AREA;
    this.order_map = [6, 7, 8, 0, 1, 2, 3, 4, 5];
    this.crc_extra = 15;
    this.name = 'SAFETY_SET_ALLOWED_AREA';

    this.fieldnames = ['target_system', 'target_component', 'frame', 'p1x', 'p1y', 'p1z', 'p2x', 'p2y', 'p2z'];


    this.set(arguments);

}
        mavlink20.messages.safety_set_allowed_area.prototype = new mavlink20.message;
mavlink20.messages.safety_set_allowed_area.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.p1x, this.p1y, this.p1z, this.p2x, this.p2y, this.p2z, this.target_system, this.target_component, this.frame]));
}

/* 
Read out the safety zone the MAV currently assumes.

                frame                     : Coordinate frame. Can be either global, GPS, right-handed with Z axis up or local, right handed, Z axis down. (uint8_t)
                p1x                       : x position 1 / Latitude 1 (float)
                p1y                       : y position 1 / Longitude 1 (float)
                p1z                       : z position 1 / Altitude 1 (float)
                p2x                       : x position 2 / Latitude 2 (float)
                p2y                       : y position 2 / Longitude 2 (float)
                p2z                       : z position 2 / Altitude 2 (float)

*/
mavlink20.messages.safety_allowed_area = function(frame, p1x, p1y, p1z, p2x, p2y, p2z) {

    this.format = '<ffffffB';
    this.id = mavlink20.MAVLINK_MSG_ID_SAFETY_ALLOWED_AREA;
    this.order_map = [6, 0, 1, 2, 3, 4, 5];
    this.crc_extra = 3;
    this.name = 'SAFETY_ALLOWED_AREA';

    this.fieldnames = ['frame', 'p1x', 'p1y', 'p1z', 'p2x', 'p2y', 'p2z'];


    this.set(arguments);

}
        mavlink20.messages.safety_allowed_area.prototype = new mavlink20.message;
mavlink20.messages.safety_allowed_area.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.p1x, this.p1y, this.p1z, this.p2x, this.p2y, this.p2z, this.frame]));
}

/* 
The attitude in the aeronautical frame (right-handed, Z-down, X-front,
Y-right), expressed as quaternion. Quaternion order is w, x, y, z and
a zero rotation would be expressed as (1 0 0 0).

                time_usec                 : Timestamp (UNIX Epoch time or time since system boot). The receiving end can infer timestamp format (since 1.1.1970 or since system boot) by checking for the magnitude of the number. (uint64_t)
                q                         : Quaternion components, w, x, y, z (1 0 0 0 is the null-rotation) (float)
                rollspeed                 : Roll angular speed (float)
                pitchspeed                : Pitch angular speed (float)
                yawspeed                  : Yaw angular speed (float)
                covariance                : Row-major representation of a 3x3 attitude covariance matrix (states: roll, pitch, yaw; first three entries are the first ROW, next three entries are the second row, etc.). If unknown, assign NaN value to first element in the array. (float)

*/
mavlink20.messages.attitude_quaternion_cov = function(time_usec, q, rollspeed, pitchspeed, yawspeed, covariance) {

    this.format = '<Q4ffff9f';
    this.id = mavlink20.MAVLINK_MSG_ID_ATTITUDE_QUATERNION_COV;
    this.order_map = [0, 1, 2, 3, 4, 5];
    this.crc_extra = 167;
    this.name = 'ATTITUDE_QUATERNION_COV';

    this.fieldnames = ['time_usec', 'q', 'rollspeed', 'pitchspeed', 'yawspeed', 'covariance'];


    this.set(arguments);

}
        mavlink20.messages.attitude_quaternion_cov.prototype = new mavlink20.message;
mavlink20.messages.attitude_quaternion_cov.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.time_usec, this.q, this.rollspeed, this.pitchspeed, this.yawspeed, this.covariance]));
}

/* 
The state of the navigation and position controller.

                nav_roll                  : Current desired roll (float)
                nav_pitch                 : Current desired pitch (float)
                nav_bearing               : Current desired heading (int16_t)
                target_bearing            : Bearing to current waypoint/target (int16_t)
                wp_dist                   : Distance to active waypoint (uint16_t)
                alt_error                 : Current altitude error (float)
                aspd_error                : Current airspeed error (float)
                xtrack_error              : Current crosstrack error on x-y plane (float)

*/
mavlink20.messages.nav_controller_output = function(nav_roll, nav_pitch, nav_bearing, target_bearing, wp_dist, alt_error, aspd_error, xtrack_error) {

    this.format = '<fffffhhH';
    this.id = mavlink20.MAVLINK_MSG_ID_NAV_CONTROLLER_OUTPUT;
    this.order_map = [0, 1, 5, 6, 7, 2, 3, 4];
    this.crc_extra = 183;
    this.name = 'NAV_CONTROLLER_OUTPUT';

    this.fieldnames = ['nav_roll', 'nav_pitch', 'nav_bearing', 'target_bearing', 'wp_dist', 'alt_error', 'aspd_error', 'xtrack_error'];


    this.set(arguments);

}
        mavlink20.messages.nav_controller_output.prototype = new mavlink20.message;
mavlink20.messages.nav_controller_output.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.nav_roll, this.nav_pitch, this.alt_error, this.aspd_error, this.xtrack_error, this.nav_bearing, this.target_bearing, this.wp_dist]));
}

/* 
The filtered global position (e.g. fused GPS and accelerometers). The
position is in GPS-frame (right-handed, Z-up). It  is designed as
scaled integer message since the resolution of float is not
sufficient. NOTE: This message is intended for onboard networks /
companion computers and higher-bandwidth links and optimized for
accuracy and completeness. Please use the GLOBAL_POSITION_INT message
for a minimal subset.

                time_usec                 : Timestamp (UNIX Epoch time or time since system boot). The receiving end can infer timestamp format (since 1.1.1970 or since system boot) by checking for the magnitude of the number. (uint64_t)
                estimator_type            : Class id of the estimator this estimate originated from. (uint8_t)
                lat                       : Latitude (int32_t)
                lon                       : Longitude (int32_t)
                alt                       : Altitude in meters above MSL (int32_t)
                relative_alt              : Altitude above ground (int32_t)
                vx                        : Ground X Speed (Latitude) (float)
                vy                        : Ground Y Speed (Longitude) (float)
                vz                        : Ground Z Speed (Altitude) (float)
                covariance                : Row-major representation of a 6x6 position and velocity 6x6 cross-covariance matrix (states: lat, lon, alt, vx, vy, vz; first six entries are the first ROW, next six entries are the second row, etc.). If unknown, assign NaN value to first element in the array. (float)

*/
mavlink20.messages.global_position_int_cov = function(time_usec, estimator_type, lat, lon, alt, relative_alt, vx, vy, vz, covariance) {

    this.format = '<Qiiiifff36fB';
    this.id = mavlink20.MAVLINK_MSG_ID_GLOBAL_POSITION_INT_COV;
    this.order_map = [0, 9, 1, 2, 3, 4, 5, 6, 7, 8];
    this.crc_extra = 119;
    this.name = 'GLOBAL_POSITION_INT_COV';

    this.fieldnames = ['time_usec', 'estimator_type', 'lat', 'lon', 'alt', 'relative_alt', 'vx', 'vy', 'vz', 'covariance'];


    this.set(arguments);

}
        mavlink20.messages.global_position_int_cov.prototype = new mavlink20.message;
mavlink20.messages.global_position_int_cov.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.time_usec, this.lat, this.lon, this.alt, this.relative_alt, this.vx, this.vy, this.vz, this.covariance, this.estimator_type]));
}

/* 
The filtered local position (e.g. fused computer vision and
accelerometers). Coordinate frame is right-handed, Z-axis down
(aeronautical frame, NED / north-east-down convention)

                time_usec                 : Timestamp (UNIX Epoch time or time since system boot). The receiving end can infer timestamp format (since 1.1.1970 or since system boot) by checking for the magnitude of the number. (uint64_t)
                estimator_type            : Class id of the estimator this estimate originated from. (uint8_t)
                x                         : X Position (float)
                y                         : Y Position (float)
                z                         : Z Position (float)
                vx                        : X Speed (float)
                vy                        : Y Speed (float)
                vz                        : Z Speed (float)
                ax                        : X Acceleration (float)
                ay                        : Y Acceleration (float)
                az                        : Z Acceleration (float)
                covariance                : Row-major representation of position, velocity and acceleration 9x9 cross-covariance matrix upper right triangle (states: x, y, z, vx, vy, vz, ax, ay, az; first nine entries are the first ROW, next eight entries are the second row, etc.). If unknown, assign NaN value to first element in the array. (float)

*/
mavlink20.messages.local_position_ned_cov = function(time_usec, estimator_type, x, y, z, vx, vy, vz, ax, ay, az, covariance) {

    this.format = '<Qfffffffff45fB';
    this.id = mavlink20.MAVLINK_MSG_ID_LOCAL_POSITION_NED_COV;
    this.order_map = [0, 11, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    this.crc_extra = 191;
    this.name = 'LOCAL_POSITION_NED_COV';

    this.fieldnames = ['time_usec', 'estimator_type', 'x', 'y', 'z', 'vx', 'vy', 'vz', 'ax', 'ay', 'az', 'covariance'];


    this.set(arguments);

}
        mavlink20.messages.local_position_ned_cov.prototype = new mavlink20.message;
mavlink20.messages.local_position_ned_cov.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.time_usec, this.x, this.y, this.z, this.vx, this.vy, this.vz, this.ax, this.ay, this.az, this.covariance, this.estimator_type]));
}

/* 
The PPM values of the RC channels received. The standard PPM
modulation is as follows: 1000 microseconds: 0%, 2000 microseconds:
100%.  A value of UINT16_MAX implies the channel is unused. Individual
receivers/transmitters might violate this specification.

                time_boot_ms              : Timestamp (time since system boot). (uint32_t)
                chancount                 : Total number of RC channels being received. This can be larger than 18, indicating that more channels are available but not given in this message. This value should be 0 when no RC channels are available. (uint8_t)
                chan1_raw                 : RC channel 1 value. (uint16_t)
                chan2_raw                 : RC channel 2 value. (uint16_t)
                chan3_raw                 : RC channel 3 value. (uint16_t)
                chan4_raw                 : RC channel 4 value. (uint16_t)
                chan5_raw                 : RC channel 5 value. (uint16_t)
                chan6_raw                 : RC channel 6 value. (uint16_t)
                chan7_raw                 : RC channel 7 value. (uint16_t)
                chan8_raw                 : RC channel 8 value. (uint16_t)
                chan9_raw                 : RC channel 9 value. (uint16_t)
                chan10_raw                : RC channel 10 value. (uint16_t)
                chan11_raw                : RC channel 11 value. (uint16_t)
                chan12_raw                : RC channel 12 value. (uint16_t)
                chan13_raw                : RC channel 13 value. (uint16_t)
                chan14_raw                : RC channel 14 value. (uint16_t)
                chan15_raw                : RC channel 15 value. (uint16_t)
                chan16_raw                : RC channel 16 value. (uint16_t)
                chan17_raw                : RC channel 17 value. (uint16_t)
                chan18_raw                : RC channel 18 value. (uint16_t)
                rssi                      : Receive signal strength indicator in device-dependent units/scale. Values: [0-254], UINT8_MAX: invalid/unknown. (uint8_t)

*/
mavlink20.messages.rc_channels = function(time_boot_ms, chancount, chan1_raw, chan2_raw, chan3_raw, chan4_raw, chan5_raw, chan6_raw, chan7_raw, chan8_raw, chan9_raw, chan10_raw, chan11_raw, chan12_raw, chan13_raw, chan14_raw, chan15_raw, chan16_raw, chan17_raw, chan18_raw, rssi) {

    this.format = '<IHHHHHHHHHHHHHHHHHHBB';
    this.id = mavlink20.MAVLINK_MSG_ID_RC_CHANNELS;
    this.order_map = [0, 19, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 20];
    this.crc_extra = 118;
    this.name = 'RC_CHANNELS';

    this.fieldnames = ['time_boot_ms', 'chancount', 'chan1_raw', 'chan2_raw', 'chan3_raw', 'chan4_raw', 'chan5_raw', 'chan6_raw', 'chan7_raw', 'chan8_raw', 'chan9_raw', 'chan10_raw', 'chan11_raw', 'chan12_raw', 'chan13_raw', 'chan14_raw', 'chan15_raw', 'chan16_raw', 'chan17_raw', 'chan18_raw', 'rssi'];


    this.set(arguments);

}
        mavlink20.messages.rc_channels.prototype = new mavlink20.message;
mavlink20.messages.rc_channels.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.time_boot_ms, this.chan1_raw, this.chan2_raw, this.chan3_raw, this.chan4_raw, this.chan5_raw, this.chan6_raw, this.chan7_raw, this.chan8_raw, this.chan9_raw, this.chan10_raw, this.chan11_raw, this.chan12_raw, this.chan13_raw, this.chan14_raw, this.chan15_raw, this.chan16_raw, this.chan17_raw, this.chan18_raw, this.chancount, this.rssi]));
}

/* 
Request a data stream.

                target_system             : The target requested to send the message stream. (uint8_t)
                target_component          : The target requested to send the message stream. (uint8_t)
                req_stream_id             : The ID of the requested data stream (uint8_t)
                req_message_rate          : The requested message rate (uint16_t)
                start_stop                : 1 to start sending, 0 to stop sending. (uint8_t)

*/
mavlink20.messages.request_data_stream = function(target_system, target_component, req_stream_id, req_message_rate, start_stop) {

    this.format = '<HBBBB';
    this.id = mavlink20.MAVLINK_MSG_ID_REQUEST_DATA_STREAM;
    this.order_map = [1, 2, 3, 0, 4];
    this.crc_extra = 148;
    this.name = 'REQUEST_DATA_STREAM';

    this.fieldnames = ['target_system', 'target_component', 'req_stream_id', 'req_message_rate', 'start_stop'];


    this.set(arguments);

}
        mavlink20.messages.request_data_stream.prototype = new mavlink20.message;
mavlink20.messages.request_data_stream.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.req_message_rate, this.target_system, this.target_component, this.req_stream_id, this.start_stop]));
}

/* 
Data stream status information.

                stream_id                 : The ID of the requested data stream (uint8_t)
                message_rate              : The message rate (uint16_t)
                on_off                    : 1 stream is enabled, 0 stream is stopped. (uint8_t)

*/
mavlink20.messages.data_stream = function(stream_id, message_rate, on_off) {

    this.format = '<HBB';
    this.id = mavlink20.MAVLINK_MSG_ID_DATA_STREAM;
    this.order_map = [1, 0, 2];
    this.crc_extra = 21;
    this.name = 'DATA_STREAM';

    this.fieldnames = ['stream_id', 'message_rate', 'on_off'];


    this.set(arguments);

}
        mavlink20.messages.data_stream.prototype = new mavlink20.message;
mavlink20.messages.data_stream.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.message_rate, this.stream_id, this.on_off]));
}

/* 
Manual (joystick) control message.         This message represents
movement axes and button using standard joystick axes nomenclature.
Unused axes can be disabled and buttons states are transmitted as
individual on/off bits of a bitmask. For more information see
https://mavlink.io/en/manual_control.html

                target                    : The system to be controlled. (uint8_t)
                x                         : X-axis, normalized to the range [-1000,1000]. A value of INT16_MAX indicates that this axis is invalid. Generally corresponds to forward(1000)-backward(-1000) movement on a joystick and the pitch of a vehicle. (int16_t)
                y                         : Y-axis, normalized to the range [-1000,1000]. A value of INT16_MAX indicates that this axis is invalid. Generally corresponds to left(-1000)-right(1000) movement on a joystick and the roll of a vehicle. (int16_t)
                z                         : Z-axis, normalized to the range [-1000,1000]. A value of INT16_MAX indicates that this axis is invalid. Generally corresponds to a separate slider movement with maximum being 1000 and minimum being -1000 on a joystick and the thrust of a vehicle. Positive values are positive thrust, negative values are negative thrust. (int16_t)
                r                         : R-axis, normalized to the range [-1000,1000]. A value of INT16_MAX indicates that this axis is invalid. Generally corresponds to a twisting of the joystick, with counter-clockwise being 1000 and clockwise being -1000, and the yaw of a vehicle. (int16_t)
                buttons                   : A bitfield corresponding to the joystick buttons' 0-15 current state, 1 for pressed, 0 for released. The lowest bit corresponds to Button 1. (uint16_t)
                buttons2                  : A bitfield corresponding to the joystick buttons' 16-31 current state, 1 for pressed, 0 for released. The lowest bit corresponds to Button 16. (uint16_t)
                enabled_extensions        : Set bits to 1 to indicate which of the following extension fields contain valid data: bit 0: pitch, bit 1: roll, bit 2: aux1, bit 3: aux2, bit 4: aux3, bit 5: aux4, bit 6: aux5, bit 7: aux6 (uint8_t)
                s                         : Pitch-only-axis, normalized to the range [-1000,1000]. Generally corresponds to pitch on vehicles with additional degrees of freedom. Valid if bit 0 of enabled_extensions field is set. Set to 0 if invalid. (int16_t)
                t                         : Roll-only-axis, normalized to the range [-1000,1000]. Generally corresponds to roll on vehicles with additional degrees of freedom. Valid if bit 1 of enabled_extensions field is set. Set to 0 if invalid. (int16_t)
                aux1                      : Aux continuous input field 1. Normalized in the range [-1000,1000]. Purpose defined by recipient. Valid data if bit 2 of enabled_extensions field is set. 0 if bit 2 is unset. (int16_t)
                aux2                      : Aux continuous input field 2. Normalized in the range [-1000,1000]. Purpose defined by recipient. Valid data if bit 3 of enabled_extensions field is set. 0 if bit 3 is unset. (int16_t)
                aux3                      : Aux continuous input field 3. Normalized in the range [-1000,1000]. Purpose defined by recipient. Valid data if bit 4 of enabled_extensions field is set. 0 if bit 4 is unset. (int16_t)
                aux4                      : Aux continuous input field 4. Normalized in the range [-1000,1000]. Purpose defined by recipient. Valid data if bit 5 of enabled_extensions field is set. 0 if bit 5 is unset. (int16_t)
                aux5                      : Aux continuous input field 5. Normalized in the range [-1000,1000]. Purpose defined by recipient. Valid data if bit 6 of enabled_extensions field is set. 0 if bit 6 is unset. (int16_t)
                aux6                      : Aux continuous input field 6. Normalized in the range [-1000,1000]. Purpose defined by recipient. Valid data if bit 7 of enabled_extensions field is set. 0 if bit 7 is unset. (int16_t)

*/
mavlink20.messages.manual_control = function(target, x, y, z, r, buttons, buttons2, enabled_extensions, s, t, aux1, aux2, aux3, aux4, aux5, aux6) {

    this.format = '<hhhhHBHBhhhhhhhh';
    this.id = mavlink20.MAVLINK_MSG_ID_MANUAL_CONTROL;
    this.order_map = [5, 0, 1, 2, 3, 4, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
    this.crc_extra = 243;
    this.name = 'MANUAL_CONTROL';

    this.fieldnames = ['target', 'x', 'y', 'z', 'r', 'buttons', 'buttons2', 'enabled_extensions', 's', 't', 'aux1', 'aux2', 'aux3', 'aux4', 'aux5', 'aux6'];


    this.set(arguments);

}
        mavlink20.messages.manual_control.prototype = new mavlink20.message;
mavlink20.messages.manual_control.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.x, this.y, this.z, this.r, this.buttons, this.target, this.buttons2, this.enabled_extensions, this.s, this.t, this.aux1, this.aux2, this.aux3, this.aux4, this.aux5, this.aux6]));
}

/* 
The RAW values of the RC channels sent to the MAV to override info
received from the RC radio. The standard PPM modulation is as follows:
1000 microseconds: 0%, 2000 microseconds: 100%. Individual
receivers/transmitters might violate this specification.  Note
carefully the semantic differences between the first 8 channels and
the subsequent channels

                target_system             : System ID (uint8_t)
                target_component          : Component ID (uint8_t)
                chan1_raw                 : RC channel 1 value. A value of UINT16_MAX means to ignore this field. A value of 0 means to release this channel back to the RC radio. (uint16_t)
                chan2_raw                 : RC channel 2 value. A value of UINT16_MAX means to ignore this field. A value of 0 means to release this channel back to the RC radio. (uint16_t)
                chan3_raw                 : RC channel 3 value. A value of UINT16_MAX means to ignore this field. A value of 0 means to release this channel back to the RC radio. (uint16_t)
                chan4_raw                 : RC channel 4 value. A value of UINT16_MAX means to ignore this field. A value of 0 means to release this channel back to the RC radio. (uint16_t)
                chan5_raw                 : RC channel 5 value. A value of UINT16_MAX means to ignore this field. A value of 0 means to release this channel back to the RC radio. (uint16_t)
                chan6_raw                 : RC channel 6 value. A value of UINT16_MAX means to ignore this field. A value of 0 means to release this channel back to the RC radio. (uint16_t)
                chan7_raw                 : RC channel 7 value. A value of UINT16_MAX means to ignore this field. A value of 0 means to release this channel back to the RC radio. (uint16_t)
                chan8_raw                 : RC channel 8 value. A value of UINT16_MAX means to ignore this field. A value of 0 means to release this channel back to the RC radio. (uint16_t)
                chan9_raw                 : RC channel 9 value. A value of 0 or UINT16_MAX means to ignore this field. A value of UINT16_MAX-1 means to release this channel back to the RC radio. (uint16_t)
                chan10_raw                : RC channel 10 value. A value of 0 or UINT16_MAX means to ignore this field. A value of UINT16_MAX-1 means to release this channel back to the RC radio. (uint16_t)
                chan11_raw                : RC channel 11 value. A value of 0 or UINT16_MAX means to ignore this field. A value of UINT16_MAX-1 means to release this channel back to the RC radio. (uint16_t)
                chan12_raw                : RC channel 12 value. A value of 0 or UINT16_MAX means to ignore this field. A value of UINT16_MAX-1 means to release this channel back to the RC radio. (uint16_t)
                chan13_raw                : RC channel 13 value. A value of 0 or UINT16_MAX means to ignore this field. A value of UINT16_MAX-1 means to release this channel back to the RC radio. (uint16_t)
                chan14_raw                : RC channel 14 value. A value of 0 or UINT16_MAX means to ignore this field. A value of UINT16_MAX-1 means to release this channel back to the RC radio. (uint16_t)
                chan15_raw                : RC channel 15 value. A value of 0 or UINT16_MAX means to ignore this field. A value of UINT16_MAX-1 means to release this channel back to the RC radio. (uint16_t)
                chan16_raw                : RC channel 16 value. A value of 0 or UINT16_MAX means to ignore this field. A value of UINT16_MAX-1 means to release this channel back to the RC radio. (uint16_t)
                chan17_raw                : RC channel 17 value. A value of 0 or UINT16_MAX means to ignore this field. A value of UINT16_MAX-1 means to release this channel back to the RC radio. (uint16_t)
                chan18_raw                : RC channel 18 value. A value of 0 or UINT16_MAX means to ignore this field. A value of UINT16_MAX-1 means to release this channel back to the RC radio. (uint16_t)

*/
mavlink20.messages.rc_channels_override = function(target_system, target_component, chan1_raw, chan2_raw, chan3_raw, chan4_raw, chan5_raw, chan6_raw, chan7_raw, chan8_raw, chan9_raw, chan10_raw, chan11_raw, chan12_raw, chan13_raw, chan14_raw, chan15_raw, chan16_raw, chan17_raw, chan18_raw) {

    this.format = '<HHHHHHHHBBHHHHHHHHHH';
    this.id = mavlink20.MAVLINK_MSG_ID_RC_CHANNELS_OVERRIDE;
    this.order_map = [8, 9, 0, 1, 2, 3, 4, 5, 6, 7, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19];
    this.crc_extra = 124;
    this.name = 'RC_CHANNELS_OVERRIDE';

    this.fieldnames = ['target_system', 'target_component', 'chan1_raw', 'chan2_raw', 'chan3_raw', 'chan4_raw', 'chan5_raw', 'chan6_raw', 'chan7_raw', 'chan8_raw', 'chan9_raw', 'chan10_raw', 'chan11_raw', 'chan12_raw', 'chan13_raw', 'chan14_raw', 'chan15_raw', 'chan16_raw', 'chan17_raw', 'chan18_raw'];


    this.set(arguments);

}
        mavlink20.messages.rc_channels_override.prototype = new mavlink20.message;
mavlink20.messages.rc_channels_override.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.chan1_raw, this.chan2_raw, this.chan3_raw, this.chan4_raw, this.chan5_raw, this.chan6_raw, this.chan7_raw, this.chan8_raw, this.target_system, this.target_component, this.chan9_raw, this.chan10_raw, this.chan11_raw, this.chan12_raw, this.chan13_raw, this.chan14_raw, this.chan15_raw, this.chan16_raw, this.chan17_raw, this.chan18_raw]));
}

/* 
Message encoding a mission item. This message is emitted to announce
the presence of a mission item and to set a mission item on the
system. The mission item can be either in x, y, z meters (type: LOCAL)
or x:lat, y:lon, z:altitude. Local frame is Z-down, right handed
(NED), global frame is Z-up, right handed (ENU). NaN or INT32_MAX may
be used in float/integer params (respectively) to indicate
optional/default values (e.g. to use the component's current latitude,
yaw rather than a specific value). See also
https://mavlink.io/en/services/mission.html.

                target_system             : System ID (uint8_t)
                target_component          : Component ID (uint8_t)
                seq                       : Waypoint ID (sequence number). Starts at zero. Increases monotonically for each waypoint, no gaps in the sequence (0,1,2,3,4). (uint16_t)
                frame                     : The coordinate system of the waypoint. (uint8_t)
                command                   : The scheduled action for the waypoint. (uint16_t)
                current                   : false:0, true:1 (uint8_t)
                autocontinue              : Autocontinue to next waypoint. 0: false, 1: true. Set false to pause mission after the item completes. (uint8_t)
                param1                    : PARAM1, see MAV_CMD enum (float)
                param2                    : PARAM2, see MAV_CMD enum (float)
                param3                    : PARAM3, see MAV_CMD enum (float)
                param4                    : PARAM4, see MAV_CMD enum (float)
                x                         : PARAM5 / local: x position in meters * 1e4, global: latitude in degrees * 10^7 (int32_t)
                y                         : PARAM6 / y position: local: x position in meters * 1e4, global: longitude in degrees *10^7 (int32_t)
                z                         : PARAM7 / z position: global: altitude in meters (relative or absolute, depending on frame. (float)
                mission_type              : Mission type. (uint8_t)

*/
mavlink20.messages.mission_item_int = function(target_system, target_component, seq, frame, command, current, autocontinue, param1, param2, param3, param4, x, y, z, mission_type) {

    this.format = '<ffffiifHHBBBBBB';
    this.id = mavlink20.MAVLINK_MSG_ID_MISSION_ITEM_INT;
    this.order_map = [9, 10, 7, 11, 8, 12, 13, 0, 1, 2, 3, 4, 5, 6, 14];
    this.crc_extra = 38;
    this.name = 'MISSION_ITEM_INT';

    this.fieldnames = ['target_system', 'target_component', 'seq', 'frame', 'command', 'current', 'autocontinue', 'param1', 'param2', 'param3', 'param4', 'x', 'y', 'z', 'mission_type'];


    this.set(arguments);

}
        mavlink20.messages.mission_item_int.prototype = new mavlink20.message;
mavlink20.messages.mission_item_int.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.param1, this.param2, this.param3, this.param4, this.x, this.y, this.z, this.seq, this.command, this.target_system, this.target_component, this.frame, this.current, this.autocontinue, this.mission_type]));
}

/* 
Metrics typically displayed on a HUD for fixed wing aircraft.

                airspeed                  : Vehicle speed in form appropriate for vehicle type. For standard aircraft this is typically calibrated airspeed (CAS) or indicated airspeed (IAS) - either of which can be used by a pilot to estimate stall speed. (float)
                groundspeed               : Current ground speed. (float)
                heading                   : Current heading in compass units (0-360, 0=north). (int16_t)
                throttle                  : Current throttle setting (0 to 100). (uint16_t)
                alt                       : Current altitude (MSL). (float)
                climb                     : Current climb rate. (float)

*/
mavlink20.messages.vfr_hud = function(airspeed, groundspeed, heading, throttle, alt, climb) {

    this.format = '<ffffhH';
    this.id = mavlink20.MAVLINK_MSG_ID_VFR_HUD;
    this.order_map = [0, 1, 4, 5, 2, 3];
    this.crc_extra = 20;
    this.name = 'VFR_HUD';

    this.fieldnames = ['airspeed', 'groundspeed', 'heading', 'throttle', 'alt', 'climb'];


    this.set(arguments);

}
        mavlink20.messages.vfr_hud.prototype = new mavlink20.message;
mavlink20.messages.vfr_hud.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.airspeed, this.groundspeed, this.alt, this.climb, this.heading, this.throttle]));
}

/* 
Send a command with up to seven parameters to the MAV, where params 5
and 6 are integers and the other values are floats. This is preferred
over COMMAND_LONG as it allows the MAV_FRAME to be specified for
interpreting positional information, such as altitude. COMMAND_INT is
also preferred when sending latitude and longitude data in params 5
and 6, as it allows for greater precision. Param 5 and 6 encode
positional data as scaled integers, where the scaling depends on the
actual command value. NaN or INT32_MAX may be used in float/integer
params (respectively) to indicate optional/default values (e.g. to use
the component's current latitude, yaw rather than a specific value).
The command microservice is documented at
https://mavlink.io/en/services/command.html

                target_system             : System ID (uint8_t)
                target_component          : Component ID (uint8_t)
                frame                     : The coordinate system of the COMMAND. (uint8_t)
                command                   : The scheduled action for the mission item. (uint16_t)
                current                   : Not used. (uint8_t)
                autocontinue              : Not used (set 0). (uint8_t)
                param1                    : PARAM1, see MAV_CMD enum (float)
                param2                    : PARAM2, see MAV_CMD enum (float)
                param3                    : PARAM3, see MAV_CMD enum (float)
                param4                    : PARAM4, see MAV_CMD enum (float)
                x                         : PARAM5 / local: x position in meters * 1e4, global: latitude in degrees * 10^7 (int32_t)
                y                         : PARAM6 / local: y position in meters * 1e4, global: longitude in degrees * 10^7 (int32_t)
                z                         : PARAM7 / z position: global: altitude in meters (relative or absolute, depending on frame). (float)

*/
mavlink20.messages.command_int = function(target_system, target_component, frame, command, current, autocontinue, param1, param2, param3, param4, x, y, z) {

    this.format = '<ffffiifHBBBBB';
    this.id = mavlink20.MAVLINK_MSG_ID_COMMAND_INT;
    this.order_map = [8, 9, 10, 7, 11, 12, 0, 1, 2, 3, 4, 5, 6];
    this.crc_extra = 158;
    this.name = 'COMMAND_INT';

    this.fieldnames = ['target_system', 'target_component', 'frame', 'command', 'current', 'autocontinue', 'param1', 'param2', 'param3', 'param4', 'x', 'y', 'z'];


    this.set(arguments);

}
        mavlink20.messages.command_int.prototype = new mavlink20.message;
mavlink20.messages.command_int.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.param1, this.param2, this.param3, this.param4, this.x, this.y, this.z, this.command, this.target_system, this.target_component, this.frame, this.current, this.autocontinue]));
}

/* 
Send a command with up to seven parameters to the MAV. COMMAND_INT is
generally preferred when sending MAV_CMD commands that include
positional information; it offers higher precision and allows the
MAV_FRAME to be specified (which may otherwise be ambiguous,
particularly for altitude). The command microservice is documented at
https://mavlink.io/en/services/command.html

                target_system             : System which should execute the command (uint8_t)
                target_component          : Component which should execute the command, 0 for all components (uint8_t)
                command                   : Command ID (of command to send). (uint16_t)
                confirmation              : 0: First transmission of this command. 1-255: Confirmation transmissions (e.g. for kill command) (uint8_t)
                param1                    : Parameter 1 (for the specific command). (float)
                param2                    : Parameter 2 (for the specific command). (float)
                param3                    : Parameter 3 (for the specific command). (float)
                param4                    : Parameter 4 (for the specific command). (float)
                param5                    : Parameter 5 (for the specific command). (float)
                param6                    : Parameter 6 (for the specific command). (float)
                param7                    : Parameter 7 (for the specific command). (float)

*/
mavlink20.messages.command_long = function(target_system, target_component, command, confirmation, param1, param2, param3, param4, param5, param6, param7) {

    this.format = '<fffffffHBBB';
    this.id = mavlink20.MAVLINK_MSG_ID_COMMAND_LONG;
    this.order_map = [8, 9, 7, 10, 0, 1, 2, 3, 4, 5, 6];
    this.crc_extra = 152;
    this.name = 'COMMAND_LONG';

    this.fieldnames = ['target_system', 'target_component', 'command', 'confirmation', 'param1', 'param2', 'param3', 'param4', 'param5', 'param6', 'param7'];


    this.set(arguments);

}
        mavlink20.messages.command_long.prototype = new mavlink20.message;
mavlink20.messages.command_long.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.param1, this.param2, this.param3, this.param4, this.param5, this.param6, this.param7, this.command, this.target_system, this.target_component, this.confirmation]));
}

/* 
Report status of a command. Includes feedback whether the command was
executed. The command microservice is documented at
https://mavlink.io/en/services/command.html

                command                   : Command ID (of acknowledged command). (uint16_t)
                result                    : Result of command. (uint8_t)
                progress                  : The progress percentage when result is MAV_RESULT_IN_PROGRESS. Values: [0-100], or UINT8_MAX if the progress is unknown. (uint8_t)
                result_param2             : Additional result information. Can be set with a command-specific enum containing command-specific error reasons for why the command might be denied. If used, the associated enum must be documented in the corresponding MAV_CMD (this enum should have a 0 value to indicate "unused" or "unknown"). (int32_t)
                target_system             : System ID of the target recipient. This is the ID of the system that sent the command for which this COMMAND_ACK is an acknowledgement. (uint8_t)
                target_component          : Component ID of the target recipient. This is the ID of the system that sent the command for which this COMMAND_ACK is an acknowledgement. (uint8_t)

*/
mavlink20.messages.command_ack = function(command, result, progress, result_param2, target_system, target_component) {

    this.format = '<HBBiBB';
    this.id = mavlink20.MAVLINK_MSG_ID_COMMAND_ACK;
    this.order_map = [0, 1, 2, 3, 4, 5];
    this.crc_extra = 143;
    this.name = 'COMMAND_ACK';

    this.fieldnames = ['command', 'result', 'progress', 'result_param2', 'target_system', 'target_component'];


    this.set(arguments);

}
        mavlink20.messages.command_ack.prototype = new mavlink20.message;
mavlink20.messages.command_ack.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.command, this.result, this.progress, this.result_param2, this.target_system, this.target_component]));
}

/* 
Cancel a long running command. The target system should respond with a
COMMAND_ACK to the original command with result=MAV_RESULT_CANCELLED
if the long running process was cancelled. If it has already
completed, the cancel action can be ignored. The cancel action can be
retried until some sort of acknowledgement to the original command has
been received. The command microservice is documented at
https://mavlink.io/en/services/command.html

                target_system             : System executing long running command. Should not be broadcast (0). (uint8_t)
                target_component          : Component executing long running command. (uint8_t)
                command                   : Command ID (of command to cancel). (uint16_t)

*/
mavlink20.messages.command_cancel = function(target_system, target_component, command) {

    this.format = '<HBB';
    this.id = mavlink20.MAVLINK_MSG_ID_COMMAND_CANCEL;
    this.order_map = [1, 2, 0];
    this.crc_extra = 14;
    this.name = 'COMMAND_CANCEL';

    this.fieldnames = ['target_system', 'target_component', 'command'];


    this.set(arguments);

}
        mavlink20.messages.command_cancel.prototype = new mavlink20.message;
mavlink20.messages.command_cancel.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.command, this.target_system, this.target_component]));
}

/* 
Setpoint in roll, pitch, yaw and thrust from the operator

                time_boot_ms              : Timestamp (time since system boot). (uint32_t)
                roll                      : Desired roll rate (float)
                pitch                     : Desired pitch rate (float)
                yaw                       : Desired yaw rate (float)
                thrust                    : Collective thrust, normalized to 0 .. 1 (float)
                mode_switch               : Flight mode switch position, 0.. 255 (uint8_t)
                manual_override_switch        : Override mode switch position, 0.. 255 (uint8_t)

*/
mavlink20.messages.manual_setpoint = function(time_boot_ms, roll, pitch, yaw, thrust, mode_switch, manual_override_switch) {

    this.format = '<IffffBB';
    this.id = mavlink20.MAVLINK_MSG_ID_MANUAL_SETPOINT;
    this.order_map = [0, 1, 2, 3, 4, 5, 6];
    this.crc_extra = 106;
    this.name = 'MANUAL_SETPOINT';

    this.fieldnames = ['time_boot_ms', 'roll', 'pitch', 'yaw', 'thrust', 'mode_switch', 'manual_override_switch'];


    this.set(arguments);

}
        mavlink20.messages.manual_setpoint.prototype = new mavlink20.message;
mavlink20.messages.manual_setpoint.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.time_boot_ms, this.roll, this.pitch, this.yaw, this.thrust, this.mode_switch, this.manual_override_switch]));
}

/* 
Sets a desired vehicle attitude. Used by an external controller to
command the vehicle (manual controller or other system).

                time_boot_ms              : Timestamp (time since system boot). (uint32_t)
                target_system             : System ID (uint8_t)
                target_component          : Component ID (uint8_t)
                type_mask                 : Bitmap to indicate which dimensions should be ignored by the vehicle. (uint8_t)
                q                         : Attitude quaternion (w, x, y, z order, zero-rotation is 1, 0, 0, 0) from MAV_FRAME_LOCAL_NED to MAV_FRAME_BODY_FRD (float)
                body_roll_rate            : Body roll rate (float)
                body_pitch_rate           : Body pitch rate (float)
                body_yaw_rate             : Body yaw rate (float)
                thrust                    : Collective thrust, normalized to 0 .. 1 (-1 .. 1 for vehicles capable of reverse trust) (float)
                thrust_body               : 3D thrust setpoint in the body NED frame, normalized to -1 .. 1 (float)

*/
mavlink20.messages.set_attitude_target = function(time_boot_ms, target_system, target_component, type_mask, q, body_roll_rate, body_pitch_rate, body_yaw_rate, thrust, thrust_body) {

    this.format = '<I4fffffBBB3f';
    this.id = mavlink20.MAVLINK_MSG_ID_SET_ATTITUDE_TARGET;
    this.order_map = [0, 6, 7, 8, 1, 2, 3, 4, 5, 9];
    this.crc_extra = 49;
    this.name = 'SET_ATTITUDE_TARGET';

    this.fieldnames = ['time_boot_ms', 'target_system', 'target_component', 'type_mask', 'q', 'body_roll_rate', 'body_pitch_rate', 'body_yaw_rate', 'thrust', 'thrust_body'];


    this.set(arguments);

}
        mavlink20.messages.set_attitude_target.prototype = new mavlink20.message;
mavlink20.messages.set_attitude_target.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.time_boot_ms, this.q, this.body_roll_rate, this.body_pitch_rate, this.body_yaw_rate, this.thrust, this.target_system, this.target_component, this.type_mask, this.thrust_body]));
}

/* 
Reports the current commanded attitude of the vehicle as specified by
the autopilot. This should match the commands sent in a
SET_ATTITUDE_TARGET message if the vehicle is being controlled this
way.

                time_boot_ms              : Timestamp (time since system boot). (uint32_t)
                type_mask                 : Bitmap to indicate which dimensions should be ignored by the vehicle. (uint8_t)
                q                         : Attitude quaternion (w, x, y, z order, zero-rotation is 1, 0, 0, 0) (float)
                body_roll_rate            : Body roll rate (float)
                body_pitch_rate           : Body pitch rate (float)
                body_yaw_rate             : Body yaw rate (float)
                thrust                    : Collective thrust, normalized to 0 .. 1 (-1 .. 1 for vehicles capable of reverse trust) (float)

*/
mavlink20.messages.attitude_target = function(time_boot_ms, type_mask, q, body_roll_rate, body_pitch_rate, body_yaw_rate, thrust) {

    this.format = '<I4fffffB';
    this.id = mavlink20.MAVLINK_MSG_ID_ATTITUDE_TARGET;
    this.order_map = [0, 6, 1, 2, 3, 4, 5];
    this.crc_extra = 22;
    this.name = 'ATTITUDE_TARGET';

    this.fieldnames = ['time_boot_ms', 'type_mask', 'q', 'body_roll_rate', 'body_pitch_rate', 'body_yaw_rate', 'thrust'];


    this.set(arguments);

}
        mavlink20.messages.attitude_target.prototype = new mavlink20.message;
mavlink20.messages.attitude_target.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.time_boot_ms, this.q, this.body_roll_rate, this.body_pitch_rate, this.body_yaw_rate, this.thrust, this.type_mask]));
}

/* 
Sets a desired vehicle position in a local north-east-down coordinate
frame. Used by an external controller to command the vehicle (manual
controller or other system).

                time_boot_ms              : Timestamp (time since system boot). (uint32_t)
                target_system             : System ID (uint8_t)
                target_component          : Component ID (uint8_t)
                coordinate_frame          : Valid options are: MAV_FRAME_LOCAL_NED = 1, MAV_FRAME_LOCAL_OFFSET_NED = 7, MAV_FRAME_BODY_NED = 8, MAV_FRAME_BODY_OFFSET_NED = 9 (uint8_t)
                type_mask                 : Bitmap to indicate which dimensions should be ignored by the vehicle. (uint16_t)
                x                         : X Position in NED frame (float)
                y                         : Y Position in NED frame (float)
                z                         : Z Position in NED frame (note, altitude is negative in NED) (float)
                vx                        : X velocity in NED frame (float)
                vy                        : Y velocity in NED frame (float)
                vz                        : Z velocity in NED frame (float)
                afx                       : X acceleration or force (if bit 10 of type_mask is set) in NED frame in meter / s^2 or N (float)
                afy                       : Y acceleration or force (if bit 10 of type_mask is set) in NED frame in meter / s^2 or N (float)
                afz                       : Z acceleration or force (if bit 10 of type_mask is set) in NED frame in meter / s^2 or N (float)
                yaw                       : yaw setpoint (float)
                yaw_rate                  : yaw rate setpoint (float)

*/
mavlink20.messages.set_position_target_local_ned = function(time_boot_ms, target_system, target_component, coordinate_frame, type_mask, x, y, z, vx, vy, vz, afx, afy, afz, yaw, yaw_rate) {

    this.format = '<IfffffffffffHBBB';
    this.id = mavlink20.MAVLINK_MSG_ID_SET_POSITION_TARGET_LOCAL_NED;
    this.order_map = [0, 13, 14, 15, 12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
    this.crc_extra = 143;
    this.name = 'SET_POSITION_TARGET_LOCAL_NED';

    this.fieldnames = ['time_boot_ms', 'target_system', 'target_component', 'coordinate_frame', 'type_mask', 'x', 'y', 'z', 'vx', 'vy', 'vz', 'afx', 'afy', 'afz', 'yaw', 'yaw_rate'];


    this.set(arguments);

}
        mavlink20.messages.set_position_target_local_ned.prototype = new mavlink20.message;
mavlink20.messages.set_position_target_local_ned.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.time_boot_ms, this.x, this.y, this.z, this.vx, this.vy, this.vz, this.afx, this.afy, this.afz, this.yaw, this.yaw_rate, this.type_mask, this.target_system, this.target_component, this.coordinate_frame]));
}

/* 
Reports the current commanded vehicle position, velocity, and
acceleration as specified by the autopilot. This should match the
commands sent in SET_POSITION_TARGET_LOCAL_NED if the vehicle is being
controlled this way.

                time_boot_ms              : Timestamp (time since system boot). (uint32_t)
                coordinate_frame          : Valid options are: MAV_FRAME_LOCAL_NED = 1, MAV_FRAME_LOCAL_OFFSET_NED = 7, MAV_FRAME_BODY_NED = 8, MAV_FRAME_BODY_OFFSET_NED = 9 (uint8_t)
                type_mask                 : Bitmap to indicate which dimensions should be ignored by the vehicle. (uint16_t)
                x                         : X Position in NED frame (float)
                y                         : Y Position in NED frame (float)
                z                         : Z Position in NED frame (note, altitude is negative in NED) (float)
                vx                        : X velocity in NED frame (float)
                vy                        : Y velocity in NED frame (float)
                vz                        : Z velocity in NED frame (float)
                afx                       : X acceleration or force (if bit 10 of type_mask is set) in NED frame in meter / s^2 or N (float)
                afy                       : Y acceleration or force (if bit 10 of type_mask is set) in NED frame in meter / s^2 or N (float)
                afz                       : Z acceleration or force (if bit 10 of type_mask is set) in NED frame in meter / s^2 or N (float)
                yaw                       : yaw setpoint (float)
                yaw_rate                  : yaw rate setpoint (float)

*/
mavlink20.messages.position_target_local_ned = function(time_boot_ms, coordinate_frame, type_mask, x, y, z, vx, vy, vz, afx, afy, afz, yaw, yaw_rate) {

    this.format = '<IfffffffffffHB';
    this.id = mavlink20.MAVLINK_MSG_ID_POSITION_TARGET_LOCAL_NED;
    this.order_map = [0, 13, 12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
    this.crc_extra = 140;
    this.name = 'POSITION_TARGET_LOCAL_NED';

    this.fieldnames = ['time_boot_ms', 'coordinate_frame', 'type_mask', 'x', 'y', 'z', 'vx', 'vy', 'vz', 'afx', 'afy', 'afz', 'yaw', 'yaw_rate'];


    this.set(arguments);

}
        mavlink20.messages.position_target_local_ned.prototype = new mavlink20.message;
mavlink20.messages.position_target_local_ned.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.time_boot_ms, this.x, this.y, this.z, this.vx, this.vy, this.vz, this.afx, this.afy, this.afz, this.yaw, this.yaw_rate, this.type_mask, this.coordinate_frame]));
}

/* 
Sets a desired vehicle position, velocity, and/or acceleration in a
global coordinate system (WGS84). Used by an external controller to
command the vehicle (manual controller or other system).

                time_boot_ms              : Timestamp (time since system boot). The rationale for the timestamp in the setpoint is to allow the system to compensate for the transport delay of the setpoint. This allows the system to compensate processing latency. (uint32_t)
                target_system             : System ID (uint8_t)
                target_component          : Component ID (uint8_t)
                coordinate_frame          : Valid options are: MAV_FRAME_GLOBAL = 0, MAV_FRAME_GLOBAL_RELATIVE_ALT = 3, MAV_FRAME_GLOBAL_TERRAIN_ALT = 10 (MAV_FRAME_GLOBAL_INT, MAV_FRAME_GLOBAL_RELATIVE_ALT_INT, MAV_FRAME_GLOBAL_TERRAIN_ALT_INT are allowed synonyms, but have been deprecated) (uint8_t)
                type_mask                 : Bitmap to indicate which dimensions should be ignored by the vehicle. (uint16_t)
                lat_int                   : Latitude in WGS84 frame (int32_t)
                lon_int                   : Longitude in WGS84 frame (int32_t)
                alt                       : Altitude (MSL, Relative to home, or AGL - depending on frame) (float)
                vx                        : X velocity in NED frame (float)
                vy                        : Y velocity in NED frame (float)
                vz                        : Z velocity in NED frame (float)
                afx                       : X acceleration or force (if bit 10 of type_mask is set) in NED frame in meter / s^2 or N (float)
                afy                       : Y acceleration or force (if bit 10 of type_mask is set) in NED frame in meter / s^2 or N (float)
                afz                       : Z acceleration or force (if bit 10 of type_mask is set) in NED frame in meter / s^2 or N (float)
                yaw                       : yaw setpoint (float)
                yaw_rate                  : yaw rate setpoint (float)

*/
mavlink20.messages.set_position_target_global_int = function(time_boot_ms, target_system, target_component, coordinate_frame, type_mask, lat_int, lon_int, alt, vx, vy, vz, afx, afy, afz, yaw, yaw_rate) {

    this.format = '<IiifffffffffHBBB';
    this.id = mavlink20.MAVLINK_MSG_ID_SET_POSITION_TARGET_GLOBAL_INT;
    this.order_map = [0, 13, 14, 15, 12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
    this.crc_extra = 5;
    this.name = 'SET_POSITION_TARGET_GLOBAL_INT';

    this.fieldnames = ['time_boot_ms', 'target_system', 'target_component', 'coordinate_frame', 'type_mask', 'lat_int', 'lon_int', 'alt', 'vx', 'vy', 'vz', 'afx', 'afy', 'afz', 'yaw', 'yaw_rate'];


    this.set(arguments);

}
        mavlink20.messages.set_position_target_global_int.prototype = new mavlink20.message;
mavlink20.messages.set_position_target_global_int.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.time_boot_ms, this.lat_int, this.lon_int, this.alt, this.vx, this.vy, this.vz, this.afx, this.afy, this.afz, this.yaw, this.yaw_rate, this.type_mask, this.target_system, this.target_component, this.coordinate_frame]));
}

/* 
Reports the current commanded vehicle position, velocity, and
acceleration as specified by the autopilot. This should match the
commands sent in SET_POSITION_TARGET_GLOBAL_INT if the vehicle is
being controlled this way.

                time_boot_ms              : Timestamp (time since system boot). The rationale for the timestamp in the setpoint is to allow the system to compensate for the transport delay of the setpoint. This allows the system to compensate processing latency. (uint32_t)
                coordinate_frame          : Valid options are: MAV_FRAME_GLOBAL = 0, MAV_FRAME_GLOBAL_RELATIVE_ALT = 3, MAV_FRAME_GLOBAL_TERRAIN_ALT = 10 (MAV_FRAME_GLOBAL_INT, MAV_FRAME_GLOBAL_RELATIVE_ALT_INT, MAV_FRAME_GLOBAL_TERRAIN_ALT_INT are allowed synonyms, but have been deprecated) (uint8_t)
                type_mask                 : Bitmap to indicate which dimensions should be ignored by the vehicle. (uint16_t)
                lat_int                   : Latitude in WGS84 frame (int32_t)
                lon_int                   : Longitude in WGS84 frame (int32_t)
                alt                       : Altitude (MSL, AGL or relative to home altitude, depending on frame) (float)
                vx                        : X velocity in NED frame (float)
                vy                        : Y velocity in NED frame (float)
                vz                        : Z velocity in NED frame (float)
                afx                       : X acceleration or force (if bit 10 of type_mask is set) in NED frame in meter / s^2 or N (float)
                afy                       : Y acceleration or force (if bit 10 of type_mask is set) in NED frame in meter / s^2 or N (float)
                afz                       : Z acceleration or force (if bit 10 of type_mask is set) in NED frame in meter / s^2 or N (float)
                yaw                       : yaw setpoint (float)
                yaw_rate                  : yaw rate setpoint (float)

*/
mavlink20.messages.position_target_global_int = function(time_boot_ms, coordinate_frame, type_mask, lat_int, lon_int, alt, vx, vy, vz, afx, afy, afz, yaw, yaw_rate) {

    this.format = '<IiifffffffffHB';
    this.id = mavlink20.MAVLINK_MSG_ID_POSITION_TARGET_GLOBAL_INT;
    this.order_map = [0, 13, 12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
    this.crc_extra = 150;
    this.name = 'POSITION_TARGET_GLOBAL_INT';

    this.fieldnames = ['time_boot_ms', 'coordinate_frame', 'type_mask', 'lat_int', 'lon_int', 'alt', 'vx', 'vy', 'vz', 'afx', 'afy', 'afz', 'yaw', 'yaw_rate'];


    this.set(arguments);

}
        mavlink20.messages.position_target_global_int.prototype = new mavlink20.message;
mavlink20.messages.position_target_global_int.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.time_boot_ms, this.lat_int, this.lon_int, this.alt, this.vx, this.vy, this.vz, this.afx, this.afy, this.afz, this.yaw, this.yaw_rate, this.type_mask, this.coordinate_frame]));
}

/* 
The offset in X, Y, Z and yaw between the LOCAL_POSITION_NED messages
of MAV X and the global coordinate frame in NED coordinates.
Coordinate frame is right-handed, Z-axis down (aeronautical frame, NED
/ north-east-down convention)

                time_boot_ms              : Timestamp (time since system boot). (uint32_t)
                x                         : X Position (float)
                y                         : Y Position (float)
                z                         : Z Position (float)
                roll                      : Roll (float)
                pitch                     : Pitch (float)
                yaw                       : Yaw (float)

*/
mavlink20.messages.local_position_ned_system_global_offset = function(time_boot_ms, x, y, z, roll, pitch, yaw) {

    this.format = '<Iffffff';
    this.id = mavlink20.MAVLINK_MSG_ID_LOCAL_POSITION_NED_SYSTEM_GLOBAL_OFFSET;
    this.order_map = [0, 1, 2, 3, 4, 5, 6];
    this.crc_extra = 231;
    this.name = 'LOCAL_POSITION_NED_SYSTEM_GLOBAL_OFFSET';

    this.fieldnames = ['time_boot_ms', 'x', 'y', 'z', 'roll', 'pitch', 'yaw'];


    this.set(arguments);

}
        mavlink20.messages.local_position_ned_system_global_offset.prototype = new mavlink20.message;
mavlink20.messages.local_position_ned_system_global_offset.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.time_boot_ms, this.x, this.y, this.z, this.roll, this.pitch, this.yaw]));
}

/* 
Sent from simulation to autopilot. This packet is useful for high
throughput applications such as hardware in the loop simulations.

                time_usec                 : Timestamp (UNIX Epoch time or time since system boot). The receiving end can infer timestamp format (since 1.1.1970 or since system boot) by checking for the magnitude of the number. (uint64_t)
                roll                      : Roll angle (float)
                pitch                     : Pitch angle (float)
                yaw                       : Yaw angle (float)
                rollspeed                 : Body frame roll / phi angular speed (float)
                pitchspeed                : Body frame pitch / theta angular speed (float)
                yawspeed                  : Body frame yaw / psi angular speed (float)
                lat                       : Latitude (int32_t)
                lon                       : Longitude (int32_t)
                alt                       : Altitude (int32_t)
                vx                        : Ground X Speed (Latitude) (int16_t)
                vy                        : Ground Y Speed (Longitude) (int16_t)
                vz                        : Ground Z Speed (Altitude) (int16_t)
                xacc                      : X acceleration (int16_t)
                yacc                      : Y acceleration (int16_t)
                zacc                      : Z acceleration (int16_t)

*/
mavlink20.messages.hil_state = function(time_usec, roll, pitch, yaw, rollspeed, pitchspeed, yawspeed, lat, lon, alt, vx, vy, vz, xacc, yacc, zacc) {

    this.format = '<Qffffffiiihhhhhh';
    this.id = mavlink20.MAVLINK_MSG_ID_HIL_STATE;
    this.order_map = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
    this.crc_extra = 183;
    this.name = 'HIL_STATE';

    this.fieldnames = ['time_usec', 'roll', 'pitch', 'yaw', 'rollspeed', 'pitchspeed', 'yawspeed', 'lat', 'lon', 'alt', 'vx', 'vy', 'vz', 'xacc', 'yacc', 'zacc'];


    this.set(arguments);

}
        mavlink20.messages.hil_state.prototype = new mavlink20.message;
mavlink20.messages.hil_state.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.time_usec, this.roll, this.pitch, this.yaw, this.rollspeed, this.pitchspeed, this.yawspeed, this.lat, this.lon, this.alt, this.vx, this.vy, this.vz, this.xacc, this.yacc, this.zacc]));
}

/* 
Sent from autopilot to simulation. Hardware in the loop control
outputs. Alternative to HIL_ACTUATOR_CONTROLS.

                time_usec                 : Timestamp (UNIX Epoch time or time since system boot). The receiving end can infer timestamp format (since 1.1.1970 or since system boot) by checking for the magnitude of the number. (uint64_t)
                roll_ailerons             : Control output -1 .. 1 (float)
                pitch_elevator            : Control output -1 .. 1 (float)
                yaw_rudder                : Control output -1 .. 1 (float)
                throttle                  : Throttle 0 .. 1 (float)
                aux1                      : Aux 1, -1 .. 1 (float)
                aux2                      : Aux 2, -1 .. 1 (float)
                aux3                      : Aux 3, -1 .. 1 (float)
                aux4                      : Aux 4, -1 .. 1 (float)
                mode                      : System mode. (uint8_t)
                nav_mode                  : Navigation mode (MAV_NAV_MODE) (uint8_t)

*/
mavlink20.messages.hil_controls = function(time_usec, roll_ailerons, pitch_elevator, yaw_rudder, throttle, aux1, aux2, aux3, aux4, mode, nav_mode) {

    this.format = '<QffffffffBB';
    this.id = mavlink20.MAVLINK_MSG_ID_HIL_CONTROLS;
    this.order_map = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    this.crc_extra = 63;
    this.name = 'HIL_CONTROLS';

    this.fieldnames = ['time_usec', 'roll_ailerons', 'pitch_elevator', 'yaw_rudder', 'throttle', 'aux1', 'aux2', 'aux3', 'aux4', 'mode', 'nav_mode'];


    this.set(arguments);

}
        mavlink20.messages.hil_controls.prototype = new mavlink20.message;
mavlink20.messages.hil_controls.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.time_usec, this.roll_ailerons, this.pitch_elevator, this.yaw_rudder, this.throttle, this.aux1, this.aux2, this.aux3, this.aux4, this.mode, this.nav_mode]));
}

/* 
Sent from simulation to autopilot. The RAW values of the RC channels
received. The standard PPM modulation is as follows: 1000
microseconds: 0%, 2000 microseconds: 100%. Individual
receivers/transmitters might violate this specification.

                time_usec                 : Timestamp (UNIX Epoch time or time since system boot). The receiving end can infer timestamp format (since 1.1.1970 or since system boot) by checking for the magnitude of the number. (uint64_t)
                chan1_raw                 : RC channel 1 value (uint16_t)
                chan2_raw                 : RC channel 2 value (uint16_t)
                chan3_raw                 : RC channel 3 value (uint16_t)
                chan4_raw                 : RC channel 4 value (uint16_t)
                chan5_raw                 : RC channel 5 value (uint16_t)
                chan6_raw                 : RC channel 6 value (uint16_t)
                chan7_raw                 : RC channel 7 value (uint16_t)
                chan8_raw                 : RC channel 8 value (uint16_t)
                chan9_raw                 : RC channel 9 value (uint16_t)
                chan10_raw                : RC channel 10 value (uint16_t)
                chan11_raw                : RC channel 11 value (uint16_t)
                chan12_raw                : RC channel 12 value (uint16_t)
                rssi                      : Receive signal strength indicator in device-dependent units/scale. Values: [0-254], UINT8_MAX: invalid/unknown. (uint8_t)

*/
mavlink20.messages.hil_rc_inputs_raw = function(time_usec, chan1_raw, chan2_raw, chan3_raw, chan4_raw, chan5_raw, chan6_raw, chan7_raw, chan8_raw, chan9_raw, chan10_raw, chan11_raw, chan12_raw, rssi) {

    this.format = '<QHHHHHHHHHHHHB';
    this.id = mavlink20.MAVLINK_MSG_ID_HIL_RC_INPUTS_RAW;
    this.order_map = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
    this.crc_extra = 54;
    this.name = 'HIL_RC_INPUTS_RAW';

    this.fieldnames = ['time_usec', 'chan1_raw', 'chan2_raw', 'chan3_raw', 'chan4_raw', 'chan5_raw', 'chan6_raw', 'chan7_raw', 'chan8_raw', 'chan9_raw', 'chan10_raw', 'chan11_raw', 'chan12_raw', 'rssi'];


    this.set(arguments);

}
        mavlink20.messages.hil_rc_inputs_raw.prototype = new mavlink20.message;
mavlink20.messages.hil_rc_inputs_raw.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.time_usec, this.chan1_raw, this.chan2_raw, this.chan3_raw, this.chan4_raw, this.chan5_raw, this.chan6_raw, this.chan7_raw, this.chan8_raw, this.chan9_raw, this.chan10_raw, this.chan11_raw, this.chan12_raw, this.rssi]));
}

/* 
Sent from autopilot to simulation. Hardware in the loop control
outputs. Alternative to HIL_CONTROLS.

                time_usec                 : Timestamp (UNIX Epoch time or time since system boot). The receiving end can infer timestamp format (since 1.1.1970 or since system boot) by checking for the magnitude of the number. (uint64_t)
                controls                  : Control outputs -1 .. 1. Channel assignment depends on the simulated hardware. (float)
                mode                      : System mode. Includes arming state. (uint8_t)
                flags                     : Flags bitmask. (uint64_t)

*/
mavlink20.messages.hil_actuator_controls = function(time_usec, controls, mode, flags) {

    this.format = '<QQ16fB';
    this.id = mavlink20.MAVLINK_MSG_ID_HIL_ACTUATOR_CONTROLS;
    this.order_map = [0, 2, 3, 1];
    this.crc_extra = 47;
    this.name = 'HIL_ACTUATOR_CONTROLS';

    this.fieldnames = ['time_usec', 'controls', 'mode', 'flags'];


    this.set(arguments);

}
        mavlink20.messages.hil_actuator_controls.prototype = new mavlink20.message;
mavlink20.messages.hil_actuator_controls.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.time_usec, this.flags, this.controls, this.mode]));
}

/* 
Optical flow from a flow sensor (e.g. optical mouse sensor)

                time_usec                 : Timestamp (UNIX Epoch time or time since system boot). The receiving end can infer timestamp format (since 1.1.1970 or since system boot) by checking for the magnitude of the number. (uint64_t)
                sensor_id                 : Sensor ID (uint8_t)
                flow_x                    : Flow in x-sensor direction (int16_t)
                flow_y                    : Flow in y-sensor direction (int16_t)
                flow_comp_m_x             : Flow in x-sensor direction, angular-speed compensated (float)
                flow_comp_m_y             : Flow in y-sensor direction, angular-speed compensated (float)
                quality                   : Optical flow quality / confidence. 0: bad, 255: maximum quality (uint8_t)
                ground_distance           : Ground distance. Positive value: distance known. Negative value: Unknown distance (float)
                flow_rate_x               : Flow rate about X axis (float)
                flow_rate_y               : Flow rate about Y axis (float)

*/
mavlink20.messages.optical_flow = function(time_usec, sensor_id, flow_x, flow_y, flow_comp_m_x, flow_comp_m_y, quality, ground_distance, flow_rate_x, flow_rate_y) {

    this.format = '<QfffhhBBff';
    this.id = mavlink20.MAVLINK_MSG_ID_OPTICAL_FLOW;
    this.order_map = [0, 6, 4, 5, 1, 2, 7, 3, 8, 9];
    this.crc_extra = 175;
    this.name = 'OPTICAL_FLOW';

    this.fieldnames = ['time_usec', 'sensor_id', 'flow_x', 'flow_y', 'flow_comp_m_x', 'flow_comp_m_y', 'quality', 'ground_distance', 'flow_rate_x', 'flow_rate_y'];


    this.set(arguments);

}
        mavlink20.messages.optical_flow.prototype = new mavlink20.message;
mavlink20.messages.optical_flow.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.time_usec, this.flow_comp_m_x, this.flow_comp_m_y, this.ground_distance, this.flow_x, this.flow_y, this.sensor_id, this.quality, this.flow_rate_x, this.flow_rate_y]));
}

/* 
Global position/attitude estimate from a vision source.

                usec                      : Timestamp (UNIX time or since system boot) (uint64_t)
                x                         : Global X position (float)
                y                         : Global Y position (float)
                z                         : Global Z position (float)
                roll                      : Roll angle (float)
                pitch                     : Pitch angle (float)
                yaw                       : Yaw angle (float)
                covariance                : Row-major representation of pose 6x6 cross-covariance matrix upper right triangle (states: x_global, y_global, z_global, roll, pitch, yaw; first six entries are the first ROW, next five entries are the second ROW, etc.). If unknown, assign NaN value to first element in the array. (float)
                reset_counter             : Estimate reset counter. This should be incremented when the estimate resets in any of the dimensions (position, velocity, attitude, angular speed). This is designed to be used when e.g an external SLAM system detects a loop-closure and the estimate jumps. (uint8_t)

*/
mavlink20.messages.global_vision_position_estimate = function(usec, x, y, z, roll, pitch, yaw, covariance, reset_counter) {

    this.format = '<Qffffff21fB';
    this.id = mavlink20.MAVLINK_MSG_ID_GLOBAL_VISION_POSITION_ESTIMATE;
    this.order_map = [0, 1, 2, 3, 4, 5, 6, 7, 8];
    this.crc_extra = 102;
    this.name = 'GLOBAL_VISION_POSITION_ESTIMATE';

    this.fieldnames = ['usec', 'x', 'y', 'z', 'roll', 'pitch', 'yaw', 'covariance', 'reset_counter'];


    this.set(arguments);

}
        mavlink20.messages.global_vision_position_estimate.prototype = new mavlink20.message;
mavlink20.messages.global_vision_position_estimate.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.usec, this.x, this.y, this.z, this.roll, this.pitch, this.yaw, this.covariance, this.reset_counter]));
}

/* 
Local position/attitude estimate from a vision source.

                usec                      : Timestamp (UNIX time or time since system boot) (uint64_t)
                x                         : Local X position (float)
                y                         : Local Y position (float)
                z                         : Local Z position (float)
                roll                      : Roll angle (float)
                pitch                     : Pitch angle (float)
                yaw                       : Yaw angle (float)
                covariance                : Row-major representation of pose 6x6 cross-covariance matrix upper right triangle (states: x, y, z, roll, pitch, yaw; first six entries are the first ROW, next five entries are the second ROW, etc.). If unknown, assign NaN value to first element in the array. (float)
                reset_counter             : Estimate reset counter. This should be incremented when the estimate resets in any of the dimensions (position, velocity, attitude, angular speed). This is designed to be used when e.g an external SLAM system detects a loop-closure and the estimate jumps. (uint8_t)

*/
mavlink20.messages.vision_position_estimate = function(usec, x, y, z, roll, pitch, yaw, covariance, reset_counter) {

    this.format = '<Qffffff21fB';
    this.id = mavlink20.MAVLINK_MSG_ID_VISION_POSITION_ESTIMATE;
    this.order_map = [0, 1, 2, 3, 4, 5, 6, 7, 8];
    this.crc_extra = 158;
    this.name = 'VISION_POSITION_ESTIMATE';

    this.fieldnames = ['usec', 'x', 'y', 'z', 'roll', 'pitch', 'yaw', 'covariance', 'reset_counter'];


    this.set(arguments);

}
        mavlink20.messages.vision_position_estimate.prototype = new mavlink20.message;
mavlink20.messages.vision_position_estimate.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.usec, this.x, this.y, this.z, this.roll, this.pitch, this.yaw, this.covariance, this.reset_counter]));
}

/* 
Speed estimate from a vision source.

                usec                      : Timestamp (UNIX time or time since system boot) (uint64_t)
                x                         : Global X speed (float)
                y                         : Global Y speed (float)
                z                         : Global Z speed (float)
                covariance                : Row-major representation of 3x3 linear velocity covariance matrix (states: vx, vy, vz; 1st three entries - 1st row, etc.). If unknown, assign NaN value to first element in the array. (float)
                reset_counter             : Estimate reset counter. This should be incremented when the estimate resets in any of the dimensions (position, velocity, attitude, angular speed). This is designed to be used when e.g an external SLAM system detects a loop-closure and the estimate jumps. (uint8_t)

*/
mavlink20.messages.vision_speed_estimate = function(usec, x, y, z, covariance, reset_counter) {

    this.format = '<Qfff9fB';
    this.id = mavlink20.MAVLINK_MSG_ID_VISION_SPEED_ESTIMATE;
    this.order_map = [0, 1, 2, 3, 4, 5];
    this.crc_extra = 208;
    this.name = 'VISION_SPEED_ESTIMATE';

    this.fieldnames = ['usec', 'x', 'y', 'z', 'covariance', 'reset_counter'];


    this.set(arguments);

}
        mavlink20.messages.vision_speed_estimate.prototype = new mavlink20.message;
mavlink20.messages.vision_speed_estimate.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.usec, this.x, this.y, this.z, this.covariance, this.reset_counter]));
}

/* 
Global position estimate from a Vicon motion system source.

                usec                      : Timestamp (UNIX time or time since system boot) (uint64_t)
                x                         : Global X position (float)
                y                         : Global Y position (float)
                z                         : Global Z position (float)
                roll                      : Roll angle (float)
                pitch                     : Pitch angle (float)
                yaw                       : Yaw angle (float)
                covariance                : Row-major representation of 6x6 pose cross-covariance matrix upper right triangle (states: x, y, z, roll, pitch, yaw; first six entries are the first ROW, next five entries are the second ROW, etc.). If unknown, assign NaN value to first element in the array. (float)

*/
mavlink20.messages.vicon_position_estimate = function(usec, x, y, z, roll, pitch, yaw, covariance) {

    this.format = '<Qffffff21f';
    this.id = mavlink20.MAVLINK_MSG_ID_VICON_POSITION_ESTIMATE;
    this.order_map = [0, 1, 2, 3, 4, 5, 6, 7];
    this.crc_extra = 56;
    this.name = 'VICON_POSITION_ESTIMATE';

    this.fieldnames = ['usec', 'x', 'y', 'z', 'roll', 'pitch', 'yaw', 'covariance'];


    this.set(arguments);

}
        mavlink20.messages.vicon_position_estimate.prototype = new mavlink20.message;
mavlink20.messages.vicon_position_estimate.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.usec, this.x, this.y, this.z, this.roll, this.pitch, this.yaw, this.covariance]));
}

/* 
The IMU readings in SI units in NED body frame

                time_usec                 : Timestamp (UNIX Epoch time or time since system boot). The receiving end can infer timestamp format (since 1.1.1970 or since system boot) by checking for the magnitude of the number. (uint64_t)
                xacc                      : X acceleration (float)
                yacc                      : Y acceleration (float)
                zacc                      : Z acceleration (float)
                xgyro                     : Angular speed around X axis (float)
                ygyro                     : Angular speed around Y axis (float)
                zgyro                     : Angular speed around Z axis (float)
                xmag                      : X Magnetic field (float)
                ymag                      : Y Magnetic field (float)
                zmag                      : Z Magnetic field (float)
                abs_pressure              : Absolute pressure (float)
                diff_pressure             : Differential pressure (float)
                pressure_alt              : Altitude calculated from pressure (float)
                temperature               : Temperature (float)
                fields_updated            : Bitmap for fields that have updated since last message (uint16_t)
                id                        : Id. Ids are numbered from 0 and map to IMUs numbered from 1 (e.g. IMU1 will have a message with id=0) (uint8_t)

*/
mavlink20.messages.highres_imu = function(time_usec, xacc, yacc, zacc, xgyro, ygyro, zgyro, xmag, ymag, zmag, abs_pressure, diff_pressure, pressure_alt, temperature, fields_updated, id) {

    this.format = '<QfffffffffffffHB';
    this.id = mavlink20.MAVLINK_MSG_ID_HIGHRES_IMU;
    this.order_map = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
    this.crc_extra = 93;
    this.name = 'HIGHRES_IMU';

    this.fieldnames = ['time_usec', 'xacc', 'yacc', 'zacc', 'xgyro', 'ygyro', 'zgyro', 'xmag', 'ymag', 'zmag', 'abs_pressure', 'diff_pressure', 'pressure_alt', 'temperature', 'fields_updated', 'id'];


    this.set(arguments);

}
        mavlink20.messages.highres_imu.prototype = new mavlink20.message;
mavlink20.messages.highres_imu.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.time_usec, this.xacc, this.yacc, this.zacc, this.xgyro, this.ygyro, this.zgyro, this.xmag, this.ymag, this.zmag, this.abs_pressure, this.diff_pressure, this.pressure_alt, this.temperature, this.fields_updated, this.id]));
}

/* 
Optical flow from an angular rate flow sensor (e.g. PX4FLOW or mouse
sensor)

                time_usec                 : Timestamp (UNIX Epoch time or time since system boot). The receiving end can infer timestamp format (since 1.1.1970 or since system boot) by checking for the magnitude of the number. (uint64_t)
                sensor_id                 : Sensor ID (uint8_t)
                integration_time_us        : Integration time. Divide integrated_x and integrated_y by the integration time to obtain average flow. The integration time also indicates the. (uint32_t)
                integrated_x              : Flow around X axis (Sensor RH rotation about the X axis induces a positive flow. Sensor linear motion along the positive Y axis induces a negative flow.) (float)
                integrated_y              : Flow around Y axis (Sensor RH rotation about the Y axis induces a positive flow. Sensor linear motion along the positive X axis induces a positive flow.) (float)
                integrated_xgyro          : RH rotation around X axis (float)
                integrated_ygyro          : RH rotation around Y axis (float)
                integrated_zgyro          : RH rotation around Z axis (float)
                temperature               : Temperature (int16_t)
                quality                   : Optical flow quality / confidence. 0: no valid flow, 255: maximum quality (uint8_t)
                time_delta_distance_us        : Time since the distance was sampled. (uint32_t)
                distance                  : Distance to the center of the flow field. Positive value (including zero): distance known. Negative value: Unknown distance. (float)

*/
mavlink20.messages.optical_flow_rad = function(time_usec, sensor_id, integration_time_us, integrated_x, integrated_y, integrated_xgyro, integrated_ygyro, integrated_zgyro, temperature, quality, time_delta_distance_us, distance) {

    this.format = '<QIfffffIfhBB';
    this.id = mavlink20.MAVLINK_MSG_ID_OPTICAL_FLOW_RAD;
    this.order_map = [0, 10, 1, 2, 3, 4, 5, 6, 9, 11, 7, 8];
    this.crc_extra = 138;
    this.name = 'OPTICAL_FLOW_RAD';

    this.fieldnames = ['time_usec', 'sensor_id', 'integration_time_us', 'integrated_x', 'integrated_y', 'integrated_xgyro', 'integrated_ygyro', 'integrated_zgyro', 'temperature', 'quality', 'time_delta_distance_us', 'distance'];


    this.set(arguments);

}
        mavlink20.messages.optical_flow_rad.prototype = new mavlink20.message;
mavlink20.messages.optical_flow_rad.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.time_usec, this.integration_time_us, this.integrated_x, this.integrated_y, this.integrated_xgyro, this.integrated_ygyro, this.integrated_zgyro, this.time_delta_distance_us, this.distance, this.temperature, this.sensor_id, this.quality]));
}

/* 
The IMU readings in SI units in NED body frame

                time_usec                 : Timestamp (UNIX Epoch time or time since system boot). The receiving end can infer timestamp format (since 1.1.1970 or since system boot) by checking for the magnitude of the number. (uint64_t)
                xacc                      : X acceleration (float)
                yacc                      : Y acceleration (float)
                zacc                      : Z acceleration (float)
                xgyro                     : Angular speed around X axis in body frame (float)
                ygyro                     : Angular speed around Y axis in body frame (float)
                zgyro                     : Angular speed around Z axis in body frame (float)
                xmag                      : X Magnetic field (float)
                ymag                      : Y Magnetic field (float)
                zmag                      : Z Magnetic field (float)
                abs_pressure              : Absolute pressure (float)
                diff_pressure             : Differential pressure (airspeed) (float)
                pressure_alt              : Altitude calculated from pressure (float)
                temperature               : Temperature (float)
                fields_updated            : Bitmap for fields that have updated since last message (uint32_t)
                id                        : Sensor ID (zero indexed). Used for multiple sensor inputs (uint8_t)

*/
mavlink20.messages.hil_sensor = function(time_usec, xacc, yacc, zacc, xgyro, ygyro, zgyro, xmag, ymag, zmag, abs_pressure, diff_pressure, pressure_alt, temperature, fields_updated, id) {

    this.format = '<QfffffffffffffIB';
    this.id = mavlink20.MAVLINK_MSG_ID_HIL_SENSOR;
    this.order_map = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
    this.crc_extra = 108;
    this.name = 'HIL_SENSOR';

    this.fieldnames = ['time_usec', 'xacc', 'yacc', 'zacc', 'xgyro', 'ygyro', 'zgyro', 'xmag', 'ymag', 'zmag', 'abs_pressure', 'diff_pressure', 'pressure_alt', 'temperature', 'fields_updated', 'id'];


    this.set(arguments);

}
        mavlink20.messages.hil_sensor.prototype = new mavlink20.message;
mavlink20.messages.hil_sensor.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.time_usec, this.xacc, this.yacc, this.zacc, this.xgyro, this.ygyro, this.zgyro, this.xmag, this.ymag, this.zmag, this.abs_pressure, this.diff_pressure, this.pressure_alt, this.temperature, this.fields_updated, this.id]));
}

/* 
Status of simulation environment, if used

                q1                        : True attitude quaternion component 1, w (1 in null-rotation) (float)
                q2                        : True attitude quaternion component 2, x (0 in null-rotation) (float)
                q3                        : True attitude quaternion component 3, y (0 in null-rotation) (float)
                q4                        : True attitude quaternion component 4, z (0 in null-rotation) (float)
                roll                      : Attitude roll expressed as Euler angles, not recommended except for human-readable outputs (float)
                pitch                     : Attitude pitch expressed as Euler angles, not recommended except for human-readable outputs (float)
                yaw                       : Attitude yaw expressed as Euler angles, not recommended except for human-readable outputs (float)
                xacc                      : X acceleration (float)
                yacc                      : Y acceleration (float)
                zacc                      : Z acceleration (float)
                xgyro                     : Angular speed around X axis (float)
                ygyro                     : Angular speed around Y axis (float)
                zgyro                     : Angular speed around Z axis (float)
                lat                       : Latitude (lower precision). Both this and the lat_int field should be set. (float)
                lon                       : Longitude (lower precision). Both this and the lon_int field should be set. (float)
                alt                       : Altitude (float)
                std_dev_horz              : Horizontal position standard deviation (float)
                std_dev_vert              : Vertical position standard deviation (float)
                vn                        : True velocity in north direction in earth-fixed NED frame (float)
                ve                        : True velocity in east direction in earth-fixed NED frame (float)
                vd                        : True velocity in down direction in earth-fixed NED frame (float)
                lat_int                   : Latitude (higher precision). If 0, recipients should use the lat field value (otherwise this field is preferred). (int32_t)
                lon_int                   : Longitude (higher precision). If 0, recipients should use the lon field value (otherwise this field is preferred). (int32_t)

*/
mavlink20.messages.sim_state = function(q1, q2, q3, q4, roll, pitch, yaw, xacc, yacc, zacc, xgyro, ygyro, zgyro, lat, lon, alt, std_dev_horz, std_dev_vert, vn, ve, vd, lat_int, lon_int) {

    this.format = '<fffffffffffffffffffffii';
    this.id = mavlink20.MAVLINK_MSG_ID_SIM_STATE;
    this.order_map = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22];
    this.crc_extra = 32;
    this.name = 'SIM_STATE';

    this.fieldnames = ['q1', 'q2', 'q3', 'q4', 'roll', 'pitch', 'yaw', 'xacc', 'yacc', 'zacc', 'xgyro', 'ygyro', 'zgyro', 'lat', 'lon', 'alt', 'std_dev_horz', 'std_dev_vert', 'vn', 've', 'vd', 'lat_int', 'lon_int'];


    this.set(arguments);

}
        mavlink20.messages.sim_state.prototype = new mavlink20.message;
mavlink20.messages.sim_state.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.q1, this.q2, this.q3, this.q4, this.roll, this.pitch, this.yaw, this.xacc, this.yacc, this.zacc, this.xgyro, this.ygyro, this.zgyro, this.lat, this.lon, this.alt, this.std_dev_horz, this.std_dev_vert, this.vn, this.ve, this.vd, this.lat_int, this.lon_int]));
}

/* 
Status generated by radio and injected into MAVLink stream.

                rssi                      : Local (message sender) received signal strength indication in device-dependent units/scale. Values: [0-254], UINT8_MAX: invalid/unknown. (uint8_t)
                remrssi                   : Remote (message receiver) signal strength indication in device-dependent units/scale. Values: [0-254], UINT8_MAX: invalid/unknown. (uint8_t)
                txbuf                     : Remaining free transmitter buffer space. (uint8_t)
                noise                     : Local background noise level. These are device dependent RSSI values (scale as approx 2x dB on SiK radios). Values: [0-254], UINT8_MAX: invalid/unknown. (uint8_t)
                remnoise                  : Remote background noise level. These are device dependent RSSI values (scale as approx 2x dB on SiK radios). Values: [0-254], UINT8_MAX: invalid/unknown. (uint8_t)
                rxerrors                  : Count of radio packet receive errors (since boot). (uint16_t)
                fixed                     : Count of error corrected radio packets (since boot). (uint16_t)

*/
mavlink20.messages.radio_status = function(rssi, remrssi, txbuf, noise, remnoise, rxerrors, fixed) {

    this.format = '<HHBBBBB';
    this.id = mavlink20.MAVLINK_MSG_ID_RADIO_STATUS;
    this.order_map = [2, 3, 4, 5, 6, 0, 1];
    this.crc_extra = 185;
    this.name = 'RADIO_STATUS';

    this.fieldnames = ['rssi', 'remrssi', 'txbuf', 'noise', 'remnoise', 'rxerrors', 'fixed'];


    this.set(arguments);

}
        mavlink20.messages.radio_status.prototype = new mavlink20.message;
mavlink20.messages.radio_status.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.rxerrors, this.fixed, this.rssi, this.remrssi, this.txbuf, this.noise, this.remnoise]));
}

/* 
File transfer protocol message:
https://mavlink.io/en/services/ftp.html.

                target_network            : Network ID (0 for broadcast) (uint8_t)
                target_system             : System ID (0 for broadcast) (uint8_t)
                target_component          : Component ID (0 for broadcast) (uint8_t)
                payload                   : Variable length payload. The length is defined by the remaining message length when subtracting the header and other fields. The content/format of this block is defined in https://mavlink.io/en/services/ftp.html. (uint8_t)

*/
mavlink20.messages.file_transfer_protocol = function(target_network, target_system, target_component, payload) {

    this.format = '<BBB251s';
    this.id = mavlink20.MAVLINK_MSG_ID_FILE_TRANSFER_PROTOCOL;
    this.order_map = [0, 1, 2, 3];
    this.crc_extra = 84;
    this.name = 'FILE_TRANSFER_PROTOCOL';

    this.fieldnames = ['target_network', 'target_system', 'target_component', 'payload'];


    this.set(arguments);

}
        mavlink20.messages.file_transfer_protocol.prototype = new mavlink20.message;
mavlink20.messages.file_transfer_protocol.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.target_network, this.target_system, this.target_component, this.payload]));
}

/* 
Time synchronization message.         The message is used for both
timesync requests and responses.         The request is sent with
`ts1=syncing component timestamp` and `tc1=0`, and may be broadcast or
targeted to a specific system/component.         The response is sent
with `ts1=syncing component timestamp` (mirror back unchanged), and
`tc1=responding component timestamp`, with the `target_system` and
`target_component` set to ids of the original request.         Systems
can determine if they are receiving a request or response based on the
value of `tc`.         If the response has
`target_system==target_component==0` the remote system has not been
updated to use the component IDs and cannot reliably timesync; the
requester may report an error.         Timestamps are UNIX Epoch time
or time since system boot in nanoseconds (the timestamp format can be
inferred by checking for the magnitude of the number; generally it
doesn't matter as only the offset is used).         The message
sequence is repeated numerous times with results being
filtered/averaged to estimate the offset.         See also:
https://mavlink.io/en/services/timesync.html.

                tc1                       : Time sync timestamp 1. Syncing: 0. Responding: Timestamp of responding component. (int64_t)
                ts1                       : Time sync timestamp 2. Timestamp of syncing component (mirrored in response). (int64_t)
                target_system             : Target system id. Request: 0 (broadcast) or id of specific system. Response must contain system id of the requesting component. (uint8_t)
                target_component          : Target component id. Request: 0 (broadcast) or id of specific component. Response must contain component id of the requesting component. (uint8_t)

*/
mavlink20.messages.timesync = function(tc1, ts1, target_system, target_component) {

    this.format = '<qqBB';
    this.id = mavlink20.MAVLINK_MSG_ID_TIMESYNC;
    this.order_map = [0, 1, 2, 3];
    this.crc_extra = 34;
    this.name = 'TIMESYNC';

    this.fieldnames = ['tc1', 'ts1', 'target_system', 'target_component'];


    this.set(arguments);

}
        mavlink20.messages.timesync.prototype = new mavlink20.message;
mavlink20.messages.timesync.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.tc1, this.ts1, this.target_system, this.target_component]));
}

/* 
Camera-IMU triggering and synchronisation message.

                time_usec                 : Timestamp for image frame (UNIX Epoch time or time since system boot). The receiving end can infer timestamp format (since 1.1.1970 or since system boot) by checking for the magnitude of the number. (uint64_t)
                seq                       : Image frame sequence (uint32_t)

*/
mavlink20.messages.camera_trigger = function(time_usec, seq) {

    this.format = '<QI';
    this.id = mavlink20.MAVLINK_MSG_ID_CAMERA_TRIGGER;
    this.order_map = [0, 1];
    this.crc_extra = 174;
    this.name = 'CAMERA_TRIGGER';

    this.fieldnames = ['time_usec', 'seq'];


    this.set(arguments);

}
        mavlink20.messages.camera_trigger.prototype = new mavlink20.message;
mavlink20.messages.camera_trigger.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.time_usec, this.seq]));
}

/* 
The global position, as returned by the Global Positioning System
(GPS). This is                  NOT the global position estimate of
the system, but rather a RAW sensor value. See message
GLOBAL_POSITION_INT for the global position estimate.

                time_usec                 : Timestamp (UNIX Epoch time or time since system boot). The receiving end can infer timestamp format (since 1.1.1970 or since system boot) by checking for the magnitude of the number. (uint64_t)
                fix_type                  : 0-1: no fix, 2: 2D fix, 3: 3D fix. Some applications will not use the value of this field unless it is at least two, so always correctly fill in the fix. (uint8_t)
                lat                       : Latitude (WGS84) (int32_t)
                lon                       : Longitude (WGS84) (int32_t)
                alt                       : Altitude (MSL). Positive for up. (int32_t)
                eph                       : GPS HDOP horizontal dilution of position (unitless * 100). If unknown, set to: UINT16_MAX (uint16_t)
                epv                       : GPS VDOP vertical dilution of position (unitless * 100). If unknown, set to: UINT16_MAX (uint16_t)
                vel                       : GPS ground speed. If unknown, set to: UINT16_MAX (uint16_t)
                vn                        : GPS velocity in north direction in earth-fixed NED frame (int16_t)
                ve                        : GPS velocity in east direction in earth-fixed NED frame (int16_t)
                vd                        : GPS velocity in down direction in earth-fixed NED frame (int16_t)
                cog                       : Course over ground (NOT heading, but direction of movement), 0.0..359.99 degrees. If unknown, set to: UINT16_MAX (uint16_t)
                satellites_visible        : Number of satellites visible. If unknown, set to UINT8_MAX (uint8_t)
                id                        : GPS ID (zero indexed). Used for multiple GPS inputs (uint8_t)
                yaw                       : Yaw of vehicle relative to Earth's North, zero means not available, use 36000 for north (uint16_t)

*/
mavlink20.messages.hil_gps = function(time_usec, fix_type, lat, lon, alt, eph, epv, vel, vn, ve, vd, cog, satellites_visible, id, yaw) {

    this.format = '<QiiiHHHhhhHBBBH';
    this.id = mavlink20.MAVLINK_MSG_ID_HIL_GPS;
    this.order_map = [0, 11, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 13, 14];
    this.crc_extra = 124;
    this.name = 'HIL_GPS';

    this.fieldnames = ['time_usec', 'fix_type', 'lat', 'lon', 'alt', 'eph', 'epv', 'vel', 'vn', 've', 'vd', 'cog', 'satellites_visible', 'id', 'yaw'];


    this.set(arguments);

}
        mavlink20.messages.hil_gps.prototype = new mavlink20.message;
mavlink20.messages.hil_gps.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.time_usec, this.lat, this.lon, this.alt, this.eph, this.epv, this.vel, this.vn, this.ve, this.vd, this.cog, this.fix_type, this.satellites_visible, this.id, this.yaw]));
}

/* 
Simulated optical flow from a flow sensor (e.g. PX4FLOW or optical
mouse sensor)

                time_usec                 : Timestamp (UNIX Epoch time or time since system boot). The receiving end can infer timestamp format (since 1.1.1970 or since system boot) by checking for the magnitude of the number. (uint64_t)
                sensor_id                 : Sensor ID (uint8_t)
                integration_time_us        : Integration time. Divide integrated_x and integrated_y by the integration time to obtain average flow. The integration time also indicates the. (uint32_t)
                integrated_x              : Flow in radians around X axis (Sensor RH rotation about the X axis induces a positive flow. Sensor linear motion along the positive Y axis induces a negative flow.) (float)
                integrated_y              : Flow in radians around Y axis (Sensor RH rotation about the Y axis induces a positive flow. Sensor linear motion along the positive X axis induces a positive flow.) (float)
                integrated_xgyro          : RH rotation around X axis (float)
                integrated_ygyro          : RH rotation around Y axis (float)
                integrated_zgyro          : RH rotation around Z axis (float)
                temperature               : Temperature (int16_t)
                quality                   : Optical flow quality / confidence. 0: no valid flow, 255: maximum quality (uint8_t)
                time_delta_distance_us        : Time since the distance was sampled. (uint32_t)
                distance                  : Distance to the center of the flow field. Positive value (including zero): distance known. Negative value: Unknown distance. (float)

*/
mavlink20.messages.hil_optical_flow = function(time_usec, sensor_id, integration_time_us, integrated_x, integrated_y, integrated_xgyro, integrated_ygyro, integrated_zgyro, temperature, quality, time_delta_distance_us, distance) {

    this.format = '<QIfffffIfhBB';
    this.id = mavlink20.MAVLINK_MSG_ID_HIL_OPTICAL_FLOW;
    this.order_map = [0, 10, 1, 2, 3, 4, 5, 6, 9, 11, 7, 8];
    this.crc_extra = 237;
    this.name = 'HIL_OPTICAL_FLOW';

    this.fieldnames = ['time_usec', 'sensor_id', 'integration_time_us', 'integrated_x', 'integrated_y', 'integrated_xgyro', 'integrated_ygyro', 'integrated_zgyro', 'temperature', 'quality', 'time_delta_distance_us', 'distance'];


    this.set(arguments);

}
        mavlink20.messages.hil_optical_flow.prototype = new mavlink20.message;
mavlink20.messages.hil_optical_flow.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.time_usec, this.integration_time_us, this.integrated_x, this.integrated_y, this.integrated_xgyro, this.integrated_ygyro, this.integrated_zgyro, this.time_delta_distance_us, this.distance, this.temperature, this.sensor_id, this.quality]));
}

/* 
Sent from simulation to autopilot, avoids in contrast to HIL_STATE
singularities. This packet is useful for high throughput applications
such as hardware in the loop simulations.

                time_usec                 : Timestamp (UNIX Epoch time or time since system boot). The receiving end can infer timestamp format (since 1.1.1970 or since system boot) by checking for the magnitude of the number. (uint64_t)
                attitude_quaternion        : Vehicle attitude expressed as normalized quaternion in w, x, y, z order (with 1 0 0 0 being the null-rotation) (float)
                rollspeed                 : Body frame roll / phi angular speed (float)
                pitchspeed                : Body frame pitch / theta angular speed (float)
                yawspeed                  : Body frame yaw / psi angular speed (float)
                lat                       : Latitude (int32_t)
                lon                       : Longitude (int32_t)
                alt                       : Altitude (int32_t)
                vx                        : Ground X Speed (Latitude) (int16_t)
                vy                        : Ground Y Speed (Longitude) (int16_t)
                vz                        : Ground Z Speed (Altitude) (int16_t)
                ind_airspeed              : Indicated airspeed (uint16_t)
                true_airspeed             : True airspeed (uint16_t)
                xacc                      : X acceleration (int16_t)
                yacc                      : Y acceleration (int16_t)
                zacc                      : Z acceleration (int16_t)

*/
mavlink20.messages.hil_state_quaternion = function(time_usec, attitude_quaternion, rollspeed, pitchspeed, yawspeed, lat, lon, alt, vx, vy, vz, ind_airspeed, true_airspeed, xacc, yacc, zacc) {

    this.format = '<Q4ffffiiihhhHHhhh';
    this.id = mavlink20.MAVLINK_MSG_ID_HIL_STATE_QUATERNION;
    this.order_map = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
    this.crc_extra = 4;
    this.name = 'HIL_STATE_QUATERNION';

    this.fieldnames = ['time_usec', 'attitude_quaternion', 'rollspeed', 'pitchspeed', 'yawspeed', 'lat', 'lon', 'alt', 'vx', 'vy', 'vz', 'ind_airspeed', 'true_airspeed', 'xacc', 'yacc', 'zacc'];


    this.set(arguments);

}
        mavlink20.messages.hil_state_quaternion.prototype = new mavlink20.message;
mavlink20.messages.hil_state_quaternion.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.time_usec, this.attitude_quaternion, this.rollspeed, this.pitchspeed, this.yawspeed, this.lat, this.lon, this.alt, this.vx, this.vy, this.vz, this.ind_airspeed, this.true_airspeed, this.xacc, this.yacc, this.zacc]));
}

/* 
The RAW IMU readings for secondary 9DOF sensor setup. This message
should contain the scaled values to the described units

                time_boot_ms              : Timestamp (time since system boot). (uint32_t)
                xacc                      : X acceleration (int16_t)
                yacc                      : Y acceleration (int16_t)
                zacc                      : Z acceleration (int16_t)
                xgyro                     : Angular speed around X axis (int16_t)
                ygyro                     : Angular speed around Y axis (int16_t)
                zgyro                     : Angular speed around Z axis (int16_t)
                xmag                      : X Magnetic field (int16_t)
                ymag                      : Y Magnetic field (int16_t)
                zmag                      : Z Magnetic field (int16_t)
                temperature               : Temperature, 0: IMU does not provide temperature values. If the IMU is at 0C it must send 1 (0.01C). (int16_t)

*/
mavlink20.messages.scaled_imu2 = function(time_boot_ms, xacc, yacc, zacc, xgyro, ygyro, zgyro, xmag, ymag, zmag, temperature) {

    this.format = '<Ihhhhhhhhhh';
    this.id = mavlink20.MAVLINK_MSG_ID_SCALED_IMU2;
    this.order_map = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    this.crc_extra = 76;
    this.name = 'SCALED_IMU2';

    this.fieldnames = ['time_boot_ms', 'xacc', 'yacc', 'zacc', 'xgyro', 'ygyro', 'zgyro', 'xmag', 'ymag', 'zmag', 'temperature'];


    this.set(arguments);

}
        mavlink20.messages.scaled_imu2.prototype = new mavlink20.message;
mavlink20.messages.scaled_imu2.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.time_boot_ms, this.xacc, this.yacc, this.zacc, this.xgyro, this.ygyro, this.zgyro, this.xmag, this.ymag, this.zmag, this.temperature]));
}

/* 
Request a list of available logs. On some systems calling this may
stop on-board logging until LOG_REQUEST_END is called. If there are no
log files available this request shall be answered with one LOG_ENTRY
message with id = 0 and num_logs = 0.

                target_system             : System ID (uint8_t)
                target_component          : Component ID (uint8_t)
                start                     : First log id (0 for first available) (uint16_t)
                end                       : Last log id (0xffff for last available) (uint16_t)

*/
mavlink20.messages.log_request_list = function(target_system, target_component, start, end) {

    this.format = '<HHBB';
    this.id = mavlink20.MAVLINK_MSG_ID_LOG_REQUEST_LIST;
    this.order_map = [2, 3, 0, 1];
    this.crc_extra = 128;
    this.name = 'LOG_REQUEST_LIST';

    this.fieldnames = ['target_system', 'target_component', 'start', 'end'];


    this.set(arguments);

}
        mavlink20.messages.log_request_list.prototype = new mavlink20.message;
mavlink20.messages.log_request_list.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.start, this.end, this.target_system, this.target_component]));
}

/* 
Reply to LOG_REQUEST_LIST

                id                        : Log id (uint16_t)
                num_logs                  : Total number of logs (uint16_t)
                last_log_num              : High log number (uint16_t)
                time_utc                  : UTC timestamp of log since 1970, or 0 if not available (uint32_t)
                size                      : Size of the log (may be approximate) (uint32_t)

*/
mavlink20.messages.log_entry = function(id, num_logs, last_log_num, time_utc, size) {

    this.format = '<IIHHH';
    this.id = mavlink20.MAVLINK_MSG_ID_LOG_ENTRY;
    this.order_map = [2, 3, 4, 0, 1];
    this.crc_extra = 56;
    this.name = 'LOG_ENTRY';

    this.fieldnames = ['id', 'num_logs', 'last_log_num', 'time_utc', 'size'];


    this.set(arguments);

}
        mavlink20.messages.log_entry.prototype = new mavlink20.message;
mavlink20.messages.log_entry.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.time_utc, this.size, this.id, this.num_logs, this.last_log_num]));
}

/* 
Request a chunk of a log

                target_system             : System ID (uint8_t)
                target_component          : Component ID (uint8_t)
                id                        : Log id (from LOG_ENTRY reply) (uint16_t)
                ofs                       : Offset into the log (uint32_t)
                count                     : Number of bytes (uint32_t)

*/
mavlink20.messages.log_request_data = function(target_system, target_component, id, ofs, count) {

    this.format = '<IIHBB';
    this.id = mavlink20.MAVLINK_MSG_ID_LOG_REQUEST_DATA;
    this.order_map = [3, 4, 2, 0, 1];
    this.crc_extra = 116;
    this.name = 'LOG_REQUEST_DATA';

    this.fieldnames = ['target_system', 'target_component', 'id', 'ofs', 'count'];


    this.set(arguments);

}
        mavlink20.messages.log_request_data.prototype = new mavlink20.message;
mavlink20.messages.log_request_data.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.ofs, this.count, this.id, this.target_system, this.target_component]));
}

/* 
Reply to LOG_REQUEST_DATA

                id                        : Log id (from LOG_ENTRY reply) (uint16_t)
                ofs                       : Offset into the log (uint32_t)
                count                     : Number of bytes (zero for end of log) (uint8_t)
                data                      : log data (uint8_t)

*/
mavlink20.messages.log_data = function(id, ofs, count, data) {

    this.format = '<IHB90s';
    this.id = mavlink20.MAVLINK_MSG_ID_LOG_DATA;
    this.order_map = [1, 0, 2, 3];
    this.crc_extra = 134;
    this.name = 'LOG_DATA';

    this.fieldnames = ['id', 'ofs', 'count', 'data'];


    this.set(arguments);

}
        mavlink20.messages.log_data.prototype = new mavlink20.message;
mavlink20.messages.log_data.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.ofs, this.id, this.count, this.data]));
}

/* 
Erase all logs

                target_system             : System ID (uint8_t)
                target_component          : Component ID (uint8_t)

*/
mavlink20.messages.log_erase = function(target_system, target_component) {

    this.format = '<BB';
    this.id = mavlink20.MAVLINK_MSG_ID_LOG_ERASE;
    this.order_map = [0, 1];
    this.crc_extra = 237;
    this.name = 'LOG_ERASE';

    this.fieldnames = ['target_system', 'target_component'];


    this.set(arguments);

}
        mavlink20.messages.log_erase.prototype = new mavlink20.message;
mavlink20.messages.log_erase.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.target_system, this.target_component]));
}

/* 
Stop log transfer and resume normal logging

                target_system             : System ID (uint8_t)
                target_component          : Component ID (uint8_t)

*/
mavlink20.messages.log_request_end = function(target_system, target_component) {

    this.format = '<BB';
    this.id = mavlink20.MAVLINK_MSG_ID_LOG_REQUEST_END;
    this.order_map = [0, 1];
    this.crc_extra = 203;
    this.name = 'LOG_REQUEST_END';

    this.fieldnames = ['target_system', 'target_component'];


    this.set(arguments);

}
        mavlink20.messages.log_request_end.prototype = new mavlink20.message;
mavlink20.messages.log_request_end.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.target_system, this.target_component]));
}

/* 
Data for injecting into the onboard GPS (used for DGPS)

                target_system             : System ID (uint8_t)
                target_component          : Component ID (uint8_t)
                len                       : Data length (uint8_t)
                data                      : Raw data (110 is enough for 12 satellites of RTCMv2) (uint8_t)

*/
mavlink20.messages.gps_inject_data = function(target_system, target_component, len, data) {

    this.format = '<BBB110s';
    this.id = mavlink20.MAVLINK_MSG_ID_GPS_INJECT_DATA;
    this.order_map = [0, 1, 2, 3];
    this.crc_extra = 250;
    this.name = 'GPS_INJECT_DATA';

    this.fieldnames = ['target_system', 'target_component', 'len', 'data'];


    this.set(arguments);

}
        mavlink20.messages.gps_inject_data.prototype = new mavlink20.message;
mavlink20.messages.gps_inject_data.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.target_system, this.target_component, this.len, this.data]));
}

/* 
Second GPS data.

                time_usec                 : Timestamp (UNIX Epoch time or time since system boot). The receiving end can infer timestamp format (since 1.1.1970 or since system boot) by checking for the magnitude of the number. (uint64_t)
                fix_type                  : GPS fix type. (uint8_t)
                lat                       : Latitude (WGS84) (int32_t)
                lon                       : Longitude (WGS84) (int32_t)
                alt                       : Altitude (MSL). Positive for up. (int32_t)
                eph                       : GPS HDOP horizontal dilution of position (unitless * 100). If unknown, set to: UINT16_MAX (uint16_t)
                epv                       : GPS VDOP vertical dilution of position (unitless * 100). If unknown, set to: UINT16_MAX (uint16_t)
                vel                       : GPS ground speed. If unknown, set to: UINT16_MAX (uint16_t)
                cog                       : Course over ground (NOT heading, but direction of movement): 0.0..359.99 degrees. If unknown, set to: UINT16_MAX (uint16_t)
                satellites_visible        : Number of satellites visible. If unknown, set to UINT8_MAX (uint8_t)
                dgps_numch                : Number of DGPS satellites (uint8_t)
                dgps_age                  : Age of DGPS info (uint32_t)
                yaw                       : Yaw in earth frame from north. Use 0 if this GPS does not provide yaw. Use UINT16_MAX if this GPS is configured to provide yaw and is currently unable to provide it. Use 36000 for north. (uint16_t)
                alt_ellipsoid             : Altitude (above WGS84, EGM96 ellipsoid). Positive for up. (int32_t)
                h_acc                     : Position uncertainty. (uint32_t)
                v_acc                     : Altitude uncertainty. (uint32_t)
                vel_acc                   : Speed uncertainty. (uint32_t)
                hdg_acc                   : Heading / track uncertainty (uint32_t)

*/
mavlink20.messages.gps2_raw = function(time_usec, fix_type, lat, lon, alt, eph, epv, vel, cog, satellites_visible, dgps_numch, dgps_age, yaw, alt_ellipsoid, h_acc, v_acc, vel_acc, hdg_acc) {

    this.format = '<QiiiIHHHHBBBHiIIII';
    this.id = mavlink20.MAVLINK_MSG_ID_GPS2_RAW;
    this.order_map = [0, 9, 1, 2, 3, 5, 6, 7, 8, 10, 11, 4, 12, 13, 14, 15, 16, 17];
    this.crc_extra = 87;
    this.name = 'GPS2_RAW';

    this.fieldnames = ['time_usec', 'fix_type', 'lat', 'lon', 'alt', 'eph', 'epv', 'vel', 'cog', 'satellites_visible', 'dgps_numch', 'dgps_age', 'yaw', 'alt_ellipsoid', 'h_acc', 'v_acc', 'vel_acc', 'hdg_acc'];


    this.set(arguments);

}
        mavlink20.messages.gps2_raw.prototype = new mavlink20.message;
mavlink20.messages.gps2_raw.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.time_usec, this.lat, this.lon, this.alt, this.dgps_age, this.eph, this.epv, this.vel, this.cog, this.fix_type, this.satellites_visible, this.dgps_numch, this.yaw, this.alt_ellipsoid, this.h_acc, this.v_acc, this.vel_acc, this.hdg_acc]));
}

/* 
Power supply status

                Vcc                       : 5V rail voltage. (uint16_t)
                Vservo                    : Servo rail voltage. (uint16_t)
                flags                     : Bitmap of power supply status flags. (uint16_t)

*/
mavlink20.messages.power_status = function(Vcc, Vservo, flags) {

    this.format = '<HHH';
    this.id = mavlink20.MAVLINK_MSG_ID_POWER_STATUS;
    this.order_map = [0, 1, 2];
    this.crc_extra = 203;
    this.name = 'POWER_STATUS';

    this.fieldnames = ['Vcc', 'Vservo', 'flags'];


    this.set(arguments);

}
        mavlink20.messages.power_status.prototype = new mavlink20.message;
mavlink20.messages.power_status.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.Vcc, this.Vservo, this.flags]));
}

/* 
Control a serial port. This can be used for raw access to an onboard
serial peripheral such as a GPS or telemetry radio. It is designed to
make it possible to update the devices firmware via MAVLink messages
or change the devices settings. A message with zero bytes can be used
to change just the baudrate.

                device                    : Serial control device type. (uint8_t)
                flags                     : Bitmap of serial control flags. (uint8_t)
                timeout                   : Timeout for reply data (uint16_t)
                baudrate                  : Baudrate of transfer. Zero means no change. (uint32_t)
                count                     : how many bytes in this transfer (uint8_t)
                data                      : serial data (uint8_t)
                target_system             : System ID (uint8_t)
                target_component          : Component ID (uint8_t)

*/
mavlink20.messages.serial_control = function(device, flags, timeout, baudrate, count, data, target_system, target_component) {

    this.format = '<IHBBB70sBB';
    this.id = mavlink20.MAVLINK_MSG_ID_SERIAL_CONTROL;
    this.order_map = [2, 3, 1, 0, 4, 5, 6, 7];
    this.crc_extra = 220;
    this.name = 'SERIAL_CONTROL';

    this.fieldnames = ['device', 'flags', 'timeout', 'baudrate', 'count', 'data', 'target_system', 'target_component'];


    this.set(arguments);

}
        mavlink20.messages.serial_control.prototype = new mavlink20.message;
mavlink20.messages.serial_control.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.baudrate, this.timeout, this.device, this.flags, this.count, this.data, this.target_system, this.target_component]));
}

/* 
RTK GPS data. Gives information on the relative baseline calculation
the GPS is reporting

                time_last_baseline_ms        : Time since boot of last baseline message received. (uint32_t)
                rtk_receiver_id           : Identification of connected RTK receiver. (uint8_t)
                wn                        : GPS Week Number of last baseline (uint16_t)
                tow                       : GPS Time of Week of last baseline (uint32_t)
                rtk_health                : GPS-specific health report for RTK data. (uint8_t)
                rtk_rate                  : Rate of baseline messages being received by GPS (uint8_t)
                nsats                     : Current number of sats used for RTK calculation. (uint8_t)
                baseline_coords_type        : Coordinate system of baseline (uint8_t)
                baseline_a_mm             : Current baseline in ECEF x or NED north component. (int32_t)
                baseline_b_mm             : Current baseline in ECEF y or NED east component. (int32_t)
                baseline_c_mm             : Current baseline in ECEF z or NED down component. (int32_t)
                accuracy                  : Current estimate of baseline accuracy. (uint32_t)
                iar_num_hypotheses        : Current number of integer ambiguity hypotheses. (int32_t)

*/
mavlink20.messages.gps_rtk = function(time_last_baseline_ms, rtk_receiver_id, wn, tow, rtk_health, rtk_rate, nsats, baseline_coords_type, baseline_a_mm, baseline_b_mm, baseline_c_mm, accuracy, iar_num_hypotheses) {

    this.format = '<IIiiiIiHBBBBB';
    this.id = mavlink20.MAVLINK_MSG_ID_GPS_RTK;
    this.order_map = [0, 8, 7, 1, 9, 10, 11, 12, 2, 3, 4, 5, 6];
    this.crc_extra = 25;
    this.name = 'GPS_RTK';

    this.fieldnames = ['time_last_baseline_ms', 'rtk_receiver_id', 'wn', 'tow', 'rtk_health', 'rtk_rate', 'nsats', 'baseline_coords_type', 'baseline_a_mm', 'baseline_b_mm', 'baseline_c_mm', 'accuracy', 'iar_num_hypotheses'];


    this.set(arguments);

}
        mavlink20.messages.gps_rtk.prototype = new mavlink20.message;
mavlink20.messages.gps_rtk.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.time_last_baseline_ms, this.tow, this.baseline_a_mm, this.baseline_b_mm, this.baseline_c_mm, this.accuracy, this.iar_num_hypotheses, this.wn, this.rtk_receiver_id, this.rtk_health, this.rtk_rate, this.nsats, this.baseline_coords_type]));
}

/* 
RTK GPS data. Gives information on the relative baseline calculation
the GPS is reporting

                time_last_baseline_ms        : Time since boot of last baseline message received. (uint32_t)
                rtk_receiver_id           : Identification of connected RTK receiver. (uint8_t)
                wn                        : GPS Week Number of last baseline (uint16_t)
                tow                       : GPS Time of Week of last baseline (uint32_t)
                rtk_health                : GPS-specific health report for RTK data. (uint8_t)
                rtk_rate                  : Rate of baseline messages being received by GPS (uint8_t)
                nsats                     : Current number of sats used for RTK calculation. (uint8_t)
                baseline_coords_type        : Coordinate system of baseline (uint8_t)
                baseline_a_mm             : Current baseline in ECEF x or NED north component. (int32_t)
                baseline_b_mm             : Current baseline in ECEF y or NED east component. (int32_t)
                baseline_c_mm             : Current baseline in ECEF z or NED down component. (int32_t)
                accuracy                  : Current estimate of baseline accuracy. (uint32_t)
                iar_num_hypotheses        : Current number of integer ambiguity hypotheses. (int32_t)

*/
mavlink20.messages.gps2_rtk = function(time_last_baseline_ms, rtk_receiver_id, wn, tow, rtk_health, rtk_rate, nsats, baseline_coords_type, baseline_a_mm, baseline_b_mm, baseline_c_mm, accuracy, iar_num_hypotheses) {

    this.format = '<IIiiiIiHBBBBB';
    this.id = mavlink20.MAVLINK_MSG_ID_GPS2_RTK;
    this.order_map = [0, 8, 7, 1, 9, 10, 11, 12, 2, 3, 4, 5, 6];
    this.crc_extra = 226;
    this.name = 'GPS2_RTK';

    this.fieldnames = ['time_last_baseline_ms', 'rtk_receiver_id', 'wn', 'tow', 'rtk_health', 'rtk_rate', 'nsats', 'baseline_coords_type', 'baseline_a_mm', 'baseline_b_mm', 'baseline_c_mm', 'accuracy', 'iar_num_hypotheses'];


    this.set(arguments);

}
        mavlink20.messages.gps2_rtk.prototype = new mavlink20.message;
mavlink20.messages.gps2_rtk.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.time_last_baseline_ms, this.tow, this.baseline_a_mm, this.baseline_b_mm, this.baseline_c_mm, this.accuracy, this.iar_num_hypotheses, this.wn, this.rtk_receiver_id, this.rtk_health, this.rtk_rate, this.nsats, this.baseline_coords_type]));
}

/* 
The RAW IMU readings for 3rd 9DOF sensor setup. This message should
contain the scaled values to the described units

                time_boot_ms              : Timestamp (time since system boot). (uint32_t)
                xacc                      : X acceleration (int16_t)
                yacc                      : Y acceleration (int16_t)
                zacc                      : Z acceleration (int16_t)
                xgyro                     : Angular speed around X axis (int16_t)
                ygyro                     : Angular speed around Y axis (int16_t)
                zgyro                     : Angular speed around Z axis (int16_t)
                xmag                      : X Magnetic field (int16_t)
                ymag                      : Y Magnetic field (int16_t)
                zmag                      : Z Magnetic field (int16_t)
                temperature               : Temperature, 0: IMU does not provide temperature values. If the IMU is at 0C it must send 1 (0.01C). (int16_t)

*/
mavlink20.messages.scaled_imu3 = function(time_boot_ms, xacc, yacc, zacc, xgyro, ygyro, zgyro, xmag, ymag, zmag, temperature) {

    this.format = '<Ihhhhhhhhhh';
    this.id = mavlink20.MAVLINK_MSG_ID_SCALED_IMU3;
    this.order_map = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    this.crc_extra = 46;
    this.name = 'SCALED_IMU3';

    this.fieldnames = ['time_boot_ms', 'xacc', 'yacc', 'zacc', 'xgyro', 'ygyro', 'zgyro', 'xmag', 'ymag', 'zmag', 'temperature'];


    this.set(arguments);

}
        mavlink20.messages.scaled_imu3.prototype = new mavlink20.message;
mavlink20.messages.scaled_imu3.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.time_boot_ms, this.xacc, this.yacc, this.zacc, this.xgyro, this.ygyro, this.zgyro, this.xmag, this.ymag, this.zmag, this.temperature]));
}

/* 
Handshake message to initiate, control and stop image streaming when
using the Image Transmission Protocol:
https://mavlink.io/en/services/image_transmission.html.

                type                      : Type of requested/acknowledged data. (uint8_t)
                size                      : total data size (set on ACK only). (uint32_t)
                width                     : Width of a matrix or image. (uint16_t)
                height                    : Height of a matrix or image. (uint16_t)
                packets                   : Number of packets being sent (set on ACK only). (uint16_t)
                payload                   : Payload size per packet (normally 253 byte, see DATA field size in message ENCAPSULATED_DATA) (set on ACK only). (uint8_t)
                jpg_quality               : JPEG quality. Values: [1-100]. (uint8_t)

*/
mavlink20.messages.data_transmission_handshake = function(type, size, width, height, packets, payload, jpg_quality) {

    this.format = '<IHHHBBB';
    this.id = mavlink20.MAVLINK_MSG_ID_DATA_TRANSMISSION_HANDSHAKE;
    this.order_map = [4, 0, 1, 2, 3, 5, 6];
    this.crc_extra = 29;
    this.name = 'DATA_TRANSMISSION_HANDSHAKE';

    this.fieldnames = ['type', 'size', 'width', 'height', 'packets', 'payload', 'jpg_quality'];


    this.set(arguments);

}
        mavlink20.messages.data_transmission_handshake.prototype = new mavlink20.message;
mavlink20.messages.data_transmission_handshake.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.size, this.width, this.height, this.packets, this.type, this.payload, this.jpg_quality]));
}

/* 
Data packet for images sent using the Image Transmission Protocol:
https://mavlink.io/en/services/image_transmission.html.

                seqnr                     : sequence number (starting with 0 on every transmission) (uint16_t)
                data                      : image data bytes (uint8_t)

*/
mavlink20.messages.encapsulated_data = function(seqnr, data) {

    this.format = '<H253s';
    this.id = mavlink20.MAVLINK_MSG_ID_ENCAPSULATED_DATA;
    this.order_map = [0, 1];
    this.crc_extra = 223;
    this.name = 'ENCAPSULATED_DATA';

    this.fieldnames = ['seqnr', 'data'];


    this.set(arguments);

}
        mavlink20.messages.encapsulated_data.prototype = new mavlink20.message;
mavlink20.messages.encapsulated_data.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.seqnr, this.data]));
}

/* 
Distance sensor information for an onboard rangefinder.

                time_boot_ms              : Timestamp (time since system boot). (uint32_t)
                min_distance              : Minimum distance the sensor can measure (uint16_t)
                max_distance              : Maximum distance the sensor can measure (uint16_t)
                current_distance          : Current distance reading (uint16_t)
                type                      : Type of distance sensor. (uint8_t)
                id                        : Onboard ID of the sensor (uint8_t)
                orientation               : Direction the sensor faces. downward-facing: ROTATION_PITCH_270, upward-facing: ROTATION_PITCH_90, backward-facing: ROTATION_PITCH_180, forward-facing: ROTATION_NONE, left-facing: ROTATION_YAW_90, right-facing: ROTATION_YAW_270 (uint8_t)
                covariance                : Measurement variance. Max standard deviation is 6cm. UINT8_MAX if unknown. (uint8_t)
                horizontal_fov            : Horizontal Field of View (angle) where the distance measurement is valid and the field of view is known. Otherwise this is set to 0. (float)
                vertical_fov              : Vertical Field of View (angle) where the distance measurement is valid and the field of view is known. Otherwise this is set to 0. (float)
                quaternion                : Quaternion of the sensor orientation in vehicle body frame (w, x, y, z order, zero-rotation is 1, 0, 0, 0). Zero-rotation is along the vehicle body x-axis. This field is required if the orientation is set to MAV_SENSOR_ROTATION_CUSTOM. Set it to 0 if invalid." (float)
                signal_quality            : Signal quality of the sensor. Specific to each sensor type, representing the relation of the signal strength with the target reflectivity, distance, size or aspect, but normalised as a percentage. 0 = unknown/unset signal quality, 1 = invalid signal, 100 = perfect signal. (uint8_t)

*/
mavlink20.messages.distance_sensor = function(time_boot_ms, min_distance, max_distance, current_distance, type, id, orientation, covariance, horizontal_fov, vertical_fov, quaternion, signal_quality) {

    this.format = '<IHHHBBBBff4fB';
    this.id = mavlink20.MAVLINK_MSG_ID_DISTANCE_SENSOR;
    this.order_map = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
    this.crc_extra = 85;
    this.name = 'DISTANCE_SENSOR';

    this.fieldnames = ['time_boot_ms', 'min_distance', 'max_distance', 'current_distance', 'type', 'id', 'orientation', 'covariance', 'horizontal_fov', 'vertical_fov', 'quaternion', 'signal_quality'];


    this.set(arguments);

}
        mavlink20.messages.distance_sensor.prototype = new mavlink20.message;
mavlink20.messages.distance_sensor.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.time_boot_ms, this.min_distance, this.max_distance, this.current_distance, this.type, this.id, this.orientation, this.covariance, this.horizontal_fov, this.vertical_fov, this.quaternion, this.signal_quality]));
}

/* 
Request for terrain data and terrain status. See terrain protocol
docs: https://mavlink.io/en/services/terrain.html

                lat                       : Latitude of SW corner of first grid (int32_t)
                lon                       : Longitude of SW corner of first grid (int32_t)
                grid_spacing              : Grid spacing (uint16_t)
                mask                      : Bitmask of requested 4x4 grids (row major 8x7 array of grids, 56 bits) (uint64_t)

*/
mavlink20.messages.terrain_request = function(lat, lon, grid_spacing, mask) {

    this.format = '<QiiH';
    this.id = mavlink20.MAVLINK_MSG_ID_TERRAIN_REQUEST;
    this.order_map = [1, 2, 3, 0];
    this.crc_extra = 6;
    this.name = 'TERRAIN_REQUEST';

    this.fieldnames = ['lat', 'lon', 'grid_spacing', 'mask'];


    this.set(arguments);

}
        mavlink20.messages.terrain_request.prototype = new mavlink20.message;
mavlink20.messages.terrain_request.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.mask, this.lat, this.lon, this.grid_spacing]));
}

/* 
Terrain data sent from GCS. The lat/lon and grid_spacing must be the
same as a lat/lon from a TERRAIN_REQUEST. See terrain protocol docs:
https://mavlink.io/en/services/terrain.html

                lat                       : Latitude of SW corner of first grid (int32_t)
                lon                       : Longitude of SW corner of first grid (int32_t)
                grid_spacing              : Grid spacing (uint16_t)
                gridbit                   : bit within the terrain request mask (uint8_t)
                data                      : Terrain data MSL (int16_t)

*/
mavlink20.messages.terrain_data = function(lat, lon, grid_spacing, gridbit, data) {

    this.format = '<iiH16hB';
    this.id = mavlink20.MAVLINK_MSG_ID_TERRAIN_DATA;
    this.order_map = [0, 1, 2, 4, 3];
    this.crc_extra = 229;
    this.name = 'TERRAIN_DATA';

    this.fieldnames = ['lat', 'lon', 'grid_spacing', 'gridbit', 'data'];


    this.set(arguments);

}
        mavlink20.messages.terrain_data.prototype = new mavlink20.message;
mavlink20.messages.terrain_data.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.lat, this.lon, this.grid_spacing, this.data, this.gridbit]));
}

/* 
Request that the vehicle report terrain height at the given location
(expected response is a TERRAIN_REPORT). Used by GCS to check if
vehicle has all terrain data needed for a mission.

                lat                       : Latitude (int32_t)
                lon                       : Longitude (int32_t)

*/
mavlink20.messages.terrain_check = function(lat, lon) {

    this.format = '<ii';
    this.id = mavlink20.MAVLINK_MSG_ID_TERRAIN_CHECK;
    this.order_map = [0, 1];
    this.crc_extra = 203;
    this.name = 'TERRAIN_CHECK';

    this.fieldnames = ['lat', 'lon'];


    this.set(arguments);

}
        mavlink20.messages.terrain_check.prototype = new mavlink20.message;
mavlink20.messages.terrain_check.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.lat, this.lon]));
}

/* 
Streamed from drone to report progress of terrain map download
(initiated by TERRAIN_REQUEST), or sent as a response to a
TERRAIN_CHECK request. See terrain protocol docs:
https://mavlink.io/en/services/terrain.html

                lat                       : Latitude (int32_t)
                lon                       : Longitude (int32_t)
                spacing                   : grid spacing (zero if terrain at this location unavailable) (uint16_t)
                terrain_height            : Terrain height MSL (float)
                current_height            : Current vehicle height above lat/lon terrain height (float)
                pending                   : Number of 4x4 terrain blocks waiting to be received or read from disk (uint16_t)
                loaded                    : Number of 4x4 terrain blocks in memory (uint16_t)

*/
mavlink20.messages.terrain_report = function(lat, lon, spacing, terrain_height, current_height, pending, loaded) {

    this.format = '<iiffHHH';
    this.id = mavlink20.MAVLINK_MSG_ID_TERRAIN_REPORT;
    this.order_map = [0, 1, 4, 2, 3, 5, 6];
    this.crc_extra = 1;
    this.name = 'TERRAIN_REPORT';

    this.fieldnames = ['lat', 'lon', 'spacing', 'terrain_height', 'current_height', 'pending', 'loaded'];


    this.set(arguments);

}
        mavlink20.messages.terrain_report.prototype = new mavlink20.message;
mavlink20.messages.terrain_report.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.lat, this.lon, this.terrain_height, this.current_height, this.spacing, this.pending, this.loaded]));
}

/* 
Barometer readings for 2nd barometer

                time_boot_ms              : Timestamp (time since system boot). (uint32_t)
                press_abs                 : Absolute pressure (float)
                press_diff                : Differential pressure (float)
                temperature               : Absolute pressure temperature (int16_t)
                temperature_press_diff        : Differential pressure temperature (0, if not available). Report values of 0 (or 1) as 1 cdegC. (int16_t)

*/
mavlink20.messages.scaled_pressure2 = function(time_boot_ms, press_abs, press_diff, temperature, temperature_press_diff) {

    this.format = '<Iffhh';
    this.id = mavlink20.MAVLINK_MSG_ID_SCALED_PRESSURE2;
    this.order_map = [0, 1, 2, 3, 4];
    this.crc_extra = 195;
    this.name = 'SCALED_PRESSURE2';

    this.fieldnames = ['time_boot_ms', 'press_abs', 'press_diff', 'temperature', 'temperature_press_diff'];


    this.set(arguments);

}
        mavlink20.messages.scaled_pressure2.prototype = new mavlink20.message;
mavlink20.messages.scaled_pressure2.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.time_boot_ms, this.press_abs, this.press_diff, this.temperature, this.temperature_press_diff]));
}

/* 
Motion capture attitude and position

                time_usec                 : Timestamp (UNIX Epoch time or time since system boot). The receiving end can infer timestamp format (since 1.1.1970 or since system boot) by checking for the magnitude of the number. (uint64_t)
                q                         : Attitude quaternion (w, x, y, z order, zero-rotation is 1, 0, 0, 0) (float)
                x                         : X position (NED) (float)
                y                         : Y position (NED) (float)
                z                         : Z position (NED) (float)
                covariance                : Row-major representation of a pose 6x6 cross-covariance matrix upper right triangle (states: x, y, z, roll, pitch, yaw; first six entries are the first ROW, next five entries are the second ROW, etc.). If unknown, assign NaN value to first element in the array. (float)

*/
mavlink20.messages.att_pos_mocap = function(time_usec, q, x, y, z, covariance) {

    this.format = '<Q4ffff21f';
    this.id = mavlink20.MAVLINK_MSG_ID_ATT_POS_MOCAP;
    this.order_map = [0, 1, 2, 3, 4, 5];
    this.crc_extra = 109;
    this.name = 'ATT_POS_MOCAP';

    this.fieldnames = ['time_usec', 'q', 'x', 'y', 'z', 'covariance'];


    this.set(arguments);

}
        mavlink20.messages.att_pos_mocap.prototype = new mavlink20.message;
mavlink20.messages.att_pos_mocap.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.time_usec, this.q, this.x, this.y, this.z, this.covariance]));
}

/* 
Set the vehicle attitude and body angular rates.

                time_usec                 : Timestamp (UNIX Epoch time or time since system boot). The receiving end can infer timestamp format (since 1.1.1970 or since system boot) by checking for the magnitude of the number. (uint64_t)
                group_mlx                 : Actuator group. The "_mlx" indicates this is a multi-instance message and a MAVLink parser should use this field to difference between instances. (uint8_t)
                target_system             : System ID (uint8_t)
                target_component          : Component ID (uint8_t)
                controls                  : Actuator controls. Normed to -1..+1 where 0 is neutral position. Throttle for single rotation direction motors is 0..1, negative range for reverse direction. Standard mapping for attitude controls (group 0): (index 0-7): roll, pitch, yaw, throttle, flaps, spoilers, airbrakes, landing gear. Load a pass-through mixer to repurpose them as generic outputs. (float)

*/
mavlink20.messages.set_actuator_control_target = function(time_usec, group_mlx, target_system, target_component, controls) {

    this.format = '<Q8fBBB';
    this.id = mavlink20.MAVLINK_MSG_ID_SET_ACTUATOR_CONTROL_TARGET;
    this.order_map = [0, 2, 3, 4, 1];
    this.crc_extra = 168;
    this.name = 'SET_ACTUATOR_CONTROL_TARGET';

    this.fieldnames = ['time_usec', 'group_mlx', 'target_system', 'target_component', 'controls'];


    this.set(arguments);

}
        mavlink20.messages.set_actuator_control_target.prototype = new mavlink20.message;
mavlink20.messages.set_actuator_control_target.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.time_usec, this.controls, this.group_mlx, this.target_system, this.target_component]));
}

/* 
Set the vehicle attitude and body angular rates.

                time_usec                 : Timestamp (UNIX Epoch time or time since system boot). The receiving end can infer timestamp format (since 1.1.1970 or since system boot) by checking for the magnitude of the number. (uint64_t)
                group_mlx                 : Actuator group. The "_mlx" indicates this is a multi-instance message and a MAVLink parser should use this field to difference between instances. (uint8_t)
                controls                  : Actuator controls. Normed to -1..+1 where 0 is neutral position. Throttle for single rotation direction motors is 0..1, negative range for reverse direction. Standard mapping for attitude controls (group 0): (index 0-7): roll, pitch, yaw, throttle, flaps, spoilers, airbrakes, landing gear. Load a pass-through mixer to repurpose them as generic outputs. (float)

*/
mavlink20.messages.actuator_control_target = function(time_usec, group_mlx, controls) {

    this.format = '<Q8fB';
    this.id = mavlink20.MAVLINK_MSG_ID_ACTUATOR_CONTROL_TARGET;
    this.order_map = [0, 2, 1];
    this.crc_extra = 181;
    this.name = 'ACTUATOR_CONTROL_TARGET';

    this.fieldnames = ['time_usec', 'group_mlx', 'controls'];


    this.set(arguments);

}
        mavlink20.messages.actuator_control_target.prototype = new mavlink20.message;
mavlink20.messages.actuator_control_target.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.time_usec, this.controls, this.group_mlx]));
}

/* 
The current system altitude.

                time_usec                 : Timestamp (UNIX Epoch time or time since system boot). The receiving end can infer timestamp format (since 1.1.1970 or since system boot) by checking for the magnitude of the number. (uint64_t)
                altitude_monotonic        : This altitude measure is initialized on system boot and monotonic (it is never reset, but represents the local altitude change). The only guarantee on this field is that it will never be reset and is consistent within a flight. The recommended value for this field is the uncorrected barometric altitude at boot time. This altitude will also drift and vary between flights. (float)
                altitude_amsl             : This altitude measure is strictly above mean sea level and might be non-monotonic (it might reset on events like GPS lock or when a new QNH value is set). It should be the altitude to which global altitude waypoints are compared to. Note that it is *not* the GPS altitude, however, most GPS modules already output MSL by default and not the WGS84 altitude. (float)
                altitude_local            : This is the local altitude in the local coordinate frame. It is not the altitude above home, but in reference to the coordinate origin (0, 0, 0). It is up-positive. (float)
                altitude_relative         : This is the altitude above the home position. It resets on each change of the current home position. (float)
                altitude_terrain          : This is the altitude above terrain. It might be fed by a terrain database or an altimeter. Values smaller than -1000 should be interpreted as unknown. (float)
                bottom_clearance          : This is not the altitude, but the clear space below the system according to the fused clearance estimate. It generally should max out at the maximum range of e.g. the laser altimeter. It is generally a moving target. A negative value indicates no measurement available. (float)

*/
mavlink20.messages.altitude = function(time_usec, altitude_monotonic, altitude_amsl, altitude_local, altitude_relative, altitude_terrain, bottom_clearance) {

    this.format = '<Qffffff';
    this.id = mavlink20.MAVLINK_MSG_ID_ALTITUDE;
    this.order_map = [0, 1, 2, 3, 4, 5, 6];
    this.crc_extra = 47;
    this.name = 'ALTITUDE';

    this.fieldnames = ['time_usec', 'altitude_monotonic', 'altitude_amsl', 'altitude_local', 'altitude_relative', 'altitude_terrain', 'bottom_clearance'];


    this.set(arguments);

}
        mavlink20.messages.altitude.prototype = new mavlink20.message;
mavlink20.messages.altitude.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.time_usec, this.altitude_monotonic, this.altitude_amsl, this.altitude_local, this.altitude_relative, this.altitude_terrain, this.bottom_clearance]));
}

/* 
The autopilot is requesting a resource (file, binary, other type of
data)

                request_id                : Request ID. This ID should be reused when sending back URI contents (uint8_t)
                uri_type                  : The type of requested URI. 0 = a file via URL. 1 = a UAVCAN binary (uint8_t)
                uri                       : The requested unique resource identifier (URI). It is not necessarily a straight domain name (depends on the URI type enum) (uint8_t)
                transfer_type             : The way the autopilot wants to receive the URI. 0 = MAVLink FTP. 1 = binary stream. (uint8_t)
                storage                   : The storage path the autopilot wants the URI to be stored in. Will only be valid if the transfer_type has a storage associated (e.g. MAVLink FTP). (uint8_t)

*/
mavlink20.messages.resource_request = function(request_id, uri_type, uri, transfer_type, storage) {

    this.format = '<BB120sB120s';
    this.id = mavlink20.MAVLINK_MSG_ID_RESOURCE_REQUEST;
    this.order_map = [0, 1, 2, 3, 4];
    this.crc_extra = 72;
    this.name = 'RESOURCE_REQUEST';

    this.fieldnames = ['request_id', 'uri_type', 'uri', 'transfer_type', 'storage'];


    this.set(arguments);

}
        mavlink20.messages.resource_request.prototype = new mavlink20.message;
mavlink20.messages.resource_request.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.request_id, this.uri_type, this.uri, this.transfer_type, this.storage]));
}

/* 
Barometer readings for 3rd barometer

                time_boot_ms              : Timestamp (time since system boot). (uint32_t)
                press_abs                 : Absolute pressure (float)
                press_diff                : Differential pressure (float)
                temperature               : Absolute pressure temperature (int16_t)
                temperature_press_diff        : Differential pressure temperature (0, if not available). Report values of 0 (or 1) as 1 cdegC. (int16_t)

*/
mavlink20.messages.scaled_pressure3 = function(time_boot_ms, press_abs, press_diff, temperature, temperature_press_diff) {

    this.format = '<Iffhh';
    this.id = mavlink20.MAVLINK_MSG_ID_SCALED_PRESSURE3;
    this.order_map = [0, 1, 2, 3, 4];
    this.crc_extra = 131;
    this.name = 'SCALED_PRESSURE3';

    this.fieldnames = ['time_boot_ms', 'press_abs', 'press_diff', 'temperature', 'temperature_press_diff'];


    this.set(arguments);

}
        mavlink20.messages.scaled_pressure3.prototype = new mavlink20.message;
mavlink20.messages.scaled_pressure3.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.time_boot_ms, this.press_abs, this.press_diff, this.temperature, this.temperature_press_diff]));
}

/* 
Current motion information from a designated system

                timestamp                 : Timestamp (time since system boot). (uint64_t)
                est_capabilities          : bit positions for tracker reporting capabilities (POS = 0, VEL = 1, ACCEL = 2, ATT + RATES = 3) (uint8_t)
                lat                       : Latitude (WGS84) (int32_t)
                lon                       : Longitude (WGS84) (int32_t)
                alt                       : Altitude (MSL) (float)
                vel                       : target velocity (0,0,0) for unknown (float)
                acc                       : linear target acceleration (0,0,0) for unknown (float)
                attitude_q                : (0 0 0 0 for unknown) (float)
                rates                     : (0 0 0 for unknown) (float)
                position_cov              : eph epv (float)
                custom_state              : button states or switches of a tracker device (uint64_t)

*/
mavlink20.messages.follow_target = function(timestamp, est_capabilities, lat, lon, alt, vel, acc, attitude_q, rates, position_cov, custom_state) {

    this.format = '<QQiif3f3f4f3f3fB';
    this.id = mavlink20.MAVLINK_MSG_ID_FOLLOW_TARGET;
    this.order_map = [0, 10, 2, 3, 4, 5, 6, 7, 8, 9, 1];
    this.crc_extra = 127;
    this.name = 'FOLLOW_TARGET';

    this.fieldnames = ['timestamp', 'est_capabilities', 'lat', 'lon', 'alt', 'vel', 'acc', 'attitude_q', 'rates', 'position_cov', 'custom_state'];


    this.set(arguments);

}
        mavlink20.messages.follow_target.prototype = new mavlink20.message;
mavlink20.messages.follow_target.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.timestamp, this.custom_state, this.lat, this.lon, this.alt, this.vel, this.acc, this.attitude_q, this.rates, this.position_cov, this.est_capabilities]));
}

/* 
The smoothed, monotonic system state used to feed the control loops of
the system.

                time_usec                 : Timestamp (UNIX Epoch time or time since system boot). The receiving end can infer timestamp format (since 1.1.1970 or since system boot) by checking for the magnitude of the number. (uint64_t)
                x_acc                     : X acceleration in body frame (float)
                y_acc                     : Y acceleration in body frame (float)
                z_acc                     : Z acceleration in body frame (float)
                x_vel                     : X velocity in body frame (float)
                y_vel                     : Y velocity in body frame (float)
                z_vel                     : Z velocity in body frame (float)
                x_pos                     : X position in local frame (float)
                y_pos                     : Y position in local frame (float)
                z_pos                     : Z position in local frame (float)
                airspeed                  : Airspeed, set to -1 if unknown (float)
                vel_variance              : Variance of body velocity estimate (float)
                pos_variance              : Variance in local position (float)
                q                         : The attitude, represented as Quaternion (float)
                roll_rate                 : Angular rate in roll axis (float)
                pitch_rate                : Angular rate in pitch axis (float)
                yaw_rate                  : Angular rate in yaw axis (float)

*/
mavlink20.messages.control_system_state = function(time_usec, x_acc, y_acc, z_acc, x_vel, y_vel, z_vel, x_pos, y_pos, z_pos, airspeed, vel_variance, pos_variance, q, roll_rate, pitch_rate, yaw_rate) {

    this.format = '<Qffffffffff3f3f4ffff';
    this.id = mavlink20.MAVLINK_MSG_ID_CONTROL_SYSTEM_STATE;
    this.order_map = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
    this.crc_extra = 103;
    this.name = 'CONTROL_SYSTEM_STATE';

    this.fieldnames = ['time_usec', 'x_acc', 'y_acc', 'z_acc', 'x_vel', 'y_vel', 'z_vel', 'x_pos', 'y_pos', 'z_pos', 'airspeed', 'vel_variance', 'pos_variance', 'q', 'roll_rate', 'pitch_rate', 'yaw_rate'];


    this.set(arguments);

}
        mavlink20.messages.control_system_state.prototype = new mavlink20.message;
mavlink20.messages.control_system_state.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.time_usec, this.x_acc, this.y_acc, this.z_acc, this.x_vel, this.y_vel, this.z_vel, this.x_pos, this.y_pos, this.z_pos, this.airspeed, this.vel_variance, this.pos_variance, this.q, this.roll_rate, this.pitch_rate, this.yaw_rate]));
}

/* 
Battery information. Updates GCS with flight controller battery
status. Smart batteries also use this message, but may additionally
send BATTERY_INFO.

                id                        : Battery ID (uint8_t)
                battery_function          : Function of the battery (uint8_t)
                type                      : Type (chemistry) of the battery (uint8_t)
                temperature               : Temperature of the battery. INT16_MAX for unknown temperature. (int16_t)
                voltages                  : Battery voltage of cells 1 to 10 (see voltages_ext for cells 11-14). Cells in this field above the valid cell count for this battery should have the UINT16_MAX value. If individual cell voltages are unknown or not measured for this battery, then the overall battery voltage should be filled in cell 0, with all others set to UINT16_MAX. If the voltage of the battery is greater than (UINT16_MAX - 1), then cell 0 should be set to (UINT16_MAX - 1), and cell 1 to the remaining voltage. This can be extended to multiple cells if the total voltage is greater than 2 * (UINT16_MAX - 1). (uint16_t)
                current_battery           : Battery current, -1: autopilot does not measure the current (int16_t)
                current_consumed          : Consumed charge, -1: autopilot does not provide consumption estimate (int32_t)
                energy_consumed           : Consumed energy, -1: autopilot does not provide energy consumption estimate (int32_t)
                battery_remaining         : Remaining battery energy. Values: [0-100], -1: autopilot does not estimate the remaining battery. (int8_t)
                time_remaining            : Remaining battery time, 0: autopilot does not provide remaining battery time estimate (int32_t)
                charge_state              : State for extent of discharge, provided by autopilot for warning or external reactions (uint8_t)
                voltages_ext              : Battery voltages for cells 11 to 14. Cells above the valid cell count for this battery should have a value of 0, where zero indicates not supported (note, this is different than for the voltages field and allows empty byte truncation). If the measured value is 0 then 1 should be sent instead. (uint16_t)
                mode                      : Battery mode. Default (0) is that battery mode reporting is not supported or battery is in normal-use mode. (uint8_t)
                fault_bitmask             : Fault/health indications. These should be set when charge_state is MAV_BATTERY_CHARGE_STATE_FAILED or MAV_BATTERY_CHARGE_STATE_UNHEALTHY (if not, fault reporting is not supported). (uint32_t)

*/
mavlink20.messages.battery_status = function(id, battery_function, type, temperature, voltages, current_battery, current_consumed, energy_consumed, battery_remaining, time_remaining, charge_state, voltages_ext, mode, fault_bitmask) {

    this.format = '<iih10HhBBBbiB4HBI';
    this.id = mavlink20.MAVLINK_MSG_ID_BATTERY_STATUS;
    this.order_map = [5, 6, 7, 2, 3, 4, 0, 1, 8, 9, 10, 11, 12, 13];
    this.crc_extra = 154;
    this.name = 'BATTERY_STATUS';

    this.fieldnames = ['id', 'battery_function', 'type', 'temperature', 'voltages', 'current_battery', 'current_consumed', 'energy_consumed', 'battery_remaining', 'time_remaining', 'charge_state', 'voltages_ext', 'mode', 'fault_bitmask'];


    this.set(arguments);

}
        mavlink20.messages.battery_status.prototype = new mavlink20.message;
mavlink20.messages.battery_status.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.current_consumed, this.energy_consumed, this.temperature, this.voltages, this.current_battery, this.id, this.battery_function, this.type, this.battery_remaining, this.time_remaining, this.charge_state, this.voltages_ext, this.mode, this.fault_bitmask]));
}

/* 
The location of a landing target. See:
https://mavlink.io/en/services/landing_target.html

                time_usec                 : Timestamp (UNIX Epoch time or time since system boot). The receiving end can infer timestamp format (since 1.1.1970 or since system boot) by checking for the magnitude of the number. (uint64_t)
                target_num                : The ID of the target if multiple targets are present (uint8_t)
                frame                     : Coordinate frame used for following fields. (uint8_t)
                angle_x                   : X-axis angular offset of the target from the center of the image (float)
                angle_y                   : Y-axis angular offset of the target from the center of the image (float)
                distance                  : Distance to the target from the vehicle (float)
                size_x                    : Size of target along x-axis (float)
                size_y                    : Size of target along y-axis (float)
                x                         : X Position of the landing target in MAV_FRAME (float)
                y                         : Y Position of the landing target in MAV_FRAME (float)
                z                         : Z Position of the landing target in MAV_FRAME (float)
                q                         : Quaternion of landing target orientation (w, x, y, z order, zero-rotation is 1, 0, 0, 0) (float)
                type                      : Type of landing target (uint8_t)
                position_valid            : Position fields (x, y, z, q, type) contain valid target position information (MAV_BOOL_FALSE: invalid values). Values not equal to 0 or 1 are invalid. (uint8_t)

*/
mavlink20.messages.landing_target = function(time_usec, target_num, frame, angle_x, angle_y, distance, size_x, size_y, x, y, z, q, type, position_valid) {

    this.format = '<QfffffBBfff4fBB';
    this.id = mavlink20.MAVLINK_MSG_ID_LANDING_TARGET;
    this.order_map = [0, 6, 7, 1, 2, 3, 4, 5, 8, 9, 10, 11, 12, 13];
    this.crc_extra = 200;
    this.name = 'LANDING_TARGET';

    this.fieldnames = ['time_usec', 'target_num', 'frame', 'angle_x', 'angle_y', 'distance', 'size_x', 'size_y', 'x', 'y', 'z', 'q', 'type', 'position_valid'];


    this.set(arguments);

}
        mavlink20.messages.landing_target.prototype = new mavlink20.message;
mavlink20.messages.landing_target.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.time_usec, this.angle_x, this.angle_y, this.distance, this.size_x, this.size_y, this.target_num, this.frame, this.x, this.y, this.z, this.q, this.type, this.position_valid]));
}

/* 
Status of geo-fencing. Sent in extended status stream when fencing
enabled.

                breach_status             : Breach status (0 if currently inside fence, 1 if outside). (uint8_t)
                breach_count              : Number of fence breaches. (uint16_t)
                breach_type               : Last breach type. (uint8_t)
                breach_time               : Time (since boot) of last breach. (uint32_t)
                breach_mitigation         : Active action to prevent fence breach (uint8_t)

*/
mavlink20.messages.fence_status = function(breach_status, breach_count, breach_type, breach_time, breach_mitigation) {

    this.format = '<IHBBB';
    this.id = mavlink20.MAVLINK_MSG_ID_FENCE_STATUS;
    this.order_map = [2, 1, 3, 0, 4];
    this.crc_extra = 189;
    this.name = 'FENCE_STATUS';

    this.fieldnames = ['breach_status', 'breach_count', 'breach_type', 'breach_time', 'breach_mitigation'];


    this.set(arguments);

}
        mavlink20.messages.fence_status.prototype = new mavlink20.message;
mavlink20.messages.fence_status.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.breach_time, this.breach_count, this.breach_status, this.breach_type, this.breach_mitigation]));
}

/* 
Reports results of completed compass calibration. Sent until
MAG_CAL_ACK received.

                compass_id                : Compass being calibrated. (uint8_t)
                cal_mask                  : Bitmask of compasses being calibrated. (uint8_t)
                cal_status                : Calibration Status. (uint8_t)
                autosaved                 : 0=requires a MAV_CMD_DO_ACCEPT_MAG_CAL, 1=saved to parameters. (uint8_t)
                fitness                   : RMS milligauss residuals. (float)
                ofs_x                     : X offset. (float)
                ofs_y                     : Y offset. (float)
                ofs_z                     : Z offset. (float)
                diag_x                    : X diagonal (matrix 11). (float)
                diag_y                    : Y diagonal (matrix 22). (float)
                diag_z                    : Z diagonal (matrix 33). (float)
                offdiag_x                 : X off-diagonal (matrix 12 and 21). (float)
                offdiag_y                 : Y off-diagonal (matrix 13 and 31). (float)
                offdiag_z                 : Z off-diagonal (matrix 32 and 23). (float)
                orientation_confidence        : Confidence in orientation (higher is better). (float)
                old_orientation           : orientation before calibration. (uint8_t)
                new_orientation           : orientation after calibration. (uint8_t)
                scale_factor              : field radius correction factor (float)

*/
mavlink20.messages.mag_cal_report = function(compass_id, cal_mask, cal_status, autosaved, fitness, ofs_x, ofs_y, ofs_z, diag_x, diag_y, diag_z, offdiag_x, offdiag_y, offdiag_z, orientation_confidence, old_orientation, new_orientation, scale_factor) {

    this.format = '<ffffffffffBBBBfBBf';
    this.id = mavlink20.MAVLINK_MSG_ID_MAG_CAL_REPORT;
    this.order_map = [10, 11, 12, 13, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 14, 15, 16, 17];
    this.crc_extra = 36;
    this.name = 'MAG_CAL_REPORT';

    this.fieldnames = ['compass_id', 'cal_mask', 'cal_status', 'autosaved', 'fitness', 'ofs_x', 'ofs_y', 'ofs_z', 'diag_x', 'diag_y', 'diag_z', 'offdiag_x', 'offdiag_y', 'offdiag_z', 'orientation_confidence', 'old_orientation', 'new_orientation', 'scale_factor'];


    this.set(arguments);

}
        mavlink20.messages.mag_cal_report.prototype = new mavlink20.message;
mavlink20.messages.mag_cal_report.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.fitness, this.ofs_x, this.ofs_y, this.ofs_z, this.diag_x, this.diag_y, this.diag_z, this.offdiag_x, this.offdiag_y, this.offdiag_z, this.compass_id, this.cal_mask, this.cal_status, this.autosaved, this.orientation_confidence, this.old_orientation, this.new_orientation, this.scale_factor]));
}

/* 
EFI status output

                health                    : EFI health status (uint8_t)
                ecu_index                 : ECU index (float)
                rpm                       : RPM (float)
                fuel_consumed             : Fuel consumed (float)
                fuel_flow                 : Fuel flow rate (float)
                engine_load               : Engine load (float)
                throttle_position         : Throttle position (float)
                spark_dwell_time          : Spark dwell time (float)
                barometric_pressure        : Barometric pressure (float)
                intake_manifold_pressure        : Intake manifold pressure( (float)
                intake_manifold_temperature        : Intake manifold temperature (float)
                cylinder_head_temperature        : Cylinder head temperature (float)
                ignition_timing           : Ignition timing (Crank angle degrees) (float)
                injection_time            : Injection time (float)
                exhaust_gas_temperature        : Exhaust gas temperature (float)
                throttle_out              : Output throttle (float)
                pt_compensation           : Pressure/temperature compensation (float)
                ignition_voltage          : Supply voltage to EFI sparking system.  Zero in this value means "unknown", so if the supply voltage really is zero volts use 0.0001 instead. (float)
                fuel_pressure             : Fuel pressure. Zero in this value means "unknown", so if the fuel pressure really is zero kPa use 0.0001 instead. (float)

*/
mavlink20.messages.efi_status = function(health, ecu_index, rpm, fuel_consumed, fuel_flow, engine_load, throttle_position, spark_dwell_time, barometric_pressure, intake_manifold_pressure, intake_manifold_temperature, cylinder_head_temperature, ignition_timing, injection_time, exhaust_gas_temperature, throttle_out, pt_compensation, ignition_voltage, fuel_pressure) {

    this.format = '<ffffffffffffffffBff';
    this.id = mavlink20.MAVLINK_MSG_ID_EFI_STATUS;
    this.order_map = [16, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 17, 18];
    this.crc_extra = 208;
    this.name = 'EFI_STATUS';

    this.fieldnames = ['health', 'ecu_index', 'rpm', 'fuel_consumed', 'fuel_flow', 'engine_load', 'throttle_position', 'spark_dwell_time', 'barometric_pressure', 'intake_manifold_pressure', 'intake_manifold_temperature', 'cylinder_head_temperature', 'ignition_timing', 'injection_time', 'exhaust_gas_temperature', 'throttle_out', 'pt_compensation', 'ignition_voltage', 'fuel_pressure'];


    this.set(arguments);

}
        mavlink20.messages.efi_status.prototype = new mavlink20.message;
mavlink20.messages.efi_status.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.ecu_index, this.rpm, this.fuel_consumed, this.fuel_flow, this.engine_load, this.throttle_position, this.spark_dwell_time, this.barometric_pressure, this.intake_manifold_pressure, this.intake_manifold_temperature, this.cylinder_head_temperature, this.ignition_timing, this.injection_time, this.exhaust_gas_temperature, this.throttle_out, this.pt_compensation, this.health, this.ignition_voltage, this.fuel_pressure]));
}

/* 
Estimator status message including flags, innovation test ratios and
estimated accuracies. The flags message is an integer bitmask
containing information on which EKF outputs are valid. See the
ESTIMATOR_STATUS_FLAGS enum definition for further information. The
innovation test ratios show the magnitude of the sensor innovation
divided by the innovation check threshold. Under normal operation the
innovation test ratios should be below 0.5 with occasional values up
to 1.0. Values greater than 1.0 should be rare under normal operation
and indicate that a measurement has been rejected by the filter. The
user should be notified if an innovation test ratio greater than 1.0
is recorded. Notifications for values in the range between 0.5 and 1.0
should be optional and controllable by the user.

                time_usec                 : Timestamp (UNIX Epoch time or time since system boot). The receiving end can infer timestamp format (since 1.1.1970 or since system boot) by checking for the magnitude of the number. (uint64_t)
                flags                     : Bitmap indicating which EKF outputs are valid. (uint16_t)
                vel_ratio                 : Velocity innovation test ratio (float)
                pos_horiz_ratio           : Horizontal position innovation test ratio (float)
                pos_vert_ratio            : Vertical position innovation test ratio (float)
                mag_ratio                 : Magnetometer innovation test ratio (float)
                hagl_ratio                : Height above terrain innovation test ratio (float)
                tas_ratio                 : True airspeed innovation test ratio (float)
                pos_horiz_accuracy        : Horizontal position 1-STD accuracy relative to the EKF local origin (float)
                pos_vert_accuracy         : Vertical position 1-STD accuracy relative to the EKF local origin (float)

*/
mavlink20.messages.estimator_status = function(time_usec, flags, vel_ratio, pos_horiz_ratio, pos_vert_ratio, mag_ratio, hagl_ratio, tas_ratio, pos_horiz_accuracy, pos_vert_accuracy) {

    this.format = '<QffffffffH';
    this.id = mavlink20.MAVLINK_MSG_ID_ESTIMATOR_STATUS;
    this.order_map = [0, 9, 1, 2, 3, 4, 5, 6, 7, 8];
    this.crc_extra = 163;
    this.name = 'ESTIMATOR_STATUS';

    this.fieldnames = ['time_usec', 'flags', 'vel_ratio', 'pos_horiz_ratio', 'pos_vert_ratio', 'mag_ratio', 'hagl_ratio', 'tas_ratio', 'pos_horiz_accuracy', 'pos_vert_accuracy'];


    this.set(arguments);

}
        mavlink20.messages.estimator_status.prototype = new mavlink20.message;
mavlink20.messages.estimator_status.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.time_usec, this.vel_ratio, this.pos_horiz_ratio, this.pos_vert_ratio, this.mag_ratio, this.hagl_ratio, this.tas_ratio, this.pos_horiz_accuracy, this.pos_vert_accuracy, this.flags]));
}

/* 
Wind estimate from vehicle. Note that despite the name, this message
does not actually contain any covariances but instead variability and
accuracy fields in terms of standard deviation (1-STD).

                time_usec                 : Timestamp (UNIX Epoch time or time since system boot). The receiving end can infer timestamp format (since 1.1.1970 or since system boot) by checking for the magnitude of the number. (uint64_t)
                wind_x                    : Wind in North (NED) direction (NAN if unknown) (float)
                wind_y                    : Wind in East (NED) direction (NAN if unknown) (float)
                wind_z                    : Wind in down (NED) direction (NAN if unknown) (float)
                var_horiz                 : Variability of wind in XY, 1-STD estimated from a 1 Hz lowpassed wind estimate (NAN if unknown) (float)
                var_vert                  : Variability of wind in Z, 1-STD estimated from a 1 Hz lowpassed wind estimate (NAN if unknown) (float)
                wind_alt                  : Altitude (MSL) that this measurement was taken at (NAN if unknown) (float)
                horiz_accuracy            : Horizontal speed 1-STD accuracy (0 if unknown) (float)
                vert_accuracy             : Vertical speed 1-STD accuracy (0 if unknown) (float)

*/
mavlink20.messages.wind_cov = function(time_usec, wind_x, wind_y, wind_z, var_horiz, var_vert, wind_alt, horiz_accuracy, vert_accuracy) {

    this.format = '<Qffffffff';
    this.id = mavlink20.MAVLINK_MSG_ID_WIND_COV;
    this.order_map = [0, 1, 2, 3, 4, 5, 6, 7, 8];
    this.crc_extra = 105;
    this.name = 'WIND_COV';

    this.fieldnames = ['time_usec', 'wind_x', 'wind_y', 'wind_z', 'var_horiz', 'var_vert', 'wind_alt', 'horiz_accuracy', 'vert_accuracy'];


    this.set(arguments);

}
        mavlink20.messages.wind_cov.prototype = new mavlink20.message;
mavlink20.messages.wind_cov.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.time_usec, this.wind_x, this.wind_y, this.wind_z, this.var_horiz, this.var_vert, this.wind_alt, this.horiz_accuracy, this.vert_accuracy]));
}

/* 
GPS sensor input message.  This is a raw sensor value sent by the GPS.
This is NOT the global position estimate of the system.

                time_usec                 : Timestamp (UNIX Epoch time or time since system boot). The receiving end can infer timestamp format (since 1.1.1970 or since system boot) by checking for the magnitude of the number. (uint64_t)
                gps_id                    : ID of the GPS for multiple GPS inputs (uint8_t)
                ignore_flags              : Bitmap indicating which GPS input flags fields to ignore.  All other fields must be provided. (uint16_t)
                time_week_ms              : GPS time (from start of GPS week) (uint32_t)
                time_week                 : GPS week number (uint16_t)
                fix_type                  : 0-1: no fix, 2: 2D fix, 3: 3D fix. 4: 3D with DGPS. 5: 3D with RTK (uint8_t)
                lat                       : Latitude (WGS84) (int32_t)
                lon                       : Longitude (WGS84) (int32_t)
                alt                       : Altitude (MSL). Positive for up. (float)
                hdop                      : GPS HDOP horizontal dilution of position (unitless). If unknown, set to: UINT16_MAX (float)
                vdop                      : GPS VDOP vertical dilution of position (unitless). If unknown, set to: UINT16_MAX (float)
                vn                        : GPS velocity in north direction in earth-fixed NED frame (float)
                ve                        : GPS velocity in east direction in earth-fixed NED frame (float)
                vd                        : GPS velocity in down direction in earth-fixed NED frame (float)
                speed_accuracy            : GPS speed accuracy (float)
                horiz_accuracy            : GPS horizontal accuracy (float)
                vert_accuracy             : GPS vertical accuracy (float)
                satellites_visible        : Number of satellites visible. (uint8_t)
                yaw                       : Yaw of vehicle relative to Earth's North, zero means not available, use 36000 for north (uint16_t)

*/
mavlink20.messages.gps_input = function(time_usec, gps_id, ignore_flags, time_week_ms, time_week, fix_type, lat, lon, alt, hdop, vdop, vn, ve, vd, speed_accuracy, horiz_accuracy, vert_accuracy, satellites_visible, yaw) {

    this.format = '<QIiifffffffffHHBBBH';
    this.id = mavlink20.MAVLINK_MSG_ID_GPS_INPUT;
    this.order_map = [0, 15, 13, 1, 14, 16, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 17, 18];
    this.crc_extra = 151;
    this.name = 'GPS_INPUT';

    this.fieldnames = ['time_usec', 'gps_id', 'ignore_flags', 'time_week_ms', 'time_week', 'fix_type', 'lat', 'lon', 'alt', 'hdop', 'vdop', 'vn', 've', 'vd', 'speed_accuracy', 'horiz_accuracy', 'vert_accuracy', 'satellites_visible', 'yaw'];


    this.set(arguments);

}
        mavlink20.messages.gps_input.prototype = new mavlink20.message;
mavlink20.messages.gps_input.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.time_usec, this.time_week_ms, this.lat, this.lon, this.alt, this.hdop, this.vdop, this.vn, this.ve, this.vd, this.speed_accuracy, this.horiz_accuracy, this.vert_accuracy, this.ignore_flags, this.time_week, this.gps_id, this.fix_type, this.satellites_visible, this.yaw]));
}

/* 
RTCM message for injecting into the onboard GPS (used for DGPS)

                flags                     : LSB: 1 means message is fragmented, next 2 bits are the fragment ID, the remaining 5 bits are used for the sequence ID. Messages are only to be flushed to the GPS when the entire message has been reconstructed on the autopilot. The fragment ID specifies which order the fragments should be assembled into a buffer, while the sequence ID is used to detect a mismatch between different buffers. The buffer is considered fully reconstructed when either all 4 fragments are present, or all the fragments before the first fragment with a non full payload is received. This management is used to ensure that normal GPS operation doesn't corrupt RTCM data, and to recover from a unreliable transport delivery order. (uint8_t)
                len                       : data length (uint8_t)
                data                      : RTCM message (may be fragmented) (uint8_t)

*/
mavlink20.messages.gps_rtcm_data = function(flags, len, data) {

    this.format = '<BB180s';
    this.id = mavlink20.MAVLINK_MSG_ID_GPS_RTCM_DATA;
    this.order_map = [0, 1, 2];
    this.crc_extra = 35;
    this.name = 'GPS_RTCM_DATA';

    this.fieldnames = ['flags', 'len', 'data'];


    this.set(arguments);

}
        mavlink20.messages.gps_rtcm_data.prototype = new mavlink20.message;
mavlink20.messages.gps_rtcm_data.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.flags, this.len, this.data]));
}

/* 
Message appropriate for high latency connections like Iridium

                base_mode                 : Bitmap of enabled system modes. (uint8_t)
                custom_mode               : A bitfield for use for autopilot-specific flags. (uint32_t)
                landed_state              : The landed state. Is set to MAV_LANDED_STATE_UNDEFINED if landed state is unknown. (uint8_t)
                roll                      : roll (int16_t)
                pitch                     : pitch (int16_t)
                heading                   : heading (uint16_t)
                throttle                  : throttle (percentage) (int8_t)
                heading_sp                : heading setpoint (int16_t)
                latitude                  : Latitude (int32_t)
                longitude                 : Longitude (int32_t)
                altitude_amsl             : Altitude above mean sea level (int16_t)
                altitude_sp               : Altitude setpoint relative to the home position (int16_t)
                airspeed                  : airspeed (uint8_t)
                airspeed_sp               : airspeed setpoint (uint8_t)
                groundspeed               : groundspeed (uint8_t)
                climb_rate                : climb rate (int8_t)
                gps_nsat                  : Number of satellites visible. If unknown, set to UINT8_MAX (uint8_t)
                gps_fix_type              : GPS Fix type. (uint8_t)
                battery_remaining         : Remaining battery (percentage) (uint8_t)
                temperature               : Autopilot temperature (degrees C) (int8_t)
                temperature_air           : Air temperature (degrees C) from airspeed sensor (int8_t)
                failsafe                  : failsafe (each bit represents a failsafe where 0=ok, 1=failsafe active (bit0:RC, bit1:batt, bit2:GPS, bit3:GCS, bit4:fence) (uint8_t)
                wp_num                    : current waypoint number (uint8_t)
                wp_distance               : distance to target (uint16_t)

*/
mavlink20.messages.high_latency = function(base_mode, custom_mode, landed_state, roll, pitch, heading, throttle, heading_sp, latitude, longitude, altitude_amsl, altitude_sp, airspeed, airspeed_sp, groundspeed, climb_rate, gps_nsat, gps_fix_type, battery_remaining, temperature, temperature_air, failsafe, wp_num, wp_distance) {

    this.format = '<IiihhHhhhHBBbBBBbBBBbbBB';
    this.id = mavlink20.MAVLINK_MSG_ID_HIGH_LATENCY;
    this.order_map = [10, 0, 11, 3, 4, 5, 12, 6, 1, 2, 7, 8, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 9];
    this.crc_extra = 150;
    this.name = 'HIGH_LATENCY';

    this.fieldnames = ['base_mode', 'custom_mode', 'landed_state', 'roll', 'pitch', 'heading', 'throttle', 'heading_sp', 'latitude', 'longitude', 'altitude_amsl', 'altitude_sp', 'airspeed', 'airspeed_sp', 'groundspeed', 'climb_rate', 'gps_nsat', 'gps_fix_type', 'battery_remaining', 'temperature', 'temperature_air', 'failsafe', 'wp_num', 'wp_distance'];


    this.set(arguments);

}
        mavlink20.messages.high_latency.prototype = new mavlink20.message;
mavlink20.messages.high_latency.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.custom_mode, this.latitude, this.longitude, this.roll, this.pitch, this.heading, this.heading_sp, this.altitude_amsl, this.altitude_sp, this.wp_distance, this.base_mode, this.landed_state, this.throttle, this.airspeed, this.airspeed_sp, this.groundspeed, this.climb_rate, this.gps_nsat, this.gps_fix_type, this.battery_remaining, this.temperature, this.temperature_air, this.failsafe, this.wp_num]));
}

/* 
Message appropriate for high latency connections like Iridium (version
2)

                timestamp                 : Timestamp (milliseconds since boot or Unix epoch) (uint32_t)
                type                      : Type of the MAV (quadrotor, helicopter, etc.) (uint8_t)
                autopilot                 : Autopilot type / class. Use MAV_AUTOPILOT_INVALID for components that are not flight controllers. (uint8_t)
                custom_mode               : A bitfield for use for autopilot-specific flags (2 byte version). (uint16_t)
                latitude                  : Latitude (int32_t)
                longitude                 : Longitude (int32_t)
                altitude                  : Altitude above mean sea level (int16_t)
                target_altitude           : Altitude setpoint (int16_t)
                heading                   : Heading (uint8_t)
                target_heading            : Heading setpoint (uint8_t)
                target_distance           : Distance to target waypoint or position (uint16_t)
                throttle                  : Throttle (uint8_t)
                airspeed                  : Airspeed (uint8_t)
                airspeed_sp               : Airspeed setpoint (uint8_t)
                groundspeed               : Groundspeed (uint8_t)
                windspeed                 : Windspeed (uint8_t)
                wind_heading              : Wind heading (uint8_t)
                eph                       : Maximum error horizontal position since last message (uint8_t)
                epv                       : Maximum error vertical position since last message (uint8_t)
                temperature_air           : Air temperature (int8_t)
                climb_rate                : Maximum climb rate magnitude since last message (int8_t)
                battery                   : Battery level (-1 if field not provided). (int8_t)
                wp_num                    : Current waypoint number (uint16_t)
                failure_flags             : Bitmap of failure flags. (uint16_t)
                custom0                   : Field for custom payload. (int8_t)
                custom1                   : Field for custom payload. (int8_t)
                custom2                   : Field for custom payload. (int8_t)

*/
mavlink20.messages.high_latency2 = function(timestamp, type, autopilot, custom_mode, latitude, longitude, altitude, target_altitude, heading, target_heading, target_distance, throttle, airspeed, airspeed_sp, groundspeed, windspeed, wind_heading, eph, epv, temperature_air, climb_rate, battery, wp_num, failure_flags, custom0, custom1, custom2) {

    this.format = '<IiiHhhHHHBBBBBBBBBBBBbbbbbb';
    this.id = mavlink20.MAVLINK_MSG_ID_HIGH_LATENCY2;
    this.order_map = [0, 9, 10, 3, 1, 2, 4, 5, 11, 12, 6, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 7, 8, 24, 25, 26];
    this.crc_extra = 179;
    this.name = 'HIGH_LATENCY2';

    this.fieldnames = ['timestamp', 'type', 'autopilot', 'custom_mode', 'latitude', 'longitude', 'altitude', 'target_altitude', 'heading', 'target_heading', 'target_distance', 'throttle', 'airspeed', 'airspeed_sp', 'groundspeed', 'windspeed', 'wind_heading', 'eph', 'epv', 'temperature_air', 'climb_rate', 'battery', 'wp_num', 'failure_flags', 'custom0', 'custom1', 'custom2'];


    this.set(arguments);

}
        mavlink20.messages.high_latency2.prototype = new mavlink20.message;
mavlink20.messages.high_latency2.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.timestamp, this.latitude, this.longitude, this.custom_mode, this.altitude, this.target_altitude, this.target_distance, this.wp_num, this.failure_flags, this.type, this.autopilot, this.heading, this.target_heading, this.throttle, this.airspeed, this.airspeed_sp, this.groundspeed, this.windspeed, this.wind_heading, this.eph, this.epv, this.temperature_air, this.climb_rate, this.battery, this.custom0, this.custom1, this.custom2]));
}

/* 
Vibration levels and accelerometer clipping

                time_usec                 : Timestamp (UNIX Epoch time or time since system boot). The receiving end can infer timestamp format (since 1.1.1970 or since system boot) by checking for the magnitude of the number. (uint64_t)
                vibration_x               : Vibration levels on X-axis (float)
                vibration_y               : Vibration levels on Y-axis (float)
                vibration_z               : Vibration levels on Z-axis (float)
                clipping_0                : first accelerometer clipping count (uint32_t)
                clipping_1                : second accelerometer clipping count (uint32_t)
                clipping_2                : third accelerometer clipping count (uint32_t)

*/
mavlink20.messages.vibration = function(time_usec, vibration_x, vibration_y, vibration_z, clipping_0, clipping_1, clipping_2) {

    this.format = '<QfffIII';
    this.id = mavlink20.MAVLINK_MSG_ID_VIBRATION;
    this.order_map = [0, 1, 2, 3, 4, 5, 6];
    this.crc_extra = 90;
    this.name = 'VIBRATION';

    this.fieldnames = ['time_usec', 'vibration_x', 'vibration_y', 'vibration_z', 'clipping_0', 'clipping_1', 'clipping_2'];


    this.set(arguments);

}
        mavlink20.messages.vibration.prototype = new mavlink20.message;
mavlink20.messages.vibration.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.time_usec, this.vibration_x, this.vibration_y, this.vibration_z, this.clipping_0, this.clipping_1, this.clipping_2]));
}

/* 
Contains the home position.         The home position is the default
position that the system will return to and land on.         The
position must be set automatically by the system during the takeoff,
and may also be explicitly set using MAV_CMD_DO_SET_HOME.         The
global and local positions encode the position in the respective
coordinate frames, while the q parameter encodes the orientation of
the surface.         Under normal conditions it describes the heading
and terrain slope, which can be used by the aircraft to adjust the
approach.         The approach 3D vector describes the point to which
the system should fly in normal flight mode and then perform a landing
sequence along the vector.         Note: this message can be requested
by sending the MAV_CMD_REQUEST_MESSAGE with param1=242 (or the
deprecated MAV_CMD_GET_HOME_POSITION command).

                latitude                  : Latitude (WGS84) (int32_t)
                longitude                 : Longitude (WGS84) (int32_t)
                altitude                  : Altitude (MSL). Positive for up. (int32_t)
                x                         : Local X position of this position in the local coordinate frame (NED) (float)
                y                         : Local Y position of this position in the local coordinate frame (NED) (float)
                z                         : Local Z position of this position in the local coordinate frame (NED: positive "down") (float)
                q                         : Quaternion indicating world-to-surface-normal and heading transformation of the takeoff position.
        Used to indicate the heading and slope of the ground.
        All fields should be set to NaN if an accurate quaternion for both heading and surface slope cannot be supplied. (float)
                approach_x                : Local X position of the end of the approach vector. Multicopters should set this position based on their takeoff path. Grass-landing fixed wing aircraft should set it the same way as multicopters. Runway-landing fixed wing aircraft should set it to the opposite direction of the takeoff, assuming the takeoff happened from the threshold / touchdown zone. (float)
                approach_y                : Local Y position of the end of the approach vector. Multicopters should set this position based on their takeoff path. Grass-landing fixed wing aircraft should set it the same way as multicopters. Runway-landing fixed wing aircraft should set it to the opposite direction of the takeoff, assuming the takeoff happened from the threshold / touchdown zone. (float)
                approach_z                : Local Z position of the end of the approach vector. Multicopters should set this position based on their takeoff path. Grass-landing fixed wing aircraft should set it the same way as multicopters. Runway-landing fixed wing aircraft should set it to the opposite direction of the takeoff, assuming the takeoff happened from the threshold / touchdown zone. (float)
                time_usec                 : Timestamp (UNIX Epoch time or time since system boot). The receiving end can infer timestamp format (since 1.1.1970 or since system boot) by checking for the magnitude of the number. (uint64_t)

*/
mavlink20.messages.home_position = function(latitude, longitude, altitude, x, y, z, q, approach_x, approach_y, approach_z, time_usec) {

    this.format = '<iiifff4ffffQ';
    this.id = mavlink20.MAVLINK_MSG_ID_HOME_POSITION;
    this.order_map = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    this.crc_extra = 104;
    this.name = 'HOME_POSITION';

    this.fieldnames = ['latitude', 'longitude', 'altitude', 'x', 'y', 'z', 'q', 'approach_x', 'approach_y', 'approach_z', 'time_usec'];


    this.set(arguments);

}
        mavlink20.messages.home_position.prototype = new mavlink20.message;
mavlink20.messages.home_position.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.latitude, this.longitude, this.altitude, this.x, this.y, this.z, this.q, this.approach_x, this.approach_y, this.approach_z, this.time_usec]));
}

/* 
Sets the home position.         The home position is the default
position that the system will return to and land on.         The
position is set automatically by the system during the takeoff (and
may also be set using this message).         The global and local
positions encode the position in the respective coordinate frames,
while the q parameter encodes the orientation of the surface.
Under normal conditions it describes the heading and terrain slope,
which can be used by the aircraft to adjust the approach.         The
approach 3D vector describes the point to which the system should fly
in normal flight mode and then perform a landing sequence along the
vector.         Note: the current home position may be emitted in a
HOME_POSITION message on request (using MAV_CMD_REQUEST_MESSAGE with
param1=242).

                target_system             : System ID. (uint8_t)
                latitude                  : Latitude (WGS84) (int32_t)
                longitude                 : Longitude (WGS84) (int32_t)
                altitude                  : Altitude (MSL). Positive for up. (int32_t)
                x                         : Local X position of this position in the local coordinate frame (NED) (float)
                y                         : Local Y position of this position in the local coordinate frame (NED) (float)
                z                         : Local Z position of this position in the local coordinate frame (NED: positive "down") (float)
                q                         : World to surface normal and heading transformation of the takeoff position. Used to indicate the heading and slope of the ground (float)
                approach_x                : Local X position of the end of the approach vector. Multicopters should set this position based on their takeoff path. Grass-landing fixed wing aircraft should set it the same way as multicopters. Runway-landing fixed wing aircraft should set it to the opposite direction of the takeoff, assuming the takeoff happened from the threshold / touchdown zone. (float)
                approach_y                : Local Y position of the end of the approach vector. Multicopters should set this position based on their takeoff path. Grass-landing fixed wing aircraft should set it the same way as multicopters. Runway-landing fixed wing aircraft should set it to the opposite direction of the takeoff, assuming the takeoff happened from the threshold / touchdown zone. (float)
                approach_z                : Local Z position of the end of the approach vector. Multicopters should set this position based on their takeoff path. Grass-landing fixed wing aircraft should set it the same way as multicopters. Runway-landing fixed wing aircraft should set it to the opposite direction of the takeoff, assuming the takeoff happened from the threshold / touchdown zone. (float)
                time_usec                 : Timestamp (UNIX Epoch time or time since system boot). The receiving end can infer timestamp format (since 1.1.1970 or since system boot) by checking for the magnitude of the number. (uint64_t)

*/
mavlink20.messages.set_home_position = function(target_system, latitude, longitude, altitude, x, y, z, q, approach_x, approach_y, approach_z, time_usec) {

    this.format = '<iiifff4ffffBQ';
    this.id = mavlink20.MAVLINK_MSG_ID_SET_HOME_POSITION;
    this.order_map = [10, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 11];
    this.crc_extra = 85;
    this.name = 'SET_HOME_POSITION';

    this.fieldnames = ['target_system', 'latitude', 'longitude', 'altitude', 'x', 'y', 'z', 'q', 'approach_x', 'approach_y', 'approach_z', 'time_usec'];


    this.set(arguments);

}
        mavlink20.messages.set_home_position.prototype = new mavlink20.message;
mavlink20.messages.set_home_position.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.latitude, this.longitude, this.altitude, this.x, this.y, this.z, this.q, this.approach_x, this.approach_y, this.approach_z, this.target_system, this.time_usec]));
}

/* 
The interval between messages for a particular MAVLink message ID.
This message is sent in response to the MAV_CMD_REQUEST_MESSAGE
command with param1=244 (this message) and param2=message_id (the id
of the message for which the interval is required).         It may
also be sent in response to MAV_CMD_GET_MESSAGE_INTERVAL.         This
interface replaces DATA_STREAM.

                message_id                : The ID of the requested MAVLink message. v1.0 is limited to 254 messages. (uint16_t)
                interval_us               : The interval between two messages. A value of -1 indicates this stream is disabled, 0 indicates it is not available, > 0 indicates the interval at which it is sent. (int32_t)

*/
mavlink20.messages.message_interval = function(message_id, interval_us) {

    this.format = '<iH';
    this.id = mavlink20.MAVLINK_MSG_ID_MESSAGE_INTERVAL;
    this.order_map = [1, 0];
    this.crc_extra = 95;
    this.name = 'MESSAGE_INTERVAL';

    this.fieldnames = ['message_id', 'interval_us'];


    this.set(arguments);

}
        mavlink20.messages.message_interval.prototype = new mavlink20.message;
mavlink20.messages.message_interval.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.interval_us, this.message_id]));
}

/* 
Provides state for additional features

                vtol_state                : The VTOL state if applicable. Is set to MAV_VTOL_STATE_UNDEFINED if UAV is not in VTOL configuration. (uint8_t)
                landed_state              : The landed state. Is set to MAV_LANDED_STATE_UNDEFINED if landed state is unknown. (uint8_t)

*/
mavlink20.messages.extended_sys_state = function(vtol_state, landed_state) {

    this.format = '<BB';
    this.id = mavlink20.MAVLINK_MSG_ID_EXTENDED_SYS_STATE;
    this.order_map = [0, 1];
    this.crc_extra = 130;
    this.name = 'EXTENDED_SYS_STATE';

    this.fieldnames = ['vtol_state', 'landed_state'];


    this.set(arguments);

}
        mavlink20.messages.extended_sys_state.prototype = new mavlink20.message;
mavlink20.messages.extended_sys_state.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.vtol_state, this.landed_state]));
}

/* 
The location and information of an ADSB vehicle

                ICAO_address              : ICAO address (uint32_t)
                lat                       : Latitude (int32_t)
                lon                       : Longitude (int32_t)
                altitude_type             : ADSB altitude type. (uint8_t)
                altitude                  : Altitude(ASL) (int32_t)
                heading                   : Course over ground (uint16_t)
                hor_velocity              : The horizontal velocity (uint16_t)
                ver_velocity              : The vertical velocity. Positive is up (int16_t)
                callsign                  : The callsign, 8+null (char)
                emitter_type              : ADSB emitter type. (uint8_t)
                tslc                      : Time since last communication in seconds (uint8_t)
                flags                     : Bitmap to indicate various statuses including valid data fields (uint16_t)
                squawk                    : Squawk code. Note that the code is in decimal: e.g. 7700 (general emergency) is encoded as binary 0b0001_1110_0001_0100, not(!) as 0b0000_111_111_000_000 (uint16_t)

*/
mavlink20.messages.adsb_vehicle = function(ICAO_address, lat, lon, altitude_type, altitude, heading, hor_velocity, ver_velocity, callsign, emitter_type, tslc, flags, squawk) {

    this.format = '<IiiiHHhHHB9sBB';
    this.id = mavlink20.MAVLINK_MSG_ID_ADSB_VEHICLE;
    this.order_map = [0, 1, 2, 9, 3, 4, 5, 6, 10, 11, 12, 7, 8];
    this.crc_extra = 184;
    this.name = 'ADSB_VEHICLE';

    this.fieldnames = ['ICAO_address', 'lat', 'lon', 'altitude_type', 'altitude', 'heading', 'hor_velocity', 'ver_velocity', 'callsign', 'emitter_type', 'tslc', 'flags', 'squawk'];


    this.set(arguments);

}
        mavlink20.messages.adsb_vehicle.prototype = new mavlink20.message;
mavlink20.messages.adsb_vehicle.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.ICAO_address, this.lat, this.lon, this.altitude, this.heading, this.hor_velocity, this.ver_velocity, this.flags, this.squawk, this.altitude_type, this.callsign, this.emitter_type, this.tslc]));
}

/* 
Information about a potential collision

                src                       : Collision data source (uint8_t)
                id                        : Unique identifier, domain based on src field (uint32_t)
                action                    : Action that is being taken to avoid this collision (uint8_t)
                threat_level              : How concerned the aircraft is about this collision (uint8_t)
                time_to_minimum_delta        : Estimated time until collision occurs (float)
                altitude_minimum_delta        : Closest vertical distance between vehicle and object (float)
                horizontal_minimum_delta        : Closest horizontal distance between vehicle and object (float)

*/
mavlink20.messages.collision = function(src, id, action, threat_level, time_to_minimum_delta, altitude_minimum_delta, horizontal_minimum_delta) {

    this.format = '<IfffBBB';
    this.id = mavlink20.MAVLINK_MSG_ID_COLLISION;
    this.order_map = [4, 0, 5, 6, 1, 2, 3];
    this.crc_extra = 81;
    this.name = 'COLLISION';

    this.fieldnames = ['src', 'id', 'action', 'threat_level', 'time_to_minimum_delta', 'altitude_minimum_delta', 'horizontal_minimum_delta'];


    this.set(arguments);

}
        mavlink20.messages.collision.prototype = new mavlink20.message;
mavlink20.messages.collision.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.id, this.time_to_minimum_delta, this.altitude_minimum_delta, this.horizontal_minimum_delta, this.src, this.action, this.threat_level]));
}

/* 
Message implementing parts of the V2 payload specs in V1 frames for
transitional support.

                target_network            : Network ID (0 for broadcast) (uint8_t)
                target_system             : System ID (0 for broadcast) (uint8_t)
                target_component          : Component ID (0 for broadcast) (uint8_t)
                message_type              : A code that identifies the software component that understands this message (analogous to USB device classes or mime type strings). If this code is less than 32768, it is considered a 'registered' protocol extension and the corresponding entry should be added to https://github.com/mavlink/mavlink/definition_files/extension_message_ids.xml. Software creators can register blocks of message IDs as needed (useful for GCS specific metadata, etc...). Message_types greater than 32767 are considered local experiments and should not be checked in to any widely distributed codebase. (uint16_t)
                payload                   : Variable length payload. The length must be encoded in the payload as part of the message_type protocol, e.g. by including the length as payload data, or by terminating the payload data with a non-zero marker. This is required in order to reconstruct zero-terminated payloads that are (or otherwise would be) trimmed by MAVLink 2 empty-byte truncation. The entire content of the payload block is opaque unless you understand the encoding message_type. The particular encoding used can be extension specific and might not always be documented as part of the MAVLink specification. (uint8_t)

*/
mavlink20.messages.v2_extension = function(target_network, target_system, target_component, message_type, payload) {

    this.format = '<HBBB249s';
    this.id = mavlink20.MAVLINK_MSG_ID_V2_EXTENSION;
    this.order_map = [1, 2, 3, 0, 4];
    this.crc_extra = 8;
    this.name = 'V2_EXTENSION';

    this.fieldnames = ['target_network', 'target_system', 'target_component', 'message_type', 'payload'];


    this.set(arguments);

}
        mavlink20.messages.v2_extension.prototype = new mavlink20.message;
mavlink20.messages.v2_extension.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.message_type, this.target_network, this.target_system, this.target_component, this.payload]));
}

/* 
Send raw controller memory. The use of this message is discouraged for
normal packets, but a quite efficient way for testing new messages and
getting experimental debug output.

                address                   : Starting address of the debug variables (uint16_t)
                ver                       : Version code of the type variable. 0=unknown, type ignored and assumed int16_t. 1=as below (uint8_t)
                type                      : Type code of the memory variables. for ver = 1: 0=16 x int16_t, 1=16 x uint16_t, 2=16 x Q15, 3=16 x 1Q14 (uint8_t)
                value                     : Memory contents at specified address (int8_t)

*/
mavlink20.messages.memory_vect = function(address, ver, type, value) {

    this.format = '<HBB32s';
    this.id = mavlink20.MAVLINK_MSG_ID_MEMORY_VECT;
    this.order_map = [0, 1, 2, 3];
    this.crc_extra = 204;
    this.name = 'MEMORY_VECT';

    this.fieldnames = ['address', 'ver', 'type', 'value'];


    this.set(arguments);

}
        mavlink20.messages.memory_vect.prototype = new mavlink20.message;
mavlink20.messages.memory_vect.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.address, this.ver, this.type, this.value]));
}

/* 
To debug something using a named 3D vector.

                name                      : Name (char)
                time_usec                 : Timestamp (UNIX Epoch time or time since system boot). The receiving end can infer timestamp format (since 1.1.1970 or since system boot) by checking for the magnitude of the number. (uint64_t)
                x                         : x (float)
                y                         : y (float)
                z                         : z (float)

*/
mavlink20.messages.debug_vect = function(name, time_usec, x, y, z) {

    this.format = '<Qfff10s';
    this.id = mavlink20.MAVLINK_MSG_ID_DEBUG_VECT;
    this.order_map = [4, 0, 1, 2, 3];
    this.crc_extra = 49;
    this.name = 'DEBUG_VECT';

    this.fieldnames = ['name', 'time_usec', 'x', 'y', 'z'];


    this.set(arguments);

}
        mavlink20.messages.debug_vect.prototype = new mavlink20.message;
mavlink20.messages.debug_vect.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.time_usec, this.x, this.y, this.z, this.name]));
}

/* 
Send a key-value pair as float. The use of this message is discouraged
for normal packets, but a quite efficient way for testing new messages
and getting experimental debug output.

                time_boot_ms              : Timestamp (time since system boot). (uint32_t)
                name                      : Name of the debug variable (char)
                value                     : Floating point value (float)

*/
mavlink20.messages.named_value_float = function(time_boot_ms, name, value) {

    this.format = '<If10s';
    this.id = mavlink20.MAVLINK_MSG_ID_NAMED_VALUE_FLOAT;
    this.order_map = [0, 2, 1];
    this.crc_extra = 170;
    this.name = 'NAMED_VALUE_FLOAT';

    this.fieldnames = ['time_boot_ms', 'name', 'value'];


    this.set(arguments);

}
        mavlink20.messages.named_value_float.prototype = new mavlink20.message;
mavlink20.messages.named_value_float.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.time_boot_ms, this.value, this.name]));
}

/* 
Send a key-value pair as integer. The use of this message is
discouraged for normal packets, but a quite efficient way for testing
new messages and getting experimental debug output.

                time_boot_ms              : Timestamp (time since system boot). (uint32_t)
                name                      : Name of the debug variable (char)
                value                     : Signed integer value (int32_t)

*/
mavlink20.messages.named_value_int = function(time_boot_ms, name, value) {

    this.format = '<Ii10s';
    this.id = mavlink20.MAVLINK_MSG_ID_NAMED_VALUE_INT;
    this.order_map = [0, 2, 1];
    this.crc_extra = 44;
    this.name = 'NAMED_VALUE_INT';

    this.fieldnames = ['time_boot_ms', 'name', 'value'];


    this.set(arguments);

}
        mavlink20.messages.named_value_int.prototype = new mavlink20.message;
mavlink20.messages.named_value_int.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.time_boot_ms, this.value, this.name]));
}

/* 
Status text message. These messages are printed in yellow in the COMM
console of QGroundControl. WARNING: They consume quite some bandwidth,
so use only for important status and error messages. If implemented
wisely, these messages are buffered on the MCU and sent only at a
limited rate (e.g. 10 Hz).

                severity                  : Severity of status. Relies on the definitions within RFC-5424. (uint8_t)
                text                      : Status text message, without null termination character (char)
                id                        : Unique (opaque) identifier for this statustext message.  May be used to reassemble a logical long-statustext message from a sequence of chunks.  A value of zero indicates this is the only chunk in the sequence and the message can be emitted immediately. (uint16_t)
                chunk_seq                 : This chunk's sequence number; indexing is from zero.  Any null character in the text field is taken to mean this was the last chunk. (uint8_t)

*/
mavlink20.messages.statustext = function(severity, text, id, chunk_seq) {

    this.format = '<B50sHB';
    this.id = mavlink20.MAVLINK_MSG_ID_STATUSTEXT;
    this.order_map = [0, 1, 2, 3];
    this.crc_extra = 83;
    this.name = 'STATUSTEXT';

    this.fieldnames = ['severity', 'text', 'id', 'chunk_seq'];


    this.set(arguments);

}
        mavlink20.messages.statustext.prototype = new mavlink20.message;
mavlink20.messages.statustext.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.severity, this.text, this.id, this.chunk_seq]));
}

/* 
Send a debug value. The index is used to discriminate between values.
These values show up in the plot of QGroundControl as DEBUG N.

                time_boot_ms              : Timestamp (time since system boot). (uint32_t)
                ind                       : index of debug variable (uint8_t)
                value                     : DEBUG value (float)

*/
mavlink20.messages.debug = function(time_boot_ms, ind, value) {

    this.format = '<IfB';
    this.id = mavlink20.MAVLINK_MSG_ID_DEBUG;
    this.order_map = [0, 2, 1];
    this.crc_extra = 46;
    this.name = 'DEBUG';

    this.fieldnames = ['time_boot_ms', 'ind', 'value'];


    this.set(arguments);

}
        mavlink20.messages.debug.prototype = new mavlink20.message;
mavlink20.messages.debug.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.time_boot_ms, this.value, this.ind]));
}

/* 
Setup a MAVLink2 signing key. If called with secret_key of all zero
and zero initial_timestamp will disable signing

                target_system             : system id of the target (uint8_t)
                target_component          : component ID of the target (uint8_t)
                secret_key                : signing key (uint8_t)
                initial_timestamp         : initial timestamp (uint64_t)

*/
mavlink20.messages.setup_signing = function(target_system, target_component, secret_key, initial_timestamp) {

    this.format = '<QBB32s';
    this.id = mavlink20.MAVLINK_MSG_ID_SETUP_SIGNING;
    this.order_map = [1, 2, 3, 0];
    this.crc_extra = 71;
    this.name = 'SETUP_SIGNING';

    this.fieldnames = ['target_system', 'target_component', 'secret_key', 'initial_timestamp'];


    this.set(arguments);

}
        mavlink20.messages.setup_signing.prototype = new mavlink20.message;
mavlink20.messages.setup_signing.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.initial_timestamp, this.target_system, this.target_component, this.secret_key]));
}

/* 
Report button state change.

                time_boot_ms              : Timestamp (time since system boot). (uint32_t)
                last_change_ms            : Time of last change of button state. (uint32_t)
                state                     : Bitmap for state of buttons. (uint8_t)

*/
mavlink20.messages.button_change = function(time_boot_ms, last_change_ms, state) {

    this.format = '<IIB';
    this.id = mavlink20.MAVLINK_MSG_ID_BUTTON_CHANGE;
    this.order_map = [0, 1, 2];
    this.crc_extra = 131;
    this.name = 'BUTTON_CHANGE';

    this.fieldnames = ['time_boot_ms', 'last_change_ms', 'state'];


    this.set(arguments);

}
        mavlink20.messages.button_change.prototype = new mavlink20.message;
mavlink20.messages.button_change.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.time_boot_ms, this.last_change_ms, this.state]));
}

/* 
Control vehicle tone generation (buzzer).

                target_system             : System ID (uint8_t)
                target_component          : Component ID (uint8_t)
                tune                      : tune in board specific format (char)
                tune2                     : tune extension (appended to tune) (char)

*/
mavlink20.messages.play_tune = function(target_system, target_component, tune, tune2) {

    this.format = '<BB30s200s';
    this.id = mavlink20.MAVLINK_MSG_ID_PLAY_TUNE;
    this.order_map = [0, 1, 2, 3];
    this.crc_extra = 187;
    this.name = 'PLAY_TUNE';

    this.fieldnames = ['target_system', 'target_component', 'tune', 'tune2'];


    this.set(arguments);

}
        mavlink20.messages.play_tune.prototype = new mavlink20.message;
mavlink20.messages.play_tune.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.target_system, this.target_component, this.tune, this.tune2]));
}

/* 
Information about a camera. Can be requested with a
MAV_CMD_REQUEST_MESSAGE command.

                time_boot_ms              : Timestamp (time since system boot). (uint32_t)
                vendor_name               : Name of the camera vendor (uint8_t)
                model_name                : Name of the camera model (uint8_t)
                firmware_version          : Version of the camera firmware, encoded as: `(Dev & 0xff) << 24 + (Patch & 0xff) << 16 + (Minor & 0xff) << 8 + (Major & 0xff)`. Use 0 if not known. (uint32_t)
                focal_length              : Focal length. Use NaN if not known. (float)
                sensor_size_h             : Image sensor size horizontal. Use NaN if not known. (float)
                sensor_size_v             : Image sensor size vertical. Use NaN if not known. (float)
                resolution_h              : Horizontal image resolution. Use 0 if not known. (uint16_t)
                resolution_v              : Vertical image resolution. Use 0 if not known. (uint16_t)
                lens_id                   : Reserved for a lens ID.  Use 0 if not known. (uint8_t)
                flags                     : Bitmap of camera capability flags. (uint32_t)
                cam_definition_version        : Camera definition version (iteration).  Use 0 if not known. (uint16_t)
                cam_definition_uri        : Camera definition URI (if any, otherwise only basic functions will be available). HTTP- (http://) and MAVLink FTP- (mavlinkftp://) formatted URIs are allowed (and both must be supported by any GCS that implements the Camera Protocol). The definition file may be xz compressed, which will be indicated by the file extension .xml.xz (a GCS that implements the protocol must support decompressing the file). The string needs to be zero terminated.  Use a zero-length string if not known. (char)
                gimbal_device_id          : Gimbal id of a gimbal associated with this camera. This is the component id of the gimbal device, or 1-6 for non mavlink gimbals. Use 0 if no gimbal is associated with the camera. (uint8_t)
                camera_device_id          : Camera id of a non-MAVLink camera attached to an autopilot (1-6).  0 if the component is a MAVLink camera (with its own component id). (uint8_t)

*/
mavlink20.messages.camera_information = function(time_boot_ms, vendor_name, model_name, firmware_version, focal_length, sensor_size_h, sensor_size_v, resolution_h, resolution_v, lens_id, flags, cam_definition_version, cam_definition_uri, gimbal_device_id, camera_device_id) {

    this.format = '<IIfffIHHH32s32sB140sBB';
    this.id = mavlink20.MAVLINK_MSG_ID_CAMERA_INFORMATION;
    this.order_map = [0, 9, 10, 1, 2, 3, 4, 6, 7, 11, 5, 8, 12, 13, 14];
    this.crc_extra = 92;
    this.name = 'CAMERA_INFORMATION';

    this.fieldnames = ['time_boot_ms', 'vendor_name', 'model_name', 'firmware_version', 'focal_length', 'sensor_size_h', 'sensor_size_v', 'resolution_h', 'resolution_v', 'lens_id', 'flags', 'cam_definition_version', 'cam_definition_uri', 'gimbal_device_id', 'camera_device_id'];


    this.set(arguments);

}
        mavlink20.messages.camera_information.prototype = new mavlink20.message;
mavlink20.messages.camera_information.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.time_boot_ms, this.firmware_version, this.focal_length, this.sensor_size_h, this.sensor_size_v, this.flags, this.resolution_h, this.resolution_v, this.cam_definition_version, this.vendor_name, this.model_name, this.lens_id, this.cam_definition_uri, this.gimbal_device_id, this.camera_device_id]));
}

/* 
Settings of a camera. Can be requested with a MAV_CMD_REQUEST_MESSAGE
command.

                time_boot_ms              : Timestamp (time since system boot). (uint32_t)
                mode_id                   : Camera mode (uint8_t)
                zoomLevel                 : Current zoom level as a percentage of the full range (0.0 to 100.0, NaN if not known) (float)
                focusLevel                : Current focus level as a percentage of the full range (0.0 to 100.0, NaN if not known) (float)
                camera_device_id          : Camera id of a non-MAVLink camera attached to an autopilot (1-6).  0 if the component is a MAVLink camera (with its own component id). (uint8_t)

*/
mavlink20.messages.camera_settings = function(time_boot_ms, mode_id, zoomLevel, focusLevel, camera_device_id) {

    this.format = '<IBffB';
    this.id = mavlink20.MAVLINK_MSG_ID_CAMERA_SETTINGS;
    this.order_map = [0, 1, 2, 3, 4];
    this.crc_extra = 146;
    this.name = 'CAMERA_SETTINGS';

    this.fieldnames = ['time_boot_ms', 'mode_id', 'zoomLevel', 'focusLevel', 'camera_device_id'];


    this.set(arguments);

}
        mavlink20.messages.camera_settings.prototype = new mavlink20.message;
mavlink20.messages.camera_settings.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.time_boot_ms, this.mode_id, this.zoomLevel, this.focusLevel, this.camera_device_id]));
}

/* 
Information about a storage medium. This message is sent in response
to a request with MAV_CMD_REQUEST_MESSAGE and whenever the status of
the storage changes (STORAGE_STATUS). Use
MAV_CMD_REQUEST_MESSAGE.param2 to indicate the index/id of requested
storage: 0 for all, 1 for first, 2 for second, etc.

                time_boot_ms              : Timestamp (time since system boot). (uint32_t)
                storage_id                : Storage ID (1 for first, 2 for second, etc.) (uint8_t)
                storage_count             : Number of storage devices (uint8_t)
                status                    : Status of storage (uint8_t)
                total_capacity            : Total capacity. If storage is not ready (STORAGE_STATUS_READY) value will be ignored. (float)
                used_capacity             : Used capacity. If storage is not ready (STORAGE_STATUS_READY) value will be ignored. (float)
                available_capacity        : Available storage capacity. If storage is not ready (STORAGE_STATUS_READY) value will be ignored. (float)
                read_speed                : Read speed. (float)
                write_speed               : Write speed. (float)
                type                      : Type of storage (uint8_t)
                name                      : Textual storage name to be used in UI (microSD 1, Internal Memory, etc.) This is a NULL terminated string. If it is exactly 32 characters long, add a terminating NULL. If this string is empty, the generic type is shown to the user. (char)
                storage_usage             : Flags indicating whether this instance is preferred storage for photos, videos, etc.
        Note: Implementations should initially set the flags on the system-default storage id used for saving media (if possible/supported).
        This setting can then be overridden using MAV_CMD_SET_STORAGE_USAGE.
        If the media usage flags are not set, a GCS may assume storage ID 1 is the default storage for all media types. (uint8_t)

*/
mavlink20.messages.storage_information = function(time_boot_ms, storage_id, storage_count, status, total_capacity, used_capacity, available_capacity, read_speed, write_speed, type, name, storage_usage) {

    this.format = '<IfffffBBBB32sB';
    this.id = mavlink20.MAVLINK_MSG_ID_STORAGE_INFORMATION;
    this.order_map = [0, 6, 7, 8, 1, 2, 3, 4, 5, 9, 10, 11];
    this.crc_extra = 179;
    this.name = 'STORAGE_INFORMATION';

    this.fieldnames = ['time_boot_ms', 'storage_id', 'storage_count', 'status', 'total_capacity', 'used_capacity', 'available_capacity', 'read_speed', 'write_speed', 'type', 'name', 'storage_usage'];


    this.set(arguments);

}
        mavlink20.messages.storage_information.prototype = new mavlink20.message;
mavlink20.messages.storage_information.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.time_boot_ms, this.total_capacity, this.used_capacity, this.available_capacity, this.read_speed, this.write_speed, this.storage_id, this.storage_count, this.status, this.type, this.name, this.storage_usage]));
}

/* 
Information about the status of a capture. Can be requested with a
MAV_CMD_REQUEST_MESSAGE command.

                time_boot_ms              : Timestamp (time since system boot). (uint32_t)
                image_status              : Current status of image capturing (0: idle, 1: capture in progress, 2: interval set but idle, 3: interval set and capture in progress) (uint8_t)
                video_status              : Current status of video capturing (0: idle, 1: capture in progress) (uint8_t)
                image_interval            : Image capture interval (float)
                recording_time_ms         : Elapsed time since recording started (0: Not supported/available). A GCS should compute recording time and use non-zero values of this field to correct any discrepancy. (uint32_t)
                available_capacity        : Available storage capacity. (float)
                image_count               : Total number of images captured ('forever', or until reset using MAV_CMD_STORAGE_FORMAT). (int32_t)
                camera_device_id          : Camera id of a non-MAVLink camera attached to an autopilot (1-6).  0 if the component is a MAVLink camera (with its own component id). (uint8_t)

*/
mavlink20.messages.camera_capture_status = function(time_boot_ms, image_status, video_status, image_interval, recording_time_ms, available_capacity, image_count, camera_device_id) {

    this.format = '<IfIfBBiB';
    this.id = mavlink20.MAVLINK_MSG_ID_CAMERA_CAPTURE_STATUS;
    this.order_map = [0, 4, 5, 1, 2, 3, 6, 7];
    this.crc_extra = 12;
    this.name = 'CAMERA_CAPTURE_STATUS';

    this.fieldnames = ['time_boot_ms', 'image_status', 'video_status', 'image_interval', 'recording_time_ms', 'available_capacity', 'image_count', 'camera_device_id'];


    this.set(arguments);

}
        mavlink20.messages.camera_capture_status.prototype = new mavlink20.message;
mavlink20.messages.camera_capture_status.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.time_boot_ms, this.image_interval, this.recording_time_ms, this.available_capacity, this.image_status, this.video_status, this.image_count, this.camera_device_id]));
}

/* 
Information about a captured image. This is emitted every time a
message is captured.         MAV_CMD_REQUEST_MESSAGE can be used to
(re)request this message for a specific sequence number or range of
sequence numbers:         MAV_CMD_REQUEST_MESSAGE.param2 indicates the
sequence number the first image to send, or set to -1 to send the
message for all sequence numbers.
MAV_CMD_REQUEST_MESSAGE.param3 is used to specify a range of messages
to send:         set to 0 (default) to send just the the message for
the sequence number in param 2,         set to -1 to send the message
for the sequence number in param 2 and all the following sequence
numbers,         set to the sequence number of the final message in
the range.

                time_boot_ms              : Timestamp (time since system boot). (uint32_t)
                time_utc                  : Timestamp (time since UNIX epoch) in UTC. 0 for unknown. (uint64_t)
                camera_id                 : Camera id of a non-MAVLink camera attached to an autopilot (1-6).  0 if the component is a MAVLink camera (with its own component id). Field name is usually camera_device_id. (uint8_t)
                lat                       : Latitude where image was taken (int32_t)
                lon                       : Longitude where capture was taken (int32_t)
                alt                       : Altitude (MSL) where image was taken (int32_t)
                relative_alt              : Altitude above ground (int32_t)
                q                         : Quaternion of camera orientation (w, x, y, z order, zero-rotation is 1, 0, 0, 0) (float)
                image_index               : Zero based index of this image (i.e. a new image will have index CAMERA_CAPTURE_STATUS.image count -1) (int32_t)
                capture_result            : Image was captured successfully (MAV_BOOL_TRUE). Values not equal to 0 or 1 are invalid. (int8_t)
                file_url                  : URL of image taken. Either local storage or http://foo.jpg if camera provides an HTTP interface. (char)

*/
mavlink20.messages.camera_image_captured = function(time_boot_ms, time_utc, camera_id, lat, lon, alt, relative_alt, q, image_index, capture_result, file_url) {

    this.format = '<QIiiii4fiBb205s';
    this.id = mavlink20.MAVLINK_MSG_ID_CAMERA_IMAGE_CAPTURED;
    this.order_map = [1, 0, 8, 2, 3, 4, 5, 6, 7, 9, 10];
    this.crc_extra = 133;
    this.name = 'CAMERA_IMAGE_CAPTURED';

    this.fieldnames = ['time_boot_ms', 'time_utc', 'camera_id', 'lat', 'lon', 'alt', 'relative_alt', 'q', 'image_index', 'capture_result', 'file_url'];


    this.set(arguments);

}
        mavlink20.messages.camera_image_captured.prototype = new mavlink20.message;
mavlink20.messages.camera_image_captured.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.time_utc, this.time_boot_ms, this.lat, this.lon, this.alt, this.relative_alt, this.q, this.image_index, this.camera_id, this.capture_result, this.file_url]));
}

/* 
Flight information.         This includes time since boot for arm,
takeoff, and land, and a flight number.         Takeoff and landing
values reset to zero on arm.         This can be requested using
MAV_CMD_REQUEST_MESSAGE.         Note, some fields are misnamed -
timestamps are from boot (not UTC) and the flight_uuid is a sequence
number.

                time_boot_ms              : Timestamp (time since system boot). (uint32_t)
                arming_time_utc           : Timestamp at arming (since system boot). Set to 0 on boot. Set value on arming. Note, field is misnamed UTC. (uint64_t)
                takeoff_time_utc          : Timestamp at takeoff (since system boot). Set to 0 at boot and on arming. Note, field is misnamed UTC. (uint64_t)
                flight_uuid               : Flight number. Note, field is misnamed UUID. (uint64_t)
                landing_time              : Timestamp at landing (in ms since system boot). Set to 0 at boot and on arming. (uint32_t)

*/
mavlink20.messages.flight_information = function(time_boot_ms, arming_time_utc, takeoff_time_utc, flight_uuid, landing_time) {

    this.format = '<QQQII';
    this.id = mavlink20.MAVLINK_MSG_ID_FLIGHT_INFORMATION;
    this.order_map = [3, 0, 1, 2, 4];
    this.crc_extra = 49;
    this.name = 'FLIGHT_INFORMATION';

    this.fieldnames = ['time_boot_ms', 'arming_time_utc', 'takeoff_time_utc', 'flight_uuid', 'landing_time'];


    this.set(arguments);

}
        mavlink20.messages.flight_information.prototype = new mavlink20.message;
mavlink20.messages.flight_information.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.arming_time_utc, this.takeoff_time_utc, this.flight_uuid, this.time_boot_ms, this.landing_time]));
}

/* 
Orientation of a mount

                time_boot_ms              : Timestamp (time since system boot). (uint32_t)
                roll                      : Roll in global frame (set to NaN for invalid). (float)
                pitch                     : Pitch in global frame (set to NaN for invalid). (float)
                yaw                       : Yaw relative to vehicle (set to NaN for invalid). (float)
                yaw_absolute              : Yaw in absolute frame relative to Earth's North, north is 0 (set to NaN for invalid). (float)

*/
mavlink20.messages.mount_orientation = function(time_boot_ms, roll, pitch, yaw, yaw_absolute) {

    this.format = '<Iffff';
    this.id = mavlink20.MAVLINK_MSG_ID_MOUNT_ORIENTATION;
    this.order_map = [0, 1, 2, 3, 4];
    this.crc_extra = 26;
    this.name = 'MOUNT_ORIENTATION';

    this.fieldnames = ['time_boot_ms', 'roll', 'pitch', 'yaw', 'yaw_absolute'];


    this.set(arguments);

}
        mavlink20.messages.mount_orientation.prototype = new mavlink20.message;
mavlink20.messages.mount_orientation.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.time_boot_ms, this.roll, this.pitch, this.yaw, this.yaw_absolute]));
}

/* 
A message containing logged data (see also MAV_CMD_LOGGING_START)

                target_system             : system ID of the target (uint8_t)
                target_component          : component ID of the target (uint8_t)
                sequence                  : sequence number (can wrap) (uint16_t)
                length                    : data length (uint8_t)
                first_message_offset        : offset into data where first message starts. This can be used for recovery, when a previous message got lost (set to UINT8_MAX if no start exists). (uint8_t)
                data                      : logged data (uint8_t)

*/
mavlink20.messages.logging_data = function(target_system, target_component, sequence, length, first_message_offset, data) {

    this.format = '<HBBBB249s';
    this.id = mavlink20.MAVLINK_MSG_ID_LOGGING_DATA;
    this.order_map = [1, 2, 0, 3, 4, 5];
    this.crc_extra = 193;
    this.name = 'LOGGING_DATA';

    this.fieldnames = ['target_system', 'target_component', 'sequence', 'length', 'first_message_offset', 'data'];


    this.set(arguments);

}
        mavlink20.messages.logging_data.prototype = new mavlink20.message;
mavlink20.messages.logging_data.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.sequence, this.target_system, this.target_component, this.length, this.first_message_offset, this.data]));
}

/* 
A message containing logged data which requires a LOGGING_ACK to be
sent back

                target_system             : system ID of the target (uint8_t)
                target_component          : component ID of the target (uint8_t)
                sequence                  : sequence number (can wrap) (uint16_t)
                length                    : data length (uint8_t)
                first_message_offset        : offset into data where first message starts. This can be used for recovery, when a previous message got lost (set to UINT8_MAX if no start exists). (uint8_t)
                data                      : logged data (uint8_t)

*/
mavlink20.messages.logging_data_acked = function(target_system, target_component, sequence, length, first_message_offset, data) {

    this.format = '<HBBBB249s';
    this.id = mavlink20.MAVLINK_MSG_ID_LOGGING_DATA_ACKED;
    this.order_map = [1, 2, 0, 3, 4, 5];
    this.crc_extra = 35;
    this.name = 'LOGGING_DATA_ACKED';

    this.fieldnames = ['target_system', 'target_component', 'sequence', 'length', 'first_message_offset', 'data'];


    this.set(arguments);

}
        mavlink20.messages.logging_data_acked.prototype = new mavlink20.message;
mavlink20.messages.logging_data_acked.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.sequence, this.target_system, this.target_component, this.length, this.first_message_offset, this.data]));
}

/* 
An ack for a LOGGING_DATA_ACKED message

                target_system             : system ID of the target (uint8_t)
                target_component          : component ID of the target (uint8_t)
                sequence                  : sequence number (must match the one in LOGGING_DATA_ACKED) (uint16_t)

*/
mavlink20.messages.logging_ack = function(target_system, target_component, sequence) {

    this.format = '<HBB';
    this.id = mavlink20.MAVLINK_MSG_ID_LOGGING_ACK;
    this.order_map = [1, 2, 0];
    this.crc_extra = 14;
    this.name = 'LOGGING_ACK';

    this.fieldnames = ['target_system', 'target_component', 'sequence'];


    this.set(arguments);

}
        mavlink20.messages.logging_ack.prototype = new mavlink20.message;
mavlink20.messages.logging_ack.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.sequence, this.target_system, this.target_component]));
}

/* 
Information about video stream. It may be requested using
MAV_CMD_REQUEST_MESSAGE, where param2 indicates the video stream id: 0
for all streams, 1 for first, 2 for second, etc.

                stream_id                 : Video Stream ID (1 for first, 2 for second, etc.) (uint8_t)
                count                     : Number of streams available. (uint8_t)
                type                      : Type of stream. (uint8_t)
                flags                     : Bitmap of stream status flags. (uint16_t)
                framerate                 : Frame rate. (float)
                resolution_h              : Horizontal resolution. (uint16_t)
                resolution_v              : Vertical resolution. (uint16_t)
                bitrate                   : Bit rate. (uint32_t)
                rotation                  : Video image rotation clockwise. (uint16_t)
                hfov                      : Horizontal Field of view. (uint16_t)
                name                      : Stream name. (char)
                uri                       : Video stream URI (TCP or RTSP URI ground station should connect to) or port number (UDP port ground station should listen to). (char)
                encoding                  : Encoding of stream. (uint8_t)
                camera_device_id          : Camera id of a non-MAVLink camera attached to an autopilot (1-6).  0 if the component is a MAVLink camera (with its own component id). (uint8_t)

*/
mavlink20.messages.video_stream_information = function(stream_id, count, type, flags, framerate, resolution_h, resolution_v, bitrate, rotation, hfov, name, uri, encoding, camera_device_id) {

    this.format = '<fIHHHHHBBB32s160sBB';
    this.id = mavlink20.MAVLINK_MSG_ID_VIDEO_STREAM_INFORMATION;
    this.order_map = [7, 8, 9, 2, 0, 3, 4, 1, 5, 6, 10, 11, 12, 13];
    this.crc_extra = 109;
    this.name = 'VIDEO_STREAM_INFORMATION';

    this.fieldnames = ['stream_id', 'count', 'type', 'flags', 'framerate', 'resolution_h', 'resolution_v', 'bitrate', 'rotation', 'hfov', 'name', 'uri', 'encoding', 'camera_device_id'];


    this.set(arguments);

}
        mavlink20.messages.video_stream_information.prototype = new mavlink20.message;
mavlink20.messages.video_stream_information.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.framerate, this.bitrate, this.flags, this.resolution_h, this.resolution_v, this.rotation, this.hfov, this.stream_id, this.count, this.type, this.name, this.uri, this.encoding, this.camera_device_id]));
}

/* 
Information about the status of a video stream. It may be requested
using MAV_CMD_REQUEST_MESSAGE.

                stream_id                 : Video Stream ID (1 for first, 2 for second, etc.) (uint8_t)
                flags                     : Bitmap of stream status flags (uint16_t)
                framerate                 : Frame rate (float)
                resolution_h              : Horizontal resolution (uint16_t)
                resolution_v              : Vertical resolution (uint16_t)
                bitrate                   : Bit rate (uint32_t)
                rotation                  : Video image rotation clockwise (uint16_t)
                hfov                      : Horizontal Field of view (uint16_t)
                camera_device_id          : Camera id of a non-MAVLink camera attached to an autopilot (1-6).  0 if the component is a MAVLink camera (with its own component id). (uint8_t)

*/
mavlink20.messages.video_stream_status = function(stream_id, flags, framerate, resolution_h, resolution_v, bitrate, rotation, hfov, camera_device_id) {

    this.format = '<fIHHHHHBB';
    this.id = mavlink20.MAVLINK_MSG_ID_VIDEO_STREAM_STATUS;
    this.order_map = [7, 2, 0, 3, 4, 1, 5, 6, 8];
    this.crc_extra = 59;
    this.name = 'VIDEO_STREAM_STATUS';

    this.fieldnames = ['stream_id', 'flags', 'framerate', 'resolution_h', 'resolution_v', 'bitrate', 'rotation', 'hfov', 'camera_device_id'];


    this.set(arguments);

}
        mavlink20.messages.video_stream_status.prototype = new mavlink20.message;
mavlink20.messages.video_stream_status.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.framerate, this.bitrate, this.flags, this.resolution_h, this.resolution_v, this.rotation, this.hfov, this.stream_id, this.camera_device_id]));
}

/* 
Information about the field of view of a camera. Can be requested with
a MAV_CMD_REQUEST_MESSAGE command.

                time_boot_ms              : Timestamp (time since system boot). (uint32_t)
                lat_camera                : Latitude of camera (INT32_MAX if unknown). (int32_t)
                lon_camera                : Longitude of camera (INT32_MAX if unknown). (int32_t)
                alt_camera                : Altitude (MSL) of camera (INT32_MAX if unknown). (int32_t)
                lat_image                 : Latitude of center of image (INT32_MAX if unknown, INT32_MIN if at infinity, not intersecting with horizon). (int32_t)
                lon_image                 : Longitude of center of image (INT32_MAX if unknown, INT32_MIN if at infinity, not intersecting with horizon). (int32_t)
                alt_image                 : Altitude (MSL) of center of image (INT32_MAX if unknown, INT32_MIN if at infinity, not intersecting with horizon). (int32_t)
                q                         : Quaternion of camera orientation (w, x, y, z order, zero-rotation is 1, 0, 0, 0) (float)
                hfov                      : Horizontal field of view (NaN if unknown). (float)
                vfov                      : Vertical field of view (NaN if unknown). (float)
                camera_device_id          : Camera id of a non-MAVLink camera attached to an autopilot (1-6).  0 if the component is a MAVLink camera (with its own component id). (uint8_t)

*/
mavlink20.messages.camera_fov_status = function(time_boot_ms, lat_camera, lon_camera, alt_camera, lat_image, lon_image, alt_image, q, hfov, vfov, camera_device_id) {

    this.format = '<Iiiiiii4fffB';
    this.id = mavlink20.MAVLINK_MSG_ID_CAMERA_FOV_STATUS;
    this.order_map = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    this.crc_extra = 22;
    this.name = 'CAMERA_FOV_STATUS';

    this.fieldnames = ['time_boot_ms', 'lat_camera', 'lon_camera', 'alt_camera', 'lat_image', 'lon_image', 'alt_image', 'q', 'hfov', 'vfov', 'camera_device_id'];


    this.set(arguments);

}
        mavlink20.messages.camera_fov_status.prototype = new mavlink20.message;
mavlink20.messages.camera_fov_status.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.time_boot_ms, this.lat_camera, this.lon_camera, this.alt_camera, this.lat_image, this.lon_image, this.alt_image, this.q, this.hfov, this.vfov, this.camera_device_id]));
}

/* 
Camera tracking status, sent while in active tracking. Use
MAV_CMD_SET_MESSAGE_INTERVAL to define message interval.

                tracking_status           : Current tracking status (uint8_t)
                tracking_mode             : Current tracking mode (uint8_t)
                target_data               : Defines location of target data (uint8_t)
                point_x                   : Current tracked point x value if CAMERA_TRACKING_MODE_POINT (normalized 0..1, 0 is left, 1 is right), NAN if unknown (float)
                point_y                   : Current tracked point y value if CAMERA_TRACKING_MODE_POINT (normalized 0..1, 0 is top, 1 is bottom), NAN if unknown (float)
                radius                    : Current tracked radius if CAMERA_TRACKING_MODE_POINT (normalized 0..1, 0 is image left, 1 is image right), NAN if unknown (float)
                rec_top_x                 : Current tracked rectangle top x value if CAMERA_TRACKING_MODE_RECTANGLE (normalized 0..1, 0 is left, 1 is right), NAN if unknown (float)
                rec_top_y                 : Current tracked rectangle top y value if CAMERA_TRACKING_MODE_RECTANGLE (normalized 0..1, 0 is top, 1 is bottom), NAN if unknown (float)
                rec_bottom_x              : Current tracked rectangle bottom x value if CAMERA_TRACKING_MODE_RECTANGLE (normalized 0..1, 0 is left, 1 is right), NAN if unknown (float)
                rec_bottom_y              : Current tracked rectangle bottom y value if CAMERA_TRACKING_MODE_RECTANGLE (normalized 0..1, 0 is top, 1 is bottom), NAN if unknown (float)
                camera_device_id          : Camera id of a non-MAVLink camera attached to an autopilot (1-6).  0 if the component is a MAVLink camera (with its own component id). (uint8_t)

*/
mavlink20.messages.camera_tracking_image_status = function(tracking_status, tracking_mode, target_data, point_x, point_y, radius, rec_top_x, rec_top_y, rec_bottom_x, rec_bottom_y, camera_device_id) {

    this.format = '<fffffffBBBB';
    this.id = mavlink20.MAVLINK_MSG_ID_CAMERA_TRACKING_IMAGE_STATUS;
    this.order_map = [7, 8, 9, 0, 1, 2, 3, 4, 5, 6, 10];
    this.crc_extra = 126;
    this.name = 'CAMERA_TRACKING_IMAGE_STATUS';

    this.fieldnames = ['tracking_status', 'tracking_mode', 'target_data', 'point_x', 'point_y', 'radius', 'rec_top_x', 'rec_top_y', 'rec_bottom_x', 'rec_bottom_y', 'camera_device_id'];


    this.set(arguments);

}
        mavlink20.messages.camera_tracking_image_status.prototype = new mavlink20.message;
mavlink20.messages.camera_tracking_image_status.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.point_x, this.point_y, this.radius, this.rec_top_x, this.rec_top_y, this.rec_bottom_x, this.rec_bottom_y, this.tracking_status, this.tracking_mode, this.target_data, this.camera_device_id]));
}

/* 
Camera tracking status, sent while in active tracking. Use
MAV_CMD_SET_MESSAGE_INTERVAL to define message interval.

                tracking_status           : Current tracking status (uint8_t)
                lat                       : Latitude of tracked object (int32_t)
                lon                       : Longitude of tracked object (int32_t)
                alt                       : Altitude of tracked object(AMSL, WGS84) (float)
                h_acc                     : Horizontal accuracy. NAN if unknown (float)
                v_acc                     : Vertical accuracy. NAN if unknown (float)
                vel_n                     : North velocity of tracked object. NAN if unknown (float)
                vel_e                     : East velocity of tracked object. NAN if unknown (float)
                vel_d                     : Down velocity of tracked object. NAN if unknown (float)
                vel_acc                   : Velocity accuracy. NAN if unknown (float)
                dist                      : Distance between camera and tracked object. NAN if unknown (float)
                hdg                       : Heading in radians, in NED. NAN if unknown (float)
                hdg_acc                   : Accuracy of heading, in NED. NAN if unknown (float)
                camera_device_id          : Camera id of a non-MAVLink camera attached to an autopilot (1-6).  0 if the component is a MAVLink camera (with its own component id). (uint8_t)

*/
mavlink20.messages.camera_tracking_geo_status = function(tracking_status, lat, lon, alt, h_acc, v_acc, vel_n, vel_e, vel_d, vel_acc, dist, hdg, hdg_acc, camera_device_id) {

    this.format = '<iiffffffffffBB';
    this.id = mavlink20.MAVLINK_MSG_ID_CAMERA_TRACKING_GEO_STATUS;
    this.order_map = [12, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 13];
    this.crc_extra = 18;
    this.name = 'CAMERA_TRACKING_GEO_STATUS';

    this.fieldnames = ['tracking_status', 'lat', 'lon', 'alt', 'h_acc', 'v_acc', 'vel_n', 'vel_e', 'vel_d', 'vel_acc', 'dist', 'hdg', 'hdg_acc', 'camera_device_id'];


    this.set(arguments);

}
        mavlink20.messages.camera_tracking_geo_status.prototype = new mavlink20.message;
mavlink20.messages.camera_tracking_geo_status.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.lat, this.lon, this.alt, this.h_acc, this.v_acc, this.vel_n, this.vel_e, this.vel_d, this.vel_acc, this.dist, this.hdg, this.hdg_acc, this.tracking_status, this.camera_device_id]));
}

/* 
Camera absolute thermal range. This can be streamed when the
associated VIDEO_STREAM_STATUS `flag` field bit
VIDEO_STREAM_STATUS_FLAGS_THERMAL_RANGE_ENABLED is set, but a GCS may
choose to only request it for the current active stream. Use
MAV_CMD_SET_MESSAGE_INTERVAL to define message interval (param3
indicates the stream id of the current camera, or 0 for all streams,
param4 indicates the target camera_device_id for autopilot-attached
cameras or 0 for MAVLink cameras).

                time_boot_ms              : Timestamp (time since system boot). (uint32_t)
                stream_id                 : Video Stream ID (1 for first, 2 for second, etc.) (uint8_t)
                camera_device_id          : Camera id of a non-MAVLink camera attached to an autopilot (1-6).  0 if the component is a MAVLink camera (with its own component id). (uint8_t)
                max                       : Temperature max. (float)
                max_point_x               : Temperature max point x value (normalized 0..1, 0 is left, 1 is right), NAN if unknown. (float)
                max_point_y               : Temperature max point y value (normalized 0..1, 0 is top, 1 is bottom), NAN if unknown. (float)
                min                       : Temperature min. (float)
                min_point_x               : Temperature min point x value (normalized 0..1, 0 is left, 1 is right), NAN if unknown. (float)
                min_point_y               : Temperature min point y value (normalized 0..1, 0 is top, 1 is bottom), NAN if unknown. (float)

*/
mavlink20.messages.camera_thermal_range = function(time_boot_ms, stream_id, camera_device_id, max, max_point_x, max_point_y, min, min_point_x, min_point_y) {

    this.format = '<IffffffBB';
    this.id = mavlink20.MAVLINK_MSG_ID_CAMERA_THERMAL_RANGE;
    this.order_map = [0, 7, 8, 1, 2, 3, 4, 5, 6];
    this.crc_extra = 62;
    this.name = 'CAMERA_THERMAL_RANGE';

    this.fieldnames = ['time_boot_ms', 'stream_id', 'camera_device_id', 'max', 'max_point_x', 'max_point_y', 'min', 'min_point_x', 'min_point_y'];


    this.set(arguments);

}
        mavlink20.messages.camera_thermal_range.prototype = new mavlink20.message;
mavlink20.messages.camera_thermal_range.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.time_boot_ms, this.max, this.max_point_x, this.max_point_y, this.min, this.min_point_x, this.min_point_y, this.stream_id, this.camera_device_id]));
}

/* 
Information about a high level gimbal manager. This message should be
requested by a ground station using MAV_CMD_REQUEST_MESSAGE.

                time_boot_ms              : Timestamp (time since system boot). (uint32_t)
                cap_flags                 : Bitmap of gimbal capability flags. (uint32_t)
                gimbal_device_id          : Gimbal device ID that this gimbal manager is responsible for. Component ID of gimbal device (or 1-6 for non-MAVLink gimbal). (uint8_t)
                roll_min                  : Minimum hardware roll angle (positive: rolling to the right, negative: rolling to the left) (float)
                roll_max                  : Maximum hardware roll angle (positive: rolling to the right, negative: rolling to the left) (float)
                pitch_min                 : Minimum pitch angle (positive: up, negative: down) (float)
                pitch_max                 : Maximum pitch angle (positive: up, negative: down) (float)
                yaw_min                   : Minimum yaw angle (positive: to the right, negative: to the left) (float)
                yaw_max                   : Maximum yaw angle (positive: to the right, negative: to the left) (float)

*/
mavlink20.messages.gimbal_manager_information = function(time_boot_ms, cap_flags, gimbal_device_id, roll_min, roll_max, pitch_min, pitch_max, yaw_min, yaw_max) {

    this.format = '<IIffffffB';
    this.id = mavlink20.MAVLINK_MSG_ID_GIMBAL_MANAGER_INFORMATION;
    this.order_map = [0, 1, 8, 2, 3, 4, 5, 6, 7];
    this.crc_extra = 70;
    this.name = 'GIMBAL_MANAGER_INFORMATION';

    this.fieldnames = ['time_boot_ms', 'cap_flags', 'gimbal_device_id', 'roll_min', 'roll_max', 'pitch_min', 'pitch_max', 'yaw_min', 'yaw_max'];


    this.set(arguments);

}
        mavlink20.messages.gimbal_manager_information.prototype = new mavlink20.message;
mavlink20.messages.gimbal_manager_information.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.time_boot_ms, this.cap_flags, this.roll_min, this.roll_max, this.pitch_min, this.pitch_max, this.yaw_min, this.yaw_max, this.gimbal_device_id]));
}

/* 
Current status about a high level gimbal manager. This message should
be broadcast at a low regular rate (e.g. 5Hz).

                time_boot_ms              : Timestamp (time since system boot). (uint32_t)
                flags                     : High level gimbal manager flags currently applied. (uint32_t)
                gimbal_device_id          : Gimbal device ID that this gimbal manager is responsible for. Component ID of gimbal device (or 1-6 for non-MAVLink gimbal). (uint8_t)
                primary_control_sysid        : System ID of MAVLink component with primary control, 0 for none. (uint8_t)
                primary_control_compid        : Component ID of MAVLink component with primary control, 0 for none. (uint8_t)
                secondary_control_sysid        : System ID of MAVLink component with secondary control, 0 for none. (uint8_t)
                secondary_control_compid        : Component ID of MAVLink component with secondary control, 0 for none. (uint8_t)

*/
mavlink20.messages.gimbal_manager_status = function(time_boot_ms, flags, gimbal_device_id, primary_control_sysid, primary_control_compid, secondary_control_sysid, secondary_control_compid) {

    this.format = '<IIBBBBB';
    this.id = mavlink20.MAVLINK_MSG_ID_GIMBAL_MANAGER_STATUS;
    this.order_map = [0, 1, 2, 3, 4, 5, 6];
    this.crc_extra = 48;
    this.name = 'GIMBAL_MANAGER_STATUS';

    this.fieldnames = ['time_boot_ms', 'flags', 'gimbal_device_id', 'primary_control_sysid', 'primary_control_compid', 'secondary_control_sysid', 'secondary_control_compid'];


    this.set(arguments);

}
        mavlink20.messages.gimbal_manager_status.prototype = new mavlink20.message;
mavlink20.messages.gimbal_manager_status.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.time_boot_ms, this.flags, this.gimbal_device_id, this.primary_control_sysid, this.primary_control_compid, this.secondary_control_sysid, this.secondary_control_compid]));
}

/* 
High level message to control a gimbal's attitude. This message is to
be sent to the gimbal manager (e.g. from a ground station). Angles and
rates can be set to NaN according to use case.

                target_system             : System ID (uint8_t)
                target_component          : Component ID (uint8_t)
                flags                     : High level gimbal manager flags to use. (uint32_t)
                gimbal_device_id          : Component ID of gimbal device to address (or 1-6 for non-MAVLink gimbal), 0 for all gimbal device components. Send command multiple times for more than one gimbal (but not all gimbals). (uint8_t)
                q                         : Quaternion components, w, x, y, z (1 0 0 0 is the null-rotation, the frame is depends on whether the flag GIMBAL_MANAGER_FLAGS_YAW_LOCK is set) (float)
                angular_velocity_x        : X component of angular velocity, positive is rolling to the right, NaN to be ignored. (float)
                angular_velocity_y        : Y component of angular velocity, positive is pitching up, NaN to be ignored. (float)
                angular_velocity_z        : Z component of angular velocity, positive is yawing to the right, NaN to be ignored. (float)

*/
mavlink20.messages.gimbal_manager_set_attitude = function(target_system, target_component, flags, gimbal_device_id, q, angular_velocity_x, angular_velocity_y, angular_velocity_z) {

    this.format = '<I4ffffBBB';
    this.id = mavlink20.MAVLINK_MSG_ID_GIMBAL_MANAGER_SET_ATTITUDE;
    this.order_map = [5, 6, 0, 7, 1, 2, 3, 4];
    this.crc_extra = 123;
    this.name = 'GIMBAL_MANAGER_SET_ATTITUDE';

    this.fieldnames = ['target_system', 'target_component', 'flags', 'gimbal_device_id', 'q', 'angular_velocity_x', 'angular_velocity_y', 'angular_velocity_z'];


    this.set(arguments);

}
        mavlink20.messages.gimbal_manager_set_attitude.prototype = new mavlink20.message;
mavlink20.messages.gimbal_manager_set_attitude.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.flags, this.q, this.angular_velocity_x, this.angular_velocity_y, this.angular_velocity_z, this.target_system, this.target_component, this.gimbal_device_id]));
}

/* 
Information about a low level gimbal. This message should be requested
by the gimbal manager or a ground station using
MAV_CMD_REQUEST_MESSAGE. The maximum angles and rates are the limits
by hardware. However, the limits by software used are likely
different/smaller and dependent on mode/settings/etc..

                time_boot_ms              : Timestamp (time since system boot). (uint32_t)
                vendor_name               : Name of the gimbal vendor. (char)
                model_name                : Name of the gimbal model. (char)
                custom_name               : Custom name of the gimbal given to it by the user. (char)
                firmware_version          : Version of the gimbal firmware, encoded as: `(Dev & 0xff) << 24 + (Patch & 0xff) << 16 + (Minor & 0xff) << 8 + (Major & 0xff)`. (uint32_t)
                hardware_version          : Version of the gimbal hardware, encoded as: `(Dev & 0xff) << 24 + (Patch & 0xff) << 16 + (Minor & 0xff) << 8 + (Major & 0xff)`. (uint32_t)
                uid                       : UID of gimbal hardware (0 if unknown). (uint64_t)
                cap_flags                 : Bitmap of gimbal capability flags. (uint16_t)
                custom_cap_flags          : Bitmap for use for gimbal-specific capability flags. (uint16_t)
                roll_min                  : Minimum hardware roll angle (positive: rolling to the right, negative: rolling to the left). NAN if unknown. (float)
                roll_max                  : Maximum hardware roll angle (positive: rolling to the right, negative: rolling to the left). NAN if unknown. (float)
                pitch_min                 : Minimum hardware pitch angle (positive: up, negative: down). NAN if unknown. (float)
                pitch_max                 : Maximum hardware pitch angle (positive: up, negative: down). NAN if unknown. (float)
                yaw_min                   : Minimum hardware yaw angle (positive: to the right, negative: to the left). NAN if unknown. (float)
                yaw_max                   : Maximum hardware yaw angle (positive: to the right, negative: to the left). NAN if unknown. (float)
                gimbal_device_id          : This field is to be used if the gimbal manager and the gimbal device are the same component and hence have the same component ID. This field is then set to a number between 1-6. If the component ID is separate, this field is not required and must be set to 0. (uint8_t)

*/
mavlink20.messages.gimbal_device_information = function(time_boot_ms, vendor_name, model_name, custom_name, firmware_version, hardware_version, uid, cap_flags, custom_cap_flags, roll_min, roll_max, pitch_min, pitch_max, yaw_min, yaw_max, gimbal_device_id) {

    this.format = '<QIIIffffffHH32s32s32sB';
    this.id = mavlink20.MAVLINK_MSG_ID_GIMBAL_DEVICE_INFORMATION;
    this.order_map = [1, 12, 13, 14, 2, 3, 0, 10, 11, 4, 5, 6, 7, 8, 9, 15];
    this.crc_extra = 74;
    this.name = 'GIMBAL_DEVICE_INFORMATION';

    this.fieldnames = ['time_boot_ms', 'vendor_name', 'model_name', 'custom_name', 'firmware_version', 'hardware_version', 'uid', 'cap_flags', 'custom_cap_flags', 'roll_min', 'roll_max', 'pitch_min', 'pitch_max', 'yaw_min', 'yaw_max', 'gimbal_device_id'];


    this.set(arguments);

}
        mavlink20.messages.gimbal_device_information.prototype = new mavlink20.message;
mavlink20.messages.gimbal_device_information.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.uid, this.time_boot_ms, this.firmware_version, this.hardware_version, this.roll_min, this.roll_max, this.pitch_min, this.pitch_max, this.yaw_min, this.yaw_max, this.cap_flags, this.custom_cap_flags, this.vendor_name, this.model_name, this.custom_name, this.gimbal_device_id]));
}

/* 
Low level message to control a gimbal device's attitude.
This message is to be sent from the gimbal manager to the gimbal
device component.           The quaternion and angular velocities can
be set to NaN according to use case.           For the angles encoded
in the quaternion and the angular velocities holds:           If the
flag GIMBAL_DEVICE_FLAGS_YAW_IN_VEHICLE_FRAME is set, then they are
relative to the vehicle heading (vehicle frame).           If the flag
GIMBAL_DEVICE_FLAGS_YAW_IN_EARTH_FRAME is set, then they are relative
to absolute North (earth frame).           If neither of these flags
are set, then (for backwards compatibility) it holds:           If the
flag GIMBAL_DEVICE_FLAGS_YAW_LOCK is set, then they are relative to
absolute North (earth frame),           else they are relative to the
vehicle heading (vehicle frame).           Setting both
GIMBAL_DEVICE_FLAGS_YAW_IN_VEHICLE_FRAME and
GIMBAL_DEVICE_FLAGS_YAW_IN_EARTH_FRAME is not allowed.           These
rules are to ensure backwards compatibility.           New
implementations should always set either
GIMBAL_DEVICE_FLAGS_YAW_IN_VEHICLE_FRAME or
GIMBAL_DEVICE_FLAGS_YAW_IN_EARTH_FRAME.

                target_system             : System ID (uint8_t)
                target_component          : Component ID (uint8_t)
                flags                     : Low level gimbal flags. (uint16_t)
                q                         : Quaternion components, w, x, y, z (1 0 0 0 is the null-rotation). The frame is described in the message description. Set fields to NaN to be ignored. (float)
                angular_velocity_x        : X component of angular velocity (positive: rolling to the right). The frame is described in the message description. NaN to be ignored. (float)
                angular_velocity_y        : Y component of angular velocity (positive: pitching up). The frame is described in the message description. NaN to be ignored. (float)
                angular_velocity_z        : Z component of angular velocity (positive: yawing to the right). The frame is described in the message description. NaN to be ignored. (float)

*/
mavlink20.messages.gimbal_device_set_attitude = function(target_system, target_component, flags, q, angular_velocity_x, angular_velocity_y, angular_velocity_z) {

    this.format = '<4ffffHBB';
    this.id = mavlink20.MAVLINK_MSG_ID_GIMBAL_DEVICE_SET_ATTITUDE;
    this.order_map = [5, 6, 4, 0, 1, 2, 3];
    this.crc_extra = 99;
    this.name = 'GIMBAL_DEVICE_SET_ATTITUDE';

    this.fieldnames = ['target_system', 'target_component', 'flags', 'q', 'angular_velocity_x', 'angular_velocity_y', 'angular_velocity_z'];


    this.set(arguments);

}
        mavlink20.messages.gimbal_device_set_attitude.prototype = new mavlink20.message;
mavlink20.messages.gimbal_device_set_attitude.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.q, this.angular_velocity_x, this.angular_velocity_y, this.angular_velocity_z, this.flags, this.target_system, this.target_component]));
}

/* 
Message reporting the status of a gimbal device.           This
message should be broadcast by a gimbal device component at a low
regular rate (e.g. 5 Hz).           For the angles encoded in the
quaternion and the angular velocities holds:           If the flag
GIMBAL_DEVICE_FLAGS_YAW_IN_VEHICLE_FRAME is set, then they are
relative to the vehicle heading (vehicle frame).           If the flag
GIMBAL_DEVICE_FLAGS_YAW_IN_EARTH_FRAME is set, then they are relative
to absolute North (earth frame).           If neither of these flags
are set, then (for backwards compatibility) it holds:           If the
flag GIMBAL_DEVICE_FLAGS_YAW_LOCK is set, then they are relative to
absolute North (earth frame),           else they are relative to the
vehicle heading (vehicle frame).           Other conditions of the
flags are not allowed.           The quaternion and angular velocities
in the other frame can be calculated from delta_yaw and
delta_yaw_velocity as           q_earth = q_delta_yaw * q_vehicle and
w_earth = w_delta_yaw_velocity + w_vehicle (if not NaN).           If
neither the GIMBAL_DEVICE_FLAGS_YAW_IN_VEHICLE_FRAME nor the
GIMBAL_DEVICE_FLAGS_YAW_IN_EARTH_FRAME flag is set,           then
(for backwards compatibility) the data in the delta_yaw and
delta_yaw_velocity fields are to be ignored.           New
implementations should always set either
GIMBAL_DEVICE_FLAGS_YAW_IN_VEHICLE_FRAME or
GIMBAL_DEVICE_FLAGS_YAW_IN_EARTH_FRAME,           and always should
set delta_yaw and delta_yaw_velocity either to the proper value or
NaN.

                target_system             : System ID (uint8_t)
                target_component          : Component ID (uint8_t)
                time_boot_ms              : Timestamp (time since system boot). (uint32_t)
                flags                     : Current gimbal flags set. (uint16_t)
                q                         : Quaternion components, w, x, y, z (1 0 0 0 is the null-rotation). The frame is described in the message description. (float)
                angular_velocity_x        : X component of angular velocity (positive: rolling to the right). The frame is described in the message description. NaN if unknown. (float)
                angular_velocity_y        : Y component of angular velocity (positive: pitching up). The frame is described in the message description. NaN if unknown. (float)
                angular_velocity_z        : Z component of angular velocity (positive: yawing to the right). The frame is described in the message description. NaN if unknown. (float)
                failure_flags             : Failure flags (0 for no failure) (uint32_t)
                delta_yaw                 : Yaw angle relating the quaternions in earth and body frames (see message description). NaN if unknown. (float)
                delta_yaw_velocity        : Yaw angular velocity relating the angular velocities in earth and body frames (see message description). NaN if unknown. (float)
                gimbal_device_id          : This field is to be used if the gimbal manager and the gimbal device are the same component and hence have the same component ID. This field is then set a number between 1-6. If the component ID is separate, this field is not required and must be set to 0. (uint8_t)

*/
mavlink20.messages.gimbal_device_attitude_status = function(target_system, target_component, time_boot_ms, flags, q, angular_velocity_x, angular_velocity_y, angular_velocity_z, failure_flags, delta_yaw, delta_yaw_velocity, gimbal_device_id) {

    this.format = '<I4ffffIHBBffB';
    this.id = mavlink20.MAVLINK_MSG_ID_GIMBAL_DEVICE_ATTITUDE_STATUS;
    this.order_map = [7, 8, 0, 6, 1, 2, 3, 4, 5, 9, 10, 11];
    this.crc_extra = 137;
    this.name = 'GIMBAL_DEVICE_ATTITUDE_STATUS';

    this.fieldnames = ['target_system', 'target_component', 'time_boot_ms', 'flags', 'q', 'angular_velocity_x', 'angular_velocity_y', 'angular_velocity_z', 'failure_flags', 'delta_yaw', 'delta_yaw_velocity', 'gimbal_device_id'];


    this.set(arguments);

}
        mavlink20.messages.gimbal_device_attitude_status.prototype = new mavlink20.message;
mavlink20.messages.gimbal_device_attitude_status.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.time_boot_ms, this.q, this.angular_velocity_x, this.angular_velocity_y, this.angular_velocity_z, this.failure_flags, this.flags, this.target_system, this.target_component, this.delta_yaw, this.delta_yaw_velocity, this.gimbal_device_id]));
}

/* 
Low level message containing autopilot state relevant for a gimbal
device. This message is to be sent from the autopilot to the gimbal
device component. The data of this message are for the gimbal device's
estimator corrections, in particular horizon compensation, as well as
indicates autopilot control intentions, e.g. feed forward angular
control in the z-axis.

                target_system             : System ID (uint8_t)
                target_component          : Component ID (uint8_t)
                time_boot_us              : Timestamp (time since system boot). (uint64_t)
                q                         : Quaternion components of autopilot attitude: w, x, y, z (1 0 0 0 is the null-rotation, Hamilton convention). (float)
                q_estimated_delay_us        : Estimated delay of the attitude data. 0 if unknown. (uint32_t)
                vx                        : X Speed in NED (North, East, Down). NAN if unknown. (float)
                vy                        : Y Speed in NED (North, East, Down). NAN if unknown. (float)
                vz                        : Z Speed in NED (North, East, Down). NAN if unknown. (float)
                v_estimated_delay_us        : Estimated delay of the speed data. 0 if unknown. (uint32_t)
                feed_forward_angular_velocity_z        : Feed forward Z component of angular velocity (positive: yawing to the right). NaN to be ignored. This is to indicate if the autopilot is actively yawing. (float)
                estimator_status          : Bitmap indicating which estimator outputs are valid. (uint16_t)
                landed_state              : The landed state. Is set to MAV_LANDED_STATE_UNDEFINED if landed state is unknown. (uint8_t)
                angular_velocity_z        : Z component of angular velocity in NED (North, East, Down). NaN if unknown. (float)

*/
mavlink20.messages.autopilot_state_for_gimbal_device = function(target_system, target_component, time_boot_us, q, q_estimated_delay_us, vx, vy, vz, v_estimated_delay_us, feed_forward_angular_velocity_z, estimator_status, landed_state, angular_velocity_z) {

    this.format = '<Q4fIfffIfHBBBf';
    this.id = mavlink20.MAVLINK_MSG_ID_AUTOPILOT_STATE_FOR_GIMBAL_DEVICE;
    this.order_map = [9, 10, 0, 1, 2, 3, 4, 5, 6, 7, 8, 11, 12];
    this.crc_extra = 210;
    this.name = 'AUTOPILOT_STATE_FOR_GIMBAL_DEVICE';

    this.fieldnames = ['target_system', 'target_component', 'time_boot_us', 'q', 'q_estimated_delay_us', 'vx', 'vy', 'vz', 'v_estimated_delay_us', 'feed_forward_angular_velocity_z', 'estimator_status', 'landed_state', 'angular_velocity_z'];


    this.set(arguments);

}
        mavlink20.messages.autopilot_state_for_gimbal_device.prototype = new mavlink20.message;
mavlink20.messages.autopilot_state_for_gimbal_device.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.time_boot_us, this.q, this.q_estimated_delay_us, this.vx, this.vy, this.vz, this.v_estimated_delay_us, this.feed_forward_angular_velocity_z, this.estimator_status, this.target_system, this.target_component, this.landed_state, this.angular_velocity_z]));
}

/* 
Set gimbal manager pitch and yaw angles (high rate message). This
message is to be sent to the gimbal manager (e.g. from a ground
station) and will be ignored by gimbal devices. Angles and rates can
be set to NaN according to use case. Use
MAV_CMD_DO_GIMBAL_MANAGER_PITCHYAW for low-rate adjustments that
require confirmation.

                target_system             : System ID (uint8_t)
                target_component          : Component ID (uint8_t)
                flags                     : High level gimbal manager flags to use. (uint32_t)
                gimbal_device_id          : Component ID of gimbal device to address (or 1-6 for non-MAVLink gimbal), 0 for all gimbal device components. Send command multiple times for more than one gimbal (but not all gimbals). (uint8_t)
                pitch                     : Pitch angle (positive: up, negative: down, NaN to be ignored). (float)
                yaw                       : Yaw angle (positive: to the right, negative: to the left, NaN to be ignored). (float)
                pitch_rate                : Pitch angular rate (positive: up, negative: down, NaN to be ignored). (float)
                yaw_rate                  : Yaw angular rate (positive: to the right, negative: to the left, NaN to be ignored). (float)

*/
mavlink20.messages.gimbal_manager_set_pitchyaw = function(target_system, target_component, flags, gimbal_device_id, pitch, yaw, pitch_rate, yaw_rate) {

    this.format = '<IffffBBB';
    this.id = mavlink20.MAVLINK_MSG_ID_GIMBAL_MANAGER_SET_PITCHYAW;
    this.order_map = [5, 6, 0, 7, 1, 2, 3, 4];
    this.crc_extra = 1;
    this.name = 'GIMBAL_MANAGER_SET_PITCHYAW';

    this.fieldnames = ['target_system', 'target_component', 'flags', 'gimbal_device_id', 'pitch', 'yaw', 'pitch_rate', 'yaw_rate'];


    this.set(arguments);

}
        mavlink20.messages.gimbal_manager_set_pitchyaw.prototype = new mavlink20.message;
mavlink20.messages.gimbal_manager_set_pitchyaw.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.flags, this.pitch, this.yaw, this.pitch_rate, this.yaw_rate, this.target_system, this.target_component, this.gimbal_device_id]));
}

/* 
High level message to control a gimbal manually. The angles or angular
rates are unitless; the actual rates will depend on internal gimbal
manager settings/configuration (e.g. set by parameters). This message
is to be sent to the gimbal manager (e.g. from a ground station).
Angles and rates can be set to NaN according to use case.

                target_system             : System ID (uint8_t)
                target_component          : Component ID (uint8_t)
                flags                     : High level gimbal manager flags. (uint32_t)
                gimbal_device_id          : Component ID of gimbal device to address (or 1-6 for non-MAVLink gimbal), 0 for all gimbal device components. Send command multiple times for more than one gimbal (but not all gimbals). (uint8_t)
                pitch                     : Pitch angle unitless (-1..1, positive: up, negative: down, NaN to be ignored). (float)
                yaw                       : Yaw angle unitless (-1..1, positive: to the right, negative: to the left, NaN to be ignored). (float)
                pitch_rate                : Pitch angular rate unitless (-1..1, positive: up, negative: down, NaN to be ignored). (float)
                yaw_rate                  : Yaw angular rate unitless (-1..1, positive: to the right, negative: to the left, NaN to be ignored). (float)

*/
mavlink20.messages.gimbal_manager_set_manual_control = function(target_system, target_component, flags, gimbal_device_id, pitch, yaw, pitch_rate, yaw_rate) {

    this.format = '<IffffBBB';
    this.id = mavlink20.MAVLINK_MSG_ID_GIMBAL_MANAGER_SET_MANUAL_CONTROL;
    this.order_map = [5, 6, 0, 7, 1, 2, 3, 4];
    this.crc_extra = 20;
    this.name = 'GIMBAL_MANAGER_SET_MANUAL_CONTROL';

    this.fieldnames = ['target_system', 'target_component', 'flags', 'gimbal_device_id', 'pitch', 'yaw', 'pitch_rate', 'yaw_rate'];


    this.set(arguments);

}
        mavlink20.messages.gimbal_manager_set_manual_control.prototype = new mavlink20.message;
mavlink20.messages.gimbal_manager_set_manual_control.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.flags, this.pitch, this.yaw, this.pitch_rate, this.yaw_rate, this.target_system, this.target_component, this.gimbal_device_id]));
}

/* 
ESC information for lower rate streaming. Recommended streaming rate
1Hz. See ESC_STATUS for higher-rate ESC data.

                index                     : Index of the first ESC in this message. minValue = 0, maxValue = 60, increment = 4. (uint8_t)
                time_usec                 : Timestamp (UNIX Epoch time or time since system boot). The receiving end can infer timestamp format (since 1.1.1970 or since system boot) by checking for the magnitude the number. (uint64_t)
                counter                   : Counter of data packets received. (uint16_t)
                count                     : Total number of ESCs in all messages of this type. Message fields with an index higher than this should be ignored because they contain invalid data. (uint8_t)
                connection_type           : Connection type protocol for all ESC. (uint8_t)
                info                      : Information regarding online/offline status of each ESC. (uint8_t)
                failure_flags             : Bitmap of ESC failure flags. (uint16_t)
                error_count               : Number of reported errors by each ESC since boot. (uint32_t)
                temperature               : Temperature of each ESC. INT16_MAX: if data not supplied by ESC. (int16_t)

*/
mavlink20.messages.esc_info = function(index, time_usec, counter, count, connection_type, info, failure_flags, error_count, temperature) {

    this.format = '<Q4IH4H4hBBBB';
    this.id = mavlink20.MAVLINK_MSG_ID_ESC_INFO;
    this.order_map = [5, 0, 2, 6, 7, 8, 3, 1, 4];
    this.crc_extra = 251;
    this.name = 'ESC_INFO';

    this.fieldnames = ['index', 'time_usec', 'counter', 'count', 'connection_type', 'info', 'failure_flags', 'error_count', 'temperature'];


    this.set(arguments);

}
        mavlink20.messages.esc_info.prototype = new mavlink20.message;
mavlink20.messages.esc_info.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.time_usec, this.error_count, this.counter, this.failure_flags, this.temperature, this.index, this.count, this.connection_type, this.info]));
}

/* 
ESC information for higher rate streaming. Recommended streaming rate
is ~10 Hz. Information that changes more slowly is sent in ESC_INFO.
It should typically only be streamed on high-bandwidth links (i.e. to
a companion computer).

                index                     : Index of the first ESC in this message. minValue = 0, maxValue = 60, increment = 4. (uint8_t)
                time_usec                 : Timestamp (UNIX Epoch time or time since system boot). The receiving end can infer timestamp format (since 1.1.1970 or since system boot) by checking for the magnitude the number. (uint64_t)
                rpm                       : Reported motor RPM from each ESC (negative for reverse rotation). (int32_t)
                voltage                   : Voltage measured from each ESC. (float)
                current                   : Current measured from each ESC. (float)

*/
mavlink20.messages.esc_status = function(index, time_usec, rpm, voltage, current) {

    this.format = '<Q4i4f4fB';
    this.id = mavlink20.MAVLINK_MSG_ID_ESC_STATUS;
    this.order_map = [4, 0, 1, 2, 3];
    this.crc_extra = 10;
    this.name = 'ESC_STATUS';

    this.fieldnames = ['index', 'time_usec', 'rpm', 'voltage', 'current'];


    this.set(arguments);

}
        mavlink20.messages.esc_status.prototype = new mavlink20.message;
mavlink20.messages.esc_status.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.time_usec, this.rpm, this.voltage, this.current, this.index]));
}

/* 
Configure WiFi AP SSID, password, and mode. This message is re-emitted
as an acknowledgement by the AP. The message may also be explicitly
requested using MAV_CMD_REQUEST_MESSAGE

                ssid                      : Name of Wi-Fi network (SSID). Blank to leave it unchanged when setting. Current SSID when sent back as a response. (char)
                password                  : Password. Blank for an open AP. MD5 hash when message is sent back as a response. (char)
                mode                      : WiFi Mode. (int8_t)
                response                  : Message acceptance response (sent back to GS). (int8_t)

*/
mavlink20.messages.wifi_config_ap = function(ssid, password, mode, response) {

    this.format = '<32s64sbb';
    this.id = mavlink20.MAVLINK_MSG_ID_WIFI_CONFIG_AP;
    this.order_map = [0, 1, 2, 3];
    this.crc_extra = 19;
    this.name = 'WIFI_CONFIG_AP';

    this.fieldnames = ['ssid', 'password', 'mode', 'response'];


    this.set(arguments);

}
        mavlink20.messages.wifi_config_ap.prototype = new mavlink20.message;
mavlink20.messages.wifi_config_ap.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.ssid, this.password, this.mode, this.response]));
}

/* 
The location and information of an AIS vessel

                MMSI                      : Mobile Marine Service Identifier, 9 decimal digits (uint32_t)
                lat                       : Latitude (int32_t)
                lon                       : Longitude (int32_t)
                COG                       : Course over ground (uint16_t)
                heading                   : True heading (uint16_t)
                velocity                  : Speed over ground (uint16_t)
                turn_rate                 : Turn rate, 0.1 degrees per second (int8_t)
                navigational_status        : Navigational status (uint8_t)
                type                      : Type of vessels (uint8_t)
                dimension_bow             : Distance from lat/lon location to bow (uint16_t)
                dimension_stern           : Distance from lat/lon location to stern (uint16_t)
                dimension_port            : Distance from lat/lon location to port side (uint8_t)
                dimension_starboard        : Distance from lat/lon location to starboard side (uint8_t)
                callsign                  : The vessel callsign (char)
                name                      : The vessel name (char)
                tslc                      : Time since last communication in seconds (uint16_t)
                flags                     : Bitmask to indicate various statuses including valid data fields (uint16_t)

*/
mavlink20.messages.ais_vessel = function(MMSI, lat, lon, COG, heading, velocity, turn_rate, navigational_status, type, dimension_bow, dimension_stern, dimension_port, dimension_starboard, callsign, name, tslc, flags) {

    this.format = '<IiiHHHHHHHbBBBB7s20s';
    this.id = mavlink20.MAVLINK_MSG_ID_AIS_VESSEL;
    this.order_map = [0, 1, 2, 3, 4, 5, 10, 11, 12, 6, 7, 13, 14, 15, 16, 8, 9];
    this.crc_extra = 243;
    this.name = 'AIS_VESSEL';

    this.fieldnames = ['MMSI', 'lat', 'lon', 'COG', 'heading', 'velocity', 'turn_rate', 'navigational_status', 'type', 'dimension_bow', 'dimension_stern', 'dimension_port', 'dimension_starboard', 'callsign', 'name', 'tslc', 'flags'];


    this.set(arguments);

}
        mavlink20.messages.ais_vessel.prototype = new mavlink20.message;
mavlink20.messages.ais_vessel.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.MMSI, this.lat, this.lon, this.COG, this.heading, this.velocity, this.dimension_bow, this.dimension_stern, this.tslc, this.flags, this.turn_rate, this.navigational_status, this.type, this.dimension_port, this.dimension_starboard, this.callsign, this.name]));
}

/* 
General status information of an UAVCAN node. Please refer to the
definition of the UAVCAN message "uavcan.protocol.NodeStatus" for the
background information. The UAVCAN specification is available at
http://uavcan.org.

                time_usec                 : Timestamp (UNIX Epoch time or time since system boot). The receiving end can infer timestamp format (since 1.1.1970 or since system boot) by checking for the magnitude of the number. (uint64_t)
                uptime_sec                : Time since the start-up of the node. (uint32_t)
                health                    : Generalized node health status. (uint8_t)
                mode                      : Generalized operating mode. (uint8_t)
                sub_mode                  : Not used currently. (uint8_t)
                vendor_specific_status_code        : Vendor-specific status information. (uint16_t)

*/
mavlink20.messages.uavcan_node_status = function(time_usec, uptime_sec, health, mode, sub_mode, vendor_specific_status_code) {

    this.format = '<QIHBBB';
    this.id = mavlink20.MAVLINK_MSG_ID_UAVCAN_NODE_STATUS;
    this.order_map = [0, 1, 3, 4, 5, 2];
    this.crc_extra = 28;
    this.name = 'UAVCAN_NODE_STATUS';

    this.fieldnames = ['time_usec', 'uptime_sec', 'health', 'mode', 'sub_mode', 'vendor_specific_status_code'];


    this.set(arguments);

}
        mavlink20.messages.uavcan_node_status.prototype = new mavlink20.message;
mavlink20.messages.uavcan_node_status.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.time_usec, this.uptime_sec, this.vendor_specific_status_code, this.health, this.mode, this.sub_mode]));
}

/* 
General information describing a particular UAVCAN node. Please refer
to the definition of the UAVCAN service "uavcan.protocol.GetNodeInfo"
for the background information. This message should be emitted by the
system whenever a new node appears online, or an existing node
reboots. Additionally, it can be emitted upon request from the other
end of the MAVLink channel (see MAV_CMD_UAVCAN_GET_NODE_INFO). It is
also not prohibited to emit this message unconditionally at a low
frequency. The UAVCAN specification is available at http://uavcan.org.

                time_usec                 : Timestamp (UNIX Epoch time or time since system boot). The receiving end can infer timestamp format (since 1.1.1970 or since system boot) by checking for the magnitude of the number. (uint64_t)
                uptime_sec                : Time since the start-up of the node. (uint32_t)
                name                      : Node name string. For example, "sapog.px4.io". (char)
                hw_version_major          : Hardware major version number. (uint8_t)
                hw_version_minor          : Hardware minor version number. (uint8_t)
                hw_unique_id              : Hardware unique 128-bit ID. (uint8_t)
                sw_version_major          : Software major version number. (uint8_t)
                sw_version_minor          : Software minor version number. (uint8_t)
                sw_vcs_commit             : Version control system (VCS) revision identifier (e.g. git short commit hash). 0 if unknown. (uint32_t)

*/
mavlink20.messages.uavcan_node_info = function(time_usec, uptime_sec, name, hw_version_major, hw_version_minor, hw_unique_id, sw_version_major, sw_version_minor, sw_vcs_commit) {

    this.format = '<QII80sBB16sBB';
    this.id = mavlink20.MAVLINK_MSG_ID_UAVCAN_NODE_INFO;
    this.order_map = [0, 1, 3, 4, 5, 6, 7, 8, 2];
    this.crc_extra = 95;
    this.name = 'UAVCAN_NODE_INFO';

    this.fieldnames = ['time_usec', 'uptime_sec', 'name', 'hw_version_major', 'hw_version_minor', 'hw_unique_id', 'sw_version_major', 'sw_version_minor', 'sw_vcs_commit'];


    this.set(arguments);

}
        mavlink20.messages.uavcan_node_info.prototype = new mavlink20.message;
mavlink20.messages.uavcan_node_info.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.time_usec, this.uptime_sec, this.sw_vcs_commit, this.name, this.hw_version_major, this.hw_version_minor, this.hw_unique_id, this.sw_version_major, this.sw_version_minor]));
}

/* 
Request to read the value of a parameter with either the param_id
string id or param_index. PARAM_EXT_VALUE should be emitted in
response.

                target_system             : System ID (uint8_t)
                target_component          : Component ID (uint8_t)
                param_id                  : Parameter id, terminated by NULL if the length is less than 16 human-readable chars and WITHOUT null termination (NULL) byte if the length is exactly 16 chars - applications have to provide 16+1 bytes storage if the ID is stored as string (char)
                param_index               : Parameter index. Set to -1 to use the Parameter ID field as identifier (else param_id will be ignored) (int16_t)

*/
mavlink20.messages.param_ext_request_read = function(target_system, target_component, param_id, param_index) {

    this.format = '<hBB16s';
    this.id = mavlink20.MAVLINK_MSG_ID_PARAM_EXT_REQUEST_READ;
    this.order_map = [1, 2, 3, 0];
    this.crc_extra = 243;
    this.name = 'PARAM_EXT_REQUEST_READ';

    this.fieldnames = ['target_system', 'target_component', 'param_id', 'param_index'];


    this.set(arguments);

}
        mavlink20.messages.param_ext_request_read.prototype = new mavlink20.message;
mavlink20.messages.param_ext_request_read.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.param_index, this.target_system, this.target_component, this.param_id]));
}

/* 
Request all parameters of this component. All parameters should be
emitted in response as PARAM_EXT_VALUE.

                target_system             : System ID (uint8_t)
                target_component          : Component ID (uint8_t)

*/
mavlink20.messages.param_ext_request_list = function(target_system, target_component) {

    this.format = '<BB';
    this.id = mavlink20.MAVLINK_MSG_ID_PARAM_EXT_REQUEST_LIST;
    this.order_map = [0, 1];
    this.crc_extra = 88;
    this.name = 'PARAM_EXT_REQUEST_LIST';

    this.fieldnames = ['target_system', 'target_component'];


    this.set(arguments);

}
        mavlink20.messages.param_ext_request_list.prototype = new mavlink20.message;
mavlink20.messages.param_ext_request_list.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.target_system, this.target_component]));
}

/* 
Emit the value of a parameter. The inclusion of param_count and
param_index in the message allows the recipient to keep track of
received parameters and allows them to re-request missing parameters
after a loss or timeout.

                param_id                  : Parameter id, terminated by NULL if the length is less than 16 human-readable chars and WITHOUT null termination (NULL) byte if the length is exactly 16 chars - applications have to provide 16+1 bytes storage if the ID is stored as string (char)
                param_value               : Parameter value (char)
                param_type                : Parameter type. (uint8_t)
                param_count               : Total number of parameters (uint16_t)
                param_index               : Index of this parameter (uint16_t)

*/
mavlink20.messages.param_ext_value = function(param_id, param_value, param_type, param_count, param_index) {

    this.format = '<HH16s128sB';
    this.id = mavlink20.MAVLINK_MSG_ID_PARAM_EXT_VALUE;
    this.order_map = [2, 3, 4, 0, 1];
    this.crc_extra = 243;
    this.name = 'PARAM_EXT_VALUE';

    this.fieldnames = ['param_id', 'param_value', 'param_type', 'param_count', 'param_index'];


    this.set(arguments);

}
        mavlink20.messages.param_ext_value.prototype = new mavlink20.message;
mavlink20.messages.param_ext_value.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.param_count, this.param_index, this.param_id, this.param_value, this.param_type]));
}

/* 
Set a parameter value. In order to deal with message loss (and
retransmission of PARAM_EXT_SET), when setting a parameter value and
the new value is the same as the current value, you will immediately
get a PARAM_ACK_ACCEPTED response. If the current state is
PARAM_ACK_IN_PROGRESS, you will accordingly receive a
PARAM_ACK_IN_PROGRESS in response.

                target_system             : System ID (uint8_t)
                target_component          : Component ID (uint8_t)
                param_id                  : Parameter id, terminated by NULL if the length is less than 16 human-readable chars and WITHOUT null termination (NULL) byte if the length is exactly 16 chars - applications have to provide 16+1 bytes storage if the ID is stored as string (char)
                param_value               : Parameter value (char)
                param_type                : Parameter type. (uint8_t)

*/
mavlink20.messages.param_ext_set = function(target_system, target_component, param_id, param_value, param_type) {

    this.format = '<BB16s128sB';
    this.id = mavlink20.MAVLINK_MSG_ID_PARAM_EXT_SET;
    this.order_map = [0, 1, 2, 3, 4];
    this.crc_extra = 78;
    this.name = 'PARAM_EXT_SET';

    this.fieldnames = ['target_system', 'target_component', 'param_id', 'param_value', 'param_type'];


    this.set(arguments);

}
        mavlink20.messages.param_ext_set.prototype = new mavlink20.message;
mavlink20.messages.param_ext_set.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.target_system, this.target_component, this.param_id, this.param_value, this.param_type]));
}

/* 
Response from a PARAM_EXT_SET message.

                param_id                  : Parameter id, terminated by NULL if the length is less than 16 human-readable chars and WITHOUT null termination (NULL) byte if the length is exactly 16 chars - applications have to provide 16+1 bytes storage if the ID is stored as string (char)
                param_value               : Parameter value (new value if PARAM_ACK_ACCEPTED, current value otherwise) (char)
                param_type                : Parameter type. (uint8_t)
                param_result              : Result code. (uint8_t)

*/
mavlink20.messages.param_ext_ack = function(param_id, param_value, param_type, param_result) {

    this.format = '<16s128sBB';
    this.id = mavlink20.MAVLINK_MSG_ID_PARAM_EXT_ACK;
    this.order_map = [0, 1, 2, 3];
    this.crc_extra = 132;
    this.name = 'PARAM_EXT_ACK';

    this.fieldnames = ['param_id', 'param_value', 'param_type', 'param_result'];


    this.set(arguments);

}
        mavlink20.messages.param_ext_ack.prototype = new mavlink20.message;
mavlink20.messages.param_ext_ack.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.param_id, this.param_value, this.param_type, this.param_result]));
}

/* 
Obstacle distances in front of the sensor, starting from the left in
increment degrees to the right

                time_usec                 : Timestamp (UNIX Epoch time or time since system boot). The receiving end can infer timestamp format (since 1.1.1970 or since system boot) by checking for the magnitude of the number. (uint64_t)
                sensor_type               : Class id of the distance sensor type. (uint8_t)
                distances                 : Distance of obstacles around the vehicle with index 0 corresponding to north + angle_offset, unless otherwise specified in the frame. A value of 0 is valid and means that the obstacle is practically touching the sensor. A value of max_distance +1 means no obstacle is present. A value of UINT16_MAX for unknown/not used. In a array element, one unit corresponds to 1cm. (uint16_t)
                increment                 : Angular width in degrees of each array element. Increment direction is clockwise. This field is ignored if increment_f is non-zero. (uint8_t)
                min_distance              : Minimum distance the sensor can measure. (uint16_t)
                max_distance              : Maximum distance the sensor can measure. (uint16_t)
                increment_f               : Angular width in degrees of each array element as a float. If non-zero then this value is used instead of the uint8_t increment field. Positive is clockwise direction, negative is counter-clockwise. (float)
                angle_offset              : Relative angle offset of the 0-index element in the distances array. Value of 0 corresponds to forward. Positive is clockwise direction, negative is counter-clockwise. (float)
                frame                     : Coordinate frame of reference for the yaw rotation and offset of the sensor data. Defaults to MAV_FRAME_GLOBAL, which is north aligned. For body-mounted sensors use MAV_FRAME_BODY_FRD, which is vehicle front aligned. (uint8_t)

*/
mavlink20.messages.obstacle_distance = function(time_usec, sensor_type, distances, increment, min_distance, max_distance, increment_f, angle_offset, frame) {

    this.format = '<Q72HHHBBffB';
    this.id = mavlink20.MAVLINK_MSG_ID_OBSTACLE_DISTANCE;
    this.order_map = [0, 4, 1, 5, 2, 3, 6, 7, 8];
    this.crc_extra = 23;
    this.name = 'OBSTACLE_DISTANCE';

    this.fieldnames = ['time_usec', 'sensor_type', 'distances', 'increment', 'min_distance', 'max_distance', 'increment_f', 'angle_offset', 'frame'];


    this.set(arguments);

}
        mavlink20.messages.obstacle_distance.prototype = new mavlink20.message;
mavlink20.messages.obstacle_distance.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.time_usec, this.distances, this.min_distance, this.max_distance, this.sensor_type, this.increment, this.increment_f, this.angle_offset, this.frame]));
}

/* 
Odometry message to communicate odometry information with an external
interface. Fits ROS REP 147 standard for aerial vehicles
(http://www.ros.org/reps/rep-0147.html).

                time_usec                 : Timestamp (UNIX Epoch time or time since system boot). The receiving end can infer timestamp format (since 1.1.1970 or since system boot) by checking for the magnitude of the number. (uint64_t)
                frame_id                  : Coordinate frame of reference for the pose data. (uint8_t)
                child_frame_id            : Coordinate frame of reference for the velocity in free space (twist) data. (uint8_t)
                x                         : X Position (float)
                y                         : Y Position (float)
                z                         : Z Position (float)
                q                         : Quaternion components, w, x, y, z (1 0 0 0 is the null-rotation) (float)
                vx                        : X linear speed (float)
                vy                        : Y linear speed (float)
                vz                        : Z linear speed (float)
                rollspeed                 : Roll angular speed (float)
                pitchspeed                : Pitch angular speed (float)
                yawspeed                  : Yaw angular speed (float)
                pose_covariance           : Row-major representation of a 6x6 pose cross-covariance matrix upper right triangle (states: x, y, z, roll, pitch, yaw; first six entries are the first ROW, next five entries are the second ROW, etc.). If unknown, assign NaN value to first element in the array. (float)
                velocity_covariance        : Row-major representation of a 6x6 velocity cross-covariance matrix upper right triangle (states: vx, vy, vz, rollspeed, pitchspeed, yawspeed; first six entries are the first ROW, next five entries are the second ROW, etc.). If unknown, assign NaN value to first element in the array. (float)
                reset_counter             : Estimate reset counter. This should be incremented when the estimate resets in any of the dimensions (position, velocity, attitude, angular speed). This is designed to be used when e.g an external SLAM system detects a loop-closure and the estimate jumps. (uint8_t)
                estimator_type            : Type of estimator that is providing the odometry. (uint8_t)
                quality                   : Optional odometry quality metric as a percentage. -1 = odometry has failed, 0 = unknown/unset quality, 1 = worst quality, 100 = best quality (int8_t)

*/
mavlink20.messages.odometry = function(time_usec, frame_id, child_frame_id, x, y, z, q, vx, vy, vz, rollspeed, pitchspeed, yawspeed, pose_covariance, velocity_covariance, reset_counter, estimator_type, quality) {

    this.format = '<Qfff4fffffff21f21fBBBBb';
    this.id = mavlink20.MAVLINK_MSG_ID_ODOMETRY;
    this.order_map = [0, 13, 14, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 15, 16, 17];
    this.crc_extra = 91;
    this.name = 'ODOMETRY';

    this.fieldnames = ['time_usec', 'frame_id', 'child_frame_id', 'x', 'y', 'z', 'q', 'vx', 'vy', 'vz', 'rollspeed', 'pitchspeed', 'yawspeed', 'pose_covariance', 'velocity_covariance', 'reset_counter', 'estimator_type', 'quality'];


    this.set(arguments);

}
        mavlink20.messages.odometry.prototype = new mavlink20.message;
mavlink20.messages.odometry.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.time_usec, this.x, this.y, this.z, this.q, this.vx, this.vy, this.vz, this.rollspeed, this.pitchspeed, this.yawspeed, this.pose_covariance, this.velocity_covariance, this.frame_id, this.child_frame_id, this.reset_counter, this.estimator_type, this.quality]));
}

/* 
Describe a trajectory using an array of up-to 5 waypoints in the local
frame (MAV_FRAME_LOCAL_NED).

                time_usec                 : Timestamp (UNIX Epoch time or time since system boot). The receiving end can infer timestamp format (since 1.1.1970 or since system boot) by checking for the magnitude of the number. (uint64_t)
                valid_points              : Number of valid points (up-to 5 waypoints are possible) (uint8_t)
                pos_x                     : X-coordinate of waypoint, set to NaN if not being used (float)
                pos_y                     : Y-coordinate of waypoint, set to NaN if not being used (float)
                pos_z                     : Z-coordinate of waypoint, set to NaN if not being used (float)
                vel_x                     : X-velocity of waypoint, set to NaN if not being used (float)
                vel_y                     : Y-velocity of waypoint, set to NaN if not being used (float)
                vel_z                     : Z-velocity of waypoint, set to NaN if not being used (float)
                acc_x                     : X-acceleration of waypoint, set to NaN if not being used (float)
                acc_y                     : Y-acceleration of waypoint, set to NaN if not being used (float)
                acc_z                     : Z-acceleration of waypoint, set to NaN if not being used (float)
                pos_yaw                   : Yaw angle, set to NaN if not being used (float)
                vel_yaw                   : Yaw rate, set to NaN if not being used (float)
                command                   : MAV_CMD command id of waypoint, set to UINT16_MAX if not being used. (uint16_t)

*/
mavlink20.messages.trajectory_representation_waypoints = function(time_usec, valid_points, pos_x, pos_y, pos_z, vel_x, vel_y, vel_z, acc_x, acc_y, acc_z, pos_yaw, vel_yaw, command) {

    this.format = '<Q5f5f5f5f5f5f5f5f5f5f5f5HB';
    this.id = mavlink20.MAVLINK_MSG_ID_TRAJECTORY_REPRESENTATION_WAYPOINTS;
    this.order_map = [0, 13, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    this.crc_extra = 236;
    this.name = 'TRAJECTORY_REPRESENTATION_WAYPOINTS';

    this.fieldnames = ['time_usec', 'valid_points', 'pos_x', 'pos_y', 'pos_z', 'vel_x', 'vel_y', 'vel_z', 'acc_x', 'acc_y', 'acc_z', 'pos_yaw', 'vel_yaw', 'command'];


    this.set(arguments);

}
        mavlink20.messages.trajectory_representation_waypoints.prototype = new mavlink20.message;
mavlink20.messages.trajectory_representation_waypoints.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.time_usec, this.pos_x, this.pos_y, this.pos_z, this.vel_x, this.vel_y, this.vel_z, this.acc_x, this.acc_y, this.acc_z, this.pos_yaw, this.vel_yaw, this.command, this.valid_points]));
}

/* 
Describe a trajectory using an array of up-to 5 bezier control points
in the local frame (MAV_FRAME_LOCAL_NED).

                time_usec                 : Timestamp (UNIX Epoch time or time since system boot). The receiving end can infer timestamp format (since 1.1.1970 or since system boot) by checking for the magnitude of the number. (uint64_t)
                valid_points              : Number of valid control points (up-to 5 points are possible) (uint8_t)
                pos_x                     : X-coordinate of bezier control points. Set to NaN if not being used (float)
                pos_y                     : Y-coordinate of bezier control points. Set to NaN if not being used (float)
                pos_z                     : Z-coordinate of bezier control points. Set to NaN if not being used (float)
                delta                     : Bezier time horizon. Set to NaN if velocity/acceleration should not be incorporated (float)
                pos_yaw                   : Yaw. Set to NaN for unchanged (float)

*/
mavlink20.messages.trajectory_representation_bezier = function(time_usec, valid_points, pos_x, pos_y, pos_z, delta, pos_yaw) {

    this.format = '<Q5f5f5f5f5fB';
    this.id = mavlink20.MAVLINK_MSG_ID_TRAJECTORY_REPRESENTATION_BEZIER;
    this.order_map = [0, 6, 1, 2, 3, 4, 5];
    this.crc_extra = 231;
    this.name = 'TRAJECTORY_REPRESENTATION_BEZIER';

    this.fieldnames = ['time_usec', 'valid_points', 'pos_x', 'pos_y', 'pos_z', 'delta', 'pos_yaw'];


    this.set(arguments);

}
        mavlink20.messages.trajectory_representation_bezier.prototype = new mavlink20.message;
mavlink20.messages.trajectory_representation_bezier.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.time_usec, this.pos_x, this.pos_y, this.pos_z, this.delta, this.pos_yaw, this.valid_points]));
}

/* 
Report current used cellular network status

                status                    : Cellular modem status (uint8_t)
                failure_reason            : Failure reason when status in in CELLULAR_STATUS_FLAG_FAILED (uint8_t)
                type                      : Cellular network radio type: gsm, cdma, lte... (uint8_t)
                quality                   : Signal quality in percent. If unknown, set to UINT8_MAX (uint8_t)
                mcc                       : Mobile country code. If unknown, set to UINT16_MAX (uint16_t)
                mnc                       : Mobile network code. If unknown, set to UINT16_MAX (uint16_t)
                lac                       : Location area code. If unknown, set to 0 (uint16_t)

*/
mavlink20.messages.cellular_status = function(status, failure_reason, type, quality, mcc, mnc, lac) {

    this.format = '<HHHBBBB';
    this.id = mavlink20.MAVLINK_MSG_ID_CELLULAR_STATUS;
    this.order_map = [3, 4, 5, 6, 0, 1, 2];
    this.crc_extra = 72;
    this.name = 'CELLULAR_STATUS';

    this.fieldnames = ['status', 'failure_reason', 'type', 'quality', 'mcc', 'mnc', 'lac'];


    this.set(arguments);

}
        mavlink20.messages.cellular_status.prototype = new mavlink20.message;
mavlink20.messages.cellular_status.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.mcc, this.mnc, this.lac, this.status, this.failure_reason, this.type, this.quality]));
}

/* 
Status of the Iridium SBD link.

                timestamp                 : Timestamp (UNIX Epoch time or time since system boot). The receiving end can infer timestamp format (since 1.1.1970 or since system boot) by checking for the magnitude of the number. (uint64_t)
                last_heartbeat            : Timestamp of the last successful sbd session. The receiving end can infer timestamp format (since 1.1.1970 or since system boot) by checking for the magnitude of the number. (uint64_t)
                failed_sessions           : Number of failed SBD sessions. (uint16_t)
                successful_sessions        : Number of successful SBD sessions. (uint16_t)
                signal_quality            : Signal quality equal to the number of bars displayed on the ISU signal strength indicator. Range is 0 to 5, where 0 indicates no signal and 5 indicates maximum signal strength. (uint8_t)
                ring_pending              : 1: Ring call pending, 0: No call pending. (uint8_t)
                tx_session_pending        : 1: Transmission session pending, 0: No transmission session pending. (uint8_t)
                rx_session_pending        : 1: Receiving session pending, 0: No receiving session pending. (uint8_t)

*/
mavlink20.messages.isbd_link_status = function(timestamp, last_heartbeat, failed_sessions, successful_sessions, signal_quality, ring_pending, tx_session_pending, rx_session_pending) {

    this.format = '<QQHHBBBB';
    this.id = mavlink20.MAVLINK_MSG_ID_ISBD_LINK_STATUS;
    this.order_map = [0, 1, 2, 3, 4, 5, 6, 7];
    this.crc_extra = 225;
    this.name = 'ISBD_LINK_STATUS';

    this.fieldnames = ['timestamp', 'last_heartbeat', 'failed_sessions', 'successful_sessions', 'signal_quality', 'ring_pending', 'tx_session_pending', 'rx_session_pending'];


    this.set(arguments);

}
        mavlink20.messages.isbd_link_status.prototype = new mavlink20.message;
mavlink20.messages.isbd_link_status.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.timestamp, this.last_heartbeat, this.failed_sessions, this.successful_sessions, this.signal_quality, this.ring_pending, this.tx_session_pending, this.rx_session_pending]));
}

/* 
Configure cellular modems.         This message is re-emitted as an
acknowledgement by the modem.         The message may also be
explicitly requested using MAV_CMD_REQUEST_MESSAGE.

                enable_lte                : Enable/disable LTE. 0: setting unchanged, 1: disabled, 2: enabled. Current setting when sent back as a response. (uint8_t)
                enable_pin                : Enable/disable PIN on the SIM card. 0: setting unchanged, 1: disabled, 2: enabled. Current setting when sent back as a response. (uint8_t)
                pin                       : PIN sent to the SIM card. Blank when PIN is disabled. Empty when message is sent back as a response. (char)
                new_pin                   : New PIN when changing the PIN. Blank to leave it unchanged. Empty when message is sent back as a response. (char)
                apn                       : Name of the cellular APN. Blank to leave it unchanged. Current APN when sent back as a response. (char)
                puk                       : Required PUK code in case the user failed to authenticate 3 times with the PIN. Empty when message is sent back as a response. (char)
                roaming                   : Enable/disable roaming. 0: setting unchanged, 1: disabled, 2: enabled. Current setting when sent back as a response. (uint8_t)
                response                  : Message acceptance response (sent back to GS). (uint8_t)

*/
mavlink20.messages.cellular_config = function(enable_lte, enable_pin, pin, new_pin, apn, puk, roaming, response) {

    this.format = '<BB16s16s32s16sBB';
    this.id = mavlink20.MAVLINK_MSG_ID_CELLULAR_CONFIG;
    this.order_map = [0, 1, 2, 3, 4, 5, 6, 7];
    this.crc_extra = 245;
    this.name = 'CELLULAR_CONFIG';

    this.fieldnames = ['enable_lte', 'enable_pin', 'pin', 'new_pin', 'apn', 'puk', 'roaming', 'response'];


    this.set(arguments);

}
        mavlink20.messages.cellular_config.prototype = new mavlink20.message;
mavlink20.messages.cellular_config.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.enable_lte, this.enable_pin, this.pin, this.new_pin, this.apn, this.puk, this.roaming, this.response]));
}

/* 
RPM sensor data message.

                index                     : Index of this RPM sensor (0-indexed) (uint8_t)
                frequency                 : Indicated rate (float)

*/
mavlink20.messages.raw_rpm = function(index, frequency) {

    this.format = '<fB';
    this.id = mavlink20.MAVLINK_MSG_ID_RAW_RPM;
    this.order_map = [1, 0];
    this.crc_extra = 199;
    this.name = 'RAW_RPM';

    this.fieldnames = ['index', 'frequency'];


    this.set(arguments);

}
        mavlink20.messages.raw_rpm.prototype = new mavlink20.message;
mavlink20.messages.raw_rpm.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.frequency, this.index]));
}

/* 
The global position resulting from GPS and sensor fusion.

                time                      : Time of applicability of position (microseconds since UNIX epoch). (uint64_t)
                uas_id                    : Unique UAS ID. (uint8_t)
                lat                       : Latitude (WGS84) (int32_t)
                lon                       : Longitude (WGS84) (int32_t)
                alt                       : Altitude (WGS84) (int32_t)
                relative_alt              : Altitude above ground (int32_t)
                vx                        : Ground X speed (latitude, positive north) (int16_t)
                vy                        : Ground Y speed (longitude, positive east) (int16_t)
                vz                        : Ground Z speed (altitude, positive down) (int16_t)
                h_acc                     : Horizontal position uncertainty (standard deviation) (uint16_t)
                v_acc                     : Altitude uncertainty (standard deviation) (uint16_t)
                vel_acc                   : Speed uncertainty (standard deviation) (uint16_t)
                next_lat                  : Next waypoint, latitude (WGS84) (int32_t)
                next_lon                  : Next waypoint, longitude (WGS84) (int32_t)
                next_alt                  : Next waypoint, altitude (WGS84) (int32_t)
                update_rate               : Time until next update. Set to 0 if unknown or in data driven mode. (uint16_t)
                flight_state              : Flight state (uint8_t)
                flags                     : Bitwise OR combination of the data available flags. (uint8_t)

*/
mavlink20.messages.utm_global_position = function(time, uas_id, lat, lon, alt, relative_alt, vx, vy, vz, h_acc, v_acc, vel_acc, next_lat, next_lon, next_alt, update_rate, flight_state, flags) {

    this.format = '<QiiiiiiihhhHHHH18sBB';
    this.id = mavlink20.MAVLINK_MSG_ID_UTM_GLOBAL_POSITION;
    this.order_map = [0, 15, 1, 2, 3, 4, 8, 9, 10, 11, 12, 13, 5, 6, 7, 14, 16, 17];
    this.crc_extra = 99;
    this.name = 'UTM_GLOBAL_POSITION';

    this.fieldnames = ['time', 'uas_id', 'lat', 'lon', 'alt', 'relative_alt', 'vx', 'vy', 'vz', 'h_acc', 'v_acc', 'vel_acc', 'next_lat', 'next_lon', 'next_alt', 'update_rate', 'flight_state', 'flags'];


    this.set(arguments);

}
        mavlink20.messages.utm_global_position.prototype = new mavlink20.message;
mavlink20.messages.utm_global_position.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.time, this.lat, this.lon, this.alt, this.relative_alt, this.next_lat, this.next_lon, this.next_alt, this.vx, this.vy, this.vz, this.h_acc, this.v_acc, this.vel_acc, this.update_rate, this.uas_id, this.flight_state, this.flags]));
}

/* 
Parameter set/get error. Returned from a MAVLink node in response to
an error in the parameter protocol, for example failing to set a
parameter because it does not exist.

                target_system             : System ID (uint8_t)
                target_component          : Component ID (uint8_t)
                param_id                  : Parameter id. Terminated by NULL if the length is less than 16 human-readable chars and WITHOUT null termination (NULL) byte if the length is exactly 16 chars - applications have to provide 16+1 bytes storage if the ID is stored as string (char)
                param_index               : Parameter index. Will be -1 if the param ID field should be used as an identifier (else the param id will be ignored) (int16_t)
                error                     : Error being returned to client. (uint8_t)

*/
mavlink20.messages.param_error = function(target_system, target_component, param_id, param_index, error) {

    this.format = '<hBB16sB';
    this.id = mavlink20.MAVLINK_MSG_ID_PARAM_ERROR;
    this.order_map = [1, 2, 3, 0, 4];
    this.crc_extra = 209;
    this.name = 'PARAM_ERROR';

    this.fieldnames = ['target_system', 'target_component', 'param_id', 'param_index', 'error'];


    this.set(arguments);

}
        mavlink20.messages.param_error.prototype = new mavlink20.message;
mavlink20.messages.param_error.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.param_index, this.target_system, this.target_component, this.param_id, this.error]));
}

/* 
Large debug/prototyping array. The message uses the maximum available
payload for data. The array_id and name fields are used to
discriminate between messages in code and in user interfaces
(respectively). Do not use in production code.

                time_usec                 : Timestamp (UNIX Epoch time or time since system boot). The receiving end can infer timestamp format (since 1.1.1970 or since system boot) by checking for the magnitude of the number. (uint64_t)
                name                      : Name, for human-friendly display in a Ground Control Station (char)
                array_id                  : Unique ID used to discriminate between arrays (uint16_t)
                data                      : data (float)

*/
mavlink20.messages.debug_float_array = function(time_usec, name, array_id, data) {

    this.format = '<QH10s58f';
    this.id = mavlink20.MAVLINK_MSG_ID_DEBUG_FLOAT_ARRAY;
    this.order_map = [0, 2, 1, 3];
    this.crc_extra = 232;
    this.name = 'DEBUG_FLOAT_ARRAY';

    this.fieldnames = ['time_usec', 'name', 'array_id', 'data'];


    this.set(arguments);

}
        mavlink20.messages.debug_float_array.prototype = new mavlink20.message;
mavlink20.messages.debug_float_array.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.time_usec, this.array_id, this.name, this.data]));
}

/* 
Vehicle status report that is sent out while orbit execution is in
progress (see MAV_CMD_DO_ORBIT).

                time_usec                 : Timestamp (UNIX Epoch time or time since system boot). The receiving end can infer timestamp format (since 1.1.1970 or since system boot) by checking for the magnitude of the number. (uint64_t)
                radius                    : Radius of the orbit circle. Positive values orbit clockwise, negative values orbit counter-clockwise. (float)
                frame                     : The coordinate system of the fields: x, y, z. (uint8_t)
                x                         : X coordinate of center point. Coordinate system depends on frame field: local = x position in meters * 1e4, global = latitude in degrees * 1e7. (int32_t)
                y                         : Y coordinate of center point.  Coordinate system depends on frame field: local = x position in meters * 1e4, global = latitude in degrees * 1e7. (int32_t)
                z                         : Altitude of center point. Coordinate system depends on frame field. (float)

*/
mavlink20.messages.orbit_execution_status = function(time_usec, radius, frame, x, y, z) {

    this.format = '<QfiifB';
    this.id = mavlink20.MAVLINK_MSG_ID_ORBIT_EXECUTION_STATUS;
    this.order_map = [0, 1, 5, 2, 3, 4];
    this.crc_extra = 11;
    this.name = 'ORBIT_EXECUTION_STATUS';

    this.fieldnames = ['time_usec', 'radius', 'frame', 'x', 'y', 'z'];


    this.set(arguments);

}
        mavlink20.messages.orbit_execution_status.prototype = new mavlink20.message;
mavlink20.messages.orbit_execution_status.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.time_usec, this.radius, this.x, this.y, this.z, this.frame]));
}

/* 
Smart Battery information (static/infrequent update). Use for updates
from: smart battery to flight stack, flight stack to GCS. Use
BATTERY_STATUS for the frequent battery updates.

                id                        : Battery ID (uint8_t)
                battery_function          : Function of the battery (uint8_t)
                type                      : Type (chemistry) of the battery (uint8_t)
                capacity_full_specification        : Capacity when full according to manufacturer, -1: field not provided. (int32_t)
                capacity_full             : Capacity when full (accounting for battery degradation), -1: field not provided. (int32_t)
                cycle_count               : Charge/discharge cycle count. UINT16_MAX: field not provided. (uint16_t)
                serial_number             : Serial number in ASCII characters, 0 terminated. All 0: field not provided. (char)
                device_name               : Static device name in ASCII characters, 0 terminated. All 0: field not provided. Encode as manufacturer name then product name separated using an underscore. (char)
                weight                    : Battery weight. 0: field not provided. (uint16_t)
                discharge_minimum_voltage        : Minimum per-cell voltage when discharging. If not supplied set to UINT16_MAX value. (uint16_t)
                charging_minimum_voltage        : Minimum per-cell voltage when charging. If not supplied set to UINT16_MAX value. (uint16_t)
                resting_minimum_voltage        : Minimum per-cell voltage when resting. If not supplied set to UINT16_MAX value. (uint16_t)
                charging_maximum_voltage        : Maximum per-cell voltage when charged. 0: field not provided. (uint16_t)
                cells_in_series           : Number of battery cells in series. 0: field not provided. (uint8_t)
                discharge_maximum_current        : Maximum pack discharge current. 0: field not provided. (uint32_t)
                discharge_maximum_burst_current        : Maximum pack discharge burst current. 0: field not provided. (uint32_t)
                manufacture_date          : Manufacture date (DD/MM/YYYY) in ASCII characters, 0 terminated. All 0: field not provided. (char)

*/
mavlink20.messages.smart_battery_info = function(id, battery_function, type, capacity_full_specification, capacity_full, cycle_count, serial_number, device_name, weight, discharge_minimum_voltage, charging_minimum_voltage, resting_minimum_voltage, charging_maximum_voltage, cells_in_series, discharge_maximum_current, discharge_maximum_burst_current, manufacture_date) {

    this.format = '<iiHHHHHBBB16s50sHBII11s';
    this.id = mavlink20.MAVLINK_MSG_ID_SMART_BATTERY_INFO;
    this.order_map = [7, 8, 9, 0, 1, 2, 10, 11, 3, 4, 5, 6, 12, 13, 14, 15, 16];
    this.crc_extra = 75;
    this.name = 'SMART_BATTERY_INFO';

    this.fieldnames = ['id', 'battery_function', 'type', 'capacity_full_specification', 'capacity_full', 'cycle_count', 'serial_number', 'device_name', 'weight', 'discharge_minimum_voltage', 'charging_minimum_voltage', 'resting_minimum_voltage', 'charging_maximum_voltage', 'cells_in_series', 'discharge_maximum_current', 'discharge_maximum_burst_current', 'manufacture_date'];


    this.set(arguments);

}
        mavlink20.messages.smart_battery_info.prototype = new mavlink20.message;
mavlink20.messages.smart_battery_info.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.capacity_full_specification, this.capacity_full, this.cycle_count, this.weight, this.discharge_minimum_voltage, this.charging_minimum_voltage, this.resting_minimum_voltage, this.id, this.battery_function, this.type, this.serial_number, this.device_name, this.charging_maximum_voltage, this.cells_in_series, this.discharge_maximum_current, this.discharge_maximum_burst_current, this.manufacture_date]));
}

/* 
Fuel status.         This message provides "generic" fuel level
information for  in a GCS and for triggering failsafes in an
autopilot.         The fuel type and associated units for fields in
this message are defined in the enum MAV_FUEL_TYPE.          The
reported `consumed_fuel` and `remaining_fuel` must only be supplied if
measured: they must not be inferred from the `maximum_fuel` and the
other value.         A recipient can assume that if these fields are
supplied they are accurate.         If not provided, the recipient can
infer `remaining_fuel` from `maximum_fuel` and `consumed_fuel` on the
assumption that the fuel was initially at its maximum (this is what
battery monitors assume).         Note however that this is an
assumption, and the UI should prompt the user appropriately (i.e.
notify user that they should fill the tank before boot).          This
kind of information may also be sent in fuel-specific messages such as
BATTERY_STATUS_V2.         If both messages are sent for the same fuel
system, the ids and corresponding information must match.
This should be streamed (nominally at 0.1 Hz).

                id                        : Fuel ID. Must match ID of other messages for same fuel system, such as BATTERY_STATUS_V2. (uint8_t)
                maximum_fuel              : Capacity when full. Must be provided. (float)
                consumed_fuel             : Consumed fuel (measured). This value should not be inferred: if not measured set to NaN. NaN: field not provided. (float)
                remaining_fuel            : Remaining fuel until empty (measured). The value should not be inferred: if not measured set to NaN. NaN: field not provided. (float)
                percent_remaining         : Percentage of remaining fuel, relative to full. Values: [0-100], UINT8_MAX: field not provided. (uint8_t)
                flow_rate                 : Positive value when emptying/using, and negative if filling/replacing. NaN: field not provided. (float)
                temperature               : Fuel temperature. NaN: field not provided. (float)
                fuel_type                 : Fuel type. Defines units for fuel capacity and consumption fields above. (uint32_t)

*/
mavlink20.messages.fuel_status = function(id, maximum_fuel, consumed_fuel, remaining_fuel, percent_remaining, flow_rate, temperature, fuel_type) {

    this.format = '<fffffIBB';
    this.id = mavlink20.MAVLINK_MSG_ID_FUEL_STATUS;
    this.order_map = [6, 0, 1, 2, 7, 3, 4, 5];
    this.crc_extra = 10;
    this.name = 'FUEL_STATUS';

    this.fieldnames = ['id', 'maximum_fuel', 'consumed_fuel', 'remaining_fuel', 'percent_remaining', 'flow_rate', 'temperature', 'fuel_type'];


    this.set(arguments);

}
        mavlink20.messages.fuel_status.prototype = new mavlink20.message;
mavlink20.messages.fuel_status.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.maximum_fuel, this.consumed_fuel, this.remaining_fuel, this.flow_rate, this.temperature, this.fuel_type, this.id, this.percent_remaining]));
}

/* 
Battery information that is static, or requires infrequent update.
This message should requested using MAV_CMD_REQUEST_MESSAGE and/or
streamed at very low rate.         BATTERY_STATUS_V2 is used for
higher-rate battery status information.

                id                        : Battery ID (uint8_t)
                battery_function          : Function of the battery. (uint8_t)
                type                      : Type (chemistry) of the battery. (uint8_t)
                state_of_health           : State of Health (SOH) estimate. Typically 100% at the time of manufacture and will decrease over time and use. -1: field not provided. (uint8_t)
                cells_in_series           : Number of battery cells in series. 0: field not provided. (uint8_t)
                cycle_count               : Lifetime count of the number of charge/discharge cycles (https://en.wikipedia.org/wiki/Charge_cycle). UINT16_MAX: field not provided. (uint16_t)
                weight                    : Battery weight. 0: field not provided. (uint16_t)
                discharge_minimum_voltage        : Minimum per-cell voltage when discharging. 0: field not provided. (float)
                charging_minimum_voltage        : Minimum per-cell voltage when charging. 0: field not provided. (float)
                resting_minimum_voltage        : Minimum per-cell voltage when resting. 0: field not provided. (float)
                charging_maximum_voltage        : Maximum per-cell voltage when charged. 0: field not provided. (float)
                charging_maximum_current        : Maximum pack continuous charge current. 0: field not provided. (float)
                nominal_voltage           : Battery nominal voltage. Used for conversion between Wh and Ah. 0: field not provided. (float)
                discharge_maximum_current        : Maximum pack discharge current. 0: field not provided. (float)
                discharge_maximum_burst_current        : Maximum pack discharge burst current. 0: field not provided. (float)
                design_capacity           : Fully charged design capacity. 0: field not provided. (float)
                full_charge_capacity        : Predicted battery capacity when fully charged (accounting for battery degradation). NAN: field not provided. (float)
                manufacture_date          : Manufacture date (DDMMYYYY) in ASCII characters, 0 terminated. All 0: field not provided. (char)
                serial_number             : Serial number in ASCII characters, 0 terminated. All 0: field not provided. (char)
                name                      : Battery device name. Formatted as manufacturer name then product name, separated with an underscore (in ASCII characters), 0 terminated. All 0: field not provided. (char)

*/
mavlink20.messages.battery_info = function(id, battery_function, type, state_of_health, cells_in_series, cycle_count, weight, discharge_minimum_voltage, charging_minimum_voltage, resting_minimum_voltage, charging_maximum_voltage, charging_maximum_current, nominal_voltage, discharge_maximum_current, discharge_maximum_burst_current, design_capacity, full_charge_capacity, manufacture_date, serial_number, name) {

    this.format = '<ffffffffffHHBBBBB9s32s50s';
    this.id = mavlink20.MAVLINK_MSG_ID_BATTERY_INFO;
    this.order_map = [12, 13, 14, 15, 16, 10, 11, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 17, 18, 19];
    this.crc_extra = 26;
    this.name = 'BATTERY_INFO';

    this.fieldnames = ['id', 'battery_function', 'type', 'state_of_health', 'cells_in_series', 'cycle_count', 'weight', 'discharge_minimum_voltage', 'charging_minimum_voltage', 'resting_minimum_voltage', 'charging_maximum_voltage', 'charging_maximum_current', 'nominal_voltage', 'discharge_maximum_current', 'discharge_maximum_burst_current', 'design_capacity', 'full_charge_capacity', 'manufacture_date', 'serial_number', 'name'];


    this.set(arguments);

}
        mavlink20.messages.battery_info.prototype = new mavlink20.message;
mavlink20.messages.battery_info.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.discharge_minimum_voltage, this.charging_minimum_voltage, this.resting_minimum_voltage, this.charging_maximum_voltage, this.charging_maximum_current, this.nominal_voltage, this.discharge_maximum_current, this.discharge_maximum_burst_current, this.design_capacity, this.full_charge_capacity, this.cycle_count, this.weight, this.id, this.battery_function, this.type, this.state_of_health, this.cells_in_series, this.manufacture_date, this.serial_number, this.name]));
}

/* 
Telemetry of power generation system. Alternator or mechanical
generator.

                status                    : Status flags. (uint64_t)
                generator_speed           : Speed of electrical generator or alternator. UINT16_MAX: field not provided. (uint16_t)
                battery_current           : Current into/out of battery. Positive for out. Negative for in. NaN: field not provided. (float)
                load_current              : Current going to the UAV. If battery current not available this is the DC current from the generator. Positive for out. Negative for in. NaN: field not provided (float)
                power_generated           : The power being generated. NaN: field not provided (float)
                bus_voltage               : Voltage of the bus seen at the generator, or battery bus if battery bus is controlled by generator and at a different voltage to main bus. (float)
                rectifier_temperature        : The temperature of the rectifier or power converter. INT16_MAX: field not provided. (int16_t)
                bat_current_setpoint        : The target battery current. Positive for out. Negative for in. NaN: field not provided (float)
                generator_temperature        : The temperature of the mechanical motor, fuel cell core or generator. INT16_MAX: field not provided. (int16_t)
                runtime                   : Seconds this generator has run since it was rebooted. UINT32_MAX: field not provided. (uint32_t)
                time_until_maintenance        : Seconds until this generator requires maintenance.  A negative value indicates maintenance is past-due. INT32_MAX: field not provided. (int32_t)

*/
mavlink20.messages.generator_status = function(status, generator_speed, battery_current, load_current, power_generated, bus_voltage, rectifier_temperature, bat_current_setpoint, generator_temperature, runtime, time_until_maintenance) {

    this.format = '<QfffffIiHhh';
    this.id = mavlink20.MAVLINK_MSG_ID_GENERATOR_STATUS;
    this.order_map = [0, 8, 1, 2, 3, 4, 9, 5, 10, 6, 7];
    this.crc_extra = 117;
    this.name = 'GENERATOR_STATUS';

    this.fieldnames = ['status', 'generator_speed', 'battery_current', 'load_current', 'power_generated', 'bus_voltage', 'rectifier_temperature', 'bat_current_setpoint', 'generator_temperature', 'runtime', 'time_until_maintenance'];


    this.set(arguments);

}
        mavlink20.messages.generator_status.prototype = new mavlink20.message;
mavlink20.messages.generator_status.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.status, this.battery_current, this.load_current, this.power_generated, this.bus_voltage, this.bat_current_setpoint, this.runtime, this.time_until_maintenance, this.generator_speed, this.rectifier_temperature, this.generator_temperature]));
}

/* 
The raw values of the actuator outputs (e.g. on Pixhawk, from MAIN,
AUX ports). This message supersedes SERVO_OUTPUT_RAW.

                time_usec                 : Timestamp (since system boot). (uint64_t)
                active                    : Active outputs (uint32_t)
                actuator                  : Servo / motor output array values. Zero values indicate unused channels. (float)

*/
mavlink20.messages.actuator_output_status = function(time_usec, active, actuator) {

    this.format = '<QI32f';
    this.id = mavlink20.MAVLINK_MSG_ID_ACTUATOR_OUTPUT_STATUS;
    this.order_map = [0, 1, 2];
    this.crc_extra = 251;
    this.name = 'ACTUATOR_OUTPUT_STATUS';

    this.fieldnames = ['time_usec', 'active', 'actuator'];


    this.set(arguments);

}
        mavlink20.messages.actuator_output_status.prototype = new mavlink20.message;
mavlink20.messages.actuator_output_status.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.time_usec, this.active, this.actuator]));
}

/* 
Time/duration estimates for various events and actions given the
current vehicle state and position.

                safe_return               : Estimated time to complete the vehicle's configured "safe return" action from its current position (e.g. RTL, Smart RTL, etc.). -1 indicates that the vehicle is landed, or that no time estimate available. (int32_t)
                land                      : Estimated time for vehicle to complete the LAND action from its current position. -1 indicates that the vehicle is landed, or that no time estimate available. (int32_t)
                mission_next_item         : Estimated time for reaching/completing the currently active mission item. -1 means no time estimate available. (int32_t)
                mission_end               : Estimated time for completing the current mission. -1 means no mission active and/or no estimate available. (int32_t)
                commanded_action          : Estimated time for completing the current commanded action (i.e. Go To, Takeoff, Land, etc.). -1 means no action active and/or no estimate available. (int32_t)

*/
mavlink20.messages.time_estimate_to_target = function(safe_return, land, mission_next_item, mission_end, commanded_action) {

    this.format = '<iiiii';
    this.id = mavlink20.MAVLINK_MSG_ID_TIME_ESTIMATE_TO_TARGET;
    this.order_map = [0, 1, 2, 3, 4];
    this.crc_extra = 232;
    this.name = 'TIME_ESTIMATE_TO_TARGET';

    this.fieldnames = ['safe_return', 'land', 'mission_next_item', 'mission_end', 'commanded_action'];


    this.set(arguments);

}
        mavlink20.messages.time_estimate_to_target.prototype = new mavlink20.message;
mavlink20.messages.time_estimate_to_target.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.safe_return, this.land, this.mission_next_item, this.mission_end, this.commanded_action]));
}

/* 
Message for transporting "arbitrary" variable-length data from one
component to another (broadcast is not forbidden, but discouraged).
The encoding of the data is usually extension specific, i.e.
determined by the source, and is usually not documented as part of the
MAVLink specification.

                target_system             : System ID (can be 0 for broadcast, but this is discouraged) (uint8_t)
                target_component          : Component ID (can be 0 for broadcast, but this is discouraged) (uint8_t)
                payload_type              : A code that identifies the content of the payload (0 for unknown, which is the default). If this code is less than 32768, it is a 'registered' payload type and the corresponding code should be added to the MAV_TUNNEL_PAYLOAD_TYPE enum. Software creators can register blocks of types as needed. Codes greater than 32767 are considered local experiments and should not be checked in to any widely distributed codebase. (uint16_t)
                payload_length            : Length of the data transported in payload (uint8_t)
                payload                   : Variable length payload. The payload length is defined by payload_length. The entire content of this block is opaque unless you understand the encoding specified by payload_type. (uint8_t)

*/
mavlink20.messages.tunnel = function(target_system, target_component, payload_type, payload_length, payload) {

    this.format = '<HBBB128s';
    this.id = mavlink20.MAVLINK_MSG_ID_TUNNEL;
    this.order_map = [1, 2, 0, 3, 4];
    this.crc_extra = 147;
    this.name = 'TUNNEL';

    this.fieldnames = ['target_system', 'target_component', 'payload_type', 'payload_length', 'payload'];


    this.set(arguments);

}
        mavlink20.messages.tunnel.prototype = new mavlink20.message;
mavlink20.messages.tunnel.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.payload_type, this.target_system, this.target_component, this.payload_length, this.payload]));
}

/* 
A forwarded CAN frame as requested by MAV_CMD_CAN_FORWARD.

                target_system             : System ID. (uint8_t)
                target_component          : Component ID. (uint8_t)
                bus                       : Bus number (uint8_t)
                len                       : Frame length (uint8_t)
                id                        : Frame ID (uint32_t)
                data                      : Frame data (uint8_t)

*/
mavlink20.messages.can_frame = function(target_system, target_component, bus, len, id, data) {

    this.format = '<IBBBB8s';
    this.id = mavlink20.MAVLINK_MSG_ID_CAN_FRAME;
    this.order_map = [1, 2, 3, 4, 0, 5];
    this.crc_extra = 132;
    this.name = 'CAN_FRAME';

    this.fieldnames = ['target_system', 'target_component', 'bus', 'len', 'id', 'data'];


    this.set(arguments);

}
        mavlink20.messages.can_frame.prototype = new mavlink20.message;
mavlink20.messages.can_frame.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.id, this.target_system, this.target_component, this.bus, this.len, this.data]));
}

/* 
Hardware status sent by an onboard computer.

                time_usec                 : Timestamp (UNIX Epoch time or time since system boot). The receiving end can infer timestamp format (since 1.1.1970 or since system boot) by checking for the magnitude of the number. (uint64_t)
                uptime                    : Time since system boot. (uint32_t)
                type                      : Type of the onboard computer: 0: Mission computer primary, 1: Mission computer backup 1, 2: Mission computer backup 2, 3: Compute node, 4-5: Compute spares, 6-9: Payload computers. (uint8_t)
                cpu_cores                 : CPU usage on the component in percent (100 - idle). A value of UINT8_MAX implies the field is unused. (uint8_t)
                cpu_combined              : Combined CPU usage as the last 10 slices of 100 MS (a histogram). This allows to identify spikes in load that max out the system, but only for a short amount of time. A value of UINT8_MAX implies the field is unused. (uint8_t)
                gpu_cores                 : GPU usage on the component in percent (100 - idle). A value of UINT8_MAX implies the field is unused. (uint8_t)
                gpu_combined              : Combined GPU usage as the last 10 slices of 100 MS (a histogram). This allows to identify spikes in load that max out the system, but only for a short amount of time. A value of UINT8_MAX implies the field is unused. (uint8_t)
                temperature_board         : Temperature of the board. A value of INT8_MAX implies the field is unused. (int8_t)
                temperature_core          : Temperature of the CPU core. A value of INT8_MAX implies the field is unused. (int8_t)
                fan_speed                 : Fan speeds. A value of INT16_MAX implies the field is unused. (int16_t)
                ram_usage                 : Amount of used RAM on the component system. A value of UINT32_MAX implies the field is unused. (uint32_t)
                ram_total                 : Total amount of RAM on the component system. A value of UINT32_MAX implies the field is unused. (uint32_t)
                storage_type              : Storage type: 0: HDD, 1: SSD, 2: EMMC, 3: SD card (non-removable), 4: SD card (removable). A value of UINT32_MAX implies the field is unused. (uint32_t)
                storage_usage             : Amount of used storage space on the component system. A value of UINT32_MAX implies the field is unused. (uint32_t)
                storage_total             : Total amount of storage space on the component system. A value of UINT32_MAX implies the field is unused. (uint32_t)
                link_type                 : Link type: 0-9: UART, 10-19: Wired network, 20-29: Wifi, 30-39: Point-to-point proprietary, 40-49: Mesh proprietary (uint32_t)
                link_tx_rate              : Network traffic from the component system. A value of UINT32_MAX implies the field is unused. (uint32_t)
                link_rx_rate              : Network traffic to the component system. A value of UINT32_MAX implies the field is unused. (uint32_t)
                link_tx_max               : Network capacity from the component system. A value of UINT32_MAX implies the field is unused. (uint32_t)
                link_rx_max               : Network capacity to the component system. A value of UINT32_MAX implies the field is unused. (uint32_t)
                status_flags              : Bitmap of status flags. (uint16_t)

*/
mavlink20.messages.onboard_computer_status = function(time_usec, uptime, type, cpu_cores, cpu_combined, gpu_cores, gpu_combined, temperature_board, temperature_core, fan_speed, ram_usage, ram_total, storage_type, storage_usage, storage_total, link_type, link_tx_rate, link_rx_rate, link_tx_max, link_rx_max, status_flags) {

    this.format = '<QIII4I4I4I6I6I6I6I6I4hB8s10s4s10sb8sH';
    this.id = mavlink20.MAVLINK_MSG_ID_ONBOARD_COMPUTER_STATUS;
    this.order_map = [0, 1, 13, 14, 15, 16, 17, 18, 19, 12, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 20];
    this.crc_extra = 156;
    this.name = 'ONBOARD_COMPUTER_STATUS';

    this.fieldnames = ['time_usec', 'uptime', 'type', 'cpu_cores', 'cpu_combined', 'gpu_cores', 'gpu_combined', 'temperature_board', 'temperature_core', 'fan_speed', 'ram_usage', 'ram_total', 'storage_type', 'storage_usage', 'storage_total', 'link_type', 'link_tx_rate', 'link_rx_rate', 'link_tx_max', 'link_rx_max', 'status_flags'];


    this.set(arguments);

}
        mavlink20.messages.onboard_computer_status.prototype = new mavlink20.message;
mavlink20.messages.onboard_computer_status.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.time_usec, this.uptime, this.ram_usage, this.ram_total, this.storage_type, this.storage_usage, this.storage_total, this.link_type, this.link_tx_rate, this.link_rx_rate, this.link_tx_max, this.link_rx_max, this.fan_speed, this.type, this.cpu_cores, this.cpu_combined, this.gpu_cores, this.gpu_combined, this.temperature_board, this.temperature_core, this.status_flags]));
}

/* 
Component information message, which may be requested using
MAV_CMD_REQUEST_MESSAGE.

                time_boot_ms              : Timestamp (time since system boot). (uint32_t)
                general_metadata_file_crc        : CRC32 of the general metadata file (general_metadata_uri). (uint32_t)
                general_metadata_uri        : MAVLink FTP URI for the general metadata file (COMP_METADATA_TYPE_GENERAL), which may be compressed with xz. The file contains general component metadata, and may contain URI links for additional metadata (see COMP_METADATA_TYPE). The information is static from boot, and may be generated at compile time. The string needs to be zero terminated. (char)
                peripherals_metadata_file_crc        : CRC32 of peripherals metadata file (peripherals_metadata_uri). (uint32_t)
                peripherals_metadata_uri        : (Optional) MAVLink FTP URI for the peripherals metadata file (COMP_METADATA_TYPE_PERIPHERALS), which may be compressed with xz. This contains data about "attached components" such as UAVCAN nodes. The peripherals are in a separate file because the information must be generated dynamically at runtime. The string needs to be zero terminated. (char)

*/
mavlink20.messages.component_information = function(time_boot_ms, general_metadata_file_crc, general_metadata_uri, peripherals_metadata_file_crc, peripherals_metadata_uri) {

    this.format = '<III100s100s';
    this.id = mavlink20.MAVLINK_MSG_ID_COMPONENT_INFORMATION;
    this.order_map = [0, 1, 3, 2, 4];
    this.crc_extra = 0;
    this.name = 'COMPONENT_INFORMATION';

    this.fieldnames = ['time_boot_ms', 'general_metadata_file_crc', 'general_metadata_uri', 'peripherals_metadata_file_crc', 'peripherals_metadata_uri'];


    this.set(arguments);

}
        mavlink20.messages.component_information.prototype = new mavlink20.message;
mavlink20.messages.component_information.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.time_boot_ms, this.general_metadata_file_crc, this.peripherals_metadata_file_crc, this.general_metadata_uri, this.peripherals_metadata_uri]));
}

/* 
Basic component information data. Should be requested using
MAV_CMD_REQUEST_MESSAGE on startup, or when required.

                time_boot_ms              : Timestamp (time since system boot). (uint32_t)
                capabilities              : Component capability flags (uint64_t)
                time_manufacture_s        : Date of manufacture as a UNIX Epoch time (since 1.1.1970) in seconds. (uint32_t)
                vendor_name               : Name of the component vendor. Needs to be zero terminated. The field is optional and can be empty/all zeros. (char)
                model_name                : Name of the component model. Needs to be zero terminated. The field is optional and can be empty/all zeros. (char)
                software_version          : Software version. The recommended format is SEMVER: 'major.minor.patch'  (any format may be used). The field must be zero terminated if it has a value. The field is optional and can be empty/all zeros. (char)
                hardware_version          : Hardware version. The recommended format is SEMVER: 'major.minor.patch'  (any format may be used). The field must be zero terminated if it has a value. The field is optional and can be empty/all zeros. (char)
                serial_number             : Hardware serial number. The field must be zero terminated if it has a value. The field is optional and can be empty/all zeros. (char)

*/
mavlink20.messages.component_information_basic = function(time_boot_ms, capabilities, time_manufacture_s, vendor_name, model_name, software_version, hardware_version, serial_number) {

    this.format = '<QII32s32s24s24s32s';
    this.id = mavlink20.MAVLINK_MSG_ID_COMPONENT_INFORMATION_BASIC;
    this.order_map = [1, 0, 2, 3, 4, 5, 6, 7];
    this.crc_extra = 50;
    this.name = 'COMPONENT_INFORMATION_BASIC';

    this.fieldnames = ['time_boot_ms', 'capabilities', 'time_manufacture_s', 'vendor_name', 'model_name', 'software_version', 'hardware_version', 'serial_number'];


    this.set(arguments);

}
        mavlink20.messages.component_information_basic.prototype = new mavlink20.message;
mavlink20.messages.component_information_basic.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.capabilities, this.time_boot_ms, this.time_manufacture_s, this.vendor_name, this.model_name, this.software_version, this.hardware_version, this.serial_number]));
}

/* 
Component metadata message, which may be requested using
MAV_CMD_REQUEST_MESSAGE.          This contains the MAVLink FTP URI
and CRC for the component's general metadata file.         The file
must be hosted on the component, and may be xz compressed.         The
file CRC can be used for file caching.          The general metadata
file can be read to get the locations of other metadata files
(COMP_METADATA_TYPE) and translations, which may be hosted either on
the vehicle or the internet.         For more information see:
https://mavlink.io/en/services/component_information.html.
Note: Camera components should use CAMERA_INFORMATION instead, and
autopilots may use both this message and AUTOPILOT_VERSION.

                time_boot_ms              : Timestamp (time since system boot). (uint32_t)
                file_crc                  : CRC32 of the general metadata file. (uint32_t)
                uri                       : MAVLink FTP URI for the general metadata file (COMP_METADATA_TYPE_GENERAL), which may be compressed with xz. The file contains general component metadata, and may contain URI links for additional metadata (see COMP_METADATA_TYPE). The information is static from boot, and may be generated at compile time. The string needs to be zero terminated. (char)

*/
mavlink20.messages.component_metadata = function(time_boot_ms, file_crc, uri) {

    this.format = '<II100s';
    this.id = mavlink20.MAVLINK_MSG_ID_COMPONENT_METADATA;
    this.order_map = [0, 1, 2];
    this.crc_extra = 182;
    this.name = 'COMPONENT_METADATA';

    this.fieldnames = ['time_boot_ms', 'file_crc', 'uri'];


    this.set(arguments);

}
        mavlink20.messages.component_metadata.prototype = new mavlink20.message;
mavlink20.messages.component_metadata.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.time_boot_ms, this.file_crc, this.uri]));
}

/* 
Play vehicle tone/tune (buzzer). Supersedes message PLAY_TUNE.

                target_system             : System ID (uint8_t)
                target_component          : Component ID (uint8_t)
                format                    : Tune format (uint32_t)
                tune                      : Tune definition as a NULL-terminated string. (char)

*/
mavlink20.messages.play_tune_v2 = function(target_system, target_component, format, tune) {

    this.format = '<IBB248s';
    this.id = mavlink20.MAVLINK_MSG_ID_PLAY_TUNE_V2;
    this.order_map = [1, 2, 0, 3];
    this.crc_extra = 110;
    this.name = 'PLAY_TUNE_V2';

    this.fieldnames = ['target_system', 'target_component', 'format', 'tune'];


    this.set(arguments);

}
        mavlink20.messages.play_tune_v2.prototype = new mavlink20.message;
mavlink20.messages.play_tune_v2.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.format, this.target_system, this.target_component, this.tune]));
}

/* 
Tune formats supported by vehicle. This should be emitted as response
to MAV_CMD_REQUEST_MESSAGE.

                target_system             : System ID (uint8_t)
                target_component          : Component ID (uint8_t)
                format                    : Bitfield of supported tune formats. (uint32_t)

*/
mavlink20.messages.supported_tunes = function(target_system, target_component, format) {

    this.format = '<IBB';
    this.id = mavlink20.MAVLINK_MSG_ID_SUPPORTED_TUNES;
    this.order_map = [1, 2, 0];
    this.crc_extra = 183;
    this.name = 'SUPPORTED_TUNES';

    this.fieldnames = ['target_system', 'target_component', 'format'];


    this.set(arguments);

}
        mavlink20.messages.supported_tunes.prototype = new mavlink20.message;
mavlink20.messages.supported_tunes.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.format, this.target_system, this.target_component]));
}

/* 
Event message. Each new event from a particular component gets a new
sequence number. The same message might be sent multiple times if
(re-)requested. Most events are broadcast, some can be specific to a
target component (as receivers keep track of the sequence for missed
events, all events need to be broadcast. Thus we use
destination_component instead of target_component).

                destination_component        : Component ID (uint8_t)
                destination_system        : System ID (uint8_t)
                id                        : Event ID (as defined in the component metadata) (uint32_t)
                event_time_boot_ms        : Timestamp (time since system boot when the event happened). (uint32_t)
                sequence                  : Sequence number. (uint16_t)
                log_levels                : Log levels: 4 bits MSB: internal (for logging purposes), 4 bits LSB: external. Levels: Emergency = 0, Alert = 1, Critical = 2, Error = 3, Warning = 4, Notice = 5, Info = 6, Debug = 7, Protocol = 8, Disabled = 9 (uint8_t)
                arguments                 : Arguments (depend on event ID). (uint8_t)

*/
mavlink20.messages.event = function(destination_component, destination_system, id, event_time_boot_ms, sequence, log_levels, arguments) {

    this.format = '<IIHBBB40s';
    this.id = mavlink20.MAVLINK_MSG_ID_EVENT;
    this.order_map = [3, 4, 0, 1, 2, 5, 6];
    this.crc_extra = 160;
    this.name = 'EVENT';

    this.fieldnames = ['destination_component', 'destination_system', 'id', 'event_time_boot_ms', 'sequence', 'log_levels', 'arguments'];


    this.set(arguments);

}
        mavlink20.messages.event.prototype = new mavlink20.message;
mavlink20.messages.event.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.id, this.event_time_boot_ms, this.sequence, this.destination_component, this.destination_system, this.log_levels, this.arguments]));
}

/* 
Regular broadcast for the current latest event sequence number for a
component. This is used to check for dropped events.

                sequence                  : Sequence number. (uint16_t)
                flags                     : Flag bitset. (uint8_t)

*/
mavlink20.messages.current_event_sequence = function(sequence, flags) {

    this.format = '<HB';
    this.id = mavlink20.MAVLINK_MSG_ID_CURRENT_EVENT_SEQUENCE;
    this.order_map = [0, 1];
    this.crc_extra = 106;
    this.name = 'CURRENT_EVENT_SEQUENCE';

    this.fieldnames = ['sequence', 'flags'];


    this.set(arguments);

}
        mavlink20.messages.current_event_sequence.prototype = new mavlink20.message;
mavlink20.messages.current_event_sequence.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.sequence, this.flags]));
}

/* 
Request one or more events to be (re-)sent. If
first_sequence==last_sequence, only a single event is requested. Note
that first_sequence can be larger than last_sequence (because the
sequence number can wrap). Each sequence will trigger an EVENT or
EVENT_ERROR response.

                target_system             : System ID (uint8_t)
                target_component          : Component ID (uint8_t)
                first_sequence            : First sequence number of the requested event. (uint16_t)
                last_sequence             : Last sequence number of the requested event. (uint16_t)

*/
mavlink20.messages.request_event = function(target_system, target_component, first_sequence, last_sequence) {

    this.format = '<HHBB';
    this.id = mavlink20.MAVLINK_MSG_ID_REQUEST_EVENT;
    this.order_map = [2, 3, 0, 1];
    this.crc_extra = 33;
    this.name = 'REQUEST_EVENT';

    this.fieldnames = ['target_system', 'target_component', 'first_sequence', 'last_sequence'];


    this.set(arguments);

}
        mavlink20.messages.request_event.prototype = new mavlink20.message;
mavlink20.messages.request_event.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.first_sequence, this.last_sequence, this.target_system, this.target_component]));
}

/* 
Response to a REQUEST_EVENT in case of an error (e.g. the event is not
available anymore).

                target_system             : System ID (uint8_t)
                target_component          : Component ID (uint8_t)
                sequence                  : Sequence number. (uint16_t)
                sequence_oldest_available        : Oldest Sequence number that is still available after the sequence set in REQUEST_EVENT. (uint16_t)
                reason                    : Error reason. (uint8_t)

*/
mavlink20.messages.response_event_error = function(target_system, target_component, sequence, sequence_oldest_available, reason) {

    this.format = '<HHBBB';
    this.id = mavlink20.MAVLINK_MSG_ID_RESPONSE_EVENT_ERROR;
    this.order_map = [2, 3, 0, 1, 4];
    this.crc_extra = 77;
    this.name = 'RESPONSE_EVENT_ERROR';

    this.fieldnames = ['target_system', 'target_component', 'sequence', 'sequence_oldest_available', 'reason'];


    this.set(arguments);

}
        mavlink20.messages.response_event_error.prototype = new mavlink20.message;
mavlink20.messages.response_event_error.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.sequence, this.sequence_oldest_available, this.target_system, this.target_component, this.reason]));
}

/* 
Information about a flight mode.          The message can be
enumerated to get information for all modes, or requested for a
particular mode, using MAV_CMD_REQUEST_MESSAGE.         Specify 0 in
param2 to request that the message is emitted for all available modes
or the specific index for just one mode.         The modes must be
available/settable for the current vehicle/frame type.         Each
mode should only be emitted once (even if it is both standard and
custom).         Note that the current mode should be emitted in
CURRENT_MODE, and that if the mode list can change then
AVAILABLE_MODES_MONITOR must be emitted on first change and
subsequently streamed.         See
https://mavlink.io/en/services/standard_modes.html

                number_modes              : The total number of available modes for the current vehicle type. (uint8_t)
                mode_index                : The current mode index within number_modes, indexed from 1. The index is not guaranteed to be persistent, and may change between reboots or if the set of modes change. (uint8_t)
                standard_mode             : Standard mode. (uint8_t)
                custom_mode               : A bitfield for use for autopilot-specific flags (uint32_t)
                properties                : Mode properties. (uint32_t)
                mode_name                 : Name of custom mode, with null termination character. Should be omitted for standard modes. (char)

*/
mavlink20.messages.available_modes = function(number_modes, mode_index, standard_mode, custom_mode, properties, mode_name) {

    this.format = '<IIBBB35s';
    this.id = mavlink20.MAVLINK_MSG_ID_AVAILABLE_MODES;
    this.order_map = [2, 3, 4, 0, 1, 5];
    this.crc_extra = 134;
    this.name = 'AVAILABLE_MODES';

    this.fieldnames = ['number_modes', 'mode_index', 'standard_mode', 'custom_mode', 'properties', 'mode_name'];


    this.set(arguments);

}
        mavlink20.messages.available_modes.prototype = new mavlink20.message;
mavlink20.messages.available_modes.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.custom_mode, this.properties, this.number_modes, this.mode_index, this.standard_mode, this.mode_name]));
}

/* 
Get the current mode.         This should be emitted on any mode
change, and broadcast at low rate (nominally 0.5 Hz).         It may
be requested using MAV_CMD_REQUEST_MESSAGE.         See
https://mavlink.io/en/services/standard_modes.html

                standard_mode             : Standard mode. (uint8_t)
                custom_mode               : A bitfield for use for autopilot-specific flags (uint32_t)
                intended_custom_mode        : The custom_mode of the mode that was last commanded by the user (for example, with MAV_CMD_DO_SET_STANDARD_MODE, MAV_CMD_DO_SET_MODE or via RC). This should usually be the same as custom_mode. It will be different if the vehicle is unable to enter the intended mode, or has left that mode due to a failsafe condition. 0 indicates the intended custom mode is unknown/not supplied (uint32_t)

*/
mavlink20.messages.current_mode = function(standard_mode, custom_mode, intended_custom_mode) {

    this.format = '<IIB';
    this.id = mavlink20.MAVLINK_MSG_ID_CURRENT_MODE;
    this.order_map = [2, 0, 1];
    this.crc_extra = 193;
    this.name = 'CURRENT_MODE';

    this.fieldnames = ['standard_mode', 'custom_mode', 'intended_custom_mode'];


    this.set(arguments);

}
        mavlink20.messages.current_mode.prototype = new mavlink20.message;
mavlink20.messages.current_mode.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.custom_mode, this.intended_custom_mode, this.standard_mode]));
}

/* 
A change to the sequence number indicates that the set of
AVAILABLE_MODES has changed.         A receiver must re-request all
available modes whenever the sequence number changes.         This is
only emitted after the first change and should then be broadcast at
low rate (nominally 0.3 Hz) and on change.         See
https://mavlink.io/en/services/standard_modes.html

                seq                       : Sequence number. The value iterates sequentially whenever AVAILABLE_MODES changes (e.g. support for a new mode is added/removed dynamically). (uint8_t)

*/
mavlink20.messages.available_modes_monitor = function(seq) {

    this.format = '<B';
    this.id = mavlink20.MAVLINK_MSG_ID_AVAILABLE_MODES_MONITOR;
    this.order_map = [0];
    this.crc_extra = 30;
    this.name = 'AVAILABLE_MODES_MONITOR';

    this.fieldnames = ['seq'];


    this.set(arguments);

}
        mavlink20.messages.available_modes_monitor.prototype = new mavlink20.message;
mavlink20.messages.available_modes_monitor.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.seq]));
}

/* 
Illuminator status

                uptime_ms                 : Time since the start-up of the illuminator in ms (uint32_t)
                enable                    : 0: Illuminators OFF, 1: Illuminators ON (uint8_t)
                mode_bitmask              : Supported illuminator modes (uint8_t)
                error_status              : Errors (uint32_t)
                mode                      : Illuminator mode (uint8_t)
                brightness                : Illuminator brightness (float)
                strobe_period             : Illuminator strobing period in seconds (float)
                strobe_duty_cycle         : Illuminator strobing duty cycle (float)
                temp_c                    : Temperature in Celsius (float)
                min_strobe_period         : Minimum strobing period in seconds (float)
                max_strobe_period         : Maximum strobing period in seconds (float)

*/
mavlink20.messages.illuminator_status = function(uptime_ms, enable, mode_bitmask, error_status, mode, brightness, strobe_period, strobe_duty_cycle, temp_c, min_strobe_period, max_strobe_period) {

    this.format = '<IIffffffBBB';
    this.id = mavlink20.MAVLINK_MSG_ID_ILLUMINATOR_STATUS;
    this.order_map = [0, 8, 9, 1, 10, 2, 3, 4, 5, 6, 7];
    this.crc_extra = 66;
    this.name = 'ILLUMINATOR_STATUS';

    this.fieldnames = ['uptime_ms', 'enable', 'mode_bitmask', 'error_status', 'mode', 'brightness', 'strobe_period', 'strobe_duty_cycle', 'temp_c', 'min_strobe_period', 'max_strobe_period'];


    this.set(arguments);

}
        mavlink20.messages.illuminator_status.prototype = new mavlink20.message;
mavlink20.messages.illuminator_status.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.uptime_ms, this.error_status, this.brightness, this.strobe_period, this.strobe_duty_cycle, this.temp_c, this.min_strobe_period, this.max_strobe_period, this.enable, this.mode_bitmask, this.mode]));
}

/* 
A forwarded CANFD frame as requested by MAV_CMD_CAN_FORWARD. These are
separated from CAN_FRAME as they need different handling (eg. TAO
handling)

                target_system             : System ID. (uint8_t)
                target_component          : Component ID. (uint8_t)
                bus                       : bus number (uint8_t)
                len                       : Frame length (uint8_t)
                id                        : Frame ID (uint32_t)
                data                      : Frame data (uint8_t)

*/
mavlink20.messages.canfd_frame = function(target_system, target_component, bus, len, id, data) {

    this.format = '<IBBBB64s';
    this.id = mavlink20.MAVLINK_MSG_ID_CANFD_FRAME;
    this.order_map = [1, 2, 3, 4, 0, 5];
    this.crc_extra = 4;
    this.name = 'CANFD_FRAME';

    this.fieldnames = ['target_system', 'target_component', 'bus', 'len', 'id', 'data'];


    this.set(arguments);

}
        mavlink20.messages.canfd_frame.prototype = new mavlink20.message;
mavlink20.messages.canfd_frame.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.id, this.target_system, this.target_component, this.bus, this.len, this.data]));
}

/* 
Modify the filter of what CAN messages to forward over the mavlink.
This can be used to make CAN forwarding work well on low bandwidth
links. The filtering is applied on bits 8 to 24 of the CAN id (2nd and
3rd bytes) which corresponds to the DroneCAN message ID for DroneCAN.
Filters with more than 16 IDs can be constructed by sending multiple
CAN_FILTER_MODIFY messages.

                target_system             : System ID. (uint8_t)
                target_component          : Component ID. (uint8_t)
                bus                       : bus number (uint8_t)
                operation                 : what operation to perform on the filter list. See CAN_FILTER_OP enum. (uint8_t)
                num_ids                   : number of IDs in filter list (uint8_t)
                ids                       : filter IDs, length num_ids (uint16_t)

*/
mavlink20.messages.can_filter_modify = function(target_system, target_component, bus, operation, num_ids, ids) {

    this.format = '<16HBBBBB';
    this.id = mavlink20.MAVLINK_MSG_ID_CAN_FILTER_MODIFY;
    this.order_map = [1, 2, 3, 4, 5, 0];
    this.crc_extra = 8;
    this.name = 'CAN_FILTER_MODIFY';

    this.fieldnames = ['target_system', 'target_component', 'bus', 'operation', 'num_ids', 'ids'];


    this.set(arguments);

}
        mavlink20.messages.can_filter_modify.prototype = new mavlink20.message;
mavlink20.messages.can_filter_modify.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.ids, this.target_system, this.target_component, this.bus, this.operation, this.num_ids]));
}

/* 
Cumulative distance traveled for each reported wheel.

                time_usec                 : Timestamp (synced to UNIX time or since system boot). (uint64_t)
                count                     : Number of wheels reported. (uint8_t)
                distance                  : Distance reported by individual wheel encoders. Forward rotations increase values, reverse rotations decrease them. Not all wheels will necessarily have wheel encoders; the mapping of encoders to wheel positions must be agreed/understood by the endpoints. (double)

*/
mavlink20.messages.wheel_distance = function(time_usec, count, distance) {

    this.format = '<Q16dB';
    this.id = mavlink20.MAVLINK_MSG_ID_WHEEL_DISTANCE;
    this.order_map = [0, 2, 1];
    this.crc_extra = 113;
    this.name = 'WHEEL_DISTANCE';

    this.fieldnames = ['time_usec', 'count', 'distance'];


    this.set(arguments);

}
        mavlink20.messages.wheel_distance.prototype = new mavlink20.message;
mavlink20.messages.wheel_distance.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.time_usec, this.distance, this.count]));
}

/* 
Winch status.

                time_usec                 : Timestamp (synced to UNIX time or since system boot). (uint64_t)
                line_length               : Length of line released. NaN if unknown (float)
                speed                     : Speed line is being released or retracted. Positive values if being released, negative values if being retracted, NaN if unknown (float)
                tension                   : Tension on the line. NaN if unknown (float)
                voltage                   : Voltage of the battery supplying the winch. NaN if unknown (float)
                current                   : Current draw from the winch. NaN if unknown (float)
                temperature               : Temperature of the motor. INT16_MAX if unknown (int16_t)
                status                    : Status flags (uint32_t)

*/
mavlink20.messages.winch_status = function(time_usec, line_length, speed, tension, voltage, current, temperature, status) {

    this.format = '<QfffffIh';
    this.id = mavlink20.MAVLINK_MSG_ID_WINCH_STATUS;
    this.order_map = [0, 1, 2, 3, 4, 5, 7, 6];
    this.crc_extra = 117;
    this.name = 'WINCH_STATUS';

    this.fieldnames = ['time_usec', 'line_length', 'speed', 'tension', 'voltage', 'current', 'temperature', 'status'];


    this.set(arguments);

}
        mavlink20.messages.winch_status.prototype = new mavlink20.message;
mavlink20.messages.winch_status.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.time_usec, this.line_length, this.speed, this.tension, this.voltage, this.current, this.status, this.temperature]));
}

/* 
Data for filling the OpenDroneID Basic ID message. This and the below
messages are primarily meant for feeding data to/from an OpenDroneID
implementation. E.g. https://github.com/opendroneid/opendroneid-
core-c. These messages are compatible with the ASTM F3411 Remote ID
standard and the ASD-STAN prEN 4709-002 Direct Remote ID standard.
Additional information and usage of these messages is documented at
https://mavlink.io/en/services/opendroneid.html.

                target_system             : System ID (0 for broadcast). (uint8_t)
                target_component          : Component ID (0 for broadcast). (uint8_t)
                id_or_mac                 : Only used for drone ID data received from other UAs. See detailed description at https://mavlink.io/en/services/opendroneid.html. (uint8_t)
                id_type                   : Indicates the format for the uas_id field of this message. (uint8_t)
                ua_type                   : Indicates the type of UA (Unmanned Aircraft). (uint8_t)
                uas_id                    : UAS (Unmanned Aircraft System) ID following the format specified by id_type. Shall be filled with nulls in the unused portion of the field. (uint8_t)

*/
mavlink20.messages.open_drone_id_basic_id = function(target_system, target_component, id_or_mac, id_type, ua_type, uas_id) {

    this.format = '<BB20sBB20s';
    this.id = mavlink20.MAVLINK_MSG_ID_OPEN_DRONE_ID_BASIC_ID;
    this.order_map = [0, 1, 2, 3, 4, 5];
    this.crc_extra = 114;
    this.name = 'OPEN_DRONE_ID_BASIC_ID';

    this.fieldnames = ['target_system', 'target_component', 'id_or_mac', 'id_type', 'ua_type', 'uas_id'];


    this.set(arguments);

}
        mavlink20.messages.open_drone_id_basic_id.prototype = new mavlink20.message;
mavlink20.messages.open_drone_id_basic_id.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.target_system, this.target_component, this.id_or_mac, this.id_type, this.ua_type, this.uas_id]));
}

/* 
Data for filling the OpenDroneID Location message. The float data
types are 32-bit IEEE 754. The Location message provides the location,
altitude, direction and speed of the aircraft.

                target_system             : System ID (0 for broadcast). (uint8_t)
                target_component          : Component ID (0 for broadcast). (uint8_t)
                id_or_mac                 : Only used for drone ID data received from other UAs. See detailed description at https://mavlink.io/en/services/opendroneid.html. (uint8_t)
                status                    : Indicates whether the unmanned aircraft is on the ground or in the air. (uint8_t)
                direction                 : Direction over ground (not heading, but direction of movement) measured clockwise from true North: 0 - 35999 centi-degrees. If unknown: 36100 centi-degrees. (uint16_t)
                speed_horizontal          : Ground speed. Positive only. If unknown: 25500 cm/s. If speed is larger than 25425 cm/s, use 25425 cm/s. (uint16_t)
                speed_vertical            : The vertical speed. Up is positive. If unknown: 6300 cm/s. If speed is larger than 6200 cm/s, use 6200 cm/s. If lower than -6200 cm/s, use -6200 cm/s. (int16_t)
                latitude                  : Current latitude of the unmanned aircraft. If unknown: 0 (both Lat/Lon). (int32_t)
                longitude                 : Current longitude of the unmanned aircraft. If unknown: 0 (both Lat/Lon). (int32_t)
                altitude_barometric        : The altitude calculated from the barometric pressure. Reference is against 29.92inHg or 1013.2mb. If unknown: -1000 m. (float)
                altitude_geodetic         : The geodetic altitude as defined by WGS84. If unknown: -1000 m. (float)
                height_reference          : Indicates the reference point for the height field. (uint8_t)
                height                    : The current height of the unmanned aircraft above the take-off location or the ground as indicated by height_reference. If unknown: -1000 m. (float)
                horizontal_accuracy        : The accuracy of the horizontal position. (uint8_t)
                vertical_accuracy         : The accuracy of the vertical position. (uint8_t)
                barometer_accuracy        : The accuracy of the barometric altitude. (uint8_t)
                speed_accuracy            : The accuracy of the horizontal and vertical speed. (uint8_t)
                timestamp                 : Seconds after the full hour with reference to UTC time. Typically the GPS outputs a time-of-week value in milliseconds. First convert that to UTC and then convert for this field using ((float) (time_week_ms % (60*60*1000))) / 1000. If unknown: 0xFFFF. (float)
                timestamp_accuracy        : The accuracy of the timestamps. (uint8_t)

*/
mavlink20.messages.open_drone_id_location = function(target_system, target_component, id_or_mac, status, direction, speed_horizontal, speed_vertical, latitude, longitude, altitude_barometric, altitude_geodetic, height_reference, height, horizontal_accuracy, vertical_accuracy, barometer_accuracy, speed_accuracy, timestamp, timestamp_accuracy) {

    this.format = '<iiffffHHhBB20sBBBBBBB';
    this.id = mavlink20.MAVLINK_MSG_ID_OPEN_DRONE_ID_LOCATION;
    this.order_map = [9, 10, 11, 12, 6, 7, 8, 0, 1, 2, 3, 13, 4, 14, 15, 16, 17, 5, 18];
    this.crc_extra = 254;
    this.name = 'OPEN_DRONE_ID_LOCATION';

    this.fieldnames = ['target_system', 'target_component', 'id_or_mac', 'status', 'direction', 'speed_horizontal', 'speed_vertical', 'latitude', 'longitude', 'altitude_barometric', 'altitude_geodetic', 'height_reference', 'height', 'horizontal_accuracy', 'vertical_accuracy', 'barometer_accuracy', 'speed_accuracy', 'timestamp', 'timestamp_accuracy'];


    this.set(arguments);

}
        mavlink20.messages.open_drone_id_location.prototype = new mavlink20.message;
mavlink20.messages.open_drone_id_location.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.latitude, this.longitude, this.altitude_barometric, this.altitude_geodetic, this.height, this.timestamp, this.direction, this.speed_horizontal, this.speed_vertical, this.target_system, this.target_component, this.id_or_mac, this.status, this.height_reference, this.horizontal_accuracy, this.vertical_accuracy, this.barometer_accuracy, this.speed_accuracy, this.timestamp_accuracy]));
}

/* 
Data for filling the OpenDroneID Authentication message. The
Authentication Message defines a field that can provide a means of
authenticity for the identity of the UAS (Unmanned Aircraft System).
The Authentication message can have two different formats. For data
page 0, the fields PageCount, Length and TimeStamp are present and
AuthData is only 17 bytes. For data page 1 through 15, PageCount,
Length and TimeStamp are not present and the size of AuthData is 23
bytes.

                target_system             : System ID (0 for broadcast). (uint8_t)
                target_component          : Component ID (0 for broadcast). (uint8_t)
                id_or_mac                 : Only used for drone ID data received from other UAs. See detailed description at https://mavlink.io/en/services/opendroneid.html. (uint8_t)
                authentication_type        : Indicates the type of authentication. (uint8_t)
                data_page                 : Allowed range is 0 - 15. (uint8_t)
                last_page_index           : This field is only present for page 0. Allowed range is 0 - 15. See the description of struct ODID_Auth_data at https://github.com/opendroneid/opendroneid-core-c/blob/master/libopendroneid/opendroneid.h. (uint8_t)
                length                    : This field is only present for page 0. Total bytes of authentication_data from all data pages. See the description of struct ODID_Auth_data at https://github.com/opendroneid/opendroneid-core-c/blob/master/libopendroneid/opendroneid.h. (uint8_t)
                timestamp                 : This field is only present for page 0. 32 bit Unix Timestamp in seconds since 00:00:00 01/01/2019. (uint32_t)
                authentication_data        : Opaque authentication data. For page 0, the size is only 17 bytes. For other pages, the size is 23 bytes. Shall be filled with nulls in the unused portion of the field. (uint8_t)

*/
mavlink20.messages.open_drone_id_authentication = function(target_system, target_component, id_or_mac, authentication_type, data_page, last_page_index, length, timestamp, authentication_data) {

    this.format = '<IBB20sBBBB23s';
    this.id = mavlink20.MAVLINK_MSG_ID_OPEN_DRONE_ID_AUTHENTICATION;
    this.order_map = [1, 2, 3, 4, 5, 6, 7, 0, 8];
    this.crc_extra = 140;
    this.name = 'OPEN_DRONE_ID_AUTHENTICATION';

    this.fieldnames = ['target_system', 'target_component', 'id_or_mac', 'authentication_type', 'data_page', 'last_page_index', 'length', 'timestamp', 'authentication_data'];


    this.set(arguments);

}
        mavlink20.messages.open_drone_id_authentication.prototype = new mavlink20.message;
mavlink20.messages.open_drone_id_authentication.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.timestamp, this.target_system, this.target_component, this.id_or_mac, this.authentication_type, this.data_page, this.last_page_index, this.length, this.authentication_data]));
}

/* 
Data for filling the OpenDroneID Self ID message. The Self ID Message
is an opportunity for the operator to (optionally) declare their
identity and purpose of the flight. This message can provide
additional information that could reduce the threat profile of a UA
(Unmanned Aircraft) flying in a particular area or manner. This
message can also be used to provide optional additional clarification
in an emergency/remote ID system failure situation.

                target_system             : System ID (0 for broadcast). (uint8_t)
                target_component          : Component ID (0 for broadcast). (uint8_t)
                id_or_mac                 : Only used for drone ID data received from other UAs. See detailed description at https://mavlink.io/en/services/opendroneid.html. (uint8_t)
                description_type          : Indicates the type of the description field. (uint8_t)
                description               : Text description or numeric value expressed as ASCII characters. Shall be filled with nulls in the unused portion of the field. (char)

*/
mavlink20.messages.open_drone_id_self_id = function(target_system, target_component, id_or_mac, description_type, description) {

    this.format = '<BB20sB23s';
    this.id = mavlink20.MAVLINK_MSG_ID_OPEN_DRONE_ID_SELF_ID;
    this.order_map = [0, 1, 2, 3, 4];
    this.crc_extra = 249;
    this.name = 'OPEN_DRONE_ID_SELF_ID';

    this.fieldnames = ['target_system', 'target_component', 'id_or_mac', 'description_type', 'description'];


    this.set(arguments);

}
        mavlink20.messages.open_drone_id_self_id.prototype = new mavlink20.message;
mavlink20.messages.open_drone_id_self_id.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.target_system, this.target_component, this.id_or_mac, this.description_type, this.description]));
}

/* 
Data for filling the OpenDroneID System message. The System Message
contains general system information including the operator
location/altitude and possible aircraft group and/or category/class
information.

                target_system             : System ID (0 for broadcast). (uint8_t)
                target_component          : Component ID (0 for broadcast). (uint8_t)
                id_or_mac                 : Only used for drone ID data received from other UAs. See detailed description at https://mavlink.io/en/services/opendroneid.html. (uint8_t)
                operator_location_type        : Specifies the operator location type. (uint8_t)
                classification_type        : Specifies the classification type of the UA. (uint8_t)
                operator_latitude         : Latitude of the operator. If unknown: 0 (both Lat/Lon). (int32_t)
                operator_longitude        : Longitude of the operator. If unknown: 0 (both Lat/Lon). (int32_t)
                area_count                : Number of aircraft in the area, group or formation (default 1). Used only for swarms/multiple UA. (uint16_t)
                area_radius               : Radius of the cylindrical area of the group or formation (default 0). Used only for swarms/multiple UA. (uint16_t)
                area_ceiling              : Area Operations Ceiling relative to WGS84. If unknown: -1000 m. Used only for swarms/multiple UA. (float)
                area_floor                : Area Operations Floor relative to WGS84. If unknown: -1000 m. Used only for swarms/multiple UA. (float)
                category_eu               : When classification_type is MAV_ODID_CLASSIFICATION_TYPE_EU, specifies the category of the UA. (uint8_t)
                class_eu                  : When classification_type is MAV_ODID_CLASSIFICATION_TYPE_EU, specifies the class of the UA. (uint8_t)
                operator_altitude_geo        : Geodetic altitude of the operator relative to WGS84. If unknown: -1000 m. (float)
                timestamp                 : 32 bit Unix Timestamp in seconds since 00:00:00 01/01/2019. (uint32_t)

*/
mavlink20.messages.open_drone_id_system = function(target_system, target_component, id_or_mac, operator_location_type, classification_type, operator_latitude, operator_longitude, area_count, area_radius, area_ceiling, area_floor, category_eu, class_eu, operator_altitude_geo, timestamp) {

    this.format = '<iifffIHHBB20sBBBB';
    this.id = mavlink20.MAVLINK_MSG_ID_OPEN_DRONE_ID_SYSTEM;
    this.order_map = [8, 9, 10, 11, 12, 0, 1, 6, 7, 2, 3, 13, 14, 4, 5];
    this.crc_extra = 77;
    this.name = 'OPEN_DRONE_ID_SYSTEM';

    this.fieldnames = ['target_system', 'target_component', 'id_or_mac', 'operator_location_type', 'classification_type', 'operator_latitude', 'operator_longitude', 'area_count', 'area_radius', 'area_ceiling', 'area_floor', 'category_eu', 'class_eu', 'operator_altitude_geo', 'timestamp'];


    this.set(arguments);

}
        mavlink20.messages.open_drone_id_system.prototype = new mavlink20.message;
mavlink20.messages.open_drone_id_system.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.operator_latitude, this.operator_longitude, this.area_ceiling, this.area_floor, this.operator_altitude_geo, this.timestamp, this.area_count, this.area_radius, this.target_system, this.target_component, this.id_or_mac, this.operator_location_type, this.classification_type, this.category_eu, this.class_eu]));
}

/* 
Data for filling the OpenDroneID Operator ID message, which contains
the CAA (Civil Aviation Authority) issued operator ID.

                target_system             : System ID (0 for broadcast). (uint8_t)
                target_component          : Component ID (0 for broadcast). (uint8_t)
                id_or_mac                 : Only used for drone ID data received from other UAs. See detailed description at https://mavlink.io/en/services/opendroneid.html. (uint8_t)
                operator_id_type          : Indicates the type of the operator_id field. (uint8_t)
                operator_id               : Text description or numeric value expressed as ASCII characters. Shall be filled with nulls in the unused portion of the field. (char)

*/
mavlink20.messages.open_drone_id_operator_id = function(target_system, target_component, id_or_mac, operator_id_type, operator_id) {

    this.format = '<BB20sB20s';
    this.id = mavlink20.MAVLINK_MSG_ID_OPEN_DRONE_ID_OPERATOR_ID;
    this.order_map = [0, 1, 2, 3, 4];
    this.crc_extra = 49;
    this.name = 'OPEN_DRONE_ID_OPERATOR_ID';

    this.fieldnames = ['target_system', 'target_component', 'id_or_mac', 'operator_id_type', 'operator_id'];


    this.set(arguments);

}
        mavlink20.messages.open_drone_id_operator_id.prototype = new mavlink20.message;
mavlink20.messages.open_drone_id_operator_id.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.target_system, this.target_component, this.id_or_mac, this.operator_id_type, this.operator_id]));
}

/* 
An OpenDroneID message pack is a container for multiple encoded
OpenDroneID messages (i.e. not in the format given for the above
message descriptions but after encoding into the compressed
OpenDroneID byte format). Used e.g. when transmitting on Bluetooth 5.0
Long Range/Extended Advertising or on WiFi Neighbor Aware Networking
or on WiFi Beacon.

                target_system             : System ID (0 for broadcast). (uint8_t)
                target_component          : Component ID (0 for broadcast). (uint8_t)
                id_or_mac                 : Only used for drone ID data received from other UAs. See detailed description at https://mavlink.io/en/services/opendroneid.html. (uint8_t)
                single_message_size        : This field must currently always be equal to 25 (bytes), since all encoded OpenDroneID messages are specified to have this length. (uint8_t)
                msg_pack_size             : Number of encoded messages in the pack (not the number of bytes). Allowed range is 1 - 9. (uint8_t)
                messages                  : Concatenation of encoded OpenDroneID messages. Shall be filled with nulls in the unused portion of the field. (uint8_t)

*/
mavlink20.messages.open_drone_id_message_pack = function(target_system, target_component, id_or_mac, single_message_size, msg_pack_size, messages) {

    this.format = '<BB20sBB225s';
    this.id = mavlink20.MAVLINK_MSG_ID_OPEN_DRONE_ID_MESSAGE_PACK;
    this.order_map = [0, 1, 2, 3, 4, 5];
    this.crc_extra = 94;
    this.name = 'OPEN_DRONE_ID_MESSAGE_PACK';

    this.fieldnames = ['target_system', 'target_component', 'id_or_mac', 'single_message_size', 'msg_pack_size', 'messages'];


    this.set(arguments);

}
        mavlink20.messages.open_drone_id_message_pack.prototype = new mavlink20.message;
mavlink20.messages.open_drone_id_message_pack.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.target_system, this.target_component, this.id_or_mac, this.single_message_size, this.msg_pack_size, this.messages]));
}

/* 
Transmitter (remote ID system) is enabled and ready to start sending
location and other required information. This is streamed by
transmitter. A flight controller uses it as a condition to arm.

                status                    : Status level indicating if arming is allowed. (uint8_t)
                error                     : Text error message, should be empty if status is good to arm. Fill with nulls in unused portion. (char)

*/
mavlink20.messages.open_drone_id_arm_status = function(status, error) {

    this.format = '<B50s';
    this.id = mavlink20.MAVLINK_MSG_ID_OPEN_DRONE_ID_ARM_STATUS;
    this.order_map = [0, 1];
    this.crc_extra = 139;
    this.name = 'OPEN_DRONE_ID_ARM_STATUS';

    this.fieldnames = ['status', 'error'];


    this.set(arguments);

}
        mavlink20.messages.open_drone_id_arm_status.prototype = new mavlink20.message;
mavlink20.messages.open_drone_id_arm_status.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.status, this.error]));
}

/* 
Update the data in the OPEN_DRONE_ID_SYSTEM message with new location
information. This can be sent to update the location information for
the operator when no other information in the SYSTEM message has
changed. This message allows for efficient operation on radio links
which have limited uplink bandwidth while meeting requirements for
update frequency of the operator location.

                target_system             : System ID (0 for broadcast). (uint8_t)
                target_component          : Component ID (0 for broadcast). (uint8_t)
                operator_latitude         : Latitude of the operator. If unknown: 0 (both Lat/Lon). (int32_t)
                operator_longitude        : Longitude of the operator. If unknown: 0 (both Lat/Lon). (int32_t)
                operator_altitude_geo        : Geodetic altitude of the operator relative to WGS84. If unknown: -1000 m. (float)
                timestamp                 : 32 bit Unix Timestamp in seconds since 00:00:00 01/01/2019. (uint32_t)

*/
mavlink20.messages.open_drone_id_system_update = function(target_system, target_component, operator_latitude, operator_longitude, operator_altitude_geo, timestamp) {

    this.format = '<iifIBB';
    this.id = mavlink20.MAVLINK_MSG_ID_OPEN_DRONE_ID_SYSTEM_UPDATE;
    this.order_map = [4, 5, 0, 1, 2, 3];
    this.crc_extra = 7;
    this.name = 'OPEN_DRONE_ID_SYSTEM_UPDATE';

    this.fieldnames = ['target_system', 'target_component', 'operator_latitude', 'operator_longitude', 'operator_altitude_geo', 'timestamp'];


    this.set(arguments);

}
        mavlink20.messages.open_drone_id_system_update.prototype = new mavlink20.message;
mavlink20.messages.open_drone_id_system_update.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.operator_latitude, this.operator_longitude, this.operator_altitude_geo, this.timestamp, this.target_system, this.target_component]));
}

/* 
Temperature and humidity from hygrometer.

                id                        : Hygrometer ID (uint8_t)
                temperature               : Temperature (int16_t)
                humidity                  : Humidity (uint16_t)

*/
mavlink20.messages.hygrometer_sensor = function(id, temperature, humidity) {

    this.format = '<hHB';
    this.id = mavlink20.MAVLINK_MSG_ID_HYGROMETER_SENSOR;
    this.order_map = [2, 0, 1];
    this.crc_extra = 20;
    this.name = 'HYGROMETER_SENSOR';

    this.fieldnames = ['id', 'temperature', 'humidity'];


    this.set(arguments);

}
        mavlink20.messages.hygrometer_sensor.prototype = new mavlink20.message;
mavlink20.messages.hygrometer_sensor.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.temperature, this.humidity, this.id]));
}

/* 
The filtered global position (e.g. fused GPS and accelerometers). The
position is in GPS-frame (right-handed, Z-up). It is designed as
scaled integer message since the resolution of float is not
sufficient.

                time_boot_ms              : Timestamp (time since system boot). (uint32_t)
                lat                       : Latitude, expressed (int32_t)
                lon                       : Longitude, expressed (int32_t)
                alt                       : Altitude (MSL). Note that virtually all GPS modules provide both WGS84 and MSL. (int32_t)
                relative_alt              : Altitude above home (int32_t)
                vx                        : Ground X Speed (Latitude, positive north) (int16_t)
                vy                        : Ground Y Speed (Longitude, positive east) (int16_t)
                vz                        : Ground Z Speed (Altitude, positive down) (int16_t)
                hdg                       : Vehicle heading (yaw angle), 0.0..359.99 degrees. If unknown, set to: UINT16_MAX (uint16_t)

*/
mavlink20.messages.global_position_int = function(time_boot_ms, lat, lon, alt, relative_alt, vx, vy, vz, hdg) {

    this.format = '<IiiiihhhH';
    this.id = mavlink20.MAVLINK_MSG_ID_GLOBAL_POSITION_INT;
    this.order_map = [0, 1, 2, 3, 4, 5, 6, 7, 8];
    this.crc_extra = 104;
    this.name = 'GLOBAL_POSITION_INT';

    this.fieldnames = ['time_boot_ms', 'lat', 'lon', 'alt', 'relative_alt', 'vx', 'vy', 'vz', 'hdg'];


    this.set(arguments);

}
        mavlink20.messages.global_position_int.prototype = new mavlink20.message;
mavlink20.messages.global_position_int.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.time_boot_ms, this.lat, this.lon, this.alt, this.relative_alt, this.vx, this.vy, this.vz, this.hdg]));
}

/* 
Version and capability of autopilot software. This should be emitted
in response to a request with MAV_CMD_REQUEST_MESSAGE.

                capabilities              : Bitmap of capabilities (uint64_t)
                flight_sw_version         : Firmware version number.
        The field must be encoded as 4 bytes, where each byte (shown from MSB to LSB) is part of a semantic version: (major) (minor) (patch) (FIRMWARE_VERSION_TYPE). (uint32_t)
                middleware_sw_version        : Middleware version number (uint32_t)
                os_sw_version             : Operating system version number (uint32_t)
                board_version             : HW / board version (last 8 bits should be silicon ID, if any). The first 16 bits of this field specify a board type from an enumeration stored at https://github.com/PX4/PX4-Bootloader/blob/master/board_types.txt and with extensive additions at https://github.com/ArduPilot/ardupilot/blob/master/Tools/AP_Bootloader/board_types.txt (uint32_t)
                flight_custom_version        : Custom version field, commonly the first 8 bytes of the git hash. This is not an unique identifier, but should allow to identify the commit using the main version number even for very large code bases. (uint8_t)
                middleware_custom_version        : Custom version field, commonly the first 8 bytes of the git hash. This is not an unique identifier, but should allow to identify the commit using the main version number even for very large code bases. (uint8_t)
                os_custom_version         : Custom version field, commonly the first 8 bytes of the git hash. This is not an unique identifier, but should allow to identify the commit using the main version number even for very large code bases. (uint8_t)
                vendor_id                 : ID of the board vendor (uint16_t)
                product_id                : ID of the product (uint16_t)
                uid                       : UID if provided by hardware (see uid2) (uint64_t)
                uid2                      : UID if provided by hardware (supersedes the uid field. If this is non-zero, use this field, otherwise use uid) (uint8_t)

*/
mavlink20.messages.autopilot_version = function(capabilities, flight_sw_version, middleware_sw_version, os_sw_version, board_version, flight_custom_version, middleware_custom_version, os_custom_version, vendor_id, product_id, uid, uid2) {

    this.format = '<QQIIIIHH8s8s8s18s';
    this.id = mavlink20.MAVLINK_MSG_ID_AUTOPILOT_VERSION;
    this.order_map = [0, 2, 3, 4, 5, 8, 9, 10, 6, 7, 1, 11];
    this.crc_extra = 178;
    this.name = 'AUTOPILOT_VERSION';

    this.fieldnames = ['capabilities', 'flight_sw_version', 'middleware_sw_version', 'os_sw_version', 'board_version', 'flight_custom_version', 'middleware_custom_version', 'os_custom_version', 'vendor_id', 'product_id', 'uid', 'uid2'];


    this.set(arguments);

}
        mavlink20.messages.autopilot_version.prototype = new mavlink20.message;
mavlink20.messages.autopilot_version.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.capabilities, this.uid, this.flight_sw_version, this.middleware_sw_version, this.os_sw_version, this.board_version, this.vendor_id, this.product_id, this.flight_custom_version, this.middleware_custom_version, this.os_custom_version, this.uid2]));
}

/* 
The heartbeat message shows that a system or component is present and
responding. The type and autopilot fields (along with the message
component id), allow the receiving system to treat further messages
from this system appropriately (e.g. by laying out the user interface
based on the autopilot). This microservice is documented at
https://mavlink.io/en/services/heartbeat.html

                type                      : Vehicle or component type. For a flight controller component the vehicle type (quadrotor, helicopter, etc.). For other components the component type (e.g. camera, gimbal, etc.). This should be used in preference to component id for identifying the component type. (uint8_t)
                autopilot                 : Autopilot type / class. Use MAV_AUTOPILOT_INVALID for components that are not flight controllers. (uint8_t)
                base_mode                 : System mode bitmap. (uint8_t)
                custom_mode               : A bitfield for use for autopilot-specific flags (uint32_t)
                system_status             : System status flag. (uint8_t)
                mavlink_version           : MAVLink version, not writable by user, gets added by protocol because of magic data type: uint8_t_mavlink_version (uint8_t)

*/
mavlink20.messages.heartbeat = function(type, autopilot, base_mode, custom_mode, system_status, mavlink_version) {

    this.format = '<IBBBBB';
    this.id = mavlink20.MAVLINK_MSG_ID_HEARTBEAT;
    this.order_map = [1, 2, 3, 0, 4, 5];
    this.crc_extra = 50;
    this.name = 'HEARTBEAT';

    this.fieldnames = ['type', 'autopilot', 'base_mode', 'custom_mode', 'system_status', 'mavlink_version'];


    this.set(arguments);

}
        mavlink20.messages.heartbeat.prototype = new mavlink20.message;
mavlink20.messages.heartbeat.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.custom_mode, this.type, this.autopilot, this.base_mode, this.system_status, this.mavlink_version]));
}

/* 
Version and capability of protocol version. This message can be
requested with MAV_CMD_REQUEST_MESSAGE and is used as part of the
handshaking to establish which MAVLink version should be used on the
network. Every node should respond to a request for PROTOCOL_VERSION
to enable the handshaking. Library implementers should consider adding
this into the default decoding state machine to allow the protocol
core to respond directly.

                version                   : Currently active MAVLink version number * 100: v1.0 is 100, v2.0 is 200, etc. (uint16_t)
                min_version               : Minimum MAVLink version supported (uint16_t)
                max_version               : Maximum MAVLink version supported (set to the same value as version by default) (uint16_t)
                spec_version_hash         : The first 8 bytes (not characters printed in hex!) of the git hash. (uint8_t)
                library_version_hash        : The first 8 bytes (not characters printed in hex!) of the git hash. (uint8_t)

*/
mavlink20.messages.protocol_version = function(version, min_version, max_version, spec_version_hash, library_version_hash) {

    this.format = '<HHH8s8s';
    this.id = mavlink20.MAVLINK_MSG_ID_PROTOCOL_VERSION;
    this.order_map = [0, 1, 2, 3, 4];
    this.crc_extra = 217;
    this.name = 'PROTOCOL_VERSION';

    this.fieldnames = ['version', 'min_version', 'max_version', 'spec_version_hash', 'library_version_hash'];


    this.set(arguments);

}
        mavlink20.messages.protocol_version.prototype = new mavlink20.message;
mavlink20.messages.protocol_version.prototype.pack = function(mav) {
    return mavlink20.message.prototype.pack.call(this, mav, this.crc_extra, jspack.Pack(this.format, [ this.version, this.min_version, this.max_version, this.spec_version_hash, this.library_version_hash]));
}


mavlink20.map = {
        1: { format: '<IIIHHhHHHHHHbIII', type: mavlink20.messages.sys_status, order_map: [0, 1, 2, 3, 4, 5, 12, 6, 7, 8, 9, 10, 11, 13, 14, 15], crc_extra: 124 },
        2: { format: '<QI', type: mavlink20.messages.system_time, order_map: [0, 1], crc_extra: 137 },
        4: { format: '<QIBB', type: mavlink20.messages.ping, order_map: [0, 1, 2, 3], crc_extra: 237 },
        5: { format: '<BBB25s', type: mavlink20.messages.change_operator_control, order_map: [0, 1, 2, 3], crc_extra: 217 },
        6: { format: '<BBB', type: mavlink20.messages.change_operator_control_ack, order_map: [0, 1, 2], crc_extra: 104 },
        7: { format: '<32s', type: mavlink20.messages.auth_key, order_map: [0], crc_extra: 119 },
        8: { format: '<QIIIIIHHHBB', type: mavlink20.messages.link_node_status, order_map: [0, 9, 10, 1, 2, 6, 7, 8, 3, 4, 5], crc_extra: 117 },
        11: { format: '<IBB', type: mavlink20.messages.set_mode, order_map: [1, 2, 0], crc_extra: 89 },
        20: { format: '<hBB16s', type: mavlink20.messages.param_request_read, order_map: [1, 2, 3, 0], crc_extra: 214 },
        21: { format: '<BB', type: mavlink20.messages.param_request_list, order_map: [0, 1], crc_extra: 159 },
        22: { format: '<fHH16sB', type: mavlink20.messages.param_value, order_map: [3, 0, 4, 1, 2], crc_extra: 220 },
        23: { format: '<fBB16sB', type: mavlink20.messages.param_set, order_map: [1, 2, 3, 0, 4], crc_extra: 168 },
        24: { format: '<QiiiHHHHBBiIIIIH', type: mavlink20.messages.gps_raw_int, order_map: [0, 8, 1, 2, 3, 4, 5, 6, 7, 9, 10, 11, 12, 13, 14, 15], crc_extra: 24 },
        25: { format: '<B20s20s20s20s20s', type: mavlink20.messages.gps_status, order_map: [0, 1, 2, 3, 4, 5], crc_extra: 23 },
        26: { format: '<Ihhhhhhhhhh', type: mavlink20.messages.scaled_imu, order_map: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10], crc_extra: 170 },
        27: { format: '<QhhhhhhhhhBh', type: mavlink20.messages.raw_imu, order_map: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], crc_extra: 144 },
        28: { format: '<Qhhhh', type: mavlink20.messages.raw_pressure, order_map: [0, 1, 2, 3, 4], crc_extra: 67 },
        29: { format: '<Iffhh', type: mavlink20.messages.scaled_pressure, order_map: [0, 1, 2, 3, 4], crc_extra: 115 },
        30: { format: '<Iffffff', type: mavlink20.messages.attitude, order_map: [0, 1, 2, 3, 4, 5, 6], crc_extra: 39 },
        31: { format: '<Ifffffff4f', type: mavlink20.messages.attitude_quaternion, order_map: [0, 1, 2, 3, 4, 5, 6, 7, 8], crc_extra: 246 },
        32: { format: '<Iffffff', type: mavlink20.messages.local_position_ned, order_map: [0, 1, 2, 3, 4, 5, 6], crc_extra: 185 },
        34: { format: '<IhhhhhhhhBB', type: mavlink20.messages.rc_channels_scaled, order_map: [0, 9, 1, 2, 3, 4, 5, 6, 7, 8, 10], crc_extra: 237 },
        35: { format: '<IHHHHHHHHBB', type: mavlink20.messages.rc_channels_raw, order_map: [0, 9, 1, 2, 3, 4, 5, 6, 7, 8, 10], crc_extra: 244 },
        36: { format: '<IHHHHHHHHBHHHHHHHH', type: mavlink20.messages.servo_output_raw, order_map: [0, 9, 1, 2, 3, 4, 5, 6, 7, 8, 10, 11, 12, 13, 14, 15, 16, 17], crc_extra: 222 },
        37: { format: '<hhBBB', type: mavlink20.messages.mission_request_partial_list, order_map: [2, 3, 0, 1, 4], crc_extra: 212 },
        38: { format: '<hhBBB', type: mavlink20.messages.mission_write_partial_list, order_map: [2, 3, 0, 1, 4], crc_extra: 9 },
        39: { format: '<fffffffHHBBBBBB', type: mavlink20.messages.mission_item, order_map: [9, 10, 7, 11, 8, 12, 13, 0, 1, 2, 3, 4, 5, 6, 14], crc_extra: 254 },
        40: { format: '<HBBB', type: mavlink20.messages.mission_request, order_map: [1, 2, 0, 3], crc_extra: 230 },
        41: { format: '<HBB', type: mavlink20.messages.mission_set_current, order_map: [1, 2, 0], crc_extra: 28 },
        42: { format: '<HHBBIII', type: mavlink20.messages.mission_current, order_map: [0, 1, 2, 3, 4, 5, 6], crc_extra: 28 },
        43: { format: '<BBB', type: mavlink20.messages.mission_request_list, order_map: [0, 1, 2], crc_extra: 132 },
        44: { format: '<HBBBI', type: mavlink20.messages.mission_count, order_map: [1, 2, 0, 3, 4], crc_extra: 221 },
        45: { format: '<BBB', type: mavlink20.messages.mission_clear_all, order_map: [0, 1, 2], crc_extra: 232 },
        46: { format: '<H', type: mavlink20.messages.mission_item_reached, order_map: [0], crc_extra: 11 },
        47: { format: '<BBBBI', type: mavlink20.messages.mission_ack, order_map: [0, 1, 2, 3, 4], crc_extra: 153 },
        48: { format: '<iiiBQ', type: mavlink20.messages.set_gps_global_origin, order_map: [3, 0, 1, 2, 4], crc_extra: 41 },
        49: { format: '<iiiQ', type: mavlink20.messages.gps_global_origin, order_map: [0, 1, 2, 3], crc_extra: 39 },
        50: { format: '<ffffhBB16sB', type: mavlink20.messages.param_map_rc, order_map: [5, 6, 7, 4, 8, 0, 1, 2, 3], crc_extra: 78 },
        51: { format: '<HBBB', type: mavlink20.messages.mission_request_int, order_map: [1, 2, 0, 3], crc_extra: 196 },
        54: { format: '<ffffffBBB', type: mavlink20.messages.safety_set_allowed_area, order_map: [6, 7, 8, 0, 1, 2, 3, 4, 5], crc_extra: 15 },
        55: { format: '<ffffffB', type: mavlink20.messages.safety_allowed_area, order_map: [6, 0, 1, 2, 3, 4, 5], crc_extra: 3 },
        61: { format: '<Q4ffff9f', type: mavlink20.messages.attitude_quaternion_cov, order_map: [0, 1, 2, 3, 4, 5], crc_extra: 167 },
        62: { format: '<fffffhhH', type: mavlink20.messages.nav_controller_output, order_map: [0, 1, 5, 6, 7, 2, 3, 4], crc_extra: 183 },
        63: { format: '<Qiiiifff36fB', type: mavlink20.messages.global_position_int_cov, order_map: [0, 9, 1, 2, 3, 4, 5, 6, 7, 8], crc_extra: 119 },
        64: { format: '<Qfffffffff45fB', type: mavlink20.messages.local_position_ned_cov, order_map: [0, 11, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10], crc_extra: 191 },
        65: { format: '<IHHHHHHHHHHHHHHHHHHBB', type: mavlink20.messages.rc_channels, order_map: [0, 19, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 20], crc_extra: 118 },
        66: { format: '<HBBBB', type: mavlink20.messages.request_data_stream, order_map: [1, 2, 3, 0, 4], crc_extra: 148 },
        67: { format: '<HBB', type: mavlink20.messages.data_stream, order_map: [1, 0, 2], crc_extra: 21 },
        69: { format: '<hhhhHBHBhhhhhhhh', type: mavlink20.messages.manual_control, order_map: [5, 0, 1, 2, 3, 4, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], crc_extra: 243 },
        70: { format: '<HHHHHHHHBBHHHHHHHHHH', type: mavlink20.messages.rc_channels_override, order_map: [8, 9, 0, 1, 2, 3, 4, 5, 6, 7, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19], crc_extra: 124 },
        73: { format: '<ffffiifHHBBBBBB', type: mavlink20.messages.mission_item_int, order_map: [9, 10, 7, 11, 8, 12, 13, 0, 1, 2, 3, 4, 5, 6, 14], crc_extra: 38 },
        74: { format: '<ffffhH', type: mavlink20.messages.vfr_hud, order_map: [0, 1, 4, 5, 2, 3], crc_extra: 20 },
        75: { format: '<ffffiifHBBBBB', type: mavlink20.messages.command_int, order_map: [8, 9, 10, 7, 11, 12, 0, 1, 2, 3, 4, 5, 6], crc_extra: 158 },
        76: { format: '<fffffffHBBB', type: mavlink20.messages.command_long, order_map: [8, 9, 7, 10, 0, 1, 2, 3, 4, 5, 6], crc_extra: 152 },
        77: { format: '<HBBiBB', type: mavlink20.messages.command_ack, order_map: [0, 1, 2, 3, 4, 5], crc_extra: 143 },
        80: { format: '<HBB', type: mavlink20.messages.command_cancel, order_map: [1, 2, 0], crc_extra: 14 },
        81: { format: '<IffffBB', type: mavlink20.messages.manual_setpoint, order_map: [0, 1, 2, 3, 4, 5, 6], crc_extra: 106 },
        82: { format: '<I4fffffBBB3f', type: mavlink20.messages.set_attitude_target, order_map: [0, 6, 7, 8, 1, 2, 3, 4, 5, 9], crc_extra: 49 },
        83: { format: '<I4fffffB', type: mavlink20.messages.attitude_target, order_map: [0, 6, 1, 2, 3, 4, 5], crc_extra: 22 },
        84: { format: '<IfffffffffffHBBB', type: mavlink20.messages.set_position_target_local_ned, order_map: [0, 13, 14, 15, 12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], crc_extra: 143 },
        85: { format: '<IfffffffffffHB', type: mavlink20.messages.position_target_local_ned, order_map: [0, 13, 12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], crc_extra: 140 },
        86: { format: '<IiifffffffffHBBB', type: mavlink20.messages.set_position_target_global_int, order_map: [0, 13, 14, 15, 12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], crc_extra: 5 },
        87: { format: '<IiifffffffffHB', type: mavlink20.messages.position_target_global_int, order_map: [0, 13, 12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], crc_extra: 150 },
        89: { format: '<Iffffff', type: mavlink20.messages.local_position_ned_system_global_offset, order_map: [0, 1, 2, 3, 4, 5, 6], crc_extra: 231 },
        90: { format: '<Qffffffiiihhhhhh', type: mavlink20.messages.hil_state, order_map: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], crc_extra: 183 },
        91: { format: '<QffffffffBB', type: mavlink20.messages.hil_controls, order_map: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10], crc_extra: 63 },
        92: { format: '<QHHHHHHHHHHHHB', type: mavlink20.messages.hil_rc_inputs_raw, order_map: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13], crc_extra: 54 },
        93: { format: '<QQ16fB', type: mavlink20.messages.hil_actuator_controls, order_map: [0, 2, 3, 1], crc_extra: 47 },
        100: { format: '<QfffhhBBff', type: mavlink20.messages.optical_flow, order_map: [0, 6, 4, 5, 1, 2, 7, 3, 8, 9], crc_extra: 175 },
        101: { format: '<Qffffff21fB', type: mavlink20.messages.global_vision_position_estimate, order_map: [0, 1, 2, 3, 4, 5, 6, 7, 8], crc_extra: 102 },
        102: { format: '<Qffffff21fB', type: mavlink20.messages.vision_position_estimate, order_map: [0, 1, 2, 3, 4, 5, 6, 7, 8], crc_extra: 158 },
        103: { format: '<Qfff9fB', type: mavlink20.messages.vision_speed_estimate, order_map: [0, 1, 2, 3, 4, 5], crc_extra: 208 },
        104: { format: '<Qffffff21f', type: mavlink20.messages.vicon_position_estimate, order_map: [0, 1, 2, 3, 4, 5, 6, 7], crc_extra: 56 },
        105: { format: '<QfffffffffffffHB', type: mavlink20.messages.highres_imu, order_map: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], crc_extra: 93 },
        106: { format: '<QIfffffIfhBB', type: mavlink20.messages.optical_flow_rad, order_map: [0, 10, 1, 2, 3, 4, 5, 6, 9, 11, 7, 8], crc_extra: 138 },
        107: { format: '<QfffffffffffffIB', type: mavlink20.messages.hil_sensor, order_map: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], crc_extra: 108 },
        108: { format: '<fffffffffffffffffffffii', type: mavlink20.messages.sim_state, order_map: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22], crc_extra: 32 },
        109: { format: '<HHBBBBB', type: mavlink20.messages.radio_status, order_map: [2, 3, 4, 5, 6, 0, 1], crc_extra: 185 },
        110: { format: '<BBB251s', type: mavlink20.messages.file_transfer_protocol, order_map: [0, 1, 2, 3], crc_extra: 84 },
        111: { format: '<qqBB', type: mavlink20.messages.timesync, order_map: [0, 1, 2, 3], crc_extra: 34 },
        112: { format: '<QI', type: mavlink20.messages.camera_trigger, order_map: [0, 1], crc_extra: 174 },
        113: { format: '<QiiiHHHhhhHBBBH', type: mavlink20.messages.hil_gps, order_map: [0, 11, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 13, 14], crc_extra: 124 },
        114: { format: '<QIfffffIfhBB', type: mavlink20.messages.hil_optical_flow, order_map: [0, 10, 1, 2, 3, 4, 5, 6, 9, 11, 7, 8], crc_extra: 237 },
        115: { format: '<Q4ffffiiihhhHHhhh', type: mavlink20.messages.hil_state_quaternion, order_map: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], crc_extra: 4 },
        116: { format: '<Ihhhhhhhhhh', type: mavlink20.messages.scaled_imu2, order_map: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10], crc_extra: 76 },
        117: { format: '<HHBB', type: mavlink20.messages.log_request_list, order_map: [2, 3, 0, 1], crc_extra: 128 },
        118: { format: '<IIHHH', type: mavlink20.messages.log_entry, order_map: [2, 3, 4, 0, 1], crc_extra: 56 },
        119: { format: '<IIHBB', type: mavlink20.messages.log_request_data, order_map: [3, 4, 2, 0, 1], crc_extra: 116 },
        120: { format: '<IHB90s', type: mavlink20.messages.log_data, order_map: [1, 0, 2, 3], crc_extra: 134 },
        121: { format: '<BB', type: mavlink20.messages.log_erase, order_map: [0, 1], crc_extra: 237 },
        122: { format: '<BB', type: mavlink20.messages.log_request_end, order_map: [0, 1], crc_extra: 203 },
        123: { format: '<BBB110s', type: mavlink20.messages.gps_inject_data, order_map: [0, 1, 2, 3], crc_extra: 250 },
        124: { format: '<QiiiIHHHHBBBHiIIII', type: mavlink20.messages.gps2_raw, order_map: [0, 9, 1, 2, 3, 5, 6, 7, 8, 10, 11, 4, 12, 13, 14, 15, 16, 17], crc_extra: 87 },
        125: { format: '<HHH', type: mavlink20.messages.power_status, order_map: [0, 1, 2], crc_extra: 203 },
        126: { format: '<IHBBB70sBB', type: mavlink20.messages.serial_control, order_map: [2, 3, 1, 0, 4, 5, 6, 7], crc_extra: 220 },
        127: { format: '<IIiiiIiHBBBBB', type: mavlink20.messages.gps_rtk, order_map: [0, 8, 7, 1, 9, 10, 11, 12, 2, 3, 4, 5, 6], crc_extra: 25 },
        128: { format: '<IIiiiIiHBBBBB', type: mavlink20.messages.gps2_rtk, order_map: [0, 8, 7, 1, 9, 10, 11, 12, 2, 3, 4, 5, 6], crc_extra: 226 },
        129: { format: '<Ihhhhhhhhhh', type: mavlink20.messages.scaled_imu3, order_map: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10], crc_extra: 46 },
        130: { format: '<IHHHBBB', type: mavlink20.messages.data_transmission_handshake, order_map: [4, 0, 1, 2, 3, 5, 6], crc_extra: 29 },
        131: { format: '<H253s', type: mavlink20.messages.encapsulated_data, order_map: [0, 1], crc_extra: 223 },
        132: { format: '<IHHHBBBBff4fB', type: mavlink20.messages.distance_sensor, order_map: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], crc_extra: 85 },
        133: { format: '<QiiH', type: mavlink20.messages.terrain_request, order_map: [1, 2, 3, 0], crc_extra: 6 },
        134: { format: '<iiH16hB', type: mavlink20.messages.terrain_data, order_map: [0, 1, 2, 4, 3], crc_extra: 229 },
        135: { format: '<ii', type: mavlink20.messages.terrain_check, order_map: [0, 1], crc_extra: 203 },
        136: { format: '<iiffHHH', type: mavlink20.messages.terrain_report, order_map: [0, 1, 4, 2, 3, 5, 6], crc_extra: 1 },
        137: { format: '<Iffhh', type: mavlink20.messages.scaled_pressure2, order_map: [0, 1, 2, 3, 4], crc_extra: 195 },
        138: { format: '<Q4ffff21f', type: mavlink20.messages.att_pos_mocap, order_map: [0, 1, 2, 3, 4, 5], crc_extra: 109 },
        139: { format: '<Q8fBBB', type: mavlink20.messages.set_actuator_control_target, order_map: [0, 2, 3, 4, 1], crc_extra: 168 },
        140: { format: '<Q8fB', type: mavlink20.messages.actuator_control_target, order_map: [0, 2, 1], crc_extra: 181 },
        141: { format: '<Qffffff', type: mavlink20.messages.altitude, order_map: [0, 1, 2, 3, 4, 5, 6], crc_extra: 47 },
        142: { format: '<BB120sB120s', type: mavlink20.messages.resource_request, order_map: [0, 1, 2, 3, 4], crc_extra: 72 },
        143: { format: '<Iffhh', type: mavlink20.messages.scaled_pressure3, order_map: [0, 1, 2, 3, 4], crc_extra: 131 },
        144: { format: '<QQiif3f3f4f3f3fB', type: mavlink20.messages.follow_target, order_map: [0, 10, 2, 3, 4, 5, 6, 7, 8, 9, 1], crc_extra: 127 },
        146: { format: '<Qffffffffff3f3f4ffff', type: mavlink20.messages.control_system_state, order_map: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16], crc_extra: 103 },
        147: { format: '<iih10HhBBBbiB4HBI', type: mavlink20.messages.battery_status, order_map: [5, 6, 7, 2, 3, 4, 0, 1, 8, 9, 10, 11, 12, 13], crc_extra: 154 },
        149: { format: '<QfffffBBfff4fBB', type: mavlink20.messages.landing_target, order_map: [0, 6, 7, 1, 2, 3, 4, 5, 8, 9, 10, 11, 12, 13], crc_extra: 200 },
        162: { format: '<IHBBB', type: mavlink20.messages.fence_status, order_map: [2, 1, 3, 0, 4], crc_extra: 189 },
        192: { format: '<ffffffffffBBBBfBBf', type: mavlink20.messages.mag_cal_report, order_map: [10, 11, 12, 13, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 14, 15, 16, 17], crc_extra: 36 },
        225: { format: '<ffffffffffffffffBff', type: mavlink20.messages.efi_status, order_map: [16, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 17, 18], crc_extra: 208 },
        230: { format: '<QffffffffH', type: mavlink20.messages.estimator_status, order_map: [0, 9, 1, 2, 3, 4, 5, 6, 7, 8], crc_extra: 163 },
        231: { format: '<Qffffffff', type: mavlink20.messages.wind_cov, order_map: [0, 1, 2, 3, 4, 5, 6, 7, 8], crc_extra: 105 },
        232: { format: '<QIiifffffffffHHBBBH', type: mavlink20.messages.gps_input, order_map: [0, 15, 13, 1, 14, 16, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 17, 18], crc_extra: 151 },
        233: { format: '<BB180s', type: mavlink20.messages.gps_rtcm_data, order_map: [0, 1, 2], crc_extra: 35 },
        234: { format: '<IiihhHhhhHBBbBBBbBBBbbBB', type: mavlink20.messages.high_latency, order_map: [10, 0, 11, 3, 4, 5, 12, 6, 1, 2, 7, 8, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 9], crc_extra: 150 },
        235: { format: '<IiiHhhHHHBBBBBBBBBBBBbbbbbb', type: mavlink20.messages.high_latency2, order_map: [0, 9, 10, 3, 1, 2, 4, 5, 11, 12, 6, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 7, 8, 24, 25, 26], crc_extra: 179 },
        241: { format: '<QfffIII', type: mavlink20.messages.vibration, order_map: [0, 1, 2, 3, 4, 5, 6], crc_extra: 90 },
        242: { format: '<iiifff4ffffQ', type: mavlink20.messages.home_position, order_map: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10], crc_extra: 104 },
        243: { format: '<iiifff4ffffBQ', type: mavlink20.messages.set_home_position, order_map: [10, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 11], crc_extra: 85 },
        244: { format: '<iH', type: mavlink20.messages.message_interval, order_map: [1, 0], crc_extra: 95 },
        245: { format: '<BB', type: mavlink20.messages.extended_sys_state, order_map: [0, 1], crc_extra: 130 },
        246: { format: '<IiiiHHhHHB9sBB', type: mavlink20.messages.adsb_vehicle, order_map: [0, 1, 2, 9, 3, 4, 5, 6, 10, 11, 12, 7, 8], crc_extra: 184 },
        247: { format: '<IfffBBB', type: mavlink20.messages.collision, order_map: [4, 0, 5, 6, 1, 2, 3], crc_extra: 81 },
        248: { format: '<HBBB249s', type: mavlink20.messages.v2_extension, order_map: [1, 2, 3, 0, 4], crc_extra: 8 },
        249: { format: '<HBB32s', type: mavlink20.messages.memory_vect, order_map: [0, 1, 2, 3], crc_extra: 204 },
        250: { format: '<Qfff10s', type: mavlink20.messages.debug_vect, order_map: [4, 0, 1, 2, 3], crc_extra: 49 },
        251: { format: '<If10s', type: mavlink20.messages.named_value_float, order_map: [0, 2, 1], crc_extra: 170 },
        252: { format: '<Ii10s', type: mavlink20.messages.named_value_int, order_map: [0, 2, 1], crc_extra: 44 },
        253: { format: '<B50sHB', type: mavlink20.messages.statustext, order_map: [0, 1, 2, 3], crc_extra: 83 },
        254: { format: '<IfB', type: mavlink20.messages.debug, order_map: [0, 2, 1], crc_extra: 46 },
        256: { format: '<QBB32s', type: mavlink20.messages.setup_signing, order_map: [1, 2, 3, 0], crc_extra: 71 },
        257: { format: '<IIB', type: mavlink20.messages.button_change, order_map: [0, 1, 2], crc_extra: 131 },
        258: { format: '<BB30s200s', type: mavlink20.messages.play_tune, order_map: [0, 1, 2, 3], crc_extra: 187 },
        259: { format: '<IIfffIHHH32s32sB140sBB', type: mavlink20.messages.camera_information, order_map: [0, 9, 10, 1, 2, 3, 4, 6, 7, 11, 5, 8, 12, 13, 14], crc_extra: 92 },
        260: { format: '<IBffB', type: mavlink20.messages.camera_settings, order_map: [0, 1, 2, 3, 4], crc_extra: 146 },
        261: { format: '<IfffffBBBB32sB', type: mavlink20.messages.storage_information, order_map: [0, 6, 7, 8, 1, 2, 3, 4, 5, 9, 10, 11], crc_extra: 179 },
        262: { format: '<IfIfBBiB', type: mavlink20.messages.camera_capture_status, order_map: [0, 4, 5, 1, 2, 3, 6, 7], crc_extra: 12 },
        263: { format: '<QIiiii4fiBb205s', type: mavlink20.messages.camera_image_captured, order_map: [1, 0, 8, 2, 3, 4, 5, 6, 7, 9, 10], crc_extra: 133 },
        264: { format: '<QQQII', type: mavlink20.messages.flight_information, order_map: [3, 0, 1, 2, 4], crc_extra: 49 },
        265: { format: '<Iffff', type: mavlink20.messages.mount_orientation, order_map: [0, 1, 2, 3, 4], crc_extra: 26 },
        266: { format: '<HBBBB249s', type: mavlink20.messages.logging_data, order_map: [1, 2, 0, 3, 4, 5], crc_extra: 193 },
        267: { format: '<HBBBB249s', type: mavlink20.messages.logging_data_acked, order_map: [1, 2, 0, 3, 4, 5], crc_extra: 35 },
        268: { format: '<HBB', type: mavlink20.messages.logging_ack, order_map: [1, 2, 0], crc_extra: 14 },
        269: { format: '<fIHHHHHBBB32s160sBB', type: mavlink20.messages.video_stream_information, order_map: [7, 8, 9, 2, 0, 3, 4, 1, 5, 6, 10, 11, 12, 13], crc_extra: 109 },
        270: { format: '<fIHHHHHBB', type: mavlink20.messages.video_stream_status, order_map: [7, 2, 0, 3, 4, 1, 5, 6, 8], crc_extra: 59 },
        271: { format: '<Iiiiiii4fffB', type: mavlink20.messages.camera_fov_status, order_map: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10], crc_extra: 22 },
        275: { format: '<fffffffBBBB', type: mavlink20.messages.camera_tracking_image_status, order_map: [7, 8, 9, 0, 1, 2, 3, 4, 5, 6, 10], crc_extra: 126 },
        276: { format: '<iiffffffffffBB', type: mavlink20.messages.camera_tracking_geo_status, order_map: [12, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 13], crc_extra: 18 },
        277: { format: '<IffffffBB', type: mavlink20.messages.camera_thermal_range, order_map: [0, 7, 8, 1, 2, 3, 4, 5, 6], crc_extra: 62 },
        280: { format: '<IIffffffB', type: mavlink20.messages.gimbal_manager_information, order_map: [0, 1, 8, 2, 3, 4, 5, 6, 7], crc_extra: 70 },
        281: { format: '<IIBBBBB', type: mavlink20.messages.gimbal_manager_status, order_map: [0, 1, 2, 3, 4, 5, 6], crc_extra: 48 },
        282: { format: '<I4ffffBBB', type: mavlink20.messages.gimbal_manager_set_attitude, order_map: [5, 6, 0, 7, 1, 2, 3, 4], crc_extra: 123 },
        283: { format: '<QIIIffffffHH32s32s32sB', type: mavlink20.messages.gimbal_device_information, order_map: [1, 12, 13, 14, 2, 3, 0, 10, 11, 4, 5, 6, 7, 8, 9, 15], crc_extra: 74 },
        284: { format: '<4ffffHBB', type: mavlink20.messages.gimbal_device_set_attitude, order_map: [5, 6, 4, 0, 1, 2, 3], crc_extra: 99 },
        285: { format: '<I4ffffIHBBffB', type: mavlink20.messages.gimbal_device_attitude_status, order_map: [7, 8, 0, 6, 1, 2, 3, 4, 5, 9, 10, 11], crc_extra: 137 },
        286: { format: '<Q4fIfffIfHBBBf', type: mavlink20.messages.autopilot_state_for_gimbal_device, order_map: [9, 10, 0, 1, 2, 3, 4, 5, 6, 7, 8, 11, 12], crc_extra: 210 },
        287: { format: '<IffffBBB', type: mavlink20.messages.gimbal_manager_set_pitchyaw, order_map: [5, 6, 0, 7, 1, 2, 3, 4], crc_extra: 1 },
        288: { format: '<IffffBBB', type: mavlink20.messages.gimbal_manager_set_manual_control, order_map: [5, 6, 0, 7, 1, 2, 3, 4], crc_extra: 20 },
        290: { format: '<Q4IH4H4hBBBB', type: mavlink20.messages.esc_info, order_map: [5, 0, 2, 6, 7, 8, 3, 1, 4], crc_extra: 251 },
        291: { format: '<Q4i4f4fB', type: mavlink20.messages.esc_status, order_map: [4, 0, 1, 2, 3], crc_extra: 10 },
        299: { format: '<32s64sbb', type: mavlink20.messages.wifi_config_ap, order_map: [0, 1, 2, 3], crc_extra: 19 },
        301: { format: '<IiiHHHHHHHbBBBB7s20s', type: mavlink20.messages.ais_vessel, order_map: [0, 1, 2, 3, 4, 5, 10, 11, 12, 6, 7, 13, 14, 15, 16, 8, 9], crc_extra: 243 },
        310: { format: '<QIHBBB', type: mavlink20.messages.uavcan_node_status, order_map: [0, 1, 3, 4, 5, 2], crc_extra: 28 },
        311: { format: '<QII80sBB16sBB', type: mavlink20.messages.uavcan_node_info, order_map: [0, 1, 3, 4, 5, 6, 7, 8, 2], crc_extra: 95 },
        320: { format: '<hBB16s', type: mavlink20.messages.param_ext_request_read, order_map: [1, 2, 3, 0], crc_extra: 243 },
        321: { format: '<BB', type: mavlink20.messages.param_ext_request_list, order_map: [0, 1], crc_extra: 88 },
        322: { format: '<HH16s128sB', type: mavlink20.messages.param_ext_value, order_map: [2, 3, 4, 0, 1], crc_extra: 243 },
        323: { format: '<BB16s128sB', type: mavlink20.messages.param_ext_set, order_map: [0, 1, 2, 3, 4], crc_extra: 78 },
        324: { format: '<16s128sBB', type: mavlink20.messages.param_ext_ack, order_map: [0, 1, 2, 3], crc_extra: 132 },
        330: { format: '<Q72HHHBBffB', type: mavlink20.messages.obstacle_distance, order_map: [0, 4, 1, 5, 2, 3, 6, 7, 8], crc_extra: 23 },
        331: { format: '<Qfff4fffffff21f21fBBBBb', type: mavlink20.messages.odometry, order_map: [0, 13, 14, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 15, 16, 17], crc_extra: 91 },
        332: { format: '<Q5f5f5f5f5f5f5f5f5f5f5f5HB', type: mavlink20.messages.trajectory_representation_waypoints, order_map: [0, 13, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], crc_extra: 236 },
        333: { format: '<Q5f5f5f5f5fB', type: mavlink20.messages.trajectory_representation_bezier, order_map: [0, 6, 1, 2, 3, 4, 5], crc_extra: 231 },
        334: { format: '<HHHBBBB', type: mavlink20.messages.cellular_status, order_map: [3, 4, 5, 6, 0, 1, 2], crc_extra: 72 },
        335: { format: '<QQHHBBBB', type: mavlink20.messages.isbd_link_status, order_map: [0, 1, 2, 3, 4, 5, 6, 7], crc_extra: 225 },
        336: { format: '<BB16s16s32s16sBB', type: mavlink20.messages.cellular_config, order_map: [0, 1, 2, 3, 4, 5, 6, 7], crc_extra: 245 },
        339: { format: '<fB', type: mavlink20.messages.raw_rpm, order_map: [1, 0], crc_extra: 199 },
        340: { format: '<QiiiiiiihhhHHHH18sBB', type: mavlink20.messages.utm_global_position, order_map: [0, 15, 1, 2, 3, 4, 8, 9, 10, 11, 12, 13, 5, 6, 7, 14, 16, 17], crc_extra: 99 },
        345: { format: '<hBB16sB', type: mavlink20.messages.param_error, order_map: [1, 2, 3, 0, 4], crc_extra: 209 },
        350: { format: '<QH10s58f', type: mavlink20.messages.debug_float_array, order_map: [0, 2, 1, 3], crc_extra: 232 },
        360: { format: '<QfiifB', type: mavlink20.messages.orbit_execution_status, order_map: [0, 1, 5, 2, 3, 4], crc_extra: 11 },
        370: { format: '<iiHHHHHBBB16s50sHBII11s', type: mavlink20.messages.smart_battery_info, order_map: [7, 8, 9, 0, 1, 2, 10, 11, 3, 4, 5, 6, 12, 13, 14, 15, 16], crc_extra: 75 },
        371: { format: '<fffffIBB', type: mavlink20.messages.fuel_status, order_map: [6, 0, 1, 2, 7, 3, 4, 5], crc_extra: 10 },
        372: { format: '<ffffffffffHHBBBBB9s32s50s', type: mavlink20.messages.battery_info, order_map: [12, 13, 14, 15, 16, 10, 11, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 17, 18, 19], crc_extra: 26 },
        373: { format: '<QfffffIiHhh', type: mavlink20.messages.generator_status, order_map: [0, 8, 1, 2, 3, 4, 9, 5, 10, 6, 7], crc_extra: 117 },
        375: { format: '<QI32f', type: mavlink20.messages.actuator_output_status, order_map: [0, 1, 2], crc_extra: 251 },
        380: { format: '<iiiii', type: mavlink20.messages.time_estimate_to_target, order_map: [0, 1, 2, 3, 4], crc_extra: 232 },
        385: { format: '<HBBB128s', type: mavlink20.messages.tunnel, order_map: [1, 2, 0, 3, 4], crc_extra: 147 },
        386: { format: '<IBBBB8s', type: mavlink20.messages.can_frame, order_map: [1, 2, 3, 4, 0, 5], crc_extra: 132 },
        390: { format: '<QIII4I4I4I6I6I6I6I6I4hB8s10s4s10sb8sH', type: mavlink20.messages.onboard_computer_status, order_map: [0, 1, 13, 14, 15, 16, 17, 18, 19, 12, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 20], crc_extra: 156 },
        395: { format: '<III100s100s', type: mavlink20.messages.component_information, order_map: [0, 1, 3, 2, 4], crc_extra: 0 },
        396: { format: '<QII32s32s24s24s32s', type: mavlink20.messages.component_information_basic, order_map: [1, 0, 2, 3, 4, 5, 6, 7], crc_extra: 50 },
        397: { format: '<II100s', type: mavlink20.messages.component_metadata, order_map: [0, 1, 2], crc_extra: 182 },
        400: { format: '<IBB248s', type: mavlink20.messages.play_tune_v2, order_map: [1, 2, 0, 3], crc_extra: 110 },
        401: { format: '<IBB', type: mavlink20.messages.supported_tunes, order_map: [1, 2, 0], crc_extra: 183 },
        410: { format: '<IIHBBB40s', type: mavlink20.messages.event, order_map: [3, 4, 0, 1, 2, 5, 6], crc_extra: 160 },
        411: { format: '<HB', type: mavlink20.messages.current_event_sequence, order_map: [0, 1], crc_extra: 106 },
        412: { format: '<HHBB', type: mavlink20.messages.request_event, order_map: [2, 3, 0, 1], crc_extra: 33 },
        413: { format: '<HHBBB', type: mavlink20.messages.response_event_error, order_map: [2, 3, 0, 1, 4], crc_extra: 77 },
        435: { format: '<IIBBB35s', type: mavlink20.messages.available_modes, order_map: [2, 3, 4, 0, 1, 5], crc_extra: 134 },
        436: { format: '<IIB', type: mavlink20.messages.current_mode, order_map: [2, 0, 1], crc_extra: 193 },
        437: { format: '<B', type: mavlink20.messages.available_modes_monitor, order_map: [0], crc_extra: 30 },
        440: { format: '<IIffffffBBB', type: mavlink20.messages.illuminator_status, order_map: [0, 8, 9, 1, 10, 2, 3, 4, 5, 6, 7], crc_extra: 66 },
        387: { format: '<IBBBB64s', type: mavlink20.messages.canfd_frame, order_map: [1, 2, 3, 4, 0, 5], crc_extra: 4 },
        388: { format: '<16HBBBBB', type: mavlink20.messages.can_filter_modify, order_map: [1, 2, 3, 4, 5, 0], crc_extra: 8 },
        9000: { format: '<Q16dB', type: mavlink20.messages.wheel_distance, order_map: [0, 2, 1], crc_extra: 113 },
        9005: { format: '<QfffffIh', type: mavlink20.messages.winch_status, order_map: [0, 1, 2, 3, 4, 5, 7, 6], crc_extra: 117 },
        12900: { format: '<BB20sBB20s', type: mavlink20.messages.open_drone_id_basic_id, order_map: [0, 1, 2, 3, 4, 5], crc_extra: 114 },
        12901: { format: '<iiffffHHhBB20sBBBBBBB', type: mavlink20.messages.open_drone_id_location, order_map: [9, 10, 11, 12, 6, 7, 8, 0, 1, 2, 3, 13, 4, 14, 15, 16, 17, 5, 18], crc_extra: 254 },
        12902: { format: '<IBB20sBBBB23s', type: mavlink20.messages.open_drone_id_authentication, order_map: [1, 2, 3, 4, 5, 6, 7, 0, 8], crc_extra: 140 },
        12903: { format: '<BB20sB23s', type: mavlink20.messages.open_drone_id_self_id, order_map: [0, 1, 2, 3, 4], crc_extra: 249 },
        12904: { format: '<iifffIHHBB20sBBBB', type: mavlink20.messages.open_drone_id_system, order_map: [8, 9, 10, 11, 12, 0, 1, 6, 7, 2, 3, 13, 14, 4, 5], crc_extra: 77 },
        12905: { format: '<BB20sB20s', type: mavlink20.messages.open_drone_id_operator_id, order_map: [0, 1, 2, 3, 4], crc_extra: 49 },
        12915: { format: '<BB20sBB225s', type: mavlink20.messages.open_drone_id_message_pack, order_map: [0, 1, 2, 3, 4, 5], crc_extra: 94 },
        12918: { format: '<B50s', type: mavlink20.messages.open_drone_id_arm_status, order_map: [0, 1], crc_extra: 139 },
        12919: { format: '<iifIBB', type: mavlink20.messages.open_drone_id_system_update, order_map: [4, 5, 0, 1, 2, 3], crc_extra: 7 },
        12920: { format: '<hHB', type: mavlink20.messages.hygrometer_sensor, order_map: [2, 0, 1], crc_extra: 20 },
        33: { format: '<IiiiihhhH', type: mavlink20.messages.global_position_int, order_map: [0, 1, 2, 3, 4, 5, 6, 7, 8], crc_extra: 104 },
        148: { format: '<QQIIIIHH8s8s8s18s', type: mavlink20.messages.autopilot_version, order_map: [0, 2, 3, 4, 5, 8, 9, 10, 6, 7, 1, 11], crc_extra: 178 },
        0: { format: '<IBBBBB', type: mavlink20.messages.heartbeat, order_map: [1, 2, 3, 0, 4, 5], crc_extra: 50 },
        300: { format: '<HHH8s8s', type: mavlink20.messages.protocol_version, order_map: [0, 1, 2, 3, 4], crc_extra: 217 },
}


// Special mavlink message to capture malformed data packets for debugging
mavlink20.messages.bad_data = function(data, reason) {
    this.id = mavlink20.MAVLINK_MSG_ID_BAD_DATA;
    this.data = data;
    this.reason = reason;
    this.msgbuf = data;
}

/* MAVLink protocol handling class */
MAVLink20Processor = function(logger, srcSystem, srcComponent) {

    this.logger = logger;

    this.seq = 0;
    this.buf = new Buffer.from([]);
    this.bufInError = new Buffer.from([]);
   
    this.srcSystem = (typeof srcSystem === 'undefined') ? 0 : srcSystem;
    this.srcComponent =  (typeof srcComponent === 'undefined') ? 0 : srcComponent;

    this.have_prefix_error = false;

    // The first packet we expect is a valid header, 6 bytes.
    this.protocol_marker = 253;   
    this.expected_length = mavlink20.HEADER_LEN;
    this.little_endian = true;

    this.crc_extra = true;
    this.sort_fields = true;
    this.total_packets_sent = 0;
    this.total_bytes_sent = 0;
    this.total_packets_received = 0;
    this.total_bytes_received = 0;
    this.total_receive_errors = 0;
    this.startup_time = Date.now();
    
}

// Implements EventEmitter
util.inherits(MAVLink20Processor, events.EventEmitter);

// If the logger exists, this function will add a message to it.
// Assumes the logger is a winston object.
MAVLink20Processor.prototype.log = function(message) {
    if(this.logger) {
        this.logger.info(message);
    }
}

MAVLink20Processor.prototype.log = function(level, message) {
    if(this.logger) {
        this.logger.log(level, message);
    }
}

MAVLink20Processor.prototype.send = function(mavmsg) {
    buf = mavmsg.pack(this);
    this.file.write(buf);
    this.seq = (this.seq + 1) % 256;
    this.total_packets_sent +=1;
    this.total_bytes_sent += buf.length;
}

// return number of bytes needed for next parsing stage
MAVLink20Processor.prototype.bytes_needed = function() {
    ret = this.expected_length - this.buf.length;
    return ( ret <= 0 ) ? 1 : ret;
}

// add data to the local buffer
MAVLink20Processor.prototype.pushBuffer = function(data) {
    if(data) {
        this.buf = Buffer.concat([this.buf, data]);
        this.total_bytes_received += data.length;
    }
}

// Decode prefix.  Elides the prefix.
MAVLink20Processor.prototype.parsePrefix = function() {

    // Test for a message prefix.
    if( this.buf.length >= 1 && this.buf[0] != this.protocol_marker ) {

        // Strip the offending initial byte and throw an error.
        var badPrefix = this.buf[0];
        this.bufInError = this.buf.slice(0,1);
        this.buf = this.buf.slice(1);
        this.expected_length = mavlink20.HEADER_LEN;

        // TODO: enable subsequent prefix error suppression if robust_parsing is implemented
        //if(!this.have_prefix_error) {
        //    this.have_prefix_error = true;
            throw new Error("Bad prefix ("+badPrefix+")");
        //}

    }
    //else if( this.buf.length >= 1 && this.buf[0] == this.protocol_marker ) {
    //    this.have_prefix_error = false;
    //}

}

// Determine the length.  Leaves buffer untouched.
MAVLink20Processor.prototype.parseLength = function() {
    
    if( this.buf.length >= 2 ) {
        var unpacked = jspack.Unpack('BB', this.buf.slice(0, 2));
        this.expected_length = unpacked[1] + mavlink20.HEADER_LEN + 2 // length of message + header + CRC
    }

}

// input some data bytes, possibly returning a new message
MAVLink20Processor.prototype.parseChar = function(c) {

    var m = null;

    try {

        this.pushBuffer(c);
        this.parsePrefix();
        this.parseLength();
        m = this.parsePayload();

    } catch(e) {

        this.log('error', e.message);
        this.total_receive_errors += 1;
        m = new mavlink20.messages.bad_data(this.bufInError, e.message);
        this.bufInError = new Buffer.from([]);
        
    }

    if(null != m) {
        this.emit(m.name, m);
        this.emit('message', m);
    }

    return m;

}

MAVLink20Processor.prototype.parsePayload = function() {

    var m = null;

    // If we have enough bytes to try and read it, read it.
    if( this.expected_length >= 8 && this.buf.length >= this.expected_length ) {

        // Slice off the expected packet length, reset expectation to be to find a header.
        var mbuf = this.buf.slice(0, this.expected_length);
        // TODO: slicing off the buffer should depend on the error produced by the decode() function
        // - if a message we find a well formed message, cut-off the expected_length
        // - if the message is not well formed (correct prefix by accident), cut-off 1 char only
        this.buf = this.buf.slice(this.expected_length);
        this.expected_length = 6;

        // w.info("Attempting to parse packet, message candidate buffer is ["+mbuf.toByteArray()+"]");

        try {
            m = this.decode(mbuf);
            this.total_packets_received += 1;
        }
        catch(e) {
            // Set buffer in question and re-throw to generic error handling
            this.bufInError = mbuf;
            throw e;
        }
    }

    return m;

}

// input some data bytes, possibly returning an array of new messages
MAVLink20Processor.prototype.parseBuffer = function(s) {
    
    // Get a message, if one is available in the stream.
    var m = this.parseChar(s);

    // No messages available, bail.
    if ( null === m ) {
        return null;
    }
    
    // While more valid messages can be read from the existing buffer, add
    // them to the array of new messages and return them.
    var ret = [m];
    while(true) {
        m = this.parseChar();
        if ( null === m ) {
            // No more messages left.
            return ret;
        }
        ret.push(m);
    }

}

/* decode a buffer as a MAVLink message */
MAVLink20Processor.prototype.decode = function(msgbuf) {

    var magic, incompat_flags, compat_flags, mlen, seq, srcSystem, srcComponent, unpacked, msgId;

    // decode the header
    try {
        unpacked = jspack.Unpack('cBBBBBBHB', msgbuf.slice(0, 10));
        magic = unpacked[0];
        mlen = unpacked[1];
        incompat_flags = unpacked[2];
        compat_flags = unpacked[3];
        seq = unpacked[4];
        srcSystem = unpacked[5];
        srcComponent = unpacked[6];
        var msgIDlow = ((unpacked[7] & 0xFF) << 8) | ((unpacked[7] >> 8) & 0xFF);
        var msgIDhigh = unpacked[8];
        msgId = msgIDlow | (msgIDhigh<<16);
        }
    catch(e) {
        throw new Error('Unable to unpack MAVLink header: ' + e.message);
    }

    if (magic.charCodeAt(0) != this.protocol_marker) {
        throw new Error("Invalid MAVLink prefix ("+magic.charCodeAt(0)+")");
    }

    if( mlen != msgbuf.length - (mavlink20.HEADER_LEN + 2)) {
        throw new Error("Invalid MAVLink message length.  Got " + (msgbuf.length - (mavlink20.HEADER_LEN + 2)) + " expected " + mlen + ", msgId=" + msgId);
    }

    if( false === _.has(mavlink20.map, msgId) ) {
        throw new Error("Unknown MAVLink message ID (" + msgId + ")");
    }

    // decode the payload
    // refs: (fmt, type, order_map, crc_extra) = mavlink20.map[msgId]
    var decoder = mavlink20.map[msgId];

    // decode the checksum
    try {
        var receivedChecksum = jspack.Unpack('<H', msgbuf.slice(msgbuf.length - 2));
    } catch (e) {
        throw new Error("Unable to unpack MAVLink CRC: " + e.message);
    }

    var messageChecksum = mavlink20.x25Crc(msgbuf.slice(1, msgbuf.length - 2));

    // Assuming using crc_extra = True.  See the message.prototype.pack() function.
    messageChecksum = mavlink20.x25Crc([decoder.crc_extra], messageChecksum);
    
    if ( receivedChecksum != messageChecksum ) {
        throw new Error('invalid MAVLink CRC in msgID ' +msgId+ ', got ' + receivedChecksum + ' checksum, calculated payload checksum as '+messageChecksum );
    }

    var paylen = jspack.CalcLength(decoder.format);
    var payload = msgbuf.slice(mavlink20.HEADER_LEN, msgbuf.length - 2);

    //put any truncated 0's back in
    if (paylen > payload.length) {
        payload =  Buffer.concat([payload, Buffer.alloc(paylen - payload.length)]);
    }
    // Decode the payload and reorder the fields to match the order map.
    try {
        var t = jspack.Unpack(decoder.format, payload);
    }
    catch (e) {
        throw new Error('Unable to unpack MAVLink payload type='+decoder.type+' format='+decoder.format+' payloadLength='+ payload +': '+ e.message);
    }

    // Need to check if the message contains arrays
    var args = {};
    const elementsInMsg = decoder.order_map.length;
    const actualElementsInMsg = JSON.parse(JSON.stringify(t)).length;

    if (elementsInMsg == actualElementsInMsg) {
        // Reorder the fields to match the order map
        _.each(t, function(e, i, l) {
            args[i] = t[decoder.order_map[i]]
        });
    } else {
        // This message contains arrays
        var typeIndex = 1;
        var orderIndex = 0;
        var memberIndex = 0;
        var tempArgs = {};

        // Walk through the fields 
        for(var i = 0, size = decoder.format.length-1; i <= size; ++i) {
            var order = decoder.order_map[orderIndex];
            var currentType =  decoder.format[typeIndex];

            if (isNaN(parseInt(currentType))) {
                // This field is not an array check the type and add it to the args
                tempArgs[orderIndex] = t[memberIndex];
                memberIndex++;
            } else {
                // This field is part of an array, need to find the length of the array
                var arraySize = ''
                var newArray = []
                while (!isNaN(decoder.format[typeIndex])) {
                    arraySize = arraySize + decoder.format[typeIndex];
                    typeIndex++;
                }

                // Now that we know how long the array is, create an array with the values
                for(var j = 0, size = parseInt(arraySize); j < size; ++j){
                    newArray.push(t[j+orderIndex]);
                    memberIndex++;
                }

                // Add the array to the args object
                arraySize = arraySize + decoder.format[typeIndex];
                currentType = arraySize;
                tempArgs[orderIndex] = newArray;
            }
            orderIndex++;
            typeIndex++;
        }

        // Finally reorder the fields to match the order map
        _.each(t, function(e, i, l) {
            args[i] = tempArgs[decoder.order_map[i]]
        });
    }

    // construct the message object
    try {
        var m = new decoder.type(args);
        m.set.call(m, args);
    }
    catch (e) {
        throw new Error('Unable to instantiate MAVLink message of type '+decoder.type+' : ' + e.message);
    }
    m.msgbuf = msgbuf;
    m.payload = payload
    m.crc = receivedChecksum;
    m.header = new mavlink20.header(msgId, mlen, seq, srcSystem, srcComponent, incompat_flags, compat_flags);
    this.log(m);
    return m;
}


// Expose this code as a module
module.exports = {mavlink20, MAVLink20Processor};


}).call(this)}).call(this,require("buffer").Buffer)
},{"buffer":3,"events":23,"jspack":63,"underscore":64,"util":60}],63:[function(require,module,exports){
/*!
 *  Copyright © 2008 Fair Oaks Labs, Inc.
 *  All rights reserved.
 */

// Utility object:  Encode/Decode C-style binary primitives to/from octet arrays
function JSPack()
{
	// Module-level (private) variables
	var el,  bBE = false, m = this;


	// Raw byte arrays
	m._DeArray = function (a, p, l)
	{
		return [a.slice(p,p+l)];
	};
	m._EnArray = function (a, p, l, v)
	{
		for (var i = 0; i < l; a[p+i] = v[i]?v[i]:0, i++);
	};

	// ASCII characters
	m._DeChar = function (a, p)
	{
		return String.fromCharCode(a[p]);
	};
	m._EnChar = function (a, p, v)
	{
		a[p] = v.charCodeAt(0);
	};

	// Little-endian (un)signed N-byte integers
	m._DeInt = function (a, p)
	{
		var lsb = bBE?(el.len-1):0, nsb = bBE?-1:1, stop = lsb+nsb*el.len, rv, i, f;
		for (rv = 0, i = lsb, f = 1; i != stop; rv+=(a[p+i]*f), i+=nsb, f*=256);
		if (el.bSigned && (rv & Math.pow(2, el.len*8-1))) { rv -= Math.pow(2, el.len*8); }
		return rv;
	};
	m._EnInt = function (a, p, v)
	{
		var lsb = bBE?(el.len-1):0, nsb = bBE?-1:1, stop = lsb+nsb*el.len, i;
		v = (v<el.min)?el.min:(v>el.max)?el.max:v;
		for (i = lsb; i != stop; a[p+i]=v&0xff, i+=nsb, v>>=8);
	};

	// ASCII character strings
	m._DeString = function (a, p, l)
	{
		for (var rv = new Array(l), i = 0; i < l; rv[i] = String.fromCharCode(a[p+i]), i++);
		return rv.join('');
	};
	m._EnString = function (a, p, l, v)
	{
		for (var t, i = 0; i < l; a[p+i] = (t=v.charCodeAt(i))?t:0, i++);
	};

	// Little-endian N-bit IEEE 754 floating point
	m._De754 = function (a, p)
	{
		var s, e, m, i, d, nBits, mLen, eLen, eBias, eMax;
		mLen = el.mLen, eLen = el.len*8-el.mLen-1, eMax = (1<<eLen)-1, eBias = eMax>>1;

		i = bBE?0:(el.len-1); d = bBE?1:-1; s = a[p+i]; i+=d; nBits = -7;
		for (e = s&((1<<(-nBits))-1), s>>=(-nBits), nBits += eLen; nBits > 0; e=e*256+a[p+i], i+=d, nBits-=8);
		for (m = e&((1<<(-nBits))-1), e>>=(-nBits), nBits += mLen; nBits > 0; m=m*256+a[p+i], i+=d, nBits-=8);

		switch (e)
		{
			case 0:
				// Zero, or denormalized number
				e = 1-eBias;
				break;
			case eMax:
				// NaN, or +/-Infinity
				return m?NaN:((s?-1:1)*Infinity);
			default:
				// Normalized number
				m = m + Math.pow(2, mLen);
				e = e - eBias;
				break;
		}
		return (s?-1:1) * m * Math.pow(2, e-mLen);
	};
	m._En754 = function (a, p, v)
	{
		var s, e, m, i, d, c, mLen, eLen, eBias, eMax;
		mLen = el.mLen, eLen = el.len*8-el.mLen-1, eMax = (1<<eLen)-1, eBias = eMax>>1;

		s = v<0?1:0;
		v = Math.abs(v);
		if (isNaN(v) || (v == Infinity))
		{
			m = isNaN(v)?1:0;
			e = eMax;
		}
		else
		{
			e = Math.floor(Math.log(v)/Math.LN2);			// Calculate log2 of the value
			if (v*(c = Math.pow(2, -e)) < 1) { e--; c*=2; }		// Math.log() isn't 100% reliable

			// Round by adding 1/2 the significand's LSD
			if (e+eBias >= 1) { v += el.rt/c; }			// Normalized:  mLen significand digits
			else { v += el.rt*Math.pow(2, 1-eBias); } 		// Denormalized:  <= mLen significand digits
			if (v*c >= 2) { e++; c/=2; }				// Rounding can increment the exponent

			if (e+eBias >= eMax)
			{
				// Overflow
				m = 0;
				e = eMax;
			}
			else if (e+eBias >= 1)
			{
				// Normalized - term order matters, as Math.pow(2, 52-e) and v*Math.pow(2, 52) can overflow
				m = (v*c-1)*Math.pow(2, mLen);
				e = e + eBias;
			}
			else
			{
				// Denormalized - also catches the '0' case, somewhat by chance
				m = v*Math.pow(2, eBias-1)*Math.pow(2, mLen);
				e = 0;
			}
		}

		for (i = bBE?(el.len-1):0, d=bBE?-1:1; mLen >= 8; a[p+i]=m&0xff, i+=d, m/=256, mLen-=8);
		for (e=(e<<mLen)|m, eLen+=mLen; eLen > 0; a[p+i]=e&0xff, i+=d, e/=256, eLen-=8);
		a[p+i-d] |= s*128;
	};

	// Convert int64 to array with 3 elements: [lowBits, highBits, unsignedFlag]
	// '>>>' trick to convert signed 32bit int to unsigned int (because << always results in a signed 32bit int)
	m._DeInt64 = function (a, p) {
		var start = bBE ? 0 : 7, nsb = bBE ? 1 : -1, stop = start + nsb * 8, rv = [0,0, !el.bSigned], i, f, rvi;
		for (i = start, rvi = 1, f = 0;
			i != stop;
			rv[rvi] = (((rv[rvi]<<8)>>>0) + a[p + i]), i += nsb, f++, rvi = (f < 4 ? 1 : 0));
		return rv;
	};
	m._EnInt64 = function (a, p, v) {
		var start = bBE ? 0 : 7, nsb = bBE ? 1 : -1, stop = start + nsb * 8, i, f, rvi, s;
		for (i = start, rvi = 1, f = 0, s = 24;
			i != stop;
			a[p + i] = v[rvi]>>s & 0xff, i += nsb, f++, rvi = (f < 4 ? 1 : 0), s = 24 - (8 * (f % 4)));
	};
	

	// Class data
	m._sPattern	= '(\\d+)?([AxcbBhHsfdiIlLqQ])';
	m._lenLut	= {'A':1, 'x':1, 'c':1, 'b':1, 'B':1, 'h':2, 'H':2, 's':1, 'f':4, 'd':8, 'i':4, 'I':4, 'l':4, 'L':4, 'q':8, 'Q':8};
	m._elLut	= {	'A': {en:m._EnArray, de:m._DeArray},
				's': {en:m._EnString, de:m._DeString},
				'c': {en:m._EnChar, de:m._DeChar},
				'b': {en:m._EnInt, de:m._DeInt, len:1, bSigned:true, min:-Math.pow(2, 7), max:Math.pow(2, 7)-1},
				'B': {en:m._EnInt, de:m._DeInt, len:1, bSigned:false, min:0, max:Math.pow(2, 8)-1},
				'h': {en:m._EnInt, de:m._DeInt, len:2, bSigned:true, min:-Math.pow(2, 15), max:Math.pow(2, 15)-1},
				'H': {en:m._EnInt, de:m._DeInt, len:2, bSigned:false, min:0, max:Math.pow(2, 16)-1},
				'i': {en:m._EnInt, de:m._DeInt, len:4, bSigned:true, min:-Math.pow(2, 31), max:Math.pow(2, 31)-1},
				'I': {en:m._EnInt, de:m._DeInt, len:4, bSigned:false, min:0, max:Math.pow(2, 32)-1},
				'l': {en:m._EnInt, de:m._DeInt, len:4, bSigned:true, min:-Math.pow(2, 31), max:Math.pow(2, 31)-1},
				'L': {en:m._EnInt, de:m._DeInt, len:4, bSigned:false, min:0, max:Math.pow(2, 32)-1},
				'f': {en:m._En754, de:m._De754, len:4, mLen:23, rt:Math.pow(2, -24)-Math.pow(2, -77)},
				'd': {en:m._En754, de:m._De754, len:8, mLen:52, rt:0},
				'q': {en:m._EnInt64, de:m._DeInt64, bSigned:true},
				'Q': {en:m._EnInt64, de:m._DeInt64, bSigned:false}};

	// Unpack a series of n elements of size s from array a at offset p with fxn
	m._UnpackSeries = function (n, s, a, p)
	{
		for (var fxn = el.de, rv = [], i = 0; i < n; rv.push(fxn(a, p+i*s)), i++);
		return rv;
	};

	// Pack a series of n elements of size s from array v at offset i to array a at offset p with fxn
	m._PackSeries = function (n, s, a, p, v, i)
	{
		for (var fxn = el.en, o = 0; o < n; fxn(a, p+o*s, v[i+o]), o++);
	};

	// Unpack the octet array a, beginning at offset p, according to the fmt string
	m.Unpack = function (fmt, a, p)
	{
		// Set the private bBE flag based on the format string - assume big-endianness
		bBE = (fmt.charAt(0) != '<');

		p = p?p:0;
		var re = new RegExp(this._sPattern, 'g'), m, n, s, rv = [];
		while (m = re.exec(fmt))
		{
			n = ((m[1]==undefined)||(m[1]==''))?1:parseInt(m[1]);
			s = this._lenLut[m[2]];
			if ((p + n*s) > a.length)
			{
				return undefined;
			}
			switch (m[2])
			{
				case 'A': case 's':
					rv.push(this._elLut[m[2]].de(a, p, n));
					break;
				case 'c': case 'b': case 'B': case 'h': case 'H':
				case 'i': case 'I': case 'l': case 'L': case 'f': case 'd': case 'q': case 'Q':
					el = this._elLut[m[2]];
					rv.push(this._UnpackSeries(n, s, a, p));
					break;
			}
			p += n*s;
		}
		return Array.prototype.concat.apply([], rv);
	};

	// Pack the supplied values into the octet array a, beginning at offset p, according to the fmt string
	m.PackTo = function (fmt, a, p, values)
	{
		// Set the private bBE flag based on the format string - assume big-endianness
		bBE = (fmt.charAt(0) != '<');

		var re = new RegExp(this._sPattern, 'g'), m, n, s, i = 0, j;
		while (m = re.exec(fmt))
		{
			n = ((m[1]==undefined)||(m[1]==''))?1:parseInt(m[1]);
			s = this._lenLut[m[2]];
			if ((p + n*s) > a.length)
			{
				return false;
			}
			switch (m[2])
			{
				case 'A': case 's':
					if ((i + 1) > values.length) { return false; }
					this._elLut[m[2]].en(a, p, n, values[i]);
					i += 1;
					break;
				case 'c': case 'b': case 'B': case 'h': case 'H':
				case 'i': case 'I': case 'l': case 'L': case 'f': case 'd': case 'q': case 'Q':
					el = this._elLut[m[2]];
					if ((i + n) > values.length) { return false; }
					this._PackSeries(n, s, a, p, values, i);
					i += n;
					break;
				case 'x':
					for (j = 0; j < n; j++) { a[p+j] = 0; }
					break;
			}
			p += n*s;
		}
		return a;
	};

	// Pack the supplied values into a new octet array, according to the fmt string
	m.Pack = function (fmt, values)
	{
		return this.PackTo(fmt, new Array(this.CalcLength(fmt)), 0, values);
	};

	// Determine the number of bytes represented by the format string
	m.CalcLength = function (fmt)
	{
		var re = new RegExp(this._sPattern, 'g'), m, sum = 0;
		while (m = re.exec(fmt))
		{
			sum += (((m[1]==undefined)||(m[1]==''))?1:parseInt(m[1])) * this._lenLut[m[2]];
		}
		return sum;
	};
};

exports.jspack = new JSPack();

},{}],64:[function(require,module,exports){
(function (global){(function (){
(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
  typeof define === 'function' && define.amd ? define('underscore', factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, (function () {
    var current = global._;
    var exports = global._ = factory();
    exports.noConflict = function () { global._ = current; return exports; };
  }()));
}(this, (function () {
  //     Underscore.js 1.13.7
  //     https://underscorejs.org
  //     (c) 2009-2024 Jeremy Ashkenas, Julian Gonggrijp, and DocumentCloud and Investigative Reporters & Editors
  //     Underscore may be freely distributed under the MIT license.

  // Current version.
  var VERSION = '1.13.7';

  // Establish the root object, `window` (`self`) in the browser, `global`
  // on the server, or `this` in some virtual machines. We use `self`
  // instead of `window` for `WebWorker` support.
  var root = (typeof self == 'object' && self.self === self && self) ||
            (typeof global == 'object' && global.global === global && global) ||
            Function('return this')() ||
            {};

  // Save bytes in the minified (but not gzipped) version:
  var ArrayProto = Array.prototype, ObjProto = Object.prototype;
  var SymbolProto = typeof Symbol !== 'undefined' ? Symbol.prototype : null;

  // Create quick reference variables for speed access to core prototypes.
  var push = ArrayProto.push,
      slice = ArrayProto.slice,
      toString = ObjProto.toString,
      hasOwnProperty = ObjProto.hasOwnProperty;

  // Modern feature detection.
  var supportsArrayBuffer = typeof ArrayBuffer !== 'undefined',
      supportsDataView = typeof DataView !== 'undefined';

  // All **ECMAScript 5+** native function implementations that we hope to use
  // are declared here.
  var nativeIsArray = Array.isArray,
      nativeKeys = Object.keys,
      nativeCreate = Object.create,
      nativeIsView = supportsArrayBuffer && ArrayBuffer.isView;

  // Create references to these builtin functions because we override them.
  var _isNaN = isNaN,
      _isFinite = isFinite;

  // Keys in IE < 9 that won't be iterated by `for key in ...` and thus missed.
  var hasEnumBug = !{toString: null}.propertyIsEnumerable('toString');
  var nonEnumerableProps = ['valueOf', 'isPrototypeOf', 'toString',
    'propertyIsEnumerable', 'hasOwnProperty', 'toLocaleString'];

  // The largest integer that can be represented exactly.
  var MAX_ARRAY_INDEX = Math.pow(2, 53) - 1;

  // Some functions take a variable number of arguments, or a few expected
  // arguments at the beginning and then a variable number of values to operate
  // on. This helper accumulates all remaining arguments past the function’s
  // argument length (or an explicit `startIndex`), into an array that becomes
  // the last argument. Similar to ES6’s "rest parameter".
  function restArguments(func, startIndex) {
    startIndex = startIndex == null ? func.length - 1 : +startIndex;
    return function() {
      var length = Math.max(arguments.length - startIndex, 0),
          rest = Array(length),
          index = 0;
      for (; index < length; index++) {
        rest[index] = arguments[index + startIndex];
      }
      switch (startIndex) {
        case 0: return func.call(this, rest);
        case 1: return func.call(this, arguments[0], rest);
        case 2: return func.call(this, arguments[0], arguments[1], rest);
      }
      var args = Array(startIndex + 1);
      for (index = 0; index < startIndex; index++) {
        args[index] = arguments[index];
      }
      args[startIndex] = rest;
      return func.apply(this, args);
    };
  }

  // Is a given variable an object?
  function isObject(obj) {
    var type = typeof obj;
    return type === 'function' || (type === 'object' && !!obj);
  }

  // Is a given value equal to null?
  function isNull(obj) {
    return obj === null;
  }

  // Is a given variable undefined?
  function isUndefined(obj) {
    return obj === void 0;
  }

  // Is a given value a boolean?
  function isBoolean(obj) {
    return obj === true || obj === false || toString.call(obj) === '[object Boolean]';
  }

  // Is a given value a DOM element?
  function isElement(obj) {
    return !!(obj && obj.nodeType === 1);
  }

  // Internal function for creating a `toString`-based type tester.
  function tagTester(name) {
    var tag = '[object ' + name + ']';
    return function(obj) {
      return toString.call(obj) === tag;
    };
  }

  var isString = tagTester('String');

  var isNumber = tagTester('Number');

  var isDate = tagTester('Date');

  var isRegExp = tagTester('RegExp');

  var isError = tagTester('Error');

  var isSymbol = tagTester('Symbol');

  var isArrayBuffer = tagTester('ArrayBuffer');

  var isFunction = tagTester('Function');

  // Optimize `isFunction` if appropriate. Work around some `typeof` bugs in old
  // v8, IE 11 (#1621), Safari 8 (#1929), and PhantomJS (#2236).
  var nodelist = root.document && root.document.childNodes;
  if (typeof /./ != 'function' && typeof Int8Array != 'object' && typeof nodelist != 'function') {
    isFunction = function(obj) {
      return typeof obj == 'function' || false;
    };
  }

  var isFunction$1 = isFunction;

  var hasObjectTag = tagTester('Object');

  // In IE 10 - Edge 13, `DataView` has string tag `'[object Object]'`.
  // In IE 11, the most common among them, this problem also applies to
  // `Map`, `WeakMap` and `Set`.
  // Also, there are cases where an application can override the native
  // `DataView` object, in cases like that we can't use the constructor
  // safely and should just rely on alternate `DataView` checks
  var hasDataViewBug = (
        supportsDataView && (!/\[native code\]/.test(String(DataView)) || hasObjectTag(new DataView(new ArrayBuffer(8))))
      ),
      isIE11 = (typeof Map !== 'undefined' && hasObjectTag(new Map));

  var isDataView = tagTester('DataView');

  // In IE 10 - Edge 13, we need a different heuristic
  // to determine whether an object is a `DataView`.
  // Also, in cases where the native `DataView` is
  // overridden we can't rely on the tag itself.
  function alternateIsDataView(obj) {
    return obj != null && isFunction$1(obj.getInt8) && isArrayBuffer(obj.buffer);
  }

  var isDataView$1 = (hasDataViewBug ? alternateIsDataView : isDataView);

  // Is a given value an array?
  // Delegates to ECMA5's native `Array.isArray`.
  var isArray = nativeIsArray || tagTester('Array');

  // Internal function to check whether `key` is an own property name of `obj`.
  function has$1(obj, key) {
    return obj != null && hasOwnProperty.call(obj, key);
  }

  var isArguments = tagTester('Arguments');

  // Define a fallback version of the method in browsers (ahem, IE < 9), where
  // there isn't any inspectable "Arguments" type.
  (function() {
    if (!isArguments(arguments)) {
      isArguments = function(obj) {
        return has$1(obj, 'callee');
      };
    }
  }());

  var isArguments$1 = isArguments;

  // Is a given object a finite number?
  function isFinite$1(obj) {
    return !isSymbol(obj) && _isFinite(obj) && !isNaN(parseFloat(obj));
  }

  // Is the given value `NaN`?
  function isNaN$1(obj) {
    return isNumber(obj) && _isNaN(obj);
  }

  // Predicate-generating function. Often useful outside of Underscore.
  function constant(value) {
    return function() {
      return value;
    };
  }

  // Common internal logic for `isArrayLike` and `isBufferLike`.
  function createSizePropertyCheck(getSizeProperty) {
    return function(collection) {
      var sizeProperty = getSizeProperty(collection);
      return typeof sizeProperty == 'number' && sizeProperty >= 0 && sizeProperty <= MAX_ARRAY_INDEX;
    }
  }

  // Internal helper to generate a function to obtain property `key` from `obj`.
  function shallowProperty(key) {
    return function(obj) {
      return obj == null ? void 0 : obj[key];
    };
  }

  // Internal helper to obtain the `byteLength` property of an object.
  var getByteLength = shallowProperty('byteLength');

  // Internal helper to determine whether we should spend extensive checks against
  // `ArrayBuffer` et al.
  var isBufferLike = createSizePropertyCheck(getByteLength);

  // Is a given value a typed array?
  var typedArrayPattern = /\[object ((I|Ui)nt(8|16|32)|Float(32|64)|Uint8Clamped|Big(I|Ui)nt64)Array\]/;
  function isTypedArray(obj) {
    // `ArrayBuffer.isView` is the most future-proof, so use it when available.
    // Otherwise, fall back on the above regular expression.
    return nativeIsView ? (nativeIsView(obj) && !isDataView$1(obj)) :
                  isBufferLike(obj) && typedArrayPattern.test(toString.call(obj));
  }

  var isTypedArray$1 = supportsArrayBuffer ? isTypedArray : constant(false);

  // Internal helper to obtain the `length` property of an object.
  var getLength = shallowProperty('length');

  // Internal helper to create a simple lookup structure.
  // `collectNonEnumProps` used to depend on `_.contains`, but this led to
  // circular imports. `emulatedSet` is a one-off solution that only works for
  // arrays of strings.
  function emulatedSet(keys) {
    var hash = {};
    for (var l = keys.length, i = 0; i < l; ++i) hash[keys[i]] = true;
    return {
      contains: function(key) { return hash[key] === true; },
      push: function(key) {
        hash[key] = true;
        return keys.push(key);
      }
    };
  }

  // Internal helper. Checks `keys` for the presence of keys in IE < 9 that won't
  // be iterated by `for key in ...` and thus missed. Extends `keys` in place if
  // needed.
  function collectNonEnumProps(obj, keys) {
    keys = emulatedSet(keys);
    var nonEnumIdx = nonEnumerableProps.length;
    var constructor = obj.constructor;
    var proto = (isFunction$1(constructor) && constructor.prototype) || ObjProto;

    // Constructor is a special case.
    var prop = 'constructor';
    if (has$1(obj, prop) && !keys.contains(prop)) keys.push(prop);

    while (nonEnumIdx--) {
      prop = nonEnumerableProps[nonEnumIdx];
      if (prop in obj && obj[prop] !== proto[prop] && !keys.contains(prop)) {
        keys.push(prop);
      }
    }
  }

  // Retrieve the names of an object's own properties.
  // Delegates to **ECMAScript 5**'s native `Object.keys`.
  function keys(obj) {
    if (!isObject(obj)) return [];
    if (nativeKeys) return nativeKeys(obj);
    var keys = [];
    for (var key in obj) if (has$1(obj, key)) keys.push(key);
    // Ahem, IE < 9.
    if (hasEnumBug) collectNonEnumProps(obj, keys);
    return keys;
  }

  // Is a given array, string, or object empty?
  // An "empty" object has no enumerable own-properties.
  function isEmpty(obj) {
    if (obj == null) return true;
    // Skip the more expensive `toString`-based type checks if `obj` has no
    // `.length`.
    var length = getLength(obj);
    if (typeof length == 'number' && (
      isArray(obj) || isString(obj) || isArguments$1(obj)
    )) return length === 0;
    return getLength(keys(obj)) === 0;
  }

  // Returns whether an object has a given set of `key:value` pairs.
  function isMatch(object, attrs) {
    var _keys = keys(attrs), length = _keys.length;
    if (object == null) return !length;
    var obj = Object(object);
    for (var i = 0; i < length; i++) {
      var key = _keys[i];
      if (attrs[key] !== obj[key] || !(key in obj)) return false;
    }
    return true;
  }

  // If Underscore is called as a function, it returns a wrapped object that can
  // be used OO-style. This wrapper holds altered versions of all functions added
  // through `_.mixin`. Wrapped objects may be chained.
  function _$1(obj) {
    if (obj instanceof _$1) return obj;
    if (!(this instanceof _$1)) return new _$1(obj);
    this._wrapped = obj;
  }

  _$1.VERSION = VERSION;

  // Extracts the result from a wrapped and chained object.
  _$1.prototype.value = function() {
    return this._wrapped;
  };

  // Provide unwrapping proxies for some methods used in engine operations
  // such as arithmetic and JSON stringification.
  _$1.prototype.valueOf = _$1.prototype.toJSON = _$1.prototype.value;

  _$1.prototype.toString = function() {
    return String(this._wrapped);
  };

  // Internal function to wrap or shallow-copy an ArrayBuffer,
  // typed array or DataView to a new view, reusing the buffer.
  function toBufferView(bufferSource) {
    return new Uint8Array(
      bufferSource.buffer || bufferSource,
      bufferSource.byteOffset || 0,
      getByteLength(bufferSource)
    );
  }

  // We use this string twice, so give it a name for minification.
  var tagDataView = '[object DataView]';

  // Internal recursive comparison function for `_.isEqual`.
  function eq(a, b, aStack, bStack) {
    // Identical objects are equal. `0 === -0`, but they aren't identical.
    // See the [Harmony `egal` proposal](https://wiki.ecmascript.org/doku.php?id=harmony:egal).
    if (a === b) return a !== 0 || 1 / a === 1 / b;
    // `null` or `undefined` only equal to itself (strict comparison).
    if (a == null || b == null) return false;
    // `NaN`s are equivalent, but non-reflexive.
    if (a !== a) return b !== b;
    // Exhaust primitive checks
    var type = typeof a;
    if (type !== 'function' && type !== 'object' && typeof b != 'object') return false;
    return deepEq(a, b, aStack, bStack);
  }

  // Internal recursive comparison function for `_.isEqual`.
  function deepEq(a, b, aStack, bStack) {
    // Unwrap any wrapped objects.
    if (a instanceof _$1) a = a._wrapped;
    if (b instanceof _$1) b = b._wrapped;
    // Compare `[[Class]]` names.
    var className = toString.call(a);
    if (className !== toString.call(b)) return false;
    // Work around a bug in IE 10 - Edge 13.
    if (hasDataViewBug && className == '[object Object]' && isDataView$1(a)) {
      if (!isDataView$1(b)) return false;
      className = tagDataView;
    }
    switch (className) {
      // These types are compared by value.
      case '[object RegExp]':
        // RegExps are coerced to strings for comparison (Note: '' + /a/i === '/a/i')
      case '[object String]':
        // Primitives and their corresponding object wrappers are equivalent; thus, `"5"` is
        // equivalent to `new String("5")`.
        return '' + a === '' + b;
      case '[object Number]':
        // `NaN`s are equivalent, but non-reflexive.
        // Object(NaN) is equivalent to NaN.
        if (+a !== +a) return +b !== +b;
        // An `egal` comparison is performed for other numeric values.
        return +a === 0 ? 1 / +a === 1 / b : +a === +b;
      case '[object Date]':
      case '[object Boolean]':
        // Coerce dates and booleans to numeric primitive values. Dates are compared by their
        // millisecond representations. Note that invalid dates with millisecond representations
        // of `NaN` are not equivalent.
        return +a === +b;
      case '[object Symbol]':
        return SymbolProto.valueOf.call(a) === SymbolProto.valueOf.call(b);
      case '[object ArrayBuffer]':
      case tagDataView:
        // Coerce to typed array so we can fall through.
        return deepEq(toBufferView(a), toBufferView(b), aStack, bStack);
    }

    var areArrays = className === '[object Array]';
    if (!areArrays && isTypedArray$1(a)) {
        var byteLength = getByteLength(a);
        if (byteLength !== getByteLength(b)) return false;
        if (a.buffer === b.buffer && a.byteOffset === b.byteOffset) return true;
        areArrays = true;
    }
    if (!areArrays) {
      if (typeof a != 'object' || typeof b != 'object') return false;

      // Objects with different constructors are not equivalent, but `Object`s or `Array`s
      // from different frames are.
      var aCtor = a.constructor, bCtor = b.constructor;
      if (aCtor !== bCtor && !(isFunction$1(aCtor) && aCtor instanceof aCtor &&
                               isFunction$1(bCtor) && bCtor instanceof bCtor)
                          && ('constructor' in a && 'constructor' in b)) {
        return false;
      }
    }
    // Assume equality for cyclic structures. The algorithm for detecting cyclic
    // structures is adapted from ES 5.1 section 15.12.3, abstract operation `JO`.

    // Initializing stack of traversed objects.
    // It's done here since we only need them for objects and arrays comparison.
    aStack = aStack || [];
    bStack = bStack || [];
    var length = aStack.length;
    while (length--) {
      // Linear search. Performance is inversely proportional to the number of
      // unique nested structures.
      if (aStack[length] === a) return bStack[length] === b;
    }

    // Add the first object to the stack of traversed objects.
    aStack.push(a);
    bStack.push(b);

    // Recursively compare objects and arrays.
    if (areArrays) {
      // Compare array lengths to determine if a deep comparison is necessary.
      length = a.length;
      if (length !== b.length) return false;
      // Deep compare the contents, ignoring non-numeric properties.
      while (length--) {
        if (!eq(a[length], b[length], aStack, bStack)) return false;
      }
    } else {
      // Deep compare objects.
      var _keys = keys(a), key;
      length = _keys.length;
      // Ensure that both objects contain the same number of properties before comparing deep equality.
      if (keys(b).length !== length) return false;
      while (length--) {
        // Deep compare each member
        key = _keys[length];
        if (!(has$1(b, key) && eq(a[key], b[key], aStack, bStack))) return false;
      }
    }
    // Remove the first object from the stack of traversed objects.
    aStack.pop();
    bStack.pop();
    return true;
  }

  // Perform a deep comparison to check if two objects are equal.
  function isEqual(a, b) {
    return eq(a, b);
  }

  // Retrieve all the enumerable property names of an object.
  function allKeys(obj) {
    if (!isObject(obj)) return [];
    var keys = [];
    for (var key in obj) keys.push(key);
    // Ahem, IE < 9.
    if (hasEnumBug) collectNonEnumProps(obj, keys);
    return keys;
  }

  // Since the regular `Object.prototype.toString` type tests don't work for
  // some types in IE 11, we use a fingerprinting heuristic instead, based
  // on the methods. It's not great, but it's the best we got.
  // The fingerprint method lists are defined below.
  function ie11fingerprint(methods) {
    var length = getLength(methods);
    return function(obj) {
      if (obj == null) return false;
      // `Map`, `WeakMap` and `Set` have no enumerable keys.
      var keys = allKeys(obj);
      if (getLength(keys)) return false;
      for (var i = 0; i < length; i++) {
        if (!isFunction$1(obj[methods[i]])) return false;
      }
      // If we are testing against `WeakMap`, we need to ensure that
      // `obj` doesn't have a `forEach` method in order to distinguish
      // it from a regular `Map`.
      return methods !== weakMapMethods || !isFunction$1(obj[forEachName]);
    };
  }

  // In the interest of compact minification, we write
  // each string in the fingerprints only once.
  var forEachName = 'forEach',
      hasName = 'has',
      commonInit = ['clear', 'delete'],
      mapTail = ['get', hasName, 'set'];

  // `Map`, `WeakMap` and `Set` each have slightly different
  // combinations of the above sublists.
  var mapMethods = commonInit.concat(forEachName, mapTail),
      weakMapMethods = commonInit.concat(mapTail),
      setMethods = ['add'].concat(commonInit, forEachName, hasName);

  var isMap = isIE11 ? ie11fingerprint(mapMethods) : tagTester('Map');

  var isWeakMap = isIE11 ? ie11fingerprint(weakMapMethods) : tagTester('WeakMap');

  var isSet = isIE11 ? ie11fingerprint(setMethods) : tagTester('Set');

  var isWeakSet = tagTester('WeakSet');

  // Retrieve the values of an object's properties.
  function values(obj) {
    var _keys = keys(obj);
    var length = _keys.length;
    var values = Array(length);
    for (var i = 0; i < length; i++) {
      values[i] = obj[_keys[i]];
    }
    return values;
  }

  // Convert an object into a list of `[key, value]` pairs.
  // The opposite of `_.object` with one argument.
  function pairs(obj) {
    var _keys = keys(obj);
    var length = _keys.length;
    var pairs = Array(length);
    for (var i = 0; i < length; i++) {
      pairs[i] = [_keys[i], obj[_keys[i]]];
    }
    return pairs;
  }

  // Invert the keys and values of an object. The values must be serializable.
  function invert(obj) {
    var result = {};
    var _keys = keys(obj);
    for (var i = 0, length = _keys.length; i < length; i++) {
      result[obj[_keys[i]]] = _keys[i];
    }
    return result;
  }

  // Return a sorted list of the function names available on the object.
  function functions(obj) {
    var names = [];
    for (var key in obj) {
      if (isFunction$1(obj[key])) names.push(key);
    }
    return names.sort();
  }

  // An internal function for creating assigner functions.
  function createAssigner(keysFunc, defaults) {
    return function(obj) {
      var length = arguments.length;
      if (defaults) obj = Object(obj);
      if (length < 2 || obj == null) return obj;
      for (var index = 1; index < length; index++) {
        var source = arguments[index],
            keys = keysFunc(source),
            l = keys.length;
        for (var i = 0; i < l; i++) {
          var key = keys[i];
          if (!defaults || obj[key] === void 0) obj[key] = source[key];
        }
      }
      return obj;
    };
  }

  // Extend a given object with all the properties in passed-in object(s).
  var extend = createAssigner(allKeys);

  // Assigns a given object with all the own properties in the passed-in
  // object(s).
  // (https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object/assign)
  var extendOwn = createAssigner(keys);

  // Fill in a given object with default properties.
  var defaults = createAssigner(allKeys, true);

  // Create a naked function reference for surrogate-prototype-swapping.
  function ctor() {
    return function(){};
  }

  // An internal function for creating a new object that inherits from another.
  function baseCreate(prototype) {
    if (!isObject(prototype)) return {};
    if (nativeCreate) return nativeCreate(prototype);
    var Ctor = ctor();
    Ctor.prototype = prototype;
    var result = new Ctor;
    Ctor.prototype = null;
    return result;
  }

  // Creates an object that inherits from the given prototype object.
  // If additional properties are provided then they will be added to the
  // created object.
  function create(prototype, props) {
    var result = baseCreate(prototype);
    if (props) extendOwn(result, props);
    return result;
  }

  // Create a (shallow-cloned) duplicate of an object.
  function clone(obj) {
    if (!isObject(obj)) return obj;
    return isArray(obj) ? obj.slice() : extend({}, obj);
  }

  // Invokes `interceptor` with the `obj` and then returns `obj`.
  // The primary purpose of this method is to "tap into" a method chain, in
  // order to perform operations on intermediate results within the chain.
  function tap(obj, interceptor) {
    interceptor(obj);
    return obj;
  }

  // Normalize a (deep) property `path` to array.
  // Like `_.iteratee`, this function can be customized.
  function toPath$1(path) {
    return isArray(path) ? path : [path];
  }
  _$1.toPath = toPath$1;

  // Internal wrapper for `_.toPath` to enable minification.
  // Similar to `cb` for `_.iteratee`.
  function toPath(path) {
    return _$1.toPath(path);
  }

  // Internal function to obtain a nested property in `obj` along `path`.
  function deepGet(obj, path) {
    var length = path.length;
    for (var i = 0; i < length; i++) {
      if (obj == null) return void 0;
      obj = obj[path[i]];
    }
    return length ? obj : void 0;
  }

  // Get the value of the (deep) property on `path` from `object`.
  // If any property in `path` does not exist or if the value is
  // `undefined`, return `defaultValue` instead.
  // The `path` is normalized through `_.toPath`.
  function get(object, path, defaultValue) {
    var value = deepGet(object, toPath(path));
    return isUndefined(value) ? defaultValue : value;
  }

  // Shortcut function for checking if an object has a given property directly on
  // itself (in other words, not on a prototype). Unlike the internal `has`
  // function, this public version can also traverse nested properties.
  function has(obj, path) {
    path = toPath(path);
    var length = path.length;
    for (var i = 0; i < length; i++) {
      var key = path[i];
      if (!has$1(obj, key)) return false;
      obj = obj[key];
    }
    return !!length;
  }

  // Keep the identity function around for default iteratees.
  function identity(value) {
    return value;
  }

  // Returns a predicate for checking whether an object has a given set of
  // `key:value` pairs.
  function matcher(attrs) {
    attrs = extendOwn({}, attrs);
    return function(obj) {
      return isMatch(obj, attrs);
    };
  }

  // Creates a function that, when passed an object, will traverse that object’s
  // properties down the given `path`, specified as an array of keys or indices.
  function property(path) {
    path = toPath(path);
    return function(obj) {
      return deepGet(obj, path);
    };
  }

  // Internal function that returns an efficient (for current engines) version
  // of the passed-in callback, to be repeatedly applied in other Underscore
  // functions.
  function optimizeCb(func, context, argCount) {
    if (context === void 0) return func;
    switch (argCount == null ? 3 : argCount) {
      case 1: return function(value) {
        return func.call(context, value);
      };
      // The 2-argument case is omitted because we’re not using it.
      case 3: return function(value, index, collection) {
        return func.call(context, value, index, collection);
      };
      case 4: return function(accumulator, value, index, collection) {
        return func.call(context, accumulator, value, index, collection);
      };
    }
    return function() {
      return func.apply(context, arguments);
    };
  }

  // An internal function to generate callbacks that can be applied to each
  // element in a collection, returning the desired result — either `_.identity`,
  // an arbitrary callback, a property matcher, or a property accessor.
  function baseIteratee(value, context, argCount) {
    if (value == null) return identity;
    if (isFunction$1(value)) return optimizeCb(value, context, argCount);
    if (isObject(value) && !isArray(value)) return matcher(value);
    return property(value);
  }

  // External wrapper for our callback generator. Users may customize
  // `_.iteratee` if they want additional predicate/iteratee shorthand styles.
  // This abstraction hides the internal-only `argCount` argument.
  function iteratee(value, context) {
    return baseIteratee(value, context, Infinity);
  }
  _$1.iteratee = iteratee;

  // The function we call internally to generate a callback. It invokes
  // `_.iteratee` if overridden, otherwise `baseIteratee`.
  function cb(value, context, argCount) {
    if (_$1.iteratee !== iteratee) return _$1.iteratee(value, context);
    return baseIteratee(value, context, argCount);
  }

  // Returns the results of applying the `iteratee` to each element of `obj`.
  // In contrast to `_.map` it returns an object.
  function mapObject(obj, iteratee, context) {
    iteratee = cb(iteratee, context);
    var _keys = keys(obj),
        length = _keys.length,
        results = {};
    for (var index = 0; index < length; index++) {
      var currentKey = _keys[index];
      results[currentKey] = iteratee(obj[currentKey], currentKey, obj);
    }
    return results;
  }

  // Predicate-generating function. Often useful outside of Underscore.
  function noop(){}

  // Generates a function for a given object that returns a given property.
  function propertyOf(obj) {
    if (obj == null) return noop;
    return function(path) {
      return get(obj, path);
    };
  }

  // Run a function **n** times.
  function times(n, iteratee, context) {
    var accum = Array(Math.max(0, n));
    iteratee = optimizeCb(iteratee, context, 1);
    for (var i = 0; i < n; i++) accum[i] = iteratee(i);
    return accum;
  }

  // Return a random integer between `min` and `max` (inclusive).
  function random(min, max) {
    if (max == null) {
      max = min;
      min = 0;
    }
    return min + Math.floor(Math.random() * (max - min + 1));
  }

  // A (possibly faster) way to get the current timestamp as an integer.
  var now = Date.now || function() {
    return new Date().getTime();
  };

  // Internal helper to generate functions for escaping and unescaping strings
  // to/from HTML interpolation.
  function createEscaper(map) {
    var escaper = function(match) {
      return map[match];
    };
    // Regexes for identifying a key that needs to be escaped.
    var source = '(?:' + keys(map).join('|') + ')';
    var testRegexp = RegExp(source);
    var replaceRegexp = RegExp(source, 'g');
    return function(string) {
      string = string == null ? '' : '' + string;
      return testRegexp.test(string) ? string.replace(replaceRegexp, escaper) : string;
    };
  }

  // Internal list of HTML entities for escaping.
  var escapeMap = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '`': '&#x60;'
  };

  // Function for escaping strings to HTML interpolation.
  var _escape = createEscaper(escapeMap);

  // Internal list of HTML entities for unescaping.
  var unescapeMap = invert(escapeMap);

  // Function for unescaping strings from HTML interpolation.
  var _unescape = createEscaper(unescapeMap);

  // By default, Underscore uses ERB-style template delimiters. Change the
  // following template settings to use alternative delimiters.
  var templateSettings = _$1.templateSettings = {
    evaluate: /<%([\s\S]+?)%>/g,
    interpolate: /<%=([\s\S]+?)%>/g,
    escape: /<%-([\s\S]+?)%>/g
  };

  // When customizing `_.templateSettings`, if you don't want to define an
  // interpolation, evaluation or escaping regex, we need one that is
  // guaranteed not to match.
  var noMatch = /(.)^/;

  // Certain characters need to be escaped so that they can be put into a
  // string literal.
  var escapes = {
    "'": "'",
    '\\': '\\',
    '\r': 'r',
    '\n': 'n',
    '\u2028': 'u2028',
    '\u2029': 'u2029'
  };

  var escapeRegExp = /\\|'|\r|\n|\u2028|\u2029/g;

  function escapeChar(match) {
    return '\\' + escapes[match];
  }

  // In order to prevent third-party code injection through
  // `_.templateSettings.variable`, we test it against the following regular
  // expression. It is intentionally a bit more liberal than just matching valid
  // identifiers, but still prevents possible loopholes through defaults or
  // destructuring assignment.
  var bareIdentifier = /^\s*(\w|\$)+\s*$/;

  // JavaScript micro-templating, similar to John Resig's implementation.
  // Underscore templating handles arbitrary delimiters, preserves whitespace,
  // and correctly escapes quotes within interpolated code.
  // NB: `oldSettings` only exists for backwards compatibility.
  function template(text, settings, oldSettings) {
    if (!settings && oldSettings) settings = oldSettings;
    settings = defaults({}, settings, _$1.templateSettings);

    // Combine delimiters into one regular expression via alternation.
    var matcher = RegExp([
      (settings.escape || noMatch).source,
      (settings.interpolate || noMatch).source,
      (settings.evaluate || noMatch).source
    ].join('|') + '|$', 'g');

    // Compile the template source, escaping string literals appropriately.
    var index = 0;
    var source = "__p+='";
    text.replace(matcher, function(match, escape, interpolate, evaluate, offset) {
      source += text.slice(index, offset).replace(escapeRegExp, escapeChar);
      index = offset + match.length;

      if (escape) {
        source += "'+\n((__t=(" + escape + "))==null?'':_.escape(__t))+\n'";
      } else if (interpolate) {
        source += "'+\n((__t=(" + interpolate + "))==null?'':__t)+\n'";
      } else if (evaluate) {
        source += "';\n" + evaluate + "\n__p+='";
      }

      // Adobe VMs need the match returned to produce the correct offset.
      return match;
    });
    source += "';\n";

    var argument = settings.variable;
    if (argument) {
      // Insure against third-party code injection. (CVE-2021-23358)
      if (!bareIdentifier.test(argument)) throw new Error(
        'variable is not a bare identifier: ' + argument
      );
    } else {
      // If a variable is not specified, place data values in local scope.
      source = 'with(obj||{}){\n' + source + '}\n';
      argument = 'obj';
    }

    source = "var __t,__p='',__j=Array.prototype.join," +
      "print=function(){__p+=__j.call(arguments,'');};\n" +
      source + 'return __p;\n';

    var render;
    try {
      render = new Function(argument, '_', source);
    } catch (e) {
      e.source = source;
      throw e;
    }

    var template = function(data) {
      return render.call(this, data, _$1);
    };

    // Provide the compiled source as a convenience for precompilation.
    template.source = 'function(' + argument + '){\n' + source + '}';

    return template;
  }

  // Traverses the children of `obj` along `path`. If a child is a function, it
  // is invoked with its parent as context. Returns the value of the final
  // child, or `fallback` if any child is undefined.
  function result(obj, path, fallback) {
    path = toPath(path);
    var length = path.length;
    if (!length) {
      return isFunction$1(fallback) ? fallback.call(obj) : fallback;
    }
    for (var i = 0; i < length; i++) {
      var prop = obj == null ? void 0 : obj[path[i]];
      if (prop === void 0) {
        prop = fallback;
        i = length; // Ensure we don't continue iterating.
      }
      obj = isFunction$1(prop) ? prop.call(obj) : prop;
    }
    return obj;
  }

  // Generate a unique integer id (unique within the entire client session).
  // Useful for temporary DOM ids.
  var idCounter = 0;
  function uniqueId(prefix) {
    var id = ++idCounter + '';
    return prefix ? prefix + id : id;
  }

  // Start chaining a wrapped Underscore object.
  function chain(obj) {
    var instance = _$1(obj);
    instance._chain = true;
    return instance;
  }

  // Internal function to execute `sourceFunc` bound to `context` with optional
  // `args`. Determines whether to execute a function as a constructor or as a
  // normal function.
  function executeBound(sourceFunc, boundFunc, context, callingContext, args) {
    if (!(callingContext instanceof boundFunc)) return sourceFunc.apply(context, args);
    var self = baseCreate(sourceFunc.prototype);
    var result = sourceFunc.apply(self, args);
    if (isObject(result)) return result;
    return self;
  }

  // Partially apply a function by creating a version that has had some of its
  // arguments pre-filled, without changing its dynamic `this` context. `_` acts
  // as a placeholder by default, allowing any combination of arguments to be
  // pre-filled. Set `_.partial.placeholder` for a custom placeholder argument.
  var partial = restArguments(function(func, boundArgs) {
    var placeholder = partial.placeholder;
    var bound = function() {
      var position = 0, length = boundArgs.length;
      var args = Array(length);
      for (var i = 0; i < length; i++) {
        args[i] = boundArgs[i] === placeholder ? arguments[position++] : boundArgs[i];
      }
      while (position < arguments.length) args.push(arguments[position++]);
      return executeBound(func, bound, this, this, args);
    };
    return bound;
  });

  partial.placeholder = _$1;

  // Create a function bound to a given object (assigning `this`, and arguments,
  // optionally).
  var bind = restArguments(function(func, context, args) {
    if (!isFunction$1(func)) throw new TypeError('Bind must be called on a function');
    var bound = restArguments(function(callArgs) {
      return executeBound(func, bound, context, this, args.concat(callArgs));
    });
    return bound;
  });

  // Internal helper for collection methods to determine whether a collection
  // should be iterated as an array or as an object.
  // Related: https://people.mozilla.org/~jorendorff/es6-draft.html#sec-tolength
  // Avoids a very nasty iOS 8 JIT bug on ARM-64. #2094
  var isArrayLike = createSizePropertyCheck(getLength);

  // Internal implementation of a recursive `flatten` function.
  function flatten$1(input, depth, strict, output) {
    output = output || [];
    if (!depth && depth !== 0) {
      depth = Infinity;
    } else if (depth <= 0) {
      return output.concat(input);
    }
    var idx = output.length;
    for (var i = 0, length = getLength(input); i < length; i++) {
      var value = input[i];
      if (isArrayLike(value) && (isArray(value) || isArguments$1(value))) {
        // Flatten current level of array or arguments object.
        if (depth > 1) {
          flatten$1(value, depth - 1, strict, output);
          idx = output.length;
        } else {
          var j = 0, len = value.length;
          while (j < len) output[idx++] = value[j++];
        }
      } else if (!strict) {
        output[idx++] = value;
      }
    }
    return output;
  }

  // Bind a number of an object's methods to that object. Remaining arguments
  // are the method names to be bound. Useful for ensuring that all callbacks
  // defined on an object belong to it.
  var bindAll = restArguments(function(obj, keys) {
    keys = flatten$1(keys, false, false);
    var index = keys.length;
    if (index < 1) throw new Error('bindAll must be passed function names');
    while (index--) {
      var key = keys[index];
      obj[key] = bind(obj[key], obj);
    }
    return obj;
  });

  // Memoize an expensive function by storing its results.
  function memoize(func, hasher) {
    var memoize = function(key) {
      var cache = memoize.cache;
      var address = '' + (hasher ? hasher.apply(this, arguments) : key);
      if (!has$1(cache, address)) cache[address] = func.apply(this, arguments);
      return cache[address];
    };
    memoize.cache = {};
    return memoize;
  }

  // Delays a function for the given number of milliseconds, and then calls
  // it with the arguments supplied.
  var delay = restArguments(function(func, wait, args) {
    return setTimeout(function() {
      return func.apply(null, args);
    }, wait);
  });

  // Defers a function, scheduling it to run after the current call stack has
  // cleared.
  var defer = partial(delay, _$1, 1);

  // Returns a function, that, when invoked, will only be triggered at most once
  // during a given window of time. Normally, the throttled function will run
  // as much as it can, without ever going more than once per `wait` duration;
  // but if you'd like to disable the execution on the leading edge, pass
  // `{leading: false}`. To disable execution on the trailing edge, ditto.
  function throttle(func, wait, options) {
    var timeout, context, args, result;
    var previous = 0;
    if (!options) options = {};

    var later = function() {
      previous = options.leading === false ? 0 : now();
      timeout = null;
      result = func.apply(context, args);
      if (!timeout) context = args = null;
    };

    var throttled = function() {
      var _now = now();
      if (!previous && options.leading === false) previous = _now;
      var remaining = wait - (_now - previous);
      context = this;
      args = arguments;
      if (remaining <= 0 || remaining > wait) {
        if (timeout) {
          clearTimeout(timeout);
          timeout = null;
        }
        previous = _now;
        result = func.apply(context, args);
        if (!timeout) context = args = null;
      } else if (!timeout && options.trailing !== false) {
        timeout = setTimeout(later, remaining);
      }
      return result;
    };

    throttled.cancel = function() {
      clearTimeout(timeout);
      previous = 0;
      timeout = context = args = null;
    };

    return throttled;
  }

  // When a sequence of calls of the returned function ends, the argument
  // function is triggered. The end of a sequence is defined by the `wait`
  // parameter. If `immediate` is passed, the argument function will be
  // triggered at the beginning of the sequence instead of at the end.
  function debounce(func, wait, immediate) {
    var timeout, previous, args, result, context;

    var later = function() {
      var passed = now() - previous;
      if (wait > passed) {
        timeout = setTimeout(later, wait - passed);
      } else {
        timeout = null;
        if (!immediate) result = func.apply(context, args);
        // This check is needed because `func` can recursively invoke `debounced`.
        if (!timeout) args = context = null;
      }
    };

    var debounced = restArguments(function(_args) {
      context = this;
      args = _args;
      previous = now();
      if (!timeout) {
        timeout = setTimeout(later, wait);
        if (immediate) result = func.apply(context, args);
      }
      return result;
    });

    debounced.cancel = function() {
      clearTimeout(timeout);
      timeout = args = context = null;
    };

    return debounced;
  }

  // Returns the first function passed as an argument to the second,
  // allowing you to adjust arguments, run code before and after, and
  // conditionally execute the original function.
  function wrap(func, wrapper) {
    return partial(wrapper, func);
  }

  // Returns a negated version of the passed-in predicate.
  function negate(predicate) {
    return function() {
      return !predicate.apply(this, arguments);
    };
  }

  // Returns a function that is the composition of a list of functions, each
  // consuming the return value of the function that follows.
  function compose() {
    var args = arguments;
    var start = args.length - 1;
    return function() {
      var i = start;
      var result = args[start].apply(this, arguments);
      while (i--) result = args[i].call(this, result);
      return result;
    };
  }

  // Returns a function that will only be executed on and after the Nth call.
  function after(times, func) {
    return function() {
      if (--times < 1) {
        return func.apply(this, arguments);
      }
    };
  }

  // Returns a function that will only be executed up to (but not including) the
  // Nth call.
  function before(times, func) {
    var memo;
    return function() {
      if (--times > 0) {
        memo = func.apply(this, arguments);
      }
      if (times <= 1) func = null;
      return memo;
    };
  }

  // Returns a function that will be executed at most one time, no matter how
  // often you call it. Useful for lazy initialization.
  var once = partial(before, 2);

  // Returns the first key on an object that passes a truth test.
  function findKey(obj, predicate, context) {
    predicate = cb(predicate, context);
    var _keys = keys(obj), key;
    for (var i = 0, length = _keys.length; i < length; i++) {
      key = _keys[i];
      if (predicate(obj[key], key, obj)) return key;
    }
  }

  // Internal function to generate `_.findIndex` and `_.findLastIndex`.
  function createPredicateIndexFinder(dir) {
    return function(array, predicate, context) {
      predicate = cb(predicate, context);
      var length = getLength(array);
      var index = dir > 0 ? 0 : length - 1;
      for (; index >= 0 && index < length; index += dir) {
        if (predicate(array[index], index, array)) return index;
      }
      return -1;
    };
  }

  // Returns the first index on an array-like that passes a truth test.
  var findIndex = createPredicateIndexFinder(1);

  // Returns the last index on an array-like that passes a truth test.
  var findLastIndex = createPredicateIndexFinder(-1);

  // Use a comparator function to figure out the smallest index at which
  // an object should be inserted so as to maintain order. Uses binary search.
  function sortedIndex(array, obj, iteratee, context) {
    iteratee = cb(iteratee, context, 1);
    var value = iteratee(obj);
    var low = 0, high = getLength(array);
    while (low < high) {
      var mid = Math.floor((low + high) / 2);
      if (iteratee(array[mid]) < value) low = mid + 1; else high = mid;
    }
    return low;
  }

  // Internal function to generate the `_.indexOf` and `_.lastIndexOf` functions.
  function createIndexFinder(dir, predicateFind, sortedIndex) {
    return function(array, item, idx) {
      var i = 0, length = getLength(array);
      if (typeof idx == 'number') {
        if (dir > 0) {
          i = idx >= 0 ? idx : Math.max(idx + length, i);
        } else {
          length = idx >= 0 ? Math.min(idx + 1, length) : idx + length + 1;
        }
      } else if (sortedIndex && idx && length) {
        idx = sortedIndex(array, item);
        return array[idx] === item ? idx : -1;
      }
      if (item !== item) {
        idx = predicateFind(slice.call(array, i, length), isNaN$1);
        return idx >= 0 ? idx + i : -1;
      }
      for (idx = dir > 0 ? i : length - 1; idx >= 0 && idx < length; idx += dir) {
        if (array[idx] === item) return idx;
      }
      return -1;
    };
  }

  // Return the position of the first occurrence of an item in an array,
  // or -1 if the item is not included in the array.
  // If the array is large and already in sort order, pass `true`
  // for **isSorted** to use binary search.
  var indexOf = createIndexFinder(1, findIndex, sortedIndex);

  // Return the position of the last occurrence of an item in an array,
  // or -1 if the item is not included in the array.
  var lastIndexOf = createIndexFinder(-1, findLastIndex);

  // Return the first value which passes a truth test.
  function find(obj, predicate, context) {
    var keyFinder = isArrayLike(obj) ? findIndex : findKey;
    var key = keyFinder(obj, predicate, context);
    if (key !== void 0 && key !== -1) return obj[key];
  }

  // Convenience version of a common use case of `_.find`: getting the first
  // object containing specific `key:value` pairs.
  function findWhere(obj, attrs) {
    return find(obj, matcher(attrs));
  }

  // The cornerstone for collection functions, an `each`
  // implementation, aka `forEach`.
  // Handles raw objects in addition to array-likes. Treats all
  // sparse array-likes as if they were dense.
  function each(obj, iteratee, context) {
    iteratee = optimizeCb(iteratee, context);
    var i, length;
    if (isArrayLike(obj)) {
      for (i = 0, length = obj.length; i < length; i++) {
        iteratee(obj[i], i, obj);
      }
    } else {
      var _keys = keys(obj);
      for (i = 0, length = _keys.length; i < length; i++) {
        iteratee(obj[_keys[i]], _keys[i], obj);
      }
    }
    return obj;
  }

  // Return the results of applying the iteratee to each element.
  function map(obj, iteratee, context) {
    iteratee = cb(iteratee, context);
    var _keys = !isArrayLike(obj) && keys(obj),
        length = (_keys || obj).length,
        results = Array(length);
    for (var index = 0; index < length; index++) {
      var currentKey = _keys ? _keys[index] : index;
      results[index] = iteratee(obj[currentKey], currentKey, obj);
    }
    return results;
  }

  // Internal helper to create a reducing function, iterating left or right.
  function createReduce(dir) {
    // Wrap code that reassigns argument variables in a separate function than
    // the one that accesses `arguments.length` to avoid a perf hit. (#1991)
    var reducer = function(obj, iteratee, memo, initial) {
      var _keys = !isArrayLike(obj) && keys(obj),
          length = (_keys || obj).length,
          index = dir > 0 ? 0 : length - 1;
      if (!initial) {
        memo = obj[_keys ? _keys[index] : index];
        index += dir;
      }
      for (; index >= 0 && index < length; index += dir) {
        var currentKey = _keys ? _keys[index] : index;
        memo = iteratee(memo, obj[currentKey], currentKey, obj);
      }
      return memo;
    };

    return function(obj, iteratee, memo, context) {
      var initial = arguments.length >= 3;
      return reducer(obj, optimizeCb(iteratee, context, 4), memo, initial);
    };
  }

  // **Reduce** builds up a single result from a list of values, aka `inject`,
  // or `foldl`.
  var reduce = createReduce(1);

  // The right-associative version of reduce, also known as `foldr`.
  var reduceRight = createReduce(-1);

  // Return all the elements that pass a truth test.
  function filter(obj, predicate, context) {
    var results = [];
    predicate = cb(predicate, context);
    each(obj, function(value, index, list) {
      if (predicate(value, index, list)) results.push(value);
    });
    return results;
  }

  // Return all the elements for which a truth test fails.
  function reject(obj, predicate, context) {
    return filter(obj, negate(cb(predicate)), context);
  }

  // Determine whether all of the elements pass a truth test.
  function every(obj, predicate, context) {
    predicate = cb(predicate, context);
    var _keys = !isArrayLike(obj) && keys(obj),
        length = (_keys || obj).length;
    for (var index = 0; index < length; index++) {
      var currentKey = _keys ? _keys[index] : index;
      if (!predicate(obj[currentKey], currentKey, obj)) return false;
    }
    return true;
  }

  // Determine if at least one element in the object passes a truth test.
  function some(obj, predicate, context) {
    predicate = cb(predicate, context);
    var _keys = !isArrayLike(obj) && keys(obj),
        length = (_keys || obj).length;
    for (var index = 0; index < length; index++) {
      var currentKey = _keys ? _keys[index] : index;
      if (predicate(obj[currentKey], currentKey, obj)) return true;
    }
    return false;
  }

  // Determine if the array or object contains a given item (using `===`).
  function contains(obj, item, fromIndex, guard) {
    if (!isArrayLike(obj)) obj = values(obj);
    if (typeof fromIndex != 'number' || guard) fromIndex = 0;
    return indexOf(obj, item, fromIndex) >= 0;
  }

  // Invoke a method (with arguments) on every item in a collection.
  var invoke = restArguments(function(obj, path, args) {
    var contextPath, func;
    if (isFunction$1(path)) {
      func = path;
    } else {
      path = toPath(path);
      contextPath = path.slice(0, -1);
      path = path[path.length - 1];
    }
    return map(obj, function(context) {
      var method = func;
      if (!method) {
        if (contextPath && contextPath.length) {
          context = deepGet(context, contextPath);
        }
        if (context == null) return void 0;
        method = context[path];
      }
      return method == null ? method : method.apply(context, args);
    });
  });

  // Convenience version of a common use case of `_.map`: fetching a property.
  function pluck(obj, key) {
    return map(obj, property(key));
  }

  // Convenience version of a common use case of `_.filter`: selecting only
  // objects containing specific `key:value` pairs.
  function where(obj, attrs) {
    return filter(obj, matcher(attrs));
  }

  // Return the maximum element (or element-based computation).
  function max(obj, iteratee, context) {
    var result = -Infinity, lastComputed = -Infinity,
        value, computed;
    if (iteratee == null || (typeof iteratee == 'number' && typeof obj[0] != 'object' && obj != null)) {
      obj = isArrayLike(obj) ? obj : values(obj);
      for (var i = 0, length = obj.length; i < length; i++) {
        value = obj[i];
        if (value != null && value > result) {
          result = value;
        }
      }
    } else {
      iteratee = cb(iteratee, context);
      each(obj, function(v, index, list) {
        computed = iteratee(v, index, list);
        if (computed > lastComputed || (computed === -Infinity && result === -Infinity)) {
          result = v;
          lastComputed = computed;
        }
      });
    }
    return result;
  }

  // Return the minimum element (or element-based computation).
  function min(obj, iteratee, context) {
    var result = Infinity, lastComputed = Infinity,
        value, computed;
    if (iteratee == null || (typeof iteratee == 'number' && typeof obj[0] != 'object' && obj != null)) {
      obj = isArrayLike(obj) ? obj : values(obj);
      for (var i = 0, length = obj.length; i < length; i++) {
        value = obj[i];
        if (value != null && value < result) {
          result = value;
        }
      }
    } else {
      iteratee = cb(iteratee, context);
      each(obj, function(v, index, list) {
        computed = iteratee(v, index, list);
        if (computed < lastComputed || (computed === Infinity && result === Infinity)) {
          result = v;
          lastComputed = computed;
        }
      });
    }
    return result;
  }

  // Safely create a real, live array from anything iterable.
  var reStrSymbol = /[^\ud800-\udfff]|[\ud800-\udbff][\udc00-\udfff]|[\ud800-\udfff]/g;
  function toArray(obj) {
    if (!obj) return [];
    if (isArray(obj)) return slice.call(obj);
    if (isString(obj)) {
      // Keep surrogate pair characters together.
      return obj.match(reStrSymbol);
    }
    if (isArrayLike(obj)) return map(obj, identity);
    return values(obj);
  }

  // Sample **n** random values from a collection using the modern version of the
  // [Fisher-Yates shuffle](https://en.wikipedia.org/wiki/Fisher–Yates_shuffle).
  // If **n** is not specified, returns a single random element.
  // The internal `guard` argument allows it to work with `_.map`.
  function sample(obj, n, guard) {
    if (n == null || guard) {
      if (!isArrayLike(obj)) obj = values(obj);
      return obj[random(obj.length - 1)];
    }
    var sample = toArray(obj);
    var length = getLength(sample);
    n = Math.max(Math.min(n, length), 0);
    var last = length - 1;
    for (var index = 0; index < n; index++) {
      var rand = random(index, last);
      var temp = sample[index];
      sample[index] = sample[rand];
      sample[rand] = temp;
    }
    return sample.slice(0, n);
  }

  // Shuffle a collection.
  function shuffle(obj) {
    return sample(obj, Infinity);
  }

  // Sort the object's values by a criterion produced by an iteratee.
  function sortBy(obj, iteratee, context) {
    var index = 0;
    iteratee = cb(iteratee, context);
    return pluck(map(obj, function(value, key, list) {
      return {
        value: value,
        index: index++,
        criteria: iteratee(value, key, list)
      };
    }).sort(function(left, right) {
      var a = left.criteria;
      var b = right.criteria;
      if (a !== b) {
        if (a > b || a === void 0) return 1;
        if (a < b || b === void 0) return -1;
      }
      return left.index - right.index;
    }), 'value');
  }

  // An internal function used for aggregate "group by" operations.
  function group(behavior, partition) {
    return function(obj, iteratee, context) {
      var result = partition ? [[], []] : {};
      iteratee = cb(iteratee, context);
      each(obj, function(value, index) {
        var key = iteratee(value, index, obj);
        behavior(result, value, key);
      });
      return result;
    };
  }

  // Groups the object's values by a criterion. Pass either a string attribute
  // to group by, or a function that returns the criterion.
  var groupBy = group(function(result, value, key) {
    if (has$1(result, key)) result[key].push(value); else result[key] = [value];
  });

  // Indexes the object's values by a criterion, similar to `_.groupBy`, but for
  // when you know that your index values will be unique.
  var indexBy = group(function(result, value, key) {
    result[key] = value;
  });

  // Counts instances of an object that group by a certain criterion. Pass
  // either a string attribute to count by, or a function that returns the
  // criterion.
  var countBy = group(function(result, value, key) {
    if (has$1(result, key)) result[key]++; else result[key] = 1;
  });

  // Split a collection into two arrays: one whose elements all pass the given
  // truth test, and one whose elements all do not pass the truth test.
  var partition = group(function(result, value, pass) {
    result[pass ? 0 : 1].push(value);
  }, true);

  // Return the number of elements in a collection.
  function size(obj) {
    if (obj == null) return 0;
    return isArrayLike(obj) ? obj.length : keys(obj).length;
  }

  // Internal `_.pick` helper function to determine whether `key` is an enumerable
  // property name of `obj`.
  function keyInObj(value, key, obj) {
    return key in obj;
  }

  // Return a copy of the object only containing the allowed properties.
  var pick = restArguments(function(obj, keys) {
    var result = {}, iteratee = keys[0];
    if (obj == null) return result;
    if (isFunction$1(iteratee)) {
      if (keys.length > 1) iteratee = optimizeCb(iteratee, keys[1]);
      keys = allKeys(obj);
    } else {
      iteratee = keyInObj;
      keys = flatten$1(keys, false, false);
      obj = Object(obj);
    }
    for (var i = 0, length = keys.length; i < length; i++) {
      var key = keys[i];
      var value = obj[key];
      if (iteratee(value, key, obj)) result[key] = value;
    }
    return result;
  });

  // Return a copy of the object without the disallowed properties.
  var omit = restArguments(function(obj, keys) {
    var iteratee = keys[0], context;
    if (isFunction$1(iteratee)) {
      iteratee = negate(iteratee);
      if (keys.length > 1) context = keys[1];
    } else {
      keys = map(flatten$1(keys, false, false), String);
      iteratee = function(value, key) {
        return !contains(keys, key);
      };
    }
    return pick(obj, iteratee, context);
  });

  // Returns everything but the last entry of the array. Especially useful on
  // the arguments object. Passing **n** will return all the values in
  // the array, excluding the last N.
  function initial(array, n, guard) {
    return slice.call(array, 0, Math.max(0, array.length - (n == null || guard ? 1 : n)));
  }

  // Get the first element of an array. Passing **n** will return the first N
  // values in the array. The **guard** check allows it to work with `_.map`.
  function first(array, n, guard) {
    if (array == null || array.length < 1) return n == null || guard ? void 0 : [];
    if (n == null || guard) return array[0];
    return initial(array, array.length - n);
  }

  // Returns everything but the first entry of the `array`. Especially useful on
  // the `arguments` object. Passing an **n** will return the rest N values in the
  // `array`.
  function rest(array, n, guard) {
    return slice.call(array, n == null || guard ? 1 : n);
  }

  // Get the last element of an array. Passing **n** will return the last N
  // values in the array.
  function last(array, n, guard) {
    if (array == null || array.length < 1) return n == null || guard ? void 0 : [];
    if (n == null || guard) return array[array.length - 1];
    return rest(array, Math.max(0, array.length - n));
  }

  // Trim out all falsy values from an array.
  function compact(array) {
    return filter(array, Boolean);
  }

  // Flatten out an array, either recursively (by default), or up to `depth`.
  // Passing `true` or `false` as `depth` means `1` or `Infinity`, respectively.
  function flatten(array, depth) {
    return flatten$1(array, depth, false);
  }

  // Take the difference between one array and a number of other arrays.
  // Only the elements present in just the first array will remain.
  var difference = restArguments(function(array, rest) {
    rest = flatten$1(rest, true, true);
    return filter(array, function(value){
      return !contains(rest, value);
    });
  });

  // Return a version of the array that does not contain the specified value(s).
  var without = restArguments(function(array, otherArrays) {
    return difference(array, otherArrays);
  });

  // Produce a duplicate-free version of the array. If the array has already
  // been sorted, you have the option of using a faster algorithm.
  // The faster algorithm will not work with an iteratee if the iteratee
  // is not a one-to-one function, so providing an iteratee will disable
  // the faster algorithm.
  function uniq(array, isSorted, iteratee, context) {
    if (!isBoolean(isSorted)) {
      context = iteratee;
      iteratee = isSorted;
      isSorted = false;
    }
    if (iteratee != null) iteratee = cb(iteratee, context);
    var result = [];
    var seen = [];
    for (var i = 0, length = getLength(array); i < length; i++) {
      var value = array[i],
          computed = iteratee ? iteratee(value, i, array) : value;
      if (isSorted && !iteratee) {
        if (!i || seen !== computed) result.push(value);
        seen = computed;
      } else if (iteratee) {
        if (!contains(seen, computed)) {
          seen.push(computed);
          result.push(value);
        }
      } else if (!contains(result, value)) {
        result.push(value);
      }
    }
    return result;
  }

  // Produce an array that contains the union: each distinct element from all of
  // the passed-in arrays.
  var union = restArguments(function(arrays) {
    return uniq(flatten$1(arrays, true, true));
  });

  // Produce an array that contains every item shared between all the
  // passed-in arrays.
  function intersection(array) {
    var result = [];
    var argsLength = arguments.length;
    for (var i = 0, length = getLength(array); i < length; i++) {
      var item = array[i];
      if (contains(result, item)) continue;
      var j;
      for (j = 1; j < argsLength; j++) {
        if (!contains(arguments[j], item)) break;
      }
      if (j === argsLength) result.push(item);
    }
    return result;
  }

  // Complement of zip. Unzip accepts an array of arrays and groups
  // each array's elements on shared indices.
  function unzip(array) {
    var length = (array && max(array, getLength).length) || 0;
    var result = Array(length);

    for (var index = 0; index < length; index++) {
      result[index] = pluck(array, index);
    }
    return result;
  }

  // Zip together multiple lists into a single array -- elements that share
  // an index go together.
  var zip = restArguments(unzip);

  // Converts lists into objects. Pass either a single array of `[key, value]`
  // pairs, or two parallel arrays of the same length -- one of keys, and one of
  // the corresponding values. Passing by pairs is the reverse of `_.pairs`.
  function object(list, values) {
    var result = {};
    for (var i = 0, length = getLength(list); i < length; i++) {
      if (values) {
        result[list[i]] = values[i];
      } else {
        result[list[i][0]] = list[i][1];
      }
    }
    return result;
  }

  // Generate an integer Array containing an arithmetic progression. A port of
  // the native Python `range()` function. See
  // [the Python documentation](https://docs.python.org/library/functions.html#range).
  function range(start, stop, step) {
    if (stop == null) {
      stop = start || 0;
      start = 0;
    }
    if (!step) {
      step = stop < start ? -1 : 1;
    }

    var length = Math.max(Math.ceil((stop - start) / step), 0);
    var range = Array(length);

    for (var idx = 0; idx < length; idx++, start += step) {
      range[idx] = start;
    }

    return range;
  }

  // Chunk a single array into multiple arrays, each containing `count` or fewer
  // items.
  function chunk(array, count) {
    if (count == null || count < 1) return [];
    var result = [];
    var i = 0, length = array.length;
    while (i < length) {
      result.push(slice.call(array, i, i += count));
    }
    return result;
  }

  // Helper function to continue chaining intermediate results.
  function chainResult(instance, obj) {
    return instance._chain ? _$1(obj).chain() : obj;
  }

  // Add your own custom functions to the Underscore object.
  function mixin(obj) {
    each(functions(obj), function(name) {
      var func = _$1[name] = obj[name];
      _$1.prototype[name] = function() {
        var args = [this._wrapped];
        push.apply(args, arguments);
        return chainResult(this, func.apply(_$1, args));
      };
    });
    return _$1;
  }

  // Add all mutator `Array` functions to the wrapper.
  each(['pop', 'push', 'reverse', 'shift', 'sort', 'splice', 'unshift'], function(name) {
    var method = ArrayProto[name];
    _$1.prototype[name] = function() {
      var obj = this._wrapped;
      if (obj != null) {
        method.apply(obj, arguments);
        if ((name === 'shift' || name === 'splice') && obj.length === 0) {
          delete obj[0];
        }
      }
      return chainResult(this, obj);
    };
  });

  // Add all accessor `Array` functions to the wrapper.
  each(['concat', 'join', 'slice'], function(name) {
    var method = ArrayProto[name];
    _$1.prototype[name] = function() {
      var obj = this._wrapped;
      if (obj != null) obj = method.apply(obj, arguments);
      return chainResult(this, obj);
    };
  });

  // Named Exports

  var allExports = {
    __proto__: null,
    VERSION: VERSION,
    restArguments: restArguments,
    isObject: isObject,
    isNull: isNull,
    isUndefined: isUndefined,
    isBoolean: isBoolean,
    isElement: isElement,
    isString: isString,
    isNumber: isNumber,
    isDate: isDate,
    isRegExp: isRegExp,
    isError: isError,
    isSymbol: isSymbol,
    isArrayBuffer: isArrayBuffer,
    isDataView: isDataView$1,
    isArray: isArray,
    isFunction: isFunction$1,
    isArguments: isArguments$1,
    isFinite: isFinite$1,
    isNaN: isNaN$1,
    isTypedArray: isTypedArray$1,
    isEmpty: isEmpty,
    isMatch: isMatch,
    isEqual: isEqual,
    isMap: isMap,
    isWeakMap: isWeakMap,
    isSet: isSet,
    isWeakSet: isWeakSet,
    keys: keys,
    allKeys: allKeys,
    values: values,
    pairs: pairs,
    invert: invert,
    functions: functions,
    methods: functions,
    extend: extend,
    extendOwn: extendOwn,
    assign: extendOwn,
    defaults: defaults,
    create: create,
    clone: clone,
    tap: tap,
    get: get,
    has: has,
    mapObject: mapObject,
    identity: identity,
    constant: constant,
    noop: noop,
    toPath: toPath$1,
    property: property,
    propertyOf: propertyOf,
    matcher: matcher,
    matches: matcher,
    times: times,
    random: random,
    now: now,
    escape: _escape,
    unescape: _unescape,
    templateSettings: templateSettings,
    template: template,
    result: result,
    uniqueId: uniqueId,
    chain: chain,
    iteratee: iteratee,
    partial: partial,
    bind: bind,
    bindAll: bindAll,
    memoize: memoize,
    delay: delay,
    defer: defer,
    throttle: throttle,
    debounce: debounce,
    wrap: wrap,
    negate: negate,
    compose: compose,
    after: after,
    before: before,
    once: once,
    findKey: findKey,
    findIndex: findIndex,
    findLastIndex: findLastIndex,
    sortedIndex: sortedIndex,
    indexOf: indexOf,
    lastIndexOf: lastIndexOf,
    find: find,
    detect: find,
    findWhere: findWhere,
    each: each,
    forEach: each,
    map: map,
    collect: map,
    reduce: reduce,
    foldl: reduce,
    inject: reduce,
    reduceRight: reduceRight,
    foldr: reduceRight,
    filter: filter,
    select: filter,
    reject: reject,
    every: every,
    all: every,
    some: some,
    any: some,
    contains: contains,
    includes: contains,
    include: contains,
    invoke: invoke,
    pluck: pluck,
    where: where,
    max: max,
    min: min,
    shuffle: shuffle,
    sample: sample,
    sortBy: sortBy,
    groupBy: groupBy,
    indexBy: indexBy,
    countBy: countBy,
    partition: partition,
    toArray: toArray,
    size: size,
    pick: pick,
    omit: omit,
    first: first,
    head: first,
    take: first,
    initial: initial,
    last: last,
    rest: rest,
    tail: rest,
    drop: rest,
    compact: compact,
    flatten: flatten,
    without: without,
    uniq: uniq,
    unique: uniq,
    union: union,
    intersection: intersection,
    difference: difference,
    unzip: unzip,
    transpose: unzip,
    zip: zip,
    object: object,
    range: range,
    chunk: chunk,
    mixin: mixin,
    'default': _$1
  };

  // Default Export

  // Add all of the Underscore functions to the wrapper object.
  var _ = mixin(allExports);
  // Legacy Node.js API.
  _._ = _;

  return _;

})));


}).call(this)}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}]},{},[62]);
