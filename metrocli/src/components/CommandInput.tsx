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
    <Box flexDirection="column">
      {!compact ? (
        <Text color={colors.muted}>cwd {truncate(cwd, 60)}</Text>
      ) : null}
      <Box>
        <Text color={colors.primary} bold>
          {'❯ '}
        </Text>
        {disabled ? (
          <Text color={colors.muted}>{statusLabel}</Text>
        ) : (
          <TextInput
            value={value}
            placeholder=""
            onChange={(nextValue) => onChange(stripControlCharacters(nextValue))}
            onSubmit={(nextValue) => onSubmit(stripControlCharacters(nextValue))}
          />
        )}
      </Box>
    </Box>
  )
}

export default CommandInput
