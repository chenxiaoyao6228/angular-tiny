import { publishExternalAPI } from '../src/angular_public'
import { createInjector } from '../src/injector'

describe('$q', () => {
  let $q, $rootScope
  beforeEach(() => {
    publishExternalAPI()
    let injector = createInjector(['ng'])
    $rootScope = injector.get('$rootScope')
    $q = injector.get('$q')
  })
  it('can create a Deferred', () => {
    let d = $q.defer()
    expect(d).toBeDefined()
  })
  it('can resolve a promise', async () => {
    let deferred = $q.defer()
    let promise = deferred.promise

    let promiseSpy = jest.fn()

    promise.then(promiseSpy)

    deferred.resolve('a-ok')

    await new Promise(resolve => setTimeout(resolve, 1))

    expect(promiseSpy).toHaveBeenCalledWith('a-ok')
  })
  it('works when resolved before promise listener', async () => {
    let d = $q.defer()
    d.resolve(42)

    let promiseSpy = jest.fn()
    d.promise.then(promiseSpy)

    await new Promise(resolve => setTimeout(resolve, 1))
    expect(promiseSpy).toHaveBeenCalledWith(42)
  })
  it('does not resolve promise immediately', async () => {
    let d = $q.defer()
    let promiseSpy = jest.fn()
    d.promise.then(promiseSpy)

    d.resolve(42)
    expect(promiseSpy).not.toHaveBeenCalled()
  })
  it('resolves promise at next digest', () => {
    let d = $q.defer()
    let promiseSpy = jest.fn()
    d.promise.then(promiseSpy)
    d.resolve(42)
    expect(promiseSpy).not.toHaveBeenCalled()
    $rootScope.$apply()
    expect(promiseSpy).toHaveBeenCalledWith(42)
  })
  it('may only be resolved once', () => {
    let d = $q.defer()
    let promiseSpy = jest.fn()
    d.promise.then(promiseSpy)
    d.resolve(42)
    d.resolve(43)
    $rootScope.$apply()
    expect(promiseSpy.mock.calls.length).toEqual(1)
    expect(promiseSpy).toHaveBeenCalledWith(42)
  })
  it('may only ever be resolved once', () => {
    let d = $q.defer()
    let promiseSpy = jest.fn()
    d.promise.then(promiseSpy)
    d.resolve(42)
    $rootScope.$apply()
    expect(promiseSpy).toHaveBeenCalledWith(42)
    d.resolve(43)
    $rootScope.$apply()
    expect(promiseSpy.mock.calls.length).toEqual(1)
  })
  it('resolves a listener added after resolution', () => {
    let d = $q.defer()
    d.resolve(42)
    $rootScope.$apply()
    let promiseSpy = jest.fn()
    d.promise.then(promiseSpy)
    $rootScope.$apply()
    expect(promiseSpy).toHaveBeenCalledWith(42)
  })
})
