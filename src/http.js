export default function $HttpProvider() {
  this.$get = [
    '$httpBackend',
    '$q',
    '$rootScope',
    function($httpBackend, $q, $rootScope) {
      return function $http(config) {
        config = Object.assign({ method: 'GET' }, config)
        let deferred = $q.defer()
        function isSuccess(status) {
          return status >= 200 && status < 300
        }
        function done(status, response, statusText) {
          status = Math.max(status, 0)
          deferred[isSuccess(status) ? 'resolve' : 'reject']({
            status: status,
            data: response,
            statusText: statusText,
            config: config
          })

          if (!$rootScope.$$phase) {
            $rootScope.$apply()
          }
        }
        $httpBackend(
          config.method,
          config.url,
          config.data,
          config.headers,
          done
        )
        return deferred.promise
      }
    }
  ]
}
