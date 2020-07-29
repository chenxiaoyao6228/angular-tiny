export default class AST {
  static program = 'Program'
  static Literal = 'Literal'
  static ArrayExpression = 'ArrayExpression'
  static ObjectExpression = 'ObjectExpression'
  static Property = 'Property'
  static Identifier = 'Identifier'
  constructor(lexer) {
    this.lexer = lexer
    this.constants = {
      null: { type: AST.Literal, value: null },
      true: { type: AST.Literal, value: true },
      false: { type: AST.Literal, value: false }
    }
  }
  ast(text) {
    this.tokens = this.lexer.lex(text)
    return this.program()
  }
  program() {
    return {
      type: AST.program,
      body: this.primary()
    }
  }
  primary() {
    if (this.expect('[')) {
      return this.arrayDeclaration()
    } else if (this.expect('{')) {
      return this.objectDeclaration()
    } else if (
      Object.prototype.hasOwnProperty.call(this.constants, this.tokens[0].text)
    ) {
      return this.constants[this.consume().text]
    } else {
      return this.constant()
    }
  }
  objectDeclaration() {
    let properties = []
    if (!this.peek('}')) {
      do {
        let property = {
          type: AST.Property
        }
        if (this.peek().identifier) {
          property.key = this.identifier()
        } else {
          property.key = this.constant()
        }
        this.consume(':')
        property.value = this.primary()
        properties.push(property)
      } while (this.expect(','))
    }
    this.consume('}')
    return {
      type: AST.ObjectExpression,
      properties: properties
    }
  }
  arrayDeclaration() {
    let elements = []
    if (!this.peek(']')) {
      do {
        if (this.peek(']')) {
          break
        }
        elements.push(this.primary())
      } while (this.expect(','))
    }
    this.consume(']')
    return { type: AST.ArrayExpression, elements: elements }
  }
  peek(e) {
    if (this.tokens.length > 0) {
      let text = this.tokens[0].text
      if (text === e || !e) {
        return this.tokens[0]
      }
    }
  }
  expect(e) {
    let token = this.peek(e)
    if (token) {
      return this.tokens.shift()
    }
  }
  consume(e) {
    let token = this.expect(e)
    if (!token) {
      throw 'Unexpected. Expecting: ' + e
    }
    return token
  }
  identifier() {
    return {
      type: AST.Identifier,
      name: this.consume().text
    }
  }
  constant() {
    return { type: AST.Literal, value: this.consume().value }
  }
}
