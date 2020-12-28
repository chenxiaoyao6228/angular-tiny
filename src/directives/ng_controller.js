export default function ngControllerDirective() {
  'use strict'
  return { restrict: 'A', scope: true, controller: '@' }
}
