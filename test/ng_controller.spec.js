import { publishExternalAPI } from '../src/angular_public'
import { createInjector } from '../src/injector'
import $ from 'jquery'

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
