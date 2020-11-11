import utils from './utils'
import _ from 'lodash'

function qFactory(callLater) {
  function Promise() {
    this.$$state = {
      pending: [],
      status: 0, // 1为resolved状态, 2为rejected
      value: ''
    }
  }
  Promise.prototype.then = function(onFulfilled, onRejected, onProgress) {
    let result = new Deferred()
    this.$$state.pending = this.$$state.pending || []
    this.$$state.pending.push([result, onFulfilled, onRejected, onProgress])
    if (this.$$state.status > 0) {
      scheduleProcessQueue(this.$$state)
    }
    return result.promise
  }
  Promise.prototype.catch = function(onRejected) {
    return this.then(null, onRejected)
  }

  Promise.prototype.finally = function(callback, progressBack) {
    return this.then(
      value => {
        return handleFinallyCallback(callback, value, true)
      },
      rejection => {
        return handleFinallyCallback(callback, rejection, false)
      },
      progressBack
    )
  }

  function makePromise(value, resolved) {
    let d = new Deferred()
    if (resolved) {
      d.resolve(value)
    } else {
      d.reject(value)
    }
    return d.promise
  }

  function handleFinallyCallback(callback, value, resolved) {
    let callbackValue = callback()
    if (callbackValue && callbackValue.then) {
      return callbackValue.then(() => {
        return makePromise(value, resolved)
      })
    } else {
      return makePromise(value, resolved)
    }
  }

  function Deferred() {
    this.promise = new Promise()
  }

  Deferred.prototype.resolve = function(value) {
    if (this.promise.$$state.status) {
      return
    }
    if (value && utils.isFunction(value.then)) {
      value.then(
        this.resolve.bind(this),
        this.reject.bind(this),
        this.notify.bind(this)
      )
    } else {
      this.promise.$$state.value = value
      this.promise.$$state.status = 1
      scheduleProcessQueue(this.promise.$$state)
    }
  }
  Deferred.prototype.reject = function(reason) {
    if (this.promise.$$state.status) {
      return
    }
    this.promise.$$state.value = reason
    this.promise.$$state.status = 2
    scheduleProcessQueue(this.promise.$$state)
  }
  Deferred.prototype.notify = function(progress) {
    let pending = this.promise.$$state.pending
    if (pending && pending.length && !this.promise.$$state.status) {
      callLater(() => {
        pending.forEach(handlers => {
          let deferred = handlers[0]
          let progressBack = handlers[3]
          try {
            deferred.notify(
              utils.isFunction(progressBack) ? progressBack(progress) : progress
            )
          } catch (e) {
            console.log(e)
          }
        })
      })
    }
  }

  function scheduleProcessQueue(state) {
    callLater(() => {
      processQueue(state)
    })
  }
  function processQueue(state) {
    let pending = state.pending
    delete state.pending
    pending &&
      pending.forEach(handlers => {
        let deferred = handlers[0]
        let fn = handlers[state.status]
        try {
          if (utils.isFunction(fn)) {
            deferred.resolve(fn(state.value))
          } else if (state.status === 1) {
            deferred.resolve(state.value)
          } else {
            deferred.reject(state.value)
          }
        } catch (e) {
          deferred.reject(e)
        }
      })
  }

  function defer() {
    return new Deferred()
  }

  function reject(rejection) {
    let d = defer()
    d.reject(rejection)
    return d.promise
  }

  function when(value, callback, errback, progressBack) {
    let d = defer()
    d.resolve(value)
    return d.promise.then(callback, errback, progressBack)
  }

  function all(promises) {
    let results = utils.isArray(promises) ? [] : {}
    let counter = 0
    let d = defer()
    // eslint-disable-next-line
    _.forEach(promises, (promise, index) => {
      counter++
      when(promise).then(
        value => {
          results[index] = value
          counter--
          if (!counter) {
            d.resolve(results)
          }
        },
        rejection => {
          d.reject(rejection)
        }
      )
    })

    if (!counter) {
      d.resolve(results)
    }

    return d.promise
  }

  let $Q = function Q(resolver) {
    if (!utils.isFunction(resolver)) {
      throw 'Expected function, got ' + resolver
    }
    let d = defer()
    resolver(d.resolve.bind(d), d.reject.bind(d))
    return d.promise
  }

  return utils.extend($Q, {
    defer,
    reject,
    when,
    resolve: when,
    all
  })
}

export function $QProvider() {
  this.$get = [
    '$rootScope',
    function($rootScope) {
      return qFactory(callback => {
        $rootScope.$evalAsync(callback)
      })
    }
  ]
}

export function $$QProvider() {
  this.$get = () => {
    return qFactory(callback => {
      setTimeout(callback, 0)
    })
  }
}
