export default class Scope {
  constructor() {
    this.aProperty = 1
    this.$$watchers = []
    this.$$initWatch = () => {}
    this.$$lastDirtyWatch = null
  }
  $watch(watchFn, listenerFn) {
    let watcher = {
      watchFn,
      listenerFn: listenerFn || function() {},
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
      if (newValue !== oldValue) {
        this.$$lastDirtyWatch = watcher
        watcher.oldValue = newValue
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
}
