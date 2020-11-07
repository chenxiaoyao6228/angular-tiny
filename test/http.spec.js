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
})
