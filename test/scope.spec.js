import Scope from '../src/scope.js'

describe('Scope', () => {
  test('can be constructed and used as an Object', () => {
    let scope = new Scope()
    scope.aProperty = 1
    expect(scope.aProperty).toEqual(1)
  })

  describe('digest', () => {
    let scope
    beforeEach(() => {
      scope = new Scope()
    })
    test('calls the listener function of a watch on first $digest', () => {
      let watchFn = () => 'wat'

      let listenerFn = jest.fn()
      scope.$watch(watchFn, listenerFn)
      scope.$digest()
      expect(listenerFn).toHaveBeenCalled()
    })
    test('calls the watch funciton with the scope as the argument', () => {
      let watchFn = jest.fn()
      let listenerFn = function() {}
      scope.$watch(watchFn, listenerFn)
      scope.$digest()
      expect(watchFn).toHaveBeenCalledWith(scope)
    })
    test('call the listener function when the watched value changed', () => {
      scope.someValue = 'a'
      scope.counter = 0
      scope.$watch(
        function(scope) {
          return scope.someValue
        },
        function(newValue, oldValue, scope) {
          scope.counter++
        }
      )
      expect(scope.counter).toEqual(0)
      scope.$digest()
      expect(scope.counter).toEqual(1)

      scope.$digest()
      expect(scope.counter).toEqual(1)

      scope.someValue = 'b'
      expect(scope.counter).toEqual(1)

      scope.$digest()
      expect(scope.counter).toEqual(2)
    })
  })
})
