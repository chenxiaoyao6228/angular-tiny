import parse from '../src/parser.js'

describe('parse', () => {
  it('can parse an integer', () => {
    let fn = parse('42')
    expect(fn).toBeDefined()
    expect(fn()).toEqual(42)
  })
  it('can parse a floating point number', () => {
    let fn = parse('4.2')
    expect(fn()).toBe(4.2)
  })
  it('can parse a number in scientific notation', () => {
    let fn = parse('42e3')
    expect(fn()).toBe(42000)
  })
})
