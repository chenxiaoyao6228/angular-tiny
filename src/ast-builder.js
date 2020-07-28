export default class AST {
  static program = 'Program'
  static Literal = 'Literal'
  constructor(lexer) {
    this.lexer = lexer
  }
  ast(text) {
    this.tokens = this.lexer.lex(text)
    return this.program()
  }
  program() {
    return {
      type: AST.program,
      body: this.constant()
    }
  }
  constant() {
    return { type: AST.Literal, value: this.tokens[0].value }
  }
}
