import utils from './utils'
import $ from 'jquery'

function nodeName(element) {
  return element.nodeName ? element.nodeName : element[0].nodeName
}
export default function $CompileProvider($provide) {
  let hasDirectives = {}
  this.directive = function(name, directiveFactory) {
    if (utils.isString(name)) {
      if (name === 'hasOwnProperty') {
        throw 'hasOwnProperty is not a valid directive name'
      }
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
    } else {
      utils.forEach(name, (name, directiveFactory) => {
        this.directive(name, directiveFactory)
      })
    }
    this.$get = [
      '$injector',
      function($injector) {
        function compile($compileNodes) {
          return compileNodes($compileNodes)
        }
        function compileNodes($compileNodes) {
          utils.forEach($compileNodes, node => {
            let directives = collectDirectives(node)
            applyDirectivesToNode(directives, node)
          })
        }
        function collectDirectives(node) {
          let directives = []
          let normalizedNodeName = utils.camelCase(nodeName(node).toLowerCase())
          addDirective(directives, normalizedNodeName)
          return directives
        }
        function addDirective(directives, name) {
          if (Object.prototype.hasOwnProperty.call(hasDirectives, name)) {
            directives.push.apply(directives, $injector.get(name + 'Directive'))
          }
        }
        function applyDirectivesToNode(directives, compileNode) {
          let $compileNode = $(compileNode)
          utils.forEach(directives, directive => {
            if (directive.compile) {
              directive.compile($compileNode)
            }
          })
        }
        return compile
      }
    ]
  }
}
$CompileProvider.$inject = ['$provide']
