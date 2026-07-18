import { readdir, stat } from 'node:fs/promises'
import { basename, relative, resolve } from 'node:path'
import { execa } from 'execa'
import type { FileEntry, ProjectContext } from '../state/app.js'
import { getBranch } from './git.js'

const HIDDEN = new Set(['.git', 'node_modules', 'dist'])

export function resolveInsideRoot(root: string, cwd: string, target = '.') {
  const absolute = resolve(cwd, target)
  const rel = relative(root, absolute)

  if (rel === '..' || rel.startsWith('../')) {
    throw new Error('MetroCLI blocked navigation outside the project root.')
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

export async function analyzeProject(root: string, cwd: string): Promise<ProjectContext> {
  const current = resolveInsideRoot(root, cwd)

  return {
    cwd: current,
    root,
    projectName: basename(root),
    branch: await getBranch(current),
    packageManager: await detectPackageManager(current),
    nodeDetected: await detectNode(),
    entries: await listEntries(root, current),
  }
}
