export default function $HttpProvider() {
  this.$get = [
    '$httpBackend',
    '$q',
    function($httpBackend, $q) {
      return function $http() {
        let deferred = $q.defer()
        return deferred.promise
      }
    }
  ]
}
