import { setupModuleLoader } from './loader'
import utils from '../src/utils'
function $FilterProvider($provide) {
  let filters = {}

  this.register = function(name, factory) {
    if (utils.isObject(name)) {
      return utils.map(name, (factory, name) => {
        return this.register(name, factory)
      })
    } else {
      return $provide.factory(name + 'Filter', factory)
    }
  }

  this.$get = [
    '$injector',
    function($injector) {
      return function filter(name) {
        return $injector.get(name + 'Filter')
      }
    }
  ]
}
$FilterProvider.$inject = ['$provide']

export function publishExternalAPI() {
  'use strict'
  setupModuleLoader(window)
  let ngModule = angular.module('ng', [])
  ngModule.provider('$filter', $FilterProvider)
}
