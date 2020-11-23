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
            return factories.map((factory, i) => {
              let directive = $injector.invoke(factory)
              directive.restrict = directive.restrict || 'EA'
              directive.name = directive.name || name
              directive.priority = directive.priority || 0
              directive.index = i
              return directive
            })
          }
        ])
      }
      hasDirectives[name].push(directiveFactory)
    } else {
      utils.forEach(name, (directiveFactory, name) => {
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
            let terminal = applyDirectivesToNode(directives, node)
            if (!terminal && node.childNodes && node.childNodes.length) {
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
            addDirective(directives, normalizedNodeName, 'E')
            // attribute directive
            utils.forEach(node.attributes, attr => {
              let attrStartName, attrEndName
              let name = attr.name
              let normalizedAttrName = directiveNormalize(name.toLowerCase())
              if (/^ngAttr[A-Z]/.test(normalizedAttrName)) {
                name = utils.kebabCase(
                  normalizedAttrName[6].toLowerCase() +
                    normalizedAttrName.substring(7)
                )
              }
              let directiveNName = normalizedAttrName.replace(
                /(Start|End)$/,
                ''
              )
              if (directiveIsMultiElement(directiveNName)) {
                if (/Start$/.test(normalizedAttrName)) {
                  attrStartName = name
                  attrEndName = name.substring(0, name.length - 5) + 'end'
                  name = name.substring(0, name.length - 6)
                }
              }
              normalizedAttrName = directiveNormalize(name.toLowerCase())
              addDirective(
                directives,
                normalizedAttrName,
                'A',
                attrStartName,
                attrEndName
              )
            })
            // class directive
            utils.forEach(node.classList, cls => {
              let normalizedClassName = directiveNormalize(cls)
              addDirective(directives, normalizedClassName, 'C')
            })
          } else if (node.nodeType === Node.COMMENT_NODE) {
            let match = /^\s*directive:\s*([\d\w\-_]+)/.exec(node.nodeValue)
            if (match) {
              addDirective(directives, directiveNormalize(match[1]), 'M')
            }
          }
          function byPriority(a, b) {
            let diff = b.priority - a.priority
            if (diff !== 0) {
              return diff
            } else {
              if (a.name !== b.name) {
                return a.name < b.name ? -1 : 1
              } else {
                return a.index - b.index
              }
            }
          }
          return directives.sort(byPriority)
        }
        function addDirective(
          directives,
          name,
          mode,
          attrStartName,
          attrEndName
        ) {
          if (Object.prototype.hasOwnProperty.call(hasDirectives, name)) {
            let foundDirectives = $injector.get(name + 'Directive')
            let applicableDirectives = foundDirectives.filter(dir => {
              return dir.restrict.indexOf(mode) !== -1
            })
            applicableDirectives.forEach(directive => {
              if (attrStartName) {
                directive = Object.assign({}, directive, {
                  $$start: attrStartName,
                  $$end: attrEndName
                })
              }
              directives.push(directive)
            })
          }
        }
        function applyDirectivesToNode(directives, compileNode) {
          let $compileNode = $(compileNode)
          let terminalPriority = -Number.MAX_VALUE
          let terminal = false
          directives.forEach(directive => {
            if (directive.$$start) {
              $compileNode = groupScan(
                compileNode,
                directive.$$start,
                directive.$$end
              )
            }
            if (directive.priority < terminalPriority) {
              return false
            }
            if (directive.compile) {
              directive.compile($compileNode)
            }
            if (directive.terminal) {
              terminal = true
              terminalPriority = directive.priority
            }
          })
          return terminal
        }
        function directiveIsMultiElement(name) {
          if (Object.prototype.hasOwnProperty.call(hasDirectives, name)) {
            let directives = $injector.get(name + 'Directive')
            return utils.some(directives, { multiElement: true })
          }
          return false
        }
        function groupScan(node, startAttr, endAttr) {
          let nodes = []
          if (startAttr && node && node.hasAttribute(startAttr)) {
            let depth = 0
            do {
              if (node.nodeType === Node.ELEMENT_NODE) {
                if (node.hasAttribute(startAttr)) {
                  depth++
                } else if (node.hasAttribute(endAttr)) {
                  depth--
                }
              }
              nodes.push(node)
              node = node.nextSibling
            } while (depth > 0)
          } else {
            nodes.push(node)
          }
          return $(nodes)
        }
        return compile
      }
    ]
  }
}
$CompileProvider.$inject = ['$provide']
