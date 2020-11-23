import utils from './utils'
import $ from 'jquery'
const PREFIX_REGEXP = /(x[:_-]|data[:_-])/i

function directiveNormalize(name) {
  return utils.camelCase(name.replace(PREFIX_REGEXP, ''))
}

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
            if (node.childNodes && node.childNodes.length) {
              compileNodes(node.childNodes)
            }
          })
        }
        function collectDirectives(node) {
          let directives = []
          if (node.nodeType === Node.ELEMENT_NODE) {
            let normalizedNodeName = directiveNormalize(
              nodeName(node).toLowerCase()
            )
            addDirective(directives, normalizedNodeName)
            // attribute directive
            utils.forEach(node.attributes, attribute => {
              let normalizedAttrName = directiveNormalize(
                attribute.name.toLowerCase()
              )
              if (/^ngAttr[A-Z]/.test(normalizedAttrName)) {
                normalizedAttrName =
                  normalizedAttrName[6].toLowerCase() +
                  normalizedAttrName.substring(7)
              }
              addDirective(directives, normalizedAttrName)
            })
            // class directive
            node.classList.forEach(cls => {
              let normalizedClassName = directiveNormalize(cls)
              addDirective(directives, normalizedClassName)
            })
          } else if (node.nodeType === Node.COMMENT_NODE) {
            let match = /^\s*directive:\s*([\d\w\-_]+)/.exec(node.nodeValue)
            if (match) {
              addDirective(directives, directiveNormalize(match[1]))
            }
          }

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
