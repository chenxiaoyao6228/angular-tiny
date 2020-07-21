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
    test('calls listener when watch value is first undefined', () => {
      scope.counter = 0
      scope.$watch(
        function(scope) {
          return scope.someValue
        },
        function(newValue, oldValue, scope) {
          scope.counter++
        }
      )

      scope.$digest()
      expect(scope.counter).toEqual(1)
    })
    test('calls listener with new value as old value the first time', () => {
      scope.someValue = 123
      let oldValueGiven
      scope.$watch(
        function(scope) {
          return scope.someValue
        },
        function(newValue, oldValue, scope) {
          oldValueGiven = oldValue
        }
      )
      scope.$digest()
      expect(scope.someValue).toEqual(123)
    })
    test('may have watchers that moit the listener function', () => {
      let watchFn = jest.fn().mockReturnValue('something')
      scope.$watch(watchFn)

      scope.$digest()
      expect(watchFn).toHaveBeenCalled()
    })
    test('trigger chained watchers in the same digest ', () => {
      scope.name = 'Jane'
      scope.$watch(
        function(scope) {
          return scope.nameUpper
        },
        function(newValue, oldValue, scope) {
          if (newValue) {
            scope.initial = newValue.substring(0, 1) + '.'
          }
        }
      )
      scope.$watch(
        function(scope) {
          return scope.name
        },
        function(newValue, oldValue, scope) {
          if (newValue) {
            scope.nameUpper = newValue.toUpperCase()
          }
        }
      )
      scope.$digest()
      expect(scope.initial).toBe('J.')
      scope.name = 'Bob'
      scope.$digest()
      expect(scope.initial).toBe('B.')
    })
  })
})
