import React from 'react'
import { Box, Text } from 'ink'
import { colors } from '../utils/colors.js'

type LogViewProps = {
  logs: string[]
}

function LogView({ logs }: LogViewProps) {
  const visibleLogs = logs.slice(-14)

  return (
    <Box flexDirection="column" borderStyle="round" borderColor={colors.border} paddingX={1}>
      <Text color={colors.primary} bold>
        Terminal Log
      </Text>
      {visibleLogs.length === 0 ? (
        <Text color={colors.muted}>No commands have run yet.</Text>
      ) : (
        visibleLogs.map((line, index) => (
          <Text key={`${line}-${index}`} color={line.includes('[x]') ? colors.danger : undefined}>
            {line}
          </Text>
        ))
      )}
    </Box>
  )
}

export default LogView
