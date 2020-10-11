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
      let module = window.angular.module('myModule', [])
      module.constant('aConstant', 42)
      let injector = createInjector(['myModule'])
      expect(injector.get('aConstant')).toBe(42)
    })
  })
})
