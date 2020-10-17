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
        this.$$state.pending = this.$$state.pending || []
        this.$$state.pending.push([null, onFulfilled, onRejected])
        if (this.$$state.status > 0) {
          scheduleProcessQueue(this.$$state)
        }
      }

      function Deferred() {
        this.promise = new Promise()
      }

      Deferred.prototype.resolve = function(value) {
        if (this.promise.$$state.status) {
          return
        }
        this.promise.$$state.value = value
        this.promise.$$state.status = 1
        scheduleProcessQueue(this.promise.$$state)
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
        pending.forEach(handlers => {
          let fn = handlers[state.status]
          if (utils.isFunction(fn)) {
            fn(state.value)
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
