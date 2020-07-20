export default class Scope {
  constructor() {
    this.aProperty = 1
    this.$$watchers = []
  }
  $watch(watchFn, listenerFn) {
    let watcher = {
      watchFn,
      listenerFn,
      oldValue: null
    }
    this.$$watchers.push(watcher)
  }
  $digest() {
    this.$$watchers.forEach(watcher => {
      let watchFn = watcher.watchFn
      let newValue = watchFn(this)
      let oldValue = watcher.oldValue
      if (newValue !== oldValue) {
        watcher.oldValue = newValue
        watcher.listenerFn(oldValue, newValue, this)
      }
    })
  }
}
