import Scope from '../src/scope.js'
import tools from '../src/utils/tool.js'

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
        scope => scope.someValue,
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
        scope => scope.someValue,
        (newValue, oldValue, scope) => {
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
        scope => scope.someValue,
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
        scope => scope.nameUpper,
        function(newValue, oldValue, scope) {
          if (newValue) {
            scope.initial = newValue.substring(0, 1) + '.'
          }
        }
      )
      scope.$watch(
        scope => scope.name,
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
    test('gives up on the watches after 10 iterations', () => {
      scope.countA = 0
      scope.CountB = 0

      scope.$watch(
        () => scope.countA,
        function() {
          scope.CountB++
        }
      )
      scope.$watch(
        () => scope.CountB,
        function() {
          scope.countA++
        }
      )
      expect(function() {
        scope.$digest()
      }).toThrow()
    })
    test('it ends digest when the last dirty watch is clean in the next round', () => {
      scope.array = [...Array(2).keys()]
      let watchExecutions = 0
      tools.times(2, function(i) {
        scope.$watch(
          function(scope) {
            watchExecutions++
            return scope.array[i]
          },
          function(newValue, oldValue, scope) {}
        )
      })
      scope.$digest()
      expect(watchExecutions).toEqual(4)
      scope.array[0] = 420
      scope.$digest()
      expect(watchExecutions).toEqual(7)
    })
    test('does not end digest so that new watches are not run', () => {
      scope.aValue = 'abc'
      scope.counter = 0
      scope.$watch(
        scope => scope.aValue,
        function(newValue, oldValue, scope) {
          scope.$watch(
            scope => scope.aValue,
            function(newValue, oldValue, scope) {
              scope.counter++
            }
          )
        }
      )
      scope.$digest()
      expect(scope.counter).toEqual(1)
    })
    test('compares based on value if enabled', () => {
      scope.aValue = [1, 2, 3]
      scope.counter = 0
      scope.$watch(
        scope => scope.aValue,
        function(newValue, oldValue, scope) {
          scope.counter++
        },
        true
      )

      scope.$digest()
      expect(scope.counter).toEqual(1)
      scope.aValue.push(4)
      scope.$digest()
      expect(scope.counter).toEqual(2)
    })
    test('correctly handles NaNs', () => {
      scope.number = 0 / 0 // NaN scope.counter = 0;
      scope.counter = 0
      scope.$watch(
        function(scope) {
          return scope.number
        },
        function(newValue, oldValue, scope) {
          scope.counter++
        }
      )
      scope.$digest()
      expect(scope.counter).toBe(1)
      scope.$digest()
      expect(scope.counter).toBe(1)
    })
    // $eval
    test('execute $eval and return value from the scope', () => {
      scope.value = 42
      let result = scope.$eval(scope => scope.value)
      expect(result).toEqual(42)
    })
    test('passes the second $eval argument straight through', function() {
      scope.aValue = 42
      let result = scope.$eval(function(scope, arg) {
        return scope.aValue + arg
      }, 2)
      expect(result).toBe(44)
    })
    // $apply
    test("executes $apply'ed function and starts the digest", () => {
      scope.aValue = 'someValue'
      scope.counter = 0

      scope.$watch(
        scope => scope.aValue,
        function(newValue, oldValue, scope) {
          scope.counter++
        }
      )

      scope.$digest()
      expect(scope.counter).toBe(1)
      scope.$apply(function(scope) {
        scope.aValue = 'someOtherValue'
      })
      expect(scope.counter).toBe(2)
    })
    test("executes $evalAsync'ed function later in the same cycle", () => {
      scope.aValue = [1, 2, 3]
      scope.asyncEvaluated = false
      scope.asyncEvaluatedImmediately = false

      scope.$watch(
        scope => scope.aValue,
        function(newValue, oldValue, scope) {
          scope.$evalAsync(function(scope) {
            scope.asyncEvaluated = true
          })
          scope.asyncEvaluatedImmediately = scope.asyncEvaluated
        }
      )

      scope.$digest()
      expect(scope.asyncEvaluated).toBeTruthy()
      expect(scope.asyncEvaluatedImmediately).toBeFalsy()
    })
    test("executes $evalAsync'ed functions added by watch functions", function() {
      scope.aValue = [1, 2, 3]
      scope.asyncEvaluated = false
      scope.$watch(
        function(scope) {
          if (!scope.asyncEvaluated) {
            scope.$evalAsync(function(scope) {
              scope.asyncEvaluated = true
            })
          }
          return scope.aValue
        },
        function(newValue, oldValue, scope) {}
      )
      scope.$digest()
      expect(scope.asyncEvaluated).toBe(true)
    })

    test("executes $evalAsync'ed functions even when not dirty", function() {
      scope.aValue = [1, 2, 3]
      scope.asyncEvaluatedTimes = 0
      scope.$watch(
        function(scope) {
          if (scope.asyncEvaluatedTimes < 2) {
            scope.$evalAsync(function(scope) {
              scope.asyncEvaluatedTimes++
            })
          }
          return scope.aValue
        },
        function(newValue, oldValue, scope) {}
      )
      scope.$digest()
      expect(scope.asyncEvaluatedTimes).toBe(2)
    })

    test('eventually halts $evalAsyncs added by watches', function() {
      scope.aValue = [1, 2, 3]
      scope.$watch(
        function(scope) {
          scope.$evalAsync(function(scope) {})
          return scope.aValue
        },
        function(newValue, oldValue, scope) {}
      )
      expect(function() {
        scope.$digest()
      }).toThrow()
    })
  })
})
