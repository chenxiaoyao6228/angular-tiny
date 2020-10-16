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

const deepCompare = (
  actual,
  expected,
  comparator,
  matchAnyProperty,
  inWildcard
) => {
  if (utils.isString(expected) && expected.startsWith('!')) {
    return !deepCompare(
      actual,
      expected.substring(1),
      comparator,
      matchAnyProperty
    )
  }
  if (utils.isArray(actual)) {
    return actual.some(actualItem => {
      return deepCompare(actualItem, expected, comparator, matchAnyProperty)
    })
  }
  if (utils.isObject(actual)) {
    if (utils.isObject(expected) && !inWildcard) {
      return utils.every(
        utils.toPlainObject(expected),
        (expectedVal, expectedKey) => {
          if (utils.isUndefined(expectedVal)) {
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
        }
      )
    } else if (matchAnyProperty) {
      return utils.some(actual, value => {
        return deepCompare(value, expected, comparator, matchAnyProperty)
      })
    } else {
      return comparator(actual, expected)
    }
  } else {
    return comparator(actual, expected)
  }
}

const createPredicateFn = (expression, comparator) => {
  let shouldMatchPrimitives = utils.isObject(expression) && '$' in expression
  if (comparator === true) {
    comparator = utils.isEqual
  } else if (!utils.isFunction(comparator)) {
    comparator = function comparator(actual, expected) {
      if (utils.isUndefined(actual)) {
        return false
      }
      if (utils.isNull(actual) || utils.isNull(expected)) {
        return actual === expected
      }
      actual = ('' + actual).toLowerCase()
      expected = ('' + expected).toLowerCase()
      return actual.indexOf(expected) !== -1
    }
  }
  return function predicateFn(item) {
    if (shouldMatchPrimitives && !utils.isObject(item)) {
      return deepCompare(item, expression.$, comparator)
    }
    return deepCompare(item, expression, comparator, true)
  }
}

const filterFilter = () => (array, filterExpr, comparator) => {
  let predicateFn
  if (utils.isFunction(filterExpr)) {
    predicateFn = filterExpr
  } else if (
    utils.isString(filterExpr) ||
    utils.isNumber(filterExpr) ||
    utils.isBoolean(filterExpr) ||
    utils.isNull(filterExpr) ||
    utils.isObject(filterExpr)
  ) {
    predicateFn = createPredicateFn(filterExpr, comparator)
  } else {
    return array
  }
  return array.filter(predicateFn)
}

export default function $FilterProvider($provide) {
  this.register = function(name, factory) {
    if (utils.isObject(name)) {
      return utils.map(name, (factory, name) => {
        return this.register(name, factory)
      })
    } else {
      return $provide.factory(name + 'Filter', factory)
    }
  }
  this.$get = [
    '$injector',
    function($injector) {
      return function filter(name) {
        return $injector.get(name + 'Filter')
      }
    }
  ]
  this.register('filter', filterFilter)
}
$FilterProvider.$inject = ['$provide']
