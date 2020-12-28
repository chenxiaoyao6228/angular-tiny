import $ from 'jquery'
import { publishExternalAPI } from './angular_public'
import { createInjector } from './injector'

publishExternalAPI()

window.angular.bootstrap = function bootstrap(element, modules) {
  const $element = $(element)
  modules = modules || []
  modules.unshift([
    '$provide',
    function($provide) {
      $provide.value('$rootElement', $element)
    }
  ])
  modules.unshift('ng')
  let injector = createInjector(modules)
  injector.invoke([
    '$compile',
    '$rootScope',
    function($compile, $rootScope) {
      $rootScope.$apply(() => {
        $compile($element)($rootScope)
      })
    }
  ])
  element.data('$injector', injector)
  return injector
}
