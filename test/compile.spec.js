import { publishExternalAPI } from '../src/angular_public'
import { createInjector } from '../src/injector'
import utils from '../src/utils'
import $ from 'jquery'

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
})
