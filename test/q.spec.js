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
  it('catches rejection on chained handler', () => {
    let d = $q.defer()
    let rejectedSpy = jest.fn()
    d.promise.then(() => () => {}).catch(rejectedSpy)
    d.reject('fail')
    $rootScope.$apply()
    expect(rejectedSpy).toHaveBeenCalledWith('fail')
  })
  it('fulfills on chained handler', () => {
    let d = $q.defer()
    let fulfilledSpy = jest.fn()
    d.promise.catch(() => () => {}).then(fulfilledSpy)
    d.resolve(42)
    $rootScope.$apply()
    expect(fulfilledSpy).toHaveBeenCalledWith(42)
  })
  it('treats catch return value as resolution', () => {
    let d = $q.defer()
    let fulfilledSpy = jest.fn()
    d.promise
      .catch(() => {
        return 42
      })
      .then(fulfilledSpy)
    d.reject('fail')
    $rootScope.$apply()
    expect(fulfilledSpy).toHaveBeenCalledWith(42)
  })
  it('rejects chained promise when handler throws', () => {
    let d = $q.defer()
    let rejectedSpy = jest.fn()
    d.promise
      .then(() => {
        throw 'fail'
      })
      .catch(rejectedSpy)
    d.resolve(42)
    $rootScope.$apply()
    expect(rejectedSpy).toHaveBeenCalledWith('fail')
  })
  it('does not reject current promise when handler throws', () => {
    let d = $q.defer()
    let rejectedSpy = jest.fn()
    d.promise.then(() => {
      throw 'fail'
    })
    d.promise.catch(rejectedSpy)
    d.resolve(42)
    $rootScope.$apply()
    expect(rejectedSpy).not.toHaveBeenCalled()
  })
  it('waits on promise returned from handler', () => {
    let d = $q.defer()
    let fulfilledSpy = jest.fn()
    // eslint-disable-next-line
    d.promise
      .then(v => {
        let d2 = $q.defer()
        d2.resolve(v + 1)
        return d2.promise
      })
      .then(v => {
        return v * 2
      })
      .then(fulfilledSpy)
    d.resolve(20)
    $rootScope.$apply()
    expect(fulfilledSpy).toHaveBeenCalledWith(42)
  })
  it('waits on promise given to resolve', () => {
    let d = $q.defer()
    let d2 = $q.defer()
    let fulfilledSpy = jest.fn()
    d.promise.then(fulfilledSpy)
    d2.resolve(42)
    d.resolve(d2.promise)
    $rootScope.$apply()
    expect(fulfilledSpy).toHaveBeenCalledWith(42)
  })
  it('rejects when promise returned from handler rejects', () => {
    let d = $q.defer()
    let rejectedSpy = jest.fn()
    // eslint-disable-next-line
    d.promise
      .then(() => {
        let d2 = $q.defer()
        d2.reject('fail')
        return d2.promise
      })
      .catch(rejectedSpy)
    d.resolve('ok')
    $rootScope.$apply()
    expect(rejectedSpy).toHaveBeenCalledWith('fail')
  })
  it('allows chaining handlers on finally, with original value', () => {
    let d = $q.defer()
    let fulfilledSpy = jest.fn()
    d.promise
      .then(result => {
        return result + 1
      })
      .finally(result => {
        return result * 2
      })
      .then(fulfilledSpy)
    d.resolve(20)
    $rootScope.$apply()
    expect(fulfilledSpy).toHaveBeenCalledWith(21)
  })
  it('allows chaining handlers on finally, with original rejection', () => {
    let d = $q.defer()
    let rejectedSpy = jest.fn()
    d.promise
      .then(result => {
        throw 'fail'
      })
      .finally(() => {})
      .catch(rejectedSpy)
    d.resolve(20)
    $rootScope.$apply()
    expect(rejectedSpy).toHaveBeenCalledWith('fail')
  })
  it('rejects to original value when nested promise resolves', () => {
    let d = $q.defer()
    let rejectedSpy = jest.fn()
    let resolveNested
    d.promise
      .then(result => {
        throw 'fail'
      })
      .finally(result => {
        let d2 = $q.defer()
        resolveNested = function() {
          d2.resolve('abc')
        }
        return d2.promise
      })
      .catch(rejectedSpy)
    d.resolve(20)
    $rootScope.$apply()
    expect(rejectedSpy).not.toHaveBeenCalled()
    resolveNested()
    $rootScope.$apply()
    expect(rejectedSpy).toHaveBeenCalledWith('fail')
  })
  it('rejects when nested promise rejects in finally', () => {
    let d = $q.defer()
    let fulfilledSpy = jest.fn()
    let rejectedSpy = jest.fn()
    let rejectNested
    d.promise
      .then(result => {
        return result + 1
      })
      .finally(result => {
        let d2 = $q.defer()
        rejectNested = function() {
          d2.reject('fail')
        }
        return d2.promise
      })
      .then(fulfilledSpy, rejectedSpy)
    d.resolve(20)
    $rootScope.$apply()
    expect(fulfilledSpy).not.toHaveBeenCalled()
    rejectNested()
    $rootScope.$apply()
    expect(fulfilledSpy).not.toHaveBeenCalled()
    expect(rejectedSpy).toHaveBeenCalledWith('fail')
  })
  it('can report progress', () => {
    let d = $q.defer()
    let progressSpy = jest.fn()
    d.promise.then(null, null, progressSpy)
    d.notify('working...')
    $rootScope.$apply()
    expect(progressSpy).toHaveBeenCalledWith('working...')
  })
  it('can report progress many times', () => {
    let d = $q.defer()
    let progressSpy = jest.fn()
    d.promise.then(null, null, progressSpy)
    d.notify('40%')
    $rootScope.$apply()
    d.notify('80%')
    d.notify('100%')
    $rootScope.$apply()
    expect(progressSpy.mock.calls.length).toBe(3)
  })
  it('does not notify progress after being resolved', () => {
    let d = $q.defer()
    let progressSpy = jest.fn()
    d.promise.then(null, null, progressSpy)
    d.resolve('ok')
    d.notify('working...')
    $rootScope.$apply()
    expect(progressSpy).not.toHaveBeenCalled()
  })
  it('can notify progress through chain', () => {
    let d = $q.defer()
    let progressSpy = jest.fn()
    d.promise
      .then(() => {})
      .catch(() => {})
      .then(null, null, progressSpy)
    d.notify('working...')
    $rootScope.$apply()
    expect(progressSpy).toHaveBeenCalledWith('working...')
  })
  it('transforms progress through handlers', () => {
    let d = $q.defer()
    let progressSpy = jest.fn()
    d.promise
      .then(() => {})
      .then(null, null, progress => {
        return '***' + progress + '***'
      })
      .catch(() => {})
      .then(null, null, progressSpy)
    d.notify('working...')
    $rootScope.$apply()
    expect(progressSpy).toHaveBeenCalledWith('***working...***')
  })

  it('recovers from progressback exceptions', () => {
    let d = $q.defer()
    let progressSpy = jest.fn()
    let fulfilledSpy = jest.fn()
    d.promise.then(null, null, progress => {
      throw 'fail'
    })
    d.promise.then(fulfilledSpy, null, progressSpy)
    d.notify('working...')
    d.resolve('ok')
    $rootScope.$apply()
    expect(progressSpy).toHaveBeenCalledWith('working...')
    expect(fulfilledSpy).toHaveBeenCalledWith('ok')
  })
  it('can notify progress through promise returned from handler', () => {
    let d = $q.defer()
    let progressSpy = jest.fn()
    d.promise.then(null, null, progressSpy)
    let d2 = $q.defer()
    // Resolve original with nested promise
    d.resolve(d2.promise)
    // Notify on the nested  promise
    d2.notify('working...')
    $rootScope.$apply()
    expect(progressSpy).toHaveBeenCalledWith('working...')
  })
  it('allows attaching progressback in finally', () => {
    let d = $q.defer()
    let progressSpy = jest.fn()
    d.promise.finally(null, progressSpy)
    d.notify('working...')
    $rootScope.$apply()
    expect(progressSpy).toHaveBeenCalledWith('working...')
  })
  it('can make an immediately rejected promise', () => {
    let fulfilledSpy = jest.fn()
    let rejectedSpy = jest.fn()
    let promise = $q.reject('fail')
    promise.then(fulfilledSpy, rejectedSpy)
    $rootScope.$apply()
    expect(fulfilledSpy).not.toHaveBeenCalled()
    expect(rejectedSpy).toHaveBeenCalledWith('fail')
  })
  it('can wrap a foreign promise', () => {
    let fulfilledSpy = jest.fn()
    let rejectedSpy = jest.fn()
    let promise = $q.when({
      then: function(handler) {
        $rootScope.$evalAsync(() => {
          handler('ok')
        })
      }
    })
    promise.then(fulfilledSpy, rejectedSpy)
    $rootScope.$apply()
    expect(fulfilledSpy).toHaveBeenCalledWith('ok')
    expect(rejectedSpy).not.toHaveBeenCalled()
  })
})
