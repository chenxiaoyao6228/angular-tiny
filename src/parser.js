import Lexer from './lexer.js'
import AST from './ast-builder.js'
import ASTCompiler from './ast-compiler.js'

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

const parse = expr => {
  switch (typeof expr) {
    case 'string': {
      let lexer = new Lexer()
      let parser = new Parser(lexer)
      return parser.parse(expr)
    }
    case 'function':
      return expr
    default:
      return () => {}
  }
}

export default parse
