angular.module('myCounterApp', []).controller('CounterController', function() {
  this.counter = 1
  this.increment = function() {
    this.counter++
  }
  this.decrement = function() {
    this.counter--
  }
})
