import utils from './utils/tool.js'
export default class Scope {
  constructor() {
    this.aProperty = 1
    this.$$watchers = []
    this.$$initWatch = () => {}
    this.$$lastDirtyWatch = null
    this.$$asyncQueue = []
    this.$$applyAsyncQueue = []
    this.$$postDigestQueue = []
    this.$$phase = null
    this.$$applyAsyncId = null
  }
  $new() {
    let ChildScope = function() {}
    ChildScope.prototype = this
    let child = new ChildScope()
    return child
  }
  $watch(watchFn, listenerFn, valueEq) {
    let watcher = {
      watchFn: watchFn,
      listenerFn: listenerFn || function() {},
      valueEq: !!valueEq,
      oldValue: this.$$initWatch
    }
    this.$$watchers.unshift(watcher)
    this.$$lastDirtyWatch = null
    return () => {
      let index = this.$$watchers.indexOf(watcher)
      if (index >= 0) {
        this.$$watchers.splice(index, 1)
        this.$$lastDirtyWatch = null
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
  $digest() {
    let dirty,
      dirtyCountLimit = 10
    this.$$lastDirtyWatch = null
    this.$beginPhase('$digest')

    if (this.$$applyAsyncId) {
      clearTimeout(this.$$applyAsyncId)
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
    let newValue,
      oldValue,
      dirty = false
    utils.forEachRight(this.$$watchers, watcher => {
      if (watcher) {
        try {
          let watchFn = watcher.watchFn
          let newValue = watchFn(this)
          let oldValue = watcher.oldValue
          if (!this.$$areEqual(newValue, oldValue, watcher.valueEq)) {
            this.$$lastDirtyWatch = watcher
            watcher.oldValue = watcher.valueEq
              ? utils.deepClone(newValue)
              : newValue
            watcher.listenerFn(
              newValue,
              oldValue === this.$$initWatch ? newValue : oldValue,
              this
            )
            dirty = true
          } else if (this.$$lastDirtyWatch === watcher) {
            dirty = false
            return false
          }
        } catch (e) {
          console.error(e)
        }
      }
    })
    return dirty
  }
  $$postDigest(fn) {
    this.$$postDigestQueue.push(fn)
  }
  $eval(expression, locals) {
    return expression.apply(null, [this, locals])
  }
  $evalAsync(expression) {
    if (!this.$$phase && !this.$$asyncQueue.length) {
      setTimeout(() => {
        if (this.$$asyncQueue.length) {
          this.$digest()
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
      expression.apply(null, [this])
    } finally {
      this.$clearPhase()
      this.$digest()
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
    this.$$applyAsyncId = null
  }

  $applyAsync(expr) {
    this.$$applyAsyncQueue.push(() => {
      this.$eval(expr)
    })
    if (this.$$applyAsyncId === null) {
      this.$$applyAsyncId = setTimeout(() => {
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
}
