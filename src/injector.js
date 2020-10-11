import utils from './utils/'
export function createInjector(modulesToLoad) {
  let cache = {}
  let loadedModules = {}

  let $provide = {
    constant: function(key, value) {
      if (key === 'hasOwnProperty') {
        throw 'hasOwnProperty is not a valid constant name'
      }
      cache[key] = value
    }
  }
  function invoke(fn) {
    let args = fn.$inject.map(token => {
      if (utils.isString(token)) {
        return cache[token]
      } else {
        throw `Incorrect injection token! Expected a string, got ${token}`
      }
    })
    return fn.apply(null, args)
  }

  utils.forEach(modulesToLoad, function loadModule(moduleName) {
    if (Object.prototype.hasOwnProperty.call(loadedModules, moduleName)) return
    loadedModules[moduleName] = true
    let module = window.angular.module(moduleName)
    // 递归过程,先注入依赖
    utils.forEach(module.requires, loadModule)
    utils.forEach(module._invokeQueue, invokeArgs => {
      let method = invokeArgs[0]
      let args = invokeArgs[1]
      $provide[method].apply($provide, args)
    })
  })
  return {
    has: function(key) {
      return Object.prototype.hasOwnProperty.call(cache, key)
    },
    get: function(key) {
      return cache[key]
    },
    invoke: invoke
  }
}
