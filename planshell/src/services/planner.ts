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
  'touch',
  'mkdir',
  'rmdir',
  'mv',
  'cp',
  'cat',
  'echo',
  'grep',
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
  group: z.string().optional(),
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
  commands: z.array(commandSchema).max(6),
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
  group?: string,
): CommandStep {
  return {
    id: `cmd_${index}`,
    group,
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

    if (command.command === 'touch') {
      filesCreated.push(...command.args.filter((arg) => !arg.startsWith('-')))
    }

    if (command.command === 'mkdir') {
      filesCreated.push(...command.args.filter((arg) => !arg.startsWith('-')).map((arg) => `${arg.replace(/\/$/g, '')}/`))
    }

    if (command.command === 'rmdir') {
      filesDeleted.push(...command.args.filter((arg) => !arg.startsWith('-')).map((arg) => `${arg.replace(/\/$/g, '')}/`))
    }

    if (command.command === 'mv' && command.args.length >= 2) {
      filesDeleted.push(command.args[0])
      filesCreated.push(command.args[command.args.length - 1])
    }

    if (command.command === 'cp' && command.args.length >= 2) {
      filesCreated.push(command.args[command.args.length - 1])
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

    if (command.command === 'touch') {
      command.args.filter((arg) => !arg.startsWith('-')).forEach((path) => {
        previews.push({
          path,
          kind: 'create',
          lines: ['+ <empty file>'],
        })
      })
    }

    if (command.command === 'mkdir') {
      command.args.filter((arg) => !arg.startsWith('-')).forEach((path) => {
        previews.push({
          path: `${path.replace(/\/$/g, '')}/`,
          kind: 'create',
          lines: ['+ directory'],
        })
      })
    }

    if (command.command === 'rmdir') {
      command.args.filter((arg) => !arg.startsWith('-')).forEach((path) => {
        previews.push({
          path: `${path.replace(/\/$/g, '')}/`,
          kind: 'delete',
          lines: ['- empty directory'],
        })
      })
    }

    if (command.command === 'mv' && command.args.length >= 2) {
      previews.push({
        path: command.args[0],
        kind: 'delete',
        lines: ['- moved from this path'],
      })
      previews.push({
        path: command.args[command.args.length - 1],
        kind: 'create',
        lines: ['+ moved to this path'],
      })
    }

    if (command.command === 'cp' && command.args.length >= 2) {
      previews.push({
        path: command.args[command.args.length - 1],
        kind: 'create',
        lines: ['+ copied content'],
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

  if (commands.some((command) => command.command === 'touch' || command.command === 'mkdir' || command.command === 'rmdir')) {
    return {
      available: true,
      command: 'Review created files, then remove them manually if needed.',
      explanation: 'PlanShell will not auto-delete files as rollback; created paths are listed before approval.',
    }
  }

  if (commands.some((command) => command.command === 'mv')) {
    const move = commands.find((command) => command.command === 'mv' && command.args.length >= 2)
    return {
      available: Boolean(move),
      command: move ? `mv ${move.args[move.args.length - 1]} ${move.args[0]}` : 'No rollback command available',
      explanation: 'A move can usually be reversed by moving the destination back to the original path.',
    }
  }

  if (commands.some((command) => command.command === 'cd' || command.command === 'pwd' || command.command === 'ls' || command.command === 'find' || command.command === 'cat' || command.command === 'grep')) {
    return {
      available: true,
      command: 'No file rollback needed',
      explanation: 'This plan only reads or changes PlanShell context.',
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
  const riskLevel = commands.some((item) => item.risk === 'high') || options.rejection
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

function quotedValue(input: string) {
  return input.match(/["'`](.+?)["'`]/)?.[1]?.trim() || ''
}

function safePath(value: string) {
  const path = value
    .trim()
    .replace(/^\.\//, '')
    .replace(/[.!?]+$/g, '')

  if (
    !path ||
    path === '..' ||
    path.startsWith('../') ||
    path.startsWith('/') ||
    /[;&|<>$`]/.test(path)
  ) {
    return ''
  }

  return path
}

function directoryTargetFrom(input: string, context: ProjectContext) {
  const text = input.toLowerCase()

  if (
    text.includes('project root') ||
    text.includes('repo root') ||
    text.includes('repository root') ||
    text.includes(context.root.split('/').pop()?.toLowerCase() || '')
  ) {
    return { cwd: context.root, target: '.' }
  }

  const raw = input
    .replace(/^cd\s+/i, '')
    .replace(/\bgo to\b/i, '')
    .replace(/\bopen folder\b/i, '')
    .replace(/\bopen directory\b/i, '')
    .replace(/\bthe\b/gi, '')
    .replace(/\bin (?:the )?home\b/gi, '')
    .trim()
    .replace(/[.!?]+$/g, '')

  if (/^(home|root|repo|repository|project)$/i.test(raw)) return { cwd: context.root, target: '.' }
  return { cwd: context.cwd, target: safePath(raw) }
}

function pathAfter(input: string, patterns: RegExp[]) {
  for (const pattern of patterns) {
    const match = input.match(pattern)
    const value = match?.[1]?.trim()
    if (value) return safePath(value)
  }

  return ''
}

function packageNameFrom(input: string) {
  const direct = pathAfter(input, [
    /\b(?:pnpm add|npm install|install package|add package|install)\s+([@\w./-]+)\b/i,
    /\b(?:remove package|uninstall package|npm uninstall|pnpm remove)\s+([@\w./-]+)\b/i,
  ])

  return direct && !['dependencies', 'depend', 'deps', 'package'].includes(direct.toLowerCase()) ? direct : ''
}

function nestedFilePath(folder: string, file: string) {
  const safeFolder = folder.replace(/\/$/g, '')
  const safeFile = file.replace(/\s+(?:inside|in)\s+it$/i, '').replace(/^inside\s+it$/i, '').trim() || 'index.js'

  if (safeFile.includes('/')) return safeFile
  return `${safeFolder}/${safeFile}`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function asString(value: unknown, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

function asBoolean(value: unknown, fallback = false) {
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') return value.toLowerCase() === 'true'
  return fallback
}

function asStringArray(value: unknown) {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string')
}

function normalizeRisk(value: unknown): RiskLevel {
  if (value === 'low' || value === 'safe') return 'low'
  if (value === 'medium' || value === 'moderate' || value === 'changes project') return 'medium'
  if (value === 'high' || value === 'dangerous' || value === 'blocked') return 'high'
  return 'medium'
}

function normalizeAiCommands(value: unknown, context: ProjectContext): CommandStep[] {
  if (!Array.isArray(value)) return []

  return value
    .map((item, index) => {
      if (!isRecord(item)) return null

      const executable = asString(item.command || item.executable)
      if (!allowedCommands.includes(executable as (typeof allowedCommands)[number])) {
        return null
      }

      const args = Array.isArray(item.args)
        ? item.args.map((arg) => String(arg))
        : typeof item.args === 'string'
          ? item.args.split(' ').filter(Boolean)
          : []

      return {
        id: asString(item.id, `cmd_${index + 1}`),
        title: asString(item.title, `Run ${executable}`),
        command: executable,
        args,
        cwd: asString(item.cwd, context.cwd),
        explanation: asString(item.explanation, 'Command selected by the validated AI planner.'),
        risk: normalizeRisk(item.risk),
        longRunning: asBoolean(item.longRunning, false),
        interactive: asBoolean(item.interactive, false),
      } satisfies CommandStep
    })
    .filter((item): item is CommandStep => item !== null)
    .slice(0, 6)
}

function normalizeDiffPreview(value: unknown, commands: CommandStep[]): DiffPreview[] {
  if (!Array.isArray(value)) return inferDiffPreview(commands)

  const previews = value
    .map((item) => {
      if (!isRecord(item)) return null

      const kind = item.kind === 'create' || item.kind === 'modify' || item.kind === 'delete'
        ? item.kind
        : 'modify'

      return {
        path: asString(item.path, '<unknown>'),
        kind,
        lines: asStringArray(item.lines),
      } satisfies DiffPreview
    })
    .filter((item): item is DiffPreview => item !== null)
    .slice(0, 6)

  return previews.length > 0 ? previews : inferDiffPreview(commands)
}

function normalizeAiPlanPayload(value: unknown, context: ProjectContext) {
  const source = isRecord(value) && isRecord(value.plan) ? value.plan : value
  if (!isRecord(source)) {
    throw new Error('AI planner returned an invalid JSON object.')
  }

  const commands = normalizeAiCommands(source.commands || source.actions, context)
  const warnings = asStringArray(source.warnings)
  const rejected = commands.length === 0
  const rejection = rejected
    ? {
        reason: warnings[0] || 'The planner did not return an executable allowlisted command.',
        policy: 'PlanShell executes nothing unless the command plan is explicit and validated.',
        alternative: 'Retry with a specific task such as "touch test.txt", "git status", or "pnpm install".',
      }
    : null

  return {
    summary: asString(source.summary, commands.length > 0 ? commands.map((command) => command.title).join(', ') : 'Unable to safely plan this request'),
    requiresApproval: true,
    riskLevel: rejected ? 'high' : normalizeRisk(source.riskLevel),
    warnings,
    simulation: inferSimulation(commands),
    diffPreview: inferDiffPreview(commands),
    confidence: inferConfidence(context, commands, false),
    rollback: inferRollback(commands),
    rejection,
    commands,
  }
}

function fallbackPlan(context: ProjectContext, warning: string) {
  return plan('Unable to generate a safe command plan', [], [warning], {
    context,
    simulation: {
      filesCreated: [],
      filesModified: [],
      filesDeleted: [],
      networkRequired: false,
      estimatedSeconds: 1,
    },
    diffPreview: [],
    rollback: null,
    rejection: {
      reason: 'The request could not be converted into a validated command plan.',
      policy: 'PlanShell executes nothing unless the plan is explicit, allowlisted, and validated.',
      alternative: 'Retry with a more specific terminal task such as "create file test.txt" or "git status".',
    },
  })
}

function invalidTerminalPlan(context: ProjectContext) {
  return plan('Invalid terminal request', [], ['Terminal has nothing to do for this input.'], {
    context,
    simulation: {
      filesCreated: [],
      filesModified: [],
      filesDeleted: [],
      networkRequired: false,
      estimatedSeconds: 1,
    },
    diffPreview: [],
    rollback: null,
    rejection: {
      reason: 'This does not describe a terminal, file, Git, package, or project task.',
      policy: 'PlanShell ignores conversational or meaningless input instead of sending it to the command planner.',
      alternative: 'Try a terminal task such as "pwd", "create file test.txt", "git status", or "pnpm install".',
    },
  })
}

function isNonTerminalInput(input: string) {
  const text = input.trim().toLowerCase()
  const words = text.split(/\s+/).filter(Boolean)

  if (/^(hi+|hii+|hello|hey|yo|sup|thanks|thank you|ok|okay|lol|haha)[.!?]*$/.test(text)) {
    return true
  }

  if (/\b(how are you|who are you|what are you|tell me a joke|good morning|good night)\b/.test(text)) {
    return true
  }

  const terminalTerms = [
    'api',
    'auth',
    'branch',
    'build',
    'cat',
    'cd',
    'change',
    'clone',
    'commit',
    'copy',
    'create',
    'delete',
    'directory',
    'docker',
    'express',
    'file',
    'find',
    'fix',
    'folder',
    'git',
    'install',
    'list',
    'make',
    'mkdir',
    'move',
    'node',
    'npm',
    'open',
    'package',
    'pnpm',
    'postgres',
    'pull',
    'push',
    'pwd',
    'python',
    'react',
    'read',
    'remove',
    'rename',
    'run',
    'search',
    'show',
    'start',
    'status',
    'test',
    'touch',
    'undo',
    'update',
    'venv',
    'vite',
  ]

  return words.length <= 3 && !terminalTerms.some((term) => text.includes(term))
}

function localPlan(input: string, context: ProjectContext) {
  const text = input.toLowerCase()
  const cwd = context.cwd

  if (isNonTerminalInput(input)) {
    return invalidTerminalPlan(context)
  }

  if (/\b(delete|wipe|erase|destroy|format|rm -rf)\b/.test(text) || /\bremove\s+(everything|all|files?|folders?|directories?)\b/.test(text)) {
    return plan(
      'Blocked destructive request',
      [],
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
          policy: 'PlanShell blocks filesystem deletion and unsafe shell operations.',
          alternative: 'Use git status, git clean preview, or move specific files manually after review.',
        },
      },
    )
  }

  const quoted = quotedValue(input)
  const folderAndFileMatch = input.match(/\b(?:create|make)\s+(?:a\s+)?(?:new\s+)?(?:folder|directory)\s+(?:named|called)?\s*([@\w./ -]+?)\s+(?:and|then|,)\s+(?:create|make|touch)?\s*(?:a\s+)?(?:new\s+)?file(?:\s+(?:named|called))?\s*([@\w./ -]+)?$/i)
  if (folderAndFileMatch) {
    const folder = safePath(folderAndFileMatch[1])
    const rawFile = safePath(folderAndFileMatch[2] || '')
    const file = folder && nestedFilePath(folder, rawFile || 'index.js')

    if (folder && file) {
      return plan('Create folder and file', [
        step(
          1,
          cwd,
          `Create ${folder}/`,
          'mkdir',
          ['-p', folder],
          'Creates the requested folder before creating files inside it.',
          'medium',
          false,
          false,
          'File changes',
        ),
        step(
          2,
          cwd,
          `Create ${file}`,
          'touch',
          [file],
          'Creates the requested file after the folder exists.',
          'medium',
          false,
          false,
          'File changes',
        ),
      ], [], { context })
    }
  }

  const fileInFolderMatch = input.match(/\b(?:create|make|touch)\s+(?:a\s+)?(?:new\s+)?file\s+(?:named|called)?\s*([@\w./ -]+?)\s+(?:inside|in)\s+(?:folder|directory)?\s*([@\w./ -]+)$/i)
  if (fileInFolderMatch) {
    const fileName = safePath(fileInFolderMatch[1])
    const folder = safePath(fileInFolderMatch[2])
    const file = folder && fileName && nestedFilePath(folder, fileName)

    if (folder && file) {
      return plan('Create folder and file', [
        step(
          1,
          cwd,
          `Ensure ${folder}/ exists`,
          'mkdir',
          ['-p', folder],
          'Creates the parent folder if it does not already exist.',
          'medium',
          false,
          false,
          'File changes',
        ),
        step(
          2,
          cwd,
          `Create ${file}`,
          'touch',
          [file],
          'Creates the requested file inside the folder.',
          'medium',
          false,
          false,
          'File changes',
        ),
      ], [], { context })
    }
  }

  const replaceFolderMatch = input.match(/\breplace\s+(?:folder|directory)\s+([@\w./ -]+?)\s+with\s+(?:a\s+)?file(?:\s+\1)?$/i)
  if (replaceFolderMatch) {
    const target = safePath(replaceFolderMatch[1])
    if (target) {
      return plan('Replace folder with file', [
        step(
          1,
          cwd,
          `Remove empty folder ${target}/`,
          'rmdir',
          [target],
          'Removes the previously created folder. This only works if the folder is empty.',
          'medium',
          false,
          false,
          'Correction',
        ),
        step(
          2,
          cwd,
          `Create file ${target}`,
          'touch',
          [target],
          'Creates a file at the same path after the empty folder is removed.',
          'medium',
          false,
          false,
          'Correction',
        ),
      ], [`Will only remove ${target}/ if it is empty.`], {
        context,
        rollback: {
          available: true,
          command: `rmdir ${target} && mkdir -p ${target}`,
          explanation: 'The correction can be reversed only if the replacement file is still empty.',
        },
      })
    }
  }

  const fileToCreate = /\b(create|make|touch)\b/.test(text)
    ? safePath(quoted) || pathAfter(input, [
      /\b(?:create|make|touch)\s+(?:a\s+)?(?:new\s+)?file\s+(?:named|called)?\s*([@\w./ -]+)$/i,
      /\b(?:create|make)\s+([@\w./ -]+\.[\w]+)$/i,
      /\btouch\s+([@\w./ -]+)$/i,
    ])
    : ''
  if (fileToCreate) {
    return plan('Create file', [
      step(
        1,
        cwd,
        `Create ${fileToCreate}`,
        'touch',
        [fileToCreate],
        'Creates an empty file at the requested path inside the current workspace.',
        'medium',
        false,
        false,
        'File changes',
      ),
    ], [], { context })
  }

  const folderToCreate = pathAfter(input, [
    /\b(?:create|make|mkdir)\s+(?:a\s+)?(?:new\s+)?(?:folder|directory)\s+(?:named|called)?\s*([@\w./ -]+)$/i,
    /\bmkdir\s+([@\w./ -]+)$/i,
  ])
  if (folderToCreate) {
    return plan('Create folder', [
      step(
        1,
        cwd,
        `Create ${folderToCreate}/`,
        'mkdir',
        ['-p', folderToCreate],
        'Creates the requested folder inside the current workspace.',
        'medium',
        false,
        false,
        'File changes',
      ),
    ], [], { context })
  }

  const renameMatch = input.match(/\brename\s+([@\w./ -]+?)\s+to\s+([@\w./ -]+)$/i)
  if (renameMatch) {
    const from = safePath(renameMatch[1])
    const to = safePath(renameMatch[2])
    if (from && to) {
      return plan('Rename path', [
        step(
          1,
          cwd,
          `Rename ${from} to ${to}`,
          'mv',
          [from, to],
          'Moves the existing path to the new name inside the workspace.',
          'medium',
          false,
          false,
          'File changes',
        ),
      ], [], { context })
    }
  }

  const copyMatch = input.match(/\bcopy\s+([@\w./ -]+?)\s+to\s+([@\w./ -]+)$/i)
  if (copyMatch) {
    const from = safePath(copyMatch[1])
    const to = safePath(copyMatch[2])
    if (from && to) {
      return plan('Copy path', [
        step(
          1,
          cwd,
          `Copy ${from} to ${to}`,
          'cp',
          ['-R', from, to],
          'Copies the path to the requested destination inside the workspace.',
          'medium',
          false,
          false,
          'File changes',
        ),
      ], [], { context })
    }
  }

  const moveMatch = input.match(/\bmove\s+([@\w./ -]+?)\s+to\s+([@\w./ -]+)$/i)
  if (moveMatch) {
    const from = safePath(moveMatch[1])
    const to = safePath(moveMatch[2])
    if (from && to) {
      return plan('Move path', [
        step(
          1,
          cwd,
          `Move ${from} to ${to}`,
          'mv',
          [from, to],
          'Moves the path to the requested destination inside the workspace.',
          'medium',
          false,
          false,
          'File changes',
        ),
      ], [], { context })
    }
  }

  const fileToRead = safePath(quoted) || pathAfter(input, [
    /\b(?:show|read|cat)\s+(?:file\s+)?([@\w./ -]+)$/i,
    /\bcat\s+([@\w./ -]+)$/i,
  ])
  if (fileToRead && /\b(show|read|cat)\b/.test(text)) {
    return plan('Read file', [
      step(
        1,
        cwd,
        `Read ${fileToRead}`,
        'cat',
        [fileToRead],
        'Prints the file contents without modifying the project.',
        'low',
        false,
        false,
        'Inspection',
      ),
    ], [], { context })
  }

  const grepMatch = input.match(/\b(?:search|grep|find text)\s+["'`](.+?)["'`]/i)
  if (grepMatch) {
    return plan('Search project text', [
      step(
        1,
        cwd,
        `Search for ${grepMatch[1]}`,
        'grep',
        ['-R', grepMatch[1], '.'],
        'Searches text recursively under the current directory without modifying files.',
        'low',
        false,
        false,
        'Inspection',
      ),
    ], [], { context })
  }

  if (
    text.includes('go back one directory') ||
    text.includes('go back a directory') ||
    text.includes('go up one directory') ||
    text.includes('parent directory') ||
    text.includes('parent folder') ||
    text === 'cd ..'
  ) {
    return plan('Go back one directory', [
      step(
        1,
        cwd,
        'Change to parent directory',
        'cd',
        ['..'],
        'Moves the current PlanShell working directory to the parent folder.',
      ),
    ], [], { context })
  }

  if (text.startsWith('cd ') || text.includes('go to ') || text.includes('open folder')) {
    const directoryTarget = directoryTargetFrom(input, context)

    return plan('Change working directory', [
      step(
        1,
        directoryTarget.cwd,
        'Change directory',
        'cd',
        [directoryTarget.target || '.'],
        'Updates PlanShell current directory and refreshes the file tree.',
      ),
    ], [], { context })
  }

  if (text.includes('git status') || text === 'status' || text.includes('repo status')) {
    return plan('Check repository status', [
      step(1, cwd, 'Show Git status', 'git', ['status', '--short'], 'Shows changed files without modifying the repository.', 'low', false, false, 'Git'),
    ], [], { context })
  }

  if (/\bgit\s+add\b/.test(text) || /\bstage\b/.test(text)) {
    const target = text.includes('all') || text.includes('everything') ? '.' : safePath(quoted) || pathAfter(input, [
      /\bgit\s+add\s+([@\w./ -]+)$/i,
      /\bstage\s+([@\w./ -]+)$/i,
    ]) || '.'

    return plan('Stage Git changes', [
      step(
        1,
        cwd,
        target === '.' ? 'Stage all changes' : `Stage ${target}`,
        'git',
        ['add', target],
        'Adds the selected file changes to the Git index.',
        'medium',
        false,
        false,
        'Git',
      ),
    ], [], { context })
  }

  if (/\bgit\s+commit\b/.test(text) || /\bcommit\b/.test(text)) {
    const message = quoted || input.match(/\b(?:message|with)\s+(.+)$/i)?.[1]?.trim().replace(/[.!?]+$/g, '') || 'Update project'
    return plan('Commit staged changes', [
      step(
        1,
        cwd,
        'Commit staged changes',
        'git',
        ['commit', '-m', message],
        'Creates a Git commit from the currently staged changes.',
        'medium',
        false,
        false,
        'Git',
      ),
    ], [], { context })
  }

  const branchMatch = input.match(/\bgit\s+(?:switch|checkout)\s+([@\w./-]+)$/i) || input.match(/\b(?:switch|checkout)\s+(?:to\s+)?branch\s+([@\w./-]+)$/i)
  if (branchMatch) {
    return plan('Switch Git branch', [
      step(
        1,
        cwd,
        `Switch to ${branchMatch[1]}`,
        'git',
        ['switch', branchMatch[1]],
        'Changes the active Git branch without modifying file contents beyond checkout updates.',
        'medium',
        false,
        false,
        'Git',
      ),
    ], [], { context })
  }

  if (/\bgit\s+pull\b/.test(text) || text === 'pull') {
    return plan('Pull latest Git changes', [
      step(1, cwd, 'Pull latest changes', 'git', ['pull'], 'Fetches and merges remote changes into the current branch.', 'medium', true, false, 'Git'),
    ], [], { context })
  }

  if (/\bgit\s+push\b/.test(text) || text === 'push') {
    return plan('Push Git changes', [
      step(1, cwd, 'Push current branch', 'git', ['push'], 'Uploads local commits from the current branch to the configured remote.', 'medium', true, false, 'Git'),
    ], [], { context })
  }

  if (
    text.includes('which folder') ||
    text.includes('what folder') ||
    text.includes('where am i') ||
    text.includes('current folder') ||
    text.includes('current directory') ||
    text.includes('which directory') ||
    text.includes('what directory') ||
    text === 'pwd'
  ) {
    return plan('Show current working directory', [
      step(
        1,
        cwd,
        'Print working directory',
        'pwd',
        [],
        'Prints the current working directory so you can confirm where commands will run.',
      ),
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
        'Shows the current project files so PlanShell can explain where auth files should be created next.',
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

  const packageToRemove = /\b(uninstall|remove)\b/.test(text) ? packageNameFrom(input) : ''
  if (packageToRemove) {
    const runner = context.packageManager === 'pnpm' ? 'pnpm' : 'npm'
    return plan(`Remove ${packageToRemove}`, [
      step(
        1,
        cwd,
        `Remove ${packageToRemove}`,
        runner,
        runner === 'pnpm' ? ['remove', packageToRemove] : ['uninstall', packageToRemove],
        'Removes the package through the detected package manager and updates the lockfile.',
        'medium',
        true,
        false,
        'Dependencies',
      ),
    ], [], { context })
  }

  const packageToAdd = /\b(add|install)\b/.test(text) ? packageNameFrom(input) : ''
  if (packageToAdd) {
    const runner = context.packageManager === 'pnpm' ? 'pnpm' : 'npm'
    return plan(`Install ${packageToAdd}`, [
      step(
        1,
        cwd,
        `Install ${packageToAdd}`,
        runner,
        runner === 'pnpm' ? ['add', packageToAdd] : ['install', packageToAdd],
        'Adds the package through the detected package manager and updates package metadata.',
        'medium',
        true,
        false,
        'Dependencies',
      ),
    ], [], { context })
  }

  const scriptMatch = input.match(/\b(?:run|start)\s+(?:script\s+)?([@\w:-]+)$/i) || input.match(/\b(?:npm|pnpm)\s+run\s+([@\w:-]+)$/i)
  if (scriptMatch) {
    const runner = context.packageManager === 'pnpm' ? 'pnpm' : 'npm'
    return plan(`Run ${scriptMatch[1]}`, [
      step(
        1,
        cwd,
        `Run ${scriptMatch[1]}`,
        runner,
        ['run', scriptMatch[1]],
        'Runs the requested package script in the current project.',
        'low',
        true,
        false,
        'Scripts',
      ),
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
        ['run', '--name', 'planshell-postgres', '-e', 'POSTGRES_PASSWORD=postgres', '-p', '5432:5432', '-d', 'postgres:16'],
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
    'You are PlanShell, a natural language terminal planner.',
    'Return only JSON. No markdown. No prose outside JSON.',
    'Use this shape: {"summary":"short summary","commands":[...],"warnings":[]}.',
    `Allowed commands: ${allowedCommands.join(', ')}.`,
    'Never return destructive commands such as rm, sudo, chmod -R, chown -R, mkfs, dd, or shell operators.',
    'Each command must include id, title, command, args, cwd, explanation, risk, longRunning, interactive.',
    'Use risk "low" for read-only commands and "medium" for commands that modify files, install packages, or use network.',
    'If the request is unsafe or unclear, return {"summary":"Unable to safely plan this request","commands":[],"warnings":["reason"]}.',
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
      ? 'Planner returned no executable plan.'
      : 'NVIDIA_API_KEY missing. No commands executed.')
    return fallbackPlan(
      context,
      process.env.NVIDIA_API_KEY
        ? 'The NVIDIA planner did not return a valid command plan. No commands will run.'
        : 'NVIDIA_API_KEY is not configured. No commands will run.',
    )
  }

  events.onStatus?.('Validating AI command JSON.')
  try {
    const normalized = normalizeAiPlanPayload(JSON.parse(extractJson(response)), context)
    const parsed = planSchema.parse(normalized)
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
  } catch (error) {
    events.onStatus?.(`AI plan rejected: ${error instanceof Error ? error.message : 'invalid schema'}`)
    return fallbackPlan(
      context,
      'The NVIDIA planner returned an invalid command plan. No commands will run.',
    )
  }
}
