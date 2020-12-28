// 在link的时候,事件绑定
export default function ngClickDirective() {
  return {
    restrict: 'A',
    link: function(scope, element, attrs) {
      element.on('click', evt => {
        scope.$eval(attrs.ngClick, { $event: evt })
        scope.$apply()
      })
    }
  }
}
