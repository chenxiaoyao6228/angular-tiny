function $ControllerProvider() {
  this.$get = [
    '$injector',
    function($injector) {
      return function(ctrl, locals) {
        return $injector.instantiate(ctrl, locals)
      }
    }
  ]
}
export default $ControllerProvider
