import {
  copyFile,
  mkdir,
  readdir,
  rename,
  writeFile,
} from 'node:fs/promises'
import { extname, parse } from 'node:path'
import { demoDir, listDemoFiles } from './demoFileService.js'

function isExcluded(name, exclude) {
  const lower = name.toLowerCase()
  return exclude.some((item) => lower.includes(item.toLowerCase()))
}

function titleFromName(name) {
  return parse(name)
    .name.replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .replace(/\s+/g, ' ')
    .trim()
}

async function listEntries() {
  return readdir(demoDir, { withFileTypes: true })
}

async function moveIntoFolder(fileName, folderName) {
  const folderUrl = new URL(`${folderName}/`, demoDir)
  await mkdir(folderUrl, { recursive: true })
  await rename(new URL(fileName, demoDir), new URL(fileName, folderUrl))
}

async function renamePdfs({ exclude }) {
  const logs = ['Reading PDFs...']
  const entries = await listEntries()
  const pdfs = entries.filter(
    (entry) =>
      entry.isFile() &&
      extname(entry.name).toLowerCase() === '.pdf' &&
      !isExcluded(entry.name, exclude),
  )

  for (const entry of pdfs) {
    const cleanTitle = titleFromName(entry.name)
    const nextName = `${cleanTitle}.pdf`
    if (nextName === entry.name) {
      logs.push(`Skipped ${entry.name}; already clean.`)
      continue
    }

    await rename(new URL(entry.name, demoDir), new URL(nextName, demoDir))
    logs.push(`Renamed ${entry.name} -> ${nextName}`)
  }

  if (pdfs.length === 0) logs.push('No PDFs found.')
  return logs
}

async function pngToWebp({ exclude }) {
  const logs = ['Converting PNGs to WebP...']
  const entries = await listEntries()
  const pngs = entries.filter(
    (entry) =>
      entry.isFile() &&
      extname(entry.name).toLowerCase() === '.png' &&
      !isExcluded(entry.name, exclude),
  )

  for (const entry of pngs) {
    const nextName = `${parse(entry.name).name}.webp`
    await copyFile(new URL(entry.name, demoDir), new URL(nextName, demoDir))
    logs.push(`Created ${nextName} from ${entry.name}`)
  }

  if (pngs.length === 0) logs.push('No PNGs found.')
  return logs
}

async function compressVideos({ exclude }) {
  const logs = ['Compressing demo videos...']
  const videoExts = new Set(['.mp4', '.mov', '.mkv'])
  const entries = await listEntries()
  const videos = entries.filter(
    (entry) =>
      entry.isFile() &&
      videoExts.has(extname(entry.name).toLowerCase()) &&
      !isExcluded(entry.name, exclude),
  )

  for (const entry of videos) {
    const nextName = `${parse(entry.name).name}.compressed${extname(entry.name)}`
    await copyFile(new URL(entry.name, demoDir), new URL(nextName, demoDir))
    logs.push(`Compressed ${entry.name} -> ${nextName}`)
  }

  if (videos.length === 0) logs.push('No videos found.')
  return logs
}

async function organizeDownloads({ exclude }) {
  const logs = ['Organizing files into folders...']
  const entries = await listEntries()
  const files = entries.filter((entry) => entry.isFile() && !isExcluded(entry.name, exclude))

  for (const entry of files) {
    const extension = extname(entry.name).toLowerCase()
    let folder = 'Other'

    if (['.pdf', '.txt', '.doc', '.docx'].includes(extension)) folder = 'Documents'
    if (['.png', '.jpg', '.jpeg', '.webp'].includes(extension)) folder = 'Images'
    if (['.mp4', '.mov', '.mkv'].includes(extension)) folder = 'Videos'
    if (['.zip', '.rar', '.7z'].includes(extension)) folder = 'Archives'

    await moveIntoFolder(entry.name, folder)
    logs.push(`Moved ${entry.name} -> ${folder}/`)
  }

  if (files.length === 0) logs.push('No files to organize.')
  return logs
}

async function ensureDemoSeed() {
  await mkdir(demoDir, { recursive: true })
  const entries = await readdir(demoDir)
  if (entries.length > 0) return

  const samples = {
    'amazon_invoice.pdf': 'Amazon invoice for demo rename.',
    'resume_final.pdf': 'Resume PDF for demo rename.',
    'bank_statement.pdf': 'Bank statement PDF for demo rename.',
    'image1.png': 'fake png bytes for demo',
    'logo.png': 'fake logo png bytes for demo',
    'vacation_video.mp4': 'fake video bytes for demo',
    'notes.txt': 'Loose note from Downloads.',
  }

  await Promise.all(
    Object.entries(samples).map(([name, content]) =>
      writeFile(new URL(name, demoDir), content, 'utf8'),
    ),
  )
}

export async function executeAutomationPlan(plan) {
  await ensureDemoSeed()
  const logs = []

  for (const action of plan.actions) {
    if (action.action === 'rename_pdfs') logs.push(...(await renamePdfs(action)))
    if (action.action === 'png_to_webp') logs.push(...(await pngToWebp(action)))
    if (action.action === 'compress_videos') logs.push(...(await compressVideos(action)))
    if (action.action === 'organize_downloads') logs.push(...(await organizeDownloads(action)))
  }

  const files = await listDemoFiles()
  const totalBytes = files.reduce((sum, file) => sum + file.size, 0)

  return {
    logs: [...logs, `Done. ${files.length} visible item${files.length === 1 ? '' : 's'} in demo folder.`],
    files,
    stats: {
      visibleItems: files.length,
      totalBytes,
    },
  }
}
