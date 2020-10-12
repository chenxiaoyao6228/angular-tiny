import { setupModuleLoader } from '../src/loader'
import { createInjector } from '../src/injector'
describe('setupModuleLoader', () => {
  beforeEach(() => {
    delete window.angular
  })
  it('exposes angular on the window', () => {
    setupModuleLoader(window)
    expect(window.angular).toBeDefined()
  })
  it('create angular just one', () => {
    setupModuleLoader(window)
    let ng = window.angular
    setupModuleLoader(window)
    expect(window.angular).toEqual(ng)
  })
  it('exposes the angular module function', () => {
    setupModuleLoader(window)
    expect(window.angular.module).toBeDefined()
  })
  it('expose module function just once', () => {
    setupModuleLoader(window)
    let module = window.angular.module
    setupModuleLoader(window)
    expect(window.angular.module).toEqual(module)
  })

  describe('modules', () => {
    beforeEach(() => {
      setupModuleLoader(window)
    })
    it('allows registering a module', () => {
      let myModule = window.angular.module('myModule', [])
      expect(myModule).toBeDefined()
      expect(myModule.name).toEqual('myModule')
    })
    it('attaches the requires array to the required module', () => {
      let myModule = window.angular.module('myModule', ['myOtherModule'])
      expect(myModule.requires).toEqual(['myOtherModule'])
    })
    it('allows getting a module', () => {
      let myModule = window.angular.module('myModule', [])
      let gotModule = window.angular.module('myModule')
      expect(gotModule).toBeDefined()
      expect(gotModule).toEqual(myModule)
    })
    it('throws when trying to get a nonexistent module', () => {
      expect(() => {
        window.angular.module('myModule')
      }).toThrow()
    })
    it('does not allow a module to be called hasOwnProperty', () => {
      expect(() => {
        window.angular.module('hasOwnProperty', [])
      }).toThrow()
    })
  })

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
    })
  })
})
