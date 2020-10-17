import utils from './utils'
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
      }
      Promise.prototype.then = function(onFulfilled, onRejected) {
        let result = new Deferred()
        this.$$state.pending = this.$$state.pending || []
        this.$$state.pending.push([result, onFulfilled, onRejected])
        if (this.$$state.status > 0) {
          scheduleProcessQueue(this.$$state)
        }
        return result.promise
      }
      Promise.prototype.catch = function(onRejected) {
        return this.then(null, onRejected)
      }

      Promise.prototype.finally = function(callback) {
        return this.then(
          () => callback(),
          () => callback()
        )
      }

      function Deferred() {
        this.promise = new Promise()
      }

      Deferred.prototype.resolve = function(value) {
        if (this.promise.$$state.status) {
          return
        }
        if (value && utils.isFunction(value.then)) {
          value.then(this.resolve.bind(this), this.reject.bind(this))
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
