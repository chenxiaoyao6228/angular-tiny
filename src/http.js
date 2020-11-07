export default function $HttpProvider() {
  this.$get = [
    '$httpBackend',
    '$q',
    function($httpBackend, $q) {
      return function $http(config) {
        let deferred = $q.defer()
        $httpBackend(config.method, config.url, config.data)
        return deferred.promise
      }
    }
  ]
}
