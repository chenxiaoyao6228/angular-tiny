export default [
  '$interpolate',
  function ngRepeatDirective($interpolate) {
    return {
      restrict: 'A',
      multiElement: true,
      transclude: 'element',
      priority: 1000,
      terminal: true,
      link($scope, $element, $attr) {
        let expression = $attr.ngRepeat
        let match = expression.match(/^\s*(\w+)\s*in\s*(\w+)\s*$/)
        if (!match) {
          throw new Error(
            "Expected expression in form of '_item_ in _collection_[ track by _id_]' but got '{0}'." +
              expression
          )
        }
        let lhs = match[1]
        let rhs = match[2]
        let parent = $element.parent()
        $scope.$watchCollection(
          scope => scope[rhs],
          function ngRepeatWatch(newValue, oldValue, scope) {
            let collection = scope.$eval(rhs)
            parent.empty()
            for (
              let index = 0, length = collection.length;
              index < length;
              index++
            ) {
              parent.append('<li>' + collection[index].name + ';</li>')
            }
          }
        )
      }
    }
  }
]
