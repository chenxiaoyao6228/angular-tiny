import { setupModuleLoader } from '../src/loader'
describe('setupModuleLoader', () => {
  beforeEach(() => {
    delete window.angular
  })
  it('exposes angular on the window', () => {
    setupModuleLoader(window)
    expect(window.angular).toBeDefined()
  })
  it('create angular just one', () => {
    setupModuleLoader(window)
    let ng = window.angular
    setupModuleLoader(window)
    expect(window.angular).toEqual(ng)
  })
  it('exposes the angular module function', () => {
    setupModuleLoader(window)
    expect(window.angular.module).toBeDefined()
  })
})
