import { setupModuleLoader } from './loader'
import utils from '../src/utils'
function $FilterProvider() {
  let filters = {}

  this.register = function(name, factory) {
    if (utils.isObject(name)) {
      return utils.map(name, (factory, name) => {
        return this.register(name, factory)
      })
    } else {
      let filter = factory()
      filters[name] = filter
      return filter
    }
  }

  this.$get = function() {
    return function filter(name) {
      return filters[name]
    }
  }
}

export function publishExternalAPI() {
  'use strict'
  setupModuleLoader(window)
  let ngModule = angular.module('ng', [])
  ngModule.provider('$filter', $FilterProvider)
}
