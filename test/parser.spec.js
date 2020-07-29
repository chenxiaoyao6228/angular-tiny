import parse from '../src/parser.js'

describe('parse', () => {
  describe('parse Number', () => {
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
  describe('parse String', () => {
    it('can parse a string in single quotes', () => {
      let fn = parse("'abc'")
      expect(fn()).toEqual('abc')
    })
    it('can parse a string in double quotes', () => {
      let fn = parse('"abc"')
      expect(fn()).toEqual('abc')
    })
    it('will not parse a string with mismatching quotes', () => {
      expect(() => {
        parse('"abc\'')
      }).toThrow()
    })
    // it('can parse a string with single quotes inside', () => {
    //   let fn = parse("'a'b'")
    //   expect(fn()).toEqual("a'b")
    // })
    // it('can parse a string with double quotes inside', () => {
    //     let fn = parse('"a"b"')
    //     expect(fn()).toEqual('a"b')
    // })
    it('will parse a string with unicode escapes', () => {
      let fn = parse('"\\u00A0"')
      expect(fn()).toEqual('\u00A0')
    })
    it('will not parse a string with invalid unicode escapes', () => {
      expect(() => {
        parse('"\\u00T0"')
      }).toThrow()
    })
  })
  describe('parse identifier', () => {
    it('will parse null', () => {
      let fn = parse('null')
      expect(fn()).toBe(null)
    })
    it('will parse true', () => {
      let fn = parse('true')
      expect(fn()).toBe(true)
    })
    it('will parse false', () => {
      let fn = parse('false')
      expect(fn()).toBe(false)
    })
  })
  describe('parse whitespace', () => {
    it('ignores whitespace', () => {
      let fn = parse(' \n42 ')
      expect(fn()).toEqual(42)
    })
  })
  describe('parse array', () => {
    it('will parse an empty array', () => {
      let fn = parse('[]')
      expect(fn()).toEqual([])
    })
    it('will parse a non-empty array', () => {
      let fn = parse('[1, "two", [3], true]')
      expect(fn()).toEqual([1, 'two', [3], true])
    })
    it('will parse an array with trailing commas', () => {
      let fn = parse('[1,2,3, ]')
      expect(fn()).toEqual([1, 2, 3])
    })
  })
  describe('parse object', () => {
    it('will parse an empty object', () => {
      let fn = parse('{}')
      expect(fn()).toEqual({})
    })
    it('will parse a non-empty object', () => {
      let fn = parse('{ "a key": 1, \'another-key\': 2}')
      expect(fn()).toEqual({ 'a key': 1, 'another-key': 2 })
    })
    it('will parse an object with identifier keys', () => {
      let fn = parse('{ a: 1, b: [2, 3], c: { d: 4 } }')
      expect(fn()).toEqual({ a: 1, b: [2, 3], c: { d: 4 } })
    })
  })
  describe('simple attribute lookup', () => {
    it('looks up an attribute form the scope', () => {
      let fn = parse('aKey')
      expect(fn({ aKey: 42 })).toEqual(42)
      expect(fn({})).toBeUndefined()
    })
    it('returns undefined when looking up attribute from undefined', () => {
      let fn = parse('aKey')
      expect(fn()).toBeUndefined()
    })
    it('will parse this', () => {
      let fn = parse('this')
      let scope = {}
      expect(fn(scope)).toBe(scope)
      expect(fn()).toBeUndefined()
    })
    it('looks up a 2-part identifier path from the scope', () => {
      let fn = parse('aKey.anotherKey')
      expect(fn({ aKey: { anotherKey: 42 } })).toBe(42)
      expect(fn({ aKey: {} })).toBeUndefined()
      expect(fn({})).toBeUndefined()
    })
    it('looks up a member from an object', () => {
      let fn = parse('{aKey: 42}.aKey')
      expect(fn()).toBe(42)
    })
    it('uses locals instead of scope when there is a matching key', () => {
      let fn = parse('aKey')
      let scope = { aKey: 42 }
      let locals = { aKey: 43 }
      expect(fn(scope, locals)).toEqual(43)
    })
    it('does not use locals instead of scope when ono matching key', () => {
      let fn = parse('aKey')
      let scope = { aKey: 42 }
      let locals = { anotherKey: 43 }
      expect(fn(scope, locals)).toEqual(42)
    })
    it('uses locals instead of scope when the first part matches', () => {
      let fn = parse('aKey.anotherKey')
      let scope = { aKey: { anotherKey: 42 } }
      let locals = { aKey: {} }
      expect(fn(scope, locals)).toBeUndefined()
    })
    it('parse a  simple computed property access', () => {
      let fn = parse('aKey["anotherKey"]')
      expect(fn({ aKey: { anotherKey: 42 } })).toEqual(42)
    })
    it('parses a computed numeric array access', () => {
      let fn = parse('anArray[1]')
      expect(fn({ anArray: [1, 2, 3] })).toBe(2)
    })
    it('parses a computed access with another key as property', () => {
      let fn = parse('lock[key]')
      expect(fn({ key: 'theKey', lock: { theKey: 42 } })).toEqual(42)
    })
    it('parses computed access with another access as property', () => {
      let fn = parse('lock[keys["aKey"]]')
      expect(fn({ keys: { aKey: 'theKey' }, lock: { theKey: 42 } })).toEqual(42)
    })
  })
})
