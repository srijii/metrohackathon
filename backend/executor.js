import { readdir, stat } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import os from 'node:os'
import { basename, extname, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ALLOWED_COMMANDS, planSchema } from './planner.js'

const BLOCKED_ARGS = [
  'rm',
  'sudo',
  'su',
  'mkfs',
  'dd',
  'chmod -R',
  'chown -R',
  '&&',
  ';',
  '|',
  '>',
  '<',
  '$(',
  '`',
]

const HIGH_RISK_COMMANDS = new Set(['git reset --hard'])
const safeRoot = resolve(fileURLToPath(new URL('..', import.meta.url)))

function resolveCwd(cwd = '.') {
  const next = resolve(safeRoot, cwd)
  const relativePath = relative(safeRoot, next)

  if (relativePath === '..' || relativePath.startsWith('../')) {
    throw new Error('Directory is outside the allowed workspace.')
  }

  return {
    absolute: next,
    relative: relativePath || '.',
  }
}

export async function getContext(cwd = '.') {
  const current = resolveCwd(cwd)
  const entries = await readdir(current.absolute, { withFileTypes: true })
  const files = await Promise.all(
    entries
      .filter((entry) => entry.name !== 'node_modules' && entry.name !== '.git')
      .map(async (entry) => {
        const fullPath = resolve(current.absolute, entry.name)
        const info = await stat(fullPath)
        return {
          name: entry.name,
          path: relative(safeRoot, fullPath) || '.',
          type: entry.isDirectory() ? 'folder' : 'file',
          extension: entry.isFile() ? extname(entry.name) : '',
          size: info.size,
          updatedAt: info.mtime.toISOString(),
        }
      }),
  )

  return {
    platform: process.platform,
    os: `${os.type()} ${os.release()}`,
    shell: process.env.SHELL || 'unknown',
    cwd: current.relative,
    cwdName: basename(current.absolute),
    absoluteCwd: current.absolute,
    safeRoot,
    allowedCommands: ALLOWED_COMMANDS,
    entries: files.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'folder' ? -1 : 1
      return a.name.localeCompare(b.name)
    }),
  }
}

function renderCommand(command) {
  return [command.command, ...command.args].join(' ')
}

function validateCommand(command) {
  if (!ALLOWED_COMMANDS.includes(command.command)) {
    throw new Error(`Blocked executable: ${command.command}`)
  }

  const rendered = renderCommand(command)
  const lowered = rendered.toLowerCase()

  for (const blocked of BLOCKED_ARGS) {
    if (lowered.includes(blocked.toLowerCase())) {
      throw new Error(`Blocked unsafe command content: ${blocked}`)
    }
  }

  if (HIGH_RISK_COMMANDS.has(lowered)) {
    throw new Error(`Blocked high-risk command: ${rendered}`)
  }

  resolveCwd(command.cwd)
}

async function assertDirectory(cwd) {
  const info = await stat(cwd.absolute)
  if (!info.isDirectory()) {
    throw new Error('Target is not a directory.')
  }
}

async function runCommand(command) {
  validateCommand(command)

  if (command.command === 'cd') {
    const target = command.args[0] || '.'
    const base = resolveCwd(command.cwd)
    const next = resolveCwd(relative(safeRoot, resolve(base.absolute, target)))
    await assertDirectory(next)

    return {
      id: command.id,
      command: renderCommand(command),
      exitCode: 0,
      nextCwd: next.relative,
      logs: [`$ ${renderCommand(command)}`, `✓ Changed directory to ${next.relative}`],
    }
  }

  return new Promise((resolveCommand) => {
    const logs = [`$ ${renderCommand(command)}`]
    const child = spawn(command.command, command.args, {
      cwd: resolveCwd(command.cwd).absolute,
      shell: false,
      env: process.env,
    })

    child.stdout.on('data', (chunk) => {
      logs.push(...chunk.toString().split('\n').filter(Boolean))
    })

    child.stderr.on('data', (chunk) => {
      logs.push(...chunk.toString().split('\n').filter(Boolean).map((line) => `stderr: ${line}`))
    })

    child.on('error', (error) => {
      logs.push(`failed: ${error.message}`)
      resolveCommand({
        id: command.id,
        command: renderCommand(command),
        exitCode: 1,
        logs,
      })
    })

    child.on('close', (code) => {
      logs.push(code === 0 ? '✓ Done' : `Exited with code ${code}`)
      resolveCommand({
        id: command.id,
        command: renderCommand(command),
        exitCode: code,
        logs,
      })
    })
  })
}

export async function executePlan(plan) {
  const parsed = planSchema.parse(plan)

  if (!parsed.requiresApproval) {
    throw new Error('Execution requires explicit approval.')
  }

  if (parsed.riskLevel === 'high') {
    throw new Error('High-risk plans are preview-only in this MVP.')
  }

  const logs = [
    'Approval received.',
    'Validating command plan...',
    'Executing commands with shell disabled.',
  ]
  const results = []

  for (const command of parsed.commands) {
    logs.push(`Plan step: ${command.title}`)
    logs.push(`Reason: ${command.explanation}`)
    const result = await runCommand(command)
    results.push(result)
    logs.push(...result.logs)

    if (result.exitCode !== 0) {
      logs.push('Stopping because a command failed.')
      break
    }
  }

  return {
    logs,
    results,
    success: results.every((result) => result.exitCode === 0),
    cwd: [...results].reverse().find((result) => result.nextCwd)?.nextCwd || parsed.commands.at(-1)?.cwd || '.',
  }
}
