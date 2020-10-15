import { setupModuleLoader } from '../src/loader'
import { createInjector } from '../src/injector'
describe('injector', () => {
  beforeEach(() => {
    delete window.angular
    setupModuleLoader(window)
  })
  it('it can be created', () => {
    let injector = createInjector()
    expect(injector).toBeDefined()
  })
  it('has a constant that has been registered to a module', () => {
    let module = window.angular.module('myModule', [])
    module.constant('aConstant', 42)
    let injector = createInjector(['myModule'])
    expect(injector.has('aConstant')).toEqual(true)
  })
  it('does not have a non-registered constant', () => {
    let module = window.angular.module('myModule', [])
    let injector = createInjector(['myModule'])
    expect(injector.has('aConstant')).toEqual(false)
  })
  it('does not allow a constant called hasOwnProperty', () => {
    let module = window.angular.module('myModule', [])
    module.constant('hasOwnProperty', () => false)
    expect(() => {
      createInjector(['myModule'])
    }).toThrow()
  })
  it('can return a registered constant', () => {
    let module = angular.module('myModule', [])
    module.constant('aConstant', 42)
    let injector = createInjector(['myModule'])
    expect(injector.get('aConstant')).toBe(42)
  })
  it('loads multiple modules', () => {
    let module1 = angular.module('myModule', [])
    let module2 = angular.module('myOtherModule', [])
    module1.constant('aConstant', 42)
    module2.constant('anotherConstant', 43)
    let injector = createInjector(['myModule', 'myOtherModule'])

    expect(injector.has('aConstant')).toBe(true)
    expect(injector.has('anotherConstant')).toBe(true)
  })
  it('loads the requied modules of a module', () => {
    let module1 = angular.module('myModule', [])
    let module2 = angular.module('myOtherModule', ['myModule'])
    module1.constant('aConstant', 42)
    module2.constant('anotherConstant', 43)
    let injector = createInjector(['myOtherModule'])

    expect(injector.has('aConstant')).toBe(true)
    expect(injector.has('anotherConstant')).toBe(true)
  })
  it('loads the transitively required modules of a module', () => {
    let module1 = angular.module('myModule', [])
    let module2 = angular.module('myOtherModule', ['myModule'])
    let module3 = angular.module('myThirdModule', ['myOtherModule'])
    module1.constant('aConstant', 42)
    module2.constant('anotherConstant', 43)
    module3.constant('aThirdConstant', 44)
    let injector = createInjector(['myThirdModule'])
    expect(injector.has('aConstant')).toBe(true)
    expect(injector.has('anotherConstant')).toBe(true)
    expect(injector.has('aThirdConstant')).toBe(true)
  })
  // eslint-disable-next-line jest/expect-expect
  it('loads each module only once', () => {
    angular.module('myModule', ['myOtherModule'])
    angular.module('myOtherModule', ['myModule'])
    createInjector(['myModule'])
  })
  it('invokes an annotated function with dependency injection', () => {
    let module = angular.module('myModule', [])
    module.constant('a', 1)
    module.constant('b', 2)
    let injector = createInjector(['myModule'])

    let fn = function(one, two) {
      return one + two
    }
    fn.$inject = ['a', 'b']
    expect(injector.invoke(fn)).toEqual(3)
  })
  it('does not accept non-strings as injection tokens', () => {
    let module = angular.module('myModule', [])
    module.constant('a', 1)
    let injector = createInjector(['myModule'])
    let fn = function(one, two) {
      return one + two
    }
    fn.$inject = ['a', 2]
    expect(() => {
      injector.invoke(fn)
    }).toThrow()
  })
  it('invokes a function with the given this context', () => {
    let module = angular.module('myModule', [])
    module.constant('a', 1)
    let injector = createInjector(['myModule'])
    let obj = {
      two: 2,
      fn: function(one) {
        return one + this.two
      }
    }
    obj.fn.$inject = ['a']
    expect(injector.invoke(obj.fn, obj)).toBe(3)
  })
  it('overrides dependencies with locals when invoking', () => {
    let module = angular.module('myModule', [])
    module.constant('a', 1)
    module.constant('b', 2)
    let injector = createInjector(['myModule'])
    let fn = function(one, two) {
      return one + two
    }
    fn.$inject = ['a', 'b']
    expect(injector.invoke(fn, undefined, { b: 3 })).toBe(4)
  })
  describe('annotate', () => {
    it('returns the $inject annotation of a function when it has one', () => {
      let injector = createInjector([])
      let fn = function() {}
      fn.$inject = ['a', 'b']
      expect(injector.annotate(fn)).toEqual(['a', 'b'])
    })
    it('returns the array-style annotations of a function', () => {
      let injector = createInjector([])
      let fn = ['a', 'b', function() {}]
      expect(injector.annotate(fn)).toEqual(['a', 'b'])
    })
    it('returns an empty array for a non-annotated 0-arg function', () => {
      let injector = createInjector([])
      let fn = function() {}
      expect(injector.annotate(fn)).toEqual([])
    })
    it('returns annotations parsed from function args when not annotated', () => {
      let injector = createInjector([])
      let fn = function(a, b) {}
      expect(injector.annotate(fn)).toEqual(['a', 'b'])
    })
    it('strips comments from argument lists when parsing', () => {
      let injector = createInjector([])
      let fn = function(a, /*b,*/ c) {}
      expect(injector.annotate(fn)).toEqual(['a', 'c'])
    })
    it('strips several comments from argument lists when parsing', () => {
      let injector = createInjector([])
      let fn = function(a, /*b,*/ c /*, d*/) {}
      expect(injector.annotate(fn)).toEqual(['a', 'c'])
    })
    it('strips // comments from argument lists when parsing', () => {
      let injector = createInjector([])
      let fn = function(
        a,
        //b,
        c
      ) {}
      expect(injector.annotate(fn)).toEqual(['a', 'c'])
    })
    it('strips surrounding underscores from argument names when parsing', () => {
      let injector = createInjector([])
      let fn = function(a, _b_, c_, _d, an_argument) {}
      expect(injector.annotate(fn)).toEqual([
        'a',
        'b',
        'c_',
        '_d',
        'an_argument'
      ])
    })
    it('throws when using a non-annotated fn in strict mode', () => {
      let injector = createInjector([], true)
      let fn = function(a, b, c) {}
      expect(() => {
        injector.annotate(fn)
      }).toThrow()
    })
    it('invokes an array-annotated function with dependency injection ', () => {
      let module = angular.module('myModule', [])
      module.constant('a', 1)
      module.constant('b', 2)
      let injector = createInjector(['myModule'])
      let fn = [
        'a',
        'b',
        function(one, two) {
          return one + two
        }
      ]
      expect(injector.invoke(fn)).toEqual(3)
    })
    it('invokes a non-annotated function with dependency injection', () => {
      let module = angular.module('myModule', [])
      module.constant('a', 1)
      module.constant('b', 2)
      let injector = createInjector(['myModule'])
      let fn = function(a, b) {
        return a + b
      }
      expect(injector.invoke(fn)).toBe(3)
    })
    it('instantiates an annotated constructor function', () => {
      let module = angular.module('myModule', [])
      module.constant('a', 1)
      module.constant('b', 2)
      let injector = createInjector(['myModule'])
      function Type(one, two) {
        this.result = one + two
      }
      Type.$inject = ['a', 'b']
      let instance = injector.instantiate(Type)
      expect(instance.result).toBe(3)
    })
    it('instantiates an array-annotated constructor function', () => {
      let module = angular.module('myModule', [])
      module.constant('a', 1)
      module.constant('b', 2)
      let injector = createInjector(['myModule'])
      function Type(one, two) {
        this.result = one + two
      }
      let instance = injector.instantiate(['a', 'b', Type])
      expect(instance.result).toBe(3)
    })
    it('instantiates a non-annotated constructor function', () => {
      let module = angular.module('myModule', [])
      module.constant('a', 1)
      module.constant('b', 2)
      let injector = createInjector(['myModule'])
      function Type(a, b) {
        this.result = a + b
      }
      let instance = injector.instantiate(Type)
      expect(instance.result).toBe(3)
    })
    // TODO
    // it('uses the prototype of the constructor when instantiating', () => {
    //   function BaseType() {}
    //   BaseType.prototype.getValue = () => 42

    //   function Type() {
    //     this.v = this.getValue()
    //   }
    //   Type.prototype = BaseType.prototype

    //   angular.module('myModule', [])
    //   let injector = createInjector(['myModule'])

    //   let instance = injector.instantiate(Type)
    //   expect(instance.v).toEqual(42)
    // })
    it('supports locals when instantiating', () => {
      let module = angular.module('myModule', [])
      module.constant('a', 1)
      module.constant('b', 2)
      let injector = createInjector(['myModule'])
      function Type(a, b) {
        this.result = a + b
      }
      let instance = injector.instantiate(Type, { b: 3 })
      expect(instance.result).toBe(4)
    })
    it('allows registering a provider and uses its $get', () => {
      let module = angular.module('myModule', [])
      module.provider('a', {
        $get: function() {
          return 42
        }
      })
      let injector = createInjector(['myModule'])
      expect(injector.has('a')).toBe(true)
      expect(injector.get('a')).toBe(42)
    })
    it('injects the $get method of a provider', () => {
      let module = angular.module('myModule', [])
      module.constant('a', 1)
      module.provider('b', {
        $get: function(a) {
          return a + 2
        }
      })
      let injector = createInjector(['myModule'])
      expect(injector.get('b')).toBe(3)
    })
    it('injects the $get method of a provider lazily', () => {
      let module = angular.module('myModule', [])
      module.provider('b', {
        $get: function(a) {
          return a + 2
        }
      })
      module.provider('a', { $get: () => 1 })
      let injector = createInjector(['myModule'])
      expect(injector.get('b')).toBe(3)
    })
    it('instantiates a dependency only once', () => {
      let module = angular.module('myModule', [])
      module.provider('a', {
        $get: function() {
          return {}
        }
      })
      let injector = createInjector(['myModule'])
      expect(injector.get('a')).toBe(injector.get('a'))
    })
    it('notifies the user about a circular dependency', () => {
      let module = angular.module('myModule', [])
      module.provider('a', { $get: function(b) {} })
      module.provider('b', { $get: function(c) {} })
      module.provider('c', { $get: function(a) {} })
      let injector = createInjector(['myModule'])
      expect(() => {
        injector.get('a')
      }).toThrowError('Circular dependency found: a <- c <- b <- a')
    })
    it('cleans up the circular marker when instantiation fails', () => {
      let module = angular.module('myModule', [])
      module.provider('a', {
        $get: function() {
          throw 'Failing instantiation!'
        }
      })
      let injector = createInjector(['myModule'])
      expect(() => {
        injector.get('a')
      }).toThrow('Failing instantiation!')
      expect(() => {
        injector.get('a')
      }).toThrow('Failing instantiation!')
    })
    it('instantiates a provider if given as a constructor function', () => {
      let module = angular.module('myModule', [])
      module.provider('a', function AProvider() {
        this.$get = function() {
          return 42
        }
      })
      let injector = createInjector(['myModule'])
      expect(injector.get('a')).toBe(42)
    })
    it('injects the given provider constructor function', () => {
      let module = angular.module('myModule', [])
      module.constant('b', 2)
      module.provider('a', function AProvider(b) {
        this.$get = function() {
          return 1 + b
        }
      })
      let injector = createInjector(['myModule'])
      expect(injector.get('a')).toBe(3)
    })
    it('injects another provider to a provider constructor function', () => {
      let module = angular.module('myModule', [])
      module.provider('a', function AProvider() {
        let value = 1
        this.setValue = function(v) {
          value = v
        }
        this.$get = function() {
          return value
        }
      })
      module.provider('b', function BProvider(aProvider) {
        aProvider.setValue(2)
        this.$get = function() {}
      })
      let injector = createInjector(['myModule'])
      expect(injector.get('a')).toBe(2)
    })
    it('does not inject an instance to a provider constructor function', () => {
      let module = angular.module('myModule', [])
      module.provider('a', function AProvider() {
        this.$get = function() {
          return 1
        }
      })
      module.provider('b', function BProvider(a) {
        this.$get = function() {
          return a
        }
      })
      expect(() => {
        createInjector(['myModule'])
      }).toThrow()
    })
    it('does not inject a provider to a $get function', () => {
      let module = angular.module('myModule', [])
      module.provider('a', function AProvider() {
        this.$get = function() {
          return 1
        }
      })
      module.provider('b', function BProvider() {
        this.$get = function(aProvider) {
          return aProvider.$get()
        }
      })
      let injector = createInjector(['myModule'])
      expect(() => {
        injector.get('b')
      }).toThrow()
    })
    it('does not inject a provider to invoke', () => {
      let module = angular.module('myModule', [])
      module.provider('a', function AProvider() {
        this.$get = function() {
          return 1
        }
      })
      let injector = createInjector(['myModule'])
      expect(() => {
        injector.invoke(aProvider => {})
      }).toThrow()
    })
    it('does not give access to providers through get', () => {
      let module = angular.module('myModule', [])
      module.provider('a', function AProvider() {
        this.$get = function() {
          return 1
        }
      })
      let injector = createInjector(['myModule'])
      expect(() => {
        injector.get('aProvider')
      }).toThrow()
    })
    it('registers constants first to make them available to providers', () => {
      let module = angular.module('myModule', [])
      module.provider('a', function AProvider(b) {
        this.$get = function() {
          return b
        }
      })
      module.constant('b', 42)
      let injector = createInjector(['myModule'])
      expect(injector.get('a')).toBe(42)
    })
    it('allows injecting the instance injector to $get', () => {
      let module = angular.module('myModule', [])
      module.constant('a', 42)
      module.provider('b', function BProvider() {
        this.$get = function($injector) {
          return $injector.get('a')
        }
      })
      let injector = createInjector(['myModule'])
      expect(injector.get('b')).toBe(42)
    })
    it('allows injecting the provider injector to provider', () => {
      let module = angular.module('myModule', [])
      module.provider('a', function AProvider() {
        this.value = 42
        this.$get = function() {
          return this.value
        }
      })
      module.provider('b', function BProvider($injector) {
        let aProvider = $injector.get('aProvider')
        this.$get = function() {
          return aProvider.value
        }
      })
      let injector = createInjector(['myModule'])
      expect(injector.get('b')).toBe(42)
    })
    it('allows injecting the $provide service to providers', () => {
      let module = angular.module('myModule', [])
      module.provider('a', function AProvider($provide) {
        $provide.constant('b', 2)
        this.$get = function(b) {
          return 1 + b
        }
      })
      let injector = createInjector(['myModule'])
      expect(injector.get('a')).toBe(3)
    })
    it('does not allow injecting the $provide service to $get', () => {
      let module = angular.module('myModule', [])
      module.provider('a', function AProvider() {
        this.$get = function($provide) {}
      })
      let injector = createInjector(['myModule'])
      expect(() => {
        injector.get('a')
      }).toThrow()
    })
    it('runs config blocks when the injector is created', () => {
      let module = angular.module('myModule', [])
      let hasRun = false
      module.config(() => {
        hasRun = true
      })
      createInjector(['myModule'])
      expect(hasRun).toBe(true)
    })
    it('injects config blocks with provider injector', () => {
      let module = angular.module('myModule', [])
      module.config($provide => {
        $provide.constant('a', 42)
      })
      let injector = createInjector(['myModule'])
      expect(injector.get('a')).toBe(42)
    })
    it('allows registering config blocks before providers', () => {
      let module = angular.module('myModule', [])

      module.config(aProvider => {})
      module.provider('a', function() {
        this.$get = () => 42
      })

      let injector = createInjector(['myModule'])
      expect(injector.get('a')).toEqual(42)
    })
    it('runs a config block added during module registration', () => {
      let module = angular.module('myModule', [], $provide => {
        $provide.constant('a', 42)
      })
      let injector = createInjector(['myModule'])
      expect(injector.get('a')).toBe(42)
    })
    it('runs run blocks when the injector is created', () => {
      let module = angular.module('myModule', [])
      let hasRun = false
      module.run(() => {
        hasRun = true
      })
      createInjector(['myModule'])

      expect(hasRun).toEqual(true)
    })
    it('injects run blocks with the instance injector', () => {
      let module = angular.module('myModule', [])
      module.provider('a', { $get: () => 42 })
      let gotA
      module.run(a => {
        gotA = a
      })
      createInjector(['myModule'])
      expect(gotA).toBe(42)
    })
    it('configures all modules before running any run blocks', () => {
      let module1 = angular.module('myModule', [])
      module1.provider('a', { $get: () => 1 })
      let result
      module1.run((a, b) => {
        result = a + b
      })
      let module2 = angular.module('myOtherModule', [])
      module2.provider('b', { $get: () => 2 })
      createInjector(['myModule', 'myOtherModule'])
      expect(result).toBe(3)
    })
    it('runs a function module dependency as a config block', () => {
      let functionModule = function($provide) {
        $provide.constant('a', 42)
      }
      angular.module('myModule', [functionModule])
      let injector = createInjector(['myModule'])
      expect(injector.get('a')).toBe(42)
    })
    it('runs a function module with array injection as a config block', () => {
      let functionModule = [
        '$provide',
        function($provide) {
          $provide.constant('a', 42)
        }
      ]
      angular.module('myModule', [functionModule])
      let injector = createInjector(['myModule'])
      expect(injector.get('a')).toBe(42)
    })
    it('supports returning a run block from a function module', () => {
      let result
      let functionModule = function($provide) {
        $provide.constant('a', 42)
        return function(a) {
          result = a
        }
      }
      angular.module('myModule', [functionModule])
      createInjector(['myModule'])
      expect(result).toBe(42)
    })
    it('only loads function modules once', () => {
      let loadedTimes = 0
      let functionModule = function() {
        loadedTimes++
      }
      angular.module('myModule', [functionModule, functionModule])
      createInjector(['myModule'])
      expect(loadedTimes).toBe(1)
    })
  })
})
