import { hashKey, HashMap } from '../src/utils/apis'
describe('apis', () => {
  'use strict'
  describe('hashKey', () => {
    it('is undefined:undefined for undefined', () => {
      expect(hashKey(undefined)).toEqual('undefined:undefined')
    })
    it('is object:null for null', () => {
      expect(hashKey(null)).toEqual('object:null')
    })
    it('is boolean:true for true', () => {
      expect(hashKey(true)).toEqual('boolean:true')
    })
    it('is boolean:false for false', () => {
      expect(hashKey(false)).toEqual('boolean:false')
    })
    it('is number:42 for 42', () => {
      expect(hashKey(42)).toEqual('number:42')
    })
    it('is string:42 for "42"', () => {
      expect(hashKey('42')).toEqual('string:42')
    })
    it('is object:[unique id] for objects', () => {
      expect(hashKey({})).toMatch(/object:\S+$/)
    })
    it('is the same key when asked for the same object many times', () => {
      let obj = {}
      expect(hashKey(obj)).toEqual(hashKey(obj))
    })
    it('does not change when object value changes', () => {
      let obj = { a: 42 }
      let hash1 = hashKey(obj)
      obj.a = 43
      let hash2 = hashKey(obj)
      expect(hash1).toEqual(hash2)
    })
    it('is not the same for different objects even with the same value', () => {
      let obj1 = { a: 42 }
      let obj2 = { a: 42 }
      expect(hashKey(obj1)).not.toEqual(hashKey(obj2))
    })
    it('is function:[unique id] for functions', () => {
      let fn = function(a) {
        return a
      }
      expect(hashKey(fn)).toMatch(/^function:\S+$/)
    })
    it('is the same key when asked for the same function many times', () => {
      let fn = function() {}
      expect(hashKey(fn)).toEqual(hashKey(fn))
    })
    it('is not the same for different identical functions', () => {
      let fn1 = function() {
        return 42
      }
      let fn2 = function() {
        return 42
      }
      expect(hashKey(fn1)).not.toEqual(hashKey(fn2))
    })
    it('stores the hash key in the $$hashKey attribute', () => {
      let obj = { a: 42 }
      let hash = hashKey(obj)
      expect(obj.$$hashKey).toEqual(hash.match(/object:(\S+)$/)[1])
    })
    it('uses preassigned $$hashKey', () => {
      expect(hashKey({ $$hashKey: 42 })).toEqual('object:42')
    })
    it('supports a function $$hashKey', () => {
      expect(hashKey({ $$hashKey: () => 42 })).toEqual('object:42')
    })
    it('calls the function $$hashKey as a method with the correct this', () => {
      expect(
        hashKey({
          myKey: 42,
          $$hashKey: function() {
            return this.myKey
          }
        })
      ).toEqual('object:42')
    })
  })
  describe('HashMap', () => {
    it('supports put and get of primitives', () => {
      let map = new HashMap()
      map.put(42, 'fourty two')
      expect(map.get(42)).toEqual('fourty two')
    })
    it('supports put and get of objects with hashKey semantics', () => {
      let map = new HashMap()
      let obj = {}
      map.put(obj, 'my value')
      expect(map.get(obj)).toEqual('my value')
      expect(map.get({})).toBeUndefined()
    })
    it('supports remove', () => {
      let map = new HashMap()
      map.put(42, 'fourty two')
      map.remove(42)
      expect(map.get(42)).toBeUndefined()
    })
    it('returns value from remove', () => {
      let map = new HashMap()
      map.put(42, 'fourty two')
      expect(map.remove(42)).toEqual('fourty two')
    })
  })
})
