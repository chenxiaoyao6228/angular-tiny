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
      return function(ctrl, locals, identifier) {
        if (utils.isString(ctrl)) {
          if (Object.prototype.hasOwnProperty.call(controllers, ctrl)) {
            ctrl = controllers[ctrl]
          } else if (globals) {
            ctrl = window[ctrl]
          }
        }
        let instance = $injector.instantiate(ctrl, locals)
        if (identifier) {
          addToScope(locals, identifier, instance)
        }
        return instance

        function addToScope(locals, identifier, instance) {
          if (locals && utils.isObject(locals.$scope)) {
            locals.$scope[identifier] = instance
          } else {
            throw 'Cannot export controller as ' +
              identifier +
              '! No $scope object provided via locals'
          }
        }
      }
    }
  ]
}
export default $ControllerProvider
