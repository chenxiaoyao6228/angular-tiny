import utils from './utils/'
import { HashMap } from './utils/apis'

let FN_ARGS = /^function\s*[^(]*\(\s*([^)]*)\)/m
let FN_ARG = /^\s*(_?)(\S+?)\1\s*$/
let STRIP_COMMENTS = /(\/\/.*$)|(\/\*.*?\*\/)/gm
let INSTANTIATING = {}

// TODO replace Object.prototype.hasOwnProperty with _hasOwnProperty

export function createInjector(modulesToLoad, strictDi) {
  let providerCache = {}
  let providerInjector = (providerCache.$injector = createInternalInjector(
    providerCache,
    () => {
      throw 'Unknown provider: ' + path.join(' <- ')
    }
  ))

  let instanceCache = {}
  let instanceInjector = (instanceCache.$injector = createInternalInjector(
    instanceCache,
    name => {
      let provider = providerInjector.get(name + 'Provider')
      return instanceInjector.invoke(provider.$get, provider)
    }
  ))

  let loadedModules = new HashMap()
  let path = []
  strictDi = strictDi === true

  providerCache.$provide = {
    constant: (key, value) => {
      if (key === 'hasOwnProperty') {
        throw 'hasOwnProperty is not a valid constant name'
      }
      providerCache[key] = value
      instanceCache[key] = value
    },
    provider: (key, provider) => {
      if (utils.isFunction(provider)) {
        provider = providerInjector.instantiate(provider)
      }
      providerCache[`${key}Provider`] = provider
    },
    factory: function(key, factoryFn, enforce) {
      this.provider(key, {
        $get: enforce === false ? factoryFn : enforceReturnValue(factoryFn)
      })
    },
    value: function(key, value) {
      this.factory(key, () => value, false)
    },
    service: function(key, Constructor) {
      this.factory(key, () => {
        return instanceInjector.instantiate(Constructor)
      })
    }
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

  function createInternalInjector(cache, factoryFn) {
    function getService(name) {
      if (Object.prototype.hasOwnProperty.call(cache, name)) {
        if (cache[name] === INSTANTIATING) {
          throw new Error(
            'Circular dependency found: ' + name + ' <- ' + path.join(' <- ')
          )
        }
        return cache[name]
      } else {
        path.unshift(name)
        cache[name] = INSTANTIATING
        try {
          return (cache[name] = factoryFn(name))
        } finally {
          path.shift()
          if (cache[name] === INSTANTIATING) {
            delete cache[name]
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
    return {
      has: key => {
        return (
          Object.prototype.hasOwnProperty.call(cache, key) ||
          Object.prototype.hasOwnProperty.call(providerCache, `${key}Provider`)
        )
      },
      get: getService,
      invoke: invoke,
      annotate: annotate,
      instantiate
    }
  }
  function runInvokeQueue(queue) {
    utils.forEach(queue, invokeArgs => {
      let service = providerInjector.get(invokeArgs[0])
      let method = invokeArgs[1]
      let args = invokeArgs[2]
      service[method].apply(service, args)
    })
  }

  function enforceReturnValue(factoryFn) {
    return function() {
      let value = instanceInjector.invoke(factoryFn)
      if (utils.isUndefined(value)) {
        throw 'factory must return a value'
      }
      return value
    }
  }

  let runBlocks = []
  utils.forEach(modulesToLoad, function loadModule(moduleName) {
    if (!loadedModules.get(moduleName)) {
      loadedModules.put(moduleName, true)
      if (utils.isString(moduleName)) {
        if (Object.prototype.hasOwnProperty.call(loadedModules, moduleName))
          return
        let module = window.angular.module(moduleName)
        // 递归过程,先注入依赖
        utils.forEach(module.requires, loadModule)
        runInvokeQueue(module._invokeQueue)
        runInvokeQueue(module._configBlock)
        runBlocks = runBlocks.concat(module._runBlocks)
      } else if (utils.isFunction(moduleName) || utils.isArray(moduleName)) {
        runBlocks.push(providerInjector.invoke(moduleName))
      }
    }
  })
  runBlocks.filter(Boolean).forEach(runBlock => {
    instanceInjector.invoke(runBlock)
  })

  return instanceInjector
}
