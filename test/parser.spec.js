import parse from '../src/parser.js'

describe('parse', () => {
  test('can parse an integer', () => {
    let fn = parse('42')
    expect(fn).toBeDefined()
    expect(fn()).toEqual(42)
  })
})
