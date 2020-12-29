angular.module('app', []).controller('CounterController', [
  '$scope',
  function($scope) {
    $scope.todos = [
      { text: 'Learn AngularJS', done: false },
      { text: 'Build an app', done: false }
    ]

    $scope.getTotalTodos = function() {
      return $scope.todos.length
    }

    $scope.addTodo = function() {
      $scope.todos.push({ text: $scope.formTodoText, done: false })
      $scope.formTodoText = ''
    }

    $scope.clearCompleted = function() {
      $scope.todos = $scope.todos.filter(todo => {
        return !todo.done
      })
    }
  }
])
