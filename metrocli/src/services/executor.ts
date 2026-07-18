import { relative } from 'node:path'
import { execa } from 'execa'
import type { CommandPlan, ExecutionResult } from '../state/app.js'
import { allowedCommands, planSchema } from './planner.js'
import { resolveInsideRoot } from './project.js'
import { renderCommand } from '../utils/logger.js'
import { cleanText } from '../utils/text.js'

const blockedArgs = ['rm', 'sudo', 'su', 'mkfs', 'dd', 'chmod -R', 'chown -R', '&&', ';', '|', '>', '<', '$(', '`']

function validate(command: CommandPlan['commands'][number]) {
  if (!allowedCommands.includes(command.command as (typeof allowedCommands)[number])) {
    throw new Error(`Blocked executable: ${command.command}`)
  }

  const rendered = renderCommand(command.command, command.args).toLowerCase()
  for (const blocked of blockedArgs) {
    if (rendered.includes(blocked.toLowerCase())) {
      throw new Error(`Blocked unsafe command content: ${blocked}`)
    }
  }
}

export async function executePlan(root: string, plan: CommandPlan): Promise<{ cwd: string; logs: string[]; results: ExecutionResult[] }> {
  const parsed = planSchema.parse(plan)

  if (parsed.riskLevel === 'high') {
    throw new Error('High-risk plans are preview-only and cannot be executed.')
  }

  let cwd = parsed.commands[0]?.cwd || root
  const logs = ['Approval received.', 'Validating command plan.']
  const results: ExecutionResult[] = []

  for (const command of parsed.commands) {
    validate(command)
    logs.push(`Plan step: ${command.title}`)
    logs.push(`Reason: ${command.explanation}`)

    if (command.command === 'cd') {
      cwd = resolveInsideRoot(root, command.cwd, command.args[0] || '.')
      const relativeCwd = relative(root, cwd) || '.'
      const result = {
        id: command.id,
        command: renderCommand(command.command, command.args),
        exitCode: 0,
        nextCwd: cwd,
        logs: [`$ ${renderCommand(command.command, command.args)}`, `[ok] Changed directory to ${relativeCwd}`],
      }
      results.push(result)
      logs.push(...result.logs)
      continue
    }

    const runCwd = resolveInsideRoot(root, command.cwd)
    const output = await execa(command.command, command.args, {
      cwd: runCwd,
      reject: false,
      all: true,
      timeout: 120000,
    })

    const result = {
      id: command.id,
      command: renderCommand(command.command, command.args),
      exitCode: output.exitCode ?? 1,
      logs: [
        `$ ${renderCommand(command.command, command.args)}`,
        ...(output.all?.split('\n').map(cleanText).filter(Boolean) || []),
        output.exitCode === 0 ? '[ok] Done' : `[x] Exited with code ${output.exitCode}`,
      ],
    }

    results.push(result)
    logs.push(...result.logs)

    if (result.exitCode !== 0) {
      logs.push('Stopping because a command failed.')
      break
    }

    cwd = runCwd
  }

  return { cwd, logs, results }
}
