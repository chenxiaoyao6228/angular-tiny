import utils from './utils/'

let FN_ARGS = /^function\s*[^(]*\(\s*([^)]*)\)/m
let FN_ARG = /^\s*(_?)(\S+?)\1\s*$/
let STRIP_COMMENTS = /(\/\/.*$)|(\/\*.*?\*\/)/gm
let INSTANTIATING = {}

export function createInjector(modulesToLoad, strictDi) {
  let providerCache = {}
  let instanceCache = {}
  let loadedModules = {}
  let path = []
  strictDi = strictDi === true

  let $provide = {
    constant: (key, value) => {
      if (key === 'hasOwnProperty') {
        throw 'hasOwnProperty is not a valid constant name'
      }
      instanceCache[key] = value
    },
    provider: (key, provider) => {
      if (utils.isFunction(provider)) {
        provider = instantiate(provider)
      }
      providerCache[`${key}Provider`] = provider
    }
  }

  function getService(name) {
    if (Object.prototype.hasOwnProperty.call(instanceCache, name)) {
      if (instanceCache[name] === INSTANTIATING) {
        throw new Error(
          'Circular dependency found: ' + name + ' <- ' + path.join(' <- ')
        )
      }
      return instanceCache[name]
    } else if (
      Object.prototype.hasOwnProperty.call(providerCache, `${name}Provider`)
    ) {
      path.unshift(name)
      instanceCache[name] = INSTANTIATING
      try {
        let provider = providerCache[`${name}Provider`]
        let instance = (instanceCache[name] = invoke(provider.$get, provider))
        return instance
      } finally {
        path.shift()
        if (instanceCache[name] === INSTANTIATING) {
          delete instanceCache[name]
        }
      }
    }
  }

  function invoke(fn, self, locals) {
    let args = annotate(fn).map(token => {
      if (utils.isString(token)) {
        if (locals && Object.prototype.hasOwnProperty.call(locals, token)) {
          return locals[token]
        } else {
          return getService(token)
        }
      } else {
        throw `Incorrect injection token! Expected a string, got ${token}`
      }
    })
    if (utils.isArray(fn)) {
      fn = utils.last(fn)
    }
    return fn.apply(self, args)
  }

  function instantiate(Type, locals) {
    let UnwrappedType = utils.isArray(Type) ? utils.last(Type) : Type
    let instance = Object.create(UnwrappedType.prototype)
    invoke(Type, instance, locals)
    return instance
  }

  function annotate(fn) {
    if (utils.isArray(fn)) {
      return fn.slice(0, -1)
    } else if (fn.$inject) {
      return fn.$inject
    } else {
      if (strictDi) {
        throw 'fn is not using explicit annotation and ' +
          'cannot be invoked in strict mode'
      }

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
      let method = invokeArgs[0] // constant, provider...
      let args = invokeArgs[1]
      $provide[method].apply($provide, args)
    })
  })
  return {
    has: key => {
      return (
        Object.prototype.hasOwnProperty.call(instanceCache, key) ||
        Object.prototype.hasOwnProperty.call(providerCache, `${key}Provider`)
      )
    },
    get: getService,
    invoke: invoke,
    annotate: annotate,
    instantiate
  }
}
