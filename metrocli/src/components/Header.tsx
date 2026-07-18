import React from 'react'
import { Box, Text } from 'ink'
import type { ProjectContext } from '../state/app.js'
import { colors } from '../utils/colors.js'
import { truncate } from '../utils/text.js'

type HeaderProps = {
  context: ProjectContext | null
}

function Header({ context }: HeaderProps) {
  return (
    <Box flexDirection="column" borderStyle="round" borderColor={colors.primary} paddingX={1}>
      <Box justifyContent="space-between">
        <Text color={colors.primary} bold>
          MetroCLI AI
        </Text>
        <Text color={colors.muted}>Node + Ink</Text>
      </Box>
      <Box marginTop={1} justifyContent="space-between">
        <Text>
          Project: <Text bold>{truncate(context?.projectName || 'loading', 24)}</Text>
        </Text>
        <Text>
          Branch: <Text color={colors.success}>{truncate(context?.branch || 'checking', 24)}</Text>
        </Text>
      </Box>
    </Box>
  )
}

export default Header
