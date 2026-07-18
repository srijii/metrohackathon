import React from 'react'
import CommandInput from '../components/CommandInput.js'

type ChatProps = {
  cwd: string
  disabled: boolean
  input: string
  onChange: (value: string) => void
  onSubmit: (value: string) => void
}

function Chat({ cwd, disabled, input, onChange, onSubmit }: ChatProps) {
  return (
    <CommandInput
      cwd={cwd}
      disabled={disabled}
      value={input}
      onChange={onChange}
      onSubmit={onSubmit}
    />
  )
}

export default Chat
