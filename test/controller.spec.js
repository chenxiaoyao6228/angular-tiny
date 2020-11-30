import { publishExternalAPI } from '../src/angular_public'
import { createInjector } from '../src/injector'
import $ from 'jquery'

function makeInjectorWithDirectives(...args) {
  return createInjector([
    'ng',
    function($compileProvider) {
      $compileProvider.directive.apply($compileProvider, args)
    }
  ])
}

describe('$controller', () => {
  beforeEach(() => {
    delete window.angular
    publishExternalAPI()
  })
  it('instantiates controller functions', () => {
    let injector = createInjector(['ng'])
    let $controller = injector.get('$controller')
    function MyController() {
      this.invoked = true
    }
    let controller = $controller(MyController)
    expect(controller).toBeDefined()
    expect(controller instanceof MyController).toBe(true)
    expect(controller.invoked).toBe(true)
  })
  it('injects dependencies to controller functions', () => {
    let injector = createInjector([
      'ng',
      function($provide) {
        $provide.constant('aDep', 42)
      }
    ])
    let $controller = injector.get('$controller')
    function MyController(aDep) {
      this.theDep = aDep
    }
    let controller = $controller(MyController)
    expect(controller.theDep).toBe(42)
  })
  it('allows injecting locals to controller functions', () => {
    let injector = createInjector(['ng'])
    let $controller = injector.get('$controller')
    function MyController(aDep) {
      this.theDep = aDep
    }
    let controller = $controller(MyController, { aDep: 42 })
    expect(controller.theDep).toBe(42)
  })
  it('allows registering controllers at config time', () => {
    function MyController() {}
    let injector = createInjector([
      'ng',
      function($controllerProvider) {
        $controllerProvider.register('MyController', MyController)
      }
    ])
    let $controller = injector.get('$controller')
    let controller = $controller('MyController')
    expect(controller).toBeDefined()
    expect(controller instanceof MyController).toBe(true)
  })
  it('allows registering several controllers in an object', () => {
    function MyController() {}
    function MyOtherController() {}
    let injector = createInjector([
      'ng',
      function($controllerProvider) {
        $controllerProvider.register({
          MyController: MyController,
          MyOtherController: MyOtherController
        })
      }
    ])
    let $controller = injector.get('$controller')
    let controller = $controller('MyController')
    let otherController = $controller('MyOtherController')
    expect(controller instanceof MyController).toBe(true)
    expect(otherController instanceof MyOtherController).toBe(true)
  })
  it('allows registering controllers through modules', () => {
    let module = angular.module('myModule', [])
    module.controller('MyController', function MyController() {})
    let injector = createInjector(['ng', 'myModule'])
    let $controller = injector.get('$controller')
    let controller = $controller('MyController')
    expect(controller).toBeDefined()
  })
  it('does not normally look controllers up from window', () => {
    window.MyController = function MyController() {}
    let injector = createInjector(['ng'])
    let $controller = injector.get('$controller')
    expect(() => {
      $controller('MyController')
    }).toThrow()
  })
  it('looks up controllers from window when so configured', () => {
    window.MyController = function MyController() {}
    let injector = createInjector([
      'ng',
      function($controllerProvider) {
        $controllerProvider.allowGlobals()
      }
    ])
    let $controller = injector.get('$controller')
    let controller = $controller('MyController')
    expect(controller).toBeDefined()
    expect(controller instanceof window.MyController).toBe(true)
  })
  describe('controllers', () => {
    it('can be attached to directives as functions', () => {
      let controllerInvoked
      let injector = makeInjectorWithDirectives('myDirective', () => {
        return {
          controller: function MyController() {
            // eslint-disable-next-line
            console.log('111', 111);
            controllerInvoked = true
          }
        }
      })
      injector.invoke(($compile, $rootScope) => {
        let el = $('<div my-directive></div>')
        $compile(el)($rootScope)
        expect(controllerInvoked).toBe(true)
      })
    })
  })
  it('can be attached to directives as string references', () => {
    let controllerInvoked
    function MyController() {
      controllerInvoked = true
    }
    let injector = createInjector([
      'ng',
      function($controllerProvider, $compileProvider) {
        $controllerProvider.register('MyController', MyController)
        $compileProvider.directive('myDirective', () => {
          return { controller: 'MyController' }
        })
      }
    ])
    injector.invoke(($compile, $rootScope) => {
      let el = $('<div my-directive></div>')
      $compile(el)($rootScope)
      expect(controllerInvoked).toBe(true)
    })
  })
  it('can be applied in the same element independent of each other', () => {
    let controllerInvoked
    let otherControllerInvoked
    function MyController() {
      controllerInvoked = true
    }
    function MyOtherController() {
      otherControllerInvoked = true
    }
    let injector = createInjector([
      'ng',
      function($controllerProvider, $compileProvider) {
        $controllerProvider.register('MyController', MyController)
        $controllerProvider.register('MyOtherController', MyOtherController)
        $compileProvider.directive('myDirective', () => {
          return { controller: 'MyController' }
        })
        $compileProvider.directive('myOtherDirective', () => {
          return { controller: 'MyOtherController' }
        })
      }
    ])
    injector.invoke(($compile, $rootScope) => {
      let el = $('<div my-directive my-other-directive></div>')
      $compile(el)($rootScope)
      expect(controllerInvoked).toBe(true)
      expect(otherControllerInvoked).toBe(true)
    })
  })
  it('can be applied to different directives, as different instances', () => {
    let invocations = 0
    function MyController() {
      invocations++
    }
    let injector = createInjector([
      'ng',
      function($controllerProvider, $compileProvider) {
        $controllerProvider.register('MyController', MyController)
        $compileProvider.directive('myDirective', () => {
          return { controller: 'MyController' }
        })
        $compileProvider.directive('myOtherDirective', () => {
          return { controller: 'MyController' }
        })
      }
    ])
    injector.invoke(($compile, $rootScope) => {
      let el = $('<div my-directive my-other-directive></div>')
      $compile(el)($rootScope)
      expect(invocations).toBe(2)
    })
  })
})
