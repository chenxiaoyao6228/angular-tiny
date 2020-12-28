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
  })
})
