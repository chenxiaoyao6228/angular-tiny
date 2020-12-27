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
  it('allows optional marker before parent marker', () => {
    function MyController() {}
    let gotMyController
    let injector = createInjector([
      'ng',
      function($compileProvider) {
        $compileProvider.directive('myDirective', () => {
          return { scope: {}, controller: MyController }
        })
        $compileProvider.directive('myOtherDirective', () => {
          return {
            require: '?^myDirective',
            link: function(scope, element, attrs, ctrl) {
              gotMyController = ctrl
            }
          }
        })
      }
    ])
    injector.invoke(($compile, $rootScope) => {
      let el = $('<div my-directive my-other-directive></div>')
      $compile(el)($rootScope)
      expect(gotMyController).toBeDefined()
      expect(gotMyController instanceof MyController).toBe(true)
    })
  })
  describe('ngController', () => {
    beforeEach(() => {
      delete window.angular
      publishExternalAPI()
    })
    it('is instantiated during compilation & linking', () => {
      let instantiated
      function MyController() {
        instantiated = true
      }
      let injector = createInjector([
        'ng',
        function($controllerProvider) {
          $controllerProvider.register('MyController', MyController)
        }
      ])
      injector.invoke(($compile, $rootScope) => {
        let el = $('<div ng-controller="MyController"></div>')
        $compile(el)($rootScope)
        expect(instantiated).toBe(true)
      })
    })
    it('may inject scope, element, and attrs', () => {
      let gotScope, gotElement, gotAttrs
      function MyController($scope, $element, $attrs) {
        gotScope = $scope
        gotElement = $element
        gotAttrs = $attrs
      }
      let injector = createInjector([
        'ng',
        function($controllerProvider) {
          $controllerProvider.register('MyController', MyController)
        }
      ])
      injector.invoke(($compile, $rootScope) => {
        let el = $('<div ng-controller="MyController"></div>')
        $compile(el)($rootScope)
        expect(gotScope).toBeDefined()
        expect(gotElement).toBeDefined()
        expect(gotAttrs).toBeDefined()
      })
    })
    it('has an inherited scope', () => {
      let gotScope
      function MyController($scope, $element, $attrs) {
        gotScope = $scope
      }

      let injector = createInjector([
        'ng',
        function($controllerProvider) {
          $controllerProvider.register('MyController', MyController)
        }
      ])
      injector.invoke(($compile, $rootScope) => {
        let el = $('<div ng-controller="MyController"></div>')
        $compile(el)($rootScope)
        expect(gotScope).not.toBe($rootScope)
        expect(gotScope.$parent).toBe($rootScope)
        expect(Object.getPrototypeOf(gotScope)).toBe($rootScope)
      })
    })
    it('allows aliasing controller in expression', () => {
      let gotScope
      function MyController($scope) {
        gotScope = $scope
      }
      let injector = createInjector([
        'ng',
        function($controllerProvider) {
          $controllerProvider.register('MyController', MyController)
        }
      ])
      injector.invoke(($compile, $rootScope) => {
        let el = $('<div ng-controller="MyController as myCtrl"></div>')
        $compile(el)($rootScope)
        expect(gotScope.myCtrl).toBeDefined()
        expect(gotScope.myCtrl instanceof MyController).toBe(true)
      })
    })
    it('allows looking up controller from surrounding scope', () => {
      let gotScope
      function MyController($scope) {
        gotScope = $scope
      }
      let injector = createInjector(['ng'])
      injector.invoke(($compile, $rootScope) => {
        let el = $('<div ng-controller="MyCtrlOnScope as myCtrl"></div>')
        $rootScope.MyCtrlOnScope = MyController
        $compile(el)($rootScope)
        expect(gotScope.myCtrl).toBeDefined()
        expect(gotScope.myCtrl instanceof MyController).toBe(true)
      })
    })
  })
})
