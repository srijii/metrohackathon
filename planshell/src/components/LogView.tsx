import React from 'react'
import { Box, Text } from 'ink'
import { colors } from '../utils/colors.js'
import { truncate } from '../utils/text.js'

type LogViewProps = {
  logs: string[]
  maxLines?: number
}

function LogView({ logs, maxLines = 8 }: LogViewProps) {
  const visibleLogs = logs.slice(-maxLines)

  return (
    <Box flexDirection="column">
      <Text color={colors.primary} bold>
        ◇ Output
      </Text>
      {visibleLogs.length === 0 ? (
        <Text color={colors.muted}>│ No commands have run yet.</Text>
      ) : (
        visibleLogs.map((line, index) => (
          <Text key={`${line}-${index}`} color={line.includes('[x]') ? colors.danger : undefined}>
            │ {truncate(line, 100)}
          </Text>
        ))
      )}
    </Box>
  )
}

export default LogView
