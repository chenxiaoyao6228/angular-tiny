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
  it('can parse scientific notation with a float coefficient', () => {
    let fn = parse('.42e2')
    expect(fn()).toBe(42)
  })
  it('can parse scientific notation with negative exponents', () => {
    let fn = parse('4200e-2')
    expect(fn()).toBeCloseTo(42)
  })
  it('can parse scientific notation with the + sign', () => {
    let fn = parse('.42e+2')
    expect(fn()).toBe(42)
  })
  it('can parse upper case scientific notation', () => {
    let fn = parse('.42E2')
    expect(fn()).toBe(42)
  })
  it('will not parse invalid scientific notation', () => {
    expect(() => {
      parse('42e-')
    }).toThrow()
    expect(() => {
      parse('42e-a')
    }).toThrow()
  })
})
