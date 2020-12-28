import { publishExternalAPI } from './angular_public'
import { createInjector } from './injector'

publishExternalAPI()

window.angular.bootstrap = function bootstrap(element, modules) {
  modules = ['ng'].concat(modules || [])
  let injector = createInjector(modules)
  element.data('$injector', injector)
  return injector
}
