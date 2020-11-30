function $ControllerProvider() {
  this.$get = [
    '$injector',
    function($injector) {
      return function(ctrl) {
        return $injector.instantiate(ctrl)
      }
    }
  ]
}
export default $ControllerProvider
