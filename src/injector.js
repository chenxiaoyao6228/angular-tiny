import utils from './utils/'
export function createInjector(modulesToLoad) {
  let cache = {}

  let $provide = {
    constant: function(key, value) {
      if (key === 'hasOwnProperty') {
        throw 'hasOwnProperty is not a valid constant name'
      }
      cache[key] = value
    }
  }

  utils.forEach(modulesToLoad, moduleName => {
    let module = window.angular.module(moduleName)
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
    }
  }
}
