export default function ngTranscludeDirective() {
  return {
    restrict: 'EAC',
    link: function(scope, element, attrs, ctrl, transclude) {
      transclude(clone => {
        element.empty()
        element.append(clone)
      })
    }
  }
}
