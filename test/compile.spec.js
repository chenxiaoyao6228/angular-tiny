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
  })
})
