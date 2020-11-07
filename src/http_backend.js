export default function $HttpBackendProvider() {
  this.$get = function() {
    return function $httpBackend(method, url, post, callback) {
      let request = new XMLHttpRequest()
      request.open(method, url, true)
      request.send(post || null)
      request.onload = function() {
        let response =
          'response' in request ? request.response : request.responseText
        let statusText = request.statusText || ''
        callback(request.status, response, statusText)
      }
    }
  }
}
