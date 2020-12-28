import utils from './utils'

let CNTRL_REG = /^(\S+)(\s+as\s+(\w+))?/

function identifierForController(ctrl) {
  if (utils.isString(ctrl)) {
    let match = CNTRL_REG.exec(ctrl)
    if (match) {
      return match[3]
    }
  }
}

function addToScope(locals, identifier, instance) {
  if (locals && utils.isObject(locals.$scope)) {
    locals.$scope[identifier] = instance
  } else {
    throw 'Cannot export controller as ' +
      identifier +
      '! No $scope object provided via locals'
  }
}

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
      return function(ctrl, locals, later, identifier) {
        if (utils.isString(ctrl)) {
          let match = ctrl.match(CNTRL_REG)
          ctrl = match[1]
          identifier = identifier || match[3]
          if (Object.hasOwnProperty.call(controllers, ctrl)) {
            ctrl = controllers[ctrl]
          } else {
            ctrl =
              (locals && locals.$scope && locals.$scope[ctrl]) ||
              (globals && window[ctrl])
          }
        }
        let instance
        if (later) {
          let ctrlConstructor = utils.isArray(ctrl) ? utils.last(ctrl) : ctrl
          instance = Object.create(ctrlConstructor.prototype)
          if (identifier) {
            addToScope(locals, identifier, instance)
          }
          return utils.extend(
            () => {
              $injector.invoke(ctrl, instance, locals)
              return instance
            },
            { instance: instance }
          )
        } else {
          instance = $injector.instantiate(ctrl, locals)
          if (identifier) {
            addToScope(locals, identifier, instance)
          }
          return instance
        }
      }
    }
  ]
}
export { $ControllerProvider, identifierForController }
