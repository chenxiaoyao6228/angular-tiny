import Lexer from './lexer.js'
import AST from './ast-builder.js'
import ASTCompiler from './ast-compiler.js'
import utils from '../src/utils'
class Parser {
  constructor(lexer, $filter) {
    this.lexer = lexer
    this.ast = new AST(this.lexer)
    this.astCompiler = new ASTCompiler(this.ast, $filter)
  }
  parse(text) {
    return this.astCompiler.compile(text)
  }
}

const constantWatchDelegate = (scope, listenerFn, valueEq, watchFn) => {
  let unwatch = scope.$watch(
    () => watchFn(scope),
    (newValue, oldValue, scope) => {
      if (utils.isFunction(listenerFn)) {
        // eslint-disable-next-line
        listenerFn(arguments)
      }
      unwatch()
    },
    valueEq
  )
  return unwatch
}

const oneTimeWatchDelegate = (scope, listenerFn, valueEq, watchFn) => {
  let lastValue
  let unwatch = scope.$watch(
    () => watchFn(scope),
    (newValue, oldValue, scope) => {
      lastValue = newValue
      if (utils.isFunction(listenerFn)) {
        // eslint-disable-next-line
        listenerFn(arguments)
      }
      if (!utils.isUndefined(newValue)) {
        scope.$$postDigest(() => {
          if (!utils.isUndefined(lastValue)) {
            unwatch()
          }
        })
      }
    },
    valueEq
  )
  return unwatch
}

const oneTimeLiteralWatchDelegate = (scope, listenerFn, valueEq, watchFn) => {
  function isAllDefined(val) {
    return !utils.some(val, utils.isUndefined)
  }

  let unwatch = scope.$watch(
    () => watchFn(scope),
    (newValue, oldValue, scope) => {
      if (utils.isFunction(listenerFn)) {
        // eslint-disable-next-line
        listenerFn(arguments)
      }
      if (isAllDefined(newValue)) {
        scope.$$postDigest(() => {
          if (isAllDefined(newValue)) {
            unwatch()
          }
        })
      }
    },
    valueEq
  )
  return unwatch
}

function inputsWatchDelegate(scope, listenerFn, valueEq, watchFn) {
  let inputExpressions = watchFn.inputs
  let oldValues = utils.times(inputExpressions.length, () => () => {})
  let lastResult
  return scope.$watch(
    () => {
      let changed = false
      utils.forEach(inputExpressions, (inputExpr, i) => {
        let newValue = inputExpr(scope)
        if (changed || !expressionInputDirtyCheck(newValue, oldValues[i])) {
          changed = true
          oldValues[i] = newValue
        }
      })
      if (changed) {
        lastResult = watchFn(scope)
      }
      return lastResult
    },
    listenerFn,
    valueEq
  )
}

function expressionInputDirtyCheck(newValue, oldValue) {
  return (
    newValue === oldValue ||
    (typeof newValue === 'number' &&
      typeof oldValue === 'number' &&
      isNaN(newValue) &&
      isNaN(oldValue))
  )
}

function $ParseProvider() {
  this.$get = [
    '$filter',
    function($filter) {
      return function(expr) {
        switch (typeof expr) {
          case 'string': {
            let lexer = new Lexer()
            let parser = new Parser(lexer, $filter)
            let oneTime = false
            if (expr.charAt(0) === ':' && expr.charAt(1) === ':') {
              oneTime = true
              expr = expr.substring(2)
            }
            let parseFn = parser.parse(expr)
            if (parseFn.constant) {
              parseFn.$$watchDelegate = constantWatchDelegate
            } else if (oneTime) {
              parseFn.$$watchDelegate = parseFn.literal
                ? oneTimeLiteralWatchDelegate
                : oneTimeWatchDelegate
            } else if (parseFn.inputs) {
              parseFn.$$watchDelegate = inputsWatchDelegate
            }
            return parseFn
          }

          case 'function':
            return expr
          default:
            return () => {}
        }
      }
    }
  ]
}

export default $ParseProvider
