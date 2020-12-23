import $ from 'jquery'

import { publishExternalAPI } from '../../src/angular_public'
import { createInjector } from '../../src/injector'
describe('ngTransclude', () => {
  beforeEach(() => {
    delete window.angular
    publishExternalAPI()
  })
  function createInjectorWithTranscluderTemplate(template) {
    return createInjector([
      'ng',
      function($compileProvider) {
        $compileProvider.directive('myTranscluder', () => {
          return { transclude: true, template: template }
        })
      }
    ])
  }
  it('transcludes the parent directive transclusion', () => {
    let injector = createInjectorWithTranscluderTemplate(
      '<div ng-transclude></div>'
    )
    injector.invoke(($compile, $rootScope) => {
      let el = $('<div my-transcluder>Hello</div>')
      $compile(el)($rootScope)
      expect(el.find('> [ng-transclude]').html()).toEqual('Hello')
    })
  })
  it('empties existing contents', () => {
    let injector = createInjectorWithTranscluderTemplate(
      '<div ng-transclude>Existing contents</div>'
    )
    injector.invoke(($compile, $rootScope) => {
      let el = $('<div my-transcluder>Hello</div>')
      $compile(el)($rootScope)
      expect(el.find('> [ng-transclude]').html()).toEqual('Hello')
    })
  })
  it('may be used as element', () => {
    let injector = createInjectorWithTranscluderTemplate(
      '<ng-transclude>Existing contents</ng-transclude>'
    )
    injector.invoke(($compile, $rootScope) => {
      let el = $('<div my-transcluder>Hello</div>')
      $compile(el)($rootScope)
      expect(el.find('> ng-transclude').html()).toEqual('Hello')
    })
  })
  it('may be used as class', () => {
    let injector = createInjectorWithTranscluderTemplate(
      '<div class="ng-transclude">Existing contents</div>'
    )
    injector.invoke(($compile, $rootScope) => {
      let el = $('<div my-transcluder>Hello</div>')
      $compile(el)($rootScope)
      expect(el.find('> .ng-transclude').html()).toEqual('Hello')
    })
  })
})
