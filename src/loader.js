// module: controller, services, filters, directives的一系列集合
// angular.module: 用来创建模块
export function setupModuleLoader(window) {
  let ensure = function(obj, name, factory) {
    return obj[name] || (obj[name] = factory())
  }

  let angular = ensure(window, 'angular', Object) // 单例

  let createModule = function(name, requires, modules, configFn) {
    if (name === 'hasOwnProperty') {
      throw 'hasOwnProperty is not a valid module name'
    }
    let invokeQueue = []
    let configBlocks = []

    function invokeLater(service, method, arrayMethod, queue) {
      return function() {
        let item = [service, method, arguments]
        queue[arrayMethod](item)
        return moduleInstance
      }
    }

    let moduleInstance = {
      name: name,
      requires: requires,
      constant: invokeLater('$provide', 'constant', 'unshift', invokeQueue),
      provider: invokeLater('$provide', 'provider', 'push', invokeQueue),
      factory: invokeLater('$provide', 'factory', 'push', invokeQueue),
      value: invokeLater('$provide', 'value', 'push', invokeQueue),
      service: invokeLater('$provide', 'service', 'push', invokeQueue),
      decorator: invokeLater('$provide', 'decorator', 'push', invokeQueue),
      controller: invokeLater(
        '$controllerProvider',
        'register',
        'push',
        invokeQueue
      ),
      directive: invokeLater(
        '$compileProvider',
        'directive',
        'push',
        invokeQueue
      ),
      component: invokeLater(
        '$compileProvider',
        'component',
        'push',
        invokeQueue
      ),
      filter: invokeLater('$filterProvider', 'register', 'push', invokeQueue),
      config: invokeLater('$injector', 'invoke', 'push', configBlocks),
      run: fn => {
        moduleInstance._runBlocks.push(fn)
        return moduleInstance
      },
      _runBlocks: [],
      _invokeQueue: invokeQueue,
      _configBlock: configBlocks
    }

    if (configFn) {
      moduleInstance.config(configFn)
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
    return function(name, requires, configFn) {
      if (requires) {
        return createModule(name, requires, modules, configFn)
      } else {
        return getModule(name, modules)
      }
    }
  })
}
