import { readFile } from 'node:fs/promises'
import OpenAI from 'openai'
import { z } from 'zod'

export const ALLOWED_COMMANDS = [
  'cd',
  'git',
  'python',
  'python3',
  'npm',
  'npx',
  'node',
  'docker',
  'find',
  'pwd',
  'ls',
]

const riskSchema = z.enum(['low', 'medium', 'high'])

export const terminalCommandSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  command: z.enum(ALLOWED_COMMANDS),
  args: z.array(z.string()).default([]),
  cwd: z.string().default('.'),
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
  commands: z.array(terminalCommandSchema).min(1).max(6),
})

export const planRequestSchema = z.object({
  command: z.string().trim().min(3).max(1000),
  cwd: z.string().default('.'),
})

export const executeRequestSchema = z.object({
  plan: planSchema,
})

export const explainRequestSchema = z.object({
  command: z.enum(ALLOWED_COMMANDS),
  args: z.array(z.string()).default([]),
})

const planJsonSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    summary: { type: 'string' },
    requiresApproval: { type: 'boolean', enum: [true] },
    riskLevel: { type: 'string', enum: ['low', 'medium', 'high'] },
    warnings: { type: 'array', items: { type: 'string' } },
    commands: {
      type: 'array',
      minItems: 1,
      maxItems: 6,
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          command: { type: 'string', enum: ALLOWED_COMMANDS },
          args: { type: 'array', items: { type: 'string' } },
          cwd: { type: 'string' },
          explanation: { type: 'string' },
          risk: { type: 'string', enum: ['low', 'medium', 'high'] },
          longRunning: { type: 'boolean' },
          interactive: { type: 'boolean' },
        },
        required: [
          'id',
          'title',
          'command',
          'args',
          'cwd',
          'explanation',
          'risk',
          'longRunning',
          'interactive',
        ],
      },
    },
  },
  required: ['summary', 'requiresApproval', 'riskLevel', 'warnings', 'commands'],
}

function command({
  index,
  title,
  command: executable,
  args,
  explanation,
  risk = 'low',
  longRunning = false,
  interactive = false,
  cwd = '.',
}) {
  return {
    id: `cmd_${index}`,
    title,
    command: executable,
    args,
    cwd,
    explanation,
    risk,
    longRunning,
    interactive,
  }
}

function extractUrl(text) {
  return text.match(/https:\/\/[^\s]+/)?.[0] || ''
}

function riskFromCommands(commands, warnings) {
  if (
    warnings.some((warning) => warning.toLowerCase().includes('destructive')) ||
    commands.some((item) => item.risk === 'high')
  ) {
    return 'high'
  }
  if (commands.some((item) => item.risk === 'medium')) return 'medium'
  return 'low'
}

function localPlan(input, cwd = '.') {
  const text = input.toLowerCase()
  const warnings = []
  const commands = []

  if (/\b(delete|remove|wipe|erase|destroy|format)\b/.test(text)) {
    warnings.push('Destructive file operations are blocked in this MVP.')
  }

  if (text.startsWith('cd ') || text.includes('go to ') || text.includes('open folder')) {
    const target = input
      .replace(/^cd\s+/i, '')
      .replace(/go to /i, '')
      .replace(/open folder /i, '')
      .trim()
      .replace(/[.!?]+$/g, '')

    commands.push(
      command({
        index: 1,
        title: 'Change directory',
        command: 'cd',
        args: [target || '.'],
        cwd,
        explanation:
          'Changes the terminal working directory inside the allowed workspace.',
      }),
    )
  } else if (text.includes('go back') || text.includes('parent folder')) {
    commands.push(
      command({
        index: 1,
        title: 'Go to parent directory',
        command: 'cd',
        args: ['..'],
        cwd,
        explanation: 'Moves the terminal context up one directory.',
      }),
    )
  } else if (text.includes('undo') && text.includes('commit') && text.includes('keep')) {
    commands.push(
      command({
        index: 1,
        title: 'Undo last commit but keep changes',
        command: 'git',
        args: ['reset', '--soft', 'HEAD~1'],
        cwd,
        explanation:
          'Moves the last commit back into staged changes, so no work is deleted.',
        risk: 'medium',
      }),
    )
  } else if (text.includes('git status') || text.includes('status')) {
    commands.push(
      command({
        index: 1,
        title: 'Show Git status',
        command: 'git',
        args: ['status', '--short'],
        cwd,
        explanation: 'Shows changed files without modifying the repository.',
      }),
    )
  } else if (
    text.includes('what folder') ||
    text.includes('current directory') ||
    text.includes('where am i') ||
    text.includes('pwd')
  ) {
    commands.push(
      command({
        index: 1,
        title: 'Show current directory',
        command: 'pwd',
        args: [],
        cwd,
        explanation:
          'Prints the current working directory without changing anything.',
      }),
    )
  } else if (text.includes('clone')) {
    const url = extractUrl(input)
    if (!url) warnings.push('No repository URL was detected.')
    commands.push(
      command({
        index: 1,
        title: 'Clone repository',
        command: 'git',
        args: url ? ['clone', url] : ['clone', '<repository-url>'],
        cwd,
        explanation:
          'Downloads the repository into a new folder using Git. Replace the placeholder URL if needed.',
        risk: url ? 'medium' : 'high',
        longRunning: true,
      }),
    )
  } else if (text.includes('postgres') && text.includes('docker')) {
    commands.push(
      command({
        index: 1,
        title: 'Run PostgreSQL in Docker',
        command: 'docker',
        args: [
          'run',
          '--name',
          'promptshell-postgres',
          '-e',
          'POSTGRES_PASSWORD=postgres',
          '-p',
          '5432:5432',
          '-d',
          'postgres:16',
        ],
        cwd,
        explanation:
          'Starts a PostgreSQL container on port 5432 with a demo password.',
        risk: 'medium',
        longRunning: true,
      }),
    )
  } else if (text.includes('vite') || text.includes('react app')) {
    commands.push(
      command({
        index: 1,
        title: 'Create React app with Vite',
        command: 'npm',
        args: ['create', 'vite@latest', 'my-app', '--', '--template', 'react'],
        cwd,
        explanation:
          'Uses the official Vite scaffolder to create a React project.',
        risk: 'medium',
        longRunning: true,
        interactive: true,
      }),
    )
  } else if (text.includes('npm install') || text.includes('install npm')) {
    commands.push(
      command({
        index: 1,
        title: 'Install npm dependencies',
        command: 'npm',
        args: ['install'],
        cwd,
        explanation: 'Installs packages listed in package.json.',
        risk: 'medium',
        longRunning: true,
      }),
    )
  } else if (text.includes('npm') && (text.includes('dev') || text.includes('run'))) {
    commands.push(
      command({
        index: 1,
        title: 'Run npm dev script',
        command: 'npm',
        args: ['run', 'dev'],
        cwd,
        explanation: 'Starts the project development server defined in package.json.',
        risk: 'medium',
        longRunning: true,
      }),
    )
  } else if (text.includes('find') && text.includes('pdf')) {
    commands.push(
      command({
        index: 1,
        title: 'Find recent PDFs',
        command: 'find',
        args: ['.', '-name', '*.pdf', '-mtime', '-7'],
        cwd,
        explanation: 'Finds PDF files under the current folder modified in the last 7 days.',
      }),
    )
  } else if (
    text.includes('venv') ||
    text.includes('virtual environment') ||
    text.includes('requirements') ||
    text.includes('python')
  ) {
    commands.push(
      command({
        index: 1,
        title: 'Create Python virtual environment',
        command: 'python',
        args: ['-m', 'venv', '.venv'],
        cwd,
        explanation:
          'Creates an isolated Python environment to prevent dependency conflicts.',
      }),
      command({
        index: 2,
        title: 'Install Python dependencies',
        command: 'python',
        args: ['-m', 'pip', 'install', '-r', 'requirements.txt'],
        cwd,
        explanation:
          'Installs dependencies listed in requirements.txt using Python pip.',
        risk: 'medium',
        longRunning: true,
      }),
    )
    if (text.includes('run')) {
      commands.push(
        command({
          index: 3,
          title: 'Run Python app',
          command: 'python',
          args: ['app.py'],
          cwd,
          explanation: 'Runs app.py with the current Python interpreter.',
          risk: 'medium',
          longRunning: true,
        }),
      )
    }
  }

  if (commands.length === 0) {
    commands.push(
      command({
        index: 1,
        title: 'Show current directory',
        command: 'pwd',
        args: [],
        cwd,
        explanation:
          'Safe fallback: shows the current working directory without modifying anything.',
      }),
    )
    warnings.push('PromptShell could not map the request to a supported workflow.')
  }

  return planSchema.parse({
    summary: commands.map((item) => item.title).join(', '),
    requiresApproval: true,
    riskLevel: riskFromCommands(commands, warnings),
    warnings,
    commands,
  })
}

async function nvidiaPlan(input, cwd = '.') {
  if (!process.env.NVIDIA_API_KEY) return null

  const prompt = await readFile(new URL('../PROMPTS.md', import.meta.url), 'utf8')
  const client = new OpenAI({
    apiKey: process.env.NVIDIA_API_KEY,
    baseURL: process.env.NVIDIA_BASE_URL || 'https://integrate.api.nvidia.com/v1',
  })

  const stream = await client.chat.completions.create({
    model: process.env.NVIDIA_MODEL || 'z-ai/glm-5.2',
    messages: [
      { role: 'system', content: prompt },
      {
        role: 'user',
        content: JSON.stringify({ request: input, currentWorkingDirectory: cwd }),
      },
    ],
    temperature: 0.2,
    top_p: 1,
    max_tokens: 1600,
    seed: 42,
    stream: true,
  })

  let text = ''
  for await (const chunk of stream) {
    text += chunk.choices[0]?.delta?.content || ''
  }

  const json = text
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim()

  return planSchema.parse(JSON.parse(json))
}

function shouldUseLocalPlanner(input) {
  const text = input.toLowerCase()
  return [
    'git',
    'clone',
    'python',
    'venv',
    'virtual environment',
    'requirements',
    'npm',
    'vite',
    'react',
    'docker',
    'postgres',
    'find',
    'pdf',
    'status',
    'commit',
    'cd ',
    'go to',
    'go back',
    'open folder',
    'parent folder',
    'current directory',
    'where am i',
    'pwd',
  ].some((keyword) => text.includes(keyword))
}

export async function createPlan(input, cwd = '.') {
  const local = localPlan(input, cwd)
  if (shouldUseLocalPlanner(input)) return local

  try {
    return (await nvidiaPlan(input, cwd)) || local
  } catch (error) {
    console.error('NVIDIA planner failed, using local plan:', error.message)
    return local
  }
}

export function explainCommand({ command: executable, args }) {
  const rendered = [executable, ...args].join(' ')

  if (executable === 'python' && args.includes('venv')) {
    return `I used \`${rendered}\` because Python virtual environments isolate dependencies from your system Python.`
  }
  if (executable === 'git' && args[0] === 'reset') {
    return `I used \`${rendered}\` because it undoes the last commit while keeping the changes staged.`
  }
  if (executable === 'docker') {
    return `I used \`${rendered}\` because Docker can run the service without installing it directly on your machine.`
  }
  if (executable === 'npm') {
    return `I used \`${rendered}\` because npm is the standard package runner for Node projects.`
  }

  return `I used \`${rendered}\` because it matches the selected safe workflow and is allowed by the executor.`
}
