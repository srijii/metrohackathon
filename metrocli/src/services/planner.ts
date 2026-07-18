import { z } from 'zod'
import type {
  CommandPlan,
  CommandStep,
  DiffPreview,
  PlanConfidence,
  PlanSimulation,
  ProjectContext,
  RejectionDetails,
  RiskLevel,
  RollbackPlan,
} from '../state/app.js'
import { completeWithAi } from './ai.js'

export type PlannerEvents = {
  onStatus?: (line: string) => void
  onToken?: (token: string) => void
}

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
const simulationSchema = z.object({
  filesCreated: z.array(z.string()).default([]),
  filesModified: z.array(z.string()).default([]),
  filesDeleted: z.array(z.string()).default([]),
  networkRequired: z.boolean(),
  estimatedSeconds: z.number().int().min(1),
})

const diffPreviewSchema = z.object({
  path: z.string(),
  kind: z.enum(['create', 'modify', 'delete']),
  lines: z.array(z.string()).default([]),
})

const confidenceSchema = z.object({
  score: z.number().int().min(0).max(100),
  reasons: z.array(z.string()).default([]),
})

const rollbackSchema = z.object({
  available: z.boolean(),
  command: z.string(),
  explanation: z.string(),
})

const rejectionSchema = z.object({
  reason: z.string(),
  policy: z.string(),
  alternative: z.string(),
})

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
  simulation: simulationSchema.default({
    filesCreated: [],
    filesModified: [],
    filesDeleted: [],
    networkRequired: false,
    estimatedSeconds: 5,
  }),
  diffPreview: z.array(diffPreviewSchema).default([]),
  confidence: confidenceSchema.default({
    score: 75,
    reasons: [],
  }),
  rollback: rollbackSchema.nullable().default(null),
  rejection: rejectionSchema.nullable().default(null),
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

function inferSimulation(commands: CommandStep[]): PlanSimulation {
  const filesCreated: string[] = []
  const filesModified: string[] = []
  const filesDeleted: string[] = []
  let networkRequired = false
  let estimatedSeconds = 4

  for (const command of commands) {
    const rendered = [command.command, ...command.args].join(' ')

    if (
      ['npm', 'pnpm', 'npx', 'docker'].includes(command.command) ||
      (command.command === 'git' && command.args[0] === 'clone')
    ) {
      networkRequired = true
      estimatedSeconds += command.longRunning ? 18 : 6
    }

    if (command.command === 'npm' || command.command === 'pnpm') {
      filesModified.push('package.json')
      filesModified.push(command.command === 'pnpm' ? 'pnpm-lock.yaml' : 'package-lock.json')
    }

    if (rendered.includes('vite')) {
      filesCreated.push('my-app/')
    }

    if (command.command === 'python' && command.args.includes('venv')) {
      filesCreated.push('.venv/')
    }

    if (command.command === 'git' && command.args[0] === 'clone') {
      filesCreated.push('<repository-folder>/')
    }

    if (command.command === 'docker') {
      estimatedSeconds += 20
    }
  }

  return {
    filesCreated: [...new Set(filesCreated)],
    filesModified: [...new Set(filesModified)],
    filesDeleted,
    networkRequired,
    estimatedSeconds,
  }
}

function inferDiffPreview(commands: CommandStep[]): DiffPreview[] {
  const previews: DiffPreview[] = []

  for (const command of commands) {
    if (command.command === 'npm' || command.command === 'pnpm') {
      previews.push({
        path: 'package.json',
        kind: 'modify',
        lines: [
          '+ dependencies will be updated by the package manager',
          '+ lockfile will be regenerated if dependency versions change',
        ],
      })
    }

    if ([command.command, ...command.args].join(' ').includes('vite')) {
      previews.push({
        path: 'my-app/',
        kind: 'create',
        lines: [
          '+ index.html',
          '+ src/App.jsx',
          '+ src/main.jsx',
          '+ package.json',
        ],
      })
    }
  }

  return previews
}

function inferConfidence(
  context: ProjectContext,
  commands: CommandStep[],
  deterministic: boolean,
): PlanConfidence {
  const reasons = [
    'Repository analyzed',
    context.branch !== 'no git branch' ? 'Git detected' : 'Git not detected',
    context.packageManager !== 'unknown' ? 'Package manager found' : 'Package manager unknown',
    deterministic ? 'Deterministic workflow matched' : 'AI planner output validated',
    commands.every((command) => allowedCommands.includes(command.command as (typeof allowedCommands)[number]))
      ? 'All commands are allowlisted'
      : 'Command allowlist warning',
  ]

  const score = Math.max(
    55,
    72 +
      (deterministic ? 14 : 4) +
      (context.packageManager !== 'unknown' ? 4 : -6) +
      (context.branch !== 'no git branch' ? 4 : -4) -
      commands.filter((command) => command.risk === 'medium').length * 5 -
      commands.filter((command) => command.risk === 'high').length * 18,
  )

  return {
    score: Math.min(99, score),
    reasons,
  }
}

function inferRollback(commands: CommandStep[]): RollbackPlan | null {
  if (commands.some((command) => command.command === 'git' && command.args[0] === 'reset')) {
    return {
      available: true,
      command: 'git reflog',
      explanation: 'Use reflog to find the previous HEAD if you need to restore it.',
    }
  }

  if (commands.some((command) => command.command === 'npm' || command.command === 'pnpm')) {
    return {
      available: true,
      command: 'git checkout -- package.json pnpm-lock.yaml package-lock.json',
      explanation: 'Package changes can be reverted from Git if they were tracked before execution.',
    }
  }

  if (commands.some((command) => command.command === 'cd' || command.command === 'pwd' || command.command === 'ls' || command.command === 'find')) {
    return {
      available: true,
      command: 'No file rollback needed',
      explanation: 'This plan only reads or changes MetroCLI context.',
    }
  }

  return null
}

function plan(
  summary: string,
  commands: CommandStep[],
  warnings: string[] = [],
  options: {
    context: ProjectContext
    deterministic?: boolean
    simulation?: Partial<PlanSimulation>
    diffPreview?: DiffPreview[]
    rollback?: RollbackPlan | null
    rejection?: RejectionDetails | null
  },
): CommandPlan {
  const riskLevel = commands.some((item) => item.risk === 'high') || warnings.length > 0
    ? 'high'
    : commands.some((item) => item.risk === 'medium')
      ? 'medium'
      : 'low'
  const simulation = {
    ...inferSimulation(commands),
    ...options.simulation,
  }

  return planSchema.parse({
    summary,
    requiresApproval: true,
    riskLevel,
    warnings,
    simulation,
    diffPreview: options.diffPreview ?? inferDiffPreview(commands),
    confidence: inferConfidence(options.context, commands, options.deterministic ?? true),
    rollback: options.rollback === undefined ? inferRollback(commands) : options.rollback,
    rejection: options.rejection ?? null,
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
      {
        context,
      simulation: {
        filesDeleted: ['unknown project files'],
        estimatedSeconds: 1,
      },
      diffPreview: [{
        path: '<project>',
        kind: 'delete',
        lines: [
          '- unknown files could be removed',
          '- project state could become unrecoverable',
        ],
      }],
      rollback: null,
        rejection: {
          reason: 'Request is destructive and broad.',
          policy: 'MetroCLI blocks filesystem deletion and unsafe shell operations.',
          alternative: 'Use git status, git clean preview, or move specific files manually after review.',
        },
      },
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
    ], [], { context })
  }

  if (text.includes('git status') || text === 'status' || text.includes('repo status')) {
    return plan('Check repository status', [
      step(1, cwd, 'Show Git status', 'git', ['status', '--short'], 'Shows changed files without modifying the repository.'),
    ], [], { context })
  }

  if (text.includes('auth') && text.includes('express') && text.includes('jwt')) {
    const runner = context.packageManager === 'pnpm' ? 'pnpm' : 'npm'
    const installArgs = runner === 'pnpm'
      ? ['add', 'express', 'jsonwebtoken', 'zod']
      : ['install', 'express', 'jsonwebtoken', 'zod']

    return plan('Prepare Express JWT authentication dependencies', [
      step(
        1,
        cwd,
        'Install auth dependencies',
        runner,
        installArgs,
        'Adds Express, JSON Web Token support, and Zod validation before code changes are made.',
        'medium',
        true,
      ),
      step(
        2,
        cwd,
        'Show project files',
        'ls',
        ['-la'],
        'Shows the current project files so MetroCLI can explain where auth files should be created next.',
      ),
    ], [], {
      context,
      simulation: {
        filesCreated: ['src/routes/auth.ts', 'src/middleware/jwt.ts', 'src/types/user.ts'],
        filesModified: ['package.json', runner === 'pnpm' ? 'pnpm-lock.yaml' : 'package-lock.json'],
        networkRequired: true,
        estimatedSeconds: 22,
      },
      rollback: {
        available: true,
        command: `git checkout -- package.json ${runner === 'pnpm' ? 'pnpm-lock.yaml' : 'package-lock.json'}`,
        explanation: 'Dependency changes can be reverted from Git before adding auth source files.',
      },
      diffPreview: [
        {
          path: 'src/routes/auth.ts',
          kind: 'create',
          lines: [
            '+ import { Router } from "express"',
            '+ auth.post("/login", validateLogin, login)',
            '+ auth.post("/signup", validateSignup, signup)',
          ],
        },
        {
          path: 'src/middleware/jwt.ts',
          kind: 'create',
          lines: [
            '+ export function requireAuth(req, res, next) {',
            '+   verify bearer token and attach user context',
            '+ }',
          ],
        },
        {
          path: 'package.json',
          kind: 'modify',
          lines: [
            '+ "express"',
            '+ "jsonwebtoken"',
            '+ "zod"',
          ],
        },
      ],
    })
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
    ], [], { context })
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
      { context },
    )
  }

  if (text.includes('vite') || text.includes('react app')) {
    const runner = context.packageManager === 'pnpm' ? 'pnpm' : 'npm'
    const args = runner === 'pnpm'
      ? ['create', 'vite', 'my-app', '--template', 'react']
      : ['create', 'vite@latest', 'my-app', '--', '--template', 'react']

    return plan('Create a React app with Vite', [
      step(1, cwd, 'Create Vite React app', runner, args, 'Uses the Vite scaffolder to create a React project.', 'medium', true, true),
    ], [], { context })
  }

  if (text.includes('install') && text.includes('depend')) {
    if (context.packageManager === 'pnpm') {
      return plan('Install Node dependencies', [
        step(1, cwd, 'Install dependencies', 'pnpm', ['install'], 'Installs packages from package.json using pnpm.', 'medium', true),
      ], [], { context })
    }

    return plan('Install Node dependencies', [
      step(1, cwd, 'Install dependencies', 'npm', ['install'], 'Installs packages from package.json.', 'medium', true),
    ], [], { context })
  }

  if (text.includes('venv') || text.includes('virtual environment') || text.includes('requirements')) {
    return plan('Set up Python environment', [
      step(1, cwd, 'Create virtual environment', 'python', ['-m', 'venv', '.venv'], 'Creates an isolated Python environment.'),
      step(2, cwd, 'Install requirements', 'python', ['-m', 'pip', 'install', '-r', 'requirements.txt'], 'Installs dependencies from requirements.txt.', 'medium', true),
    ], [], { context })
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
    ], [], { context })
  }

  if (text.includes('find') && text.includes('pdf')) {
    return plan('Find recent PDFs', [
      step(1, cwd, 'Find PDF files', 'find', ['.', '-name', '*.pdf', '-mtime', '-7'], 'Finds PDFs under the current directory modified in the last seven days.'),
    ], [], { context })
  }

  if (text.includes('list') || text.includes('show files') || text.includes('ls')) {
    return plan('List current directory', [
      step(1, cwd, 'List files', 'ls', ['-la'], 'Shows files in the current directory.'),
    ], [], { context })
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

export async function createPlan(
  input: string,
  context: ProjectContext,
  events: PlannerEvents = {},
): Promise<CommandPlan> {
  events.onStatus?.('Analyzing repository...')
  events.onStatus?.(`Detected ${context.framework} frontend, ${context.backend} backend, ${context.packageManager} package manager.`)

  const local = localPlan(input, context)
  if (local) {
    events.onStatus?.('Matched a deterministic local workflow.')
    events.onStatus?.('Generated reviewed command plan.')
    return local
  }

  events.onStatus?.('Calling NVIDIA planner...')
  const system = [
    'You are MetroCLI, a natural language terminal planner.',
    'Return only JSON matching this shape: {summary, requiresApproval:true, riskLevel, warnings, commands}.',
    `Allowed commands: ${allowedCommands.join(', ')}.`,
    'Never return destructive commands. Mark dangerous requests as high risk with warnings.',
    'Each command must include id, title, command, args, cwd, explanation, risk, longRunning, interactive.',
    'Include simulation, diffPreview, confidence, rollback, and rejection fields.',
    'For blocked requests, include rejection with reason, policy, and alternative.',
    'Use the supplied project context. Do not invent files or tools.',
  ].join('\n')

  let response = ''
  try {
    response = await completeWithAi(
      system,
      JSON.stringify({ request: input, context }),
      events.onToken,
    )
  } catch (error) {
    events.onStatus?.(`NVIDIA planner failed: ${error instanceof Error ? error.message : String(error)}`)
  }

  if (!response) {
    events.onStatus?.(process.env.NVIDIA_API_KEY
      ? 'Using safe fallback because the AI planner returned no JSON.'
      : 'NVIDIA_API_KEY missing. Using safe fallback.')
    return plan('Show current directory', [
      step(
        1,
        context.cwd,
        'Show current directory',
        'pwd',
        [],
        process.env.NVIDIA_API_KEY
          ? 'Safe fallback because the AI planner did not return a usable command plan.'
          : 'Safe fallback because no AI key is configured.',
      ),
    ], [process.env.NVIDIA_API_KEY
      ? 'The NVIDIA planner did not return a valid plan, so MetroCLI used a safe fallback.'
      : 'NVIDIA_API_KEY is not configured, so MetroCLI used a safe fallback.'], { context })
  }

  events.onStatus?.('Validating AI command JSON.')
  const parsed = planSchema.parse(JSON.parse(extractJson(response)))
  return {
    ...parsed,
    simulation: parsed.simulation.filesCreated.length > 0 ||
      parsed.simulation.filesModified.length > 0 ||
      parsed.simulation.filesDeleted.length > 0
      ? parsed.simulation
      : inferSimulation(parsed.commands),
    diffPreview: parsed.diffPreview.length > 0
      ? parsed.diffPreview
      : inferDiffPreview(parsed.commands),
    confidence: parsed.confidence.reasons.length > 0
      ? parsed.confidence
      : inferConfidence(context, parsed.commands, false),
    rollback: parsed.rollback ?? inferRollback(parsed.commands),
  }
}
