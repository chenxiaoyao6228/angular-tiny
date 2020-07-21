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
    let dirty
    do {
      dirty = this.$$digestOnce()
    } while (dirty)
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
