import { setupModuleLoader } from './loader'
import $FilterProvider from '../src/filter'
import $ParseProvider from '../src/parser'
import $RootScopeProvider from '../src/scope'

export function publishExternalAPI() {
  'use strict'
  setupModuleLoader(window)
  let ngModule = angular.module('ng', [])
  ngModule.provider('$filter', $FilterProvider)
  ngModule.provider('$parse', $ParseProvider)
  ngModule.provider('$rootScope', $RootScopeProvider)
}
