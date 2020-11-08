import utils from './utils'
export default function $HttpBackendProvider() {
  this.$get = function() {
    return function $httpBackend(
      method,
      url,
      post,
      headers = {},
      callback,
      withCredentials
    ) {
      let request = new XMLHttpRequest()
      request.open(method, url, true)
      // set before send method and after open
      utils.forEach(headers, (key, value) => {
        request.setRequestHeader(key, value)
      })
      if (withCredentials) {
        request.withCredentials = true
      }
      request.send(post || null)
      request.onload = function() {
        let response =
          'response' in request ? request.response : request.responseText
        let statusText = request.statusText || ''
        callback(
          request.status,
          response,
          request.getAllResponseHeaders(),
          statusText
        )
      }
      request.onerror = function() {
        callback(-1, null, '')
      }
    }
  }
}
