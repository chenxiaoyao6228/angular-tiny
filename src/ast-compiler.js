import AST from './ast-builder'

export default class ASTCompiler {
  constructor(astBuilder) {
    this.astBuilder = astBuilder
  }
  compile(text) {
    let ast = this.astBuilder.ast(text)
    this.state = { body: [] }
    this.traverse(ast)
    return new Function(this.state.body.join(''))
  }
  traverse(ast) {
    switch (ast.type) {
      case AST.program:
        this.state.body.push('return ', this.traverse(ast.body), ';')
        break
      case AST.Literal:
        return ast.value
    }
  }
}
