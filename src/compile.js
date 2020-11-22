export default function $CompileProvider($provide) {
  this.directive = function(name, directiveFactory) {
    $provide.factory(name + 'Directive', directiveFactory)
  }
  this.$get = function() {}
}
$CompileProvider.$inject = ['$provide']
