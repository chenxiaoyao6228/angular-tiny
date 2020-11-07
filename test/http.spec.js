import { publishExternalAPI } from '../src/angular_public'
import { createInjector } from '../src/injector'
const sinon = require('sinon')

describe('$http', () => {
  let $http
  let xhr, requests
  beforeEach(() => {
    publishExternalAPI()
    let injector = createInjector(['ng'])
    $http = injector.get('$http')
  })
  beforeEach(() => {
    xhr = sinon.useFakeXMLHttpRequest()
    requests = []
    xhr.onCreate = function(req) {
      requests.push(req)
    }
  })
  afterEach(() => {
    xhr.restore()
  })

  it('is a function', () => {
    expect($http instanceof Function).toBe(true)
  })
  it('returns a Promise', () => {
    let result = $http({})
    expect(result).toBeDefined()
    expect(result.then).toBeDefined()
  })
  it('makes an XMLHttpRequest to given URL', () => {
    $http({ method: 'POST', url: 'http://teropa.info', data: 'hello' })
    expect(requests.length).toBe(1)
    expect(requests[0].method).toBe('POST')
    expect(requests[0].url).toBe('http://teropa.info')
    expect(requests[0].async).toBe(true)
    expect(requests[0].requestBody).toBe('hello')
  })

  it('resolves promise when XHR result received', () => {
    let requestConfig = { method: 'GET', url: 'http://teropa.info' }
    let response
    $http(requestConfig).then(r => {
      response = r
    })
    requests[0].respond(200, {}, 'Hello')
    expect(response.status).toBe(200)
    expect(response.statusText).toBe('OK')
    expect(response.data).toBe('Hello')
    expect(response.config.url).toEqual('http://teropa.info')
  })
  it('rejects promise when XHR result received with error status', () => {
    let requestConfig = { method: 'GET', url: 'http://teropa.info' }
    let response
    $http(requestConfig).catch(r => {
      response = r
    })
    requests[0].respond(401, {}, 'Fail')
    expect(response).toBeDefined()
    expect(response.status).toBe(401)
    expect(response.statusText).toBe('Unauthorized')
    expect(response.data).toBe('Fail')
    expect(response.config.url).toEqual('http://teropa.info')
  })
  it('rejects promise when XHR result errors/aborts', () => {
    let requestConfig = { method: 'GET', url: 'http://teropa.info' }
    let response
    $http(requestConfig).catch(r => {
      response = r
    })
    requests[0].onerror()
    expect(response).toBeDefined()
    expect(response.status).toBe(0)
    expect(response.data).toBe(null)
    expect(response.config.url).toEqual('http://teropa.info')
  })
  it('use GET method as default method', () => {
    $http({
      url: 'http://teropa.info'
    })
    expect(requests.length).toEqual(1)
    expect(requests[0].method).toEqual('GET')
  })
  it('sets headers on request', () => {
    $http({
      url: 'http://teropa.info',
      headers: { Accept: 'text/plain', 'Cache-Control': 'no-cache' }
    })
    expect(requests.length).toBe(1)
    expect(requests[0].requestHeaders.Accept).toBe('text/plain')
    expect(requests[0].requestHeaders['Cache-Control']).toBe('no-cache')
  })
  it('sets default headers on request', () => {
    $http({ url: 'http://teropa.info' })
    expect(requests.length).toBe(1)
    expect(requests[0].requestHeaders.Accept).toBe(
      'application/json, text/plain, */*'
    )
  })
  it('sets method-specific default headers on request', () => {
    $http({ method: 'POST', url: 'http://teropa.info', data: '42' })
    expect(requests.length).toBe(1)
    expect(requests[0].requestHeaders['Content-Type']).toBe(
      'application/json;charset=utf-8'
    )
  })
  it('exposes default headers for overriding', () => {
    $http.defaults.headers.post['Content-Type'] = 'text/plain;charset=utf-8'
    $http({ method: 'POST', url: 'http://teropa.info', data: '42' })
    expect(requests.length).toBe(1)
    expect(requests[0].requestHeaders['Content-Type']).toBe(
      'text/plain;charset=utf-8'
    )
  })
  it('exposes default headers through provider', () => {
    let injector = createInjector([
      'ng',
      function($httpProvider) {
        $httpProvider.defaults.headers.post['Content-Type'] =
          'text/plain;charset=utf-8'
      }
    ])
    $http = injector.get('$http')
    $http({ method: 'POST', url: 'http://teropa.info', data: '42' })
    expect(requests.length).toBe(1)
    expect(requests[0].requestHeaders['Content-Type']).toBe(
      'text/plain;charset=utf-8'
    )
  })
})
