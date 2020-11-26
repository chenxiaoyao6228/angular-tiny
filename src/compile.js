import utils from './utils'
import $ from 'jquery'
const PREFIX_REGEXP = /(x[:_-]|data[:_-])/i
let BOOLEAN_ATTRS = {
  multiple: true,
  selected: true,
  checked: true,
  disabled: true,
  readOnly: true,
  required: true,
  open: true
}
let BOOLEAN_ELEMENTS = {
  INPUT: true,
  SELECT: true,
  OPTION: true,
  TEXTAREA: true,
  BUTTON: true,
  FORM: true,
  DETAILS: true
}

function directiveNormalize(name) {
  return utils.camelCase(name.replace(PREFIX_REGEXP, ''))
}
function isBooleanAttribute(node, attrName) {
  return BOOLEAN_ATTRS[attrName] && BOOLEAN_ELEMENTS[node.nodeName]
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
          '$rootScope',
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
      '$rootScope',
      function($injector, $rootScope) {
        $provide.factory(name + 'Directive', [
          '$injector',
          function($injector) {
            let factories = hasDirectives[name]
            return utils.map(factories, (factory, i) => {
              let directive = $injector.invoke(factory)
              directive.restrict = directive.restrict || 'EA'
              directive.priority = directive.priority || 0
              if (directive.link && !directive.compile) {
                directive.compile = () => directive.link
              }
              directive.name = directive.name || name
              directive.index = i
              return directive
            })
          }
        ])
        function Attributes(element) {
          this.$$element = element
          this.$attr = {}
        }
        Attributes.prototype.$set = function(key, value, writeAttr, attrName) {
          this[key] = value
          if (isBooleanAttribute(this.$$element[0], key)) {
            this.$$element.prop(key, value)
          }

          if (!attrName) {
            if (this.$attr[key]) {
              attrName = this.$attr[key]
            } else {
              attrName = this.$attr[key] = utils.kebabCase(key)
            }
          } else {
            this.$attr[key] = attrName
          }

          if (writeAttr !== false) {
            this.$$element.attr(attrName, value)
          }

          if (this.$$observers) {
            utils.forEach(this.$$observers[key], observer => {
              try {
                observer(value)
              } catch (e) {
                console.log(e)
              }
            })
          }
        }
        Attributes.prototype.$observe = function(key, fn) {
          let self = this
          this.$$observers = this.$$observers || Object.create(null)
          this.$$observers[key] = this.$$observers[key] || []
          this.$$observers[key].push(fn)
          $rootScope.$evalAsync(() => {
            fn(self[key])
          })
          return () => {
            let index = self.$$observers[key].indexOf(fn)
            if (index > -1) {
              this.$$observers[key].splice(index, 1)
            }
          }
        }
        Attributes.prototype.$addClass = function(classVal) {
          this.$$element.addClass(classVal)
        }
        Attributes.prototype.$removeClass = function(classVal) {
          this.$$element.removeClass(classVal)
        }
        Attributes.prototype.$updateClass = function(newClassVal, oldClassVal) {
          let self = this
          let newClasses = newClassVal.split(/\s+/)
          let oldClasses = oldClassVal.split(/\s+/)
          let addedClasses = utils.difference(newClasses, oldClasses)
          let removedClasses = utils.difference(oldClasses, newClasses)
          if (addedClasses.length) {
            this.$addClass(addedClasses.join(' '))
          }
          if (removedClasses.length) {
            this.$removeClass(removedClasses.join(' '))
          }
        }
        function compile($compileNodes) {
          let compositeLinkFn = compileNodes($compileNodes)
          return function publicLinkFn(scope) {
            $compileNodes.data('$scope', $rootScope)
            compositeLinkFn(scope, $compileNodes)
          }
        }
        function compileNodes($compileNodes) {
          let linkFns = []
          utils.forEach($compileNodes, (node, idx) => {
            let attrs = new Attributes($(node))
            let directives = collectDirectives(node, attrs)
            let nodeLinkFn
            if (directives.length) {
              nodeLinkFn = applyDirectivesToNode(directives, node, attrs)
            }
            let childLinkFn
            if (
              (!nodeLinkFn || !nodeLinkFn.terminal) &&
              node.childNodes &&
              node.childNodes.length
            ) {
              childLinkFn = compileNodes(node.childNodes)
            }
            if (nodeLinkFn || childLinkFn) {
              linkFns.push({
                nodeLinkFn: nodeLinkFn,
                childLinkFn: childLinkFn,
                idx: idx
              })
            }
          })
          function compositeLinkFn(scope, linkNodes) {
            utils.forEach(linkFns, linkFn => {
              if (linkFn.nodeLinkFn) {
                linkFn.nodeLinkFn(
                  linkFn.childLinkFn,
                  scope,
                  linkNodes[linkFn.idx]
                )
              } else {
                linkFn.childLinkFn(scope, linkNodes[linkFn.idx].childNodes)
              }
            })
          }
          return compositeLinkFn
        }
        function collectDirectives(node, attrs) {
          let match
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
              let isNgAttr = /^ngAttr[A-Z]/.test(normalizedAttrName)
              if (isNgAttr) {
                name = utils.kebabCase(
                  normalizedAttrName[6].toLowerCase() +
                    normalizedAttrName.substring(7)
                )
                normalizedAttrName = directiveNormalize(name.toLowerCase())
                attrs.$attr[normalizedAttrName] = name
              }
              addDirective(
                directives,
                normalizedAttrName,
                'A',
                attrStartName,
                attrEndName
              )
              if (
                isNgAttr ||
                !Object.prototype.hasOwnProperty.call(attrs, normalizedAttrName)
              ) {
                attrs[normalizedAttrName] = attr.value.trim()
                if (isBooleanAttribute(node, normalizedAttrName)) {
                  attrs[normalizedAttrName] = true
                }
              }
            })
            // class directive
            utils.forEach(node.classList, cls => {
              let normalizedClassName = directiveNormalize(cls)
              if (addDirective(directives, normalizedClassName, 'C')) {
                attrs[normalizedClassName] = undefined
              }
            })

            let className = node.className
            if (utils.isString(className) && !utils.isEmpty(className)) {
              while ((match = /([\d\w\-_]+)(?::([^;]+))?;?/.exec(className))) {
                let normalizedClassName = directiveNormalize(match[1])
                if (addDirective(directives, normalizedClassName, 'C')) {
                  attrs[normalizedClassName] = match[2]
                    ? match[2].trim()
                    : undefined
                }
                className = className.substr(match.index + match[0].length)
              }
            }
          } else if (node.nodeType === Node.COMMENT_NODE) {
            match = /^\s*directive:\s*([\d\w\-_]+)\s*(.*)$/.exec(node.nodeValue)
            if (match) {
              let normalizedName = directiveNormalize(match[1])
              if (addDirective(directives, normalizedName, 'M')) {
                attrs[normalizedName] = match[2] ? match[2].trim() : undefined
              }
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
          let match
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
              match = directive
            })
          }
          return match
        }
        function applyDirectivesToNode(directives, compileNode, attrs) {
          let $compileNode = $(compileNode)
          let terminalPriority = -Number.MAX_VALUE
          let terminal = false
          let linkFns = []
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
              let linkFn = directive.compile($compileNode, attrs)
              if (utils.isFunction(linkFn)) {
                linkFns.push(linkFn)
              } else if (linkFn) {
                linkFns.push(linkFn.post)
              }
            }
            if (directive.terminal) {
              terminal = true
              terminalPriority = directive.priority
            }
          })
          function nodeLinkFn(childLinkFn, scope, linkNode) {
            if (childLinkFn) {
              childLinkFn(scope, linkNode.childNodes)
            }
            utils.forEach(linkFns, linkFn => {
              let $element = $(linkNode)
              linkFn(scope, $element, attrs)
            })
          }
          nodeLinkFn.terminal = terminal
          return nodeLinkFn
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
