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
function forEachRight(arr, callback) {
  let len = arr.length
  for (let i = len - 1; i >= 0; i--) {
    let flag = callback(arr[i])
    if (flag === false) return
  }
}

export default {
  times,
  deepEqual,
  deepClone,
  forEachRight
}
