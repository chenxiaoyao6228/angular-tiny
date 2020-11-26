import { publishExternalAPI } from '../src/angular_public'
import { createInjector } from '../src/injector'
import utils from '../src/utils'
import $ from 'jquery'

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
        compile: function(element) {
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
                    compile: function(element) {
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
          compile: function(element) {
            compilations.push('lower')
          }
        }
      },
      higherDirective: function() {
        return {
          priority: 2,
          compile: function(element) {
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
        compile: function(element) {
          compilations.push('first')
        }
      }
    })
    myModule.directive('aDirective', () => {
      return {
        priority: 1,
        compile: function(element) {
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
        compile: function(element) {
          compilations.push('first')
        }
      }
    })
    myModule.directive('secondDirective', () => {
      return {
        compile: function(element) {
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
        compile: function(element) {
          compilations.push('first')
        }
      }
    })
    myModule.directive('secondDirective', () => {
      return {
        priority: 0,
        compile: function(element) {
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
        compile: function(element) {
          compilations.push('first')
        }
      }
    })
    myModule.directive('secondDirective', () => {
      return {
        priority: 1,
        compile: function(element) {
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
        compile: function(element) {
          compilations.push('parent')
        }
      }
    })
    myModule.directive('childDirective', () => {
      return {
        compile: function(element) {
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
        link: function(scope, element, attrs) {
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
          post: function(scope, element, attrs) {
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
})
