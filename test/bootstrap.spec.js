import $ from 'jquery'
import '../src/bootstrap.js'

describe('bootstrap', () => {
  describe('manual', () => {
    it('is available', () => {
      expect(window.angular.bootstrap).toBeDefined()
    })
    it('creates and returns an injector', () => {
      let element = $('<div></div>')
      let injector = window.angular.bootstrap(element)
      expect(injector).toBeDefined()
      expect(injector.invoke).toBeDefined()
    })
    it('attaches the injector to the bootstrapped element', () => {
      let element = $('<div></div>')
      let injector = window.angular.bootstrap(element)
      expect(element.data('$injector')).toBe(injector)
    })
    it('loads built-ins into the injector', () => {
      let element = $('<div></div>')
      window.angular.bootstrap(element)

      let injector = element.data('$injector')
      expect(injector.has('$compile')).toBe(true)
      expect(injector.has('$rootScope')).toBe(true)
    })
    it('loads other specified modules into the injector', () => {
      let element = $('<div></div>')

      window.angular.module('myModule', []).constant('aValue', 42)
      window.angular.module('mySecondModule', []).constant('aSecondValue', 43)
      window.angular.bootstrap(element, ['myModule', 'mySecondModule'])

      let injector = element.data('$injector')
      expect(injector.get('aValue')).toBe(42)
      expect(injector.get('aSecondValue')).toBe(43)
    })
    it('makes root element available for injection', () => {
      let element = $('<div></div>')

      window.angular.bootstrap(element)

      let injector = element.data('$injector')
      expect(injector.has('$rootElement')).toBe(true)
      expect(injector.get('$rootElement')[0]).toBe(element[0])
    })
    it('compiles the element', () => {
      let element = $('<div><div my-directive></div></div>')
      let compileSpy = jest.fn()
      window.angular.module('myModule', []).directive('myDirective', () => {
        return { compile: compileSpy }
      })
      window.angular.bootstrap(element, ['myModule'])

      expect(compileSpy).toHaveBeenCalled()
    })
    it('links the element', () => {
      let element = $('<div><div my-directive></div></div>')
      let linkSpy = jest.fn()

      window.angular.module('myModule', []).directive('myDirective', () => {
        return { link: linkSpy }
      })
      window.angular.bootstrap(element, ['myModule'])

      expect(linkSpy).toHaveBeenCalled()
      expect(linkSpy.mock.calls[linkSpy.mock.calls.length - 1][0]).toEqual(
        element.data('$injector').get('$rootScope')
      )
    })
    it('runs a digest', () => {
      let element = $('<div><div my-directive>{{expr}}</div></div>')

      window.angular.module('myModule', []).directive('myDirective', () => {
        return {
          link: function(scope) {
            scope.expr = '42'
          }
        }
      })
      window.angular.bootstrap(element, ['myModule'])

      expect(element.find('div').text()).toBe('42')
    })
    it('supports enabling strictDi mode', () => {
      let element = $('<div><div my-directive></div></div>')

      window.angular
        .module('myModule', [])
        .constant('aValue', 42)
        .directive('myDirective', aValue => {
          return {}
        })

      expect(() => {
        window.angular.bootstrap(element, ['myModule'], { strictDi: true })
      }).toThrow()
    })
  })
})
