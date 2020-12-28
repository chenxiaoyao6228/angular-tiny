import utils from './utils'
function $InterpolateProvider() {
  this.$get = [
    '$parse',
    function($parse) {
      return function $interpolate(text, mustHaveExpression) {
        let index = 0
        let parts = []
        let expressions = []
        let expressionFns = []
        let expressionPositions = []
        let startIndex, endIndex, exp, expFn
        let hasExpressions = false
        while (index < text.length) {
          startIndex = text.indexOf('{{', index)
          if (startIndex !== -1) {
            endIndex = text.indexOf('}}', startIndex + 2)
          }
          if (startIndex !== -1 && endIndex !== -1) {
            if (startIndex !== index) {
              parts.push(unescapeText(text.substring(index, startIndex)))
            }
            exp = text.substring(startIndex + 2, endIndex)
            expressions.push(exp)
            expFn = $parse(exp)
            expressionFns.push(expFn)
            expressionPositions.push(parts.length)
            parts.push(expFn)
            hasExpressions = true
            index = endIndex + 2
          } else {
            parts.push(unescapeText(text.substring(index)))
            break
          }
        }
        if (hasExpressions || !mustHaveExpression) {
          let interpolationFn = function(context) {
            let values = utils.map(expressionFns, expressionFn => {
              return expressionFn(context)
            })
            return compute(values)
          }
          utils.extend(interpolationFn, {
            expressions,
            $$watchDelegate: function(scope, listener) {
              let lastValue
              return scope.$watchGroup(
                expressionFns,
                (newValues, oldValues) => {
                  let newValue = compute(newValues)
                  listener(
                    newValue,
                    utils.isEqual(newValues, oldValues) ? newValue : lastValue,
                    scope
                  )
                  lastValue = newValue
                }
              )
            }
          })
          return interpolationFn
        }
        // 提前将值计算好
        function compute(values) {
          utils.forEach(values, (value, i) => {
            parts[expressionPositions[i]] = stringify(value)
          })
          return parts.join('')
        }
      }
    }
  ]
}
function unescapeText(text) {
  return text.replace(/\\{\\{/, '{{').replace(/\\}\\}/g, '}}')
}
function stringify(value) {
  if (value === undefined || value === null) {
    return ''
  } else if (utils.isObject(value)) {
    return JSON.stringify(value)
  } else {
    return '' + value
  }
}

export default $InterpolateProvider
