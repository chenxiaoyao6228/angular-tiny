function times(n, iterator) {
  let accum = Array(Math.max(0, n))
  for (let i = 0; i < n; i++) accum[i] = iterator.call(null, i)
  return accum
}

export default {
  times
}
