export function truncate(value: string, max = 72) {
  if (value.length <= max) return value
  if (max <= 3) return value.slice(0, max)
  return `${value.slice(0, max - 3)}...`
}

export function compactPath(root: string, path: string, max = 52) {
  const relative = path === root ? '.' : path.replace(`${root}/`, '')
  return truncate(relative, max)
}

export function stripControlCharacters(value: string) {
  return value.replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, '')
}
