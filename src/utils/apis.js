import utils from '.'

// ES6 already ships with hashMap, still implement it for learning purpose

export function hashKey(value) {
  let type = typeof value
  if ((type === 'object' && value !== null) || type === 'function') {
    if (!value.$$hashKey) {
      value.$$hashKey = '' + utils.uniqueId()
    } else if (typeof value.$$hashKey === 'function') {
      value.$$hashKey = '' + value.$$hashKey.call(value)
    }
    return `${type}:${value.$$hashKey}`
  } else {
    return `${type}:${value}`
  }
}
