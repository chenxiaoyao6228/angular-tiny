import { publishExternalAPI } from '../src/angular_public'
import { createInjector } from '../src/injector'
describe('$interpolate', () => {
  beforeEach(() => {
    delete window.angular
    publishExternalAPI()
  })
  it('exists', () => {
    let injector = createInjector(['ng'])
    expect(injector.has('$interpolate')).toBe(true)
  })
})
