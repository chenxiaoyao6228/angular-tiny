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
  it('can be aliased with @ when given in directive attribute', () => {
    let controllerInvoked
    function MyController() {
      controllerInvoked = true
    }
    let injector = createInjector([
      'ng',
      function($controllerProvider, $compileProvider) {
        $controllerProvider.register('MyController', MyController)
        $compileProvider.directive('myDirective', () => {
          return { controller: '@' }
        })
      }
    ])
    injector.invoke(($compile, $rootScope) => {
      let el = $('<div my-directive="MyController"></div>')
      $compile(el)($rootScope)
      expect(controllerInvoked).toBe(true)
    })
  })
  it('gets scope, element, and attrs through DI', () => {
    let gotScope, gotElement, gotAttrs
    function MyController($element, $scope, $attrs) {
      gotElement = $element
      gotScope = $scope
      gotAttrs = $attrs
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
      let el = $('<div my-directive an-attr="abc"></div>')
      $compile(el)($rootScope)
      expect(gotElement[0]).toBe(el[0])
      expect(gotScope).toBe($rootScope)
      expect(gotAttrs).toBeDefined()
      expect(gotAttrs.anAttr).toEqual('abc')
    })
  })
  it('can be attached on the scope', () => {
    function MyController() {}
    let injector = createInjector([
      'ng',
      function($controllerProvider, $compileProvider) {
        $controllerProvider.register('MyController', MyController)
        $compileProvider.directive('myDirective', () => {
          return { controller: 'MyController', controllerAs: 'myCtrl' }
        })
      }
    ])
    injector.invoke(($compile, $rootScope) => {
      let el = $('<div my-directive></div>')
      $compile(el)($rootScope)
      expect($rootScope.myCtrl).toBeDefined()
      expect($rootScope.myCtrl instanceof MyController).toBe(true)
    })
  })
  it('gets isolate scope as injected $scope', () => {
    let gotScope
    function MyController($scope) {
      gotScope = $scope
    }
    let injector = createInjector([
      'ng',
      function($controllerProvider, $compileProvider) {
        $controllerProvider.register('MyController', MyController)
        $compileProvider.directive('myDirective', () => {
          return { scope: {}, controller: 'MyController' }
        })
      }
    ])
    injector.invoke(($compile, $rootScope) => {
      let el = $('<div my-directive></div>')
      $compile(el)($rootScope)
      expect(gotScope).not.toBe($rootScope)
    })
  })
  it('has isolate scope bindings available during construction', () => {
    let gotMyAttr
    function MyController($scope) {
      gotMyAttr = $scope.myAttr
    }
    let injector = createInjector([
      'ng',
      function($controllerProvider, $compileProvider) {
        $controllerProvider.register('MyController', MyController)
        $compileProvider.directive('myDirective', () => {
          return {
            scope: { myAttr: '@myDirective' },
            controller: 'MyController'
          }
        })
      }
    ])
    injector.invoke(($compile, $rootScope) => {
      let el = $('<div my-directive="abc"></div>')
      $compile(el)($rootScope)
      expect(gotMyAttr).toEqual('abc')
    })
  })
  it('can bind isolate scope bindings directly to self', () => {
    let gotMyAttr
    function MyController() {
      gotMyAttr = this.myAttr
    }
    let injector = createInjector([
      'ng',
      function($controllerProvider, $compileProvider) {
        $controllerProvider.register('MyController', MyController)
        $compileProvider.directive('myDirective', () => {
          return {
            scope: { myAttr: '@myDirective' },
            controller: 'MyController',
            bindToController: true
          }
        })
      }
    ])
    injector.invoke(($compile, $rootScope) => {
      let el = $('<div my-directive="abc"></div>')
      $compile(el)($rootScope)
      expect(gotMyAttr).toEqual('abc')
    })
  })
  it('can return a semi-constructed controller', () => {
    let injector = createInjector(['ng'])
    let $controller = injector.get('$controller')
    function MyController() {
      this.constructed = true
      this.myAttrWhenConstructed = this.myAttr
    }
    let controller = $controller(MyController, null, true)
    expect(controller.constructed).toBeUndefined()
    expect(controller.instance).toBeDefined()
    controller.instance.myAttr = 42
    let actualController = controller()
    expect(actualController.constructed).toBeDefined()
    expect(actualController.myAttrWhenConstructed).toBe(42)
  })
  it('can return a semi-constructed ctrl when using array injection', () => {
    let injector = createInjector([
      'ng',
      function($provide) {
        $provide.constant('aDep', 42)
      }
    ])
    let $controller = injector.get('$controller')
    function MyController(aDep) {
      this.aDep = aDep
      this.constructed = true
    }
    let controller = $controller(['aDep', MyController], null, true)
    expect(controller.constructed).toBeUndefined()
    let actualController = controller() // 调用之后才会实例化
    expect(actualController.constructed).toBeDefined()
    expect(actualController.aDep).toBe(42)
  })
  it('can bind semi-constructed controller to scope', () => {
    let injector = createInjector(['ng'])
    let $controller = injector.get('$controller')
    function MyController() {}
    let scope = {} // 需要往scope上做手脚
    let controller = $controller(
      MyController,
      { $scope: scope },
      true,
      'myCtrl'
    )
    expect(scope.myCtrl).toBe(controller.instance)
  })
  it('can be required from a sibling directive', () => {
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
            require: 'myDirective',
            link: function(scope, element, attrs, myController) {
              gotMyController = myController
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
  it('can be required from multiple sibling directives', () => {
    function MyController() {}
    function MyOtherController() {}
    let gotControllers
    let injector = createInjector([
      'ng',
      function($compileProvider) {
        $compileProvider.directive('myDirective', () => {
          return { scope: true, controller: MyController }
        })
        $compileProvider.directive('myOtherDirective', () => {
          return { scope: true, controller: MyOtherController }
        })
        $compileProvider.directive('myThirdDirective', () => {
          return {
            require: ['myDirective', 'myOtherDirective'],
            link: function(scope, element, attrs, controllers) {
              gotControllers = controllers
            }
          }
        })
      }
    ])
    injector.invoke(($compile, $rootScope) => {
      let el = $(
        '<div my-directive my-other-directive my-third-directive></div>'
      )
      $compile(el)($rootScope)
      expect(gotControllers).toBeDefined()
      expect(gotControllers.length).toBe(2)
      expect(gotControllers[0] instanceof MyController).toBe(true)
      expect(gotControllers[1] instanceof MyOtherController).toBe(true)
    })
  })
  it('is passed to link functions if there is no require', () => {
    function MyController() {}
    let gotMyController
    let injector = createInjector([
      'ng',
      function($compileProvider) {
        $compileProvider.directive('myDirective', () => {
          return {
            scope: {},
            controller: MyController,
            link: function(scope, element, attrs, myController) {
              gotMyController = myController
            }
          }
        })
      }
    ])
    injector.invoke(($compile, $rootScope) => {
      let el = $('<div my-directive></div>')
      $compile(el)($rootScope)
      expect(gotMyController).toBeDefined()
      expect(gotMyController instanceof MyController).toBe(true)
    })
  })
  it('is passed through grouped link wrapper', () => {
    function MyController() {}
    let gotMyController
    let injector = createInjector([
      'ng',
      function($compileProvider) {
        $compileProvider.directive('myDirective', () => {
          return {
            multiElement: true,
            scope: {},
            controller: MyController,
            link: function(scope, element, attrs, myController) {
              gotMyController = myController
            }
          }
        })
      }
    ])
    injector.invoke(($compile, $rootScope) => {
      let el = $('<div my-directive-start></div><div my-directive-end></div>')
      $compile(el)($rootScope)
      expect(gotMyController).toBeDefined()
      expect(gotMyController instanceof MyController).toBe(true)
    })
  })
  it('can be required from a parent directive', () => {
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
            require: '^myDirective',
            link: function(scope, element, attrs, myController) {
              gotMyController = myController
            }
          }
        })
      }
    ])
    injector.invoke(($compile, $rootScope) => {
      let el = $('<div my-directive><div my-other-directive></div></div>')
      $compile(el)($rootScope)
      expect(gotMyController).toBeDefined()
      expect(gotMyController instanceof MyController).toBe(true)
    })
  })
  it('finds from sibling directive when requiring with parent prefix', () => {
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
            require: '^myDirective',
            link: function(scope, element, attrs, myController) {
              gotMyController = myController
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
  it('can be required from a parent directive with ^^', () => {
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
            require: '^^myDirective',
            link: function(scope, element, attrs, myController) {
              gotMyController = myController
            }
          }
        })
      }
    ])
    injector.invoke(($compile, $rootScope) => {
      let el = $('<div my-directive><div my-other-directive></div></div>')
      $compile(el)($rootScope)
      expect(gotMyController).toBeDefined()
      expect(gotMyController instanceof MyController).toBe(true)
    })
  })
  it('does not find from sibling directive when requiring with ^^', () => {
    function MyController() {}
    let injector = createInjector([
      'ng',
      function($compileProvider) {
        $compileProvider.directive('myDirective', () => {
          return { scope: {}, controller: MyController }
        })
        $compileProvider.directive('myOtherDirective', () => {
          return {
            require: '^^myDirective',
            link: function(scope, element, attrs, myController) {}
          }
        })
      }
    ])
    injector.invoke(($compile, $rootScope) => {
      let el = $('<div my-directive my-other-directive></div>')
      expect(() => {
        $compile(el)($rootScope)
      }).toThrow()
    })
  })
  it('does not throw on required missing controller when optional', () => {
    let gotCtrl
    let injector = createInjector([
      'ng',
      function($compileProvider) {
        $compileProvider.directive('myDirective', () => {
          return {
            require: '?noSuchDirective',
            link: function(scope, element, attrs, ctrl) {
              gotCtrl = ctrl
            }
          }
        })
      }
    ])
    injector.invoke(($compile, $rootScope) => {
      let el = $('<div my-directive></div>')
      $compile(el)($rootScope)
      expect(gotCtrl).toBe(null)
    })
  })
  it('allows optional marker after parent marker', () => {
    let gotCtrl
    let injector = createInjector([
      'ng',
      function($compileProvider) {
        $compileProvider.directive('myDirective', () => {
          return {
            require: '^?noSuchDirective',
            link: function(scope, element, attrs, ctrl) {
              gotCtrl = ctrl
            }
          }
        })
      }
    ])
    injector.invoke(($compile, $rootScope) => {
      let el = $('<div my-directive></div>')
      $compile(el)($rootScope)
      expect(gotCtrl).toBe(null)
    })
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
  })
})
