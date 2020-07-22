import utils from '../../src/utils/tool'

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
