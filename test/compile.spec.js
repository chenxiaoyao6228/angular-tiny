import { publishExternalAPI } from '../src/angular_public'
import { createInjector } from '../src/injector'

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
})
