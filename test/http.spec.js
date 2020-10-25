import { publishExternalAPI } from '../src/angular_public'
import { createInjector } from '../src/injector'

describe('$http', () => {
  let $http
  beforeEach(() => {
    publishExternalAPI()
    let injector = createInjector(['ng'])
    $http = injector.get('$http')
  })
  it('is a function', () => {
    expect($http instanceof Function).toBe(true)
  })
  it('returns a Promise', () => {
    let result = $http({})
    expect(result).toBeDefined()
    expect(result.then).toBeDefined()
  })
})
