import { publishExternalAPI } from './angular_public'
import { createInjector } from './injector'
import $ from 'jquery'

publishExternalAPI()

window.angular.bootstrap = function bootstrap() {}
