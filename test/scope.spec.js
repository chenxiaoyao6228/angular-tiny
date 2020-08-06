import Scope from '../src/scope.js'
import utils from '../src/utils'
import parse from '../src/parser'

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
    test('calls the watch function with the scope as the argument', () => {
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
        (newValue, oldValue, scope) => {
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
        (newValue, oldValue, scope) => {
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
        (newValue, oldValue, scope) => {
          if (newValue) {
            scope.initial = newValue.substring(0, 1) + '.'
          }
        }
      )
      scope.$watch(
        scope => scope.name,
        (newValue, oldValue, scope) => {
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
        () => {
          scope.CountB++
        }
      )
      scope.$watch(
        () => scope.CountB,
        () => {
          scope.countA++
        }
      )
      expect(() => {
        scope.$digest()
      }).toThrow()
    })
    test('it ends digest when the last dirty watch is clean in the next round', () => {
      scope.array = [...Array(2).keys()]
      let watchExecutions = 0
      utils.times(2, i => {
        scope.$watch(
          scope => {
            watchExecutions++
            return scope.array[i]
          },
          (newValue, oldValue, scope) => {}
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
        (newValue, oldValue, scope) => {
          scope.$watch(
            scope => scope.aValue,
            (newValue, oldValue, scope) => {
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
        (newValue, oldValue, scope) => {
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
        scope => {
          return scope.number
        },
        (newValue, oldValue, scope) => {
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
    test('passes the second $eval argument straight through', () => {
      scope.aValue = 42
      let result = scope.$eval((scope, arg) => {
        return scope.aValue + arg
      }, 2)
      expect(result).toBe(44)
    })
    it('accepts expressions in $eval', () => {
      expect(scope.$eval('42')).toBe(42)
    })
    // $apply
    test("executes $apply'ed function and starts the digest", () => {
      scope.aValue = 'someValue'
      scope.counter = 0

      scope.$watch(
        scope => scope.aValue,
        (newValue, oldValue, scope) => {
          scope.counter++
        }
      )

      scope.$digest()
      expect(scope.counter).toBe(1)
      scope.$apply(scope => {
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
        (newValue, oldValue, scope) => {
          scope.$evalAsync(scope => {
            scope.asyncEvaluated = true
          })
          scope.asyncEvaluatedImmediately = scope.asyncEvaluated
        }
      )

      scope.$digest()
      expect(scope.asyncEvaluated).toBeTruthy()
      expect(scope.asyncEvaluatedImmediately).toBeFalsy()
    })
    test("executes $evalAsync'ed functions added by watch functions", () => {
      scope.aValue = [1, 2, 3]
      scope.asyncEvaluated = false
      scope.$watch(
        scope => {
          if (!scope.asyncEvaluated) {
            scope.$evalAsync(scope => {
              scope.asyncEvaluated = true
            })
          }
          return scope.aValue
        },
        (newValue, oldValue, scope) => {}
      )
      scope.$digest()
      expect(scope.asyncEvaluated).toBe(true)
    })

    test("executes $evalAsync'ed functions even when not dirty", () => {
      scope.aValue = [1, 2, 3]
      scope.asyncEvaluatedTimes = 0
      scope.$watch(
        scope => {
          if (scope.asyncEvaluatedTimes < 2) {
            scope.$evalAsync(scope => {
              scope.asyncEvaluatedTimes++
            })
          }
          return scope.aValue
        },
        (newValue, oldValue, scope) => {}
      )
      scope.$digest()
      expect(scope.asyncEvaluatedTimes).toBe(2)
    })

    test('eventually halts $evalAsyncs added by watches', () => {
      scope.aValue = [1, 2, 3]
      scope.$watch(
        scope => {
          scope.$evalAsync(scope => {})
          return scope.aValue
        },
        (newValue, oldValue, scope) => {}
      )
      expect(() => {
        scope.$digest()
      }).toThrow()
    })
    test('has a $$phase field whose value is the current digest phase', () => {
      scope.aValue = [1, 2, 3]
      scope.phaseInWatchFunction = undefined
      scope.phaseInListenerFunction = undefined
      scope.phaseInApplyFunction = undefined
      scope.$watch(
        scope => {
          scope.phaseInWatchFunction = scope.$$phase
          return scope.aValue
        },
        (newValue, oldValue, scope) => {
          scope.phaseInListenerFunction = scope.$$phase
        }
      )
      scope.$apply(scope => {
        scope.phaseInApplyFunction = scope.$$phase
      })
      expect(scope.phaseInWatchFunction).toBe('$digest')
      expect(scope.phaseInListenerFunction).toBe('$digest')
      expect(scope.phaseInApplyFunction).toBe('$apply')
    })
    test('schedules a digest in $evalAsync', async () => {
      scope.aValue = 'abc'
      scope.counter = 0
      scope.$watch(
        scope => scope.aValue,
        (newValue, oldValue, scope) => {
          scope.counter++
        }
      )
      scope.$evalAsync(scope => {})
      expect(scope.counter).toBe(0)

      await new Promise(resolve => setTimeout(resolve, 50))
      expect(scope.counter).toBe(1)
    })

    test('allows async $apply with $applyAsync', async () => {
      scope.counter = 0
      scope.$watch(
        scope => {
          return scope.aValue
        },
        (newValue, oldValue, scope) => {
          scope.counter++
        }
      )
      scope.$digest()
      expect(scope.counter).toBe(1)
      scope.$applyAsync(scope => {
        scope.aValue = 'abc'
      })
      expect(scope.counter).toBe(1)

      await new Promise(resolve => setTimeout(resolve, 50))

      expect(scope.counter).toBe(2)
    })

    test("never executes $applyAsync'ed function in the same cycle", async () => {
      scope.aValue = [1, 2, 3]
      scope.asyncApplied = false
      scope.$watch(
        scope => {
          return scope.aValue
        },
        (newValue, oldValue, scope) => {
          scope.$applyAsync(scope => {
            scope.asyncApplied = true
          })
        }
      )
      scope.$digest()
      expect(scope.asyncApplied).toBe(false)
      await new Promise(resolve => setTimeout(resolve, 50))

      expect(scope.asyncApplied).toBe(true)
    })

    test('coalesces many calls to $applyAsync', async () => {
      scope.counter = 0
      scope.$watch(
        scope => {
          scope.counter++
          return scope.aValue
        },
        (newValue, oldValue, scope) => {}
      )
      scope.$applyAsync(scope => {
        scope.aValue = 'abc'
      })
      scope.$applyAsync(scope => {
        scope.aValue = 'def'
      })

      await new Promise(resolve => setTimeout(resolve, 50))
      expect(scope.counter).toBe(2)
    })
    test('cancels and flushes $applyAsync if digested first', async () => {
      scope.counter = 0
      scope.$watch(
        scope => {
          scope.counter++
          return scope.aValue
        },
        (newValue, oldValue, scope) => {}
      )
      scope.$applyAsync(scope => {
        scope.aValue = 'abc'
      })
      scope.$applyAsync(scope => {
        scope.aValue = 'def'
      })
      scope.$digest()
      expect(scope.counter).toBe(2)
      expect(scope.aValue).toEqual('def')

      await new Promise(resolve => setTimeout(resolve, 50))

      expect(scope.counter).toBe(2)
    })

    it('accepts expressions in $apply', () => {
      scope.aFunction = () => 42
      expect(scope.$apply('aFunction()')).toBe(42)
    })
    it('accepts expressions in $evalAsync', async () => {
      let called
      scope.aFunction = function() {
        called = true
      }
      scope.$evalAsync('aFunction()')
      await new Promise(resolve => setTimeout(resolve, 50))
      expect(called).toBe(true)
    })
    // postDigest
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
      scope.$$postDigest(() => {
        scope.aValue = 'changed value'
      })
      scope.$watch(
        scope => {
          return scope.aValue
        },
        (newValue, oldValue, scope) => {
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
        scope => {
          throw 'error'
        },
        (newValue, oldValue, scope) => {}
      )
      scope.$watch(
        scope => {
          return scope.aValue
        },
        (newValue, oldValue, scope) => {
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
        scope => {
          return scope.aValue
        },
        (newValue, oldValue, scope) => {
          throw 'Error'
        }
      )
      scope.$watch(
        scope => {
          return scope.aValue
        },
        (newValue, oldValue, scope) => {
          scope.counter++
        }
      )
      scope.$digest()
      expect(scope.counter).toBe(1)
    })
    test('catches exceptions in $evalAsync', async () => {
      scope.aValue = 'abc'
      scope.counter = 0
      scope.$watch(
        scope => {
          return scope.aValue
        },
        (newValue, oldValue, scope) => {
          scope.counter++
        }
      )
      scope.$evalAsync(scope => {
        throw 'Error'
      })
      await new Promise(resolve => setTimeout(resolve, 50))

      expect(scope.counter).toBe(1)
    })
    test('catches exceptions in $applyAsync', async () => {
      scope.$applyAsync(scope => {
        throw 'Error'
      })
      scope.$applyAsync(scope => {
        throw 'Error'
      })
      scope.$applyAsync(scope => {
        scope.applied = true
      })

      await new Promise(resolve => setTimeout(resolve, 50))
      expect(scope.applied).toBe(true)
    })

    test('catches exceptions in $$postDigest', () => {
      let didRun = false
      scope.$$postDigest(() => {
        throw 'Error'
      })
      scope.$$postDigest(() => {
        didRun = true
      })
      scope.$digest()
      expect(didRun).toBe(true)
    })

    test('allows destroying a $watch with a removal function', () => {
      scope.aValue = 'abc'
      scope.counter = 0

      let destroyWatch = scope.$watch(
        scope => scope.aValue,
        (newValue, oldValue, scope) => {
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

    test('allows destroying a $watch during digest', () => {
      scope.aValue = 'abc'
      let watchCalls = []
      scope.$watch(scope => {
        watchCalls.push('first')
        return scope.aValue
      })
      let destroyWatch = scope.$watch(scope => {
        watchCalls.push('second')
        destroyWatch()
      })
      scope.$watch(scope => {
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
        (newValue, oldValue, scope) => {
          destroyWatch()
        }
      )
      let destroyWatch = scope.$watch(
        scope => {},
        (newValue, oldValue, scope) => {}
      )
      scope.$watch(
        scope => scope.aValue,
        (newValue, oldValue, scope) => {
          scope.counter++
        }
      )

      scope.$digest()
      expect(scope.counter).toEqual(1)
    })
    test('allows destroying several $watches during disgest', () => {
      scope.aValue = 'abc'
      scope.counter = 0

      let destroyWatch1 = scope.$watch(scope => {
        destroyWatch1()
        destroyWatch2()
      })

      let destroyWatch2 = scope.$watch(
        scope => {
          return scope.aValue
        },
        (newValue, oldValue, scope) => {
          scope.counter++
        }
      )
      scope.$digest()

      expect(scope.counter).toEqual(0)
    })
    it('accepts expressions for watch functions', () => {
      let theValue
      scope.aValue = 42
      scope.$watch('aValue', (newValue, oldValue, scope) => {
        theValue = newValue
      })
      scope.$digest()
      expect(theValue).toEqual(42)
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

      scope.$watchGroup([], (newValues, oldValues, scope) => {
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
        (newValues, oldValues, scope) => {
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
      let destroyGroup = scope.$watchGroup(
        [],
        (newValues, oldValues, scope) => {
          counter++
        }
      )
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
        (newValue, oldValue, scope) => {
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
        (newValue, oldValue, scope) => {
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
        (newValue, oldValue, scope) => {
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
        (newValue, oldValue, scope) => {
          scope.counter++
        }
      )

      child2.$apply(scope => {})
      expect(parent.counter).toEqual(1)
    })

    test('scheduls a digest from root on $evalAsync', async () => {
      let parent = new Scope()
      let child = parent.$new()
      let child2 = child.$new()

      parent.aValue = 'abc'
      parent.counter = 0

      parent.$watch(
        scope => scope.aValue,
        (newValue, oldValue, scope) => {
          scope.counter++
        }
      )

      child2.$evalAsync(scope => {})

      await new Promise(resolve => setTimeout(resolve, 50))

      expect(parent.counter).toEqual(1)
    })

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
        scope => {
          return scope.aValue
        },
        (newValue, oldValue, scope) => {
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
        (newValue, oldValue, scope) => {
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
        (newValue, oldValue, scope) => {
          scope.counter++
        }
      )

      child2.$apply(scope => {})

      expect(parent.counter).toEqual(1)
    })

    test('schedules a digest from root on $evalAsyn when isolated', async () => {
      let parent = new Scope()
      let child = parent.$new(true)
      let child2 = child.$new()
      parent.aValue = 'abc'
      parent.counter = 0
      parent.$watch(
        scope => {
          return scope.aValue
        },
        (newValue, oldValue, scope) => {
          scope.counter++
        }
      )
      child2.$evalAsync(scope => {})

      await new Promise(resolve => setTimeout(resolve, 50))

      expect(parent.counter).toBe(1)
    })

    test('executes $evalAsync functions on isolated scopes', async () => {
      let parent = new Scope()
      let child = parent.$new(true)
      child.$evalAsync(scope => {
        scope.didEvalAsync = true
      })
      await new Promise(resolve => setTimeout(resolve, 50))

      expect(child.didEvalAsync).toBe(true)
    })
    test('executes $$postDigest functions on isolated scopes', () => {
      let parent = new Scope()
      let child = parent.$new(true)
      child.$$postDigest(() => {
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
        (newValue, oldValue, scope) => {
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
        (newValue, oldValue, scope) => {
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
        scope => {
          return scope.aValue
        },
        (newValue, oldValue, scope) => {
          scope.counter++
        }
      )
      scope.$digest()
      expect(scope.counter).toBe(1)
      scope.$digest()
      expect(scope.counter).toBe(1)
    })
    // array
    test('notices when the value becomes an array', () => {
      scope.counter = 0

      scope.$watchCollection(
        scope => scope.arr,
        (newValue, oldValue, scope) => {
          scope.counter++
        }
      )

      scope.$digest()
      expect(scope.counter).toEqual(1)

      scope.arr = [1, 2, 3]

      scope.$digest()
      expect(scope.counter).toEqual(2)

      scope.$digest()
      expect(scope.counter).toEqual(2)
    })

    test('notices an item added to an array', () => {
      scope.arr = [1, 2, 3]
      scope.counter = 0

      scope.$watchCollection(
        scope => scope.arr,
        (newValue, oldValue, scope) => {
          scope.counter++
        }
      )

      scope.$digest()
      expect(scope.counter).toEqual(1)

      scope.arr.push(4)
      scope.$digest()
      expect(scope.counter).toEqual(2)

      scope.$digest()
      expect(scope.counter).toEqual(2)
    })
    test('notices an item removed from an array', () => {
      scope.arr = [1, 2, 3]
      scope.counter = 0

      scope.$watchCollection(
        scope => scope.arr,
        (newValue, oldValue, scope) => {
          scope.counter++
        }
      )

      scope.$digest()
      expect(scope.counter).toEqual(1)

      scope.arr.shift()
      scope.$digest()
      expect(scope.counter).toEqual(2)

      scope.$digest()
      expect(scope.counter).toEqual(2)
    })

    test('notices items reordered in  an array', () => {
      scope.arr = [2, 1, 3]
      scope.counter = 0

      scope.$watchCollection(
        scope => scope.arr,
        (newValue, oldValue, scope) => {
          scope.counter++
        }
      )
      scope.$digest()
      expect(scope.counter).toEqual(1)

      scope.arr.sort()
      scope.$digest()
      expect(scope.counter).toEqual(2)

      scope.$digest()
      expect(scope.counter).toEqual(2)
    })
    test('does not fail on NaNs in arrays', () => {
      scope.arr = [2, NaN, 3]
      scope.counter = 0
      scope.$watchCollection(
        scope => scope.arr,
        (newValue, oldValue, scope) => {
          scope.counter++
        }
      )
      scope.$digest()
      expect(scope.counter).toBe(1)
    })
    // array-like
    test('notices an item replaced in an arguments object', () => {
      ;(function() {
        scope.arrayLike = arguments
      })(1, 2, 3)

      scope.counter = 0
      scope.$watchCollection(
        scope => scope.arrayLike,
        (newValue, oldValue, scope) => {
          scope.counter++
        }
      )
      scope.$digest()
      expect(scope.counter).toBe(1)

      scope.arrayLike[1] = 42
      scope.$digest()
      expect(scope.counter).toBe(2)

      scope.$digest()
      expect(scope.counter).toBe(2)
    })

    test('notices an item replaced in a NodeList object', () => {
      document.documentElement.appendChild(document.createElement('div'))

      scope.arrayLike = document.getElementsByTagName('div')

      scope.counter = 0

      scope.$watchCollection(
        scope => scope.arrayLike,
        (newValue, oldValue, scope) => {
          scope.counter++
        }
      )
      scope.$digest()
      expect(scope.counter).toEqual(1)

      document.documentElement.appendChild(document.createElement('div'))
      scope.$digest()
      expect(scope.counter).toEqual(2)

      scope.$digest()
      expect(scope.counter).toEqual(2)
    })
    test('notices when the value becomes an object', () => {
      scope.counter = 0

      scope.$watchCollection(
        scope => scope.obj,
        (newValue, oldValue, scope) => {
          scope.counter++
        }
      )

      scope.$digest()
      expect(scope.counter).toEqual(1)

      scope.obj = { a: 1 }
      scope.$digest()
      expect(scope.counter).toEqual(2)

      scope.$digest()
      expect(scope.counter).toEqual(2)
    })

    test('notices when an attribute is added to an object', () => {
      scope.counter = 0
      scope.obj = { a: 1 }

      scope.$watchCollection(
        scope => scope.obj,
        (newValue, oldValue, scope) => {
          scope.counter++
        }
      )

      scope.$digest()
      expect(scope.counter).toBe(1)

      scope.obj.b = 2
      scope.$digest()
      expect(scope.counter).toBe(2)

      scope.$digest()
      expect(scope.counter).toBe(2)
    })

    test('notices when an attribute is changed in an object', () => {
      scope.counter = 0
      scope.obj = { a: 1 }
      scope.$watchCollection(
        scope => scope.obj,
        (newValue, oldValue, scope) => {
          scope.counter++
        }
      )
      scope.$digest()
      expect(scope.counter).toBe(1)
      scope.obj.a = 2
      scope.$digest()
      expect(scope.counter).toBe(2)
      scope.$digest()
      expect(scope.counter).toBe(2)
    })

    test('does not fail on NaN attributes in objects', () => {
      scope.counter = 0
      scope.obj = { a: NaN }
      scope.$watchCollection(
        scope => scope.obj,
        (newValue, oldValue, scope) => {
          scope.counter++
        }
      )
      scope.$digest()
      expect(scope.counter).toBe(1)
    })

    test('notices when an attribute is removed from an object', () => {
      scope.counter = 0
      scope.obj = { a: 1 }
      scope.$watchCollection(
        scope => scope.obj,
        (newValue, oldValue, scope) => {
          scope.counter++
        }
      )
      scope.$digest()
      expect(scope.counter).toBe(1)
      delete scope.obj.a
      scope.$digest()
      expect(scope.counter).toBe(2)
      scope.$digest()
      expect(scope.counter).toBe(2)
    })
    test('does not consider any object with a length property an array', () => {
      scope.obj = { length: 42, otherKey: 'abc' }

      scope.counter = 0
      scope.$watchCollection(
        scope => scope.obj,
        (newValue, oldValue, scope) => {
          scope.counter++
        }
      )

      scope.$digest()

      scope.obj.newKey = 'def'
      scope.$digest()
      expect(scope.counter).toEqual(2)
    })

    test('gives the old non-collection value to listeners', () => {
      scope.aValue = 42
      let oldValueGiven

      scope.$watchCollection(
        scope => scope.aValue,
        (newValue, oldValue, scope) => {
          oldValueGiven = oldValue
        }
      )

      scope.$digest()
      scope.aValue = 43
      scope.$digest()
      expect(oldValueGiven).toEqual(42)
    })

    test('gives the old array value to listeners', () => {
      scope.aValue = [1, 2, 3]
      let oldValueGiven

      scope.$watchCollection(
        scope => scope.aValue,
        (newValue, oldValue, scope) => {
          oldValueGiven = oldValue
        }
      )

      scope.$digest()
      scope.aValue.push(4)
      scope.$digest()
      expect(oldValueGiven).toEqual([1, 2, 3])
    })

    test('gives the old object value to listeners', () => {
      scope.aValue = { a: 1, b: 2 }

      let oldValueGiven

      scope.$watchCollection(
        scope => scope.aValue,
        (newValue, oldValue, scope) => {
          oldValueGiven = oldValue
        }
      )

      scope.$digest()
      scope.aValue.c = 3
      scope.$digest()
      expect(oldValueGiven).toEqual({ a: 1, b: 2 })
    })

    test('uses the new value as the old value on first digest', () => {
      scope.aValue = { a: 1, b: 2 }
      let oldValueGiven
      scope.$watchCollection(
        scope => scope.aValue,
        (newValue, oldValue, scope) => {
          oldValueGiven = oldValue
        }
      )
      scope.$digest()
      expect(oldValueGiven).toEqual({ a: 1, b: 2 })
    })
    it('accepts expressions for watch functions', () => {
      let theValue
      scope.aColl = [1, 2, 3]
      scope.$watchCollection('aColl', (newValue, oldValue, scope) => {
        theValue = newValue
      })
      scope.$digest()
      expect(theValue).toEqual([1, 2, 3])
    })
  })

  describe('events', () => {
    let parent, scope, child, isolatedChild

    beforeEach(() => {
      parent = new Scope()
      scope = parent.$new()
      child = scope.$new()
      isolatedChild = scope.$new(true)
    })

    test('allows registering listeners', () => {
      let listener1 = function() {}
      let listener2 = function() {}
      let listener3 = function() {}

      scope.$on('someEvent', listener1)
      scope.$on('someEvent', listener2)
      scope.$on('someOtherEvent', listener3)

      expect(scope.$$listeners).toEqual({
        someEvent: [listener1, listener2],
        someOtherEvent: [listener3]
      })
    })
    test('registers different listeners for every scope', () => {
      let listener1 = () => {}
      let listener2 = () => {}
      let listener3 = () => {}

      scope.$on('someEvent', listener1)
      child.$on('someEvent', listener2)
      isolatedChild.$on('someEvent', listener3)

      expect(scope.$$listeners).toEqual({ someEvent: [listener1] })
      expect(child.$$listeners).toEqual({ someEvent: [listener2] })
      expect(isolatedChild.$$listeners).toEqual({ someEvent: [listener3] })
    })
    ;['$broadcast', '$emit'].forEach(method => {
      test(`calls the listeners of the matching event on ${method}`, () => {
        let listener1 = jest.fn()
        let listener2 = jest.fn()
        scope.$on('someEvent', listener1)
        scope.$on('someOtherEvent', listener2)
        scope[method]('someEvent')

        expect(listener1).toHaveBeenCalled()
        expect(listener2).not.toHaveBeenCalled()
      })
      test(`passes an event object with a name to listeners on ${method}`, () => {
        let listener = jest.fn()
        scope.$on('someEvent', listener)
        scope[method]('someEvent')

        expect(listener).toHaveBeenCalled()
        expect(listener.mock.calls[0][0].name).toEqual('someEvent')
      })
      test(`passes the same event object to each listener on ${method}`, () => {
        let listener1 = jest.fn()
        let listener2 = jest.fn()
        scope.$on('someEvent', listener1)
        scope.$on('someEvent', listener2)
        scope[method]('someEvent')

        let event1 = listener1.mock.calls[listener1.mock.calls.length - 1][0]
        let event2 = listener2.mock.calls[listener2.mock.calls.length - 1][0]
        expect(event1).toBe(event2)
      })
      test(`passes additional arguments to listeners on ${method}`, () => {
        let listener = jest.fn()
        scope.$on('someEvent', listener)

        scope[method]('someEvent', 'and', ['additional', 'arguments'], '...')

        expect(listener.mock.calls[listener.mock.calls.length - 1][1]).toEqual(
          'and'
        )
        expect(listener.mock.calls[listener.mock.calls.length - 1][2]).toEqual([
          'additional',
          'arguments'
        ])
        expect(listener.mock.calls[listener.mock.calls.length - 1][3]).toEqual(
          '...'
        )
      })
      test(`returns the event object on  ${method}`, () => {
        scope.$on('someEvent', () => {})
        let returnedEvent = scope[method]('someEvent')
        expect(returnedEvent).toBeDefined()
        expect(returnedEvent.name).toEqual('someEvent')
      })
      test(`can be deregistered ${method}`, () => {
        let listener = jest.fn()
        let deregister = scope.$on('someEvent', listener)
        deregister()
        scope[method]('someEvent')
        expect(listener).not.toHaveBeenCalled()
      })
      test(`does not skip the next listener when removed on ${method}`, () => {
        let deregister
        let listener = function() {
          deregister()
        }
        let nextListener = jest.fn()
        deregister = scope.$on('someEvent', listener)
        scope.$on('someEvent', nextListener)
        scope[method]('someEvent')
        expect(nextListener).toHaveBeenCalled()
      })
      test(`is sets defaultPrevented when preventDefault called on ${method}`, () => {
        let listener = function(event) {
          event.preventDefault()
        }
        scope.$on('someEvent', listener)
        let event = scope[method]('someEvent')
        expect(event.defaultPrevented).toBe(true)
      })
      test(`does not stop on exceptions on ${method}`, () => {
        let listener1 = function(event) {
          throw 'listener1 throwing an exception'
        }
        let listener2 = jest.fn()
        scope.$on('someEvent', listener1)
        scope.$on('someEvent', listener2)
        scope[method]('someEvent')
        expect(listener2).toHaveBeenCalled()
      })
    })
    test('propagates up the scope hierarchy on $emit', () => {
      let parentListener = jest.fn()
      let scopeListener = jest.fn()
      parent.$on('someEvent', parentListener)
      scope.$on('someEvent', scopeListener)
      scope.$emit('someEvent')
      expect(scopeListener).toHaveBeenCalled()
      expect(parentListener).toHaveBeenCalled()
    })

    test('propagates the same event up on $emit', () => {
      let parentListener = jest.fn()
      let scopeListener = jest.fn()
      parent.$on('someEvent', parentListener)
      scope.$on('someEvent', scopeListener)
      scope.$emit('someEvent')
      let scopeEvent =
        scopeListener.mock.calls[scopeListener.mock.calls.length - 1][0]
      let parentEvent =
        parentListener.mock.calls[parentListener.mock.calls.length - 1][0]
      expect(scopeEvent).toEqual(parentEvent)
    })

    test('propagates down the scope hierarchy on $broadcast', () => {
      let scopeListener = jest.fn()
      let childListener = jest.fn()
      let isolatedChildListener = jest.fn()
      scope.$on('someEvent', scopeListener)
      child.$on('someEvent', childListener)
      isolatedChild.$on('someEvent', isolatedChildListener)
      scope.$broadcast('someEvent')
      expect(scopeListener).toHaveBeenCalled()
      expect(childListener).toHaveBeenCalled()
      expect(isolatedChildListener).toHaveBeenCalled()
    })
    test('propagates the same event down on $broadcast', () => {
      let scopeListener = jest.fn()
      let childListener = jest.fn()
      scope.$on('someEvent', scopeListener)
      child.$on('someEvent', childListener)
      scope.$broadcast('someEvent')
      let scopeEvent =
        scopeListener.mock.calls[scopeListener.mock.calls.length - 1][0]
      let childEvent =
        childListener.mock.calls[childListener.mock.calls.length - 1][0]
      expect(scopeEvent).toEqual(childEvent)
    })
    test('attaches targetScope on $emit', () => {
      let scopeListener = jest.fn()
      let parentListener = jest.fn()

      scope.$on('someEvent', scopeListener)
      parent.$on('someEvent', parentListener)

      scope.$emit('someEvent')

      let targetScope =
        scopeListener.mock.calls[scopeListener.mock.calls.length - 1][0]
          .targetScope
      expect(targetScope).toEqual(scope)
      let parentScope =
        parentListener.mock.calls[parentListener.mock.calls.length - 1][0]
          .targetScope
      expect(parentScope).toEqual(scope)
    })

    test('attaches targetScope on $broadcast', () => {
      let scopeListener = jest.fn()
      let childListener = jest.fn()

      scope.$on('someEvent', scopeListener)
      child.$on('someEvent', childListener)

      scope.$broadcast('someEvent')

      expect(
        scopeListener.mock.calls[scopeListener.mock.calls.length - 1][0]
          .targetScope
      ).toEqual(scope)

      expect(
        childListener.mock.calls[childListener.mock.calls.length - 1][0]
          .targetScope
      ).toEqual(scope)
    })
    test('attaches currentScope on $emit', () => {
      let currentScopeOnScope, currentScopeOnParent
      let scopeListener = function(event) {
        currentScopeOnScope = event.currentScope
      }
      let parentListener = function(event) {
        currentScopeOnParent = event.currentScope
      }
      scope.$on('someEvent', scopeListener)
      parent.$on('someEvent', parentListener)
      scope.$emit('someEvent')
      expect(currentScopeOnScope).toBe(scope)
      expect(currentScopeOnParent).toBe(parent)
    })
    test('attaches currentScope on $broadcast', () => {
      let currentScopeOnScope, currentScopeOnChild
      let scopeListener = function(event) {
        currentScopeOnScope = event.currentScope
      }
      let childListener = function(event) {
        currentScopeOnChild = event.currentScope
      }
      scope.$on('someEvent', scopeListener)
      child.$on('someEvent', childListener)
      scope.$broadcast('someEvent')
      expect(currentScopeOnScope).toBe(scope)
      expect(currentScopeOnChild).toBe(child)
    })
    test('sets currentScope to null after propagation on $emit', () => {
      let event
      let scopeListener = function(evt) {
        event = evt
      }
      scope.$on('someEvent', scopeListener)
      scope.$emit('someEvent')
      expect(event.currentScope).toBe(null)
    })

    test('sets currentScope to null after propagation on $broadcast', () => {
      let event
      let scopeListener = function(evt) {
        event = evt
      }
      scope.$on('someEvent', scopeListener)
      scope.$broadcast('someEvent')
      expect(event.currentScope).toBe(null)
    })
    test('does not propagate to parents when stopped', () => {
      let scopeListener = function(event) {
        event.stopPropagation()
      }
      let parentListener = jest.fn()
      scope.$on('someEvent', scopeListener)
      parent.$on('someEvent', parentListener)
      scope.$emit('someEvent')
      expect(parentListener).not.toHaveBeenCalled()
    })
    test('is received by listeners on current scope after being stopped', () => {
      let listener1 = function(event) {
        event.stopPropagation()
      }
      let listener2 = jest.fn()
      scope.$on('someEvent', listener1)
      scope.$on('someEvent', listener2)
      scope.$emit('someEvent')
      expect(listener2).toHaveBeenCalled()
    })
    test('fires $destroy when destroyed', () => {
      let listener = jest.fn()
      scope.$on('$destroy', listener)
      scope.$destroy()
      expect(listener).toHaveBeenCalled()
    })
    test('fires $destroy on children destroyed', () => {
      let listener = jest.fn()
      child.$on('$destroy', listener)
      scope.$destroy()
      expect(listener).toHaveBeenCalled()
    })
    test('no longers calls listeners after destroyed', () => {
      let listener = jest.fn()
      scope.$on('myEvent', listener)
      scope.$destroy()
      scope.$emit('myEvent')
      expect(listener).not.toHaveBeenCalled()
    })
  })
})
