export default class Scope {
  constructor() {
    this.aProperty = 1
    this.$$watchers = []
    this.$$initWatch = () => {}
  }
  $watch(watchFn, listenerFn) {
    let watcher = {
      watchFn,
      listenerFn: listenerFn || function() {},
      oldValue: this.$$initWatch
    }
    this.$$watchers.push(watcher)
  }
  $digest() {
    let dirty,
      dirtyCountLimit = 10
    do {
      dirty = this.$$digestOnce()
      dirtyCountLimit--
      if (dirtyCountLimit === 0 && dirty)
        throw new Error('10 digest limit reach!')
    } while (dirty && dirtyCountLimit > 0)
  }
  $$digestOnce() {
    let newValue, oldValue, dirty
    this.$$watchers.forEach(watcher => {
      let watchFn = watcher.watchFn
      let newValue = watchFn(this)
      let oldValue = watcher.oldValue
      if (newValue !== oldValue) {
        watcher.oldValue = newValue
        watcher.listenerFn(
          newValue,
          oldValue === this.$$initWatch ? newValue : oldValue,
          this
        )
        dirty = true
      }
    })
    return dirty
  }
}
