import AST from './ast-builder'
import utils from './utils'
export default class ASTCompiler {
  static stringEscapeRegex = /[^ a-zA-Z0-9]/g
  constructor(astBuilder) {
    this.astBuilder = astBuilder
  }
  compile(text) {
    let ast = this.astBuilder.ast(text)
    this.state = { body: [], nextId: 0, vars: [] }
    this.traverse(ast)
    let fn = new Function(
      's',
      'l',
      `${this.state.vars.length ? `var ${this.state.vars.join(',')};` : ''}  
       ${this.state.body.join('')}
      `
    )
    console.log('fn.toString()', fn.toString())
    return fn
  }
  traverse(ast) {
    let intoId
    switch (ast.type) {
      case AST.program:
        this.state.body.push('return ', this.traverse(ast.body), ';')
        break
      case AST.Literal:
        return this.escape(ast.value)
      case AST.ArrayExpression: {
        let elements
        elements = ast.elements.map(element => {
          return this.traverse(element)
        })
        return '[' + elements.join(',') + ']'
      }
      case AST.Identifier: {
        intoId = this.nextId()
        this._if(
          this.getHasOwnProperty('l', ast.name),
          this.assign(intoId, this.nonComputedMember('l', ast.name))
        )
        this._if(
          this.not(this.getHasOwnProperty('l', ast.name)) + ` && s`,
          this.assign(intoId, this.nonComputedMember('s', ast.name))
        )
        return intoId
      }
      case AST.ObjectExpression: {
        let properties = []
        properties = ast.properties.map(property => {
          let key =
            property.key.type === AST.Identifier
              ? property.key.name
              : this.escape(property.key.value)
          let value = this.traverse(property.value)
          return key + ':' + value
        })
        return '{' + properties.join(',') + '}'
      }
      case AST.ThisExpression:
        return 's'
      case AST.MemberExpression: {
        intoId = this.nextId()
        let left = this.traverse(ast.object)
        this._if(
          left,
          this.assign(intoId, this.nonComputedMember(left, ast.property.name))
        )
        return intoId
      }
    }
  }
  nonComputedMember(left, right) {
    return `${left}.${right}`
  }
  getHasOwnProperty(object, property) {
    return object + '&&(' + this.escape(property) + ' in ' + object + ')'
  }
  not(e) {
    return `!(${e})`
  }
  _if(test, consequent) {
    this.state.body.push(`
      if(${test}){
        ${consequent}
      }`)
  }
  nextId() {
    let id = `v${this.state.nextId++}`
    this.state.vars.push(id)
    return id
  }
  assign(id, value) {
    return `${id}=${value};`
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
