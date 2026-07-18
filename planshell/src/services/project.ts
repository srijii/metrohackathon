import { readFile, readdir, stat } from 'node:fs/promises'
import { basename, relative, resolve } from 'node:path'
import { execa } from 'execa'
import type { FileEntry, ProjectContext } from '../state/app.js'
import { getBranch, getGitStatus } from './git.js'

const HIDDEN = new Set(['.env', '.git', 'node_modules', 'dist', '.next', 'coverage'])

export function resolveInsideRoot(root: string, cwd: string, target = '.') {
  const absolute = resolve(cwd, target)
  const rel = relative(root, absolute)

  if (rel === '..' || rel.startsWith('../')) {
    throw new Error('PlanShell blocked navigation outside the project root.')
  }

  return absolute
}

export async function resolveDirectoryInsideRoot(root: string, cwd: string, target = '.') {
  const absolute = resolveInsideRoot(root, cwd, target)

  try {
    const info = await stat(absolute)
    if (!info.isDirectory()) {
      throw new Error('PlanShell can only navigate into folders.')
    }
  } catch (error) {
    if (error instanceof Error && error.message === 'PlanShell can only navigate into folders.') {
      throw error
    }

    throw new Error(`Directory does not exist: ${target}`)
  }

  return absolute
}

async function detectPackageManager(cwd: string) {
  const entries = await readdir(cwd)
  if (entries.includes('pnpm-lock.yaml')) return 'pnpm'
  if (entries.includes('yarn.lock')) return 'yarn'
  if (entries.includes('package-lock.json')) return 'npm'
  return 'unknown'
}

async function detectNode() {
  try {
    const { exitCode } = await execa('node', ['--version'], { reject: false })
    return exitCode === 0
  } catch {
    return false
  }
}

async function listEntries(root: string, cwd: string): Promise<FileEntry[]> {
  const entries = await readdir(cwd, { withFileTypes: true })
  const mapped = await Promise.all(
    entries
      .filter((entry) => !HIDDEN.has(entry.name))
      .slice(0, 36)
      .map(async (entry) => {
        const absolute = resolve(cwd, entry.name)
        const info = await stat(absolute)

        return {
          name: entry.name,
          path: relative(root, absolute) || '.',
          type: entry.isDirectory() ? 'folder' : 'file',
          size: info.size,
        } satisfies FileEntry
      }),
  )

  return mapped.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'folder' ? -1 : 1
    return a.name.localeCompare(b.name)
  })
}

async function walkFiles(root: string, cwd = root, depth = 0): Promise<FileEntry[]> {
  if (depth > 3) return []

  const entries = await readdir(cwd, { withFileTypes: true })
  const results: FileEntry[] = []

  for (const entry of entries) {
    if (HIDDEN.has(entry.name)) continue

    const absolute = resolve(cwd, entry.name)
    const info = await stat(absolute)

    if (entry.isDirectory()) {
      results.push(...await walkFiles(root, absolute, depth + 1))
      continue
    }

    results.push({
      name: entry.name,
      path: relative(root, absolute) || '.',
      type: 'file',
      size: info.size,
    })
  }

  return results
}

async function readPackageJson(cwd: string) {
  try {
    return JSON.parse(await readFile(resolve(cwd, 'package.json'), 'utf8')) as {
      dependencies?: Record<string, string>
      devDependencies?: Record<string, string>
    }
  } catch {
    return null
  }
}

async function detectStack(cwd: string) {
  const packageJson = await readPackageJson(cwd)
  const deps = {
    ...packageJson?.dependencies,
    ...packageJson?.devDependencies,
  }
  const entries = new Set(await readdir(cwd))

  const framework = deps.next
    ? 'Next.js'
    : deps.vite
      ? 'Vite'
      : deps.react
        ? 'React'
        : deps.vue
          ? 'Vue'
          : deps.svelte
            ? 'Svelte'
            : 'unknown'

  const backend = deps.express
    ? 'Express'
    : deps.fastify
      ? 'Fastify'
      : deps.hono
        ? 'Hono'
        : entries.has('manage.py')
          ? 'Django'
          : 'unknown'

  const database = deps.prisma
    ? 'Prisma'
    : deps.mongoose
      ? 'MongoDB'
      : deps.pg
        ? 'Postgres'
        : deps.sqlite3
          ? 'SQLite'
          : 'unknown'

  const testing = deps.vitest
    ? 'Vitest'
    : deps.jest
      ? 'Jest'
      : deps.playwright
        ? 'Playwright'
        : 'unknown'

  const styling = deps.tailwindcss
    ? 'Tailwind'
    : deps['styled-components']
      ? 'styled-components'
      : deps.sass
        ? 'Sass'
        : 'unknown'

  const router = deps['react-router-dom']
    ? 'React Router'
    : deps['@tanstack/react-router']
      ? 'TanStack Router'
      : 'unknown'

  const linting = deps.eslint
    ? 'ESLint'
    : deps.oxlint
      ? 'Oxlint'
      : 'unknown'

  return {
    framework,
    backend,
    database,
    testing,
    styling,
    router,
    linting,
    ci: entries.has('.github'),
    docker: entries.has('Dockerfile') || entries.has('docker-compose.yml') || entries.has('compose.yml'),
  }
}

async function countModifiedFiles(cwd: string) {
  try {
    const { stdout } = await execa('git', ['status', '--short'], { cwd, reject: false })
    return stdout.split('\n').filter(Boolean).length
  } catch {
    return 0
  }
}

function buildSuggestions(context: {
  backend: string
  database: string
  docker: boolean
  testing: string
  linting: string
  entries: FileEntry[]
}) {
  const names = new Set(context.entries.map((entry) => entry.name))
  const suggestions: string[] = []

  if (!names.has('.env.example')) suggestions.push('.env.example missing')
  if (!names.has('README.md')) suggestions.push('README missing')
  if (context.testing === 'unknown') suggestions.push('No test runner detected')
  if (context.linting === 'unknown') suggestions.push('No linter detected')
  if (!context.docker) suggestions.push('Dockerfile missing')
  if (context.backend === 'unknown') suggestions.push('No backend framework detected')
  if (context.database === 'unknown') suggestions.push('No database layer detected')

  return suggestions.slice(0, 5)
}

export async function analyzeProject(root: string, cwd: string): Promise<ProjectContext> {
  const current = resolveInsideRoot(root, cwd)
  const files = await walkFiles(root)
  const stack = await detectStack(current)
  const entries = await listEntries(root, current)
  const gitStatus = await getGitStatus(root)
  const modifiedFiles = await countModifiedFiles(root)

  return {
    cwd: current,
    root,
    projectName: basename(current),
    branch: await getBranch(root),
    packageManager: await detectPackageManager(current),
    nodeDetected: await detectNode(),
    ...stack,
    gitStatus,
    modifiedFiles,
    fileCount: files.length,
    recentFiles: files.slice(-8).reverse(),
    suggestions: buildSuggestions({ ...stack, entries }),
    entries,
  }
}
