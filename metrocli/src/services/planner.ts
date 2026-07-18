import { z } from 'zod'
import type { CommandPlan, CommandStep, ProjectContext, RiskLevel } from '../state/app.js'
import { completeWithAi } from './ai.js'

export const allowedCommands = [
  'cd',
  'git',
  'python',
  'python3',
  'npm',
  'pnpm',
  'npx',
  'node',
  'docker',
  'find',
  'pwd',
  'ls',
] as const

const riskSchema = z.enum(['low', 'medium', 'high'])

const commandSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  command: z.enum(allowedCommands),
  args: z.array(z.string()).default([]),
  cwd: z.string().min(1),
  explanation: z.string().min(1),
  risk: riskSchema,
  longRunning: z.boolean().default(false),
  interactive: z.boolean().default(false),
})

export const planSchema = z.object({
  summary: z.string().min(1),
  requiresApproval: z.literal(true),
  riskLevel: riskSchema,
  warnings: z.array(z.string()).default([]),
  commands: z.array(commandSchema).min(1).max(6),
})

function step(
  index: number,
  cwd: string,
  title: string,
  command: (typeof allowedCommands)[number],
  args: string[],
  explanation: string,
  risk: RiskLevel = 'low',
  longRunning = false,
  interactive = false,
): CommandStep {
  return {
    id: `cmd_${index}`,
    title,
    command,
    args,
    cwd,
    explanation,
    risk,
    longRunning,
    interactive,
  }
}

function plan(summary: string, commands: CommandStep[], warnings: string[] = []): CommandPlan {
  const riskLevel = commands.some((item) => item.risk === 'high') || warnings.length > 0
    ? 'high'
    : commands.some((item) => item.risk === 'medium')
      ? 'medium'
      : 'low'

  return planSchema.parse({
    summary,
    requiresApproval: true,
    riskLevel,
    warnings,
    commands,
  })
}

function urlFrom(input: string) {
  return input.match(/https:\/\/[^\s]+/)?.[0]?.replace(/[),.]+$/g, '') || ''
}

function localPlan(input: string, context: ProjectContext) {
  const text = input.toLowerCase()
  const cwd = context.cwd

  if (/\b(delete|remove|wipe|erase|destroy|format|rm -rf)\b/.test(text)) {
    return plan(
      'Blocked destructive request',
      [
        step(
          1,
          cwd,
          'Show current directory instead',
          'pwd',
          [],
          'MetroCLI refuses destructive file operations in the MVP.',
          'high',
        ),
      ],
      ['Destructive terminal actions require a safer, more specific workflow.'],
    )
  }

  if (text.startsWith('cd ') || text.includes('go to ') || text.includes('open folder')) {
    const target = input
      .replace(/^cd\s+/i, '')
      .replace(/go to /i, '')
      .replace(/open folder /i, '')
      .trim()
      .replace(/[.!?]+$/g, '')

    return plan('Change working directory', [
      step(
        1,
        cwd,
        'Change directory',
        'cd',
        [target || '.'],
        'Updates MetroCLI current directory and refreshes the file tree.',
      ),
    ])
  }

  if (text.includes('git status') || text === 'status' || text.includes('repo status')) {
    return plan('Check repository status', [
      step(1, cwd, 'Show Git status', 'git', ['status', '--short'], 'Shows changed files without modifying the repository.'),
    ])
  }

  if (text.includes('undo') && text.includes('commit') && text.includes('keep')) {
    return plan('Undo the last commit while keeping changes', [
      step(
        1,
        cwd,
        'Soft reset last commit',
        'git',
        ['reset', '--soft', 'HEAD~1'],
        'Moves the last commit back into staged changes without deleting work.',
        'medium',
      ),
    ])
  }

  if (text.includes('clone')) {
    const url = urlFrom(input)
    return plan(
      'Clone repository',
      [
        step(
          1,
          cwd,
          'Clone repository',
          'git',
          url ? ['clone', url] : ['clone', '<repository-url>'],
          'Downloads the repository into a new folder using Git.',
          url ? 'medium' : 'high',
          true,
        ),
      ],
      url ? [] : ['No repository URL was detected.'],
    )
  }

  if (text.includes('vite') || text.includes('react app')) {
    const runner = context.packageManager === 'pnpm' ? 'pnpm' : 'npm'
    const args = runner === 'pnpm'
      ? ['create', 'vite', 'my-app', '--template', 'react']
      : ['create', 'vite@latest', 'my-app', '--', '--template', 'react']

    return plan('Create a React app with Vite', [
      step(1, cwd, 'Create Vite React app', runner, args, 'Uses the Vite scaffolder to create a React project.', 'medium', true, true),
    ])
  }

  if (text.includes('install') && text.includes('depend')) {
    if (context.packageManager === 'pnpm') {
      return plan('Install Node dependencies', [
        step(1, cwd, 'Install dependencies', 'pnpm', ['install'], 'Installs packages from package.json using pnpm.', 'medium', true),
      ])
    }

    return plan('Install Node dependencies', [
      step(1, cwd, 'Install dependencies', 'npm', ['install'], 'Installs packages from package.json.', 'medium', true),
    ])
  }

  if (text.includes('venv') || text.includes('virtual environment') || text.includes('requirements')) {
    return plan('Set up Python environment', [
      step(1, cwd, 'Create virtual environment', 'python', ['-m', 'venv', '.venv'], 'Creates an isolated Python environment.'),
      step(2, cwd, 'Install requirements', 'python', ['-m', 'pip', 'install', '-r', 'requirements.txt'], 'Installs dependencies from requirements.txt.', 'medium', true),
    ])
  }

  if (text.includes('postgres') && text.includes('docker')) {
    return plan('Run PostgreSQL with Docker', [
      step(
        1,
        cwd,
        'Run PostgreSQL container',
        'docker',
        ['run', '--name', 'metrocli-postgres', '-e', 'POSTGRES_PASSWORD=postgres', '-p', '5432:5432', '-d', 'postgres:16'],
        'Starts a PostgreSQL container on port 5432.',
        'medium',
        true,
      ),
    ])
  }

  if (text.includes('find') && text.includes('pdf')) {
    return plan('Find recent PDFs', [
      step(1, cwd, 'Find PDF files', 'find', ['.', '-name', '*.pdf', '-mtime', '-7'], 'Finds PDFs under the current directory modified in the last seven days.'),
    ])
  }

  if (text.includes('list') || text.includes('show files') || text.includes('ls')) {
    return plan('List current directory', [
      step(1, cwd, 'List files', 'ls', ['-la'], 'Shows files in the current directory.'),
    ])
  }

  return null
}

function extractJson(text: string) {
  return text
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim()
}

export async function createPlan(input: string, context: ProjectContext): Promise<CommandPlan> {
  const local = localPlan(input, context)
  if (local) return local

  const system = [
    'You are MetroCLI, a natural language terminal planner.',
    'Return only JSON matching this shape: {summary, requiresApproval:true, riskLevel, warnings, commands}.',
    `Allowed commands: ${allowedCommands.join(', ')}.`,
    'Never return destructive commands. Mark dangerous requests as high risk with warnings.',
    'Each command must include id, title, command, args, cwd, explanation, risk, longRunning, interactive.',
    'Use the supplied project context. Do not invent files or tools.',
  ].join('\n')

  const response = await completeWithAi(system, JSON.stringify({ request: input, context }))
  if (!response) {
    return plan('Show current directory', [
      step(1, context.cwd, 'Show current directory', 'pwd', [], 'Safe fallback because no AI key is configured.'),
    ], ['NVIDIA_API_KEY is not configured, so MetroCLI used a safe fallback.'])
  }

  return planSchema.parse(JSON.parse(extractJson(response)))
}
