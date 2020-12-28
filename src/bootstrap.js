import $ from 'jquery'
import { publishExternalAPI } from './angular_public'
import { createInjector } from './injector'

publishExternalAPI()

window.angular.bootstrap = function bootstrap() {
  let injector = createInjector()
  return injector
}
