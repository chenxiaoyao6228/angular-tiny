import $ from 'jquery'
import { publishExternalAPI } from './angular_public'
import { createInjector } from './injector'

publishExternalAPI()

window.angular.bootstrap = function bootstrap(element) {
  let injector = createInjector()
  element.data('$injector', injector)
  return injector
}
