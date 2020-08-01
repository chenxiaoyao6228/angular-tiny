export default class AST {
  static Program = 'Program'
  static Literal = 'Literal'
  static ArrayExpression = 'ArrayExpression'
  static ObjectExpression = 'ObjectExpression'
  static Property = 'Property'
  static Identifier = 'Identifier'
  static ThisExpression = 'ThisExpression'
  static MemberExpression = 'MemberExpression'
  static CallExpression = 'CallExpression'
  static AssignmentExpression = 'AssignmentExpression'
  static UnaryExpression = 'UnaryExpression'

  constructor(lexer) {
    this.lexer = lexer
    this.constants = {
      null: { type: AST.Literal, value: null },
      true: { type: AST.Literal, value: true },
      false: { type: AST.Literal, value: false },
      this: { type: AST.ThisExpression }
    }
  }
  ast(text) {
    this.tokens = this.lexer.lex(text)
    // console.log('this.tokens', this.tokens)
    return this.program()
  }
  // 下面的方法名按照优先级从高到低的顺序进行排列
  program() {
    return {
      type: AST.program,
      body: this.assignment()
    }
  }
  assignment() {
    let left = this.unary()
    if (this.expect('=')) {
      let right = this.unary()
      return { type: AST.AssignmentExpression, left: left, right: right }
    }
    return left
  }
  unary() {
    let token
    if ((token = this.expect('+', '!'))) {
      return {
        type: AST.UnaryExpression,
        operator: token.text,
        argument: this.unary()
      }
    } else {
      return this.primary()
    }
  }
  primary() {
    let primary
    if (this.expect('[')) {
      primary = this.arrayDeclaration()
    } else if (this.expect('{')) {
      primary = this.objectDeclaration()
    } else if (
      Object.prototype.hasOwnProperty.call(this.constants, this.tokens[0].text)
    ) {
      primary = this.constants[this.consume().text]
    } else if (this.peek().identifier) {
      primary = this.identifier()
    } else {
      primary = this.constant()
    }
    let next
    while ((next = this.expect('.', '[', '('))) {
      if (next.text === '[') {
        primary = {
          type: AST.MemberExpression,
          object: primary,
          property: this.primary(),
          computed: true
        }
        this.consume(']')
      } else if (next.text === '.') {
        primary = {
          type: AST.MemberExpression,
          object: primary,
          property: this.identifier(),
          computed: false
        }
      } else if (next.text === '(') {
        primary = {
          type: AST.CallExpression,
          callee: primary,
          arguments: this.parseArguments()
        }
        this.consume(')')
      }
    }
    return primary
  }
  parseArguments() {
    let args = []
    if (!this.peek(')')) {
      do {
        args.push(this.assignment())
      } while (this.expect(','))
    }
    return args
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
        property.value = this.assignment()
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
        elements.push(this.assignment())
      } while (this.expect(','))
    }
    this.consume(']')
    return { type: AST.ArrayExpression, elements: elements }
  }
  identifier() {
    return {
      type: AST.Identifier,
      name: this.consume().text
    }
  }
  peek(e1, e2, e3, e4) {
    if (this.tokens.length > 0) {
      let text = this.tokens[0].text
      if ([e1, e2, e3, e4].indexOf(text) > -1 || (!e1 && !e2 && !e3 && !e4)) {
        return this.tokens[0]
      }
    }
  }
  expect(e1, e2, e3, e4) {
    let token = this.peek(e1, e2, e3, e4)
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
  constant() {
    return { type: AST.Literal, value: this.consume().value }
  }
}
