import utils from './utils/tool.js'

export default class Scope {
  constructor() {
    this.aProperty = 1
    this.$$watchers = []
    this.$$initWatch = () => {}
    this.$$lastDirtyWatch = null
    this.$$asyncQueue = []
  }
  $watch(watchFn, listenerFn, valueEq) {
    let watcher = {
      watchFn,
      listenerFn: listenerFn || function() {},
      valueEq: !!valueEq,
      oldValue: this.$$initWatch
    }
    this.$$watchers.push(watcher)
    this.$$lastDirtyWatch = null
  }
  $digest() {
    let dirty,
      dirtyCountLimit = 10
    this.$$lastDirtyWatch = null
    do {
      while (this.$$asyncQueue.length > 0) {
        let exprObj = this.$$asyncQueue.shift()
        exprObj.scope.$eval(exprObj.expression)
      }
      dirty = this.$$digestOnce()
      if ((dirty || this.$$asyncQueue.length) && !dirtyCountLimit--) {
        throw new Error('10 digest limit reach!')
      }
    } while (dirty || this.$$asyncQueue.length)
  }
  $$digestOnce() {
    let newValue,
      oldValue,
      dirty = false
    this.$$watchers.some(watcher => {
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
        // some在return true的时候终止, every在return false的时候终止
        return true
      }
    })
    return dirty
  }
  $eval(expression, locals) {
    return expression.apply(null, [this, locals])
  }
  $evalAsync(expression) {
    this.$$asyncQueue.push({
      scope: this,
      expression: expression
    })
  }
  $apply(expression) {
    try {
      expression.apply(null, [this])
    } finally {
      this.$digest()
    }
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
