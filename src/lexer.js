let ESCAPES = {
  n: '\n',
  f: '\f',
  r: '\r',
  t: '\t',
  v: '\v',
  "'": "'",
  '"': '"'
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
      } else {
        throw `Unexpected next character ${this.ch}`
      }
    }
    return this.tokens
  }
  readString(quote) {
    this.index++
    let string = ''
    let escape = false
    while (this.index < this.text.length) {
      let ch = this.text.charAt(this.index)
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
          text: string,
          value: string
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
  peek() {
    return this.index < this.text.length - 1
      ? this.text.charAt(this.index + 1)
      : false
  }
  isExpOperator(ch) {
    return '-+'.includes(ch) || this.isNumber(ch)
  }
  isNumber(ch) {
    return '0123456789'.includes(ch)
  }
}
