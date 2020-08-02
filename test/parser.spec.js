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
    describe('functionCalls', () => {
      it('parses a function call', () => {
        let fn = parse('aFunction()')
        expect(
          fn({
            aFunction: function() {
              return 42
            }
          })
        ).toBe(42)
      })
      it('parses a function call with a single number argument', () => {
        let fn = parse('aFunction(42)')
        expect(
          fn({
            aFunction: function(n) {
              return n
            }
          })
        ).toBe(42)
      })
      it('parses a function call with a single identifier argument', () => {
        let fn = parse('aFunction(n)')
        expect(
          fn({
            n: 42,
            aFunction: function(arg) {
              return arg
            }
          })
        ).toBe(42)
      })
      it('parses a function call with multiple arguments', () => {
        let fn = parse('aFunction(37, n, argFn())')
        expect(
          fn({
            n: 3,
            argFn: () => 2,
            aFunction: function(a1, a2, a3) {
              return a1 + a2 + a3
            }
          })
        ).toBe(42)
      })
      it('calls methods accessed as computed properties', () => {
        let scope = {
          anObject: {
            aMember: 42,
            aFunction: function() {
              return this.aMember
            }
          }
        }
        let fn = parse('anObject["aFunction"]()')
        expect(fn(scope)).toBe(42)
      })
      it('binds bare functions to the scope', () => {
        let scope = {
          aFunction: function() {
            return this
          }
        }
        let fn = parse('aFunction()')
        expect(fn(scope)).toBe(scope)
      })
      it('parses a simple attribute assignment', () => {
        let fn = parse('anAttribute = 42')
        let scope = {}
        fn(scope)
        expect(scope.anAttribute).toBe(42)
      })
      it('can assign any primary expression', () => {
        let fn = parse('anAttribute = aFunction()')
        let scope = { aFunction: () => 42 }
        fn(scope)
        expect(scope.anAttribute).toBe(42)
      })
      it('can assign a computed object property', () => {
        let fn = parse('anObject["anAttribute"] = 42')
        let scope = { anObject: {} }
        fn(scope)
        expect(scope.anObject.anAttribute).toBe(42)
      })
      it('can assign a non-computed object property', () => {
        let fn = parse('anObject.anAttribute = 42')
        let scope = { anObject: {} }
        fn(scope)
        expect(scope.anObject.anAttribute).toBe(42)
      })
      it('can assign a nested object property', () => {
        let fn = parse('anArray[0].anAttribute = 42')
        let scope = { anArray: [{}] }
        fn(scope)
        expect(scope.anArray[0].anAttribute).toBe(42)
      })
      it('creates the objects in the assignment path that do not exist', () => {
        let fn = parse('some["nested"].property.path = 42')
        let scope = {}
        fn(scope)
        expect(scope.some.nested.property.path).toBe(42)
      })
      it('does not allow calling the function constructor', () => {
        expect(() => {
          let fn = parse('aFunction.constructor("return window;")()')
          fn({ aFunction: function() {} })
        }).toThrow()
      })
      it('does not allow accessing __proto__', () => {
        expect(() => {
          let fn = parse('obj.__proto__')
          fn({ obj: {} })
        }).toThrow()
      })
      it('does not allow calling __defineGetter__', () => {
        expect(() => {
          let fn = parse('obj.__defineGetter__("evil", fn)')
          fn({ obj: {}, fn: function() {} })
        }).toThrow()
      })
      it('does not allow calling __defineSetter__', () => {
        expect(() => {
          let fn = parse('obj.__defineSetter__("evil", fn)')
          fn({ obj: {}, fn: function() {} })
        }).toThrow()
      })
      it('does not allow calling __lookupGetter__', () => {
        expect(() => {
          let fn = parse('obj.__lookupGetter__("evil")')
          fn({ obj: {} })
        }).toThrow()
      })
      it('does not allow calling __lookupSetter__', () => {
        expect(() => {
          let fn = parse('obj.__lookupSetter__("evil")')
          fn({ obj: {} })
        }).toThrow()
      })
      it('does not allow accessing window as computed property', () => {
        let fn = parse('anObject["wnd"]')
        expect(() => {
          fn({ anObject: { wnd: window } })
        }).toThrow()
      })
      it('does not allow accessing window as non-computed property', () => {
        let fn = parse('anObject.wnd')
        expect(() => {
          fn({ anObject: { wnd: window } })
        }).toThrow()
      })
      it('does not allow passing window as function argument', () => {
        let fn = parse('aFunction(wnd)')
        expect(() => {
          fn({ aFunction: function() {}, wnd: window })
        }).toThrow()
      })
      it('does not allow calling methods on window', () => {
        let fn = parse('wnd.scrollTo(0)')
        expect(() => {
          fn({ wnd: window })
        }).toThrow()
      })
      it('does not allow functions to return window', () => {
        let fn = parse('getWind()')
        expect(() => {
          fn({ getWind: () => window })
        }).toThrow()
      })
      it('does not allow assigning window', () => {
        let fn = parse('wnd = anObject')
        expect(() => {
          fn({ anObject: window })
        }).toThrow()
      })
      it('does not allow referencing window', () => {
        let fn = parse('wnd')
        expect(() => {
          fn({ wnd: window })
        }).toThrow()
      })
      it('does not allow calling functions on DOM elements', () => {
        let fn = parse('el.setAttribute("evil", "true")')
        expect(() => {
          fn({ el: document.documentElement })
        }).toThrow()
      })
      it('does not allow calling the aliased function constructor', () => {
        let fn = parse('fnConstructor("return window;")')
        expect(() => {
          fn({ fnConstructor: function() {}.constructor })
        }).toThrow()
      })
      it('does not allow calling functions on Object', () => {
        let fn = parse('obj.create({})')
        expect(() => {
          fn({ obj: Object })
        }).toThrow()
      })
    })
    it('does not allow calling call', () => {
      let fn = parse('fun.call(obj)')
      expect(() => {
        fn({ fun: function() {}, obj: {} })
      }).toThrow()
    })
    it('does not allow calling apply', () => {
      let fn = parse('fun.apply(obj)')
      expect(() => {
        fn({ fun: function() {}, obj: {} })
      }).toThrow()
    })
  })
  describe('Operator expressions', () => {
    it('parses an unary', () => {
      expect(parse('+42')()).toEqual(42)
      expect(parse('+a')({ a: 42 })).toEqual(42)
    })
    it('replaces undefined with zero for unary +', () => {
      expect(parse('+a')({})).toBe(0)
    })
    it('parses a unary !', () => {
      expect(parse('!true')()).toBe(false)
      expect(parse('!42')()).toBe(false)
      expect(parse('!a')({ a: false })).toBe(true)
      expect(parse('!!a')({ a: false })).toBe(false)
    })
    it('parses a unary -', () => {
      expect(parse('-42')()).toBe(-42)
      expect(parse('-a')({ a: -42 })).toBe(42)
      expect(parse('--a')({ a: -42 })).toBe(-42)
      expect(parse('-a')({})).toBe(-0)
    })
    it('parses a ! in a string', () => {
      expect(parse('"!"')()).toBe('!')
    })
  })
})
