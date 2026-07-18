import { mkdir, readdir, stat } from 'node:fs/promises'

export const demoDir = new URL('../../demo/', import.meta.url)

export async function ensureDemoDir() {
  await mkdir(demoDir, { recursive: true })
}

export async function listDemoFiles() {
  await ensureDemoDir()
  const entries = await readdir(demoDir, { withFileTypes: true })

  const files = await Promise.all(
    entries.map(async (entry) => {
      const url = new URL(entry.name, demoDir)
      const info = await stat(url)

      return {
        name: entry.name,
        type: entry.isDirectory() ? 'folder' : 'file',
        size: info.size,
        updatedAt: info.mtime.toISOString(),
      }
    }),
  )

  return files.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'folder' ? -1 : 1
    return a.name.localeCompare(b.name)
  })
}
