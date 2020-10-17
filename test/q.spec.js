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
  it('may have multiple callbacks', () => {
    let d = $q.defer()
    let firstSpy = jest.fn()
    let secondSpy = jest.fn()
    d.promise.then(firstSpy)
    d.promise.then(secondSpy)
    d.resolve(42)
    $rootScope.$apply()
    expect(firstSpy).toHaveBeenCalledWith(42)
    expect(secondSpy).toHaveBeenCalledWith(42)
  })
  it('invokes callbacks once', () => {
    let d = $q.defer()
    let firstSpy = jest.fn()
    let secondSpy = jest.fn()
    d.promise.then(firstSpy)
    d.resolve(42)
    $rootScope.$apply()
    expect(firstSpy.mock.calls.length).toBe(1)
    expect(secondSpy.mock.calls.length).toBe(0)
    d.promise.then(secondSpy)
    expect(firstSpy.mock.calls.length).toBe(1)
    expect(secondSpy.mock.calls.length).toBe(0)
    $rootScope.$apply()
    expect(firstSpy.mock.calls.length).toBe(1)
    expect(secondSpy.mock.calls.length).toBe(1)
  })
  it('can reject a deferred', () => {
    let d = $q.defer()
    let fulfillSpy = jest.fn()
    let rejectSpy = jest.fn()
    d.promise.then(fulfillSpy, rejectSpy)
    d.reject('fail')
    $rootScope.$apply()
    expect(fulfillSpy).not.toHaveBeenCalled()
    expect(rejectSpy).toHaveBeenCalledWith('fail')
  })
  it('can reject just once', () => {
    let d = $q.defer()

    let rejectSpy = jest.fn()
    d.promise.then(null, rejectSpy)

    d.reject('fail')
    $rootScope.$apply()
    expect(rejectSpy.mock.calls.length).toEqual(1)

    d.reject('fail again')
    $rootScope.$apply()
    expect(rejectSpy.mock.calls.length).toEqual(1)
  })
  it('cannot fulfill a promise once rejected', () => {
    let d = $q.defer()
    let fulfillSpy = jest.fn()
    let rejectSpy = jest.fn()

    d.promise.then(fulfillSpy, rejectSpy)
    d.reject('fail')
    $rootScope.$apply()
    d.resolve('success')
    $rootScope.$apply()
    expect(fulfillSpy).not.toHaveBeenCalled()
  })
  it('does not require a failure handler each time', () => {
    let d = $q.defer()
    let fulfillSpy = jest.fn()
    let rejectSpy = jest.fn()
    d.promise.then(fulfillSpy)
    d.promise.then(null, rejectSpy)
    d.reject('fail')
    $rootScope.$apply()
    expect(rejectSpy).toHaveBeenCalledWith('fail')
  })
  it('does not require a success handler each time', () => {
    let d = $q.defer()
    let fulfillSpy = jest.fn()
    let rejectSpy = jest.fn()
    d.promise.then(fulfillSpy)
    d.promise.then(null, rejectSpy)
    d.resolve('ok')
    $rootScope.$apply()
    expect(fulfillSpy).toHaveBeenCalledWith('ok')
  })
  it('can register rejection handler with catch', () => {
    let d = $q.defer()
    let rejectSpy = jest.fn()
    d.promise.catch(rejectSpy)
    d.reject('fail')
    $rootScope.$apply()
    expect(rejectSpy).toHaveBeenCalled()
  })
  it('invokes a finally handler when fulfilled', () => {
    let d = $q.defer()
    let finallySpy = jest.fn()
    d.promise.finally(finallySpy)
    d.resolve(42)
    $rootScope.$apply()
    expect(finallySpy).toHaveBeenCalledWith()
  })
  it('invokes a finally handler when rejected', () => {
    let d = $q.defer()
    let finallySpy = jest.fn()
    d.promise.finally(finallySpy)
    d.reject('fail')
    $rootScope.$apply()
    expect(finallySpy).toHaveBeenCalledWith()
  })
  it('allows chaining handlers', () => {
    let d = $q.defer()
    let fulfilledSpy = jest.fn()
    d.promise
      .then(result => {
        return result + 1
      })
      .then(result => {
        return result * 2
      })
      .then(fulfilledSpy)
    d.resolve(20)
    $rootScope.$apply()
    expect(fulfilledSpy).toHaveBeenCalledWith(42)
  })
  it('does not modify original resolution in chains', () => {
    let d = $q.defer()
    let fulfilledSpy = jest.fn()
    d.promise
      .then(result => {
        return result + 1
      })
      .then(result => {
        return result * 2
      })
    d.promise.then(fulfilledSpy)
    d.resolve(20)
    $rootScope.$apply()
    expect(fulfilledSpy).toHaveBeenCalledWith(20)
  })
})
