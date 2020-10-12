import utils from './utils/'

let FN_ARGS = /^function\s*[^(]*\(\s*([^)]*)\)/m
let FN_ARG = /^\s*(_?)(\S+?)\1\s*$/
let STRIP_COMMENTS = /(\/\/.*$)|(\/\*.*?\*\/)/gm

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
  function invoke(fn, self, locals) {
    let args = fn.$inject.map(token => {
      if (utils.isString(token)) {
        if (locals && Object.prototype.hasOwnProperty.call(locals, token)) {
          return locals[token]
        } else {
          return cache[token]
        }
      } else {
        throw `Incorrect injection token! Expected a string, got ${token}`
      }
    })
    return fn.apply(self, args)
  }

  function annotate(fn) {
    if (utils.isArray(fn)) {
      return fn.slice(0, -1)
    } else if (fn.$inject) {
      return fn.$inject
    } else {
      let source = fn.toString().replace(STRIP_COMMENTS, '')
      let argDeclaration = source.match(FN_ARGS)
      if (!argDeclaration[1]) return []
      return argDeclaration[1]
        .split(',')
        .map(argName => argName.match(FN_ARG)[2])
    }
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
    invoke: invoke,
    annotate: annotate
  }
}
