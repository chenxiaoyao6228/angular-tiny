import { setupModuleLoader } from './loader'
import $FilterProvider from '../src/filter'
import $ParseProvider from '../src/parser'
import $RootScopeProvider from '../src/scope'
import { $QProvider, $$QProvider } from '../src/q'
import $HttpBackendProvider from './http_backend'
import $HttpProvider, { $HttpParamSerializerProvider } from './http'

export function publishExternalAPI() {
  'use strict'
  setupModuleLoader(window)
  let ngModule = angular.module('ng', [])
  ngModule.provider('$filter', $FilterProvider)
  ngModule.provider('$parse', $ParseProvider)
  ngModule.provider('$rootScope', $RootScopeProvider)
  ngModule.provider('$q', $QProvider)
  ngModule.provider('$$q', $$QProvider)
  ngModule.provider('$httpBackend', $HttpBackendProvider)
  ngModule.provider('$http', $HttpProvider)
  ngModule.provider('$httpParamSerializer', $HttpParamSerializerProvider)
}
