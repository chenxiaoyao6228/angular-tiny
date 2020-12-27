import { publishExternalAPI } from '../src/angular_public'
import { createInjector } from '../src/injector'
import utils from '../src/utils'
import $ from 'jquery'
const sinon = require('sinon')

function makeInjectorWithDirectives(...args) {
  return createInjector([
    'ng',
    function($compileProvider) {
      $compileProvider.directive.apply($compileProvider, args)
    }
  ])
}
function makeInjectorWithComponent(name, options) {
  return createInjector([
    'ng',
    function($compileProvider) {
      $compileProvider.component(name, options)
    }
  ])
}

describe('$compile', () => {
  beforeEach(() => {
    delete window.angular
    publishExternalAPI()
  })
  it('allows creating directives', () => {
    let myModule = window.angular.module('myModule', [])
    myModule.directive('testing', () => {})
    let injector = createInjector(['ng', 'myModule'])
    expect(injector.has('testingDirective')).toBe(true)
  })
  it('allows creating many directives with the same name', () => {
    let myModule = window.angular.module('myModule', [])
    myModule.directive('testing', () => ({ d: 'one' }))
    myModule.directive('testing', () => ({ d: 'two' }))
    let injector = createInjector(['ng', 'myModule'])
    let result = injector.get('testingDirective')
    expect(result.length).toBe(2)
    expect(result[0].d).toEqual('one')
    expect(result[1].d).toEqual('two')
  })
  it('does not allow a directive called hasOwnProperty', () => {
    let myModule = window.angular.module('myModule', [])
    myModule.directive('hasOwnProperty', () => {})
    expect(() => {
      createInjector(['ng', 'myModule'])
    }).toThrow()
  })
  it('allows creating directives with object notation', () => {
    let myModule = window.angular.module('myModule', [])
    myModule.directive({ a: function() {}, b: function() {}, c: function() {} })
    let injector = createInjector(['ng', 'myModule'])
    expect(injector.has('aDirective')).toBe(true)
    expect(injector.has('bDirective')).toBe(true)
    expect(injector.has('cDirective')).toBe(true)
  })
  it('compiles element directives from a single element', () => {
    let injector = makeInjectorWithDirectives('myDirective', () => {
      return {
        restrict: 'EACM',
        compile: function(element) {
          element.data('hasCompiled', true)
        }
      }
    })

    injector.invoke($compile => {
      let el = $('<my-directive></my-directive>')
      $compile(el)
      expect(el.data('hasCompiled')).toBe(true)
    })
  })
  it('compiles element directives found from several elements', () => {
    let idx = 1
    let injector = makeInjectorWithDirectives('myDirective', () => {
      return {
        restrict: 'EACM',
        compile: function(element) {
          element.data('hasCompiled', idx++)
        }
      }
    })
    injector.invoke($compile => {
      let el = $('<my-directive></my-directive><my-directive></my-directive>')
      $compile(el)
      expect(el.eq(0).data('hasCompiled')).toBe(1)
      expect(el.eq(1).data('hasCompiled')).toBe(2)
    })
  })
  it('compiles element directives from child elements', () => {
    let idx = 1
    let injector = makeInjectorWithDirectives('myDirective', () => {
      return {
        restrict: 'EACM',
        compile: function(element) {
          element.data('hasCompiled', idx++)
        }
      }
    })
    injector.invoke($compile => {
      let el = $('<div><my-directive></my-directive></div>')
      $compile(el)
      expect(el.data('hasCompiled')).toBeUndefined()
      expect(el.find('> my-directive').data('hasCompiled')).toBe(1)
    })
  })
  it('compiles nested directives', () => {
    let idx = 1
    let injector = makeInjectorWithDirectives('myDir', () => {
      return {
        restrict: 'EACM',
        compile: function(element) {
          element.data('hasCompiled', idx++)
        }
      }
    })
    injector.invoke($compile => {
      let el = $('<my-dir><my-dir><my-dir/></my-dir></my-dir>')
      $compile(el)
      expect(el.data('hasCompiled')).toBe(1)
      expect(el.find('> my-dir').data('hasCompiled')).toBe(2)
      expect(el.find('> my-dir > my-dir').data('hasCompiled')).toBe(3)
    })
  })
  utils.forEach(['x', 'data'], prefix => {
    utils.forEach([':', '-', '_'], delim => {
      it(
        'compiles element directives with ' + prefix + delim + ' prefix',
        () => {
          let injector = makeInjectorWithDirectives('myDir', () => {
            return {
              restrict: 'EACM',
              compile: function(element) {
                element.data('hasCompiled', true)
              }
            }
          })
          injector.invoke($compile => {
            let el = $(
              '<' + prefix + delim + 'my-dir></' + prefix + delim + 'my-dir>'
            )
            $compile(el)
            expect(el.data('hasCompiled')).toBe(true)
          })
        }
      )
    })
  })
  it('compiles attribute directives', () => {
    let injector = makeInjectorWithDirectives('myDirective', () => {
      return {
        restrict: 'EACM',
        compile: function(element) {
          element.data('hasCompiled', true)
        }
      }
    })
    injector.invoke($compile => {
      let el = $('<div my-directive></div>')
      $compile(el)
      expect(el.data('hasCompiled')).toBe(true)
    })
  })
  it('compiles attribute directives with prefixes', () => {
    let injector = makeInjectorWithDirectives('myDirective', () => {
      return {
        restrict: 'EACM',
        compile: function(element) {
          element.data('hasCompiled', true)
        }
      }
    })
    injector.invoke($compile => {
      let el = $('<div x:my-directive></div>')
      $compile(el)
      expect(el.data('hasCompiled')).toBe(true)
    })
  })
  it('compiles several attribute directives in an element', () => {
    let injector = makeInjectorWithDirectives({
      myDirective: function() {
        return {
          restrict: 'EACM',
          compile: function(element) {
            element.data('hasCompiled', true)
          }
        }
      },
      mySecondDirective: function() {
        return {
          restrict: 'EACM',
          compile: function(element) {
            element.data('secondCompiled', true)
          }
        }
      }
    })
    injector.invoke($compile => {
      let el = $('<div my-directive my-second-directive></div>')
      $compile(el)
      expect(el.data('hasCompiled')).toBe(true)
      expect(el.data('secondCompiled')).toBe(true)
    })
  })
  it('compiles both element and attributes directives in an element', () => {
    let injector = makeInjectorWithDirectives({
      myDirective: function() {
        return {
          restrict: 'EACM',
          compile: function(element) {
            element.data('hasCompiled', true)
          }
        }
      },
      mySecondDirective: function() {
        return {
          restrict: 'EACM',
          compile: function(element) {
            element.data('secondCompiled', true)
          }
        }
      }
    })
    injector.invoke($compile => {
      let el = $('<my-directive my-second-directive></my-directive>')
      $compile(el)
      expect(el.data('hasCompiled')).toBe(true)
      expect(el.data('secondCompiled')).toBe(true)
    })
  })
  it('compiles attribute directives with ng-attr prefix', () => {
    let injector = makeInjectorWithDirectives('myDirective', () => {
      return {
        restrict: 'EACM',
        compile: function(element) {
          element.data('hasCompiled', true)
        }
      }
    })
    injector.invoke($compile => {
      let el = $('<div ng-attr-my-directive></div>')
      $compile(el)
      expect(el.data('hasCompiled')).toBe(true)
    })
  })
  it('compiles attribute directives with data:ng-attr prefix', () => {
    let injector = makeInjectorWithDirectives('myDirective', () => {
      return {
        restrict: 'EACM',
        compile: function(element) {
          element.data('hasCompiled', true)
        }
      }
    })
    injector.invoke($compile => {
      let el = $('<div data:ng-attr-my-directive></div>')
      $compile(el)
      expect(el.data('hasCompiled')).toBe(true)
    })
  })
  it('compiles class directives', () => {
    let injector = makeInjectorWithDirectives('myDirective', () => {
      return {
        restrict: 'EACM',
        compile: function(element) {
          element.data('hasCompiled', true)
        }
      }
    })
    injector.invoke($compile => {
      let el = $('<div class="my-directive"></div>')
      $compile(el)
      expect(el.data('hasCompiled')).toBe(true)
    })
  })
  it('compiles several class directives in an element', () => {
    let injector = makeInjectorWithDirectives({
      myDirective: function() {
        return {
          restrict: 'EACM',
          compile: function(element) {
            element.data('hasCompiled', true)
          }
        }
      },
      mySecondDirective: function() {
        return {
          restrict: 'EACM',
          compile: function(element) {
            element.data('secondCompiled', true)
          }
        }
      }
    })
    injector.invoke($compile => {
      let el = $('<div class="my-directive my-second-directive"></div>')
      $compile(el)
      expect(el.data('hasCompiled')).toBe(true)
      expect(el.data('secondCompiled')).toBe(true)
    })
  })
  it('compiles class directives with prefixes', () => {
    let injector = makeInjectorWithDirectives('myDirective', () => {
      return {
        restrict: 'EACM',
        compile: function(element) {
          element.data('hasCompiled', true)
        }
      }
    })
    injector.invoke($compile => {
      let el = $('<div class="x-my-directive"></div>')
      $compile(el)
      expect(el.data('hasCompiled')).toBe(true)
    })
  })
  it('compiles comment directives', () => {
    let hasCompiled
    let injector = makeInjectorWithDirectives('myDirective', () => {
      return {
        restrict: 'M',
        compile: function() {
          hasCompiled = true
        }
      }
    })
    injector.invoke($compile => {
      let el = $('<!-- directive: my-directive -->')
      $compile(el)
      expect(hasCompiled).toBe(true)
    })
  })
  utils.forEach(
    {
      E: { element: true, attribute: false, class: false, comment: false },
      A: { element: false, attribute: true, class: false, comment: false },
      C: { element: false, attribute: false, class: true, comment: false },
      M: { element: false, attribute: false, class: false, comment: true },
      EA: { element: true, attribute: true, class: false, comment: false },
      AC: { element: false, attribute: true, class: true, comment: false },
      EAM: { element: true, attribute: true, class: false, comment: true },
      EACM: { element: true, attribute: true, class: true, comment: true }
    },
    (expected, restrict) => {
      describe('restricted to ' + restrict, () => {
        utils.forEach(
          {
            element: '<my-directive></my-directive>',
            attribute: '<div my-directive></div>',
            class: '<div class="my-directive"></div>',
            comment: '<!-- directive: my-directive -->'
          },
          (dom, type) => {
            it(
              (expected[type] ? 'matches' : 'does not match') + ' on ' + type,
              () => {
                let hasCompiled = false
                let injector = makeInjectorWithDirectives('myDirective', () => {
                  return {
                    restrict: restrict,
                    compile: function() {
                      hasCompiled = true
                    }
                  }
                })
                injector.invoke($compile => {
                  let el = $(dom)
                  $compile(el)
                  expect(hasCompiled).toBe(expected[type])
                })
              }
            )
          }
        )
      })
    }
  )
  it('applies in priority order', () => {
    let compilations = []
    let injector = makeInjectorWithDirectives({
      lowerDirective: function() {
        return {
          priority: 1,
          compile: function() {
            compilations.push('lower')
          }
        }
      },
      higherDirective: function() {
        return {
          priority: 2,
          compile: function() {
            compilations.push('higher')
          }
        }
      }
    })
    injector.invoke($compile => {
      let el = $('<div lower-directive higher-directive></div>')
      $compile(el)
      expect(compilations).toEqual(['higher', 'lower'])
    })
  })
  it('applies in registration order when names are the same', () => {
    let compilations = []
    let myModule = window.angular.module('myModule', [])
    myModule.directive('aDirective', () => {
      return {
        priority: 1,
        compile: function() {
          compilations.push('first')
        }
      }
    })
    myModule.directive('aDirective', () => {
      return {
        priority: 1,
        compile: function() {
          compilations.push('second')
        }
      }
    })
    let injector = createInjector(['ng', 'myModule'])
    injector.invoke($compile => {
      let el = $('<div a-directive></div>')
      $compile(el)
      expect(compilations).toEqual(['first', 'second'])
    })
  })
  it('uses default priority when one not given', () => {
    let compilations = []
    let myModule = window.angular.module('myModule', [])
    myModule.directive('firstDirective', () => {
      return {
        priority: 1,
        compile: function() {
          compilations.push('first')
        }
      }
    })
    myModule.directive('secondDirective', () => {
      return {
        compile: function() {
          compilations.push('second')
        }
      }
    })
    let injector = createInjector(['ng', 'myModule'])
    injector.invoke($compile => {
      let el = $('<div second-directive first-directive></div>')
      $compile(el)
      expect(compilations).toEqual(['first', 'second'])
    })
  })
  it('stops compiling at a terminal directive', () => {
    let compilations = []
    let myModule = window.angular.module('myModule', [])
    myModule.directive('firstDirective', () => {
      return {
        priority: 1,
        terminal: true,
        compile: function() {
          compilations.push('first')
        }
      }
    })
    myModule.directive('secondDirective', () => {
      return {
        priority: 0,
        compile: function() {
          compilations.push('second')
        }
      }
    })
    let injector = createInjector(['ng', 'myModule'])
    injector.invoke($compile => {
      let el = $('<div first-directive second-directive></div>')
      $compile(el)
      expect(compilations).toEqual(['first'])
    })
  })
  it('still compiles directives with same priority after terminal', () => {
    let compilations = []
    let myModule = window.angular.module('myModule', [])
    myModule.directive('firstDirective', () => {
      return {
        priority: 1,
        terminal: true,
        compile: function() {
          compilations.push('first')
        }
      }
    })
    myModule.directive('secondDirective', () => {
      return {
        priority: 1,
        compile: function() {
          compilations.push('second')
        }
      }
    })
    let injector = createInjector(['ng', 'myModule'])
    injector.invoke($compile => {
      let el = $('<div first-directive second-directive></div>')
      $compile(el)
      expect(compilations).toEqual(['first', 'second'])
    })
  })
  it('stops child compilation after a terminal directive', () => {
    let compilations = []
    let myModule = window.angular.module('myModule', [])
    myModule.directive('parentDirective', () => {
      return {
        terminal: true,
        compile: function() {
          compilations.push('parent')
        }
      }
    })
    myModule.directive('childDirective', () => {
      return {
        compile: function() {
          compilations.push('child')
        }
      }
    })
    let injector = createInjector(['ng', 'myModule'])
    injector.invoke($compile => {
      let el = $('<div parent-directive><div child-directive></div></div>')
      $compile(el)
      expect(compilations).toEqual(['parent'])
    })
  })
  it('allows applying a directive to multiple elements', () => {
    let compileEl = false
    let injector = makeInjectorWithDirectives('myDir', () => {
      return {
        multiElement: true,
        compile: function(element) {
          compileEl = element
        }
      }
    })
    injector.invoke($compile => {
      let el = $(`<div my-dir-start></div><span></span><div my-dir-end></div>`)
      $compile(el)
      expect(compileEl.length).toBe(3)
    })
  })
  describe('attributes', () => {
    function registerAndCompile(dirName, domString, callback) {
      let givenAttrs
      let injector = makeInjectorWithDirectives(dirName, () => {
        return {
          restrict: 'EACM',
          compile: function(element, attrs) {
            givenAttrs = attrs
          }
        }
      })
      injector.invoke(($compile, $rootScope) => {
        let el = $(domString)
        $compile(el)
        callback(el, givenAttrs, $rootScope)
      })
    }
    it('passes the element attributes to the compile function', () => {
      registerAndCompile(
        'myDirective',
        '<my-directive my-attr="1" my-other-attr="two"></my-directive>',
        (element, attrs) => {
          expect(attrs.myAttr).toEqual('1')
          expect(attrs.myOtherAttr).toEqual('two')
        }
      )
    })
    it('trims attribute values', () => {
      registerAndCompile(
        'myDirective',
        '<my-directive my-attr=" val "></my-directive>',
        (element, attrs) => {
          expect(attrs.myAttr).toEqual('val')
        }
      )
    })
    it('sets the value of boolean attributes to true', () => {
      registerAndCompile(
        'myDirective',
        '<input my-directive disabled>',
        (element, attrs) => {
          expect(attrs.disabled).toBe(true)
        }
      )
    })
    it('does not set the value of custom boolean attributes to true', () => {
      registerAndCompile(
        'myDirective',
        '<input my-directive whatever>',
        (element, attrs) => {
          expect(attrs.whatever).toEqual('')
        }
      )
    })
    it('overrides attributes with ng-attr- versions', () => {
      registerAndCompile(
        'myDirective',
        '<input my-directive ng-attr-whatever="42" whatever="41">',
        (element, attrs) => {
          expect(attrs.whatever).toEqual('42')
        }
      )
    })
    it('allows setting attributes', () => {
      registerAndCompile(
        'myDirective',
        '<my-directive attr="true"></my-directive>',
        (element, attrs) => {
          attrs.$set('attr', 'false')
          expect(attrs.attr).toEqual('false')
        }
      )
    })
    it('does not set attributes to DOM when flag is false', () => {
      registerAndCompile(
        'myDirective',
        '<my-directive attr="true"></my-directive>',
        (element, attrs) => {
          attrs.$set('attr', 'false', false)
          expect(element.attr('attr')).toEqual('true')
        }
      )
    })
    it('sets prop for boolean attributes', () => {
      registerAndCompile(
        'myDirective',
        '<input my-directive>',
        (element, attrs) => {
          attrs.$set('disabled', true)
          expect(element.prop('disabled')).toBe(true)
        }
      )
    })
    it('sets prop for boolean attributes even when not flushing', () => {
      registerAndCompile(
        'myDirective',
        '<input my-directive>',
        (element, attrs) => {
          attrs.$set('disabled', true, false)
          expect(element.prop('disabled')).toBe(true)
        }
      )
    })
    it('denormalizes attribute name when explicitly given', () => {
      registerAndCompile(
        'myDirective',
        '<my-directive some-attribute="42"></my-directive>',
        (element, attrs) => {
          attrs.$set('someAttribute', 43, true, 'some-attribute')
          expect(element.attr('some-attribute')).toEqual('43')
        }
      )
    })
    it('denormalizes attribute by snake-casing', () => {
      registerAndCompile(
        'myDirective',
        '<my-directive some-attribute="42"></my-directive>',
        (element, attrs) => {
          attrs.$set('someAttribute', 43)
          expect(element.attr('some-attribute')).toEqual('43')
        }
      )
    })
    it('does not use ng-attr- prefix in denormalized names', () => {
      registerAndCompile(
        'myDirective',
        '<my-directive ng-attr-some-attribute="42"></my-directive>',
        (element, attrs) => {
          attrs.$set('someAttribute', 43)
          expect(element.attr('some-attribute')).toEqual('43')
        }
      )
    })
    it('uses new attribute name after once given', () => {
      registerAndCompile(
        'myDirective',
        '<my-directive x-some-attribute="42"></my-directive>',
        (element, attrs) => {
          attrs.$set('someAttribute', 43, true, 'some-attribute')
          attrs.$set('someAttribute', 44)
          expect(element.attr('some-attribute')).toEqual('44')
          expect(element.attr('x-some-attribute')).toEqual('42')
        }
      )
    })
    it('calls observer immediately when attribute is $set', () => {
      registerAndCompile(
        'myDirective',
        '<my-directive some-attribute="42"></my-directive>',
        (element, attrs) => {
          let gotValue
          attrs.$observe('someAttribute', value => {
            gotValue = value
          })
          attrs.$set('someAttribute', '43')
          expect(gotValue).toEqual('43')
        }
      )
    })
    it('calls observer on next $digest after registration', () => {
      registerAndCompile(
        'myDirective',
        '<my-directive some-attribute="42"></my-directive>',
        (element, attrs, $rootScope) => {
          let gotValue
          attrs.$observe('someAttribute', value => {
            gotValue = value
          })
          $rootScope.$digest()
          expect(gotValue).toEqual('42')
        }
      )
    })
    it('lets observers be deregistered', () => {
      registerAndCompile(
        'myDirective',
        '<my-directive some-attribute="42"></my-directive>',
        (element, attrs) => {
          let gotValue
          let remove = attrs.$observe('someAttribute', value => {
            gotValue = value
          })
          attrs.$set('someAttribute', '43')
          expect(gotValue).toEqual('43')
          remove()
          attrs.$set('someAttribute', '44')
          expect(gotValue).toEqual('43')
        }
      )
    })
    it('adds an attribute from a class directive', () => {
      registerAndCompile(
        'myDirective',
        '<div class="my-directive"></div>',
        (element, attrs) => {
          expect(
            Object.prototype.hasOwnProperty.call(attrs, 'myDirective')
          ).toBe(true)
        }
      )
    })
    it('does not add attribute from class without a directive', () => {
      registerAndCompile(
        'myDirective',
        '<my-directive class="some-class"></my-directive>',
        (element, attrs) => {
          expect(Object.prototype.hasOwnProperty.call(attrs, 'someClass')).toBe(
            false
          )
        }
      )
    })
    it('supports values for class directive attributes', () => {
      registerAndCompile(
        'myDirective',
        '<div class="my-directive: my attribute value"></div>',
        (element, attrs) => {
          expect(attrs.myDirective).toEqual('my attribute value')
        }
      )
    })
    it('terminates class directive attribute value at semicolon', () => {
      registerAndCompile(
        'myDirective',
        '<div class="my-directive: my attribute value; some-other-class"></div>',
        (element, attrs) => {
          expect(attrs.myDirective).toEqual('my attribute value')
        }
      )
    })
    it('adds an attribute with a value from a comment directive', () => {
      registerAndCompile(
        'myDirective',
        '<!-- directive: my-directive and the attribute value -->',
        (element, attrs) => {
          expect(
            Object.prototype.hasOwnProperty.call(attrs, 'myDirective')
          ).toBe(true)
          expect(attrs.myDirective).toEqual('and the attribute value')
        }
      )
    })
    it('allows adding classes', () => {
      registerAndCompile(
        'myDirective',
        '<my-directive></my-directive>',
        (element, attrs) => {
          attrs.$addClass('some-class')
          expect(element.hasClass('some-class')).toBe(true)
        }
      )
    })
    it('allows removing classes', () => {
      registerAndCompile(
        'myDirective',
        '<my-directive class="some-class"></my-directive>',
        (element, attrs) => {
          attrs.$removeClass('some-class')
          expect(element.hasClass('some-class')).toBe(false)
        }
      )
    })
    it('allows updating classes', () => {
      registerAndCompile(
        'myDirective',
        '<my-directive class="one three four"></my-directive>',
        (element, attrs) => {
          attrs.$updateClass('one two three', 'one three four')
          expect(element.hasClass('one')).toBe(true)
          expect(element.hasClass('two')).toBe(true)
          expect(element.hasClass('three')).toBe(true)
          expect(element.hasClass('four')).toBe(false)
        }
      )
    })
    it('returns a public link function from compile', () => {
      let injector = makeInjectorWithDirectives('myDirective', () => {
        return { compile: () => {} }
      })
      injector.invoke($compile => {
        let el = $('<div my-directive></div>')
        let linkFn = $compile(el)
        expect(linkFn).toBeDefined()
        expect(utils.isFunction(linkFn)).toBe(true)
      })
    })
  })
  describe('linking', () => {
    it('takes a scope and attaches it to elements', () => {
      let injector = makeInjectorWithDirectives('myDirective', () => {
        return { compile: () => {} }
      })
      injector.invoke(($compile, $rootScope) => {
        let el = $('<div my-directive></div>')
        $compile(el)($rootScope)
        expect(el.data('$scope')).toBe($rootScope)
      })
    })
  })
  it('calls directive link function with scope', () => {
    let givenScope, givenElement, givenAttrs
    let injector = makeInjectorWithDirectives('myDirective', () => {
      return {
        compile: function() {
          return function link(scope, element, attrs) {
            givenScope = scope
            givenElement = element
            givenAttrs = attrs
          }
        }
      }
    })
    injector.invoke(($compile, $rootScope) => {
      let el = $('<div my-directive></div>')
      $compile(el)($rootScope)
      expect(givenScope).toBe($rootScope)
      expect(givenElement[0]).toBe(el[0])
      expect(givenAttrs).toBeDefined()
      expect(givenAttrs.myDirective).toBeDefined()
    })
  })
  it('supports link function in directive definition object', () => {
    let givenScope, givenElement, givenAttrs
    let injector = makeInjectorWithDirectives('myDirective', () => {
      return {
        link: function(scope, element, attrs) {
          givenScope = scope
          givenElement = element
          givenAttrs = attrs
        }
      }
    })
    injector.invoke(($compile, $rootScope) => {
      let el = $('<div my-directive></div>')
      $compile(el)($rootScope)
      expect(givenScope).toBe($rootScope)
      expect(givenElement[0]).toBe(el[0])
      expect(givenAttrs).toBeDefined()
      expect(givenAttrs.myDirective).toBeDefined()
    })
  })
  it('links children when parent has no directives', () => {
    let givenElements = []
    let injector = makeInjectorWithDirectives('myDirective', () => {
      return {
        link: function(scope, element) {
          givenElements.push(element)
        }
      }
    })
    injector.invoke(($compile, $rootScope) => {
      let el = $('<div><div my-directive></div></div>')
      $compile(el)($rootScope)
      expect(givenElements.length).toBe(1)
      expect(givenElements[0][0]).toBe(el[0].firstChild)
    })
  })
  it('supports link function objects', () => {
    let linked
    let injector = makeInjectorWithDirectives('myDirective', () => {
      return {
        link: {
          post: function() {
            linked = true
          }
        }
      }
    })
    injector.invoke(($compile, $rootScope) => {
      let el = $('<div><div my-directive></div></div>')
      $compile(el)($rootScope)
      expect(linked).toBe(true)
    })
  })
  it('supports prelinking and postlinking', () => {
    let linkings = []
    let injector = makeInjectorWithDirectives('myDirective', () => {
      return {
        link: {
          pre: function(scope, element) {
            linkings.push(['pre', element[0]])
          },
          post: function(scope, element) {
            linkings.push(['post', element[0]])
          }
        }
      }
    })
    injector.invoke(($compile, $rootScope) => {
      let el = $('<div my-directive><div my-directive></div></div>')
      $compile(el)($rootScope)
      expect(linkings.length).toBe(4)
      expect(linkings[0]).toEqual(['pre', el[0]])
      expect(linkings[1]).toEqual(['pre', el[0].firstChild])
      expect(linkings[2]).toEqual(['post', el[0].firstChild])
      expect(linkings[3]).toEqual(['post', el[0]])
    })
  })
  it('reverses priority for postlink functions', () => {
    let linkings = []
    let injector = makeInjectorWithDirectives({
      firstDirective: function() {
        return {
          priority: 2,
          link: {
            pre: function() {
              linkings.push('first-pre')
            },
            post: function() {
              linkings.push('first-post')
            }
          }
        }
      },
      secondDirective: function() {
        return {
          priority: 1,
          link: {
            pre: function() {
              linkings.push('second-pre')
            },
            post: function() {
              linkings.push('second-post')
            }
          }
        }
      }
    })
    injector.invoke(($compile, $rootScope) => {
      let el = $('<div first-directive second-directive></div>')
      $compile(el)($rootScope)
      expect(linkings).toEqual([
        'first-pre',
        'second-pre',
        'second-post',
        'first-post'
      ])
    })
  })
  it('stabilizes node list during linking', () => {
    let givenElements = []
    let injector = makeInjectorWithDirectives('myDirective', () => {
      return {
        link: function(scope, element) {
          givenElements.push(element[0])
          element.after('<div></div>')
        }
      }
    })
    injector.invoke(($compile, $rootScope) => {
      let el = $('<div><div my-directive></div><div my-directive></div></div>')
      let el1 = el[0].childNodes[0],
        el2 = el[0].childNodes[1]
      $compile(el)($rootScope)
      expect(givenElements.length).toBe(2)
      expect(givenElements[0]).toBe(el1)
      expect(givenElements[1]).toBe(el2)
    })
  })
  it('invokes multi-element directive link functions with whole group', () => {
    let givenElements
    let injector = makeInjectorWithDirectives('myDirective', () => {
      return {
        multiElement: true,
        link: function(scope, element) {
          givenElements = element
        }
      }
    })
    injector.invoke(($compile, $rootScope) => {
      let el = $(
        '<div my-directive-start></div>' +
          '<p></p>' +
          '<div my-directive-end></div>'
      )
      $compile(el)($rootScope)
      expect(givenElements.length).toBe(3)
    })
  })
  it('creates an isolate scope when requested', () => {
    let givenScope
    let injector = makeInjectorWithDirectives('myDirective', () => {
      return {
        scope: {},
        link: function(scope) {
          givenScope = scope
        }
      }
    })
    injector.invoke(($compile, $rootScope) => {
      let el = $('<div my-directive></div>')
      $compile(el)($rootScope)
      expect(givenScope.$parent).toBe($rootScope)
      expect(Object.getPrototypeOf(givenScope)).not.toBe($rootScope)
    })
  })
  it('does not share isolate scope with other directives', () => {
    let givenScope
    let injector = makeInjectorWithDirectives({
      myDirective: function() {
        return { scope: {} }
      },
      myOtherDirective: function() {
        return {
          link: function(scope) {
            givenScope = scope
          }
        }
      }
    })
    injector.invoke(($compile, $rootScope) => {
      let el = $('<div my-directive my-other-directive></div>')
      $compile(el)($rootScope)
      expect(givenScope).toBe($rootScope)
    })
  })
  it('does not use isolate scope on child elements', () => {
    let givenScope
    let injector = makeInjectorWithDirectives({
      myDirective: function() {
        return { scope: {} }
      },
      myOtherDirective: function() {
        return {
          link: function(scope) {
            givenScope = scope
          }
        }
      }
    })
    injector.invoke(($compile, $rootScope) => {
      let el = $('<div my-directive><div my-other-directive></div></div>')
      $compile(el)($rootScope)
      expect(givenScope).toBe($rootScope)
    })
  })
  it('does not allow two isolate scope directives on an element', () => {
    let injector = makeInjectorWithDirectives({
      myDirective: function() {
        return { scope: {} }
      },
      myOtherDirective: function() {
        return { scope: {} }
      }
    })
    injector.invoke($compile => {
      let el = $('<div my-directive my-other-directive></div>')
      expect(() => {
        $compile(el)
      }).toThrow()
    })
  })
  it('does not allow both isolate and inherited scopes on an element', () => {
    let injector = makeInjectorWithDirectives({
      myDirective: function() {
        return { scope: {} }
      },
      myOtherDirective: function() {
        return { scope: true }
      }
    })
    injector.invoke($compile => {
      let el = $('<div my-directive my-other-directive></div>')
      expect(() => {
        $compile(el)
      }).toThrow()
    })
  })
  it('adds class and data for element with isolated scope', () => {
    let givenScope
    let injector = makeInjectorWithDirectives('myDirective', () => {
      return {
        scope: {},
        link: function(scope) {
          givenScope = scope
        }
      }
    })
    injector.invoke(($compile, $rootScope) => {
      let el = $('<div my-directive></div>')
      $compile(el)($rootScope)
      expect(el.hasClass('ng-isolate-scope')).toBe(true)
      expect(el.hasClass('ng-scope')).toBe(false)
      expect(el.data('$isolateScope')).toBe(givenScope)
    })
  })
  it('allows observing attribute to the isolate scope', () => {
    let givenScope, givenAttrs
    let injector = makeInjectorWithDirectives('myDirective', () => {
      return {
        scope: { anAttr: '@' },
        link: function(scope, element, attrs) {
          givenScope = scope
          givenAttrs = attrs
        }
      }
    })
    injector.invoke(($compile, $rootScope) => {
      let el = $('<div my-directive></div>')
      $compile(el)($rootScope)
      givenAttrs.$set('anAttr', '42')
      expect(givenScope.anAttr).toEqual('42')
    })
  })
  it('sets initial value of observed attr to the isolate scope', () => {
    let givenScope
    let injector = makeInjectorWithDirectives('myDirective', () => {
      return {
        scope: { anAttr: '@' },
        link: function(scope) {
          givenScope = scope
        }
      }
    })
    injector.invoke(($compile, $rootScope) => {
      let el = $('<div my-directive an-attr="42"></div>')
      $compile(el)($rootScope)
      expect(givenScope.anAttr).toEqual('42')
    })
  })
  it('allows aliasing observed attribute', () => {
    let givenScope
    let injector = makeInjectorWithDirectives('myDirective', () => {
      return {
        scope: { aScopeAttr: '@anAttr' },
        link: function(scope) {
          givenScope = scope
        }
      }
    })
    injector.invoke(($compile, $rootScope) => {
      let el = $('<div my-directive an-attr="42"></div>')
      $compile(el)($rootScope)
      expect(givenScope.aScopeAttr).toEqual('42')
    })
  })
  it('allows binding expression to isolate scope', () => {
    let givenScope
    let injector = makeInjectorWithDirectives('myDirective', () => {
      return {
        scope: { anAttr: '=' },
        link: function(scope) {
          givenScope = scope
        }
      }
    })
    injector.invoke(($compile, $rootScope) => {
      let el = $('<div my-directive an-attr="42"></div>')
      $compile(el)($rootScope)
      expect(givenScope.anAttr).toBe(42)
    })
  })
  it('allows aliasing expression attribute on isolate scope', () => {
    let givenScope
    let injector = makeInjectorWithDirectives('myDirective', () => {
      return {
        scope: { myAttr: '=theAttr' },
        link: function(scope) {
          givenScope = scope
        }
      }
    })
    injector.invoke(($compile, $rootScope) => {
      let el = $('<div my-directive the-attr="42"></div>')
      $compile(el)($rootScope)
      expect(givenScope.myAttr).toBe(42)
    })
  })
  it('evaluates isolate scope expression on parent scope', () => {
    let givenScope
    let injector = makeInjectorWithDirectives('myDirective', () => {
      return {
        scope: { myAttr: '=' },
        link: function(scope) {
          givenScope = scope
        }
      }
    })
    injector.invoke(($compile, $rootScope) => {
      $rootScope.parentAttr = 41
      let el = $('<div my-directive my-attr="parentAttr + 1"></div>')
      $compile(el)($rootScope)
      expect(givenScope.myAttr).toBe(42)
    })
  })
  it('watches isolated scope expressions', () => {
    let givenScope
    let injector = makeInjectorWithDirectives('myDirective', () => {
      return {
        scope: { myAttr: '=' },
        link: function(scope) {
          givenScope = scope
        }
      }
    })
    injector.invoke(($compile, $rootScope) => {
      let el = $('<div my-directive my-attr="parentAttr + 1"></div>')
      $compile(el)($rootScope)
      $rootScope.parentAttr = 41
      $rootScope.$digest()
      expect(givenScope.myAttr).toBe(42)
    })
  })
  it('allows assigning to isolated scope expressions', () => {
    let givenScope
    let injector = makeInjectorWithDirectives('myDirective', () => {
      return {
        scope: { myAttr: '=' },
        link: function(scope) {
          givenScope = scope
        }
      }
    })
    injector.invoke(($compile, $rootScope) => {
      let el = $('<div my-directive my-attr="parentAttr"></div>')
      $compile(el)($rootScope)
      givenScope.myAttr = 42
      $rootScope.$digest()
      expect($rootScope.parentAttr).toBe(42)
    })
  })
  it('gives parent change precedence when both parent and child change', () => {
    let givenScope
    let injector = makeInjectorWithDirectives('myDirective', () => {
      return {
        scope: { myAttr: '=' },
        link: function(scope) {
          givenScope = scope
        }
      }
    })
    injector.invoke(($compile, $rootScope) => {
      let el = $('<div my-directive my-attr="parentAttr"></div>')
      $compile(el)($rootScope)
      $rootScope.parentAttr = 42
      givenScope.myAttr = 43
      $rootScope.$digest()
      expect($rootScope.parentAttr).toBe(42)
      expect(givenScope.myAttr).toBe(42)
    })
  })
  it('throws when isolate scope expression returns new arrays', () => {
    let injector = makeInjectorWithDirectives('myDirective', () => {
      return {
        scope: { myAttr: '=' },
        link: function(scope) {}
      }
    })
    injector.invoke(($compile, $rootScope) => {
      $rootScope.parentFunction = function() {
        return [1, 2, 3]
      }
      let el = $('<div my-directive my-attr="parentFunction()"></div>')
      $compile(el)($rootScope)
      expect(() => {
        $rootScope.$digest()
      }).toThrow()
    })
  })
  it('can watch isolated scope expressions as collections', () => {
    let givenScope
    let injector = makeInjectorWithDirectives('myDirective', () => {
      return {
        scope: { myAttr: '=*' },
        link: function(scope) {
          givenScope = scope
        }
      }
    })
    injector.invoke(($compile, $rootScope) => {
      $rootScope.parentFunction = function() {
        return [1, 2, 3]
      }
      let el = $('<div my-directive my-attr="parentFunction()"></div>')
      $compile(el)($rootScope)
      $rootScope.$digest()
      expect(givenScope.myAttr).toEqual([1, 2, 3])
    })
  })
  it('does not watch optional missing isolate scope expressions', () => {
    let injector = makeInjectorWithDirectives('myDirective', () => {
      return {
        scope: { myAttr: '=?' },
        link: function(scope) {}
      }
    })
    injector.invoke(($compile, $rootScope) => {
      let el = $('<div my-directive></div>')
      $compile(el)($rootScope)
      expect($rootScope.$$watchers.length).toBe(0)
    })
  })
  it('allows binding an invokable expression on the parent scope', () => {
    let givenScope
    let injector = makeInjectorWithDirectives('myDirective', () => {
      return {
        scope: { myExpr: '&' },
        link: function(scope) {
          givenScope = scope
        }
      }
    })
    injector.invoke(($compile, $rootScope) => {
      $rootScope.parentFunction = function() {
        return 42
      }
      let el = $('<div my-directive my-expr="parentFunction() + 1"></div>')
      $compile(el)($rootScope)
      expect(givenScope.myExpr()).toBe(43)
    })
  })
  it('allows passing arguments to parent scope expression', () => {
    let givenScope
    let injector = makeInjectorWithDirectives('myDirective', () => {
      return {
        scope: { myExpr: '&' },
        link: function(scope) {
          givenScope = scope
        }
      }
    })
    injector.invoke(($compile, $rootScope) => {
      let gotArg
      $rootScope.parentFunction = function(arg) {
        gotArg = arg
      }
      let el = $(
        '<div my-directive my-expr="parentFunction(argFromChild)"></div>'
      )
      $compile(el)($rootScope)
      givenScope.myExpr({ argFromChild: 42 })
      expect(gotArg).toBe(42)
    })
  })
  it('sets missing optional parent scope expression to undefined', () => {
    let givenScope
    let injector = makeInjectorWithDirectives('myDirective', () => {
      return {
        scope: { myExpr: '&?' },
        link: function(scope) {
          givenScope = scope
        }
      }
    })
    injector.invoke(($compile, $rootScope) => {
      let gotArg
      $rootScope.parentFunction = function(arg) {
        gotArg = arg
      }
      let el = $('<div my-directive></div>')
      $compile(el)($rootScope)
      expect(givenScope.myExpr).toBeUndefined()
    })
  })
  describe('controllers', () => {
    it('can be attached to directives as functions', () => {
      let controllerInvoked
      let injector = makeInjectorWithDirectives('myDirective', () => {
        return {
          controller: function MyController() {
            controllerInvoked = true
          }
        }
      })
      injector.invoke(($compile, $rootScope) => {
        let el = $('<div my-directive></div>')
        $compile(el)($rootScope)
        expect(controllerInvoked).toBe(true)
      })
    })
    it('can be attached to directives as string references', () => {
      let controllerInvoked
      function MyController() {
        controllerInvoked = true
      }
      let injector = createInjector([
        'ng',
        function($controllerProvider, $compileProvider) {
          $controllerProvider.register('MyController', MyController)
          $compileProvider.directive('myDirective', () => {
            return { controller: 'MyController' }
          })
        }
      ])
      injector.invoke(($compile, $rootScope) => {
        let el = $('<div my-directive></div>')
        $compile(el)($rootScope)
        expect(controllerInvoked).toBe(true)
      })
    })
    it('can be applied in the same element independent of each other', () => {
      let controllerInvoked
      let otherControllerInvoked
      function MyController() {
        controllerInvoked = true
      }
      function MyOtherController() {
        otherControllerInvoked = true
      }
      let injector = createInjector([
        'ng',
        function($controllerProvider, $compileProvider) {
          $controllerProvider.register('MyController', MyController)
          $controllerProvider.register('MyOtherController', MyOtherController)
          $compileProvider.directive('myDirective', () => {
            return { controller: 'MyController' }
          })
          $compileProvider.directive('myOtherDirective', () => {
            return { controller: 'MyOtherController' }
          })
        }
      ])
      injector.invoke(($compile, $rootScope) => {
        let el = $('<div my-directive my-other-directive></div>')
        $compile(el)($rootScope)
        expect(controllerInvoked).toBe(true)
        expect(otherControllerInvoked).toBe(true)
      })
    })
    it('can be applied to different directives, as different instances', () => {
      let invocations = 0
      function MyController() {
        invocations++
      }
      let injector = createInjector([
        'ng',
        function($controllerProvider, $compileProvider) {
          $controllerProvider.register('MyController', MyController)
          $compileProvider.directive('myDirective', () => {
            return { controller: 'MyController' }
          })
          $compileProvider.directive('myOtherDirective', () => {
            return { controller: 'MyController' }
          })
        }
      ])
      injector.invoke(($compile, $rootScope) => {
        let el = $('<div my-directive my-other-directive></div>')
        $compile(el)($rootScope)
        expect(invocations).toBe(2)
      })
    })
    it('can be aliased with @ when given in directive attribute', () => {
      let controllerInvoked
      function MyController() {
        controllerInvoked = true
      }
      let injector = createInjector([
        'ng',
        function($controllerProvider, $compileProvider) {
          $controllerProvider.register('MyController', MyController)
          $compileProvider.directive('myDirective', () => {
            return { controller: '@' }
          })
        }
      ])
      injector.invoke(($compile, $rootScope) => {
        let el = $('<div my-directive="MyController"></div>')
        $compile(el)($rootScope)
        expect(controllerInvoked).toBe(true)
      })
    })
    it('gets scope, element, and attrs through DI', () => {
      let gotScope, gotElement, gotAttrs
      function MyController($element, $scope, $attrs) {
        gotElement = $element
        gotScope = $scope
        gotAttrs = $attrs
      }
      let injector = createInjector([
        'ng',
        function($controllerProvider, $compileProvider) {
          $controllerProvider.register('MyController', MyController)
          $compileProvider.directive('myDirective', () => {
            return { controller: 'MyController' }
          })
        }
      ])
      injector.invoke(($compile, $rootScope) => {
        let el = $('<div my-directive an-attr="abc"></div>')
        $compile(el)($rootScope)
        expect(gotElement[0]).toBe(el[0])
        expect(gotScope).toBe($rootScope)
        expect(gotAttrs).toBeDefined()
        expect(gotAttrs.anAttr).toEqual('abc')
      })
    })
    it('can be attached on the scope', () => {
      function MyController() {}
      let injector = createInjector([
        'ng',
        function($controllerProvider, $compileProvider) {
          $controllerProvider.register('MyController', MyController)
          $compileProvider.directive('myDirective', () => {
            return { controller: 'MyController', controllerAs: 'myCtrl' }
          })
        }
      ])
      injector.invoke(($compile, $rootScope) => {
        let el = $('<div my-directive></div>')
        $compile(el)($rootScope)
        expect($rootScope.myCtrl).toBeDefined()
        expect($rootScope.myCtrl instanceof MyController).toBe(true)
      })
    })
    it('gets isolate scope as injected $scope', () => {
      let gotScope
      function MyController($scope) {
        gotScope = $scope
      }
      let injector = createInjector([
        'ng',
        function($controllerProvider, $compileProvider) {
          $controllerProvider.register('MyController', MyController)
          $compileProvider.directive('myDirective', () => {
            return { scope: {}, controller: 'MyController' }
          })
        }
      ])
      injector.invoke(($compile, $rootScope) => {
        let el = $('<div my-directive></div>')
        $compile(el)($rootScope)
        expect(gotScope).not.toBe($rootScope)
      })
    })
    it('has isolate scope bindings available during construction', () => {
      let gotMyAttr
      function MyController($scope) {
        gotMyAttr = $scope.myAttr
      }
      let injector = createInjector([
        'ng',
        function($controllerProvider, $compileProvider) {
          $controllerProvider.register('MyController', MyController)
          $compileProvider.directive('myDirective', () => {
            return {
              scope: { myAttr: '@myDirective' },
              controller: 'MyController'
            }
          })
        }
      ])
      injector.invoke(($compile, $rootScope) => {
        let el = $('<div my-directive="abc"></div>')
        $compile(el)($rootScope)
        expect(gotMyAttr).toEqual('abc')
      })
    })
    it('can bind isolate scope bindings directly to self', () => {
      let gotMyAttr
      function MyController() {
        gotMyAttr = this.myAttr
      }
      let injector = createInjector([
        'ng',
        function($controllerProvider, $compileProvider) {
          $controllerProvider.register('MyController', MyController)
          $compileProvider.directive('myDirective', () => {
            return {
              scope: { myAttr: '@myDirective' },
              controller: 'MyController',
              bindToController: true
            }
          })
        }
      ])
      injector.invoke(($compile, $rootScope) => {
        let el = $('<div my-directive="abc"></div>')
        $compile(el)($rootScope)
        expect(gotMyAttr).toEqual('abc')
      })
    })
    it('can return a semi-constructed controller', () => {
      let injector = createInjector(['ng'])
      let $controller = injector.get('$controller')
      function MyController() {
        this.constructed = true
        this.myAttrWhenConstructed = this.myAttr
      }
      let controller = $controller(MyController, null, true)
      expect(controller.constructed).toBeUndefined()
      expect(controller.instance).toBeDefined()
      controller.instance.myAttr = 42
      let actualController = controller()
      expect(actualController.constructed).toBeDefined()
      expect(actualController.myAttrWhenConstructed).toBe(42)
    })
    it('can return a semi-constructed ctrl when using array injection', () => {
      let injector = createInjector([
        'ng',
        function($provide) {
          $provide.constant('aDep', 42)
        }
      ])
      let $controller = injector.get('$controller')
      function MyController(aDep) {
        this.aDep = aDep
        this.constructed = true
      }
      let controller = $controller(['aDep', MyController], null, true)
      expect(controller.constructed).toBeUndefined()
      let actualController = controller() // 调用之后才会实例化
      expect(actualController.constructed).toBeDefined()
      expect(actualController.aDep).toBe(42)
    })
    it('can bind semi-constructed controller to scope', () => {
      let injector = createInjector(['ng'])
      let $controller = injector.get('$controller')
      function MyController() {}
      let scope = {} // 需要往scope上做手脚
      let controller = $controller(
        MyController,
        { $scope: scope },
        true,
        'myCtrl'
      )
      expect(scope.myCtrl).toBe(controller.instance)
    })

    it('can be required from a sibling directive', () => {
      function MyController() {}
      let gotMyController
      let injector = createInjector([
        'ng',
        function($compileProvider) {
          $compileProvider.directive('myDirective', () => {
            return { scope: {}, controller: MyController }
          })
          $compileProvider.directive('myOtherDirective', () => {
            return {
              require: 'myDirective',
              link: function(scope, element, attrs, myController) {
                gotMyController = myController
              }
            }
          })
        }
      ])
      injector.invoke(($compile, $rootScope) => {
        let el = $('<div my-directive my-other-directive></div>')
        $compile(el)($rootScope)
        expect(gotMyController).toBeDefined()
        expect(gotMyController instanceof MyController).toBe(true)
      })
    })
    it('can be required from multiple sibling directives', () => {
      function MyController() {}
      function MyOtherController() {}
      let gotControllers
      let injector = createInjector([
        'ng',
        function($compileProvider) {
          $compileProvider.directive('myDirective', () => {
            return { scope: true, controller: MyController }
          })
          $compileProvider.directive('myOtherDirective', () => {
            return { scope: true, controller: MyOtherController }
          })
          $compileProvider.directive('myThirdDirective', () => {
            return {
              require: ['myDirective', 'myOtherDirective'],
              link: function(scope, element, attrs, controllers) {
                gotControllers = controllers
              }
            }
          })
        }
      ])
      injector.invoke(($compile, $rootScope) => {
        let el = $(
          '<div my-directive my-other-directive my-third-directive></div>'
        )
        $compile(el)($rootScope)
        expect(gotControllers).toBeDefined()
        expect(gotControllers.length).toBe(2)
        expect(gotControllers[0] instanceof MyController).toBe(true)
        expect(gotControllers[1] instanceof MyOtherController).toBe(true)
      })
    })
    it('is passed to link functions if there is no require', () => {
      function MyController() {}
      let gotMyController
      let injector = createInjector([
        'ng',
        function($compileProvider) {
          $compileProvider.directive('myDirective', () => {
            return {
              scope: {},
              controller: MyController,
              link: function(scope, element, attrs, myController) {
                gotMyController = myController
              }
            }
          })
        }
      ])
      injector.invoke(($compile, $rootScope) => {
        let el = $('<div my-directive></div>')
        $compile(el)($rootScope)
        expect(gotMyController).toBeDefined()
        expect(gotMyController instanceof MyController).toBe(true)
      })
    })
    it('is passed through grouped link wrapper', () => {
      function MyController() {}
      let gotMyController
      let injector = createInjector([
        'ng',
        function($compileProvider) {
          $compileProvider.directive('myDirective', () => {
            return {
              multiElement: true,
              scope: {},
              controller: MyController,
              link: function(scope, element, attrs, myController) {
                gotMyController = myController
              }
            }
          })
        }
      ])
      injector.invoke(($compile, $rootScope) => {
        let el = $('<div my-directive-start></div><div my-directive-end></div>')
        $compile(el)($rootScope)
        expect(gotMyController).toBeDefined()
        expect(gotMyController instanceof MyController).toBe(true)
      })
    })
    it('can be required from a parent directive', () => {
      function MyController() {}
      let gotMyController
      let injector = createInjector([
        'ng',
        function($compileProvider) {
          $compileProvider.directive('myDirective', () => {
            return { scope: {}, controller: MyController }
          })
          $compileProvider.directive('myOtherDirective', () => {
            return {
              require: '^myDirective',
              link: function(scope, element, attrs, myController) {
                gotMyController = myController
              }
            }
          })
        }
      ])
      injector.invoke(($compile, $rootScope) => {
        let el = $('<div my-directive><div my-other-directive></div></div>')
        $compile(el)($rootScope)
        expect(gotMyController).toBeDefined()
        expect(gotMyController instanceof MyController).toBe(true)
      })
    })
    it('finds from sibling directive when requiring with parent prefix', () => {
      function MyController() {}
      let gotMyController
      let injector = createInjector([
        'ng',
        function($compileProvider) {
          $compileProvider.directive('myDirective', () => {
            return { scope: {}, controller: MyController }
          })
          $compileProvider.directive('myOtherDirective', () => {
            return {
              require: '^myDirective',
              link: function(scope, element, attrs, myController) {
                gotMyController = myController
              }
            }
          })
        }
      ])
      injector.invoke(($compile, $rootScope) => {
        let el = $('<div my-directive my-other-directive></div>')
        $compile(el)($rootScope)
        expect(gotMyController).toBeDefined()
        expect(gotMyController instanceof MyController).toBe(true)
      })
    })
    it('can be required from a parent directive with ^^', () => {
      function MyController() {}
      let gotMyController
      let injector = createInjector([
        'ng',
        function($compileProvider) {
          $compileProvider.directive('myDirective', () => {
            return { scope: {}, controller: MyController }
          })
          $compileProvider.directive('myOtherDirective', () => {
            return {
              require: '^^myDirective',
              link: function(scope, element, attrs, myController) {
                gotMyController = myController
              }
            }
          })
        }
      ])
      injector.invoke(($compile, $rootScope) => {
        let el = $('<div my-directive><div my-other-directive></div></div>')
        $compile(el)($rootScope)
        expect(gotMyController).toBeDefined()
        expect(gotMyController instanceof MyController).toBe(true)
      })
    })
    it('does not find from sibling directive when requiring with ^^', () => {
      function MyController() {}
      let injector = createInjector([
        'ng',
        function($compileProvider) {
          $compileProvider.directive('myDirective', () => {
            return { scope: {}, controller: MyController }
          })
          $compileProvider.directive('myOtherDirective', () => {
            return {
              require: '^^myDirective',
              link: function(scope, element, attrs, myController) {}
            }
          })
        }
      ])
      injector.invoke(($compile, $rootScope) => {
        let el = $('<div my-directive my-other-directive></div>')
        expect(() => {
          $compile(el)($rootScope)
        }).toThrow()
      })
    })
    it('does not throw on required missing controller when optional', () => {
      let gotCtrl
      let injector = createInjector([
        'ng',
        function($compileProvider) {
          $compileProvider.directive('myDirective', () => {
            return {
              require: '?noSuchDirective',
              link: function(scope, element, attrs, ctrl) {
                gotCtrl = ctrl
              }
            }
          })
        }
      ])
      injector.invoke(($compile, $rootScope) => {
        let el = $('<div my-directive></div>')
        $compile(el)($rootScope)
        expect(gotCtrl).toBe(null)
      })
    })
    it('allows optional marker after parent marker', () => {
      let gotCtrl
      let injector = createInjector([
        'ng',
        function($compileProvider) {
          $compileProvider.directive('myDirective', () => {
            return {
              require: '^?noSuchDirective',
              link: function(scope, element, attrs, ctrl) {
                gotCtrl = ctrl
              }
            }
          })
        }
      ])
      injector.invoke(($compile, $rootScope) => {
        let el = $('<div my-directive></div>')
        $compile(el)($rootScope)
        expect(gotCtrl).toBe(null)
      })
    })
  })
  describe('template', () => {
    it('populates an element during compilation', () => {
      let injector = makeInjectorWithDirectives('myDirective', () => {
        return { template: '<div class="from-template"></div>' }
      })
      injector.invoke($compile => {
        let el = $('<div my-directive></div>')
        $compile(el)
        expect(el.find('> .from-template').length).toBe(1)
      })
    })
    it('replaces any existing children', () => {
      let injector = makeInjectorWithDirectives('myDirective', () => {
        return { template: '<div class="from-template"></div>' }
      })
      injector.invoke($compile => {
        let el = $('<div my-directive><div class="existing"></div></div>')
        $compile(el)
        expect(el.find('> .existing').length).toBe(0)
      })
    })
    it('compiles template contents also', () => {
      let compileSpy = jest.fn()
      let injector = makeInjectorWithDirectives({
        myDirective: function() {
          return { template: '<div my-other-directive></div>' }
        },
        myOtherDirective: function() {
          return { compile: compileSpy }
        }
      })
      injector.invoke($compile => {
        let el = $('<div my-directive></div>')
        $compile(el)
        expect(compileSpy).toHaveBeenCalled()
      })
    })
    it('does not allow two directives with templates', () => {
      let injector = makeInjectorWithDirectives({
        myDirective: function() {
          return { template: '<div></div>' }
        },
        myOtherDirective: function() {
          return { template: '<div></div>' }
        }
      })
      injector.invoke($compile => {
        let el = $('<div my-directive my-other-directive></div>')
        expect(() => {
          $compile(el)
        }).toThrow()
      })
    })
    it('supports functions as template values', () => {
      let templateSpy = jest
        .fn()
        .mockReturnValue('<div class="from-template"></div>')
      let injector = makeInjectorWithDirectives({
        myDirective: function() {
          return { template: templateSpy }
        }
      })
      injector.invoke($compile => {
        let el = $('<div my-directive></div>')
        $compile(el)
        expect(el.find('> .from-template').length).toBe(1)
        // Check that template function was called with element and attrs
        expect(templateSpy.mock.calls[0][0][0]).toBe(el[0])
        expect(templateSpy.mock.calls[0][1].myDirective).toBeDefined()
      })
    })
    it('uses isolate scope for template contents', () => {
      let linkSpy = jest.fn()
      let injector = makeInjectorWithDirectives({
        myDirective: function() {
          return {
            scope: { isoValue: '=myDirective' },
            template: '<div my-other-directive></div>'
          }
        },
        myOtherDirective: function() {
          return { link: linkSpy }
        }
      })
      injector.invoke(($compile, $rootScope) => {
        let el = $('<div my-directive="42"></div>')
        $compile(el)($rootScope)
        expect(linkSpy.mock.calls[0][0]).not.toBe($rootScope)
        expect(linkSpy.mock.calls[0][0].isoValue).toBe(42)
      })
    })
  })
  describe('templateUrl', () => {
    let xhr, requests
    beforeEach(() => {
      xhr = sinon.useFakeXMLHttpRequest()
      requests = []
      xhr.onCreate = function(req) {
        requests.push(req)
      }
    })
    afterEach(() => {
      xhr.restore()
    })
    it('defers remaining directive compilation', () => {
      let otherCompileSpy = jest.fn()
      let injector = makeInjectorWithDirectives({
        myDirective: function() {
          return { templateUrl: '/my_directive.html' }
        },
        myOtherDirective: function() {
          return { compile: otherCompileSpy }
        }
      })
      injector.invoke($compile => {
        let el = $('<div my-directive my-other-directive></div>')
        $compile(el)
        expect(otherCompileSpy).not.toHaveBeenCalled()
      })
    })
    it('defers current directive compilation', () => {
      let compileSpy = jest.fn()
      let injector = makeInjectorWithDirectives({
        myDirective: function() {
          return { templateUrl: '/my_directive.html', compile: compileSpy }
        }
      })
      injector.invoke($compile => {
        let el = $('<div my-directive></div>')
        $compile(el)
        expect(compileSpy).not.toHaveBeenCalled()
      })
    })
    it('immediately empties out the element', () => {
      let injector = makeInjectorWithDirectives({
        myDirective: function() {
          return { templateUrl: '/my_directive.html' }
        }
      })
      injector.invoke($compile => {
        let el = $('<div my-directive>Hello</div>')
        $compile(el)
        expect(el.is(':empty')).toBe(true)
      })
    })
    // fetch和populate分成了两步
    it('fetches the template', () => {
      let injector = makeInjectorWithDirectives({
        myDirective: function() {
          return { templateUrl: '/my_directive.html' }
        }
      })
      injector.invoke(($compile, $rootScope) => {
        let el = $('<div my-directive></div>')
        $compile(el)
        $rootScope.$apply()
        expect(requests.length).toBe(1)
        expect(requests[0].method).toBe('GET')
        expect(requests[0].url).toBe('/my_directive.html')
      })
    })
    it('populates element with template', () => {
      let injector = makeInjectorWithDirectives({
        myDirective: function() {
          return { templateUrl: '/my_directive.html' }
        }
      })
      injector.invoke(($compile, $rootScope) => {
        let el = $('<div my-directive></div>')
        $compile(el)
        $rootScope.$apply()
        requests[0].respond(200, {}, '<div class="from-template"></div>')
        expect(el.find('> .from-template').length).toBe(1)
      })
    })
    it('compiles current directive when template received', () => {
      let compileSpy = jest.fn()
      let injector = makeInjectorWithDirectives({
        myDirective: function() {
          return { templateUrl: '/my_directive.html', compile: compileSpy }
        }
      })
      injector.invoke(($compile, $rootScope) => {
        let el = $('<div my-directive></div>')
        $compile(el)
        $rootScope.$apply()
        requests[0].respond(200, {}, '<div class="from-template"></div>')
        expect(compileSpy).toHaveBeenCalled()
      })
    })
    it('resumes compilation when template received', () => {
      let otherCompileSpy = jest.fn()
      let injector = makeInjectorWithDirectives({
        myDirective: function() {
          return { templateUrl: '/my_directive.html' }
        },
        myOtherDirective: function() {
          return { compile: otherCompileSpy }
        }
      })
      injector.invoke(($compile, $rootScope) => {
        let el = $('<div my-directive my-other-directive></div>')
        $compile(el)
        $rootScope.$apply()
        requests[0].respond(200, {}, '<div class="from-template"></div>')
        expect(otherCompileSpy).toHaveBeenCalled()
      })
    })
    it('resumes child compilation after template received', () => {
      let otherCompileSpy = jest.fn()
      let injector = makeInjectorWithDirectives({
        myDirective: function() {
          return { templateUrl: '/my_directive.html' }
        },
        myOtherDirective: function() {
          return { compile: otherCompileSpy }
        }
      })
      injector.invoke(($compile, $rootScope) => {
        let el = $('<div my-directive></div>')
        $compile(el)
        $rootScope.$apply()
        requests[0].respond(200, {}, '<div my-other-directive></div>')
        expect(otherCompileSpy).toHaveBeenCalled()
      })
    })
    it('supports functions as values', () => {
      let templateUrlSpy = jest.fn().mockReturnValue('/my_directive.html')
      let injector = makeInjectorWithDirectives({
        myDirective: function() {
          return { templateUrl: templateUrlSpy }
        }
      })
      injector.invoke(($compile, $rootScope) => {
        let el = $('<div my-directive></div>')
        $compile(el)
        $rootScope.$apply()
        expect(requests[0].url).toBe('/my_directive.html')
        expect(templateUrlSpy.mock.calls[0][0][0]).toBe(el[0])
        expect(templateUrlSpy.mock.calls[0][1].myDirective).toBeDefined()
      })
    })
    it('does not allow templateUrl directive after template directive', () => {
      let injector = makeInjectorWithDirectives({
        myDirective: function() {
          return { template: '<div></div>' }
        },
        myOtherDirective: function() {
          return { templateUrl: '/my_other_directive.html' }
        }
      })
      injector.invoke($compile => {
        let el = $('<div my-directive my-other-directive></div>')
        expect(() => {
          $compile(el)
        }).toThrow()
      })
    })
    it('does not allow template directive after templateUrl directive', () => {
      let injector = makeInjectorWithDirectives({
        myDirective: function() {
          return { templateUrl: '/my_directive.html' }
        },
        myOtherDirective: function() {
          return { template: '<div></div>' }
        }
      })
      injector.invoke(($compile, $rootScope) => {
        let el = $('<div my-directive my-other-directive></div>')
        $compile(el)
        $rootScope.$apply()
        requests[0].respond(200, {}, '<div class="replacement"></div>')
        expect(el.find('> .replacement').length).toBe(1)
      })
    })
    it('links the directive when public link function is invoked', () => {
      let linkSpy = jest.fn()
      let injector = makeInjectorWithDirectives({
        myDirective: function() {
          return { templateUrl: '/my_directive.html', link: linkSpy }
        }
      })
      injector.invoke(($compile, $rootScope) => {
        let el = $('<div my-directive></div>')
        let linkFunction = $compile(el)
        $rootScope.$apply()
        requests[0].respond(200, {}, '<div></div>')
        linkFunction($rootScope)
        expect(linkSpy).toHaveBeenCalled()
        expect(linkSpy.mock.calls[0][0]).toBe($rootScope)
        expect(linkSpy.mock.calls[0][1][0]).toBe(el[0])
        expect(linkSpy.mock.calls[0][2].myDirective).toBeDefined()
      })
    })
    it('links child elements when public link function is invoked', () => {
      let linkSpy = jest.fn()
      let injector = makeInjectorWithDirectives({
        myDirective: function() {
          return { templateUrl: '/my_directive.html' }
        },
        myOtherDirective: function() {
          return { link: linkSpy }
        }
      })
      injector.invoke(($compile, $rootScope) => {
        let el = $('<div my-directive></div>')
        let linkFunction = $compile(el)
        $rootScope.$apply() // 未进行链接
        requests[0].respond(200, {}, '<div my-other-directive></div>')
        linkFunction($rootScope)
        expect(linkSpy).toHaveBeenCalled()
        expect(linkSpy.mock.calls[0][0]).toBe($rootScope)
        expect(linkSpy.mock.calls[0][1][0]).toBe(el[0].firstChild)
        expect(linkSpy.mock.calls[0][2].myOtherDirective).toBeDefined()
      })
    })
    it('links when template arrives if node link fn was called', () => {
      let linkSpy = jest.fn()
      let injector = makeInjectorWithDirectives({
        myDirective: function() {
          return { templateUrl: '/my_directive.html', link: linkSpy }
        }
      })
      injector.invoke(($compile, $rootScope) => {
        let el = $('<div my-directive></div>')
        let linkFunction = $compile(el)($rootScope) // link first
        $rootScope.$apply()
        requests[0].respond(200, {}, '<div></div>') // then receive template
        expect(linkSpy).toHaveBeenCalled()
        expect(linkSpy.mock.calls[0][0]).toBe($rootScope)
        expect(linkSpy.mock.calls[0][1][0]).toBe(el[0])
        expect(linkSpy.mock.calls[0][2].myDirective).toBeDefined()
      })
    })
    it('links directives that were compiled earlier', () => {
      let linkSpy = jest.fn()
      let injector = makeInjectorWithDirectives({
        myDirective: function() {
          return { link: linkSpy }
        },
        myOtherDirective: function() {
          return { templateUrl: '/my_other_directive.html' }
        }
      })
      injector.invoke(($compile, $rootScope) => {
        let el = $('<div my-directive my-other-directive></div>')
        let linkFunction = $compile(el)
        $rootScope.$apply()
        linkFunction($rootScope)
        requests[0].respond(200, {}, '<div></div>')
        expect(linkSpy).toHaveBeenCalled()
        expect(linkSpy.mock.calls[0][0]).toBe($rootScope)
        expect(linkSpy.mock.calls[0][2].myDirective).toBeDefined()
        expect(linkSpy.mock.calls[0][1][0]).toBe(el[0])
      })
    })
    it('retains isolate scope directives from earlier', () => {
      let linkSpy = jest.fn()
      let injector = makeInjectorWithDirectives({
        myDirective: function() {
          return { scope: { val: '=myDirective' }, link: linkSpy }
        },
        myOtherDirective: function() {
          return { templateUrl: '/my_other_directive.html' }
        }
      })
      injector.invoke(($compile, $rootScope) => {
        let el = $('<div my-directive="42" my-other-directive></div>')
        let linkFunction = $compile(el)
        $rootScope.$apply()
        linkFunction($rootScope)
        requests[0].respond(200, {}, '<div></div>')
        expect(linkSpy).toHaveBeenCalled()
        expect(linkSpy.mock.calls[0][0]).toBeDefined()
        expect(linkSpy.mock.calls[0][0]).not.toBe($rootScope)
        expect(linkSpy.mock.calls[0][0].val).toBe(42)
      })
    })
    it('sets up controllers for all controller directives', () => {
      let myDirectiveControllerInstantiated,
        myOtherDirectiveControllerInstantiated
      let injector = makeInjectorWithDirectives({
        myDirective: function() {
          return {
            controller: function MyDirectiveController() {
              myDirectiveControllerInstantiated = true
            }
          }
        },
        myOtherDirective: function() {
          return {
            templateUrl: '/my_other_directive.html',
            controller: function MyOtherDirectiveController() {
              myOtherDirectiveControllerInstantiated = true
            }
          }
        }
      })
      injector.invoke(($compile, $rootScope) => {
        let el = $('<div my-directive my-other-directive></div>')
        $compile(el)($rootScope)
        $rootScope.$apply()
        requests[0].respond(200, {}, '<div></div>')
        expect(myDirectiveControllerInstantiated).toBe(true)
        expect(myOtherDirectiveControllerInstantiated).toBe(true)
      })
    })
    describe('with transclusion', () => {
      it('makes transclusion available to link fn when template arrives first', () => {
        let injector = makeInjectorWithDirectives({
          myTranscluder: function() {
            return {
              transclude: true,
              templateUrl: 'my_template.html',
              link: function(scope, element, attrs, ctrl, transclude) {
                element.find('[in-template]').append(transclude())
              }
            }
          }
        })
        injector.invoke(($compile, $rootScope) => {
          let el = $('<div my-transcluder><div in-transclude></div></div>')

          let linkFunction = $compile(el)
          $rootScope.$apply()
          requests[0].respond(200, {}, '<div in-template></div>') // respond first
          linkFunction($rootScope) // then link

          expect(el.find('> [in-template] > [in-transclude]').length).toBe(1)
        })
      })

      it('makes transclusion available to link fn when template arrives after', () => {
        let injector = makeInjectorWithDirectives({
          myTranscluder: function() {
            return {
              transclude: true,
              templateUrl: 'my_template.html',
              link: function(scope, element, attrs, ctrl, transclude) {
                element.find('[in-template]').append(transclude())
              }
            }
          }
        })
        injector.invoke(($compile, $rootScope) => {
          let el = $('<div my-transcluder><div in-transclude></div></div>')

          let linkFunction = $compile(el)

          $rootScope.$apply()
          linkFunction($rootScope) // link first
          requests[0].respond(200, {}, '<div in-template></div>') // then respond
          expect(el.find('> [in-template] > [in-transclude]').length).toBe(1)
        })
      })

      it('is only allowed once', () => {
        let otherCompileSpy = jest.fn()
        let injector = makeInjectorWithDirectives({
          myTranscluder: function() {
            return {
              priority: 1,
              transclude: true,
              templateUrl: 'my_template.html'
            }
          },
          mySecondTranscluder: function() {
            return {
              priority: 0,
              transclude: true,
              compile: otherCompileSpy
            }
          }
        })
        injector.invoke(($compile, $rootScope) => {
          let el = $('<div my-transcluder my-second-transcluder></div>')

          $compile(el)
          $rootScope.$apply()
          requests[0].respond(200, {}, '<div in-template></div>')

          expect(otherCompileSpy).not.toHaveBeenCalled()
        })
      })
    })
  })
  describe('transclude', () => {
    it('removes the children of the element from the DOM', () => {
      let injector = makeInjectorWithDirectives({
        myTranscluder: function() {
          return { transclude: true }
        }
      })
      injector.invoke($compile => {
        let el = $('<div my-transcluder><div>Must go</div></div>')
        $compile(el)
        expect(el.is(':empty')).toBe(true)
      })
    })
    it('compiles child elements', () => {
      let insideCompileSpy = jest.fn()
      let injector = makeInjectorWithDirectives({
        myTranscluder: function() {
          return { transclude: true }
        },
        insideTranscluder: function() {
          return { compile: insideCompileSpy }
        }
      })
      injector.invoke($compile => {
        let el = $('<div my-transcluder><div inside-transcluder></div></div>')
        $compile(el)
        expect(insideCompileSpy).toHaveBeenCalled()
      })
    })

    it('makes contents available to link function', () => {
      let injector = makeInjectorWithDirectives({
        myTranscluder: function() {
          return {
            transclude: true,
            template: '<div in-template></div>',
            link: function(scope, element, attrs, ctrl, transclude) {
              element.find('[in-template]').append(transclude())
            }
          }
        }
      })
      injector.invoke(($compile, $rootScope) => {
        let el = $('<div my-transcluder><div in-transcluder></div></div>')

        $compile(el)($rootScope)
        expect(el.find('> [in-template] > [in-transcluder]').length).toBe(1)
      })
    })

    it('is only allowed once per element', () => {
      let injector = makeInjectorWithDirectives({
        myTranscluder: function() {
          return { transclude: true }
        },
        mySecondTranscluder: function() {
          return { transclude: true }
        }
      })
      injector.invoke($compile => {
        let el = $('<div my-transcluder my-second-transcluder></div>')

        expect(() => {
          $compile(el)
        }).toThrow()
      })
    })

    it('contents are destroyed along with transcluding directive', () => {
      let watchSpy = jest.fn()
      let injector = makeInjectorWithDirectives({
        myTranscluder: function() {
          return {
            transclude: true,
            scope: true,
            link: function(scope, element, attrs, ctrl, transclude) {
              element.append(transclude())
              scope.$on('destroyNow', () => {
                scope.$destroy()
              })
            }
          }
        },
        myInnerDirective: function() {
          return {
            link: function(scope) {
              scope.$watch(watchSpy)
            }
          }
        }
      })
      injector.invoke(($compile, $rootScope) => {
        let el = $('<div my-transcluder><div my-inner-directive></div></div>')
        $compile(el)($rootScope)

        $rootScope.$apply()
        expect(watchSpy.mock.calls.length).toBe(2)

        $rootScope.$apply()
        expect(watchSpy.mock.calls.length).toBe(3)

        $rootScope.$broadcast('destroyNow')
        $rootScope.$apply()
        expect(watchSpy.mock.calls.length).toBe(3)
      })
    })

    it('allows passing another scope to transclusion function', () => {
      let otherLinkSpy = jest.fn()
      let injector = makeInjectorWithDirectives({
        myTranscluder: function() {
          return {
            transclude: true,
            scope: {},
            template: '<div></div>',
            link: function(scope, element, attrs, ctrl, transclude) {
              let mySpecialScope = scope.$new(true)
              mySpecialScope.specialAttr = 42
              transclude(mySpecialScope)
            }
          }
        },
        myOtherDirective: function() {
          return { link: otherLinkSpy }
        }
      })
      injector.invoke(($compile, $rootScope) => {
        let el = $('<div my-transcluder><div my-other-directive></div></div>')

        $compile(el)($rootScope)

        let transcludedScope = otherLinkSpy.mock.calls[0][0]
        expect(transcludedScope.specialAttr).toBe(42)
      })
    })
    it('makes contents available to child elements', () => {
      let injector = makeInjectorWithDirectives({
        myTranscluder: function() {
          return { transclude: true, template: '<div in-template></div>' }
        },
        inTemplate: function() {
          return {
            link: function(scope, element, attrs, ctrl, transcludeFn) {
              element.append(transcludeFn())
            }
          }
        }
      })
      injector.invoke(($compile, $rootScope) => {
        let el = $('<div my-transcluder><div in-transclude></div></div>')
        $compile(el)($rootScope)
        expect(el.find('> [in-template] > [in-transclude]').length).toBe(1)
      })
    })
    it('makes contents available to indirect child elements', () => {
      let injector = makeInjectorWithDirectives({
        myTranscluder: function() {
          return {
            transclude: true,
            template: '<div><div in-template></div></div>'
          }
        },
        inTemplate: function() {
          return {
            link: function(scope, element, attrs, ctrl, transcludeFn) {
              element.append(transcludeFn())
            }
          }
        }
      })
      injector.invoke(($compile, $rootScope) => {
        let el = $('<div my-transcluder><div in-transclude></div></div>')
        $compile(el)($rootScope)
        expect(el.find('> div > [in-template] > [in-transclude]').length).toBe(
          1
        )
      })
    })
    it('supports passing transclusion function to public link function', () => {
      let injector = makeInjectorWithDirectives({
        myTranscluder: function($compile) {
          return {
            transclude: true,
            link: function(scope, element, attrs, ctrl, transclude) {
              let customTemplate = $('<div in-custom-template></div>')
              element.append(customTemplate)
              $compile(customTemplate)(scope, undefined, {
                parentBoundTranscludeFn: transclude
              })
            }
          }
        },
        inCustomTemplate: function() {
          return {
            link: function(scope, element, attrs, ctrl, transclude) {
              element.append(transclude())
            }
          }
        }
      })
      injector.invoke(($compile, $rootScope) => {
        let el = $('<div my-transcluder><div in-transclude></div></div>')
        $compile(el)($rootScope)
        expect(el.find('> [in-custom-template] > [in-transclude]').length).toBe(
          1
        )
      })
    })
    it('destroys scope passed through public link fn at the right time', () => {
      let watchSpy = jest.fn()
      let injector = makeInjectorWithDirectives({
        myTranscluder: function($compile) {
          return {
            transclude: true,
            link: function(scope, element, attrs, ctrl, transclude) {
              let customTemplate = $('<div in-custom-template></div>')
              element.append(customTemplate)
              $compile(customTemplate)(scope, undefined, {
                parentBoundTranscludeFn: transclude
              })
            }
          }
        },
        inCustomTemplate: function() {
          return {
            scope: true,
            link: function(scope, element, attrs, ctrl, transclude) {
              element.append(transclude())
              scope.$on('destroyNow', () => {
                scope.$destroy()
              })
            }
          }
        },
        inTransclude: function() {
          return {
            link: function(scope) {
              scope.$watch(watchSpy)
            }
          }
        }
      })
      injector.invoke(($compile, $rootScope) => {
        let el = $('<div my-transcluder><div in-transclude></div></div>')
        $compile(el)($rootScope)
        $rootScope.$apply()
        expect(watchSpy.mock.calls.length).toBe(2)
        $rootScope.$apply()
        expect(watchSpy.mock.calls.length).toBe(3)
        $rootScope.$broadcast('destroyNow')
        $rootScope.$apply()
        expect(watchSpy.mock.calls.length).toBe(3)
      })
    })
    it('makes contents available to controller', () => {
      let injector = makeInjectorWithDirectives({
        myTranscluder: function() {
          return {
            transclude: true,
            template: '<div in-template></div>',
            controller: function($element, $transclude) {
              $element.find('[in-template]').append($transclude())
            }
          }
        }
      })
      injector.invoke(($compile, $rootScope) => {
        let el = $('<div my-transcluder><div in-transclude></div></div>')
        $compile(el)($rootScope)
        expect(el.find('> [in-template] > [in-transclude]').length).toBe(1)
      })
    })
  })
  describe('clone attach function', () => {
    it('can be passed to public link fn', () => {
      let injector = makeInjectorWithDirectives({})
      injector.invoke(($compile, $rootScope) => {
        let el = $('<div>Hello</div>')
        let myScope = $rootScope.$new()
        let gotEl, gotScope
        $compile(el)(myScope, function cloneAttachFn(el, scope) {
          gotEl = el
          gotScope = scope
        })
        expect(gotEl[0].isEqualNode(el[0])).toBe(true)
        expect(gotScope).toBe(myScope)
      })
    })
    it('causes compiled elements to be cloned', () => {
      let injector = makeInjectorWithDirectives({})
      injector.invoke(($compile, $rootScope) => {
        let el = $('<div>Hello</div>')
        let myScope = $rootScope.$new()
        let gotClonedEl
        $compile(el)(myScope, clonedEl => {
          gotClonedEl = clonedEl
        })
        expect(gotClonedEl[0].isEqualNode(el[0])).toBe(true)
        expect(gotClonedEl[0]).not.toBe(el[0])
      })
    })
    it('causes cloned DOM to be linked', () => {
      let gotCompileEl, gotLinkEl
      let injector = makeInjectorWithDirectives({
        myDirective: function() {
          return {
            compile: function(compileEl) {
              gotCompileEl = compileEl
              return function link(scope, linkEl) {
                gotLinkEl = linkEl
              }
            }
          }
        }
      })
      injector.invoke(($compile, $rootScope) => {
        let el = $('<div my-directive></div>')
        let myScope = $rootScope.$new()
        $compile(el)(myScope, () => {})
        expect(gotCompileEl[0]).not.toBe(gotLinkEl[0])
      })
    })
    it('allows connecting transcluded content', () => {
      let injector = makeInjectorWithDirectives({
        myTranscluder: function() {
          return {
            transclude: true,
            template: '<div in-template></div>',
            link: function(scope, element, attrs, ctrl, transcludeFn) {
              let myScope = scope.$new()
              transcludeFn(myScope, transclNode => {
                element.find('[in-template]').append(transclNode)
              })
            }
          }
        }
      })
      injector.invoke(($compile, $rootScope) => {
        let el = $('<div my-transcluder><div in-transclude></div></div>')
        $compile(el)($rootScope)
        expect(el.find('> [in-template] > [in-transclude]').length).toBe(1)
      })
    })
    it('can be used as the only transclusion function argument', () => {
      let injector = makeInjectorWithDirectives({
        myTranscluder: function() {
          return {
            transclude: true,
            template: '<div in-template></div>',
            link: function(scope, element, attrs, ctrl, transcludeFn) {
              transcludeFn(transclNode => {
                element.find('[in-template]').append(transclNode)
              })
            }
          }
        }
      })
      injector.invoke(($compile, $rootScope) => {
        let el = $('<div my-transcluder><div in-transclusion></div></div>')
        $compile(el)($rootScope)
        expect(el.find('> [in-template] > [in-transclusion]').length).toBe(1)
      })
    })
    it('can be used with multi-element directives', () => {
      let injector = makeInjectorWithDirectives({
        myTranscluder: function($compile) {
          return {
            transclude: true,
            multiElement: true,
            template: '<div in-template></div>',
            link: function(scope, element, attrs, ctrl, transclude) {
              element.find('[in-template]').append(transclude())
            }
          }
        }
      })
      injector.invoke(($compile, $rootScope) => {
        let el = $(
          '<div><div my-transcluder-start><div in-transclude></div></div>' +
            '<div my-transcluder-end></div></div>'
        )
        $compile(el)($rootScope)
        expect(
          el.find('[my-transcluder-start] [in-template] [in-transclude]').length
        ).toBe(1)
      })
    })
  })
  describe('element transclusion', () => {
    it('removes the element from the DOM', () => {
      let injector = makeInjectorWithDirectives({
        myTranscluder: function() {
          return { transclude: 'element' }
        }
      })
      injector.invoke($compile => {
        let el = $('<div><div my-transcluder></div></div>')
        $compile(el)
        expect(el.is(':empty')).toBe(true)
      })
    })
    it('replaces the element with a comment', () => {
      let injector = makeInjectorWithDirectives({
        myTranscluder: function() {
          return { transclude: 'element' }
        }
      })
      injector.invoke($compile => {
        let el = $('<div><div my-transcluder></div></div>')
        $compile(el)
        expect(el.html()).toEqual('<!--myTranscluder:-->')
      })
    })
    it('includes directive attribute value in comment', () => {
      let injector = makeInjectorWithDirectives({
        myTranscluder: function() {
          return { transclude: 'element' }
        }
      })
      injector.invoke($compile => {
        let el = $('<div><div my-transcluder=42></div></div>')
        $compile(el)
        expect(el.html()).toEqual('<!--myTranscluder:42-->')
      })
    })
    it('calls directive compile and link with comment', () => {
      let gotCompiledEl, gotLinkedEl
      let injector = makeInjectorWithDirectives({
        myTranscluder: function() {
          return {
            transclude: 'element',
            compile: function(compiledEl) {
              gotCompiledEl = compiledEl
              return function(scope, linkedEl) {
                gotLinkedEl = linkedEl
              }
            }
          }
        }
      })
      injector.invoke(($compile, $rootScope) => {
        let el = $('<div><div my-transcluder></div></div>')
        $compile(el)($rootScope)
        expect(gotCompiledEl[0].nodeType).toBe(Node.COMMENT_NODE)
        expect(gotLinkedEl[0].nodeType).toBe(Node.COMMENT_NODE)
      })
    })
    it('calls lower priority compile with original', () => {
      let gotCompiledEl
      let injector = makeInjectorWithDirectives({
        myTranscluder: function() {
          return { priority: 2, transclude: 'element' }
        },
        myOtherDirective: function() {
          return {
            priority: 1,
            compile: function(compiledEl) {
              gotCompiledEl = compiledEl
            }
          }
        }
      })
      injector.invoke($compile => {
        let el = $('<div><div my-transcluder my-other-directive></div></div>')
        $compile(el)
        expect(gotCompiledEl[0].nodeType).toBe(Node.ELEMENT_NODE)
      })
    })
    it('calls compile on child element directives', () => {
      let compileSpy = jest.fn()
      let injector = makeInjectorWithDirectives({
        myTranscluder: function() {
          return { transclude: 'element' }
        },
        myOtherDirective: function() {
          return { compile: compileSpy }
        }
      })
      injector.invoke($compile => {
        let el = $(
          '<div><div my-transcluder><div my-other-directive></div></div></div>'
        )
        $compile(el)
        expect(compileSpy).toHaveBeenCalled()
      })
    })
    it('compiles original element contents once', () => {
      let compileSpy = jest.fn()
      let injector = makeInjectorWithDirectives({
        myTranscluder: function() {
          return { transclude: 'element' }
        },
        myOtherDirective: function() {
          return { compile: compileSpy }
        }
      })
      injector.invoke($compile => {
        let el = $(
          '<div><div my-transcluder><div my-other-directive></div></div></div>'
        )
        $compile(el)
        expect(compileSpy.mock.calls.length).toBe(1)
      })
    })
    it('makes original element available for transclusion', () => {
      let injector = makeInjectorWithDirectives({
        myDouble: function() {
          return {
            transclude: 'element',
            link: function(scope, el, attrs, ctrl, transclude) {
              transclude(clone => {
                el.after(clone)
              })
              transclude(clone => {
                el.after(clone)
              })
            }
          }
        }
      })
      injector.invoke(($compile, $rootScope) => {
        let el = $('<div><div my-double>Hello</div>')
        $compile(el)($rootScope)
        expect(el.find('[my-double]').length).toBe(2)
      })
    })
    it('sets directive attributes element to comment', () => {
      let injector = makeInjectorWithDirectives({
        myTranscluder: function() {
          return {
            transclude: 'element',
            link: function(scope, element, attrs, ctrl, transclude) {
              attrs.$set('testing', '42')
              element.after(transclude())
            }
          }
        }
      })
      injector.invoke(($compile, $rootScope) => {
        let el = $('<div><div my-transcluder></div></div>')
        $compile(el)($rootScope)
        expect(el.find('[my-transcluder]').attr('testing')).toBeUndefined()
      })
    })
    it('supports requiring controllers', () => {
      let MyController = function() {}
      let gotCtrl
      let injector = makeInjectorWithDirectives({
        myCtrlDirective: function() {
          return { controller: MyController }
        },
        myTranscluder: function() {
          return {
            transclude: 'element',
            link: function(scope, el, attrs, ctrl, transclude) {
              el.after(transclude())
            }
          }
        },
        myOtherDirective: function() {
          return {
            require: '^myCtrlDirective',
            link: function(scope, el, attrs, ctrl, transclude) {
              gotCtrl = ctrl
            }
          }
        }
      })
      injector.invoke(($compile, $rootScope) => {
        let el = $(
          '<div><div my-ctrl-directive my-transcluder><div my-other-directive></div></div>'
        )
        $compile(el)($rootScope)
        expect(gotCtrl).toBeDefined()
        expect(gotCtrl instanceof MyController).toBe(true)
      })
    })
  })
  describe('interpolation', () => {
    it('is done for text nodes', () => {
      let injector = makeInjectorWithDirectives({})
      injector.invoke(($compile, $rootScope) => {
        let el = $('<div>My expression: {{myExpr}}</div>')
        $compile(el)($rootScope)
        $rootScope.$apply()
        expect(el.html()).toEqual('My expression: ')
        $rootScope.myExpr = 'Hello'
        $rootScope.$apply()
        expect(el.html()).toEqual('My expression: Hello')
      })
    })
    it('adds binding class to text node parents', () => {
      let injector = makeInjectorWithDirectives({})
      injector.invoke(($compile, $rootScope) => {
        let el = $('<div>My expression: {{myExpr}}</div>')
        $compile(el)($rootScope)
        expect(el.hasClass('ng-binding')).toBe(true)
      })
    })
    it('adds binding data to text node parents', () => {
      let injector = makeInjectorWithDirectives({})
      injector.invoke(($compile, $rootScope) => {
        let el = $('<div>{{myExpr}} and {{myOtherExpr}}</div>')
        $compile(el)($rootScope)
        expect(el.data('$binding')).toEqual(['myExpr', 'myOtherExpr'])
      })
    })
    it('adds binding data to parent from multiple text nodes', () => {
      let injector = makeInjectorWithDirectives({})
      injector.invoke(($compile, $rootScope) => {
        let el = $('<div>{{myExpr}} <span>and</span> {{myOtherExpr}}</div>')
        $compile(el)($rootScope)
        expect(el.data('$binding')).toEqual(['myExpr', 'myOtherExpr'])
      })
    })
    it('is done for attributes', () => {
      let injector = makeInjectorWithDirectives({})
      injector.invoke(($compile, $rootScope) => {
        let el = $('<img alt="{{myAltText}}">')
        $compile(el)($rootScope)
        $rootScope.$apply()
        expect(el.attr('alt')).toEqual('')
        $rootScope.myAltText = 'My favourite photo'
        $rootScope.$apply()
        expect(el.attr('alt')).toEqual('My favourite photo')
      })
    })
    it('fires observers on attribute expression changes', () => {
      let observerSpy = jest.fn()
      let injector = makeInjectorWithDirectives({
        myDirective: function() {
          return {
            link: function(scope, element, attrs) {
              attrs.$observe('alt', observerSpy)
            }
          }
        }
      })
      injector.invoke(($compile, $rootScope) => {
        let el = $('<img alt="{{myAltText}}" my-directive>')
        $compile(el)($rootScope)
        $rootScope.myAltText = 'My favourite photo'
        $rootScope.$apply()
        expect(observerSpy.mock.calls[0][0]).toEqual('My favourite photo')
      })
    })
    it('fires observers just once upon registration', () => {
      let observerSpy = jest.fn()
      let injector = makeInjectorWithDirectives({
        myDirective: function() {
          return {
            link: function(scope, element, attrs) {
              attrs.$observe('alt', observerSpy)
            }
          }
        }
      })
      injector.invoke(($compile, $rootScope) => {
        let el = $('<img alt="{{myAltText}}" my-directive>')
        $compile(el)($rootScope)
        $rootScope.$apply()
        expect(observerSpy.mock.calls.length).toBe(1)
      })
    })
    it('is done for attributes by the time other directive is linked', () => {
      let gotMyAttr
      let injector = makeInjectorWithDirectives({
        myDirective: function() {
          return {
            link: function(scope, element, attrs) {
              gotMyAttr = attrs.myAttr
            }
          }
        }
      })
      injector.invoke(($compile, $rootScope) => {
        let el = $('<div my-directive my-attr="{{myExpr}}"></div>')
        $rootScope.myExpr = 'Hello'
        $compile(el)($rootScope)
        expect(gotMyAttr).toEqual('Hello')
      })
    })
    it('is done for attributes by the time bound to iso scope', () => {
      let gotMyAttr
      let injector = makeInjectorWithDirectives({
        myDirective: function() {
          return {
            scope: { myAttr: '@' },
            link: function(scope, element, attrs) {
              gotMyAttr = scope.myAttr
            }
          }
        }
      })
      injector.invoke(($compile, $rootScope) => {
        let el = $('<div my-directive my-attr="{{myExpr}}"></div>')
        $rootScope.myExpr = 'Hello'
        $compile(el)($rootScope)
        expect(gotMyAttr).toEqual('Hello')
      })
    })
    it('is done for attributes so that compile-time changes apply', () => {
      let injector = makeInjectorWithDirectives({
        myDirective: function() {
          return {
            compile: function(element, attrs) {
              attrs.$set('myAttr', '{{myDifferentExpr}}')
            }
          }
        }
      })
      injector.invoke(($compile, $rootScope) => {
        let el = $('<div my-directive my-attr="{{myExpr}}"></div>')
        $rootScope.myExpr = 'Hello'
        $rootScope.myDifferentExpr = 'Other Hello'
        $compile(el)($rootScope)
        $rootScope.$apply()
        expect(el.attr('my-attr')).toEqual('Other Hello')
      })
    })
    it('is done for attributes so that compile-time removals apply', () => {
      let injector = makeInjectorWithDirectives({
        myDirective: function() {
          return {
            compile: function(element, attrs) {
              attrs.$set('myAttr', null)
            }
          }
        }
      })
      injector.invoke(($compile, $rootScope) => {
        let el = $('<div my-directive my-attr="{{myExpr}}"></div>')
        $rootScope.myExpr = 'Hello'
        $compile(el)($rootScope)
        $rootScope.$apply()
        expect(el.attr('my-attr')).toBeFalsy()
      })
    })
    it('cannot be done for event handler attributes', () => {
      let injector = makeInjectorWithDirectives({})
      injector.invoke(($compile, $rootScope) => {
        $rootScope.myFunction = function() {}
        let el = $('<button onclick="{{myFunction()}}"></button>')
        expect(() => {
          $compile(el)($rootScope)
        }).toThrow()
      })
    })
    it('uses a watch delegate', () => {
      let injector = createInjector(['ng'])
      let $interpolate = injector.get('$interpolate')
      let interp = $interpolate('has an {{expr}}')
      expect(interp.$$watchDelegate).toBeDefined()
    })
    it('correctly returns new and old value when watched', () => {
      let injector = createInjector(['ng'])
      let $interpolate = injector.get('$interpolate')
      let $rootScope = injector.get('$rootScope')
      let interp = $interpolate('{{expr}}')
      let listenerSpy = jest.fn()
      $rootScope.$watch(interp, listenerSpy)
      $rootScope.expr = 42
      $rootScope.$apply()
      expect(listenerSpy.mock.calls[0][0]).toEqual('42')
      expect(listenerSpy.mock.calls[0][1]).toEqual('42')
      $rootScope.expr++
      $rootScope.$apply()
      expect(listenerSpy.mock.calls[1][0]).toEqual('43')
      expect(listenerSpy.mock.calls[1][1]).toEqual('42')
    })
  })
  describe('components', () => {
    let xhr, requests

    beforeEach(() => {
      xhr = sinon.useFakeXMLHttpRequest()
      requests = []
      xhr.onCreate = function(req) {
        requests.push(req)
      }
    })
    afterEach(() => {
      xhr.restore()
    })

    it('can be registered and become directives', () => {
      let myModule = window.angular.module('myModule', [])
      myModule.component('myComponent', {})
      let injector = createInjector(['ng', 'myModule'])
      expect(injector.has('myComponentDirective')).toBe(true)
    })
    it('are element directives with controllers', () => {
      let controllerInstantiated = false
      let componentElement
      let injector = makeInjectorWithComponent('myComponent', {
        controller: function($element) {
          controllerInstantiated = true
          componentElement = $element
        }
      })
      injector.invoke(($compile, $rootScope) => {
        let el = $('<my-component></my-component>')
        $compile(el)($rootScope)
        expect(controllerInstantiated).toBe(true)
        expect(el[0]).toBe(componentElement[0])
      })
    })

    it('cannot be applied to an attribute', () => {
      let controllerInstantiated = false
      let injector = makeInjectorWithComponent('myComponent', {
        restrict: 'A', // Will be ignored
        controller: function() {
          controllerInstantiated = true
        }
      })
      injector.invoke(($compile, $rootScope) => {
        let el = $('<div my-component></div>')
        $compile(el)($rootScope)
        expect(controllerInstantiated).toBe(false)
      })
    })
    it('has an isolate scope', () => {
      let componentScope
      let injector = makeInjectorWithComponent('myComponent', {
        controller: function($scope) {
          componentScope = $scope
        }
      })
      injector.invoke(($compile, $rootScope) => {
        let el = $('<my-component></my-component>')
        $compile(el)($rootScope)
        expect(componentScope).not.toBe($rootScope)
        expect(componentScope.$parent).toBe($rootScope)
        expect(Object.getPrototypeOf(componentScope)).not.toBe($rootScope)
      })
    })
    it.skip('may have bindings which are attached to controller', () => {
      let controllerInstance
      let injector = makeInjectorWithComponent('myComponent', {
        bindings: {
          attr: '@',
          oneWay: '<',
          twoWay: '='
        },
        controller: function() {
          controllerInstance = this
        }
      })
      injector.invoke(($compile, $rootScope) => {
        $rootScope.b = 42
        $rootScope.c = 43
        let el = $(
          '<my-component attr="a", one-way="b", two-way="c"></my-component>'
        )
        $compile(el)($rootScope)

        expect(controllerInstance.attr).toEqual('a')
        expect(controllerInstance.oneWay).toEqual(42)
        expect(controllerInstance.twoWay).toEqual(43)
      })
    })
    it('may use a controller alias with controllerAs', () => {
      let componentScope
      let controllerInstance
      let injector = makeInjectorWithComponent('myComponent', {
        controller: function($scope) {
          componentScope = $scope
          controllerInstance = this
        },
        controllerAs: 'myComponentController'
      })
      injector.invoke(($compile, $rootScope) => {
        let el = $('<my-component></my-component>')
        $compile(el)($rootScope)
        expect(componentScope.myComponentController).toBe(controllerInstance)
      })
    })

    it('may use a controller alias with "controller as" syntax', () => {
      let componentScope
      let controllerInstance
      let injector = createInjector([
        'ng',
        function($controllerProvider, $compileProvider) {
          $controllerProvider.register('MyController', function($scope) {
            componentScope = $scope
            controllerInstance = this
          })
          $compileProvider.component('myComponent', {
            controller: 'MyController as myComponentController'
          })
        }
      ])
      injector.invoke(($compile, $rootScope) => {
        let el = $('<my-component></my-component')
        $compile(el)($rootScope)
        expect(componentScope.myComponentController).toBe(controllerInstance)
      })
    })

    it('has a default controller alias of $ctrl', () => {
      let componentScope
      let controllerInstance
      let injector = makeInjectorWithComponent('myComponent', {
        controller: function($scope) {
          componentScope = $scope
          controllerInstance = this
        }
      })
      injector.invoke(($compile, $rootScope) => {
        let el = $('<my-component></my-component>')
        $compile(el)($rootScope)
        expect(componentScope.$ctrl).toBe(controllerInstance)
      })
    })
    it('may have a template', () => {
      let injector = makeInjectorWithComponent('myComponent', {
        controller: function() {
          this.message = 'Hello from component'
        },
        template: '{{ $ctrl.message }}'
      })
      injector.invoke(($compile, $rootScope) => {
        let el = $('<my-component></my-component>')
        $compile(el)($rootScope)
        $rootScope.$apply()
        expect(el.text()).toEqual('Hello from component')
      })
    })

    it.skip('may have a templateUrl', () => {
      let injector = makeInjectorWithComponent('myComponent', {
        controller: function() {
          this.message = 'Hello from component'
        },
        templateUrl: '/my_component.html'
      })
      injector.invoke(($compile, $rootScope) => {
        let el = $('<my-component></my-component>')
        $compile(el)($rootScope)
        $rootScope.$apply()
        requests[0].respond(200, {}, '{{ $ctrl.message }}')
        $rootScope.$apply()
        expect(el.text()).toEqual('Hello from component')
      })
    })

    it('may have a template function with DI support', () => {
      let injector = createInjector([
        'ng',
        function($provide, $compileProvider) {
          $provide.constant('myConstant', 42)
          $compileProvider.component('myComponent', {
            template: function(myConstant) {
              return '' + myConstant
            }
          })
        }
      ])
      injector.invoke(($compile, $rootScope) => {
        let el = $('<my-component></my-component>')
        $compile(el)($rootScope)
        expect(el.text()).toEqual('42')
      })
    })

    it('may have a template function with array-wrapped DI', () => {
      let injector = createInjector([
        'ng',
        function($provide, $compileProvider) {
          $provide.constant('myConstant', 42)
          $compileProvider.component('myComponent', {
            template: [
              'myConstant',
              function(c) {
                return '' + c
              }
            ]
          })
        }
      ])
      injector.invoke(($compile, $rootScope) => {
        let el = $('<my-component></my-component>')
        $compile(el)($rootScope)
        expect(el.text()).toEqual('42')
      })
    })

    it('may inject $element and $attrs to template function', () => {
      let injector = createInjector([
        'ng',
        function($provide, $compileProvider) {
          $compileProvider.component('myComponent', {
            template: function($element, $attrs) {
              return $element.attr('copiedAttr', $attrs.myAttr)
            }
          })
        }
      ])
      injector.invoke(($compile, $rootScope) => {
        let el = $('<my-component my-attr="42"></my-component>')
        $compile(el)($rootScope)
        expect(el.attr('copiedAttr')).toEqual('42')
      })
    })

    it('component may have a template function with DI support', () => {
      let injector = createInjector([
        'ng',
        function($provide, $compileProvider) {
          $provide.constant('myConstant', 42)
          $compileProvider.component('myComponent', {
            templateUrl: function(myConstant) {
              return '/template' + myConstant + '.html'
            }
          })
        }
      ])
      injector.invoke(($compile, $rootScope) => {
        let el = $('<my-component></my-component>')
        $compile(el)($rootScope)
        $rootScope.$apply()
        expect(requests[0].url).toBe('/template42.html')
      })
    })
    it('may use transclusion', () => {
      let injector = makeInjectorWithComponent('myComponent', {
        transclude: true,
        template: '<div ng-transclude></div>'
      })
      injector.invoke(($compile, $rootScope) => {
        let el = $('<my-component>Transclude me</my-component>')
        $compile(el)($rootScope)
        expect(el.find('div').text()).toEqual('Transclude me')
      })
    })
  })
})
