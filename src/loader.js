export function setupModuleLoader(window) {
  let ensure = function(obj, name, factory) {
    return obj[name] || (obj[name] = factory())
  }

  let angular = ensure(window, 'angular', Object)

  let createModule = function(name, requires, modules) {
    if (name === 'hasOwnProperty') {
      throw 'hasOwnProperty is not a valid module name'
    }
    let invokeQueue = []

    let moduleInstance = {
      name: name,
      requires: requires,
      constant: invokeLater('constant', 'unshift'),
      provider: invokeLater('provider'),
      _invokeQueue: invokeQueue
    }
    function invokeLater(method, arrayMethod) {
      return function() {
        invokeQueue[arrayMethod || 'push']([method, arguments])
        return moduleInstance
      }
    }

    modules[name] = moduleInstance
    return moduleInstance
  }
  let getModule = function(name, modules) {
    if (Object.prototype.hasOwnProperty.call(modules, name)) {
      return modules[name]
    } else {
      throw `Module ${name} is not available`
    }
  }

  ensure(angular, 'module', () => {
    let modules = {}
    return function(name, requires) {
      if (requires) {
        return createModule(name, requires, modules)
      } else {
        return getModule(name, modules)
      }
    }
  })
}
