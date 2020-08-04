import _ from 'lodash'
import utils from './utils'
let filters = {}

const register = (name, factory) => {
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

const filter = name => filters[name]

const filterFilter = () => (array, filterExpr) => array.filter(filterExpr)

register('filter', filterFilter)

export { register, filter }
