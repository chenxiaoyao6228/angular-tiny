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
  it('produces an identity function for static content', () => {
    let injector = createInjector(['ng'])
    let $interpolate = injector.get('$interpolate')
    let interp = $interpolate('hello')
    expect(interp instanceof Function).toBe(true)
    expect(interp()).toEqual('hello')
  })
  it('evaluates a single expression', () => {
    let injector = createInjector(['ng'])
    let $interpolate = injector.get('$interpolate')
    let interp = $interpolate('{{anAttr}}')
    expect(interp({ anAttr: '42' })).toEqual('42')
  })
  test('evalueates many expressions', () => {
    let injector = createInjector(['ng'])
    let $interpolate = injector.get('$interpolate')

    let interp = $interpolate('First {{ anAttr }}, then {{anotherAttr}}!')
    expect(interp({ anAttr: '42', anotherAttr: '43' })).toEqual(
      'First 42, then 43!'
    )
  })
  it('passes through ill-defined interpolations', () => {
    let injector = createInjector(['ng'])
    let $interpolate = injector.get('$interpolate')
    let interp = $interpolate('why u no }}work{{')
    expect(interp({})).toEqual('why u no }}work{{')
  })
})
