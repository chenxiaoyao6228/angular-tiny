import { publishExternalAPI } from '../src/angular_public'
import { createInjector } from '../src/injector'
describe('angularPublic', () => {
  'use strict'
  it('sets up the angular object and the module loader', () => {
    publishExternalAPI()
    expect(window.angular).toBeDefined()
    expect(window.angular.module).toBeDefined()
  })
  it('sets up the ng module', () => {
    publishExternalAPI()
    expect(createInjector(['ng'])).toBeDefined()
  })
  it('sets up the $filter service', () => {
    publishExternalAPI()
    let injector = createInjector(['ng'])
    expect(injector.has('$filter')).toBe(true)
  })
})
