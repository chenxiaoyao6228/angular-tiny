export function setupModuleLoader(window) {
  let ensure = function(obj, name, factory) {
    return obj[name] || (obj[name] = factory())
  }
  let angular = ensure(window, 'angular', Object)

  ensure(angular, 'module', () => () => {})
}
