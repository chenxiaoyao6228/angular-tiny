let arr = ['return ', false, ';']
let str = arr.join('')
console.log(str)
let fn = new Function(arr.join(''))
console.log(fn() === null)
console.log(null === null)
