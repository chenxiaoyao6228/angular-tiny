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
    test('has a $$phase field whose value is the current digest phase', function() {
      scope.aValue = [1, 2, 3]
      scope.phaseInWatchFunction = undefined
      scope.phaseInListenerFunction = undefined
      scope.phaseInApplyFunction = undefined
      scope.$watch(
        function(scope) {
          scope.phaseInWatchFunction = scope.$$phase
          return scope.aValue
        },
        function(newValue, oldValue, scope) {
          scope.phaseInListenerFunction = scope.$$phase
        }
      )
      scope.$apply(function(scope) {
        scope.phaseInApplyFunction = scope.$$phase
      })
      expect(scope.phaseInWatchFunction).toBe('$digest')
      expect(scope.phaseInListenerFunction).toBe('$digest')
      expect(scope.phaseInApplyFunction).toBe('$apply')
    })
    test('schedules a digest in $evalAsync', function(done) {
      scope.aValue = 'abc'
      scope.counter = 0
      scope.$watch(
        scope => scope.aValue,
        function(newValue, oldValue, scope) {
          scope.counter++
        }
      )
      scope.$evalAsync(function(scope) {})
      expect(scope.counter).toBe(0)
      setTimeout(() => {
        expect(scope.counter).toBe(1)
        done()
      }, 50)
    })

    test('allows async $apply with $applyAsync', function(done) {
      scope.counter = 0
      scope.$watch(
        function(scope) {
          return scope.aValue
        },
        function(newValue, oldValue, scope) {
          scope.counter++
        }
      )
      scope.$digest()
      expect(scope.counter).toBe(1)
      scope.$applyAsync(function(scope) {
        scope.aValue = 'abc'
      })
      expect(scope.counter).toBe(1)
      setTimeout(() => {
        expect(scope.counter).toBe(2)
        done()
      }, 50)
    })

    test("never executes $applyAsync'ed function in the same cycle", function(done) {
      scope.aValue = [1, 2, 3]
      scope.asyncApplied = false
      scope.$watch(
        function(scope) {
          return scope.aValue
        },
        function(newValue, oldValue, scope) {
          scope.$applyAsync(function(scope) {
            scope.asyncApplied = true
          })
        }
      )
      scope.$digest()
      expect(scope.asyncApplied).toBe(false)
      setTimeout(function() {
        expect(scope.asyncApplied).toBe(true)
        done()
      }, 50)
    })

    test('coalesces many calls to $applyAsync', function(done) {
      scope.counter = 0
      scope.$watch(
        function(scope) {
          scope.counter++
          return scope.aValue
        },
        function(newValue, oldValue, scope) {}
      )
      scope.$applyAsync(scope => {
        scope.aValue = 'abc'
      })
      scope.$applyAsync(function(scope) {
        scope.aValue = 'def'
      })
      setTimeout(function() {
        expect(scope.counter).toBe(2)
        done()
      }, 50)
    })
    test('cancels and flushes $applyAsync if digested first', function(done) {
      scope.counter = 0
      scope.$watch(
        function(scope) {
          scope.counter++
          return scope.aValue
        },
        function(newValue, oldValue, scope) {}
      )
      scope.$applyAsync(function(scope) {
        scope.aValue = 'abc'
      })
      scope.$applyAsync(function(scope) {
        scope.aValue = 'def'
      })
      scope.$digest()
      expect(scope.counter).toBe(2)
      expect(scope.aValue).toEqual('def')
      setTimeout(function() {
        expect(scope.counter).toBe(2)
        done()
      }, 50)
    })
    test('runs a $$postDigest function after each digest', () => {
      scope.counter = 0
      scope.$$postDigest(() => scope.counter++)
      expect(scope.counter).toEqual(0)

      scope.$digest()
      expect(scope.counter).toEqual(1)

      scope.$digest()
      expect(scope.counter).toEqual(1)
    })

    test('does not include $$postDigest in the digest', () => {
      scope.aValue = 'original value'
      scope.$$postDigest(function() {
        scope.aValue = 'changed value'
      })
      scope.$watch(
        function(scope) {
          return scope.aValue
        },
        function(newValue, oldValue, scope) {
          scope.watchedValue = newValue
        }
      )
      scope.$digest()
      expect(scope.watchedValue).toBe('original value')
      scope.$digest()
      expect(scope.watchedValue).toBe('changed value')
    })
    test('catches exceptions in watch function and continues', () => {
      scope.aValue = 'abc'
      scope.counter = 0

      scope.$watch(
        function(scope) {
          throw 'error'
        },
        function(newValue, oldValue, scope) {}
      )
      scope.$watch(
        function(scope) {
          return scope.aValue
        },
        function(newValue, oldValue, scope) {
          scope.counter++
        }
      )

      scope.$digest()
      expect(scope.counter).toEqual(1)
    })
    test('catches exceptions in listener functions and continues', () => {
      scope.aValue = 'abc'
      scope.counter = 0
      scope.$watch(
        function(scope) {
          return scope.aValue
        },
        function(newValue, oldValue, scope) {
          throw 'Error'
        }
      )
      scope.$watch(
        function(scope) {
          return scope.aValue
        },
        function(newValue, oldValue, scope) {
          scope.counter++
        }
      )
      scope.$digest()
      expect(scope.counter).toBe(1)
    })
    test('catches exceptions in $evalAsync', done => {
      scope.aValue = 'abc'
      scope.counter = 0
      scope.$watch(
        function(scope) {
          return scope.aValue
        },
        function(newValue, oldValue, scope) {
          scope.counter++
        }
      )
      scope.$evalAsync(function(scope) {
        throw 'Error'
      })
      setTimeout(function() {
        expect(scope.counter).toBe(1)
        done()
      }, 50)
    })
    test('catches exceptions in $applyAsync', done => {
      scope.$applyAsync(function(scope) {
        throw 'Error'
      })
      scope.$applyAsync(function(scope) {
        throw 'Error'
      })
      scope.$applyAsync(function(scope) {
        scope.applied = true
      })
      setTimeout(function() {
        expect(scope.applied).toBe(true)
        done()
      }, 50)
    })

    test('catches exceptions in $$postDigest', function() {
      let didRun = false
      scope.$$postDigest(function() {
        throw 'Error'
      })
      scope.$$postDigest(function() {
        didRun = true
      })
      scope.$digest()
      expect(didRun).toBe(true)
    })

    test('allows destroying a $watch with a removal function', function() {
      scope.aValue = 'abc'
      scope.counter = 0

      let destroyWatch = scope.$watch(
        scope => scope.aValue,
        function(newValue, oldValue, scope) {
          scope.counter++
        }
      )

      scope.$digest()
      expect(scope.counter).toEqual(1)

      scope.aValue = 'def'

      scope.$digest()
      expect(scope.counter).toEqual(2)

      scope.aValue = 'ghi'

      destroyWatch()

      scope.$digest()
      expect(scope.counter).toEqual(2)
    })

    test('allows destroying a $watch during digest', function() {
      scope.aValue = 'abc'
      let watchCalls = []
      scope.$watch(function(scope) {
        watchCalls.push('first')
        return scope.aValue
      })
      let destroyWatch = scope.$watch(function(scope) {
        watchCalls.push('second')
        destroyWatch()
      })
      scope.$watch(function(scope) {
        watchCalls.push('third')
        return scope.aValue
      })
      scope.$digest()
      expect(watchCalls).toEqual(['first', 'second', 'third', 'first', 'third'])
    })
    test('allows a $watch to destroy another during digest', () => {
      scope.aValue = 'abc'
      scope.counter = 0
      scope.$watch(
        scope => scope.aValue,
        function(newValue, oldValue, scope) {
          destroyWatch()
        }
      )
      let destroyWatch = scope.$watch(
        scope => {},
        (newValue, oldValue, scope) => {}
      )
      scope.$watch(
        scope => scope.aValue,
        function(newValue, oldValue, scope) {
          scope.counter++
        }
      )

      scope.$digest()
      expect(scope.counter).toEqual(1)
    })
    test('allows destroying several $watches during disgest', () => {
      scope.aValue = 'abc'
      scope.counter = 0

      let destroyWatch1 = scope.$watch(function(scope) {
        destroyWatch1()
        destroyWatch2()
      })

      let destroyWatch2 = scope.$watch(
        function(scope) {
          return scope.aValue
        },
        function(newValue, oldValue, scope) {
          scope.counter++
        }
      )
      scope.$digest()

      expect(scope.counter).toEqual(0)
    })
  })

  describe('$watchGroup', () => {
    let scope
    beforeEach(() => {
      scope = new Scope()
    })

    test('takes watches as an array and calls listener with arrays', () => {
      let gotNewValues, gotOldValues

      scope.aValue = 1
      scope.anotherValue = 2

      scope.$watchGroup(
        [scope => scope.aValue, scope => scope.anotherValue],
        (newValues, oldValues, scope) => {
          gotNewValues = newValues
          gotOldValues = oldValues
        }
      )

      scope.$digest()

      expect(gotNewValues).toEqual([1, 2])
      expect(gotOldValues).toEqual([1, 2])
    })

    test('only calls listener once per digest', () => {
      let counter = 0

      scope.aValue = 1
      scope.anotherValue = 2

      scope.$watchGroup(
        [scope => scope.aValue, scope => scope.anotherValue],
        (newValues, oldValues, scope) => {
          counter++
        }
      )

      scope.$digest()
      expect(counter).toEqual(1)
    })

    test('uses the same array of old and new values on first run', () => {
      let gotNewValues, gotOldValues

      scope.aValue = 1
      scope.anotherValue = 2

      scope.$watchGroup(
        [scope => scope.aValue, scope => scope.anotherValue],
        (newValues, oldValues, scope) => {
          gotNewValues = newValues
          gotOldValues = oldValues
        }
      )

      scope.$digest()
      expect(gotNewValues).toEqual(gotOldValues)
    })
    test('uses different arrays for old and new values on subsequent runs', () => {
      let gotNewValues, gotOldValues

      scope.aValue = 1
      scope.anotherValue = 2

      scope.$watchGroup(
        [scope => scope.aValue, scope => scope.anotherValue],
        (newValues, oldValues, scope) => {
          gotNewValues = newValues
          gotOldValues = oldValues
        }
      )

      scope.$digest()

      scope.anotherValue = 3
      scope.$digest()

      expect(gotNewValues).toEqual([1, 3])
      expect(gotOldValues).toEqual([1, 2])
    })
    test('calls the listener once when the watch array is empty', () => {
      let gotNewValues, gotOldValues

      scope.$watchGroup([], function(newValues, oldValues, scope) {
        gotNewValues = newValues
        gotOldValues = oldValues
      })

      scope.$digest()
      expect(gotNewValues).toEqual([])
      expect(gotOldValues).toEqual([])
    })
    test('can be deregistered', () => {
      let counter = 0

      scope.aValue = 1
      scope.anotherValue = 24

      let destroyGroup = scope.$watchGroup(
        [scope => scope.aValue, scope => scope.anotherValue],
        function(newValues, oldValues, scope) {
          counter++
        }
      )

      scope.$digest()
      scope.anotherValue = 3

      destroyGroup()
      scope.$digest()

      expect(counter).toEqual(1)
    })

    test('does not call the zero-watch listener when deregistered first', () => {
      let counter = 0
      let destroyGroup = scope.$watchGroup([], function(
        newValues,
        oldValues,
        scope
      ) {
        counter++
      })
      destroyGroup()
      scope.$digest()
      expect(counter).toEqual(0)
    })
  })

  describe('inheritance', () => {
    test("inherits the parent's properties", () => {
      let parent = new Scope()
      parent.aValue = [1, 2, 3]

      let child = parent.$new()

      expect(child.aValue).toEqual([1, 2, 3])
    })

    test('does not cause a parent to inherit its properties', () => {
      let parent = new Scope()
      let child = parent.$new()
      child.aValue = [1, 2, 3]
      expect(parent.aValue).toBeUndefined()
    })

    test("inherits the parent's properties whenever they are defined", () => {
      let parent = new Scope()
      let child = parent.$new()
      parent.aValue = [1, 2, 3]
      expect(child.aValue).toEqual([1, 2, 3])
    })
    test("can manipulate a parent scope's property", () => {
      let parent = new Scope()
      let child = parent.$new()
      parent.aValue = [1, 2, 3]
      child.aValue.push(4)
      expect(child.aValue).toEqual([1, 2, 3, 4])
      expect(parent.aValue).toEqual([1, 2, 3, 4])
    })

    test('can watch a property in the parent ', () => {
      let parent = new Scope()
      let child = parent.$new()

      parent.aValue = [1, 2, 3]
      child.counter = 0

      child.$watch(
        scope => scope.aValue,
        function(newValue, oldValue, scope) {
          scope.counter++
        },
        true
      )

      child.$digest()
      expect(child.counter).toEqual(1)

      parent.aValue.push(4)

      child.$digest()
      expect(child.counter).toEqual(2)
    })
    test('can be nested at any depth', () => {
      let a = new Scope()
      let aa = a.$new()
      let aaa = aa.$new()
      let aab = aa.$new()
      let ab = a.$new()
      let abb = ab.$new()

      a.value = 1

      expect(aa.value).toEqual(1)
      expect(aaa.value).toEqual(1)
      expect(aab.value).toEqual(1)
      expect(ab.value).toEqual(1)
      expect(abb.value).toEqual(1)

      ab.anotherValue = 2
      expect(abb.anotherValue).toEqual(2)
      expect(aa.anotherValue).toBeUndefined()
      expect(aaa.anotherValue).toBeUndefined()
    })

    test("shadows a parent's property with the same name", () => {
      let parent = new Scope()
      let child = parent.$new()
      parent.name = 'Joe'
      child.name = 'Jill'
      expect(child.name).toBe('Jill')
      expect(parent.name).toBe('Joe')
    })

    test("does not shadow members of parent scope's attributes", () => {
      let parent = new Scope()
      let child = parent.$new()
      parent.user = { name: 'Joe' }
      child.user.name = 'Jill'
      expect(child.user.name).toBe('Jill')
      expect(parent.user.name).toBe('Jill')
    })

    test('does not digest its parents', () => {
      let parent = new Scope()
      let child = parent.$new()

      parent.aValue = 'abc'

      parent.$watch(
        scope => scope.aValue,
        function(newValue, oldValue, scope) {
          scope.aValueWas = newValue
        }
      )

      child.$digest()

      expect(child.aValueWas).toBeUndefined()
    })
    test('keep a record of its children', () => {
      let parent = new Scope()
      let child1 = parent.$new()
      let child2 = parent.$new()
      let child2_1 = child2.$new()

      expect(parent.$$children.length).toEqual(2)
      expect(parent.$$children[0]).toEqual(child1)
      expect(parent.$$children[1]).toEqual(child2)

      expect(child1.$$children.length).toEqual(0)
      expect(child2.$$children.length).toEqual(1)
      expect(child2.$$children[0]).toEqual(child2_1)
    })

    test('digests its children', () => {
      let parent = new Scope()
      let child = parent.$new()

      child.aValue = 'abc'
      child.counter = 0
      child.$watch(
        scope => scope.aValue,
        function(newValue, oldValue, scope) {
          child.counter++
        }
      )
      parent.$digest()
      expect(child.counter).toEqual(1)
    })

    test('digests from root on $apply', () => {
      let parent = new Scope()
      let child = parent.$new()
      let child2 = child.$new()

      parent.aValue = 'abc'
      parent.counter = 0
      parent.$watch(
        scope => scope.aValue,
        function(newValue, oldValue, scope) {
          scope.counter++
        }
      )

      child2.$apply(function(scope) {})
      expect(parent.counter).toEqual(1)
    })

    test('scheduls a digest from root on $evalAsync', done => {
      let parent = new Scope()
      let child = parent.$new()
      let child2 = child.$new()

      parent.aValue = 'abc'
      parent.counter = 0

      parent.$watch(
        scope => scope.aValue,
        function(newValue, oldValue, scope) {
          scope.counter++
        }
      )

      child2.$evalAsync(function(scope) {})

      setTimeout(function() {
        expect(parent.counter).toEqual(1)
        done()
      }, 50)
    })

    // isolated Scope
    test('does not have access to parent attributes when isolated', () => {
      let parent = new Scope()
      let child = parent.$new(true)

      parent.aValue = 'abc'

      expect(child.aValue).toBeUndefined()
    })

    test('cannot watch parent attributes when isolated', () => {
      let parent = new Scope()
      let child = parent.$new(true)
      parent.aValue = 'abc'
      child.$watch(
        function(scope) {
          return scope.aValue
        },
        function(newValue, oldValue, scope) {
          scope.aValueWas = newValue
        }
      )
      child.$digest()
      expect(child.aValueWas).toBeUndefined()
    })

    test('digests its isolated children', () => {
      let parent = new Scope()
      let child = parent.$new(true)

      child.aValue = 'abc'
      child.$watch(
        scope => scope.aValue,
        function(newValue, oldValue, scope) {
          scope.aValueWas = newValue
        }
      )

      parent.$digest()
      expect(child.aValueWas).toEqual('abc')
    })

    test('digests from root on $apply when isolated', () => {
      let parent = new Scope()
      let child = parent.$new(true)
      let child2 = child.$new()

      parent.aValue = 'abc'
      parent.counter = 0

      parent.$watch(
        scope => scope.aValue,
        function(newValue, oldValue, scope) {
          scope.counter++
        }
      )

      child2.$apply(function(scope) {})

      expect(parent.counter).toEqual(1)
    })

    test('schedules a digest from root on $evalAsyn when isolated', done => {
      let parent = new Scope()
      let child = parent.$new(true)
      let child2 = child.$new()
      parent.aValue = 'abc'
      parent.counter = 0
      parent.$watch(
        function(scope) {
          return scope.aValue
        },
        function(newValue, oldValue, scope) {
          scope.counter++
        }
      )
      child2.$evalAsync(function(scope) {})
      setTimeout(function() {
        expect(parent.counter).toBe(1)
        done()
      }, 50)
    })

    test('executes $evalAsync functions on isolated scopes', done => {
      let parent = new Scope()
      let child = parent.$new(true)
      child.$evalAsync(function(scope) {
        scope.didEvalAsync = true
      })
      setTimeout(function() {
        expect(child.didEvalAsync).toBe(true)
        done()
      }, 50)
    })
    test('executes $$postDigest functions on isolated scopes', () => {
      let parent = new Scope()
      let child = parent.$new(true)
      child.$$postDigest(function() {
        child.didPostDigest = true
      })
      parent.$digest()
      expect(child.didPostDigest).toBe(true)
    })

    test('can take some other scope as the parent', () => {
      let prototypeParent = new Scope()
      prototypeParent.name = 'prototypeParent'
      let hierarchyParent = new Scope()
      hierarchyParent.name = 'hierarchyParent'

      let child = prototypeParent.$new(false, hierarchyParent)

      prototypeParent.a = 42
      expect(child.a).toEqual(42)

      child.counter = 0
      child.$watch(scope => {
        scope.counter++
      })
      prototypeParent.$digest()
      expect(child.counter).toEqual(0)

      hierarchyParent.$digest()
      expect(child.counter).toEqual(2)
    })

    test('is no longer digested when $destroy has been called', () => {
      let parent = new Scope()
      let child = parent.$new()

      child.aValue = [1, 2, 3]
      child.counter = 0
      child.$watch(
        scope => scope.aValue,
        function(newValue, oldValue, scope) {
          scope.counter++
        },
        true
      )

      parent.$digest()
      expect(child.counter).toEqual(1)

      child.aValue.push(4)
      parent.$digest()
      expect(child.counter).toEqual(2)

      child.$destroy()
      child.aValue.push(5)
      parent.$digest()
      expect(child.counter).toEqual(2)
    })
  })

  describe('watchCollection', () => {
    let scope

    beforeEach(() => {
      scope = new Scope()
    })

    test('works like a normal watch for non-collections', () => {
      let valueProvided

      scope.aValue = 42
      scope.counter = 0

      scope.$watch(
        scope => scope.aValue,
        function(newValue, oldValue, scope) {
          valueProvided = newValue
          scope.counter++
        }
      )

      scope.$digest()
      expect(scope.counter).toEqual(1)
      expect(valueProvided).toEqual(scope.aValue)

      scope.aValue = 43
      scope.$digest()
      expect(scope.counter).toEqual(2)

      scope.$digest()
      expect(scope.counter).toEqual(2)
    })

    test('works like a normal watch for NaNs', () => {
      scope.aValue = 0 / 0
      scope.counter = 0
      scope.$watchCollection(
        function(scope) {
          return scope.aValue
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
  })
})
