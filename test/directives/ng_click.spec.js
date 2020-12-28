import { publishExternalAPI } from '../../src/angular_public'
import { createInjector } from '../../src/injector'
import $ from 'jquery'

describe('ngClick', () => {
  let $compile, $rootScope

  beforeEach(() => {
    delete window.angular
    publishExternalAPI()
    let injector = createInjector(['ng'])
    $compile = injector.get('$compile')
    $rootScope = injector.get('$rootScope')
  })

  it('starts a digest on click', () => {
    let watchSpy = jest.fn()
    $rootScope.$watch(watchSpy)

    let button = $('<button ng-click="42"></button>')
    $compile(button)($rootScope)

    button.click()
    expect(watchSpy).toHaveBeenCalled()
  })

  it('evaluates given expression on click', () => {
    $rootScope.doSomething = jest.fn()
    let button = $('<button ng-click="doSomething()"></button>')
    $compile(button)($rootScope)

    button.click()
    expect($rootScope.doSomething).toHaveBeenCalled()
  })

  it('passes $event to expression', () => {
    $rootScope.doSomething = jest.fn()
    let button = $('<button ng-click="doSomething($event)"></button>')
    $compile(button)($rootScope)

    button.click()
    let evt =
      $rootScope.doSomething.mock.calls[
        $rootScope.doSomething.mock.calls.length - 1
      ][0]
    expect(evt).toBeDefined()
    expect(evt.type).toBe('click')
    expect(evt.target).toBeDefined()
  })
})
