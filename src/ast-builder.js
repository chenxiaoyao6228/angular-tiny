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
  static BinaryExpression = 'BinaryExpression'
  static LogicalExpression = 'LogicalExpression'
  static ConditionalExpression = 'ConditionalExpression'

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
    let body = []
    // eslint-disable-next-line
    while (true) {
      if (this.tokens.length) {
        body.push(this.filter())
      }
      if (!this.expect(';')) {
        return { type: AST.Program, body: body }
      }
    }
  }
  filter() {
    let left = this.assignment()
    while (this.expect('|')) {
      let args = [left]
      left = {
        type: AST.CallExpression,
        callee: this.identifier(),
        arguments: args,
        filter: true
      }
      while (this.expect(':')) {
        args.push(this.assignment())
      }
    }
    return left
  }
  assignment() {
    let left = this.ternary()
    if (this.expect('=')) {
      let right = this.ternary()
      return {
        type: AST.AssignmentExpression,
        left: left,
        right: right
      }
    }
    return left
  }
  ternary() {
    let test = this.logicalOR()
    if (this.expect('?')) {
      let consequent = this.assignment()
      if (this.consume(':')) {
        let alternate = this.assignment()
        return {
          type: AST.ConditionalExpression,
          test: test,
          consequent: consequent,
          alternate: alternate
        }
      }
    }
    return test
  }
  logicalOR() {
    let left = this.logicalAND()
    let token
    while ((token = this.expect('||'))) {
      left = {
        type: AST.LogicalExpression,
        left: left,
        operator: token.text,
        right: this.logicalAND()
      }
    }
    return left
  }
  logicalAND() {
    let left = this.equality()
    let token
    while ((token = this.expect('&&'))) {
      left = {
        type: AST.LogicalExpression,
        left: left,
        operator: token.text,
        right: this.equality()
      }
    }
    return left
  }
  equality() {
    let left = this.relational()
    let token
    while ((token = this.expect('==', '!=', '===', '!=='))) {
      left = {
        type: AST.BinaryExpression,
        left: left,
        operator: token.text,
        right: this.relational()
      }
    }
    return left
  }
  relational() {
    let left = this.additive()
    let token
    while ((token = this.expect('<', '>', '<=', '>='))) {
      left = {
        type: AST.BinaryExpression,
        left: left,
        operator: token.text,
        right: this.additive()
      }
    }
    return left
  }
  additive() {
    let left = this.multiplicative()
    let token
    while ((token = this.expect('+')) || (token = this.expect('-'))) {
      left = {
        type: AST.BinaryExpression,
        left: left,
        operator: token.text,
        right: this.multiplicative()
      }
    }
    return left
  }

  multiplicative() {
    let left = this.unary()
    let token
    while ((token = this.expect('*', '/', '%'))) {
      let right = this.unary()
      left = {
        type: AST.BinaryExpression,
        left: left,
        operator: token.text,
        right: right
      }
    }
    return left
  }
  unary() {
    let token
    if ((token = this.expect('+', '!', '-'))) {
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
    if (this.expect('(')) {
      primary = this.filter()
      this.consume(')')
    } else if (this.expect('[')) {
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
