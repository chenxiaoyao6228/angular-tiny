import _ from 'lodash'
import utils from './utils'
let filters = {}

function register(name, factory) {
  if (utils.isObject(name)) {
    Object.keys(name).map(n => {
      return register(n, name[n])
    })
  } else {
    let filter = factory()
    filters[name] = filter
    return filter
  }
}

function filter(name) {
  return filters[name]
}

export { register, filter }
