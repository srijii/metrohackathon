export function renderCommand(command: string, args: string[] = []) {
  return [command, ...args].filter(Boolean).join(' ')
}

export function nowLog(message: string) {
  return `${new Date().toLocaleTimeString()} ${message}`
}
