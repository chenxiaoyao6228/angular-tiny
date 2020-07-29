import AST from './ast-builder'
import utils from './utils'
export default class ASTCompiler {
  static stringEscapeRegex = /[^ a-zA-Z0-9]/g
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
    let elements
    let properties = ''
    switch (ast.type) {
      case AST.program:
        this.state.body.push('return ', this.traverse(ast.body), ';')
        break
      case AST.Literal:
        return this.escape(ast.value)
      case AST.ArrayExpression:
        elements = ast.elements.map(element => {
          return this.traverse(element)
        })
        return '[' + elements.join(',') + ']'
      case AST.ObjectExpression:
        ast.properties.forEach((property, index) => {
          properties +=
            this.escape(property.key.value) +
            ':' +
            this.traverse(property.value) +
            (index < ast.properties.length - 1 ? ',' : '')
        })
        return '{' + properties + '}'
    }
  }
  escape(value) {
    if (utils.isString(value)) {
      return `'${value.replace(this.stringEscapeRegex, this.stringEscapeFn)}'`
    } else if (utils.isNull(value)) {
      return 'null'
    } else {
      return value
    }
  }
  stringEscapeFn(c) {
    return '\\u' + ('0000' + c.charCodeAt(0).toString(16)).slice(-4)
  }
}
