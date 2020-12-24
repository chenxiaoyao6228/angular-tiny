import utils from './utils'
function $InterpolateProvider() {
  this.$get = [
    '$parse',
    function($parse) {
      return function $interpolate(text, mustHaveExpression) {
        let index = 0
        let parts = []
        let expressions = []
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
            return parts.reduce((result, part) => {
              if (utils.isFunction(part)) {
                return result + stringify(part(context))
              } else {
                return result + part
              }
            }, '')
          }
          utils.extend(interpolationFn, { expressions })
          return interpolationFn
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
