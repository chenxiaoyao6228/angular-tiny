let ESCAPES = {
  n: '\n',
  f: '\f',
  r: '\r',
  t: '\t',
  v: '\v',
  "'": "'",
  '"': '"'
}

let OPERATORS = {
  '+': true,
  '!': true,
  '-': true,
  '*': true,
  '/': true,
  '%': true,
  '==': true,
  '!=': true,
  '===': true,
  '!==': true,
  '<': true,
  '>': true,
  '<=': true,
  '>=': true,
  '=': true,
  '&&': true,
  '||': true
}

export default class Lexer {
  constructor() {}
  lex(text) {
    this.text = text
    this.index = 0
    this.ch = undefined
    this.tokens = []
    while (this.index < this.text.length) {
      this.ch = this.text.charAt(this.index)
      if (
        this.isNumber(this.ch) ||
        (this.ch === '.' && this.isNumber(this.peek()))
      ) {
        this.readNumber()
      } else if (this.ch === "'" || this.ch === '"') {
        this.readString(this.ch)
      } else if (this.isIdent(this.ch)) {
        this.readIdent()
      } else if (this.isWhiteSpae(this.ch)) {
        this.index++
      } else if ('[,]{:}.()?'.includes(this.ch)) {
        this.tokens.push({
          text: this.ch
        })
        this.index++
      } else {
        let ch = this.ch
        let ch2 = this.ch + this.peek()
        let ch3 = this.ch + this.peek() + this.peek(2)
        let op = OPERATORS[ch]
        let op2 = OPERATORS[ch2]
        let op3 = OPERATORS[ch3]
        if (op || op2 || op3) {
          let token = op3 ? ch3 : op2 ? ch2 : ch
          this.tokens.push({ text: token })
          this.index += token.length
        } else {
          throw `Unexpected next character ${this.ch}`
        }
      }
    }
    return this.tokens
  }
  readIdent() {
    let text = ''
    while (this.index < this.text.length) {
      let ch = this.text.charAt(this.index)
      if (this.isIdent(ch) || this.isNumber(ch)) {
        text += ch
      } else {
        break
      }
      this.index++
    }
    let token = {
      text: text,
      identifier: true
    }
    this.tokens.push(token)
  }
  readString(quote) {
    this.index++
    let string = ''
    let rawString = quote
    let escape = false
    while (this.index < this.text.length) {
      let ch = this.text.charAt(this.index)
      rawString += ch
      if (escape) {
        if (ch === 'u') {
          let hex = this.text.substring(this.index + 1, this.index + 5)
          if (!hex.match(/[\da-f]{4}/i)) {
            throw 'Invalid unicode escape'
          }
          this.index += 4
          string += String.fromCharCode(parseInt(hex, 16))
        } else {
          let replacement = ESCAPES[ch]
          if (replacement) {
            string += replacement
          } else {
            string += ch
          }
        }
        escape = false
      } else if (ch === quote) {
        this.index++
        this.tokens.push({
          value: string,
          text: rawString
        })
        return
      } else if (ch === '\\') {
        escape = true
      } else {
        string += ch
      }

      this.index++
    }
    throw 'Unmatched quote'
  }
  readNumber() {
    let number = ''
    while (this.index < this.text.length) {
      let ch = this.text.charAt(this.index).toLowerCase()
      if (ch === '.' || this.isNumber(ch)) {
        number += ch
      } else {
        let nextCh = this.peek()
        let prevCh = number.charAt(number.length - 1)
        if (ch === 'e' && this.isExpOperator(nextCh)) {
          number += ch
        } else if (
          this.isExpOperator(ch) &&
          prevCh === 'e' &&
          nextCh &&
          this.isNumber(nextCh)
        ) {
          number += ch
        } else if (
          this.isExpOperator(ch) &&
          prevCh === 'e' &&
          (!nextCh || !this.isNumber(nextCh))
        ) {
          throw 'Invalid exponent'
        } else {
          break
        }
      }
      this.index++
    }
    this.tokens.push({ text: number, value: Number(number) })
  }
  peek(n) {
    n = n || 1
    return this.index + n < this.text.length
      ? this.text.charAt(this.index + n)
      : false
  }
  isExpOperator(ch) {
    return '-+'.includes(ch) || this.isNumber(ch)
  }
  isNumber(ch) {
    return '0123456789'.includes(ch)
  }
  isIdent(ch) {
    return (
      (ch >= 'a' && ch <= 'z') ||
      (ch >= 'A' && ch <= 'Z') ||
      ch === '_' ||
      ch === '$'
    )
  }
  isWhiteSpae(ch) {
    return (
      ch === ' ' ||
      ch === '\r' ||
      ch === '\t' ||
      ch === '\n' ||
      ch === '\v' ||
      ch === '\u00A0'
    )
  }
}
