export default function $HttpBackendProvider() {
  this.$get = function() {
    return function $httpBackend(method, url, post) {
      let request = new XMLHttpRequest()
      request.open(method, url, true)
      request.send(post || null)
    }
  }
}
