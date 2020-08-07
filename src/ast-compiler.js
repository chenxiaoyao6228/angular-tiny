import AST from './ast-builder'
import utils from './utils'
import _ from 'lodash'
import { filter } from './filter.js'
export default class ASTCompiler {
  static stringEscapeRegex = /[^ a-zA-Z0-9]/g
  constructor(astBuilder) {
    this.astBuilder = astBuilder
  }
  compile(text) {
    let ast = this.astBuilder.ast(text)
    console.log('ast', JSON.stringify(ast))
    markConstantExpression(ast)
    this.state = {
      body: [],
      nextId: 0,
      vars: [],
      filters: {}
    }
    this.traverse(ast)
    let fnString = `
      ${this.filterPrefix()}
      var fn=function(s,l){
      ${this.state.vars.length ? `var ${this.state.vars.join(',')};` : ''}
      ${this.state.body.join('')}
      };return fn;`
    // console.log('fnString', fnString)
    let fn = new Function(
      'ensureSafeMemberName',
      'ensureSafeObject',
      'ensureSafeFunction',
      'ifDefined',
      'filter',
      fnString
    )(
      ensureSafeMemberName,
      ensureSafeObject,
      ensureSafeFunction,
      ifDefined,
      filter
    )
    fn.literal = isLiteral(ast)
    fn.constant = ast.constant
    // console.log('fn.toString()', fn.toString())
    return fn
  }
  traverse(ast, context, create) {
    let intoId
    switch (ast.type) {
      case AST.Program: {
        utils.initial(ast.body).forEach(statement => {
          this.state.body.push(this.traverse(statement), ';')
        })
        this.state.body.push(
          'return ',
          this.traverse(utils.last(ast.body)),
          ';'
        )
        break
      }
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
        ensureSafeMemberName(ast.name)
        intoId = this.nextId()
        this._if(
          this.getHasOwnProperty('l', ast.name),
          this.assign(intoId, this.nonComputedMember('l', ast.name))
        )

        if (create) {
          this._if(
            this.not(this.getHasOwnProperty('l', ast.name)) +
              ' && s && ' +
              this.not(this.getHasOwnProperty('s', ast.name)),
            this.assign(this.nonComputedMember('s', ast.name), '{}')
          )
        }

        this._if(
          this.not(this.getHasOwnProperty('l', ast.name)) + ` && s`,
          this.assign(intoId, this.nonComputedMember('s', ast.name))
        )
        if (context) {
          context.context = this.getHasOwnProperty('l', ast.name) + '?l:s'
          context.name = ast.name
          context.computed = false
        }
        this.addEnsureSafObjet(intoId)
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
        let left = this.traverse(ast.object, undefined, create)

        if (context) {
          context.context = left
        }

        if (ast.computed) {
          let right = this.traverse(ast.property)
          this.addEnsureSafeMemberName(right)
          if (create) {
            this._if(
              this.not(this.computedMember(left, right)),
              this.assign(this.computedMember(left, right), '{}')
            )
          }
          this._if(
            left,
            this.assign(
              intoId,
              'ensureSafeObject(' + this.computedMember(left, right) + ')'
            )
          )
          if (context) {
            context.name = right
            context.computed = true
          }
        } else {
          ensureSafeMemberName(ast.property.name)
          if (create) {
            this._if(
              this.not(this.nonComputedMember(left, ast.property.name)),
              this.assign(this.nonComputedMember(left, ast.property.name), '{}')
            )
          }
          this._if(
            left,
            this.assign(
              intoId,
              'ensureSafeObject(' +
                this.nonComputedMember(left, ast.property.name) +
                ')'
            )
          )
          if (context) {
            context.name = ast.property.name
            context.computed = false
          }
        }
        return intoId
      }
      case AST.CallExpression: {
        let callContext, callee, args
        if (ast.filter) {
          callee = this.filter(ast.callee.name)
          args = Array.from(ast.arguments).map(arg => this.traverse(arg))
          return callee + '(' + args + ')'
        } else {
          callContext = {}
          callee = this.traverse(ast.callee, callContext)
          args = Array.from(ast.arguments).map(arg => {
            return 'ensureSafeObject(' + this.traverse(arg) + ')'
          })
          if (callContext.name) {
            this.addEnsureSafObjet(callContext.context)
            if (callContext.computed) {
              callee = this.computedMember(
                callContext.context,
                callContext.name
              )
            } else {
              callee = this.nonComputedMember(
                callContext.context,
                callContext.name
              )
            }
          }
          this.addEnsureSafeFunction(callee)
          return (
            callee +
            '&&ensureSafeObject(' +
            callee +
            '(' +
            args.join(',') +
            '))'
          )
        }
        // break
      }
      case AST.AssignmentExpression: {
        let leftContext = {}
        this.traverse(ast.left, leftContext, true)
        let leftExpr
        if (leftContext.computed) {
          leftExpr = this.computedMember(leftContext.context, leftContext.name)
        } else {
          leftExpr = this.nonComputedMember(
            leftContext.context,
            leftContext.name
          )
        }
        return this.assign(
          leftExpr,
          'ensureSafeObject(' + this.traverse(ast.right) + ')'
        )
      }
      case AST.UnaryExpression:
        return (
          ast.operator +
          '(' +
          this.ifDefined(this.traverse(ast.argument), 0) +
          ')'
        )
      case AST.BinaryExpression: {
        if (ast.operator === '+' || ast.operator === '-') {
          return (
            '(' +
            this.ifDefined(this.traverse(ast.left), 0) +
            ')' +
            ast.operator +
            '(' +
            this.ifDefined(this.traverse(ast.right), 0) +
            ')'
          )
        } else {
          return (
            '(' +
            this.traverse(ast.left) +
            ')' +
            ast.operator +
            '(' +
            this.traverse(ast.right) +
            ')'
          )
        }
      }
      case AST.LogicalExpression:
        intoId = this.nextId()
        this.state.body.push(this.assign(intoId, this.traverse(ast.left)))
        this._if(
          ast.operator === '&&' ? intoId : this.not(intoId),
          this.assign(intoId, this.traverse(ast.right))
        )
        return intoId
      case AST.ConditionalExpression: {
        intoId = this.nextId()
        let testId = this.nextId()
        this.state.body.push(this.assign(testId, this.traverse(ast.test)))
        this._if(testId, this.assign(intoId, this.traverse(ast.consequent)))
        this._if(
          this.not(testId),
          this.assign(intoId, this.traverse(ast.alternate))
        )
        return intoId
      }
    }
  }
  filter(name) {
    if (!Object.prototype.hasOwnProperty.call(this.state.filters, name)) {
      this.state.filters[name] = this.nextId(true)
    }
    return this.state.filters[name]
  }
  filterPrefix() {
    if (utils.isEmpty(this.state.filters)) {
      return ''
    } else {
      let that = this
      let parts = _.map(
        this.state.filters,
        (varName, filterName) => {
          return varName + '=' + 'filter(' + that.escape(filterName) + ')'
        },
        this
      )
      return 'var ' + parts.join(',') + ';'
    }
  }
  addEnsureSafeFunction = function(expr) {
    this.state.body.push('ensureSafeFunction(' + expr + ');')
  }
  addEnsureSafObjet(expr) {
    this.state.body.push('ensureSafeObject(' + expr + ');')
  }
  addEnsureSafeMemberName(expr) {
    this.state.body.push('ensureSafeMemberName(' + expr + ');')
  }
  nonComputedMember(left, right) {
    return `${left}.${right}`
  }
  computedMember(left, right) {
    return '(' + left + ')[' + right + ']'
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
  nextId(skip) {
    let id = `v${this.state.nextId++}`
    if (!skip) {
      this.state.vars.push(id)
    }
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
  ifDefined(value, defaultValue) {
    return 'ifDefined(' + value + ',' + this.escape(defaultValue) + ')'
  }
}

function ensureSafeMemberName(name) {
  if (
    name === 'constructor' ||
    name === '__proto__' ||
    name === '__defineGetter__' ||
    name === '__defineSetter__' ||
    name === '__lookupGetter__' ||
    name === '__lookupSetter__'
  ) {
    throw 'Attempting to access a disallowed field in Angular expressions!'
  }
}

function ensureSafeObject(obj) {
  if (obj) {
    if (obj.document && obj.location && obj.alert && obj.setInterval) {
      throw 'Referencing window in Angular expressions is disallowed!'
    } else if (
      obj.children &&
      (obj.nodeName || (obj.prop && obj.attr && obj.find))
    ) {
      throw 'Referencing DOM nodes in Angular expressions is disallowed!'
    } else if (obj.constructor === obj) {
      throw 'Referencing Function in Angular expressions is disallowed'
    } else if (obj.getOwnPropertyNames || obj.getOwnPropertyDescriptor) {
      throw 'Referencing Object in Angular expressions is disallowed!'
    }
  }
  return obj
}

let CALL = Function.prototype.call
let APPLY = Function.prototype.apply
let BIND = Function.prototype.bind
function ensureSafeFunction(obj) {
  if (obj) {
    if (obj.constructor === obj) {
      throw 'Referencing Function in Angular expressions is disallowed!'
    } else if (obj === CALL || obj === APPLY || obj === BIND) {
      throw 'Referencing call, apply, or bind in Angular expressions ' +
        'is disallowed!'
    }
  }
  return obj
}

function ifDefined(value, defaultValue) {
  return typeof value === 'undefined' ? defaultValue : value
}

function isLiteral(ast) {
  return (
    ast.body.length === 0 ||
    (ast.body.length === 1 &&
      (ast.body[0].type === AST.Literal ||
        ast.body[0].type === AST.ObjectExpression ||
        ast.body[0].type === AST.ArrayExpression))
  )
}

function markConstantExpression(ast) {
  let allConstants
  switch (ast.type) {
    case AST.Program:
      allConstants = true
      ast.body.forEach(expr => {
        markConstantExpression(expr)
        allConstants = allConstants && expr.constant
      })
      ast.constant = allConstants // 每个节点都定义一个constant
      break
    case AST.Literal:
      ast.constant = true
      break
    case AST.Identifier:
      ast.constant = false
      break
    case AST.ArrayExpression:
      allConstants = true
      ast.elements.forEach(element => {
        markConstantExpression(element)
        allConstants = allConstants && element.constant
      })
      ast.constant = allConstants
      break
    case AST.ObjectExpression:
      allConstants = true
      ast.properties.forEach(prop => {
        markConstantExpression(prop.value)
        allConstants = allConstants && prop.value.constant
      })
      ast.constant = allConstants
      break
    case AST.ThisExpression:
      ast.constant = false
      break
    case AST.MemberExpression:
      markConstantExpression(ast.object)
      if (ast.computed) {
        markConstantExpression(ast.property)
      }
      ast.constant =
        ast.object.constant && (!ast.computed || ast.property.constant)
      break
    case AST.CallExpression:
      allConstants = ast.filter ? true : false
      ast.arguments.forEach(arg => {
        markConstantExpression(arg)
        allConstants = allConstants && arg.constant
      })
      ast.constant = allConstants
      break
    case AST.AssignmentExpression:
      markConstantExpression(ast.left)
      markConstantExpression(ast.right)
      ast.constant = ast.left.constant && ast.right.constant
      break
  }
}
