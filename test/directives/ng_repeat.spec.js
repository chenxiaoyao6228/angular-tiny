import { publishExternalAPI } from '../../src/angular_public'
import { createInjector } from '../../src/injector'
import $ from 'jquery'

describe('ngRepeat', () => {
  let $compile, $rootScope, injector
  beforeEach(() => {
    delete window.angular
    publishExternalAPI()
    injector = createInjector(['ng'])
    $compile = injector.get('$compile')
    $rootScope = injector.get('$rootScope')
  })
  it('should iterate over a list', () => {
    $rootScope.items = [{ name: 'a' }, { name: 'b' }]
    let element = $compile(
      $('<ul>' + '<li ng-repeat="item in items">{{item.name}};</li>' + '</ul>')
    )($rootScope)
    $rootScope.$digest()
    expect(element.find('li').length).toEqual(2)
    expect(element.text()).toEqual('a;b;')
    // add
    $rootScope.items.push({ name: 'c' })
    $rootScope.$digest()
    expect(element.find('li').length).toEqual(3)
    expect(element.text()).toEqual('a;b;c;')
    // remove
    $rootScope.items.pop()
    $rootScope.$digest()
    expect(element.find('li').length).toEqual(2)
    expect(element.text()).toEqual('a;b;')
  })
})
