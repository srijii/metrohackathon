import React from 'react'
import { Box, Text } from 'ink'
import SelectInput from 'ink-select-input'
import type { CommandPlan } from '../state/app.js'
import { colors } from '../utils/colors.js'
import { renderCommand } from '../utils/logger.js'

type ApprovalDialogProps = {
  plan: CommandPlan
  onApprove: () => void
  onCancel: () => void
}

type ActionItem = {
  label: string
  value: 'approve' | 'cancel'
}

function ApprovalDialog({ onApprove, onCancel, plan }: ApprovalDialogProps) {
  const isHighRisk = plan.riskLevel === 'high'
  const items: ActionItem[] = isHighRisk
    ? [{ label: 'Cancel - high-risk plan is blocked', value: 'cancel' }]
    : [
        { label: 'Approve and execute', value: 'approve' },
        { label: 'Cancel', value: 'cancel' },
      ]

  function handleSelect(item: ActionItem) {
    if (item.value === 'approve') onApprove()
    else onCancel()
  }

  return (
    <Box flexDirection="column" borderStyle="double" borderColor={isHighRisk ? colors.danger : colors.warning} paddingX={1}>
      <Text color={colors.warning} bold>
        Review before execution
      </Text>
      <Text>{plan.summary}</Text>
      <Text>
        Risk: <Text color={isHighRisk ? colors.danger : colors.warning}>{plan.riskLevel}</Text>
      </Text>

      {plan.warnings.map((warning) => (
        <Text key={warning} color={colors.danger}>
          [!] {warning}
        </Text>
      ))}

      <Box flexDirection="column" marginTop={1}>
        {plan.commands.map((command, index) => (
          <Box key={command.id} flexDirection="column" marginBottom={1}>
            <Text>
              {index + 1}. <Text bold>{command.title}</Text>
            </Text>
            <Text color={colors.primary}>$ {renderCommand(command.command, command.args)}</Text>
            <Text color={colors.muted}>cwd: {command.cwd}</Text>
            <Text color={colors.muted}>{command.explanation}</Text>
          </Box>
        ))}
      </Box>

      <SelectInput items={items} onSelect={handleSelect} />
    </Box>
  )
}

export default ApprovalDialog
