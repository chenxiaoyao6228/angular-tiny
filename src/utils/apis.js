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

export class HashMap {
  constructor() {}
  put(key, value) {
    this[hashKey(key)] = value
  }
  get(key) {
    return this[hashKey(key)]
  }
  remove(key) {
    let value = this[hashKey(key)]
    delete this[hashKey(key)]
    return value
  }
}
