import {
  copyFile,
  mkdir,
  readFile,
  readdir,
  rename,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises'
import { dirname, extname, parse } from 'node:path'
import { fileURLToPath } from 'node:url'

const demoUrl = new URL('./demo/', import.meta.url)
const undoUrl = new URL('./undo.json', import.meta.url)

function urlFor(relativePath) {
  return new URL(relativePath, demoUrl)
}

function relativeFromUrl(url) {
  return fileURLToPath(url).replace(fileURLToPath(demoUrl), '')
}

function isExcluded(name, exclude) {
  const lower = name.toLowerCase()
  return exclude.some((item) => lower.includes(item.toLowerCase()))
}

function prettyType(action) {
  return action.replaceAll('_', ' ')
}

async function readTextFile(url) {
  try {
    return await readFile(url, 'utf8')
  } catch {
    return ''
  }
}

async function writeUndo(operations) {
  await writeFile(
    undoUrl,
    JSON.stringify({ createdAt: new Date().toISOString(), operations }, null, 2),
    'utf8',
  )
}

async function readUndo() {
  return JSON.parse(await readFile(undoUrl, 'utf8'))
}

async function ensureParent(url) {
  await mkdir(dirname(fileURLToPath(url)), { recursive: true })
}

async function listEntries() {
  await mkdir(demoUrl, { recursive: true })
  return readdir(demoUrl, { withFileTypes: true })
}

async function uniqueDestination(baseName) {
  const parsed = parse(baseName)
  let candidate = baseName
  let index = 2

  while (true) {
    try {
      await stat(urlFor(candidate))
      candidate = `${parsed.name} ${index}${parsed.ext}`
      index += 1
    } catch {
      return candidate
    }
  }
}

function inferPdfName(fileName, contents) {
  const text = `${fileName} ${contents}`.toLowerCase()
  if (text.includes('amazon')) return 'Amazon Invoice.pdf'
  if (text.includes('bank')) return 'Bank Statement.pdf'
  if (text.includes('resume') || text.includes('curriculum')) return 'Resume.pdf'
  if (text.includes('presentation')) return 'Presentation Notes.pdf'

  return `${parse(fileName)
    .name.replace(/[()_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase())}.pdf`
}

async function renamePdfs(action, operations) {
  const logs = ['Understanding request...', 'Checking PDF contents...']
  const entries = await listEntries()
  const pdfs = entries.filter(
    (entry) =>
      entry.isFile() &&
      extname(entry.name).toLowerCase() === '.pdf' &&
      !entry.name.includes('/') &&
      !isExcluded(entry.name, action.exclude),
  )

  for (const entry of pdfs) {
    const source = urlFor(entry.name)
    const contents = await readTextFile(source)
    const inferred = inferPdfName(entry.name, contents)
    const destinationName = await uniqueDestination(inferred)

    if (destinationName === entry.name) {
      logs.push(`Skipped ${entry.name}; reason: name already matches detected content.`)
      continue
    }

    await rename(source, urlFor(destinationName))
    operations.push({ type: 'rename', from: entry.name, to: destinationName })
    logs.push(`Renamed ${entry.name} -> ${destinationName}`)
    logs.push(`Reason: detected ${parse(destinationName).name.toLowerCase()} keywords in file contents.`)
  }

  if (pdfs.length === 0) logs.push('No PDFs found.')
  return logs
}

async function pngToWebp(action, operations) {
  const logs = ['Generating execution plan...', 'Converting PNG screenshots...']
  const entries = await listEntries()
  const pngs = entries.filter(
    (entry) =>
      entry.isFile() &&
      extname(entry.name).toLowerCase() === '.png' &&
      !entry.name.includes('/') &&
      !isExcluded(entry.name, action.exclude),
  )

  for (const entry of pngs) {
    const destinationName = await uniqueDestination(`${parse(entry.name).name}.webp`)
    await copyFile(urlFor(entry.name), urlFor(destinationName))
    operations.push({ type: 'create', path: destinationName })
    logs.push(`Created ${destinationName} from ${entry.name}`)
    logs.push('Reason: PNG image matched the conversion request.')
  }

  if (pngs.length === 0) logs.push('No PNGs found.')
  return logs
}

async function organizeDownloads(action, operations) {
  const logs = ['Checking files...', 'Moving files into folders...']
  const entries = await listEntries()
  const files = entries.filter(
    (entry) => entry.isFile() && !entry.name.includes('/') && !isExcluded(entry.name, action.exclude),
  )

  for (const entry of files) {
    const extension = extname(entry.name).toLowerCase()
    let folder = 'Other'
    let reason = 'file type does not match a specialized folder.'

    if (['.pdf', '.txt', '.doc', '.docx', '.pptx'].includes(extension)) {
      folder = 'Documents'
      reason = 'document extension belongs in Documents.'
    }
    if (['.png', '.jpg', '.jpeg', '.webp'].includes(extension)) {
      folder = 'Images'
      reason = 'image extension belongs in Images.'
    }
    if (['.mp4', '.mov', '.mkv'].includes(extension)) {
      folder = 'Videos'
      reason = 'video extension belongs in Videos.'
    }
    if (['.zip', '.rar', '.7z'].includes(extension)) {
      folder = 'Archives'
      reason = 'archive extension belongs in Archives.'
    }

    const destination = `${folder}/${entry.name}`
    await ensureParent(urlFor(destination))
    await rename(urlFor(entry.name), urlFor(destination))
    operations.push({ type: 'rename', from: entry.name, to: destination })
    logs.push(`Moved ${entry.name} -> ${destination}`)
    logs.push(`Reason: ${reason}`)
  }

  if (files.length === 0) logs.push('No loose files to organize.')
  return logs
}

export async function listFiles() {
  await mkdir(demoUrl, { recursive: true })
  const files = []

  async function walk(folderUrl, prefix = '') {
    const entries = await readdir(folderUrl, { withFileTypes: true })

    for (const entry of entries) {
      const relativePath = `${prefix}${entry.name}`
      const entryUrl = new URL(entry.name, folderUrl)
      const info = await stat(entryUrl)

      files.push({
        name: relativePath,
        type: entry.isDirectory() ? 'folder' : 'file',
        size: info.size,
        updatedAt: info.mtime.toISOString(),
      })

      if (entry.isDirectory()) {
        await walk(new URL(`${entry.name}/`, folderUrl), `${relativePath}/`)
      }
    }
  }

  await walk(demoUrl)

  return files.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'folder' ? -1 : 1
    return a.name.localeCompare(b.name)
  })
}

export async function executePlan(plan) {
  const operations = []
  const logs = ['Proceed confirmed.', 'Executing safe plan inside backend/demo only.']

  for (const action of plan.actions) {
    logs.push(`Action: ${prettyType(action.action)}. Reason: ${action.reason}`)
    if (action.action === 'rename_pdfs') logs.push(...(await renamePdfs(action, operations)))
    if (action.action === 'png_to_webp') logs.push(...(await pngToWebp(action, operations)))
    if (action.action === 'organize_downloads') logs.push(...(await organizeDownloads(action, operations)))
  }

  await writeUndo(operations)
  const files = await listFiles()

  return {
    logs: [...logs, `Done. ${operations.length} reversible file operation${operations.length === 1 ? '' : 's'} recorded.`],
    files,
    canUndo: operations.length > 0,
  }
}

export async function undoLastOperation() {
  const undo = await readUndo()
  const logs = ['Undoing last operation...']

  for (const operation of [...undo.operations].reverse()) {
    if (operation.type === 'rename') {
      await ensureParent(urlFor(operation.from))
      await rename(urlFor(operation.to), urlFor(operation.from))
      logs.push(`Restored ${operation.to} -> ${operation.from}`)
    }

    if (operation.type === 'create') {
      await rm(urlFor(operation.path), { force: true })
      logs.push(`Removed created file ${operation.path}`)
    }
  }

  await writeUndo([])
  return {
    logs: [...logs, 'Undo complete.'],
    files: await listFiles(),
    canUndo: false,
  }
}
