import { useApp, useInput } from 'ink'

type KeyboardOptions = {
  onClearLogs: () => void
}

export function useKeyboard({ onClearLogs }: KeyboardOptions) {
  const { exit } = useApp()

  useInput((input, key) => {
    if (input === 'q' || key.ctrl && input === 'c') {
      exit()
      return
    }

    if (key.ctrl && input === 'l') {
      onClearLogs()
    }
  })
}
