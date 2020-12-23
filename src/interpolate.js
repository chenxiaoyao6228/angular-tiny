function $InterpolateProvider() {
  this.$get = function() {
    return function $interpolate(text) {
      return function interpolationFn() {
        return text
      }
    }
  }
}

export default $InterpolateProvider
