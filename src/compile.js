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
function parseIsolateBindings(scope) {
  let bindings = {}
  utils.forEach(scope, (definition, scopeName) => {
    let match = definition.match(/\s*([@=])\s*(\w*)\s*/)
    bindings[scopeName] = { mode: match[1], attrName: match[2] || scopeName }
  })
  return bindings
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
            return utils.map(factories, (factory, i) => {
              let directive = $injector.invoke(factory)
              directive.restrict = directive.restrict || 'EA'
              directive.priority = directive.priority || 0
              if (directive.link && !directive.compile) {
                directive.compile = () => directive.link
              }
              if (utils.isObject(directive.scope)) {
                directive.$$isolateBindings = parseIsolateBindings(
                  directive.scope
                )
              }
              directive.name = directive.name || name
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
      '$parse',
      '$rootScope',
      function($injector, $parse, $rootScope) {
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
            if (nodeLinkFn && nodeLinkFn.scope) {
              attrs.$$element.addClass('ng-scope')
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
            let stableNodeList = []
            utils.forEach(linkFns, linkFn => {
              let nodeIdx = linkFn.idx

              stableNodeList[nodeIdx] = linkNodes[nodeIdx]
            })
            utils.forEach(linkFns, linkFn => {
              let node = stableNodeList[linkFn.idx]
              if (linkFn.nodeLinkFn) {
                if (linkFn.nodeLinkFn.scope) {
                  scope = scope.$new(true)
                  $(node).data('$scope', scope)
                }
                linkFn.nodeLinkFn(linkFn.childLinkFn, scope, node)
              } else {
                linkFn.childLinkFn(scope, node.childNodes)
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
          let preLinkFns = [],
            postLinkFns = []
          let newScopeDirective, newIsolateScopeDirective

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

            if (directive.scope) {
              if (utils.isObject(directive.scope)) {
                if (newIsolateScopeDirective || newScopeDirective) {
                  throw 'Multiple directives asking for new/inherited scope'
                }
                newIsolateScopeDirective = directive
              } else {
                if (newIsolateScopeDirective) {
                  throw 'Multiple directives asking for new/inherited scope'
                }
                newScopeDirective = newScopeDirective || directive
              }
            }

            if (directive.compile) {
              let linkFn = directive.compile($compileNode, attrs)
              let isolateScope = directive === newIsolateScopeDirective
              let attrStart = directive.$$start
              let attrEnd = directive.$$end
              if (utils.isFunction(linkFn)) {
                addLinkFns(null, linkFn, attrStart, attrEnd, isolateScope)
              } else if (linkFn) {
                addLinkFns(
                  linkFn.pre,
                  linkFn.post,
                  attrStart,
                  attrEnd,
                  isolateScope
                )
              }
            }

            if (directive.terminal) {
              terminal = true
              terminalPriority = directive.priority
            }
          })
          nodeLinkFn.terminal = terminal
          nodeLinkFn.scope = newScopeDirective && newScopeDirective.scope
          return nodeLinkFn

          function addLinkFns(
            preLinkFn,
            postLinkFn,
            attrStart,
            attrEnd,
            isolateScope
          ) {
            if (preLinkFn) {
              if (attrStart) {
                preLinkFn = groupElementsLinkFnWrapper(
                  preLinkFn,
                  attrStart,
                  attrEnd
                )
              }
              preLinkFn.isolateScope = isolateScope
              preLinkFns.push(preLinkFn)
            }
            if (postLinkFn) {
              if (attrStart) {
                postLinkFn = groupElementsLinkFnWrapper(
                  postLinkFn,
                  attrStart,
                  attrEnd
                )
              }
              postLinkFn.isolateScope = isolateScope
              postLinkFns.push(postLinkFn)
            }
          }
          function groupElementsLinkFnWrapper(linkFn, attrStart, attrEnd) {
            return function(scope, element, attrs) {
              let group = groupScan(element[0], attrStart, attrEnd)
              return linkFn(scope, group, attrs)
            }
          }
          function nodeLinkFn(childLinkFn, scope, linkNode) {
            let $element = $(linkNode)
            let isolateScope
            if (newIsolateScopeDirective) {
              isolateScope = scope.$new(true)
              $element.addClass('ng-isolate-scope')
              $element.data('$isolateScope', isolateScope)
              utils.forEach(
                newIsolateScopeDirective.$$isolateBindings,
                (definition, scopeName) => {
                  let attrName = definition.attrName
                  switch (definition.mode) {
                    case '@':
                      attrs.$observe(attrName, newAttrValue => {
                        isolateScope[scopeName] = newAttrValue
                      })
                      if (attrs[attrName]) {
                        isolateScope[scopeName] = attrs[attrName]
                      }
                      break
                    case '=': {
                      let parentGet = $parse(attrs[attrName])
                      isolateScope[scopeName] = parentGet(scope)
                      scope.$watch(parentGet, newValue => {
                        isolateScope[scopeName] = newValue
                      })
                      break
                    }
                  }
                }
              )
            }
            utils.forEach(preLinkFns, linkFn => {
              linkFn(
                linkFn.isolateScope ? isolateScope : scope,
                $element,
                attrs
              )
            })

            if (childLinkFn) {
              childLinkFn(scope, linkNode.childNodes)
            }
            utils.forEachRight(postLinkFns, linkFn => {
              linkFn(
                linkFn.isolateScope ? isolateScope : scope,
                $element,
                attrs
              )
            })
          }
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
