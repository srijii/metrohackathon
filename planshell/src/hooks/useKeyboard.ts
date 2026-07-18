import { useApp, useInput } from 'ink'

type KeyboardOptions = {
  hasPlan?: boolean
  onApprove?: () => void
  onCancel?: () => void
  onClearLogs: () => void
  onClearPrompt?: () => void
  onNextHistory?: () => void
  onPreviousHistory?: () => void
}

export function useKeyboard({
  hasPlan = false,
  onApprove,
  onCancel,
  onClearLogs,
  onClearPrompt,
  onNextHistory,
  onPreviousHistory,
}: KeyboardOptions) {
  const { exit } = useApp()

  useInput((input, key) => {
    if ((key.ctrl && input === 'd') || (key.ctrl && input === 'c')) {
      exit()
      return
    }

    if (hasPlan && key.return) {
      onApprove?.()
      return
    }

    if (hasPlan && key.escape) {
      onCancel?.()
      return
    }

    if (key.ctrl && input === 'l') {
      onClearLogs()
      return
    }

    if (key.ctrl && input === 'k') {
      onClearPrompt?.()
      return
    }

    if (key.upArrow || (key.ctrl && input === 'p')) {
      onPreviousHistory?.()
      return
    }

    if (key.downArrow || (key.ctrl && input === 'n')) {
      onNextHistory?.()
    }
  })
}
