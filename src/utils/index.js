import _ from 'lodash'

function times(n, iterator) {
  let accum = Array(Math.max(0, n))
  for (let i = 0; i < n; i++) accum[i] = iterator.call(null, i)
  return accum
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
  if (_.isNull(obj) || _.isUndefined(obj)) {
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

function forEach(array, operator) {
  return _.forEach(array, operator)
}

function isString(value) {
  return _.isString(value)
}

function isNull(value) {
  return _.isNull(value)
}

function initial(value) {
  return _.initial(value)
}

function last(value) {
  return _.last(value)
}

function isEmpty(obj) {
  return (
    [Object, Array].includes((obj || {}).constructor) &&
    !Object.entries(obj || {}).length
  )
}

export default {
  times,
  deepEqual,
  deepClone,
  clone,
  forEachRight,
  isObject,
  isArray,
  isArrayLike,
  isPlainObject,
  forEach,
  isString,
  isNull,
  initial,
  last,
  isEmpty
}
