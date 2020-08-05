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
  if (_.isString(expected) && _.startsWith(expected, '!')) {
    return !deepCompare(actual, expected.substring(1), comparator)
  }
  if (_.isArray(actual)) {
    return _.some(actual, actualItem => {
      return deepCompare(actualItem, expected, comparator)
    })
  }
  if (_.isObject(actual)) {
    if (_.isObject(expected)) {
      return _.every(_.toPlainObject(expected), (expectedVal, expectedKey) => {
        if (_.isUndefined(expectedVal)) {
          return true
        }
        return deepCompare(actual[expectedKey], expectedVal, comparator)
      })
    } else {
      return _.some(actual, value => {
        return deepCompare(value, expected, comparator)
      })
    }
  } else {
    return comparator(actual, expected)
  }
}

const createPredicateFn = expression => {
  function comparator(actual, expected) {
    if (_.isUndefined(actual)) {
      return false
    }
    if (_.isNull(actual) || _.isNull(expected)) {
      return actual === expected
    }
    actual = ('' + actual).toLowerCase()
    expected = ('' + expected).toLowerCase()
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
  } else if (
    _.isString(filterExpr) ||
    _.isNumber(filterExpr) ||
    _.isBoolean(filterExpr) ||
    _.isNull(filterExpr) ||
    _.isObject(filterExpr)
  ) {
    predicateFn = createPredicateFn(filterExpr)
  } else {
    return array
  }
  return array.filter(predicateFn)
}

register('filter', filterFilter)

export { register, filter }
