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
  let lexer = new Lexer()
  let parser = new Parser(lexer)
  return parser.parse(expr)
}

export default parse
