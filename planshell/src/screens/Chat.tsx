import React from 'react'
import CommandInput from '../components/CommandInput.js'

type ChatProps = {
  compact?: boolean
  cwd: string
  disabled: boolean
  input: string
  statusLabel: string
  onChange: (value: string) => void
  onSubmit: (value: string) => void
}

function Chat({ compact, cwd, disabled, input, onChange, onSubmit, statusLabel }: ChatProps) {
  return (
    <CommandInput
      compact={compact}
      cwd={cwd}
      disabled={disabled}
      statusLabel={statusLabel}
      value={input}
      onChange={onChange}
      onSubmit={onSubmit}
    />
  )
}

export default Chat
