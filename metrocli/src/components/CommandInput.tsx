import React from 'react'
import { Box, Text } from 'ink'
import TextInput from 'ink-text-input'
import { colors } from '../utils/colors.js'
import { stripControlCharacters, truncate } from '../utils/text.js'

type CommandInputProps = {
  compact?: boolean
  cwd: string
  value: string
  disabled: boolean
  statusLabel: string
  onChange: (value: string) => void
  onSubmit: (value: string) => void
}

function CommandInput({ compact = false, cwd, disabled, onChange, onSubmit, statusLabel, value }: CommandInputProps) {
  return (
    <Box flexDirection="column" borderStyle="round" borderColor={colors.primary} paddingX={1}>
      <Box justifyContent="space-between">
        <Text color={colors.muted}>Prompt</Text>
        {!compact ? <Text color={colors.success}>{truncate(cwd, 44)}</Text> : null}
      </Box>
      <Box>
        <Text color={colors.primary} bold>
          {'> '}
        </Text>
        {disabled ? (
          <Text color={colors.muted}>{statusLabel}</Text>
        ) : (
          <TextInput
            value={value}
            placeholder="create auth api using express and jwt"
            onChange={(nextValue) => onChange(stripControlCharacters(nextValue))}
            onSubmit={(nextValue) => onSubmit(stripControlCharacters(nextValue))}
          />
        )}
      </Box>
    </Box>
  )
}

export default CommandInput
