export default class Scope {
  constructor() {
    this.aProperty = 1
    this.$$watchers = []
  }
  $watch(watchFn, listenerFn) {
    let watcher = {
      watchFn,
      listenerFn
    }
    this.$$watchers.push(watcher)
  }
  $digest() {
    this.$$watchers.forEach(watcher => {
      watcher.listenerFn()
    })
  }
}
