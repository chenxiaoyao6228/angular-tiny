import utils from './utils'

export default function $RootScopeProvider() {
  let TTL = 10
  this.digestTtl = function(value) {
    if (utils.isNumber(value)) {
      TTL = value
    }
    return TTL
  }

  this.$get = [
    '$parse',
    function($parse) {
      class Scope {
        constructor() {
          this.$$watchers = []
          this.$$initWatch = () => {}
          this.$$lastDirtyWatch = null
          this.$$asyncQueue = []
          this.$$applyAsyncQueue = []
          this.$$postDigestQueue = []
          this.$$phase = null
          this.$$applyAsyncId = null
          this.$$children = []
          this.$root = this
          this.$$listeners = {}
        }
        $new(isolated, parent) {
          let child
          parent = parent || this
          if (isolated) {
            child = new Scope()
            child.$root = parent.$root
            child.$$asyncQueue = parent.$$asyncQueue
            child.$$postDigestQueue = parent.$$postDigestQueue
            child.$$applyAsyncQueue = parent.$$applyAsyncQueue
          } else {
            let ChildScope = function() {}
            ChildScope.prototype = this
            child = new ChildScope()
          }
          parent.$$children.push(child)
          child.$$watchers = []
          child.$$children = []
          child.$$listeners = {}
          child.$parent = parent
          return child
        }
        $watch(watchFn, listenerFn, valueEq) {
          watchFn = $parse(watchFn)

          if (watchFn.$$watchDelegate) {
            return watchFn.$$watchDelegate(this, listenerFn, valueEq, watchFn)
          }

          let watcher = {
            watchFn: watchFn,
            listenerFn: listenerFn || function() {},
            valueEq: !!valueEq,
            oldValue: this.$$initWatch
          }
          this.$$watchers.unshift(watcher)
          this.$root.$$lastDirtyWatch = null
          return () => {
            let index = this.$$watchers.indexOf(watcher)
            if (index >= 0) {
              this.$$watchers.splice(index, 1)
              this.$root.$$lastDirtyWatch = null
            }
          }
        }
        $watchGroup(watchFns, listenerFn) {
          let newValues = new Array(watchFns.length)
          let oldValues = new Array(watchFns.length)

          let changeReactionScheduled = false
          let firstRun = true

          if (watchFns.length === 0) {
            let shouldCall = true
            this.$evalAsync(() => {
              if (shouldCall) {
                listenerFn(newValues, oldValues, this)
              }
            })
            return () => {
              shouldCall = false
            }
          }

          const watchGroupListener = () => {
            if (firstRun) {
              firstRun = false
            }
            listenerFn(newValues, oldValues, this)
            changeReactionScheduled = false
          }

          let destroyGroupWatchers = []

          watchFns.forEach((watchFn, i) => {
            let destroyWatch = this.$watch(watchFn, (newValue, oldValue) => {
              newValues[i] = newValue
              oldValues[i] = oldValue
              if (!changeReactionScheduled) {
                changeReactionScheduled = true
                this.$evalAsync(watchGroupListener)
              }
            })
            destroyGroupWatchers.push(destroyWatch)
          })

          return () => {
            destroyGroupWatchers.forEach(destroyWatch => destroyWatch())
          }
        }
        $watchCollection(watchFn, listenerFn) {
          let newValue, oldValue, oldLength, veryOldValue

          let trackVeryOldValue = listenerFn.length > 1
          let changeCount = 0
          let firstRun = true
          watchFn = $parse(watchFn)

          let internalWatchFn = scope => {
            let newLength
            newValue = watchFn(scope)
            // 复合数据类型
            if (utils.isObject(newValue)) {
              if (utils.isArrayLike(newValue)) {
                // 非数组变为数组
                if (!utils.isArray(oldValue)) {
                  changeCount++
                  oldValue = []
                }
                // 元素新增或者移除
                if (newValue.length !== oldValue.length) {
                  changeCount++
                  oldValue.length = newValue.length
                }
                utils.forEach(newValue, (newItem, index) => {
                  let bothNaN =
                    Number.isNaN(newItem) && Number.isNaN(oldValue[index])
                  if (!bothNaN && newItem !== oldValue[index]) {
                    changeCount++
                    oldValue[index] = newItem
                  }
                })
              } else {
                // 除了数组,类数组之外的对象

                // 由非对象转为普通对象或者由数组转化为对象
                if (!utils.isObject(oldValue) || utils.isArrayLike(oldValue)) {
                  changeCount++
                  oldValue = {}
                  oldLength = 0
                }
                newLength = 0
                utils.forOwn(newValue, (newVal, key) => {
                  newLength++
                  if (Object.prototype.hasOwnProperty.call(oldValue, key)) {
                    let bothNaN =
                      utils.isNaN(newVal) && utils.isNaN(oldValue[key])
                    if (!bothNaN && oldValue[key] !== newVal) {
                      changeCount++
                      oldValue[key] = newVal
                    }
                  } else {
                    changeCount++
                    oldLength++
                    oldValue[key] = newVal
                  }
                })
                if (oldLength > newLength) {
                  utils.forOwn(oldValue, (oldVal, key) => {
                    if (!Object.prototype.hasOwnProperty.call(newValue, key)) {
                      oldLength--
                      changeCount++
                      delete oldValue[key]
                    }
                  })
                }
              }
            } else {
              // 基础数据类型
              if (!this.$$areEqual(oldValue, newValue, false)) {
                changeCount++
              }
              oldValue = newValue
            }
            return changeCount
          }

          let internalListenerFn = () => {
            if (firstRun) {
              listenerFn(newValue, newValue, this)
              firstRun = false
            } else {
              listenerFn(newValue, veryOldValue, this)
            }
            if (trackVeryOldValue) {
              veryOldValue = utils.clone(newValue)
            }
          }

          return this.$watch(internalWatchFn, internalListenerFn)
        }
        $destroy() {
          this.$broadcast('$destroy')

          if (this.$parent) {
            let siblings = this.$parent.$$children
            let indexOfThis = siblings.indexOf(this)
            if (indexOfThis >= 0) {
              siblings.splice(indexOfThis, 1)
            }
            this.$$watchers = null
            this.$$listeners = {}
          }
        }
        $digest() {
          let dirty,
            dirtyCountLimit = TTL
          this.$root.$$lastDirtyWatch = null
          this.$beginPhase('$digest')

          if (this.$root.$$applyAsyncId) {
            clearTimeout(this.$root.$$applyAsyncId)
            this.$$flushApplyAsync()
          }

          do {
            while (this.$$asyncQueue.length > 0) {
              try {
                let exprObj = this.$$asyncQueue.shift()
                exprObj.scope.$eval(exprObj.expression)
              } catch (e) {
                console.error(e)
              }
            }
            dirty = this.$$digestOnce()
            if ((dirty || this.$$asyncQueue.length) && !dirtyCountLimit--) {
              this.$clearPhase()
              throw new Error('10 digest limit reach!')
            }
          } while (dirty || this.$$asyncQueue.length)
          this.$clearPhase()

          while (this.$$postDigestQueue.length) {
            try {
              this.$$postDigestQueue.shift()()
            } catch (e) {
              console.error(e)
            }
          }
        }
        $$digestOnce() {
          let dirty
          let continueLoop = true
          this.$$everyScope(scope => {
            let newValue, oldValue
            utils.forEachRight(scope.$$watchers, watcher => {
              try {
                if (watcher) {
                  let newValue = watcher.watchFn(scope)
                  let oldValue = watcher.oldValue
                  if (!scope.$$areEqual(newValue, oldValue, watcher.valueEq)) {
                    this.$root.$$lastDirtyWatch = watcher // lastDirty还是记录在parent上
                    watcher.oldValue = watcher.valueEq
                      ? utils.deepClone(newValue)
                      : newValue
                    watcher.listenerFn(
                      newValue,
                      oldValue === this.$$initWatch ? newValue : oldValue,
                      scope
                    )
                    dirty = true
                  } else if (this.$root.$$lastDirtyWatch === watcher) {
                    continueLoop = false
                    dirty = false
                    return false
                  }
                }
              } catch (e) {
                console.error(e)
              }
            })
            return continueLoop
          })
          return dirty
        }
        $$postDigest(fn) {
          this.$$postDigestQueue.push(fn)
        }
        $eval(expression, locals) {
          return $parse(expression)(this, locals)
        }
        $evalAsync(expression) {
          if (!this.$$phase && !this.$$asyncQueue.length) {
            setTimeout(() => {
              if (this.$$asyncQueue.length) {
                this.$root.$digest()
              }
            }, 0)
          }

          this.$$asyncQueue.push({
            scope: this,
            expression: expression
          })
        }
        $apply(expression) {
          try {
            this.$beginPhase('$apply')
            return $parse(expression)(this)
          } finally {
            this.$clearPhase()
            this.$root.$digest()
          }
        }
        $$flushApplyAsync() {
          while (this.$$applyAsyncQueue.length) {
            try {
              this.$$applyAsyncQueue.shift()()
            } catch (e) {
              console.error(e)
            }
          }
          this.$root.$$applyAsyncId = null
        }

        $applyAsync(expr) {
          this.$$applyAsyncQueue.push(() => {
            this.$eval(expr)
          })
          if (this.$root.$$applyAsyncId === null) {
            this.$root.$$applyAsyncId = setTimeout(() => {
              this.$apply(this.$$flushApplyAsync.bind(this))
            }, 0)
          }
        }
        $beginPhase(phase) {
          if (this.$$phase) {
            throw this.$$phase + ' already in progress.'
          }
          this.$$phase = phase
        }
        $clearPhase() {
          this.$$phase = null
        }
        $on(eventName, eventListener) {
          let listeners = this.$$listeners[eventName]

          if (!listeners) {
            this.$$listeners[eventName] = listeners = []
          }
          listeners.push(eventListener)
          return () => {
            let index = listeners.indexOf(eventListener)
            if (index > -1) {
              listeners[index] = null
            }
          }
        }
        $emit(eventName, ...restArg) {
          let scope = this
          let propogationStopped = false
          let event = {
            name: eventName,
            targetScope: this,
            stopPropagation() {
              propogationStopped = true
            },
            preventDefault() {
              event.defaultPrevented = true
            }
          }

          let listenerArgs = [event].concat(restArg)
          do {
            event.currentScope = scope
            scope.$$fireEventOnScope(eventName, listenerArgs)
            scope = scope.$parent
          } while (scope && !propogationStopped)

          event.currentScope = null
          return event
        }
        $broadcast(eventName, ...restArg) {
          let event = {
            name: eventName,
            targetScope: this,
            preventDefault() {
              event.defaultPrevented = true
            }
          }
          let listenerArgs = [event].concat(restArg)
          this.$$everyScope(scope => {
            event.currentScope = scope
            scope.$$fireEventOnScope(eventName, listenerArgs)
            return true
          })
          event.currentScope = null
          return event
        }
        $$fireEventOnScope(eventName, listenerArgs) {
          let listeners = this.$$listeners[eventName] || []
          listeners.forEach(
            // 注意listener可能为空
            (listener, i) => {
              if (listener === null) {
                listeners.splice(i, 1)
              } else {
                try {
                  listener.apply(null, listenerArgs)
                } catch (e) {
                  console.error(e)
                }
                i++
              }
            }
          )
        }
        $$areEqual(newValue, oldValue, valueEqual) {
          if (valueEqual) {
            return utils.deepEqual(newValue, oldValue)
          } else {
            return (
              newValue === oldValue ||
              (typeof newValue === 'number' &&
                typeof oldValue === 'number' &&
                isNaN(newValue) &&
                isNaN(oldValue))
            )
          }
        }
        $$everyScope(fn) {
          if (fn(this)) {
            return this.$$children.every(child => {
              return child.$$everyScope(fn)
            })
          } else {
            return false
          }
        }
      }

      let $rootScope = new Scope()
      return $rootScope
    }
  ]
}
