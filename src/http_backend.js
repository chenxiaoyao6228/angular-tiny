import utils from './utils'
export default function $HttpBackendProvider() {
  this.$get = function() {
    return function $httpBackend(
      method,
      url,
      post,
      headers = {},
      timeout,
      callback,
      withCredentials
    ) {
      let request = new XMLHttpRequest()
      let timeoutId
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
        if (timeoutId !== undefined) {
          clearTimeout(timeoutId)
        }
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
        if (timeoutId !== undefined) {
          clearTimeout(timeoutId)
        }
        callback(-1, null, '')
      }
      if (timeout && timeout.then) {
        timeout.then(() => {
          request.abort()
        })
      } else if (timeout > 0) {
        timeoutId = setTimeout(() => {
          request.abort()
        }, timeout)
      }
    }
  }
}
