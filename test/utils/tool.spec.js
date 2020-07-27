import utils from '../../src/utils'

describe('times func', () => {
  let times = utils.times
  let fn = jest.fn()
  times(100, fn)
  test('mock function should repeat 100 times ', () => {
    expect(fn).toHaveBeenCalledTimes(100)
  })
  test('mock function should be call with time index', () => {
    expect(fn).toHaveBeenCalledWith(1)
    expect(fn).toHaveBeenCalledWith(20)
    expect(fn).toHaveBeenCalledWith(50)
    expect(fn).toHaveBeenCalledWith(99)
  })
})

describe('deepEqual function for deep compare', () => {
  let deepEqual = utils.deepEqual
  test('should work on level 1 compare', () => {
    let valueA = { a: 1, b: 2, c: 3 }
    let valueB = { a: 1, b: 2, c: 3 }
    let valueC = { a: 1, b: 2, c: 4 }
    expect(deepEqual(valueA, valueB)).toBeTruthy()
    expect(deepEqual(valueB, valueC)).not.toBeTruthy()
  })
  test('should work on level2', () => {
    let valueA = { a: 1, b: { b1: 21 }, c: 3 }
    let valueB = { a: 1, b: { b1: 21 }, c: 3 }
    let valueC = { a: 1, b: 2, c: 4 }
    expect(deepEqual(valueA, valueB)).toBeTruthy()
    expect(deepEqual(valueB, valueC)).not.toBeTruthy()
  })
  test('should work on array detect', () => {
    let valueA = { a: [1] }
    let valueB = { a: [1] }
    let valueC = { a: [1, 2] }
    expect(deepEqual(valueA, valueB)).toBeTruthy()
    expect(deepEqual(valueB, valueC)).not.toBeTruthy()
  })
  test('should work when array element is an object', () => {
    let valueA = { a: [{ aa: 1 }] }
    let valueB = { a: [{ aa: 1 }] }
    let valueC = { a: [{ aa: 2 }] }
    expect(deepEqual(valueA, valueB)).toBeTruthy()
    expect(deepEqual(valueB, valueC)).not.toBeTruthy()
  })
})

describe('deepClone function for nested Object', () => {
  const deepClone = utils.deepClone
  test('test nested obj', () => {
    let valueA = {
      one: {
        'one-one': new String('hello'),
        'one-two': ['one', 'two', true, 'four']
      },
      two: document.createElement('div'),
      three: [
        {
          name: 'three-one',
          number: new Number('100'),
          obj: new (function() {
            this.name = 'Object test'
          })()
        }
      ]
    }
    let copy = deepClone(valueA)
    expect(copy).toEqual(valueA)
  })
})

describe('forEachRight', () => {
  let forEachRight = utils.forEachRight
  let arr = [1, 2, 3, 4]
  test('should iterate array from right to left', () => {
    let res = ''
    forEachRight(arr, item => {
      res += item
    })
    expect(res).toEqual('4321')
  })

  test('should break if callback return false', () => {
    let res = ''
    forEachRight(arr, item => {
      res += item
      if (item === 2) return false
    })
    expect(res).toEqual('432')
  })
})
