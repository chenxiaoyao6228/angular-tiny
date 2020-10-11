export function setupModuleLoader(window) {
  let ensure = function(obj, name, factory) {
    return obj[name] || (obj[name] = factory())
  }

  let angular = ensure(window, 'angular', Object)

  let createModule = function(name, requires) {
    let moduleInstance = {
      name: name,
      requires: requires
    }
    return moduleInstance
  }

  ensure(angular, 'module', () => (name, requires) =>
    createModule(name, requires)
  )
}
