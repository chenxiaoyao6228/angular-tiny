angular.module('app', []).controller('CounterController', [
  '$scope',
  function($scope) {
    $scope.counter = 1
    $scope.increment = function() {
      $scope.counter++
    }
    $scope.decrement = function() {
      $scope.counter--
    }
  }
])
