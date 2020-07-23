import utils from './utils/tool.js'

export default class Scope {
  constructor() {
    this.aProperty = 1
    this.$$watchers = []
    this.$$initWatch = () => {}
    this.$$lastDirtyWatch = null
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
    dirty = this.$$digestOnce()
    dirtyCountLimit--
    while (dirty && dirtyCountLimit > 0) {
      dirty = this.$$digestOnce()
      dirtyCountLimit--
      if (dirtyCountLimit === 0 && dirty)
        throw new Error('10 digest limit reach!')
    }
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
  $eval(executor, locals) {
    let self = this
    return executor.apply(null, [self, locals])
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
