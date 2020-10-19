import utils from './utils'
let uuid = 0
export default function $QProvider() {
  this.$get = [
    '$rootScope',
    function($rootScope) {
      function Promise() {
        this.$$state = {
          pending: [],
          status: 0, // 1为resolved状态, 2为rejected
          value: ''
        }
        this.id = 0
      }
      Promise.prototype.then = function(onFulfilled, onRejected, onProgress) {
        let result = new Deferred()
        this.$$state.pending = this.$$state.pending || []
        this.$$state.pending.push([result, onFulfilled, onRejected, onProgress])
        if (this.$$state.status > 0) {
          scheduleProcessQueue(this.$$state)
        }
        result.promise.id = uuid++
        return result.promise
      }
      Promise.prototype.catch = function(onRejected) {
        return this.then(null, onRejected)
      }

      Promise.prototype.finally = function(callback) {
        return this.then(
          value => {
            return handleFinallyCallback(callback, value, true)
          },
          rejection => {
            return handleFinallyCallback(callback, rejection, false)
          }
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
          $rootScope.$evalAsync(() => {
            pending.forEach(handlers => {
              let deferred = handlers[0]
              let progressBack = handlers[3]
              try {
                deferred.notify(
                  utils.isFunction(progressBack)
                    ? progressBack(progress)
                    : progress
                )
              } catch (e) {
                console.log(e)
              }
            })
          })
        }
      }

      function scheduleProcessQueue(state) {
        $rootScope.$evalAsync(() => {
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
      return {
        defer
      }
    }
  ]
}
