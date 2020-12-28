import '../src/bootstrap.js'

describe('bootstrap', () => {
  describe('manual', () => {
    it('is available', () => {
      expect(window.angular.bootstrap).toBeDefined()
    })
  })
})
