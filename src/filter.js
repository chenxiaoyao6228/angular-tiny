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

const deepCompare = (
  actual,
  expected,
  comparator,
  matchAnyProperty,
  inWildcard
) => {
  if (_.isString(expected) && _.startsWith(expected, '!')) {
    return !deepCompare(
      actual,
      expected.substring(1),
      comparator,
      matchAnyProperty
    )
  }
  if (_.isArray(actual)) {
    return _.some(actual, actualItem => {
      return deepCompare(actualItem, expected, comparator, matchAnyProperty)
    })
  }
  if (_.isObject(actual)) {
    if (_.isObject(expected) && !inWildcard) {
      return _.every(_.toPlainObject(expected), (expectedVal, expectedKey) => {
        if (_.isUndefined(expectedVal)) {
          return true
        }
        let isWildcard = expectedKey === '$'
        let actualVal = isWildcard ? actual : actual[expectedKey]
        return deepCompare(
          actualVal,
          expectedVal,
          comparator,
          isWildcard,
          isWildcard
        )
      })
    } else if (matchAnyProperty) {
      return _.some(actual, value => {
        return deepCompare(value, expected, comparator, matchAnyProperty)
      })
    } else {
      return comparator(actual, expected)
    }
  } else {
    return comparator(actual, expected)
  }
}

const createPredicateFn = expression => {
  let shouldMatchPrimitives = _.isObject(expression) && '$' in expression
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
    if (shouldMatchPrimitives && !_.isObject(item)) {
      return deepCompare(item, expression.$, comparator)
    }
    return deepCompare(item, expression, comparator, true)
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
