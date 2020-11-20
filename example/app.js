/*
  Source: https://codepen.io/Russbrown/pen/IgBuh
  Author: Russbrown
*/

// controller只是一个函数, 执行之后把相应的数据和方法挂在到scope上而已
function TodoCtrl($scope) {
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
