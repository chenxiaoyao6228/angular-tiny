import _ from 'lodash'

function times(n, iterator) {
  let accumulator = Array(Math.max(0, n))
  for (let i = 0; i < n; i++) accumulator[i] = iterator.call(null, i)
  return accumulator
}

function deepEqual(a, b) {
  if (a && b && typeof a == 'object' && typeof b == 'object') {
    if (Object.keys(a).length != Object.keys(b).length) return false
    for (let key in a) if (!deepEqual(a[key], b[key])) return false
    return true
  } else return a === b
}

function deepClone(a) {
  // return JSON.parse(JSON.stringify(a)) // 不能处理值为function的情况
  return _.cloneDeep(a)
}

function clone(a) {
  return _.clone(a)
}

function forEachRight(arr, callback) {
  let len = arr.length
  for (let i = len - 1; i >= 0; i--) {
    let flag = callback(arr[i])
    if (flag === false) return
  }
}

function isObject(obj) {
  // return obj instanceof Object => 无法处理NodeList的情况
  return _.isObject(obj)
}

function isArray(obj) {
  return Array.isArray(obj)
}

function isArrayLike(obj) {
  if (isNull(obj) || isUndefined(obj)) {
    return false
  }
  let length = obj.length
  return length === 0 || (_.isNumber(length) && length > 0 && length - 1 in obj)
}

function isPlainObject(obj) {
  if (typeof obj == 'object' && obj !== null) {
    if (typeof Object.getPrototypeOf == 'function') {
      let proto = Object.getPrototypeOf(obj)
      return proto === Object.prototype || proto === null
    }
    return Object.prototype.toString.call(obj) == '[object Object]'
  }

  return false
}

function forEach(value, operator) {
  if (isArrayLike(value)) {
    return Array.from(value).forEach(operator)
  } else if (isObject(value)) {
    return Object.entries(value).forEach(v => {
      let [key, val] = v
      return operator(key, val)
    })
  }
}

function isString(value) {
  return _.isString(value)
}

function isNull(value) {
  return value === null
}

function initial(value) {
  return _.initial(value)
}

function last(value) {
  return value.slice(-1)[0]
}

function isEmpty(obj) {
  return (
    [Object, Array].includes((obj || {}).constructor) &&
    !Object.entries(obj || {}).length
  )
}
function isFunction(fn) {
  return _.isFunction(fn)
}
function isUndefined(val) {
  return val === undefined
}
function isNumber(val) {
  return _.isNumber(val)
}
function isBoolean(val) {
  return _.isBoolean(val)
}

function repeat(s, times) {
  return s.repeat(times)
}

function some(value, predicate) {
  if (isArrayLike(value)) {
    return Array.from(value).some(predicate)
  } else {
    // eslint-disable-next-line you-dont-need-lodash-underscore/some
    return _.some(value, predicate)
  }
}

function every(value, predicate) {
  if (isArrayLike(value)) {
    return Array.from(value).every(predicate)
  } else {
    // eslint-disable-next-line you-dont-need-lodash-underscore/every
    return _.every(value, predicate)
  }
}

function extend(...args) {
  return _.extend(...args)
}
function toPlainObject(val) {
  return _.toPlainObject(val)
}

function forOwn(val, predicate) {
  return _.forOwn(val, predicate)
}
function isNaN(val) {
  return Number.isNaN(val)
}

function isEqual(a, b) {
  return _.isEqual(a, b)
}

function map(val, operator) {
  // eslint-disable-next-line you-dont-need-lodash-underscore/map
  return _.map(val, operator)
}

function uniqueId() {
  return _.uniqueId()
}

function isDate(date) {
  return _.isDate(date)
}

let transform = _.transform

export default {
  times,
  deepEqual,
  deepClone,
  clone,
  forEachRight,
  isObject,
  isArray,
  isArrayLike,
  isDate,
  isPlainObject,
  forEach,
  isString,
  isNull,
  isEqual,
  initial,
  last,
  isEmpty,
  isNaN,
  isFunction,
  isUndefined,
  isNumber,
  isBoolean,
  repeat,
  some,
  every,
  extend,
  toPlainObject,
  forOwn,
  map,
  uniqueId,
  transform
}
