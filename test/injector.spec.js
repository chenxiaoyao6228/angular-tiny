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
  })
})
