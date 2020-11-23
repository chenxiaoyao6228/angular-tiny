import { publishExternalAPI } from '../src/angular_public'
import { createInjector } from '../src/injector'
import utils from '../src/utils'
import $ from 'jquery'
import _ from 'lodash'

function makeInjectorWithDirectives(...args) {
  return createInjector([
    'ng',
    function($compileProvider) {
      $compileProvider.directive.apply($compileProvider, args)
    }
  ])
}

describe('$compile', () => {
  beforeEach(() => {
    delete window.angular
    publishExternalAPI()
  })
  it('allows creating directives', () => {
    let myModule = window.angular.module('myModule', [])
    myModule.directive('testing', () => {})
    let injector = createInjector(['ng', 'myModule'])
    expect(injector.has('testingDirective')).toBe(true)
  })
  it('allows creating many directives with the same name', () => {
    let myModule = window.angular.module('myModule', [])
    myModule.directive('testing', () => ({ d: 'one' }))
    myModule.directive('testing', () => ({ d: 'two' }))
    let injector = createInjector(['ng', 'myModule'])
    let result = injector.get('testingDirective')
    expect(result.length).toBe(2)
    expect(result[0].d).toEqual('one')
    expect(result[1].d).toEqual('two')
  })
  it('does not allow a directive called hasOwnProperty', () => {
    let myModule = window.angular.module('myModule', [])
    myModule.directive('hasOwnProperty', () => {})
    expect(() => {
      createInjector(['ng', 'myModule'])
    }).toThrow()
  })
  it('allows creating directives with object notation', () => {
    let myModule = window.angular.module('myModule', [])
    myModule.directive({ a: function() {}, b: function() {}, c: function() {} })
    let injector = createInjector(['ng', 'myModule'])
    expect(injector.has('aDirective')).toBe(true)
    expect(injector.has('bDirective')).toBe(true)
    expect(injector.has('cDirective')).toBe(true)
  })
  it('compiles element directives from a single element', () => {
    let injector = makeInjectorWithDirectives('myDirective', () => {
      return {
        restrict: 'EACM',
        compile: function(element) {
          element.data('hasCompiled', true)
        }
      }
    })

    injector.invoke($compile => {
      let el = $('<my-directive></my-directive>')
      $compile(el)
      expect(el.data('hasCompiled')).toBe(true)
    })
  })
  it('compiles element directives found from several elements', () => {
    let idx = 1
    let injector = makeInjectorWithDirectives('myDirective', () => {
      return {
        restrict: 'EACM',
        compile: function(element) {
          element.data('hasCompiled', idx++)
        }
      }
    })
    injector.invoke($compile => {
      let el = $('<my-directive></my-directive><my-directive></my-directive>')
      $compile(el)
      expect(el.eq(0).data('hasCompiled')).toBe(1)
      expect(el.eq(1).data('hasCompiled')).toBe(2)
    })
  })
  it('compiles element directives from child elements', () => {
    let idx = 1
    let injector = makeInjectorWithDirectives('myDirective', () => {
      return {
        restrict: 'EACM',
        compile: function(element) {
          element.data('hasCompiled', idx++)
        }
      }
    })
    injector.invoke($compile => {
      let el = $('<div><my-directive></my-directive></div>')
      $compile(el)
      expect(el.data('hasCompiled')).toBeUndefined()
      expect(el.find('> my-directive').data('hasCompiled')).toBe(1)
    })
  })
  it('compiles nested directives', () => {
    let idx = 1
    let injector = makeInjectorWithDirectives('myDir', () => {
      return {
        restrict: 'EACM',
        compile: function(element) {
          element.data('hasCompiled', idx++)
        }
      }
    })
    injector.invoke($compile => {
      let el = $('<my-dir><my-dir><my-dir/></my-dir></my-dir>')
      $compile(el)
      expect(el.data('hasCompiled')).toBe(1)
      expect(el.find('> my-dir').data('hasCompiled')).toBe(2)
      expect(el.find('> my-dir > my-dir').data('hasCompiled')).toBe(3)
    })
  })
  utils.forEach(['x', 'data'], prefix => {
    utils.forEach([':', '-', '_'], delim => {
      it(
        'compiles element directives with ' + prefix + delim + ' prefix',
        () => {
          let injector = makeInjectorWithDirectives('myDir', () => {
            return {
              restrict: 'EACM',
              compile: function(element) {
                element.data('hasCompiled', true)
              }
            }
          })
          injector.invoke($compile => {
            let el = $(
              '<' + prefix + delim + 'my-dir></' + prefix + delim + 'my-dir>'
            )
            $compile(el)
            expect(el.data('hasCompiled')).toBe(true)
          })
        }
      )
    })
  })
  it('compiles attribute directives', () => {
    let injector = makeInjectorWithDirectives('myDirective', () => {
      return {
        restrict: 'EACM',
        compile: function(element) {
          element.data('hasCompiled', true)
        }
      }
    })
    injector.invoke($compile => {
      let el = $('<div my-directive></div>')
      $compile(el)
      expect(el.data('hasCompiled')).toBe(true)
    })
  })
  it('compiles attribute directives with prefixes', () => {
    let injector = makeInjectorWithDirectives('myDirective', () => {
      return {
        restrict: 'EACM',
        compile: function(element) {
          element.data('hasCompiled', true)
        }
      }
    })
    injector.invoke($compile => {
      let el = $('<div x:my-directive></div>')
      $compile(el)
      expect(el.data('hasCompiled')).toBe(true)
    })
  })
  it('compiles several attribute directives in an element', () => {
    let injector = makeInjectorWithDirectives({
      myDirective: function() {
        return {
          restrict: 'EACM',
          compile: function(element) {
            element.data('hasCompiled', true)
          }
        }
      },
      mySecondDirective: function() {
        return {
          restrict: 'EACM',
          compile: function(element) {
            element.data('secondCompiled', true)
          }
        }
      }
    })
    injector.invoke($compile => {
      let el = $('<div my-directive my-second-directive></div>')
      $compile(el)
      expect(el.data('hasCompiled')).toBe(true)
      expect(el.data('secondCompiled')).toBe(true)
    })
  })
  it('compiles both element and attributes directives in an element', () => {
    let injector = makeInjectorWithDirectives({
      myDirective: function() {
        return {
          restrict: 'EACM',
          compile: function(element) {
            element.data('hasCompiled', true)
          }
        }
      },
      mySecondDirective: function() {
        return {
          restrict: 'EACM',
          compile: function(element) {
            element.data('secondCompiled', true)
          }
        }
      }
    })
    injector.invoke($compile => {
      let el = $('<my-directive my-second-directive></my-directive>')
      $compile(el)
      expect(el.data('hasCompiled')).toBe(true)
      expect(el.data('secondCompiled')).toBe(true)
    })
  })
  it('compiles attribute directives with ng-attr prefix', () => {
    let injector = makeInjectorWithDirectives('myDirective', () => {
      return {
        restrict: 'EACM',
        compile: function(element) {
          element.data('hasCompiled', true)
        }
      }
    })
    injector.invoke($compile => {
      let el = $('<div ng-attr-my-directive></div>')
      $compile(el)
      expect(el.data('hasCompiled')).toBe(true)
    })
  })
  it('compiles attribute directives with data:ng-attr prefix', () => {
    let injector = makeInjectorWithDirectives('myDirective', () => {
      return {
        restrict: 'EACM',
        compile: function(element) {
          element.data('hasCompiled', true)
        }
      }
    })
    injector.invoke($compile => {
      let el = $('<div data:ng-attr-my-directive></div>')
      $compile(el)
      expect(el.data('hasCompiled')).toBe(true)
    })
  })
  it('compiles class directives', () => {
    let injector = makeInjectorWithDirectives('myDirective', () => {
      return {
        restrict: 'EACM',
        compile: function(element) {
          element.data('hasCompiled', true)
        }
      }
    })
    injector.invoke($compile => {
      let el = $('<div class="my-directive"></div>')
      $compile(el)
      expect(el.data('hasCompiled')).toBe(true)
    })
  })
  it('compiles several class directives in an element', () => {
    let injector = makeInjectorWithDirectives({
      myDirective: function() {
        return {
          restrict: 'EACM',
          compile: function(element) {
            element.data('hasCompiled', true)
          }
        }
      },
      mySecondDirective: function() {
        return {
          restrict: 'EACM',
          compile: function(element) {
            element.data('secondCompiled', true)
          }
        }
      }
    })
    injector.invoke($compile => {
      let el = $('<div class="my-directive my-second-directive"></div>')
      $compile(el)
      expect(el.data('hasCompiled')).toBe(true)
      expect(el.data('secondCompiled')).toBe(true)
    })
  })
  it('compiles class directives with prefixes', () => {
    let injector = makeInjectorWithDirectives('myDirective', () => {
      return {
        restrict: 'EACM',
        compile: function(element) {
          element.data('hasCompiled', true)
        }
      }
    })
    injector.invoke($compile => {
      let el = $('<div class="x-my-directive"></div>')
      $compile(el)
      expect(el.data('hasCompiled')).toBe(true)
    })
  })
  it('compiles comment directives', () => {
    let hasCompiled
    let injector = makeInjectorWithDirectives('myDirective', () => {
      return {
        restrict: 'M',
        compile: function(element) {
          hasCompiled = true
        }
      }
    })
    injector.invoke($compile => {
      let el = $('<!-- directive: my-directive -->')
      $compile(el)
      expect(hasCompiled).toBe(true)
    })
  })
  utils.forEach(
    {
      E: { element: true, attribute: false, class: false, comment: false },
      A: { element: false, attribute: true, class: false, comment: false },
      C: { element: false, attribute: false, class: true, comment: false },
      M: { element: false, attribute: false, class: false, comment: true },
      EA: { element: true, attribute: true, class: false, comment: false },
      AC: { element: false, attribute: true, class: true, comment: false },
      EAM: { element: true, attribute: true, class: false, comment: true },
      EACM: { element: true, attribute: true, class: true, comment: true }
    },
    (restrict, expected) => {
      describe('restricted to ' + restrict, () => {
        utils.forEach(
          {
            element: '<my-directive></my-directive>',
            attribute: '<div my-directive></div>',
            class: '<div class="my-directive"></div>',
            comment: '<!-- directive: my-directive -->'
          },
          (type, dom) => {
            it(
              (expected[type] ? 'matches' : 'does not match') + ' on ' + type,
              () => {
                let hasCompiled = false
                let injector = makeInjectorWithDirectives('myDirective', () => {
                  return {
                    restrict: restrict,
                    compile: function(element) {
                      hasCompiled = true
                    }
                  }
                })
                injector.invoke($compile => {
                  let el = $(dom)
                  $compile(el)
                  expect(hasCompiled).toBe(expected[type])
                })
              }
            )
          }
        )
      })
    }
  )
})
