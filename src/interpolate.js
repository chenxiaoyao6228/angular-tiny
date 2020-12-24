import utils from './utils'
function $InterpolateProvider() {
  this.$get = [
    '$parse',
    function($parse) {
      return function $interpolate(text) {
        let index = 0
        let parts = []
        let startIndex, endIndex, exp, expFn
        while (index < text.length) {
          startIndex = text.indexOf('{{', index)
          if (startIndex !== -1) {
            endIndex = text.indexOf('}}', startIndex + 2)
          }
          if (startIndex !== -1 && endIndex !== -1) {
            if (startIndex !== index) {
              parts.push(text.substring(index, startIndex))
            }
            exp = text.substring(startIndex + 2, endIndex)
            expFn = $parse(exp)
            parts.push(expFn)
            index = endIndex + 2
          } else {
            parts.push(text.substring(index))
            break
          }
        }
        return function interpolationFn(context) {
          return parts.reduce((result, part) => {
            if (utils.isFunction(part)) {
              return result + stringify(part(context))
            } else {
              return result + part
            }
          }, '')
        }
      }
    }
  ]
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
