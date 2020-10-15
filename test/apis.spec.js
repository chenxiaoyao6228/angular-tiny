import { hashKey } from '../src/utils/apis'
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
  })
})
