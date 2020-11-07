import utils from './utils'
export default function $HttpBackendProvider() {
  this.$get = function() {
    return function $httpBackend(method, url, post, headers = {}, callback) {
      headers = Object.assign(
        {
          Accept: 'application/json, text/plain, */*'
        },
        headers
      )
      let request = new XMLHttpRequest()
      request.open(method, url, true)
      // set before send method and after open
      utils.forEach(headers, (key, value) => {
        request.setRequestHeader(key, value)
      })
      request.send(post || null)
      request.onload = function() {
        let response =
          'response' in request ? request.response : request.responseText
        let statusText = request.statusText || ''
        callback(request.status, response, statusText)
      }
      request.onerror = function() {
        callback(-1, null, '')
      }
    }
  }
}
