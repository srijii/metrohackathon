export function truncate(value: string, max = 72) {
  const clean = cleanText(value)
  if (clean.length <= max) return clean
  if (max <= 3) return clean.slice(0, max)
  return `${clean.slice(0, max - 3)}...`
}

export function compactPath(root: string, path: string, max = 52) {
  const relative = path === root ? '.' : path.replace(`${root}/`, '')
  return truncate(relative, max)
}

export function stripControlCharacters(value: string) {
  return value.replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, '')
}

export function stripAnsi(value: string) {
  return value.replace(/\u001B\[[0-?]*[ -/]*[@-~]/g, '')
}

export function cleanText(value: string) {
  return stripControlCharacters(stripAnsi(value)).replace(/\s+/g, ' ').trim()
}
