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
    let match = definition.match(/\s*([@&]|=(\*?))(\??)\s*(\w*)\s*/)
    bindings[scopeName] = {
      mode: match[1][0],
      collection: match[2] === '*',
      optional: match[3],
      attrName: match[4] || scopeName
    }
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
              let directive = $injector.invoke(factory) // 获得我们写的directiveObject对象,并往里面添加其他属性
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
              if (directive.controller) {
                let controller
                if (utils.isString(controller)) {
                  $injector.invoke(controller)
                } else if (utils.isFunction(controller)) {
                  controller()
                }
              }
              directive.$$bindings = parseDirectiveBindings(directive) // 处理上面的scope对象
              directive.name = directive.name || name
              directive.index = i
              return directive
              function parseDirectiveBindings(directive) {
                let bindings = {}
                if (utils.isObject(directive.scope)) {
                  if (directive.bindToController) {
                    bindings.bindToController = parseIsolateBindings(
                      directive.scope
                    )
                  } else {
                    bindings.isolateScope = parseIsolateBindings(
                      directive.scope
                    )
                  }
                }
                return bindings
              }
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
      '$controller',
      '$rootScope',
      '$http',
      function($injector, $parse, $controller, $rootScope, $http) {
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
            // 将scope与dom对应起来
            $compileNodes.data('$scope', $rootScope)
            compositeLinkFn(scope, $compileNodes)
            return $compileNodes
          }
        }
        function compileNodes($compileNodes) {
          /* 形成这样的树结构
          [
            {
              childLinkFn: 
              [
                {childLinkFn: []}
              ]
            },
          ]
          */
          let linkFns = []
          utils.forEach($compileNodes, (node, idx) => {
            let attrs = new Attributes($(node)) // 具体的类来处理,监听
            let directives = collectDirectives(node, attrs) // directives对象的数组
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
              childLinkFn = compileNodes(node.childNodes) // preOrder BFS, 递归对子节点进行处理,
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
                let childScope
                if (linkFn.nodeLinkFn.scope) {
                  childScope = scope.$new()
                  $(node).data('$scope', childScope)
                } else {
                  childScope = scope
                }

                let boundTranscludeFn
                if (linkFn.nodeLinkFn.transcludeOnThisElement) {
                  boundTranscludeFn = function(
                    transcludedScope,
                    containingScope
                  ) {
                    if (!transcludedScope) {
                      transcludedScope = scope.$new(false, containingScope)
                    }
                    return linkFn.nodeLinkFn.transclude(transcludedScope)
                  }
                }

                linkFn.nodeLinkFn(
                  linkFn.childLinkFn,
                  childScope,
                  node,
                  boundTranscludeFn
                )
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
        // 遍历每个指令, 将指令中的compile, controller, terminal等属性一一处理, 同时返回nodeLink函数
        function applyDirectivesToNode(
          directives,
          compileNode,
          attrs,
          previousCompileContext
        ) {
          previousCompileContext = previousCompileContext || {}
          let $compileNode = $(compileNode)
          let terminalPriority = -Number.MAX_VALUE
          let terminal = false
          let preLinkFns = previousCompileContext.preLinkFns || [],
            postLinkFns = previousCompileContext.postLinkFns || [],
            controllers = {}
          let newScopeDirective
          let newIsolateScopeDirective =
            previousCompileContext.newIsolateScopeDirective
          let controllerDirectives = previousCompileContext.controllerDirectives
          let templateDirective = previousCompileContext.templateDirective
          let childTranscludeFn, hasTranscludeDirective

          let nodeLinkFn = function(
            childLinkFn,
            scope,
            linkNode,
            boundTranscludeFn
          ) {
            let $element = $(linkNode)
            let isolateScope
            if (newIsolateScopeDirective) {
              isolateScope = scope.$new(true)
              $element.addClass('ng-isolate-scope')
              $element.data('$isolateScope', isolateScope)
            }

            if (controllerDirectives) {
              utils.forEach(controllerDirectives, directive => {
                let locals = {
                  $scope:
                    directive === newIsolateScopeDirective
                      ? isolateScope
                      : scope,
                  $element: $element,
                  $attrs: attrs
                }
                let controllerName = directive.controller
                if (controllerName === '@') {
                  controllerName = attrs[directive.name]
                }
                let controller = (controllers[directive.name] = $controller(
                  controllerName,
                  locals,
                  true,
                  directive.controllerAs
                ))
                controllers[directive.name] = controller
                $element.data(
                  '$' + directive.name + 'Controller',
                  controller.instance
                )
              })
            }

            if (newIsolateScopeDirective) {
              initializeDirectiveBindings(
                scope,
                attrs,
                isolateScope,
                newIsolateScopeDirective.$$bindings.isolateScope,
                isolateScope
              )
            }
            if (
              newIsolateScopeDirective &&
              controllers[newIsolateScopeDirective.name]
            ) {
              initializeDirectiveBindings(
                scope,
                attrs,
                controllers[newIsolateScopeDirective.name].instance,
                newIsolateScopeDirective.$$bindings.bindToController,
                isolateScope
              )
            }
            function initializeDirectiveBindings(
              scope,
              attrs,
              destination,
              bindings,
              newScope
            ) {
              utils.forEach(bindings, (definition, scopeName) => {
                let attrName = definition.attrName
                switch (definition.mode) {
                  case '@':
                    attrs.$observe(attrName, newAttrValue => {
                      destination[scopeName] = newAttrValue
                    })
                    if (attrs[attrName]) {
                      destination[scopeName] = attrs[attrName]
                    }
                    break
                  case '=': {
                    if (definition.optional && !attrs[attrName]) {
                      break
                    }
                    let parentGet = $parse(attrs[attrName])
                    let lastValue = (destination[scopeName] = parentGet(scope))
                    let parentValueWatch = function() {
                      let parentValue = parentGet(scope)
                      if (destination[scopeName] !== parentValue) {
                        if (parentValue !== lastValue) {
                          destination[scopeName] = parentValue
                        } else {
                          parentValue = destination[scopeName]
                          parentGet.assign(scope, parentValue)
                        }
                      }
                      lastValue = parentValue
                      return lastValue
                    }
                    let unwatch
                    if (definition.collection) {
                      unwatch = scope.$watchCollection(
                        attrs[attrName],
                        parentValueWatch
                      )
                    } else {
                      unwatch = scope.$watch(parentValueWatch)
                    }
                    newScope.$on('$destroy', unwatch)
                    break
                  }
                  case '&': {
                    let parentExpr = $parse(attrs[attrName])
                    if (parentExpr === utils.noop && definition.optional) {
                      break
                    }
                    destination[scopeName] = function(locals) {
                      return parentExpr(scope, locals)
                    }
                    break
                  }
                }
              })
            }
            utils.forEach(controllers, controller => {
              controller()
            })

            function scopeBoundTranscludeFn(transcludedScope) {
              return boundTranscludeFn(transcludedScope, scope)
            }

            utils.forEach(preLinkFns, linkFn => {
              linkFn(
                linkFn.isolateScope ? isolateScope : scope,
                $element,
                attrs,
                linkFn.require && getControllers(linkFn.require, $element),
                scopeBoundTranscludeFn
              )
            })

            if (childLinkFn) {
              let scopeToChild = scope
              if (
                newIsolateScopeDirective &&
                newIsolateScopeDirective.template
              ) {
                scopeToChild = isolateScope
              }
              childLinkFn(scopeToChild, linkNode.childNodes)
            }

            utils.forEachRight(postLinkFns, linkFn => {
              linkFn(
                linkFn.isolateScope ? isolateScope : scope,
                $element,
                attrs,
                linkFn.require && getControllers(linkFn.require, $element),
                scopeBoundTranscludeFn
              )
            })
          }

          for (let [i, directive] of directives.entries()) {
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
              // 有scope的话证明是isolateScope
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

            if (directive.controller) {
              controllerDirectives = controllerDirectives || {}
              controllerDirectives[directive.name] = directive
            }

            if (directive.transclude) {
              if (hasTranscludeDirective) {
                throw 'Multiple directives asking for transclude'
              }
              hasTranscludeDirective = true
              let $transcludedNodes = $compileNode.clone().contents()
              childTranscludeFn = compile($transcludedNodes)
              $compileNode.empty()
            }

            if (directive.template) {
              if (templateDirective) {
                throw new Error('Multiple directives asking for template')
              }
              templateDirective = directive
              $compileNode.html(
                utils.isFunction(directive.template)
                  ? directive.template($compileNode, attrs)
                  : directive.template
              )
            }
            if (directive.templateUrl) {
              if (templateDirective) {
                throw new Error('Multiple directives asking for template')
              }
              templateDirective = directive
              nodeLinkFn = compileTemplateUrl(
                utils.drop(directives, i),
                $compileNode,
                attrs,
                {
                  templateDirective,
                  newIsolateScopeDirective,
                  controllerDirectives,
                  preLinkFns,
                  postLinkFns
                }
              )
              return nodeLinkFn
            } else if (directive.compile) {
              let linkFn = directive.compile($compileNode, attrs)
              let isolateScope = directive === newIsolateScopeDirective
              let attrStart = directive.$$start
              let attrEnd = directive.$$end
              let require = directive.require || (directive.controller && name)
              if (utils.isFunction(linkFn)) {
                addLinkFns(
                  null,
                  linkFn,
                  attrStart,
                  attrEnd,
                  isolateScope,
                  require
                )
              } else if (linkFn) {
                addLinkFns(
                  linkFn.pre,
                  linkFn.post,
                  attrStart,
                  attrEnd,
                  isolateScope,
                  require
                )
              }
            }

            if (directive.terminal) {
              terminal = true
              terminalPriority = directive.priority
            }
          }
          nodeLinkFn.terminal = terminal
          nodeLinkFn.scope = newScopeDirective && newScopeDirective.scope
          nodeLinkFn.transcludeOnThisElement = hasTranscludeDirective
          nodeLinkFn.transclude = childTranscludeFn
          return nodeLinkFn

          function addLinkFns(
            preLinkFn,
            postLinkFn,
            attrStart,
            attrEnd,
            isolateScope,
            require
          ) {
            if (preLinkFn) {
              if (attrStart) {
                preLinkFn = groupElementsLinkFnWrapper(
                  preLinkFn,
                  attrStart,
                  attrEnd,
                  require
                )
              }
              preLinkFn.isolateScope = isolateScope
              preLinkFn.require = require
              preLinkFns.push(preLinkFn)
            }
            if (postLinkFn) {
              if (attrStart) {
                postLinkFn = groupElementsLinkFnWrapper(
                  postLinkFn,
                  attrStart,
                  attrEnd,
                  require
                )
              }
              postLinkFn.isolateScope = isolateScope
              postLinkFn.require = require
              postLinkFns.push(postLinkFn)
            }
          }
          function groupElementsLinkFnWrapper(linkFn, attrStart, attrEnd) {
            return function(scope, element, attrs, ctrl) {
              let group = groupScan(element[0], attrStart, attrEnd)
              return linkFn(scope, group, attrs, ctrl)
            }
          }
          function getControllers(require, $element) {
            if (utils.isArray(require)) {
              return require.map(getControllers)
            } else {
              let value
              let match = require.match(/^(\^\^?)?(\?)?(\^\^?)?/)
              let optional = match[2]
              require = require.substring(match[0].length)
              if (match[1] || match[3]) {
                if (match[3] && !match[1]) {
                  match[1] = match[3]
                }
                if (match[1] === '^^') {
                  $element = $element.parent()
                }
                while ($element.length) {
                  value = $element.data('$' + require + 'Controller')
                  if (value) {
                    break
                  } else {
                    $element = $element.parent()
                  }
                }
              } else {
                if (controllers[require]) {
                  value = controllers[require].instance
                }
              }
              if (!value && !optional) {
                throw 'Controller ' +
                  require +
                  ' required by directive, cannot be found'
              }
              return value || null
            }
          }
        }
        function compileTemplateUrl(
          directives,
          $compileNode,
          attrs,
          previousCompileContext
        ) {
          let oriAsyncDirective = directives[0]
          let templateUrl = utils.isFunction(oriAsyncDirective.templateUrl)
            ? oriAsyncDirective.templateUrl($compileNode, attrs)
            : oriAsyncDirective.templateUrl
          let afterTemplateNodeLinkFn, afterTemplateChildLinkFn
          let linkQueue = []
          $compileNode.empty()
          // 递归中断如何保存上下文
          $http.get(templateUrl).success(template => {
            delete oriAsyncDirective.templateUrl
            $compileNode.html(template)
            afterTemplateNodeLinkFn = applyDirectivesToNode(
              directives,
              $compileNode,
              attrs,
              previousCompileContext
            )
            afterTemplateChildLinkFn = compileNodes($compileNode[0].childNodes)
            utils.forEach(linkQueue, linkCall => {
              afterTemplateNodeLinkFn(
                afterTemplateChildLinkFn,
                linkCall.scope,
                linkCall.linkNode
              )
            })
            linkQueue = null
          })
          return function delayedNodeLinkFn(
            _ignoreChildLinkFn, // 前面已经调用empty()清空了子节点
            scope,
            linkNode
          ) {
            if (linkQueue) {
              // 模板还没拿回来
              linkQueue.push({ scope, linkNode: linkNode })
            } else {
              afterTemplateNodeLinkFn(afterTemplateChildLinkFn, scope, linkNode)
            }
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
