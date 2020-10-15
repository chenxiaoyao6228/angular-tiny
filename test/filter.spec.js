import utils from '../src/utils'
import parse from '../src/parser'
import { register, filter } from '../src/filter'
import { createInjector } from '../src/injector'
import { publishExternalAPI } from '../src/angular_public'

describe('filter', () => {
  beforeEach(() => {
    publishExternalAPI()
  })
  it('can be registered and obtained', () => {
    let myFilter = function() {}
    let myFilterFactory = function() {
      return myFilter
    }

    let injector = createInjector([
      'ng',
      function($filterProvider) {
        $filterProvider.register('my', myFilterFactory)
      }
    ])
    let $filter = injector.get('$filter')

    expect($filter('my')).toBe(myFilter)
  })
  it('allows registering multiple filters with an object', () => {
    let myFilter = () => {}
    let myOtherFilter = () => {}
    let injector = createInjector([
      'ng',
      function($filterProvider) {
        $filterProvider.register({
          my: () => myFilter,
          myOther: () => myOtherFilter
        })
      }
    ])
    let $filter = injector.get('$filter')

    expect($filter('my')).toEqual(myFilter)
    expect($filter('myOther')).toEqual(myOtherFilter)
  })
  it('is available through injector', () => {
    let myFilter = function() {}
    let injector = createInjector([
      'ng',
      function($filterProvider) {
        $filterProvider.register('my', () => {
          return myFilter
        })
      }
    ])
    expect(injector.has('myFilter')).toBe(true)
    expect(injector.get('myFilter')).toBe(myFilter)
  })
  it('may have dependencies in factory', () => {
    let injector = createInjector([
      'ng',
      function($provide, $filterProvider) {
        $provide.constant('suffix', '!')
        $filterProvider.register('my', suffix => {
          return function(v) {
            return suffix + v
          }
        })
      }
    ])
    expect(injector.has('myFilter')).toBe(true)
  })

  // parse
  it('can parse filter expressions', () => {
    register('upcase', () => str => str.toUpperCase())
    let fn = parse('aString | upcase')
    expect(fn({ aString: 'Hello' })).toEqual('HELLO')
  })
  it('can parse filter chain expressions', () => {
    register('upcase', () => s => s.toUpperCase())
    register('exclamate', () => s => s + '!')
    let fn = parse('"hello" | upcase | exclamate')
    expect(fn()).toEqual('HELLO!')
  })
  it('can pass an additional argument to filters', () => {
    register('repeat', () => {
      return function(s, times) {
        return utils.repeat(s, times)
      }
    })
    let fn = parse('"hello" | repeat:3')
    expect(fn()).toEqual('hellohellohello')
  })
  it('can pass several additional arguments to filters', () => {
    register('surround', () => {
      return function(s, left, right) {
        return left + s + right
      }
    })
    let fn = parse('"hello" | surround:"*":"!"')
    expect(fn()).toEqual('*hello!')
  })
})
describe('filter filter', () => {
  it('is available', () => {
    expect(filter('filter')).toBeDefined()
  })

  it('can filter an array with a predicate function', () => {
    let fn = parse('[1, 2, 3, 4] | filter:isOdd')
    let scope = {
      isOdd: function(n) {
        return n % 2 !== 0
      }
    }
    expect(fn(scope)).toEqual([1, 3])
  })
  it('can filter an array of strings with a string', () => {
    let fn = parse('arr | filter:"a"')
    expect(fn({ arr: ['a', 'b', 'a'] })).toEqual(['a', 'a'])
  })

  it('filters an array of strings with substring matching', () => {
    let fn = parse('arr | filter:"o"')
    expect(fn({ arr: ['quick', 'brown', 'fox'] })).toEqual(['brown', 'fox'])
  })
  it('filters an array of strings ignoring case', () => {
    let fn = parse('arr | filter:"o"')
    expect(fn({ arr: ['quick', 'BROWN', 'fox'] })).toEqual(['BROWN', 'fox'])
  })
  it('filters an array of objects where any value matches', () => {
    let fn = parse('arr | filter:"o"')
    expect(
      fn({
        arr: [
          { firstName: 'John', lastName: 'Brown' },
          { firstName: 'Jane', lastName: 'Fox' },
          { firstName: 'Mary', lastName: 'Quick' }
        ]
      })
    ).toEqual([
      { firstName: 'John', lastName: 'Brown' },
      { firstName: 'Jane', lastName: 'Fox' }
    ])
  })
  it('filters an array of objects where a nested value matches', () => {
    let fn = parse('arr | filter:"o"')
    expect(
      fn({
        arr: [
          { name: { first: 'John', last: 'Brown' } },
          { name: { first: 'Jane', last: 'Fox' } },
          { name: { first: 'Mary', last: 'Quick' } }
        ]
      })
    ).toEqual([
      { name: { first: 'John', last: 'Brown' } },
      { name: { first: 'Jane', last: 'Fox' } }
    ])
  })
  it('filters an array of arrays where a nested value matches', () => {
    let fn = parse('arr | filter:"o"')
    expect(
      fn({ arr: [[{ name: 'John' }, { name: 'Mary' }], [{ name: 'Jane' }]] })
    ).toEqual([[{ name: 'John' }, { name: 'Mary' }]])
  })
  it('filters with a number', () => {
    let fn = parse('arr | filter:42')
    expect(
      fn({
        arr: [
          { name: 'Mary', age: 42 },
          { name: 'John', age: 43 },
          { name: 'Jane', age: 44 }
        ]
      })
    ).toEqual([{ name: 'Mary', age: 42 }])
  })
  it('filters with a boolean value', () => {
    let fn = parse('arr | filter:true')
    expect(
      fn({
        arr: [
          { name: 'Mary', admin: true },
          { name: 'John', admin: true },
          { name: 'Jane', admin: false }
        ]
      })
    ).toEqual([
      { name: 'Mary', admin: true },
      { name: 'John', admin: true }
    ])
  })
  it('filters with a substring numeric value', () => {
    let fn = parse('arr | filter:42')
    expect(fn({ arr: ['contains 42'] })).toEqual(['contains 42'])
  })
  it('filters matching null', () => {
    let fn = parse('arr | filter:null')
    expect(fn({ arr: [null, 'not null'] })).toEqual([null])
  })
  it('does not match undefined values', () => {
    let fn = parse('arr | filter:"undefined"')
    expect(fn({ arr: [undefined, 'undefined'] })).toEqual(['undefined'])
  })
  it('allows negating string filter', () => {
    let fn = parse('arr | filter: "!o"')
    expect(fn({ arr: ['quick', 'brown', 'fox'] })).toEqual(['quick'])
  })
  it('filters with an object', () => {
    let fn = parse('arr | filter:{name: "o"}')
    expect(
      fn({
        arr: [
          { name: 'Joe', role: 'admin' },
          { name: 'Jane', role: 'moderator' }
        ]
      })
    ).toEqual([{ name: 'Joe', role: 'admin' }])
  })
  it('must match all criteria in an object', () => {
    let fn = parse('arr | filter:{name: "o", role: "m"}')
    expect(
      fn({
        arr: [
          { name: 'Joe', role: 'admin' },
          { name: 'Jane', role: 'moderator' }
        ]
      })
    ).toEqual([{ name: 'Joe', role: 'admin' }])
  })
  it('matches everything when filtered with an empty object', () => {
    let fn = parse('arr | filter:{}')
    expect(
      fn({
        arr: [
          { name: 'Joe', role: 'admin' },
          { name: 'Jane', role: 'moderator' }
        ]
      })
    ).toEqual([
      { name: 'Joe', role: 'admin' },
      { name: 'Jane', role: 'moderator' }
    ])
  })
  it('filters with a nested object', () => {
    let fn = parse('arr | filter:{name: {first: "o"}}')
    expect(
      fn({
        arr: [
          { name: { first: 'Joe' }, role: 'admin' },
          { name: { first: 'Jane' }, role: 'moderator' }
        ]
      })
    ).toEqual([{ name: { first: 'Joe' }, role: 'admin' }])
  })
  it('allows negation when filtering with an object', () => {
    let fn = parse('arr | filter:{name: {first: "!o"}}')
    expect(
      fn({
        arr: [
          { name: { first: 'Joe' }, role: 'admin' },
          { name: { first: 'Jane' }, role: 'moderator' }
        ]
      })
    ).toEqual([{ name: { first: 'Jane' }, role: 'moderator' }])
  })
  it('ignores undefined values in expectation object', () => {
    let fn = parse('arr | filter:{name: thisIsUndefined}')
    expect(
      fn({
        arr: [
          { name: 'Joe', role: 'admin' },
          { name: 'Jane', role: 'moderator' }
        ]
      })
    ).toEqual([
      { name: 'Joe', role: 'admin' },
      { name: 'Jane', role: 'moderator' }
    ])
  })
  it('filters with a nested object in array', () => {
    let fn = parse('arr | filter:{users: {name: {first: "o"}}}')
    expect(
      fn({
        arr: [
          {
            users: [
              { name: { first: 'Joe' }, role: 'admin' },
              { name: { first: 'Jane' }, role: 'moderator' }
            ]
          },
          { users: [{ name: { first: 'Mary' }, role: 'admin' }] }
        ]
      })
    ).toEqual([
      {
        users: [
          { name: { first: 'Joe' }, role: 'admin' },
          { name: { first: 'Jane' }, role: 'moderator' }
        ]
      }
    ])
  })
  it('filters with nested objects on the same level only', () => {
    let items = [
      { user: 'Bob' },
      { user: { name: 'Bob' } },
      { user: { name: { first: 'Bob', last: 'Fox' } } }
    ]
    let fn = parse('arr | filter:{user: {name: "Bob"}}')
    expect(
      fn({
        arr: [
          { user: 'Bob' },
          { user: { name: 'Bob' } },
          { user: { name: { first: 'Bob', last: 'Fox' } } }
        ]
      })
    ).toEqual([{ user: { name: 'Bob' } }])
  })
  it('filters with a wildcard property', () => {
    let fn = parse('arr | filter:{$: "o"}')
    expect(
      fn({
        arr: [
          { name: 'Joe', role: 'admin' },
          { name: 'Jane', role: 'moderator' },
          { name: 'Mary', role: 'admin' }
        ]
      })
    ).toEqual([
      { name: 'Joe', role: 'admin' },
      { name: 'Jane', role: 'moderator' }
    ])
  })
  it('filters nested objects with a wildcard property', () => {
    let fn = parse('arr | filter:{$: "o"}')
    expect(
      fn({
        arr: [
          { name: { first: 'Joe' }, role: 'admin' },
          { name: { first: 'Jane' }, role: 'moderator' },
          { name: { first: 'Mary' }, role: 'admin' }
        ]
      })
    ).toEqual([
      { name: { first: 'Joe' }, role: 'admin' },
      { name: { first: 'Jane' }, role: 'moderator' }
    ])
  })
  it('filters wildcard properties scoped to parent', () => {
    let fn = parse('arr | filter:{name: {$: "o"}}')
    expect(
      fn({
        arr: [
          { name: { first: 'Joe', last: 'Fox' }, role: 'admin' },
          { name: { first: 'Jane', last: 'Quick' }, role: 'moderator' },
          { name: { first: 'Mary', last: 'Brown' }, role: 'admin' }
        ]
      })
    ).toEqual([
      { name: { first: 'Joe', last: 'Fox' }, role: 'admin' },
      { name: { first: 'Mary', last: 'Brown' }, role: 'admin' }
    ])
  })
  it('filters primitives with a wildcard property', () => {
    let fn = parse('arr | filter:{$: "o"}')
    expect(fn({ arr: ['Joe', 'Jane', 'Mary'] })).toEqual(['Joe'])
  })
  it('filters with a nested wildcard property', () => {
    let fn = parse('arr | filter:{$: {$: "o"}}')
    expect(
      fn({
        arr: [
          { name: { first: 'Joe' }, role: 'admin' },
          { name: { first: 'Jane' }, role: 'moderator' },
          { name: { first: 'Mary' }, role: 'admin' }
        ]
      })
    ).toEqual([{ name: { first: 'Joe' }, role: 'admin' }])
  })
  it('allows using a custom comparator', () => {
    let fn = parse('arr | filter:{$: "o"}:myComparator')
    expect(
      fn({
        arr: ['o', 'oo', 'ao', 'aa'],
        myComparator: function(left, right) {
          return left === right
        }
      })
    ).toEqual(['o'])
  })
  it('allows using an equality comparator', () => {
    let fn = parse('arr | filter:{name: "Jo"}:true')
    expect(fn({ arr: [{ name: 'Jo' }, { name: 'Joe' }] })).toEqual([
      { name: 'Jo' }
    ])
  })
  it('returns the function itself when gives one', () => {
    let fn = function() {}
    expect(parse(fn)).toEqual(fn)
  })
  it('still returns a function when given no arguments', () => {
    expect(parse()).toEqual(expect.any(Function))
  })
  it('marks integers literal', () => {
    let fn = parse('42')
    expect(fn.literal).toEqual(true)
  })
  it('marks strings literal', () => {
    let fn = parse('"abc"')
    expect(fn.literal).toEqual(true)
  })
  it('marks booleans literal', () => {
    let fn = parse('true')
    expect(fn.literal).toEqual(true)
  })
  it('marks arrays literal', () => {
    let fn = parse('[1, 2, aVariable]')
    expect(fn.literal).toBe(true)
  })
  it('marks objects literal', () => {
    let fn = parse('{a: 1, b: aVariable}')
    expect(fn.literal).toBe(true)
  })
  it('marks unary expressions non-literal', () => {
    let fn = parse('!false')
    expect(fn.literal).toBe(false)
  })
  it('marks binary expressions non-literal', () => {
    let fn = parse('1 + 2')
    expect(fn.literal).toBe(false)
  })
  it('marks integers constant', () => {
    let fn = parse('42')
    expect(fn.constant).toEqual(true)
  })
  it('marks strings constant', () => {
    let fn = parse('"abc"')
    expect(fn.constant).toEqual(true)
  })
  it('marks booleans constant', () => {
    let fn = parse('true')
    expect(fn.constant).toEqual(true)
  })
  it('marks identifiers non-constant', () => {
    let fn = parse('a')
    expect(fn.constant).toBe(false)
  })
  it('marks arrays constant when elements are constant', () => {
    expect(parse('[1, 2, 3]').constant).toBe(true)
    expect(parse('[1, [2, [3]]]').constant).toBe(true)
    expect(parse('[1, 2, a]').constant).toBe(false)
    expect(parse('[1, [2, [a]]]').constant).toBe(false)
  })
  it('marks objects constant when values are constant', () => {
    expect(parse('{a: 1, b: 2}').constant).toBe(true)
    expect(parse('{a: 1, b: {c: 3}}').constant).toBe(true)
    expect(parse('{a: 1, b: something}').constant).toBe(false)
    expect(parse('{a: 1, b: {c: something}}').constant).toBe(false)
  })
  it('marks this as non-constant', () => {
    expect(parse('this').constant).toBe(false)
  })
  it('marks non-computed lookup constant when object is constant', () => {
    let fn = parse('{a: 1}.a')
    expect(fn.constant).toBe(true)
    expect(parse('obj.a').constant).toBe(false)
  })
  it('marks computed lookup constant when object and key are', () => {
    expect(parse('{a: 1}["a"]').constant).toBe(true)
    expect(parse('obj["a"]').constant).toBe(false)
    expect(parse('{a: 1}[something]').constant).toBe(false)
    expect(parse('obj[something]').constant).toBe(false)
  })
  it('marks function calls non-constant', () => {
    expect(parse('aFunction()').constant).toBe(false)
  })
  it('marks filters constant if arguments are', () => {
    register('aFilter', () => {
      return value => value
    })
    expect(parse('[1, 2, 3] | aFilter').constant).toBe(true)
    expect(parse('[1, 2, a] | aFilter').constant).toBe(false)
    expect(parse('[1, 2, 3] | aFilter:42').constant).toBe(true)
    expect(parse('[1, 2, 3] | aFilter:a').constant).toBe(false)
  })
  it('marks assignments constant when both sides are', () => {
    expect(parse('1 = 2').constant).toBe(true)
    expect(parse('a = 2').constant).toBe(false)
    expect(parse('1 = b').constant).toBe(false)
    expect(parse('a = b').constant).toBe(false)
  })
  it('marks unaries constant when arguments are constant', () => {
    expect(parse('+42').constant).toBe(true)
    expect(parse('+a').constant).toBe(false)
  })
  it('marks binaries constant when both arguments are constant', () => {
    expect(parse('1 + 2').constant).toBe(true)
    expect(parse('1 + 2').literal).toBe(false)
    expect(parse('1 + a').constant).toBe(false)
    expect(parse('a + 1').constant).toBe(false)
    expect(parse('a + a').constant).toBe(false)
  })
  it('marks logicals constant when both arguments are constant', () => {
    expect(parse('true && false').constant).toBe(true)
    expect(parse('true && false').literal).toBe(false)
    expect(parse('true && a').constant).toBe(false)
    expect(parse('a && false').constant).toBe(false)
    expect(parse('a && b').constant).toBe(false)
  })
  it('marks ternaries constant when all arguments are', () => {
    expect(parse('true ? 1 : 2').constant).toBe(true)
    expect(parse('a ? 1 : 2').constant).toBe(false)
    expect(parse('true ? a : 2').constant).toBe(false)
    expect(parse('true ? 1 : b').constant).toBe(false)
    expect(parse('a ? b : c').constant).toBe(false)
  })
})
