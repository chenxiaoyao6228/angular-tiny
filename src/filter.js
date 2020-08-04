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

const deepCompare = (actual, expected, comparator) => {
  if (_.isObject(actual)) {
    return _.some(actual, value => {
      return deepCompare(value, expected, comparator)
    })
  } else {
    return comparator(actual, expected)
  }
}

const createPredicateFn = expression => {
  function comparator(actual, expected) {
    actual = actual.toLowerCase()
    expected = expected.toLowerCase()
    return actual.indexOf(expected) !== -1
  }
  return function predicateFn(item) {
    return deepCompare(item, expression, comparator)
  }
}

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
