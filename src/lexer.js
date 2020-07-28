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
      } else {
        throw `Unexpected next character ${this.ch}`
      }
    }
    return this.tokens
  }
  isNumber(ch) {
    return '0123456789'.includes(ch)
  }
  readNumber() {
    let number = ''
    while (this.index < this.text.length) {
      let ch = this.text.charAt(this.index)
      if (this.isNumber(ch) || ch === '.') {
        number += ch
      } else {
        break
      }
      this.index++
    }
    this.tokens.push({
      text: number,
      value: Number(number)
    })
  }
  peek() {
    return this.index < this.text.length - 1
      ? this.text.charAt(this.index + 1)
      : false
  }
}
