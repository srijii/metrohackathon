import React from 'react'
import { Box, Text } from 'ink'
import TextInput from 'ink-text-input'
import { colors } from '../utils/colors.js'

type CommandInputProps = {
  cwd: string
  value: string
  disabled: boolean
  onChange: (value: string) => void
  onSubmit: (value: string) => void
}

function CommandInput({ cwd, disabled, onChange, onSubmit, value }: CommandInputProps) {
  return (
    <Box flexDirection="column" borderStyle="round" borderColor={colors.border} paddingX={1}>
      <Text color={colors.muted}>Working directory</Text>
      <Text color={colors.success}>{cwd}</Text>
      <Box marginTop={1}>
        <Text color={colors.primary} bold>
          {'> '}
        </Text>
        {disabled ? (
          <Text color={colors.muted}>Planning...</Text>
        ) : (
          <TextInput
            value={value}
            placeholder="create auth api using express and jwt"
            onChange={onChange}
            onSubmit={onSubmit}
          />
        )}
      </Box>
    </Box>
  )
}

export default CommandInput
