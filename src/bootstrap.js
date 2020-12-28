import $ from 'jquery'
import { publishExternalAPI } from './angular_public'
import { createInjector } from './injector'

publishExternalAPI()

window.angular.bootstrap = function bootstrap(element, modules) {
  const $element = $(element)
  modules = modules || []
  modules.unshift('ng')
  modules.unshift([
    '$provide',
    function($provide) {
      $provide.value('$rootElement', $element)
    }
  ])
  let injector = createInjector(modules)
  element.data('$injector', injector)
  return injector
}
