import { add } from '../src/add'

describe('test add function', () => {
  test('1 + 1 should return 2', () => {
    expect(add(1, 1)).toBe(2)
  })
})
