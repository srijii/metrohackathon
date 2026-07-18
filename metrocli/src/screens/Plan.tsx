import React from 'react'
import { Box, Text } from 'ink'
import type { CommandPlan } from '../state/app.js'
import { colors } from '../utils/colors.js'
import { renderCommand } from '../utils/logger.js'
import { truncate } from '../utils/text.js'

type PlanProps = {
  compact?: boolean
  plan: CommandPlan | null
}

function Plan({ compact = false, plan }: PlanProps) {
  if (!plan) {
    return (
      <Box borderStyle="round" borderColor={colors.border} paddingX={1}>
        <Text color={colors.muted}>No plan generated yet.</Text>
      </Box>
    )
  }

  return (
    <Box flexDirection="column" borderStyle="round" borderColor={colors.border} paddingX={1}>
      <Box justifyContent="space-between">
        <Text color={colors.primary} bold>
          Execution Plan
        </Text>
        <Text color={plan.riskLevel === 'high' ? colors.danger : colors.success}>
          {riskLabel(plan.riskLevel)} | {plan.confidence.score}%
        </Text>
      </Box>
      <Text>{truncate(plan.summary, 74)}</Text>
      {plan.confidence.reasons.slice(0, compact ? 1 : 3).map((reason) => (
        <Text key={reason} color={colors.muted}>[ok] {truncate(reason, 68)}</Text>
      ))}
      {plan.warnings.map((warning) => (
        <Text key={warning} color={colors.danger}>
          [!] {truncate(warning, 70)}
        </Text>
      ))}

      {plan.rejection && !compact ? (
        <Box flexDirection="column" marginTop={1}>
          <Text color={colors.danger} bold>
            Why Not
          </Text>
          <Text>Reason: {truncate(plan.rejection.reason, 68)}</Text>
          <Text>Policy: {truncate(plan.rejection.policy, 68)}</Text>
          <Text>Alternative: {truncate(plan.rejection.alternative, 68)}</Text>
        </Box>
      ) : null}

      <Box flexDirection="column" marginTop={1}>
        <Text color={colors.primary} bold>
          What Will Happen
        </Text>
        <Text>
          {plan.simulation.estimatedSeconds}s | network {plan.simulation.networkRequired ? 'yes' : 'no'} | rollback {plan.rollback?.available ? 'yes' : 'no'}
        </Text>
        {plan.simulation.filesCreated.length > 0 ? (
          <Text color={colors.success}>+ {truncate(plan.simulation.filesCreated.join(', '), 70)}</Text>
        ) : null}
        {plan.simulation.filesModified.length > 0 ? (
          <Text color={colors.warning}>~ {truncate(plan.simulation.filesModified.join(', '), 70)}</Text>
        ) : null}
        {plan.simulation.filesDeleted.length > 0 ? (
          <Text color={colors.danger}>- {truncate(plan.simulation.filesDeleted.join(', '), 70)}</Text>
        ) : null}
      </Box>

      {plan.diffPreview.length > 0 && !compact ? (
        <Box flexDirection="column" marginTop={1}>
          <Text color={colors.primary} bold>
            Diff Preview
          </Text>
          {plan.diffPreview.slice(0, 3).map((preview) => (
            <Box key={`${preview.kind}-${preview.path}`} flexDirection="column" marginBottom={1}>
              <Text color={preview.kind === 'delete' ? colors.danger : preview.kind === 'modify' ? colors.warning : colors.success}>
                {preview.kind === 'create' ? '+' : preview.kind === 'modify' ? '~' : '-'} {truncate(preview.path, 64)}
              </Text>
              {preview.lines.slice(0, 3).map((line) => (
                <Text key={`${preview.path}-${line}`} color={line.startsWith('-') ? colors.danger : colors.muted}>
                  {truncate(line, 70)}
                </Text>
              ))}
            </Box>
          ))}
        </Box>
      ) : null}

      {plan.commands.slice(0, compact ? 2 : 6).map((command, index) => (
        <Box key={command.id} flexDirection="column" marginBottom={1}>
          <Text>
            [ok] {index + 1}. {command.title}
          </Text>
          <Text color={colors.primary}>$ {truncate(renderCommand(command.command, command.args), 70)}</Text>
          <Text color={colors.muted}>{truncate(command.explanation, 70)}</Text>
        </Box>
      ))}
      {compact && plan.commands.length > 2 ? (
        <Text color={colors.muted}>... {plan.commands.length - 2} more commands</Text>
      ) : null}
      <Text color={plan.riskLevel === 'high' ? colors.danger : colors.success}>
        {plan.riskLevel === 'high'
          ? 'High-risk plan blocked. Press Esc to cancel.'
          : 'Press Enter to approve. Press Esc to cancel.'}
      </Text>
    </Box>
  )
}

function riskLabel(risk: CommandPlan['riskLevel']) {
  if (risk === 'low') return 'Safe'
  if (risk === 'medium') return 'Changes project'
  return 'Blocked'
}

export default Plan
