export default function $QProvider() {
  this.$get = [
    '$rootScope',
    function($rootScope) {
      function Promise() {
        this.$$state = {
          pending: [],
          status: 0, // 1为resolved状态
          value: ''
        }
      }
      Promise.prototype.then = function(onFulfilled) {
        this.$$state.pending = this.$$state.pending || []
        this.$$state.pending.push(onFulfilled)
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

      function scheduleProcessQueue(state) {
        $rootScope.$evalAsync(() => {
          processQueue(state)
        })
      }
      function processQueue(state) {
        let pending = state.pending
        delete state.pending
        pending.forEach(onFulfilled => {
          onFulfilled(state.value)
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
