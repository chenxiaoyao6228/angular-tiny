export default function $CompileProvider($provide) {
  let hasDirectives = {}
  this.directive = function(name, directiveFactory) {
    if (!Object.prototype.hasOwnProperty.call(hasDirectives, name)) {
      hasDirectives[name] = []
      $provide.factory(name + 'Directive', [
        '$injector',
        function($injector) {
          let factories = hasDirectives[name]
          return factories.map($injector.invoke)
        }
      ])
    }
    hasDirectives[name].push(directiveFactory)
  }
  this.$get = function() {}
}
$CompileProvider.$inject = ['$provide']
