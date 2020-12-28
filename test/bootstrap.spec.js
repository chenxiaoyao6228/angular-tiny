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
  })
})
