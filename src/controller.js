import utils from './utils'
function $ControllerProvider() {
  let controllers = {}
  this.register = function(name, controller) {
    if (utils.isObject(name)) {
      Object.assign(controllers, name)
    } else {
      controllers[name] = controller
    }
  }
  this.$get = [
    '$injector',
    function($injector) {
      return function(ctrl, locals) {
        if (utils.isString(ctrl)) {
          ctrl = controllers[ctrl]
        }
        return $injector.instantiate(ctrl, locals)
      }
    }
  ]
}
export default $ControllerProvider
