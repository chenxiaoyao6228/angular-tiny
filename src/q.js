export default function $QProvider() {
  this.$get = [
    '$rootScope',
    function($rootScope) {
      function Promise() {
        this.$$state = {
          pending: () => {},
          value: ''
        }
      }
      Promise.prototype.then = function(onFulfilled) {
        this.$$state.pending = onFulfilled
      }

      function Deferred() {
        this.promise = new Promise()
      }

      Deferred.prototype.resolve = function(value) {
        this.promise.$$state.value = value
        scheduleProcessQueue(this.promise.$$state)
      }

      function scheduleProcessQueue(state) {
        $rootScope.$evalAsync(() => {
          processQueue(state)
        })
      }
      function processQueue(state) {
        state.pending(state.value)
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
