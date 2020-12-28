import { publishExternalAPI } from './angular_public'
import { createInjector } from './injector'

publishExternalAPI()

window.angular.bootstrap = function bootstrap(element) {
  let injector = createInjector(['ng'])
  element.data('$injector', injector)
  return injector
}
