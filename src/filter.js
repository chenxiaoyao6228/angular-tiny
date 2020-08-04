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

const createPredicateFn = expression => item => item === expression

const filterFilter = () => (array, filterExpr) => {
  let predicateFn
  if (_.isFunction(filterExpr)) {
    predicateFn = filterExpr
  } else if (_.isString(filterExpr)) {
    predicateFn = createPredicateFn(filterExpr)
  } else {
    return array
  }
  return array.filter(predicateFn)
}

register('filter', filterFilter)

export { register, filter }
