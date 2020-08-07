import Lexer from './lexer.js'
import AST from './ast-builder.js'
import ASTCompiler from './ast-compiler.js'
import utils from '../src/utils'
import _ from 'lodash'
class Parser {
  constructor(lexer) {
    this.lexer = lexer
    this.ast = new AST(this.lexer)
    this.astCompiler = new ASTCompiler(this.ast)
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
  let unwatch = scope.$watch(
    () => watchFn(scope),
    (newValue, oldValue, scope) => {
      if (utils.isFunction(listenerFn)) {
        // eslint-disable-next-line
        listenerFn(arguments)
      }
      if (!utils.isUndefined(newValue)) {
        unwatch()
      }
    },
    valueEq
  )
  return unwatch
}

const parse = expr => {
  switch (typeof expr) {
    case 'string': {
      let lexer = new Lexer()
      let parser = new Parser(lexer)
      let oneTime = false
      if (expr.charAt(0) === ':' && expr.charAt(1) === ':') {
        oneTime = true
        expr = expr.substring(2)
      }
      let parseFn = parser.parse(expr)
      if (parseFn.constant) {
        parseFn.$$watchDelegate = constantWatchDelegate
      } else if (oneTime) {
        parseFn.$$watchDelegate = oneTimeWatchDelegate
      }
      return parseFn
    }

    case 'function':
      return expr
    default:
      return () => {}
  }
}

export default parse
