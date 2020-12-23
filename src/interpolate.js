function $InterpolateProvider() {
  this.$get = [
    '$parse',
    function($parse) {
      return function $interpolate(text) {
        let startIndex = text.indexOf('{{')
        let endIndex = text.indexOf('}}')
        let exp, expFn
        if (startIndex !== -1 && endIndex !== -1) {
          exp = text.substring(startIndex + 2, endIndex)
          expFn = $parse(exp)
        }
        return function interpolationFn(context) {
          if (expFn) {
            return expFn(context)
          } else {
            return text
          }
        }
      }
    }
  ]
}

export default $InterpolateProvider
