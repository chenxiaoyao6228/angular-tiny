import $ from 'jquery'
import { publishExternalAPI } from './angular_public'
import { createInjector } from './injector'
import utils from '../src/utils'

publishExternalAPI()

window.angular.bootstrap = function bootstrap(element, modules, config) {
  const $element = $(element)
  modules = modules || []
  modules.unshift([
    '$provide',
    function($provide) {
      $provide.value('$rootElement', $element)
    }
  ])
  modules.unshift('ng')
  let strictDi = config && config.strictDi
  let injector = createInjector(modules, strictDi)
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
let ngAttrPrefixes = ['ng-', 'data-ng-', 'ng:', 'x-ng-']

// 在dom树构建完成之后遍历查找需要compile的root节点,执行bootstrap
$(document).ready(() => {
  let foundAppElement,
    foundModule,
    config = {}
  utils.forEach(ngAttrPrefixes, prefix => {
    let attrName = prefix + 'app'
    let selector = '[' + attrName.replace(':', '\\:') + ']'
    let element
    if (!foundAppElement && (element = document.querySelector(selector))) {
      foundAppElement = element
      foundModule = element.getAttribute(attrName)
    }
  })
  if (foundAppElement) {
    config.strictDi = utils.some(ngAttrPrefixes, prefix => {
      let attrName = prefix + 'strict-di'
      return foundAppElement.hasAttribute(attrName)
    })
    window.angular.bootstrap(
      foundAppElement,
      foundModule ? [foundModule] : [],
      config
    )
  }
})
