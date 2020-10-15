export function hashKey(value) {
  let type = typeof value
  return `${type}:${value}`
}
