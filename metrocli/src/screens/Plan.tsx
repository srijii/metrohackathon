import React from 'react'
import { Box, Text } from 'ink'
import type { CommandPlan } from '../state/app.js'
import { colors } from '../utils/colors.js'
import { renderCommand } from '../utils/logger.js'

type PlanProps = {
  plan: CommandPlan | null
}

function Plan({ plan }: PlanProps) {
  if (!plan) {
    return (
      <Box borderStyle="round" borderColor={colors.border} paddingX={1}>
        <Text color={colors.muted}>No plan generated yet.</Text>
      </Box>
    )
  }

  return (
    <Box flexDirection="column" borderStyle="round" borderColor={colors.border} paddingX={1}>
      <Text color={colors.primary} bold>
        Planned Actions
      </Text>
      {plan.commands.map((command, index) => (
        <Box key={command.id} flexDirection="column" marginBottom={1}>
          <Text>
            {index + 1}. {command.title}
          </Text>
          <Text color={colors.primary}>$ {renderCommand(command.command, command.args)}</Text>
          <Text color={colors.muted}>{command.explanation}</Text>
        </Box>
      ))}
    </Box>
  )
}

export default Plan
