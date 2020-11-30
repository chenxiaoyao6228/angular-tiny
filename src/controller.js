import utils from './utils'
function $ControllerProvider() {
  let controllers = {}
  let globals = false
  this.allowGlobals = function() {
    globals = true
  }
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
          if (Object.prototype.hasOwnProperty.call(controllers, ctrl)) {
            ctrl = controllers[ctrl]
          } else if (globals) {
            ctrl = window[ctrl]
          }
        }
        return $injector.instantiate(ctrl, locals)
      }
    }
  ]
}
export default $ControllerProvider
